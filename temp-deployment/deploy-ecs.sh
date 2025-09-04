#!/bin/bash

# SIRFA Agent Finance - Alibaba Cloud ECS Deployment Script
# This script automates the deployment process to Alibaba Cloud ECS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="sirfa-agent-finance"
DOCKER_IMAGE="$APP_NAME:latest"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
BACKUP_DIR="/opt/sirfa/backups"
LOG_FILE="/var/log/sirfa-deployment.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        warn "Running as root. Consider using a non-root user for security."
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if Git is installed
    if ! command -v git &> /dev/null; then
        error "Git is not installed. Please install Git first."
    fi
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file $ENV_FILE not found. Please create it from .env.production template."
    fi
    
    log "Prerequisites check completed successfully."
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    
    sudo mkdir -p "$BACKUP_DIR"
    sudo mkdir -p "/var/log/sirfa"
    sudo mkdir -p "/opt/sirfa/ssl"
    sudo mkdir -p "/opt/sirfa/data/redis"
    sudo mkdir -p "/opt/sirfa/data/logs"
    
    # Set proper permissions
    sudo chown -R $USER:$USER "/opt/sirfa"
    sudo chmod -R 755 "/opt/sirfa"
    
    log "Directories setup completed."
}

# Backup existing deployment
backup_existing() {
    log "Creating backup of existing deployment..."
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        BACKUP_NAME="sirfa-backup-$(date +%Y%m%d-%H%M%S)"
        BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
        
        mkdir -p "$BACKUP_PATH"
        
        # Backup database if exists
        if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE; then
            docker cp $(docker-compose -f "$COMPOSE_FILE" ps -q redis):/data/dump.rdb "$BACKUP_PATH/redis-dump.rdb"
            log "Redis backup created: $BACKUP_PATH/redis-dump.rdb"
        fi
        
        # Backup application logs
        docker-compose -f "$COMPOSE_FILE" logs > "$BACKUP_PATH/application.log" 2>&1
        
        # Backup environment file
        cp "$ENV_FILE" "$BACKUP_PATH/"
        
        log "Backup created: $BACKUP_PATH"
    else
        info "No existing deployment found to backup."
    fi
}

# Pull latest code
update_code() {
    log "Updating application code..."
    
    # Stash any local changes
    git stash push -m "Auto-stash before deployment $(date)"
    
    # Pull latest changes
    git pull origin main
    
    log "Code update completed."
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    # Build production image
    docker build -f Dockerfile.production -t "$DOCKER_IMAGE" .
    
    # Clean up dangling images
    docker image prune -f
    
    log "Docker images built successfully."
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    # Stop existing containers
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    
    # Start new containers
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_health
    
    log "Application deployed successfully."
}

# Check application health
check_health() {
    log "Checking application health..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            log "Application is healthy!"
            return 0
        fi
        
        info "Health check attempt $attempt/$max_attempts failed. Retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Application health check failed after $max_attempts attempts."
}

# Setup SSL certificates (Let's Encrypt)
setup_ssl() {
    log "Setting up SSL certificates..."
    
    if [[ -z "$DOMAIN" ]]; then
        warn "DOMAIN environment variable not set. Skipping SSL setup."
        return 0
    fi
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y certbot
    fi
    
    # Generate SSL certificate
    sudo certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL"
    
    # Copy certificates to nginx directory
    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "/opt/sirfa/ssl/cert.pem"
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "/opt/sirfa/ssl/key.pem"
    
    # Set proper permissions
    sudo chown -R $USER:$USER "/opt/sirfa/ssl"
    sudo chmod 600 "/opt/sirfa/ssl/key.pem"
    sudo chmod 644 "/opt/sirfa/ssl/cert.pem"
    
    log "SSL certificates setup completed."
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring script
    cat > "/opt/sirfa/monitor.sh" << 'EOF'
#!/bin/bash
# Simple monitoring script for SIRFA Agent Finance

LOG_FILE="/var/log/sirfa/monitor.log"
ALERT_EMAIL="admin@yourdomain.com"

check_service() {
    local service=$1
    if ! docker-compose -f /opt/sirfa/docker-compose.production.yml ps | grep -q "$service.*Up"; then
        echo "$(date): Service $service is down!" >> "$LOG_FILE"
        # Send alert (configure your email service)
        # echo "Service $service is down on $(hostname)" | mail -s "SIRFA Alert" "$ALERT_EMAIL"
        return 1
    fi
    return 0
}

check_service "app"
check_service "redis"
check_service "nginx"

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt 80 ]]; then
    echo "$(date): Disk usage is at ${DISK_USAGE}%" >> "$LOG_FILE"
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [[ $MEM_USAGE -gt 80 ]]; then
    echo "$(date): Memory usage is at ${MEM_USAGE}%" >> "$LOG_FILE"
fi
EOF

    chmod +x "/opt/sirfa/monitor.sh"
    
    # Add to crontab (run every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/sirfa/monitor.sh") | crontab -
    
    log "Monitoring setup completed."
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    # Keep only last 7 days of backups
    find "$BACKUP_DIR" -type d -name "sirfa-backup-*" -mtime +7 -exec rm -rf {} \;
    
    log "Backup cleanup completed."
}

# Main deployment function
main() {
    log "Starting SIRFA Agent Finance deployment to Alibaba Cloud ECS..."
    
    check_root
    check_prerequisites
    setup_directories
    backup_existing
    update_code
    build_images
    deploy_application
    
    # Optional steps
    if [[ "$SETUP_SSL" == "true" ]]; then
        setup_ssl
    fi
    
    if [[ "$SETUP_MONITORING" == "true" ]]; then
        setup_monitoring
    fi
    
    cleanup_backups
    
    log "Deployment completed successfully!"
    log "Application is available at: http://$(curl -s ifconfig.me)"
    
    if [[ -n "$DOMAIN" ]]; then
        log "Domain access: https://$DOMAIN"
    fi
    
    # Display service status
    echo -e "\n${BLUE}Service Status:${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo -e "\n${GREEN}Deployment Summary:${NC}"
    echo "- Application: Running"
    echo "- Database: Redis"
    echo "- Reverse Proxy: Nginx"
    echo "- SSL: $([ "$SETUP_SSL" == "true" ] && echo "Enabled" || echo "Disabled")"
    echo "- Monitoring: $([ "$SETUP_MONITORING" == "true" ] && echo "Enabled" || echo "Disabled")"
    echo "- Logs: /var/log/sirfa/"
    echo "- Backups: $BACKUP_DIR"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "health")
        check_health
        ;;
    "backup")
        backup_existing
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f
        ;;
    "stop")
        log "Stopping application..."
        docker-compose -f "$COMPOSE_FILE" down
        ;;
    "restart")
        log "Restarting application..."
        docker-compose -f "$COMPOSE_FILE" restart
        ;;
    "status")
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    *)
        echo "Usage: $0 {deploy|health|backup|logs|stop|restart|status}"
        exit 1
        ;;
esac
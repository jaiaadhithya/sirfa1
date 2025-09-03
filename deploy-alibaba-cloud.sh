#!/bin/bash

# SIRFA Agent Finance - Alibaba Cloud Deployment Script
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
APP_DIR="/opt/$APP_NAME"
NGINX_SITE="/etc/nginx/sites-available/$APP_NAME"
PM2_CONFIG="ecosystem.config.js"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check if running on supported OS
    if ! command -v apt &> /dev/null; then
        log_error "This script requires Ubuntu/Debian with apt package manager"
        exit 1
    fi
    
    log_success "System requirements check passed"
}

install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Update system
    apt update && apt upgrade -y
    
    # Install Node.js 18
    if ! command -v node &> /dev/null; then
        log_info "Installing Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        apt-get install -y nodejs
    fi
    
    # Install PM2
    if ! command -v pm2 &> /dev/null; then
        log_info "Installing PM2..."
        npm install -g pm2
    fi
    
    # Install Nginx
    if ! command -v nginx &> /dev/null; then
        log_info "Installing Nginx..."
        apt install -y nginx
    fi
    
    # Install Git
    if ! command -v git &> /dev/null; then
        log_info "Installing Git..."
        apt install -y git
    fi
    
    # Install other utilities
    apt install -y curl wget unzip htop
    
    log_success "Dependencies installed successfully"
}

setup_application() {
    log_info "Setting up application..."
    
    # Create application directory
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Clone or update repository
    if [ -d ".git" ]; then
        log_info "Updating existing repository..."
        git pull origin main
    else
        log_info "Cloning repository..."
        # Replace with your actual repository URL
        git clone https://github.com/your-username/sirfa-agent-finance.git .
    fi
    
    # Install backend dependencies
    log_info "Installing backend dependencies..."
    cd backend
    npm install --production
    
    # Install frontend dependencies and build
    log_info "Building frontend..."
    cd ../frontend
    npm install
    npm run build
    
    log_success "Application setup completed"
}

configure_environment() {
    log_info "Configuring environment..."
    
    cd $APP_DIR/backend
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Creating from template..."
        cp .env.example .env
        
        log_warning "Please edit $APP_DIR/backend/.env with your actual credentials:"
        log_warning "- PAI_EAS_SERVICE_URL"
        log_warning "- PAI_EAS_SERVICE_TOKEN"
        log_warning "- ALIBABA_ACCESS_KEY_ID"
        log_warning "- ALIBABA_ACCESS_KEY_SECRET"
        log_warning "- ALPACA_API_KEY"
        log_warning "- ALPACA_SECRET_KEY"
        
        read -p "Press Enter after updating the .env file..."
    fi
    
    log_success "Environment configuration completed"
}

setup_pm2() {
    log_info "Setting up PM2 process management..."
    
    cd $APP_DIR
    
    # Create PM2 ecosystem file
    cat > $PM2_CONFIG << EOF
module.exports = {
  apps: [
    {
      name: 'sirfa-backend',
      script: './server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    }
  ]
};
EOF
    
    # Create logs directory
    mkdir -p logs
    
    # Stop existing processes
    pm2 delete all 2>/dev/null || true
    
    # Start application
    pm2 start $PM2_CONFIG
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup
    pm2 startup systemd -u root --hp /root
    
    log_success "PM2 setup completed"
}

setup_nginx() {
    log_info "Setting up Nginx..."
    
    # Get domain name
    read -p "Enter your domain name (or press Enter for IP-based setup): " DOMAIN_NAME
    
    if [ -z "$DOMAIN_NAME" ]; then
        DOMAIN_NAME="_"  # Default server
    fi
    
    # Create Nginx configuration
    cat > $NGINX_SITE << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend (React build)
    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Enable gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_proxied expired no-cache no-store private must-revalidate auth;
        gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Enable site
    ln -sf $NGINX_SITE /etc/nginx/sites-enabled/$APP_NAME
    
    # Remove default site if it exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    nginx -t
    
    # Restart Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    log_success "Nginx setup completed"
}

setup_ssl() {
    if [ "$DOMAIN_NAME" != "_" ] && [ ! -z "$DOMAIN_NAME" ]; then
        log_info "Setting up SSL certificate..."
        
        # Install Certbot
        apt install -y certbot python3-certbot-nginx
        
        # Get SSL certificate
        certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME
        
        # Setup auto-renewal
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        
        log_success "SSL certificate setup completed"
    else
        log_info "Skipping SSL setup (no domain specified)"
    fi
}

setup_firewall() {
    log_info "Configuring firewall..."
    
    # Install UFW if not present
    apt install -y ufw
    
    # Reset UFW
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow application ports (for development/debugging)
    ufw allow 3000/tcp comment 'Frontend Dev'
    ufw allow 3001/tcp comment 'Backend API'
    ufw allow 8080/tcp comment 'WebSocket'
    
    # Enable firewall
    ufw --force enable
    
    log_success "Firewall configured"
}

run_tests() {
    log_info "Running deployment tests..."
    
    # Wait for services to start
    sleep 10
    
    # Test backend health
    if curl -f http://localhost:3001/api/health/system > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        return 1
    fi
    
    # Test PAI integration
    if curl -f http://localhost:3001/api/health/pai > /dev/null 2>&1; then
        log_success "PAI integration test passed"
    else
        log_warning "PAI integration test failed (check credentials)"
    fi
    
    # Test Nginx
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log_success "Nginx health check passed"
    else
        log_error "Nginx health check failed"
        return 1
    fi
    
    log_success "All tests passed"
}

show_status() {
    log_info "Deployment Status:"
    echo
    echo "Application Directory: $APP_DIR"
    echo "PM2 Status:"
    pm2 status
    echo
    echo "Nginx Status:"
    systemctl status nginx --no-pager -l
    echo
    echo "Application URLs:"
    if [ "$DOMAIN_NAME" != "_" ] && [ ! -z "$DOMAIN_NAME" ]; then
        echo "  Frontend: https://$DOMAIN_NAME"
        echo "  API: https://$DOMAIN_NAME/api/health/system"
    else
        LOCAL_IP=$(curl -s ifconfig.me || echo "your-server-ip")
        echo "  Frontend: http://$LOCAL_IP"
        echo "  API: http://$LOCAL_IP/api/health/system"
    fi
    echo
    log_success "Deployment completed successfully!"
}

# Main deployment process
main() {
    log_info "Starting SIRFA Agent Finance deployment to Alibaba Cloud..."
    
    check_root
    check_requirements
    install_dependencies
    setup_application
    configure_environment
    setup_pm2
    setup_nginx
    setup_ssl
    setup_firewall
    run_tests
    show_status
    
    log_success "🎉 SIRFA Agent Finance deployed successfully!"
    log_info "Don't forget to:"
    log_info "1. Configure your PAI EAS credentials in $APP_DIR/backend/.env"
    log_info "2. Set up monitoring and alerts"
    log_info "3. Configure backup strategies"
    log_info "4. Review security settings"
}

# Handle script arguments
case "${1:-}" in
    "install-deps")
        check_root
        install_dependencies
        ;;
    "setup-app")
        setup_application
        ;;
    "setup-nginx")
        setup_nginx
        ;;
    "setup-ssl")
        setup_ssl
        ;;
    "test")
        run_tests
        ;;
    "status")
        show_status
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [install-deps|setup-app|setup-nginx|setup-ssl|test|status]"
        echo "  install-deps: Install system dependencies only"
        echo "  setup-app: Setup application only"
        echo "  setup-nginx: Setup Nginx only"
        echo "  setup-ssl: Setup SSL only"
        echo "  test: Run deployment tests"
        echo "  status: Show deployment status"
        echo "  (no args): Run full deployment"
        exit 1
        ;;
esac
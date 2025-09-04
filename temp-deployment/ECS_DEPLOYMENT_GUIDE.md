# SIRFA Agent Finance - Alibaba Cloud ECS Deployment Guide

This guide provides step-by-step instructions for deploying the SIRFA Agent Finance application to Alibaba Cloud ECS using Docker.

## Prerequisites

### 1. Alibaba Cloud Account Setup
- Active Alibaba Cloud account
- ECS instance (recommended: 4 vCPU, 8GB RAM, 40GB SSD)
- Security group configured to allow ports 80, 443, 22
- Domain name (optional, for SSL)

### 2. Required Alibaba Cloud Services
- **ECS**: Elastic Compute Service for hosting
- **RDS**: Relational Database Service (optional)
- **Redis**: ApsaraDB for Redis (optional, or use Docker Redis)
- **SLB**: Server Load Balancer (for high availability)
- **PAI EAS**: Platform for AI - Elastic Algorithm Service
- **DashScope**: AI model service

### 3. API Keys and Credentials
Gather the following credentials:
- Alibaba Cloud Access Key ID and Secret
- DashScope API Key
- PAI EAS Endpoint and Token
- Trading API keys (Alpaca, Alpha Vantage, etc.)

## Step 1: ECS Instance Setup

### 1.1 Create ECS Instance
```bash
# Connect to your ECS instance
ssh root@your-ecs-ip

# Update system packages
apt update && apt upgrade -y

# Install required packages
apt install -y curl wget git unzip
```

### 1.2 Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start Docker service
systemctl start docker
systemctl enable docker

# Add user to docker group (optional)
usermod -aG docker $USER
```

### 1.3 Configure Security Group
Ensure your ECS security group allows:
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 3001 (API - optional, for direct access)

## Step 2: Application Deployment

### 2.1 Clone Repository
```bash
# Clone the repository
git clone https://github.com/your-username/sirfa-agent-finance.git
cd sirfa-agent-finance

# Make deployment script executable
chmod +x deploy-ecs.sh
```

### 2.2 Configure Environment Variables
```bash
# Copy environment template
cp .env.production .env

# Edit environment file with your credentials
nano .env
```

**Important Environment Variables:**
```bash
# Application
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Alibaba Cloud
ALIBABA_ACCESS_KEY_ID=your_access_key_id
ALIBABA_ACCESS_KEY_SECRET=your_access_key_secret
ALIBABA_REGION=us-west-1
DASHSCOPE_API_KEY=your_dashscope_api_key

# PAI EAS
PAI_EAS_ENDPOINT=https://your-pai-eas-endpoint.com
PAI_EAS_TOKEN=your_pai_eas_token

# Database (if using RDS)
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/sirfa_db

# Redis (if using ApsaraDB)
REDIS_URL=redis://your-redis-endpoint:6379

# Trading APIs
ALPACA_API_KEY=your_alpaca_api_key
ALPACA_SECRET_KEY=your_alpaca_secret_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
NEWS_API_KEY=your_news_api_key
```

### 2.3 Deploy Application
```bash
# Run deployment script
./deploy-ecs.sh deploy

# Or deploy manually
docker-compose -f docker-compose.production.yml up -d
```

### 2.4 Verify Deployment
```bash
# Check service status
docker-compose -f docker-compose.production.yml ps

# Check application health
curl http://localhost/health

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## Step 3: SSL Certificate Setup (Optional)

### 3.1 Using Let's Encrypt
```bash
# Install Certbot
apt install -y certbot

# Stop nginx temporarily
docker-compose -f docker-compose.production.yml stop nginx

# Generate certificate
certbot certonly --standalone -d your-domain.com

# Copy certificates
mkdir -p /opt/sirfa/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/sirfa/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/sirfa/ssl/key.pem

# Set permissions
chown -R $USER:$USER /opt/sirfa/ssl
chmod 600 /opt/sirfa/ssl/key.pem
chmod 644 /opt/sirfa/ssl/cert.pem

# Restart nginx
docker-compose -f docker-compose.production.yml start nginx
```

### 3.2 Auto-renewal Setup
```bash
# Add to crontab for auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## Step 4: Monitoring and Maintenance

### 4.1 Setup Monitoring
```bash
# Enable monitoring in deployment
SETUP_MONITORING=true ./deploy-ecs.sh deploy
```

### 4.2 Log Management
```bash
# View application logs
docker-compose -f docker-compose.production.yml logs app

# View nginx logs
docker-compose -f docker-compose.production.yml logs nginx

# View all logs
docker-compose -f docker-compose.production.yml logs
```

### 4.3 Backup and Recovery
```bash
# Create backup
./deploy-ecs.sh backup

# Backups are stored in /opt/sirfa/backups/
ls -la /opt/sirfa/backups/
```

## Step 5: Scaling and High Availability

### 5.1 Load Balancer Setup
1. Create Alibaba Cloud SLB instance
2. Configure backend servers (multiple ECS instances)
3. Update DNS to point to SLB

### 5.2 Database High Availability
1. Use Alibaba Cloud RDS with Multi-AZ deployment
2. Configure read replicas for better performance
3. Setup automated backups

### 5.3 Redis High Availability
1. Use ApsaraDB for Redis with cluster mode
2. Configure Redis Sentinel for failover

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check container logs
docker-compose -f docker-compose.production.yml logs app

# Check container status
docker ps -a

# Restart specific service
docker-compose -f docker-compose.production.yml restart app
```

#### 2. Health Check Failures
```bash
# Check application health endpoint
curl -v http://localhost:3001/health

# Check nginx configuration
docker-compose -f docker-compose.production.yml exec nginx nginx -t
```

#### 3. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /opt/sirfa/ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443
```

#### 4. Database Connection Issues
```bash
# Test database connection
docker-compose -f docker-compose.production.yml exec app node -e "console.log(process.env.DATABASE_URL)"

# Check Redis connection
docker-compose -f docker-compose.production.yml exec redis redis-cli ping
```

### Performance Optimization

#### 1. Resource Monitoring
```bash
# Monitor resource usage
docker stats

# Check disk usage
df -h

# Check memory usage
free -h
```

#### 2. Application Optimization
- Enable Redis caching
- Configure CDN for static assets
- Optimize database queries
- Use connection pooling

## Useful Commands

```bash
# Deployment commands
./deploy-ecs.sh deploy    # Full deployment
./deploy-ecs.sh health    # Health check
./deploy-ecs.sh backup    # Create backup
./deploy-ecs.sh logs      # View logs
./deploy-ecs.sh stop      # Stop application
./deploy-ecs.sh restart   # Restart application
./deploy-ecs.sh status    # Check status

# Docker commands
docker-compose -f docker-compose.production.yml up -d     # Start services
docker-compose -f docker-compose.production.yml down      # Stop services
docker-compose -f docker-compose.production.yml ps        # List services
docker-compose -f docker-compose.production.yml logs -f   # Follow logs

# System maintenance
sudo apt update && sudo apt upgrade -y    # Update system
docker system prune -f                    # Clean up Docker
docker image prune -f                     # Remove unused images
```

## Security Best Practices

1. **Firewall Configuration**
   - Use Alibaba Cloud Security Groups
   - Limit SSH access to specific IPs
   - Close unnecessary ports

2. **SSL/TLS**
   - Always use HTTPS in production
   - Configure strong SSL ciphers
   - Enable HSTS headers

3. **Environment Variables**
   - Never commit secrets to version control
   - Use strong passwords and API keys
   - Rotate credentials regularly

4. **Container Security**
   - Run containers as non-root user
   - Keep base images updated
   - Scan images for vulnerabilities

5. **Database Security**
   - Use encrypted connections
   - Configure proper access controls
   - Regular security updates

## Support and Maintenance

- **Logs Location**: `/var/log/sirfa/`
- **Backups Location**: `/opt/sirfa/backups/`
- **SSL Certificates**: `/opt/sirfa/ssl/`
- **Application Data**: Docker volumes

For issues and support, check the application logs and refer to the troubleshooting section above.

---

**Note**: Replace placeholder values (your-domain.com, API keys, etc.) with your actual values before deployment.
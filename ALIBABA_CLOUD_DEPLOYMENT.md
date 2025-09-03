# Alibaba Cloud Deployment Guide for SIRFA Agent Finance

## Overview
This guide walks you through deploying the SIRFA Agent Finance application to Alibaba Cloud using PAI (Platform for AI) for enhanced AI trading capabilities.

## Prerequisites

### 1. Alibaba Cloud Account Setup
- Create an Alibaba Cloud account at [https://www.alibabacloud.com](https://www.alibabacloud.com)
- Enable the following services:
  - **PAI (Platform for AI)** - For AI model deployment
  - **ECS (Elastic Compute Service)** - For application hosting
  - **SLB (Server Load Balancer)** - For load balancing
  - **RDS** - For database (optional)
  - **OSS (Object Storage Service)** - For static assets

### 2. Required Credentials
Gather the following credentials from your Alibaba Cloud console:
- Access Key ID
- Access Key Secret
- Account ID
- Region (e.g., `us-west-1`, `ap-southeast-1`)

## Step 1: Deploy AI Models to PAI EAS

### 1.1 Access PAI Console
1. Log into Alibaba Cloud Console
2. Navigate to **PAI (Platform for AI)**
3. Go to **Model Online Services** > **EAS (Elastic Algorithm Service)**

### 1.2 Deploy QWEN Model
1. Click **Deploy Service**
2. Choose **Pre-trained Models**
3. Select **QWEN-7B-Chat** or **QWEN-14B-Chat**
4. Configure deployment:
   ```
   Service Name: sirfa-qwen-chat
   Instance Type: ecs.gn6i-c4g1.xlarge (or higher)
   Min Instances: 1
   Max Instances: 3
   Region: us-west-1 (match your application region)
   ```
5. Click **Deploy**
6. Wait for deployment to complete (5-10 minutes)
7. Note the **Service Endpoint URL** and **Token**

### 1.3 Test Model Deployment
```bash
curl -X POST "https://your-service-id.us-west-1.pai-eas.aliyuncs.com/v1/chat/completions" \
  -H "Authorization: your_pai_eas_token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen-7B-Chat",
    "messages": [
      {"role": "user", "content": "Hello, test message"}
    ],
    "max_tokens": 100
  }'
```

## Step 2: Configure Environment Variables

### 2.1 Update Backend Configuration
Update your `backend/.env` file with PAI credentials:

```env
# Alibaba Cloud Configuration
ALIBABA_ACCESS_KEY_ID=LTAI5t***************
ALIBABA_ACCESS_KEY_SECRET=your_access_key_secret
ALIBABA_ACCOUNT_ID=123456789012345
ALIBABA_REGION=us-west-1

# PAI EAS Configuration
PAI_EAS_SERVICE_URL=https://your-service-id.us-west-1.pai-eas.aliyuncs.com
PAI_EAS_SERVICE_TOKEN=your_pai_eas_token
PAI_MODEL_NAME=Qwen-7B-Chat
PAI_TIMEOUT=30000

# Trading API Configuration
ALPACA_API_KEY=your_alpaca_key
ALPACA_SECRET_KEY=your_alpaca_secret
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Application Configuration
PORT=3001
WS_PORT=8080
FRONTEND_URL=https://your-domain.com
NODE_ENV=production
```

### 2.2 Verify PAI Integration
Test the PAI integration locally:

```bash
# Start the backend
cd backend
npm start

# Test PAI health
curl http://localhost:3001/api/health/pai

# Test trading analysis
curl -X POST http://localhost:3001/api/health/test-trading-analysis \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Step 3: Deploy to Alibaba Cloud ECS

### 3.1 Create ECS Instance
1. Go to **ECS Console**
2. Click **Create Instance**
3. Configure:
   ```
   Instance Type: ecs.c6.large (2 vCPU, 4 GB RAM)
   Image: Ubuntu 20.04 LTS
   Storage: 40 GB SSD
   Network: VPC (create new if needed)
   Security Group: Allow ports 22, 80, 443, 3000, 3001, 8080
   ```
4. Launch instance and note the public IP

### 3.2 Setup Application Environment
SSH into your ECS instance:

```bash
ssh root@your-ecs-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git
```

### 3.3 Deploy Application Code
```bash
# Clone repository
git clone https://github.com/your-username/sirfa-agent-finance.git
cd sirfa-agent-finance

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Build frontend for production
npm run build
```

### 3.4 Configure Environment
```bash
# Copy environment file
cd ../backend
cp .env.example .env

# Edit with your PAI and Alpaca credentials
nano .env
```

### 3.5 Setup PM2 Process Management
Create `ecosystem.config.js`:

```javascript
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
      log_file: './logs/backend-combined.log'
    }
  ]
};
```

Start the application:
```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### 3.6 Configure Nginx
Create `/etc/nginx/sites-available/sirfa`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (React build)
    location / {
        root /root/sirfa-agent-finance/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Enable gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
# Enable site
ln -s /etc/nginx/sites-available/sirfa /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

## Step 4: Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com

# Setup auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 5: Setup Monitoring and Logging

### 5.1 Application Monitoring
```bash
# Monitor PM2 processes
pm2 monit

# View logs
pm2 logs sirfa-backend

# Restart if needed
pm2 restart sirfa-backend
```

### 5.2 System Monitoring
Install CloudMonitor agent:
```bash
# Download and install CloudMonitor
wget http://cms-agent-cn-hangzhou.oss-cn-hangzhou.aliyuncs.com/release/1.3.7/install.sh
sudo bash install.sh
```

## Step 6: Testing Deployment

### 6.1 Health Checks
```bash
# Test backend health
curl https://your-domain.com/api/health/system

# Test PAI integration
curl https://your-domain.com/api/health/pai

# Test AI functionality
curl -X POST https://your-domain.com/api/health/test-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Analyze AAPL stock"}'
```

### 6.2 Frontend Testing
1. Open `https://your-domain.com` in browser
2. Test AI agent interactions
3. Verify trading functionality
4. Check WebSocket connections

## Step 7: Production Optimizations

### 7.1 Database Setup (Optional)
For production, consider using Alibaba Cloud RDS:

1. Create RDS MySQL instance
2. Update backend to use database for:
   - User sessions
   - Trading history
   - AI conversation logs
   - Portfolio data persistence

### 7.2 CDN Setup
1. Enable Alibaba Cloud CDN
2. Configure for static assets
3. Update frontend build to use CDN URLs

### 7.3 Auto Scaling
1. Create ECS Auto Scaling Group
2. Configure scaling policies based on CPU/memory
3. Setup Application Load Balancer

## Troubleshooting

### Common Issues

1. **PAI EAS Connection Failed**
   ```bash
   # Check service status in PAI console
   # Verify token and endpoint URL
   # Check network connectivity
   curl -v https://your-service-id.us-west-1.pai-eas.aliyuncs.com
   ```

2. **Backend Not Starting**
   ```bash
   # Check PM2 logs
   pm2 logs sirfa-backend
   
   # Check environment variables
   pm2 env 0
   ```

3. **Frontend Not Loading**
   ```bash
   # Check Nginx logs
   tail -f /var/log/nginx/error.log
   
   # Verify build files
   ls -la /root/sirfa-agent-finance/frontend/dist/
   ```

### Performance Monitoring

1. **PAI EAS Metrics**
   - Monitor in PAI console
   - Check response times and error rates
   - Scale instances if needed

2. **Application Metrics**
   ```bash
   # PM2 monitoring
   pm2 monit
   
   # System resources
   htop
   df -h
   ```

## Security Considerations

1. **API Keys Security**
   - Store in environment variables only
   - Use Alibaba Cloud KMS for key management
   - Rotate keys regularly

2. **Network Security**
   - Configure security groups properly
   - Use VPC for internal communication
   - Enable WAF for web protection

3. **Application Security**
   - Keep dependencies updated
   - Use HTTPS everywhere
   - Implement rate limiting
   - Validate all inputs

## Cost Optimization

1. **PAI EAS**
   - Use auto-scaling for variable workloads
   - Consider spot instances for development
   - Monitor usage and optimize instance types

2. **ECS**
   - Use reserved instances for production
   - Right-size instances based on monitoring
   - Use burstable instances for variable loads

## Support and Resources

- [Alibaba Cloud PAI Documentation](https://www.alibabacloud.com/help/en/pai)
- [EAS Model Deployment Guide](https://www.alibabacloud.com/help/en/pai/user-guide/deploy-services-in-eas)
- [ECS Documentation](https://www.alibabacloud.com/help/en/ecs)
- [SIRFA Project Repository](https://github.com/your-username/sirfa-agent-finance)

---

**Congratulations!** 🎉 Your SIRFA Agent Finance application is now deployed on Alibaba Cloud with PAI integration for enhanced AI trading capabilities.

For hackathon submissions, make sure to:
1. Document your PAI usage and benefits
2. Showcase AI-powered trading features
3. Highlight performance improvements
4. Demonstrate scalability with Alibaba Cloud services
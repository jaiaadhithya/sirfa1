# SIRFA Agent Finance - Alibaba Cloud Deployment Guide

## Overview

This guide walks you through deploying the SIRFA Agent Finance application to Alibaba Cloud using PAI (Platform for AI) for AI inference. The application has been successfully integrated with Alibaba Cloud PAI EAS (Elastic Algorithm Service) for LLM inference.

## 🚀 Quick Start

### Prerequisites

1. **Alibaba Cloud Account** with the following services enabled:
   - PAI (Platform for AI)
   - ECS (Elastic Compute Service)
   - VPC (Virtual Private Cloud)
   - Security Groups

2. **PAI EAS Model Deployment**:
   - Deploy a compatible LLM model (e.g., Qwen-Plus, Qwen-Max) to PAI EAS
   - Obtain the service URL and access token

3. **Trading API Access**:
   - Alpaca Markets API credentials (for paper trading)

### Deployment Options

#### Option 1: Automated Deployment (Recommended)

**For Linux/Ubuntu ECS:**
```bash
# Make the script executable
chmod +x deploy-alibaba-cloud.sh

# Run full deployment
sudo ./deploy-alibaba-cloud.sh

# Or with domain name for SSL
sudo ./deploy-alibaba-cloud.sh
# When prompted, enter your domain name
```

**For Windows ECS:**
```powershell
# Run as Administrator
.\deploy-alibaba-cloud.ps1

# Or with domain name for SSL
.\deploy-alibaba-cloud.ps1 -DomainName "your-domain.com"

# Skip SSL setup
.\deploy-alibaba-cloud.ps1 -SkipSSL
```

#### Option 2: Manual Deployment

Follow the step-by-step instructions below for manual deployment.

## 📋 Step-by-Step Manual Deployment

### Step 1: Set Up Alibaba Cloud ECS Instance

1. **Create ECS Instance:**
   - Choose Ubuntu 20.04 LTS or Windows Server 2019/2022
   - Minimum: 2 vCPU, 4GB RAM, 40GB SSD
   - Recommended: 4 vCPU, 8GB RAM, 100GB SSD

2. **Configure Security Group:**
   ```
   Inbound Rules:
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
   - SSH (22): Your IP only
   - Custom TCP (3001): 0.0.0.0/0 (Backend API)
   ```

3. **Connect to Instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

### Step 2: Deploy PAI EAS Model

1. **Access PAI Console:**
   - Go to Alibaba Cloud Console → PAI → Model Deployment

2. **Deploy LLM Model:**
   - Choose Qwen-Plus or Qwen-Max
   - Select EAS deployment
   - Configure instance type (recommend GPU instances for better performance)
   - Deploy and wait for service to be ready

3. **Get Service Details:**
   - Copy the service URL (e.g., `https://your-service.eas.aliyuncs.com`)
   - Generate or copy the access token

### Step 3: Configure Application Environment

1. **Clone Repository:**
   ```bash
   git clone https://github.com/your-username/sirfa-agent-finance.git
   cd sirfa-agent-finance
   ```

2. **Configure Backend Environment:**
   ```bash
   cd backend
   cp .env.example .env
   nano .env
   ```

3. **Update .env file:**
   ```env
   # Alibaba Cloud PAI Configuration
   PAI_EAS_SERVICE_URL=https://your-service.eas.aliyuncs.com
   PAI_EAS_SERVICE_TOKEN=your_pai_eas_service_token_here
   PAI_MODEL_NAME=qwen-plus
   PAI_TIMEOUT=30000
   ALIBABA_REGION=us-east-1

   # Fallback QWEN API (optional)
   QWEN_API_KEY=your_qwen_api_key_here

   # Alpaca Trading API
   ALPACA_API_KEY=your_alpaca_api_key_here
   ALPACA_SECRET_KEY=your_alpaca_secret_key_here
   ALPACA_BASE_URL=https://paper-api.alpaca.markets

   # Application Configuration
   PORT=3001
   NODE_ENV=production
   CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
   ```

### Step 4: Install Dependencies and Build

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install backend dependencies
cd backend
npm install --production

# Install frontend dependencies and build
cd ../frontend
npm install
npm run build
```

### Step 5: Set Up Process Management

1. **Create PM2 Ecosystem File:**
   ```javascript
   // ecosystem.config.js
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
         }
       }
     ]
   };
   ```

2. **Start Application:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Step 6: Configure Web Server

**For Nginx (Linux):**

1. **Install Nginx:**
   ```bash
   sudo apt install nginx
   ```

2. **Configure Site:**
   ```nginx
   # /etc/nginx/sites-available/sirfa-agent-finance
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           root /path/to/sirfa-agent-finance/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
       
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable Site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/sirfa-agent-finance /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

**For IIS (Windows):**
- The PowerShell script automatically configures IIS with URL rewriting

### Step 7: Set Up SSL Certificate

**For Linux:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

**For Windows:**
- The PowerShell script can automatically set up SSL using win-acme

## 🧪 Testing the Deployment

### Health Checks

1. **System Health:**
   ```bash
   curl http://your-domain.com/api/health/system
   ```

2. **PAI Integration:**
   ```bash
   curl http://your-domain.com/api/health/pai
   ```

3. **AI Services:**
   ```bash
   curl http://your-domain.com/api/health/ai
   ```

4. **Trading Analysis Test:**
   ```bash
   curl http://your-domain.com/api/health/test-trading-analysis
   ```

### Expected Responses

**Healthy PAI Integration:**
```json
{
  "status": "healthy",
  "service": "PAI EAS",
  "model": "qwen-plus",
  "serviceUrl": "https://your-service.eas.aliyuncs.com",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PAI_EAS_SERVICE_URL` | PAI EAS service endpoint | Yes |
| `PAI_EAS_SERVICE_TOKEN` | PAI EAS access token | Yes |
| `PAI_MODEL_NAME` | Model name (e.g., qwen-plus) | Yes |
| `PAI_TIMEOUT` | Request timeout in milliseconds | No (default: 30000) |
| `ALIBABA_REGION` | Alibaba Cloud region | No (default: us-east-1) |
| `ALPACA_API_KEY` | Alpaca trading API key | Yes |
| `ALPACA_SECRET_KEY` | Alpaca trading secret key | Yes |
| `QWEN_API_KEY` | Fallback QWEN API key | No |

### PAI Model Options

- **qwen-plus**: Balanced performance and cost
- **qwen-max**: Maximum performance
- **qwen-turbo**: Fastest response time

## 📊 Monitoring and Maintenance

### PM2 Monitoring

```bash
# Check application status
pm2 status

# View logs
pm2 logs sirfa-backend

# Restart application
pm2 restart sirfa-backend

# Monitor resources
pm2 monit
```

### Log Files

- Backend logs: `./logs/backend-*.log`
- Nginx logs: `/var/log/nginx/`
- PM2 logs: `~/.pm2/logs/`

### Performance Optimization

1. **Enable Gzip Compression** (Nginx)
2. **Configure Caching** for static assets
3. **Use CDN** for global distribution
4. **Monitor PAI EAS** usage and costs
5. **Set up Auto-scaling** for high traffic

## 🔒 Security Considerations

### API Security

- Store sensitive credentials in environment variables
- Use HTTPS for all communications
- Implement rate limiting
- Regular security updates

### Alibaba Cloud Security

- Configure Security Groups properly
- Use RAM (Resource Access Management) for fine-grained access control
- Enable CloudMonitor for monitoring
- Set up ActionTrail for audit logging

## 🚨 Troubleshooting

### Common Issues

1. **PAI EAS Connection Failed:**
   - Check service URL and token
   - Verify network connectivity
   - Check PAI EAS service status

2. **Backend Not Starting:**
   - Check environment variables
   - Verify Node.js version (18+)
   - Check port availability

3. **Frontend Not Loading:**
   - Verify build completed successfully
   - Check Nginx/IIS configuration
   - Verify static file permissions

### Debug Commands

```bash
# Check backend logs
pm2 logs sirfa-backend --lines 100

# Test PAI connection
curl -X POST "$PAI_EAS_SERVICE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $PAI_EAS_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Check system resources
htop
df -h
```

## 📞 Support

For issues related to:
- **PAI EAS**: Check Alibaba Cloud PAI documentation
- **Application**: Review application logs and health endpoints
- **Deployment**: Use the automated deployment scripts

## 🎉 Success!

Once deployed, your SIRFA Agent Finance application will be running with:
- ✅ Alibaba Cloud PAI integration for AI inference
- ✅ Secure HTTPS communication
- ✅ Production-ready process management
- ✅ Comprehensive health monitoring
- ✅ Scalable architecture

Access your application at: `https://your-domain.com`

---

**Note**: This deployment guide is specifically designed for the Alibaba AI Hackathon and uses Alibaba Cloud PAI as the primary AI service provider.
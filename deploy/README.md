# SIRFA Agent Finance - Deployment Guide

This directory contains deployment configurations and scripts for the SIRFA Agent Finance platform on Alibaba Cloud.

## 📁 Directory Structure

```
deploy/
├── terraform/              # Terraform infrastructure as code
│   ├── main.tf             # Main Terraform configuration
│   ├── resources.tf        # Alibaba Cloud resources
│   ├── iam.tf              # IAM roles and policies
│   ├── variables.tf        # Input variables
│   ├── outputs.tf          # Output values
│   └── terraform.tfvars.example  # Example variables file
├── kubernetes/             # Kubernetes manifests
│   ├── deployment.yaml     # Application deployment
│   ├── configmap.yaml      # Configuration maps
│   └── secrets.yaml        # Secret templates
├── deploy.sh              # Bash deployment script
├── deploy.ps1             # PowerShell deployment script
└── README.md              # This file
```

## 🚀 Deployment Options

### Option 1: Terraform + Alibaba Cloud (Recommended)

Deploy the complete infrastructure on Alibaba Cloud using Terraform.

#### Prerequisites

1. **Terraform** (>= 1.0)
2. **Alibaba Cloud Account** with appropriate permissions
3. **Alibaba Cloud CLI** (optional, for easier credential management)

#### Quick Start

1. **Configure Credentials**
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your actual values
   ```

2. **Deploy Infrastructure**
   ```bash
   # Using the deployment script (recommended)
   ../deploy.sh prod
   
   # Or manually
   terraform init
   terraform plan -var="environment=prod"
   terraform apply
   ```

3. **Get Deployment Information**
   ```bash
   terraform output
   ```

#### What Gets Deployed

- **ECS Instance**: Backend API server
- **RDS MySQL**: Database for application data
- **Function Compute**: AI trading decision engine
- **OSS Bucket**: Static assets and file storage
- **Log Service**: Centralized logging
- **VPC & Security Groups**: Network infrastructure
- **RAM Roles**: Proper IAM permissions

### Option 2: Docker Compose (Development/Testing)

For local development or testing environments.

```bash
# From project root
docker-compose up -d
```

### Option 3: Kubernetes (Advanced)

For container orchestration in production environments.

#### Prerequisites

1. **Kubernetes Cluster** (ACK, EKS, or self-managed)
2. **kubectl** configured
3. **Helm** (optional, for easier management)

#### Deployment Steps

1. **Create Namespace**
   ```bash
   kubectl create namespace sirfa-finance
   ```

2. **Configure Secrets**
   ```bash
   # Edit kubernetes/secrets.yaml with base64-encoded values
   kubectl apply -f kubernetes/secrets.yaml
   ```

3. **Apply Configuration**
   ```bash
   kubectl apply -f kubernetes/configmap.yaml
   kubectl apply -f kubernetes/deployment.yaml
   ```

4. **Verify Deployment**
   ```bash
   kubectl get pods -n sirfa-finance
   kubectl get services -n sirfa-finance
   ```

## 🔧 Configuration

### Environment Variables

The application supports multiple environment configurations:

- **Development**: `.env` (default)
- **Staging**: `.env.staging`
- **Production**: `.env.production`
- **Docker**: `.env.docker`

### Required Secrets

#### Alibaba Cloud
- `ALIBABA_CLOUD_ACCESS_KEY_ID`
- `ALIBABA_CLOUD_ACCESS_KEY_SECRET`
- `ALIBABA_CLOUD_ACCOUNT_ID`

#### Database
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`

#### Trading APIs
- `ALPACA_API_KEY`
- `ALPACA_SECRET_KEY`
- `YAHOO_FINANCE_API_KEY`

#### Security
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `SESSION_SECRET`

### Configuration Management

The application uses a centralized configuration system located in `backend/config/index.js`. This module:

- Loads environment-specific variables
- Validates required configurations
- Provides type-safe access to settings
- Handles environment-specific defaults

## 🏗️ Infrastructure Details

### Alibaba Cloud Resources

| Resource | Purpose | Configuration |
|----------|---------|---------------|
| ECS | Backend API server | t6-c1m2.large (2 vCPU, 4GB RAM) |
| RDS MySQL | Application database | Serverless MySQL 8.0 |
| Function Compute | AI decision engine | 512MB memory, 60s timeout |
| OSS | File storage | Standard storage class |
| Log Service | Centralized logging | 30-day retention |
| VPC | Network isolation | 10.0.0.0/16 CIDR |

### Security Features

- **Network Isolation**: VPC with private subnets
- **Access Control**: RAM roles with minimal permissions
- **Encryption**: Data encryption at rest and in transit
- **Monitoring**: CloudMonitor integration
- **Backup**: Automated database backups

## 📊 Monitoring & Logging

### Health Checks

- **Application**: `GET /health`
- **Database**: Connection pool monitoring
- **External APIs**: Service availability checks

### Metrics

- **Application Metrics**: `/metrics` endpoint (Prometheus format)
- **System Metrics**: CloudMonitor integration
- **Custom Metrics**: Trading performance, AI decisions

### Logging

- **Application Logs**: Structured JSON logs
- **Access Logs**: HTTP request/response logs
- **Error Logs**: Exception tracking and alerting
- **Audit Logs**: Trading decisions and user actions

## 🔄 CI/CD Pipeline

### Recommended Workflow

1. **Code Commit**: Push to main branch
2. **Build**: Docker image creation
3. **Test**: Automated testing suite
4. **Deploy**: Environment-specific deployment
5. **Verify**: Health checks and smoke tests

### Environment Promotion

```
Development → Staging → Production
```

- **Development**: Feature development and testing
- **Staging**: Integration testing and UAT
- **Production**: Live trading environment

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check RDS instance status
terraform output rds_connection_string

# Verify security group rules
# Ensure ECS can access RDS on port 3306
```

#### 2. Function Compute Timeout
```bash
# Check function logs
# Increase timeout in terraform/variables.tf
# Redeploy with terraform apply
```

#### 3. API Rate Limiting
```bash
# Check rate limit configuration
# Verify API key quotas
# Monitor CloudWatch metrics
```

### Log Analysis

```bash
# View application logs
kubectl logs -f deployment/sirfa-backend -n sirfa-finance

# Check specific pod logs
kubectl logs -f pod/sirfa-backend-xxx -n sirfa-finance

# View previous container logs
kubectl logs --previous pod/sirfa-backend-xxx -n sirfa-finance
```

## 🔐 Security Best Practices

### Secrets Management

1. **Never commit secrets** to version control
2. **Use Kubernetes secrets** or Alibaba Cloud KMS
3. **Rotate credentials** regularly
4. **Limit access** with IAM policies

### Network Security

1. **Use VPC** for network isolation
2. **Configure security groups** with minimal access
3. **Enable SSL/TLS** for all communications
4. **Use private subnets** for databases

### Application Security

1. **Input validation** on all endpoints
2. **Rate limiting** to prevent abuse
3. **Authentication** for all API access
4. **Audit logging** for compliance

## 📈 Scaling Considerations

### Horizontal Scaling

- **ECS Auto Scaling**: Based on CPU/memory usage
- **Function Compute**: Automatic scaling
- **Database**: Read replicas for read-heavy workloads

### Performance Optimization

- **Caching**: Redis for frequently accessed data
- **CDN**: OSS with CDN for static assets
- **Connection Pooling**: Database connection optimization
- **Load Balancing**: Application Load Balancer

## 🆘 Support

For deployment issues or questions:

1. Check the troubleshooting section above
2. Review application logs
3. Consult Alibaba Cloud documentation
4. Contact the development team

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
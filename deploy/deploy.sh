#!/bin/bash

# SIRFA Agent Finance - Alibaba Cloud Deployment Script
# This script automates the deployment of the SIRFA trading platform to Alibaba Cloud

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TERRAFORM_DIR="./terraform"
ENVIRONMENT=${1:-dev}
AUTO_APPROVE=${2:-false}

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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install Terraform first."
        exit 1
    fi
    
    # Check Terraform version
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
    log_info "Terraform version: $TERRAFORM_VERSION"
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed. Some features may not work properly."
    fi
    
    # Check if terraform.tfvars exists
    if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
        log_error "terraform.tfvars not found. Please copy terraform.tfvars.example to terraform.tfvars and configure it."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

init_terraform() {
    log_info "Initializing Terraform..."
    cd "$TERRAFORM_DIR"
    
    terraform init
    
    if [ $? -eq 0 ]; then
        log_success "Terraform initialized successfully"
    else
        log_error "Terraform initialization failed"
        exit 1
    fi
}

validate_terraform() {
    log_info "Validating Terraform configuration..."
    
    terraform validate
    
    if [ $? -eq 0 ]; then
        log_success "Terraform configuration is valid"
    else
        log_error "Terraform configuration validation failed"
        exit 1
    fi
}

plan_terraform() {
    log_info "Creating Terraform execution plan..."
    
    terraform plan -var="environment=$ENVIRONMENT" -out=tfplan
    
    if [ $? -eq 0 ]; then
        log_success "Terraform plan created successfully"
    else
        log_error "Terraform plan creation failed"
        exit 1
    fi
}

apply_terraform() {
    log_info "Applying Terraform configuration..."
    
    if [ "$AUTO_APPROVE" = "true" ]; then
        terraform apply -auto-approve tfplan
    else
        terraform apply tfplan
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Terraform apply completed successfully"
    else
        log_error "Terraform apply failed"
        exit 1
    fi
}

show_outputs() {
    log_info "Deployment outputs:"
    echo "========================"
    
    terraform output -json > outputs.json
    
    if command -v jq &> /dev/null; then
        echo "Application URL: $(terraform output -raw application_url)"
        echo "API Base URL: $(terraform output -raw api_base_url)"
        echo "ECS Public IP: $(terraform output -raw ecs_public_ip)"
        echo "RDS Connection: $(terraform output -raw rds_connection_string)"
        echo "OSS Bucket: $(terraform output -raw oss_bucket_name)"
        echo "FC Service: $(terraform output -raw fc_service_name)"
    else
        terraform output
    fi
    
    echo "========================"
    log_success "Deployment completed successfully!"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f tfplan outputs.json
}

# Main deployment process
main() {
    log_info "Starting SIRFA Agent Finance deployment to Alibaba Cloud"
    log_info "Environment: $ENVIRONMENT"
    log_info "Auto-approve: $AUTO_APPROVE"
    echo "========================"
    
    # Trap to ensure cleanup on exit
    trap cleanup EXIT
    
    check_prerequisites
    init_terraform
    validate_terraform
    plan_terraform
    
    # Ask for confirmation if not auto-approved
    if [ "$AUTO_APPROVE" != "true" ]; then
        echo
        read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    apply_terraform
    show_outputs
    
    log_success "SIRFA Agent Finance has been successfully deployed to Alibaba Cloud!"
}

# Help function
show_help() {
    echo "SIRFA Agent Finance - Alibaba Cloud Deployment Script"
    echo
    echo "Usage: $0 [ENVIRONMENT] [AUTO_APPROVE]"
    echo
    echo "Arguments:"
    echo "  ENVIRONMENT   Environment to deploy (dev, staging, prod). Default: dev"
    echo "  AUTO_APPROVE  Skip confirmation prompt (true/false). Default: false"
    echo
    echo "Examples:"
    echo "  $0                    # Deploy to dev environment with confirmation"
    echo "  $0 prod               # Deploy to prod environment with confirmation"
    echo "  $0 dev true           # Deploy to dev environment without confirmation"
    echo
    echo "Prerequisites:"
    echo "  - Terraform installed"
    echo "  - terraform.tfvars configured with your Alibaba Cloud credentials"
    echo "  - jq installed (optional, for better output formatting)"
}

# Check for help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Run main function
main
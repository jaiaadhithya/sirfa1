# SIRFA Agent Finance - Alibaba Cloud Deployment Script (PowerShell)
# This script automates the deployment of the SIRFA trading platform to Alibaba Cloud

param(
    [string]$Environment = "dev",
    [switch]$AutoApprove = $false,
    [switch]$Help = $false
)

# Configuration
$TerraformDir = "./terraform"
$ErrorActionPreference = "Stop"

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Show-Help {
    Write-Host "SIRFA Agent Finance - Alibaba Cloud Deployment Script" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\deploy.ps1 [-Environment <env>] [-AutoApprove] [-Help]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -Environment   Environment to deploy (dev, staging, prod). Default: dev"
    Write-Host "  -AutoApprove   Skip confirmation prompt"
    Write-Host "  -Help          Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\deploy.ps1                           # Deploy to dev environment with confirmation"
    Write-Host "  .\deploy.ps1 -Environment prod         # Deploy to prod environment with confirmation"
    Write-Host "  .\deploy.ps1 -Environment dev -AutoApprove  # Deploy to dev environment without confirmation"
    Write-Host ""
    Write-Host "Prerequisites:"
    Write-Host "  - Terraform installed and in PATH"
    Write-Host "  - terraform.tfvars configured with your Alibaba Cloud credentials"
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if Terraform is installed
    try {
        $terraformVersion = terraform version
        Write-Info "Terraform found: $($terraformVersion[0])"
    }
    catch {
        Write-Error "Terraform is not installed or not in PATH. Please install Terraform first."
        exit 1
    }
    
    # Check if terraform.tfvars exists
    $tfvarsPath = Join-Path $TerraformDir "terraform.tfvars"
    if (-not (Test-Path $tfvarsPath)) {
        Write-Error "terraform.tfvars not found at $tfvarsPath. Please copy terraform.tfvars.example to terraform.tfvars and configure it."
        exit 1
    }
    
    Write-Success "Prerequisites check completed"
}

function Initialize-Terraform {
    Write-Info "Initializing Terraform..."
    
    Push-Location $TerraformDir
    
    try {
        terraform init
        Write-Success "Terraform initialized successfully"
    }
    catch {
        Write-Error "Terraform initialization failed: $($_.Exception.Message)"
        Pop-Location
        exit 1
    }
}

function Test-TerraformConfiguration {
    Write-Info "Validating Terraform configuration..."
    
    try {
        terraform validate
        Write-Success "Terraform configuration is valid"
    }
    catch {
        Write-Error "Terraform configuration validation failed: $($_.Exception.Message)"
        exit 1
    }
}

function New-TerraformPlan {
    Write-Info "Creating Terraform execution plan..."
    
    try {
        terraform plan -var="environment=$Environment" -out=tfplan
        Write-Success "Terraform plan created successfully"
    }
    catch {
        Write-Error "Terraform plan creation failed: $($_.Exception.Message)"
        exit 1
    }
}

function Invoke-TerraformApply {
    Write-Info "Applying Terraform configuration..."
    
    try {
        if ($AutoApprove) {
            terraform apply -auto-approve tfplan
        }
        else {
            terraform apply tfplan
        }
        Write-Success "Terraform apply completed successfully"
    }
    catch {
        Write-Error "Terraform apply failed: $($_.Exception.Message)"
        exit 1
    }
}

function Show-DeploymentOutputs {
    Write-Info "Deployment outputs:"
    Write-Host "========================" -ForegroundColor Cyan
    
    try {
        # Get outputs
        $appUrl = terraform output -raw application_url
        $apiUrl = terraform output -raw api_base_url
        $ecsIp = terraform output -raw ecs_public_ip
        $rdsConnection = terraform output -raw rds_connection_string
        $ossBucket = terraform output -raw oss_bucket_name
        $fcService = terraform output -raw fc_service_name
        
        Write-Host "Application URL: $appUrl" -ForegroundColor White
        Write-Host "API Base URL: $apiUrl" -ForegroundColor White
        Write-Host "ECS Public IP: $ecsIp" -ForegroundColor White
        Write-Host "RDS Connection: $rdsConnection" -ForegroundColor White
        Write-Host "OSS Bucket: $ossBucket" -ForegroundColor White
        Write-Host "FC Service: $fcService" -ForegroundColor White
    }
    catch {
        Write-Warning "Could not retrieve some outputs. Running terraform output:"
        terraform output
    }
    
    Write-Host "========================" -ForegroundColor Cyan
    Write-Success "Deployment completed successfully!"
}

function Remove-TemporaryFiles {
    Write-Info "Cleaning up temporary files..."
    
    $filesToRemove = @("tfplan", "outputs.json")
    foreach ($file in $filesToRemove) {
        if (Test-Path $file) {
            Remove-Item $file -Force
        }
    }
}

# Main deployment process
function Start-Deployment {
    Write-Info "Starting SIRFA Agent Finance deployment to Alibaba Cloud"
    Write-Info "Environment: $Environment"
    Write-Info "Auto-approve: $AutoApprove"
    Write-Host "========================" -ForegroundColor Cyan
    
    try {
        Test-Prerequisites
        Initialize-Terraform
        Test-TerraformConfiguration
        New-TerraformPlan
        
        # Ask for confirmation if not auto-approved
        if (-not $AutoApprove) {
            Write-Host ""
            $confirmation = Read-Host "Do you want to proceed with the deployment? (y/N)"
            if ($confirmation -notmatch '^[Yy]$') {
                Write-Info "Deployment cancelled by user"
                return
            }
        }
        
        Invoke-TerraformApply
        Show-DeploymentOutputs
        
        Write-Success "SIRFA Agent Finance has been successfully deployed to Alibaba Cloud!"
    }
    catch {
        Write-Error "Deployment failed: $($_.Exception.Message)"
        exit 1
    }
    finally {
        Remove-TemporaryFiles
        Pop-Location -ErrorAction SilentlyContinue
    }
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

# Validate environment parameter
if ($Environment -notin @("dev", "staging", "prod")) {
    Write-Error "Invalid environment '$Environment'. Must be one of: dev, staging, prod"
    exit 1
}

# Start deployment
Start-Deployment
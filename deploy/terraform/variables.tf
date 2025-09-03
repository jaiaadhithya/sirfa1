# Alibaba Cloud Configuration
variable "access_key" {
  description = "Alibaba Cloud Access Key ID"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "Alibaba Cloud Secret Access Key"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "Alibaba Cloud region"
  type        = string
  default     = "ap-southeast-1"
}

variable "account_id" {
  description = "Alibaba Cloud Account ID"
  type        = string
}

# Environment Configuration
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "sirfa-agent-finance"
}

# Database Configuration
variable "db_username" {
  description = "Database username"
  type        = string
  default     = "sirfa_admin"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "mysql.n2.serverless.1c"
}

# ECS Configuration
variable "instance_type" {
  description = "ECS instance type"
  type        = string
  default     = "ecs.t6-c1m2.large"
}

variable "system_disk_size" {
  description = "System disk size in GB"
  type        = number
  default     = 40
}

# Function Compute Configuration
variable "fc_memory_size" {
  description = "Function Compute memory size in MB"
  type        = number
  default     = 512
}

variable "fc_timeout" {
  description = "Function Compute timeout in seconds"
  type        = number
  default     = 60
}

# Application Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "ssl_certificate_id" {
  description = "SSL certificate ID for HTTPS"
  type        = string
  default     = ""
}

# Monitoring and Logging
variable "log_retention_days" {
  description = "Log retention period in days"
  type        = number
  default     = 30
}

variable "enable_monitoring" {
  description = "Enable CloudMonitor for resources"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_retention_period" {
  description = "Database backup retention period in days"
  type        = number
  default     = 7
}

variable "preferred_backup_time" {
  description = "Preferred backup time (HH:MM-HH:MM)"
  type        = string
  default     = "02:00-03:00"
}

# Tags
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "sirfa-agent-finance"
    Owner       = "sirfa-team"
    ManagedBy   = "terraform"
  }
}
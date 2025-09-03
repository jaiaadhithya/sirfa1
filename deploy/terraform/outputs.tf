# ECS Instance Outputs
output "ecs_instance_id" {
  description = "ID of the ECS instance"
  value       = alicloud_instance.backend_server.id
}

output "ecs_public_ip" {
  description = "Public IP address of the ECS instance"
  value       = alicloud_instance.backend_server.public_ip
}

output "ecs_private_ip" {
  description = "Private IP address of the ECS instance"
  value       = alicloud_instance.backend_server.private_ip
}

# Database Outputs
output "rds_instance_id" {
  description = "ID of the RDS instance"
  value       = alicloud_db_instance.mysql_instance.id
}

output "rds_connection_string" {
  description = "RDS connection string"
  value       = alicloud_db_instance.mysql_instance.connection_string
  sensitive   = true
}

output "rds_port" {
  description = "RDS port"
  value       = alicloud_db_instance.mysql_instance.port
}

# Function Compute Outputs
output "fc_service_name" {
  description = "Function Compute service name"
  value       = alicloud_fc_service.trading_service.name
}

output "fc_function_name" {
  description = "Function Compute function name"
  value       = alicloud_fc_function.trading_decision_engine.name
}

output "fc_service_endpoint" {
  description = "Function Compute service endpoint"
  value       = "https://${var.account_id}.${var.region}.fc.aliyuncs.com/2016-08-15/proxy/${alicloud_fc_service.trading_service.name}/${alicloud_fc_function.trading_decision_engine.name}/"
}

# OSS Outputs
output "oss_bucket_name" {
  description = "OSS bucket name"
  value       = alicloud_oss_bucket.app_storage.bucket
}

output "oss_bucket_endpoint" {
  description = "OSS bucket endpoint"
  value       = alicloud_oss_bucket.app_storage.extranet_endpoint
}

# Log Service Outputs
output "log_project_name" {
  description = "Log Service project name"
  value       = alicloud_log_project.app_logs.name
}

output "app_log_store_name" {
  description = "Application log store name"
  value       = alicloud_log_store.app_log_store.name
}

output "fc_log_store_name" {
  description = "Function Compute log store name"
  value       = alicloud_log_store.fc_log_store.name
}

# Network Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = alicloud_vpc.main_vpc.id
}

output "vswitch_id" {
  description = "VSwitch ID"
  value       = alicloud_vswitch.main_vswitch.id
}

output "security_group_id" {
  description = "Security Group ID"
  value       = alicloud_security_group.web_sg.id
}

# Application URLs
output "application_url" {
  description = "Application URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${alicloud_instance.backend_server.public_ip}:3001"
}

output "api_base_url" {
  description = "API base URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}/api" : "http://${alicloud_instance.backend_server.public_ip}:3001/api"
}

# Environment Configuration
output "environment_variables" {
  description = "Environment variables for application deployment"
  value = {
    NODE_ENV                    = var.environment
    PORT                       = "3001"
    DB_HOST                    = alicloud_db_instance.mysql_instance.connection_string
    DB_PORT                    = alicloud_db_instance.mysql_instance.port
    DB_NAME                    = alicloud_db_database.sirfa_db.name
    DB_USER                    = alicloud_db_account.db_account.name
    OSS_BUCKET                 = alicloud_oss_bucket.app_storage.bucket
    OSS_ENDPOINT               = alicloud_oss_bucket.app_storage.extranet_endpoint
    FC_SERVICE_NAME            = alicloud_fc_service.trading_service.name
    FC_FUNCTION_NAME           = alicloud_fc_function.trading_decision_engine.name
    FC_ENDPOINT                = "https://${var.account_id}.${var.region}.fc.aliyuncs.com"
    LOG_PROJECT                = alicloud_log_project.app_logs.name
    LOG_STORE                  = alicloud_log_store.app_log_store.name
    ALIBABA_CLOUD_REGION       = var.region
    ALIBABA_CLOUD_ACCOUNT_ID   = var.account_id
  }
  sensitive = true
}

# Deployment Information
output "deployment_info" {
  description = "Deployment information"
  value = {
    project_name = var.project_name
    environment  = var.environment
    region      = var.region
    deployed_at = timestamp()
  }
}
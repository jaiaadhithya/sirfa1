# ECS Instance for Backend API
resource "alicloud_instance" "sirfa_backend" {
  availability_zone = data.alicloud_zones.available.zones[0].id
  security_groups   = [alicloud_security_group.sirfa_sg.id]
  instance_type     = data.alicloud_instance_types.available.instance_types[0].id
  system_disk_category = "cloud_efficiency"
  system_disk_size     = 40
  image_id            = data.alicloud_images.ubuntu.images[0].id
  instance_name       = "sirfa-backend-${var.environment}"
  vswitch_id          = alicloud_vswitch.sirfa_vswitch.id
  internet_max_bandwidth_out = 10
  
  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    environment = var.environment
  }))
  
  tags = {
    Name        = "SIRFA Backend Server"
    Environment = var.environment
    Project     = "sirfa-agent-finance"
    Role        = "backend-api"
  }
}

# RDS MySQL Instance for data storage
resource "alicloud_db_instance" "sirfa_db" {
  engine               = "MySQL"
  engine_version       = "8.0"
  instance_type        = "mysql.n2.serverless.1c"
  instance_storage     = 20
  instance_name        = "sirfa-trading-db-${var.environment}"
  vswitch_id          = alicloud_vswitch.sirfa_vswitch.id
  monitoring_period    = 60
  
  tags = {
    Name        = "SIRFA Trading Database"
    Environment = var.environment
    Project     = "sirfa-agent-finance"
  }
}

# RDS Database
resource "alicloud_db_database" "sirfa_database" {
  instance_id = alicloud_db_instance.sirfa_db.id
  name        = "sirfa_trading"
  character_set = "utf8mb4"
}

# RDS Account
resource "alicloud_db_account" "sirfa_db_account" {
  db_instance_id   = alicloud_db_instance.sirfa_db.id
  account_name     = var.db_username
  account_password = var.db_password
  account_type     = "Super"
}

# Function Compute Service
resource "alicloud_fc_service" "sirfa_fc_service" {
  name        = "sirfa-trading-service"
  description = "SIRFA AI Trading Decision Engine"
  
  log_config {
    project  = alicloud_log_project.sirfa_logs.name
    logstore = alicloud_log_store.sirfa_fc_logs.name
  }
  
  role = alicloud_ram_role.fc_role.arn
  
  tags = {
    Environment = var.environment
    Project     = "sirfa-agent-finance"
  }
}

# Function Compute Function
resource "alicloud_fc_function" "trading_decision_engine" {
  service     = alicloud_fc_service.sirfa_fc_service.name
  name        = "trading-decision-engine"
  description = "AI-powered trading decision engine"
  filename    = "../alibaba-functions/trading-decision-engine.zip"
  memory_size = 512
  runtime     = "nodejs18"
  handler     = "index.handler"
  timeout     = 60
  
  environment_variables = {
    NODE_ENV = var.environment
  }
}

# OSS Bucket for static assets and logs
resource "alicloud_oss_bucket" "sirfa_assets" {
  bucket = "sirfa-trading-assets-${var.environment}-${random_string.bucket_suffix.result}"
  
  tags = {
    Name        = "SIRFA Trading Assets"
    Environment = var.environment
    Project     = "sirfa-agent-finance"
  }
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Log Service Project
resource "alicloud_log_project" "sirfa_logs" {
  name        = "sirfa-trading-logs-${var.environment}"
  description = "Log project for SIRFA trading application"
  
  tags = {
    Environment = var.environment
    Project     = "sirfa-agent-finance"
  }
}

# Log Store for Function Compute
resource "alicloud_log_store" "sirfa_fc_logs" {
  project          = alicloud_log_project.sirfa_logs.name
  name            = "fc-logs"
  retention_period = 30
  shard_count     = 2
}

# Log Store for Application Logs
resource "alicloud_log_store" "sirfa_app_logs" {
  project          = alicloud_log_project.sirfa_logs.name
  name            = "app-logs"
  retention_period = 30
  shard_count     = 2
}
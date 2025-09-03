terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.200"
    }
  }
  required_version = ">= 1.0"
}

# Configure Alibaba Cloud Provider
provider "alicloud" {
  access_key = var.access_key
  secret_key = var.secret_key
  region     = var.region
}

# Data sources
data "alicloud_zones" "available" {
  available_resource_creation = ["VSwitch"]
}

data "alicloud_images" "ubuntu" {
  most_recent = true
  owners      = "system"
  name_regex  = "^ubuntu_20_04_x64*"
}

data "alicloud_instance_types" "available" {
  availability_zone = data.alicloud_zones.available.zones[0].id
  cpu_core_count    = 2
  memory_size       = 4
}

# VPC and Network
resource "alicloud_vpc" "sirfa_vpc" {
  vpc_name   = "sirfa-trading-vpc"
  cidr_block = "10.0.0.0/16"
  
  tags = {
    Name        = "SIRFA Trading VPC"
    Environment = var.environment
    Project     = "sirfa-agent-finance"
  }
}

resource "alicloud_vswitch" "sirfa_vswitch" {
  vpc_id       = alicloud_vpc.sirfa_vpc.id
  cidr_block   = "10.0.1.0/24"
  zone_id      = data.alicloud_zones.available.zones[0].id
  vswitch_name = "sirfa-trading-vswitch"
  
  tags = {
    Name        = "SIRFA Trading VSwitch"
    Environment = var.environment
    Project     = "sirfa-agent-finance"
  }
}

# Security Group
resource "alicloud_security_group" "sirfa_sg" {
  name        = "sirfa-trading-sg"
  description = "Security group for SIRFA trading application"
  vpc_id      = alicloud_vpc.sirfa_vpc.id
  
  tags = {
    Name        = "SIRFA Trading Security Group"
    Environment = var.environment
    Project     = "sirfa-agent-finance"
  }
}

# Security Group Rules
resource "alicloud_security_group_rule" "allow_http" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "80/80"
  priority          = 1
  security_group_id = alicloud_security_group.sirfa_sg.id
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_security_group_rule" "allow_https" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "443/443"
  priority          = 1
  security_group_id = alicloud_security_group.sirfa_sg.id
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_security_group_rule" "allow_ssh" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "22/22"
  priority          = 1
  security_group_id = alicloud_security_group.sirfa_sg.id
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_security_group_rule" "allow_api" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "3001/3001"
  priority          = 1
  security_group_id = alicloud_security_group.sirfa_sg.id
  cidr_ip           = "10.0.0.0/16"
}
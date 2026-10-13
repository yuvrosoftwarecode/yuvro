# OpenTofu Variables for Dev Environment - Consolidated Database
# Deploys to AWS EC2 with Docker Compose in ap-south-1 (India region for lower costs)
# Estimated monthly cost: ~$20-30 (EC2 t3.medium + RDS db.t3.small for all apps)
#
# Architecture:
# - Single AZ (ap-south-1a) for cost savings  
# - Public subnets only (no private subnets, no NAT gateways)
# - Single EC2 t3.medium instance in public subnet
# - Single RDS instance (db.t3.small) with 5 databases (ycode, ycampus, yhub, ylabs, ymarketplace)
# - Applications deployed via Docker Compose on EC2

# AWS Configuration
aws_region = "ap-south-1"
environment = "dev"

# Deployment Configuration
deploy_env = "dev"
deploy_infra_type = "ec2"

# VPC Configuration - Minimal (2 AZs for RDS requirement, public subnets only)
vpc_cidr = "10.0.0.0/16"
availability_zones = ["ap-south-1a", "ap-south-1b"]
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = []

# EC2 Configuration - Single instance for Docker Compose deployment
instance_type = "t3.medium"
instance_count = 1
key_pair_name = "yuvro-dev"
root_volume_size = 100
root_volume_type = "gp3"

# RDS Configuration - Consolidated Single Instance for All Apps
db_master_username = "yuvro_admin"
db_master_password = "ChangeMe123!DevPassword"
db_instance_class = "db.t3.small"
db_allocated_storage = 20
db_max_allocated_storage = 100

# RDS Common Configuration
postgres_version = "15"
backup_retention_days = 0
multi_az = false
skip_final_snapshot = true

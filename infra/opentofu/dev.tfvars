# OpenTofu Variables for Dev Environment (Minimal Configuration)
# Deploys to AWS EC2 with Docker Compose in ap-south-1 (India region for lower costs)
# Estimated monthly cost: ~$15-25 (EC2 t3.micro + RDS db.t3.micro)
#
# Architecture:
# - Single AZ (ap-south-1a) for cost savings
# - Public subnets only (no private subnets, no NAT gateways)
# - Single EC2 t3.micro instance in public subnet
# - RDS instances only (db.t3.micro) - no Kubernetes
# - Minimal storage allocation
# - Applications deployed via Docker Compose on EC2

# AWS Configuration
aws_region = "ap-south-1"
environment = "dev"

# VPC Configuration - Minimal (2 AZs for RDS requirement, public subnets only)
vpc_cidr = "10.0.0.0/16"
availability_zones = ["ap-south-1a", "ap-south-1b"]
public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = []

# EC2 Configuration - Single instance for Docker Compose deployment
instance_type = "t3.medium"
instance_count = 1
key_pair_name = "ycode-dev"
root_volume_size = 100
root_volume_type = "gp3"

# RDS Configuration - YCode (Minimal for testing)
ycode_db_username = "ycode_admin"
ycode_db_password = "ChangeMe123!DevPassword"
ycode_db_instance_class = "db.t3.micro"
ycode_db_allocated_storage = 5
ycode_db_max_allocated_storage = 10

# RDS Configuration - YCampus (Minimal for testing)
ycampus_db_username = "ycampus_admin"
ycampus_db_password = "ChangeMe123!DevPassword"
ycampus_db_instance_class = "db.t3.micro"
ycampus_db_allocated_storage = 5
ycampus_db_max_allocated_storage = 10

# RDS Configuration - YHub (Minimal for testing)
yhub_db_username = "yhub_admin"
yhub_db_password = "ChangeMe123!DevPassword"
yhub_db_instance_class = "db.t3.micro"
yhub_db_allocated_storage = 5
yhub_db_max_allocated_storage = 10

# RDS Configuration - YLabs (Minimal for testing)
ylabs_db_username = "ylabs_admin"
ylabs_db_password = "ChangeMe123!DevPassword"
ylabs_db_instance_class = "db.t3.micro"
ylabs_db_allocated_storage = 5
ylabs_db_max_allocated_storage = 10

# RDS Configuration - YMarketplace (Minimal for testing)
ymarketplace_db_username = "ymarketplace_admin"
ymarketplace_db_password = "ChangeMe123!DevPassword"
ymarketplace_db_instance_class = "db.t3.micro"
ymarketplace_db_allocated_storage = 5
ymarketplace_db_max_allocated_storage = 10

# RDS Common Configuration
postgres_version = "15"
backup_retention_days = 0
multi_az = false
skip_final_snapshot = true

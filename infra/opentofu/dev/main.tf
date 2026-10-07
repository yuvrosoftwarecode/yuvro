terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment for remote state management
  # backend "s3" {
  #   bucket         = "ycode-terraform-state"
  #   key            = "dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "dev"
      Project     = "Yuvro"
      ManagedBy   = "Terraform"
    }
  }
}

# Use existing VPC instead of creating new one (to avoid VPC limit issues)
# The existing VPC with EC2 and RDS is vpc-0893533f938d45e9d
data "aws_vpc" "main" {
  id = "vpc-0893533f938d45e9d"
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  
  filter {
    name   = "tag:Name"
    values = ["dev-public-subnet-*"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  
  filter {
    name   = "tag:Name"
    values = ["dev-private-subnet-*"]
  }
}

# ========== SHARED MODULES (Common across dev/prod) ==========

# Security Groups Module - reference existing VPC
module "security_groups" {
  source = "../modules/security_groups"

  environment = "dev"
  vpc_id      = data.aws_vpc.main.id
}

# RDS PostgreSQL - Consolidated Single Instance for All Apps
module "rds_main" {
  source = "../modules/rds"

  environment              = "dev"
  db_name                  = "postgres"  # Use default postgres db; app databases created by migrations
  db_username              = var.db_master_username
  db_password              = var.db_master_password
  instance_class           = var.db_instance_class
  allocated_storage        = var.db_allocated_storage
  max_allocated_storage    = var.db_max_allocated_storage
  subnet_ids               = length(data.aws_subnets.private.ids) > 0 ? data.aws_subnets.private.ids : data.aws_subnets.public.ids
  security_group_id        = module.security_groups.rds_sg_id
  backup_retention_days    = var.backup_retention_days
  multi_az                 = var.multi_az
  engine_version           = var.postgres_version
  skip_final_snapshot      = var.skip_final_snapshot
}

# S3 Buckets Module
module "s3" {
  source = "../modules/s3"

  environment          = "dev"
  cors_allowed_origins = var.s3_cors_allowed_origins
}

# IAM Roles Module
module "iam" {
  source = "../modules/iam"

  environment    = "dev"
  aws_region     = var.aws_region
  s3_bucket_arns = [module.s3.base_bucket_arn]
}

# CloudWatch Module
module "cloudwatch" {
  source = "../modules/cloudwatch"

  environment = "dev"
}

# ========== DEV-SPECIFIC MODULES ==========

# EC2 App Nodes Module - Docker Compose deployment
module "ec2_nodes" {
  count  = var.instance_count > 0 ? 1 : 0
  source = "../modules/ec2_nodes"

  environment       = "dev"
  instance_type     = var.instance_type
  instance_count    = var.instance_count
  subnet_ids        = data.aws_subnets.public.ids
  security_group_id = module.security_groups.app_sg_id
  key_pair_name     = var.key_pair_name
  root_volume_size  = var.root_volume_size
  root_volume_type  = var.root_volume_type
}

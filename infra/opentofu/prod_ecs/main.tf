terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Uncomment for remote state management
  # backend "s3" {
  #   bucket         = "ycode-terraform-state"
  #   key            = "prod-ecs/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "prod"
      Project     = "Yuvro"
      ManagedBy   = "Terraform"
    }
  }
}

# Get current AWS account
data "aws_caller_identity" "current" {}

# Get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# ========== VPC SETUP - Create dedicated Production VPC ==========

module "vpc" {
  source = "../modules/vpc"

  environment              = "prod"
  vpc_cidr                 = var.vpc_cidr
  availability_zones       = var.availability_zones
  public_subnet_cidrs      = var.public_subnet_cidrs
  private_subnet_cidrs     = var.private_subnet_cidrs
  create_nat_gateway       = var.create_nat_gateway

  tags = {
    Environment = "prod"
    Project     = "Yuvro"
    ManagedBy   = "Terraform"
  }
}

# ========== SHARED MODULES (Common across dev/prod) ==========

# Security Groups Module - reference new VPC
module "security_groups" {
  source = "../modules/security_groups"

  environment = "prod"
  vpc_id      = module.vpc.vpc_id
}

# RDS PostgreSQL - External, shared database
# Database: prod-yuvro-db (created separately, not managed by Terraform)
# Endpoint: prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432

# S3 Buckets Module
module "s3" {
  source = "../modules/s3"

  environment          = "prod"
  cors_allowed_origins = var.s3_cors_allowed_origins
}

# IAM Roles Module
module "iam" {
  source = "../modules/iam"

  environment    = "prod"
  aws_region     = var.aws_region
  s3_bucket_arns = [module.s3.base_bucket_arn]
}

# CloudWatch Module
module "cloudwatch" {
  source = "../modules/cloudwatch"

  environment = "prod"
}

# Use existing RDS - parse the endpoint and port
locals {
  # If using existing RDS, parse the endpoint
  rds_endpoint_parts = split(":", var.existing_rds_endpoint)
  rds_endpoint       = var.existing_rds_endpoint
  rds_host           = local.rds_endpoint_parts[0]
  rds_port           = length(local.rds_endpoint_parts) > 1 ? tonumber(local.rds_endpoint_parts[1]) : 5432
  rds_id             = "prod-yuvro-db"
}

# ========== PROD-SPECIFIC MODULES (ECS ONLY) ==========

# ECS Cluster - Production ECS cluster for container orchestration
module "ecs" {
  source = "../modules/ecs"

  environment         = "prod"
  cluster_name        = var.ecs_cluster_name
  subnet_ids          = module.vpc.private_subnet_ids
  security_group_id   = module.security_groups.app_sg_id
  instance_type       = var.ecs_instance_type
  asg_min_size        = var.ecs_asg_min_size
  asg_max_size        = var.ecs_asg_max_size
  asg_desired_capacity = var.ecs_asg_desired_capacity
  log_retention_days  = var.ecs_log_retention_days
}

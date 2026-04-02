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
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "YCode"
      ManagedBy   = "Terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  public_subnet_cidrs = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
}

# Security Groups Module
module "security_groups" {
  source = "./modules/security_groups"

  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

# EC2 Kubernetes Nodes Module
module "ec2_nodes" {
  source = "./modules/ec2_nodes"

  environment              = var.environment
  instance_type            = var.instance_type
  instance_count           = var.instance_count
  subnet_ids               = module.vpc.private_subnet_ids
  security_group_id        = module.security_groups.kubernetes_sg_id
  key_pair_name            = var.key_pair_name
  kubernetes_version       = var.kubernetes_version
  root_volume_size         = var.root_volume_size
  root_volume_type         = var.root_volume_type
}

# RDS PostgreSQL for YCode
module "rds_ycode" {
  source = "./modules/rds"

  environment              = var.environment
  db_name                  = "ycode"
  db_username              = var.ycode_db_username
  db_password              = var.ycode_db_password
  instance_class           = var.ycode_db_instance_class
  allocated_storage         = var.ycode_db_allocated_storage
  max_allocated_storage     = var.ycode_db_max_allocated_storage
  subnet_ids               = module.vpc.private_subnet_ids
  security_group_id        = module.security_groups.rds_sg_id
  backup_retention_days    = var.backup_retention_days
  multi_az                 = var.multi_az
  engine_version           = var.postgres_version
}

# RDS PostgreSQL for YCampus
module "rds_ycampus" {
  source = "./modules/rds"

  environment              = var.environment
  db_name                  = "ycampus"
  db_username              = var.ycampus_db_username
  db_password              = var.ycampus_db_password
  instance_class           = var.ycampus_db_instance_class
  allocated_storage         = var.ycampus_db_allocated_storage
  max_allocated_storage     = var.ycampus_db_max_allocated_storage
  subnet_ids               = module.vpc.private_subnet_ids
  security_group_id        = module.security_groups.rds_sg_id
  backup_retention_days    = var.backup_retention_days
  multi_az                 = var.multi_az
  engine_version           = var.postgres_version
}

# S3 Buckets Module
module "s3" {
  source = "./modules/s3"

  environment = var.environment
}

# IAM Roles Module
module "iam" {
  source = "./modules/iam"

  environment = var.environment
  s3_bucket_arns = [
    module.s3.app_data_bucket_arn,
    module.s3.logs_bucket_arn
  ]
}

# CloudWatch Module
module "cloudwatch" {
  source = "./modules/cloudwatch"

  environment = var.environment
}

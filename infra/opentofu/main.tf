terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
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
      Project     = "Yuvro"
      ManagedBy   = "Terraform"
    }
  }
}

# Kubernetes Provider - Configured after EKS cluster is created
provider "kubernetes" {
  host                   = var.environment == "prod" && var.enable_kubernetes ? module.eks[0].cluster_endpoint : ""
  cluster_ca_certificate = var.environment == "prod" && var.enable_kubernetes ? base64decode(module.eks[0].cluster_certificate_authority) : ""
  token                  = var.environment == "prod" && var.enable_kubernetes ? data.aws_eks_cluster_auth.cluster[0].token : ""
}

# Helm Provider - Configured after Kubernetes provider
provider "helm" {
  kubernetes {
    host                   = var.environment == "prod" && var.enable_kubernetes ? module.eks[0].cluster_endpoint : ""
    cluster_ca_certificate = var.environment == "prod" && var.enable_kubernetes ? base64decode(module.eks[0].cluster_certificate_authority) : ""
    token                  = var.environment == "prod" && var.enable_kubernetes ? data.aws_eks_cluster_auth.cluster[0].token : ""
  }
}

# Get EKS cluster auth token (only for prod with K8s enabled)
data "aws_eks_cluster_auth" "cluster" {
  count = var.environment == "prod" && var.enable_kubernetes ? 1 : 0
  name  = module.eks[0].cluster_name
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
    values = ["${var.environment}-public-subnet-*"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  
  filter {
    name   = "tag:Name"
    values = ["${var.environment}-private-subnet-*"]
  }
}

# Security Groups Module - reference existing VPC
module "security_groups" {
  source = "./modules/security_groups"

  environment = var.environment
  vpc_id      = data.aws_vpc.main.id
}

# EC2 App Nodes Module (Docker Compose on dev, can be used for other envs too)
module "ec2_nodes" {
  count  = var.instance_count > 0 ? 1 : 0
  source = "./modules/ec2_nodes"

  environment       = var.environment
  instance_type     = var.instance_type
  instance_count    = var.instance_count
  subnet_ids        = data.aws_subnets.public.ids
  security_group_id = module.security_groups.app_sg_id
  key_pair_name     = var.key_pair_name
  root_volume_size  = var.root_volume_size
  root_volume_type  = var.root_volume_type
}

# RDS PostgreSQL - Consolidated Single Instance for All Apps
# All apps use separate databases within the same RDS instance for cost savings and easier management
module "rds_main" {
  source = "./modules/rds"

  environment              = var.environment
  db_name                  = "postgres"  # Use default postgres db; app databases created by migrations
  db_username              = var.db_master_username
  db_password              = var.db_master_password
  instance_class           = var.db_instance_class
  allocated_storage         = var.db_allocated_storage
  max_allocated_storage     = var.db_max_allocated_storage
  subnet_ids               = length(data.aws_subnets.private.ids) > 0 ? data.aws_subnets.private.ids : data.aws_subnets.public.ids
  security_group_id        = module.security_groups.rds_sg_id
  backup_retention_days    = var.backup_retention_days
  multi_az                 = var.multi_az
  engine_version           = var.postgres_version
  skip_final_snapshot      = var.skip_final_snapshot
}

# Note: Application databases are created by deployment scripts when they run migrations
# This is the standard Django pattern: python manage.py migrate creates the database if it doesn't exist


# S3 Buckets Module
module "s3" {
  source = "./modules/s3"

  environment          = var.environment
  cors_allowed_origins = var.s3_cors_allowed_origins
}

# IAM Roles Module
module "iam" {
  source = "./modules/iam"

  environment = var.environment
  aws_region = var.aws_region
  s3_bucket_arns = [
    module.s3.base_bucket_arn
  ]
}

# CloudWatch Module
module "cloudwatch" {
  source = "./modules/cloudwatch"

  environment = var.environment
}

# EKS Cluster Module (Production Only)
module "eks" {
  count  = var.environment == "prod" && var.enable_kubernetes ? 1 : 0
  source = "./modules/eks"

  environment           = var.environment
  cluster_name          = var.eks_cluster_name
  kubernetes_version    = var.kubernetes_version
  subnet_ids            = length(data.aws_subnets.private.ids) > 0 ? data.aws_subnets.private.ids : data.aws_subnets.public.ids
  security_group_id     = module.security_groups.app_sg_id
  node_group_name       = var.eks_node_group_name
  desired_size          = var.eks_desired_size
  min_size              = var.eks_min_size
  max_size              = var.eks_max_size
  instance_types        = var.eks_instance_types
  disk_size             = var.eks_disk_size
}

# Kubernetes Deployment Module (Production Only)
module "k8s_deployment" {
  count = var.environment == "prod" && var.enable_kubernetes ? 1 : 0
  depends_on = [
    module.eks,
  ]
  source = "./modules/k8s_deployment"

  environment               = var.environment
  namespace                 = var.k8s_namespace
  database_host             = module.rds_main.endpoint
  database_port             = module.rds_main.port
  database_user             = var.db_master_username
  database_password         = var.db_master_password
  helm_chart_path           = var.helm_chart_path
  helm_values_file          = var.helm_values_file
  apps_enabled              = var.apps_enabled
}

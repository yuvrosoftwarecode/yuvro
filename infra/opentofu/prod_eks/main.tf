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
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
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
      Environment = "prod"
      Project     = "Yuvro"
      ManagedBy   = "Terraform"
    }
  }
}

# Kubernetes Provider - For EKS cluster authentication
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority)
  
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "bash"
    args        = ["-c", "aws eks get-token --cluster-name ${module.eks.cluster_name} --region ${var.aws_region}"]
  }
}

# Helm Provider - For deploying Helm charts to EKS
provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority)
    
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "bash"
      args        = ["-c", "aws eks get-token --cluster-name ${module.eks.cluster_name} --region ${var.aws_region}"]
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
  availability_zones       = slice(data.aws_availability_zones.available.names, 0, 2)  # Use first 2 AZs
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

locals {
  # External RDS endpoint
  rds_endpoint = "prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432"
  rds_host     = "prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
  rds_port     = 5432
}

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

# ========== PROD-SPECIFIC MODULES (EKS + Kubernetes OR ECS) ==========

# EKS Cluster - Production Kubernetes cluster
module "eks" {
  source = "../modules/eks"

  environment           = "prod"
  cluster_name          = var.eks_cluster_name
  kubernetes_version    = var.kubernetes_version
  subnet_ids            = module.vpc.private_subnet_ids
  security_group_id     = module.security_groups.app_sg_id
  node_group_name       = var.eks_node_group_name
  desired_size          = var.eks_desired_size
  min_size              = var.eks_min_size
  max_size              = var.eks_max_size
  instance_types        = var.eks_instance_types
  disk_size             = var.eks_disk_size
}

# Kubernetes Deployment - Deploy Yuvro apps via Helm
module "k8s_deployment" {
  depends_on = [
    module.eks.node_group_id,  # Wait for node group to be fully created and ready
    module.eks.cluster_id
  ]
  source     = "../modules/k8s_deployment"

  environment       = "prod"
  namespace         = var.k8s_namespace
  database_host     = local.rds_host
  database_port     = local.rds_port
  database_user     = var.db_master_username
  database_password = var.db_master_password
  helm_chart_path   = var.helm_chart_path
  helm_values_file  = var.helm_values_file
  apps_enabled      = var.apps_enabled
}

# Production Environment Variables - Kubernetes Deployment

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-south-1"
}

# Deployment Configuration
variable "deploy_env" {
  description = "Deployment environment (dev, prod, staging)"
  type        = string
  default     = "prod"
}

variable "deploy_infra_type" {
  description = "Deployment infrastructure type (ec2, ecs, eks)"
  type        = string
  default     = "eks"
}

# VPC Configuration - Production VPC with separate subnets for EKS
variable "vpc_cidr" {
  description = "CIDR block for production VPC"
  type        = string
  default     = "10.1.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.1.1.0/24", "10.1.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.1.11.0/24", "10.1.12.0/24"]
}

variable "create_nat_gateway" {
  description = "Create NAT Gateway for private subnets"
  type        = bool
  default     = true
}

# RDS Configuration - Consolidated Single Instance for All Apps
variable "db_master_username" {
  description = "Master database username"
  type        = string
  default     = "yuvro_admin"
}

variable "db_master_password" {
  description = "Master database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class for production"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Database allocated storage in GB"
  type        = number
  default     = 50
}

variable "db_max_allocated_storage" {
  description = "Database max allocated storage for autoscaling in GB"
  type        = number
  default     = 500
}

variable "postgres_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15"
}

variable "backup_retention_days" {
  description = "Database backup retention period in days"
  type        = number
  default     = 30
  validation {
    condition     = var.backup_retention_days >= 0 && var.backup_retention_days <= 35
    error_message = "Backup retention days must be between 0 and 35."
  }
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for RDS (HA)"
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on RDS deletion"
  type        = bool
  default     = false
}

variable "s3_cors_allowed_origins" {
  description = "List of allowed origins for S3 CORS configuration"
  type        = list(string)
  default = [
    "https://*.yuvro.ai",
    "https://yuvro.ai",
    "https://*.staging.yuvro.ai"
  ]
}

# ========== KUBERNETES / EKS CONFIGURATION ==========

variable "eks_cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "yuvro-prod-cluster"
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.37"
}

variable "eks_node_group_name" {
  description = "Name of the EKS node group"
  type        = string
  default     = "yuvro-prod-nodes"
}

variable "eks_desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 1
}

variable "eks_min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "eks_max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 2
}

variable "eks_instance_types" {
  description = "Instance types for EKS worker nodes"
  type        = list(string)
  default     = ["t3.large"]
}

variable "eks_disk_size" {
  description = "Disk size in GB for EKS worker nodes"
  type        = number
  default     = 100
}

variable "k8s_namespace" {
  description = "Kubernetes namespace for Yuvro applications"
  type        = string
  default     = "yuvro-prod-ns"
}

variable "helm_chart_path" {
  description = "Path to Helm chart for Yuvro applications"
  type        = string
  default     = "../../helm/yuvro-production"
}

variable "helm_values_file" {
  description = "Helm values file to use"
  type        = string
  default     = "values.yaml"
}

variable "apps_enabled" {
  description = "Map of app names to enabled status"
  type        = map(bool)
  default = {
    "ycode"        = true
    "ycampus"      = true
    "ylabs"        = true
    "yhub"         = true
    "ymarketplace" = true
  }
}

# ========== ECS CONFIGURATION ==========

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = "yuvro-prod-ecs-cluster"
}

variable "ecs_instance_type" {
  description = "EC2 instance type for ECS cluster"
  type        = string
  default     = "t3.large"
}

variable "ecs_asg_min_size" {
  description = "Minimum number of ECS instances in ASG"
  type        = number
  default     = 1
}

variable "ecs_asg_max_size" {
  description = "Maximum number of ECS instances in ASG"
  type        = number
  default     = 3
}

variable "ecs_asg_desired_capacity" {
  description = "Desired number of ECS instances in ASG"
  type        = number
  default     = 2
}

variable "ecs_log_retention_days" {
  description = "CloudWatch log retention days for ECS"
  type        = number
  default     = 30
}

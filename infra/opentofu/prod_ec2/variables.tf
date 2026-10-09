variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for production VPC"
  type        = string
  default     = "10.1.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to use"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.1.11.0/24", "10.1.12.0/24", "10.1.13.0/24"]
}

variable "create_nat_gateway" {
  description = "Whether to create NAT gateway for private subnets"
  type        = bool
  default     = true
}

# RDS Configuration
variable "use_existing_rds" {
  description = "Whether to use existing RDS database"
  type        = bool
  default     = true
}

variable "existing_rds_endpoint" {
  description = "Existing RDS endpoint (format: hostname:port)"
  type        = string
  default     = "prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:5432"
  sensitive   = true
}

variable "db_master_username" {
  description = "Master username for RDS"
  type        = string
  default     = "yuvro_admin"
  sensitive   = true
}

variable "db_master_password" {
  description = "Master password for RDS"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 50
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage in GB for autoscaling"
  type        = number
  default     = 500
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = true
}

variable "postgres_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15"
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when destroying RDS"
  type        = bool
  default     = false
}

# S3 Configuration
variable "s3_cors_allowed_origins" {
  description = "CORS allowed origins for S3"
  type        = list(string)
  default     = ["*"]
}

# EC2 Configuration
variable "ec2_instance_count" {
  description = "Number of EC2 instances to create"
  type        = number
  default     = 1
}

variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.large"
}

variable "ec2_root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 100
}

variable "ami_id" {
  description = "AMI ID for EC2 instances - uses ECS-optimized Amazon Linux 2023"
  type        = string
  default     = ""  # Will be fetched from SSM parameter if empty
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Change to your IP for security
}

variable "github_token" {
  description = "GitHub personal access token for GHCR (same as EKS/ECS deployments)"
  type        = string
  sensitive   = true
  default     = ""  # Use same token as other deployments
}

# Environment variables
variable "deploy_env" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "deploy_infra_type" {
  description = "Deployment infrastructure type"
  type        = string
  default     = "ec2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "prod"
    Project     = "Yuvro"
    ManagedBy   = "Terraform"
  }
}

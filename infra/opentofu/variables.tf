variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be 'dev', 'staging', or 'prod'."
  }
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

# EC2 Configuration
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "instance_count" {
  description = "Number of EC2 instances (0 to skip)"
  type        = number
  default     = 1
  validation {
    condition     = var.instance_count >= 0 && var.instance_count <= 10
    error_message = "Instance count must be between 0 and 10."
  }
}

variable "key_pair_name" {
  description = "EC2 Key Pair name for SSH access"
  type        = string
}

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 20
}

variable "root_volume_type" {
  description = "Root volume type (gp3, gp2)"
  type        = string
  default     = "gp3"
}

# RDS Configuration - YCode
variable "ycode_db_username" {
  description = "YCode database master username"
  type        = string
  sensitive   = true
}

variable "ycode_db_password" {
  description = "YCode database master password"
  type        = string
  sensitive   = true
}

variable "ycode_db_instance_class" {
  description = "YCode RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "ycode_db_allocated_storage" {
  description = "YCode database allocated storage in GB"
  type        = number
  default     = 20
}

variable "ycode_db_max_allocated_storage" {
  description = "YCode database max allocated storage for autoscaling in GB"
  type        = number
  default     = 100
}

# RDS Configuration - YCampus
variable "ycampus_db_username" {
  description = "YCampus database master username"
  type        = string
  sensitive   = true
}

variable "ycampus_db_password" {
  description = "YCampus database master password"
  type        = string
  sensitive   = true
}

variable "ycampus_db_instance_class" {
  description = "YCampus RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "ycampus_db_allocated_storage" {
  description = "YCampus database allocated storage in GB"
  type        = number
  default     = 20
}

variable "ycampus_db_max_allocated_storage" {
  description = "YCampus database max allocated storage for autoscaling in GB"
  type        = number
  default     = 100
}

# RDS Common Configuration
variable "postgres_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "backup_retention_days" {
  description = "Database backup retention period in days (0 for no backups)"
  type        = number
  default     = 7
  validation {
    condition     = var.backup_retention_days >= 0 && var.backup_retention_days <= 35
    error_message = "Backup retention days must be between 0 and 35."
  }
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
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
  default     = [
    "https://*.yuvro.ai",
    "https://yuvro.ai",
  ]
}

# RDS Configuration - YHub
variable "yhub_db_username" {
  description = "YHub database master username"
  type        = string
  default     = "yhub_admin"
}

variable "yhub_db_password" {
  description = "YHub database master password"
  type        = string
  sensitive   = true
}

variable "yhub_db_instance_class" {
  description = "YHub RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "yhub_db_allocated_storage" {
  description = "YHub database allocated storage in GB"
  type        = number
  default     = 5
}

variable "yhub_db_max_allocated_storage" {
  description = "YHub database max allocated storage for autoscaling in GB"
  type        = number
  default     = 10
}

# RDS Configuration - YLabs
variable "ylabs_db_username" {
  description = "YLabs database master username"
  type        = string
  default     = "ylabs_admin"
}

variable "ylabs_db_password" {
  description = "YLabs database master password"
  type        = string
  sensitive   = true
}

variable "ylabs_db_instance_class" {
  description = "YLabs RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "ylabs_db_allocated_storage" {
  description = "YLabs database allocated storage in GB"
  type        = number
  default     = 5
}

variable "ylabs_db_max_allocated_storage" {
  description = "YLabs database max allocated storage for autoscaling in GB"
  type        = number
  default     = 10
}

# RDS Configuration - YMarketplace
variable "ymarketplace_db_username" {
  description = "YMarketplace database master username"
  type        = string
  default     = "ymarketplace_admin"
}

variable "ymarketplace_db_password" {
  description = "YMarketplace database master password"
  type        = string
  sensitive   = true
}

variable "ymarketplace_db_instance_class" {
  description = "YMarketplace RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "ymarketplace_db_allocated_storage" {
  description = "YMarketplace database allocated storage in GB"
  type        = number
  default     = 5
}

variable "ymarketplace_db_max_allocated_storage" {
  description = "YMarketplace database max allocated storage for autoscaling in GB"
  type        = number
  default     = 10
}

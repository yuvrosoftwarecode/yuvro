# Development Environment Variables
# All shared variables are inherited from ../variables.tf via terraform workspace or direct include

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-south-1"
}

# VPC Configuration
variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

# EC2 Configuration - Single instance for Docker Compose
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "instance_count" {
  description = "Number of EC2 instances"
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
  default     = 100
}

variable "root_volume_type" {
  description = "Root volume type (gp3, gp2)"
  type        = string
  default     = "gp3"
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
  description = "RDS instance class"
  type        = string
  default     = "db.t3.small"
}

variable "db_allocated_storage" {
  description = "Database allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Database max allocated storage for autoscaling in GB"
  type        = number
  default     = 100
}

variable "postgres_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15"
}

variable "backup_retention_days" {
  description = "Database backup retention period in days (0 for no backups)"
  type        = number
  default     = 0
  validation {
    condition     = var.backup_retention_days >= 0 && var.backup_retention_days <= 35
    error_message = "Backup retention days must be between 0 and 35."
  }
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on RDS deletion"
  type        = bool
  default     = true
}

variable "s3_cors_allowed_origins" {
  description = "List of allowed origins for S3 CORS configuration"
  type        = list(string)
  default     = [
    "http://localhost:*",
    "http://127.0.0.1:*",
  ]
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
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
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "services" {
  description = "List of Yuvro services to deploy"
  type        = list(string)
  default     = ["ycode", "ycampus", "ylabs", "yhub", "ymarketplace"]
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "yuvro_prod"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "yuvro_admin"
}

variable "db_master_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "container_image_registry" {
  description = "ECR registry URL"
  type        = string
  default     = "123456789.dkr.ecr.ap-south-1.amazonaws.com"
}

variable "container_cpu" {
  description = "CPU units for ECS tasks (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "container_memory" {
  description = "Memory in MB for ECS tasks"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Desired number of ECS tasks per service"
  type        = number
  default     = 2
}

variable "environment_variables" {
  description = "Environment variables for ECS tasks"
  type        = map(string)
  default = {
    LOG_LEVEL = "info"
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Project = "Yuvro"
    Platform = "ECS"
  }
}

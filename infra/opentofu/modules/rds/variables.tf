variable "environment" {
  description = "Environment name"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
}

variable "max_allocated_storage" {
  description = "Max allocated storage for autoscaling in GB"
  type        = number
}

variable "subnet_ids" {
  description = "Subnet IDs for RDS"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID"
  type        = string
}

variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
}

variable "multi_az" {
  description = "Enable Multi-AZ"
  type        = bool
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
}

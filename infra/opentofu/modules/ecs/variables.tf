# ECS Module Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for ECS instances"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for ECS instances"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for ECS instances"
  type        = string
  default     = "t3.large"
}

variable "asg_min_size" {
  description = "Minimum number of ECS instances"
  type        = number
  default     = 1
}

variable "asg_max_size" {
  description = "Maximum number of ECS instances"
  type        = number
  default     = 3
}

variable "asg_desired_capacity" {
  description = "Desired number of ECS instances"
  type        = number
  default     = 2
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

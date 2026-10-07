# EKS Module Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version for the cluster"
  type        = string
  default     = "1.28"
}

variable "subnet_ids" {
  description = "List of subnet IDs for the cluster"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group ID for cluster and nodes"
  type        = string
}

variable "node_group_name" {
  description = "Name of the node group"
  type        = string
}

variable "desired_size" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 3
}

variable "min_size" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 2
}

variable "max_size" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 5
}

variable "instance_types" {
  description = "List of instance types for worker nodes"
  type        = list(string)
  default     = ["t3.large"]
}

variable "disk_size" {
  description = "Disk size in GB for worker nodes"
  type        = number
  default     = 100
}

# Kubernetes Deployment Module Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace for Yuvro applications"
  type        = string
  default     = "yuvro-production"
}

variable "database_host" {
  description = "Database hostname"
  type        = string
}

variable "database_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "database_user" {
  description = "Database master username"
  type        = string
}

variable "database_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "helm_chart_path" {
  description = "Path to Helm chart"
  type        = string
  default     = "../helm/yuvro-production"
}

variable "helm_values_file" {
  description = "Helm values file name"
  type        = string
  default     = "values.yaml"
}

variable "apps_enabled" {
  description = "Map of app names to enabled status"
  type        = map(bool)
  default = {
    "ycode"       = true
    "ycampus"     = true
    "ylabs"       = true
    "yhub"        = true
    "ymarketplace" = true
  }
}

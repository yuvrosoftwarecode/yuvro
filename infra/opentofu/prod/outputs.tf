# Production Environment Outputs - Kubernetes Deployment

# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

# RDS Outputs
output "db_endpoint" {
  description = "RDS database endpoint (all apps share this instance)"
  value       = module.rds_main.db_endpoint
  sensitive   = true
}

output "db_host" {
  description = "RDS database hostname"
  value       = module.rds_main.db_host
  sensitive   = true
}

output "db_port" {
  description = "RDS database port"
  value       = module.rds_main.db_port
}

output "db_master_username" {
  description = "Master username for database"
  value       = var.db_master_username
  sensitive   = true
}

output "db_instance_id" {
  description = "RDS instance ID"
  value       = module.rds_main.db_instance_id
}

output "prod_rds_endpoint" {
  description = "Production RDS endpoint"
  value       = module.rds_main.db_host
  sensitive   = true
}

# Application Database Connection Strings
output "ycode_database_url" {
  description = "Connection string for YCode database"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ycode?sslmode=require"
  sensitive   = true
}

output "ycampus_database_url" {
  description = "Connection string for YCampus database"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ycampus?sslmode=require"
  sensitive   = true
}

output "yhub_database_url" {
  description = "Connection string for YHub database"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/yhub?sslmode=require"
  sensitive   = true
}

output "ylabs_database_url" {
  description = "Connection string for YLabs database"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ylabs?sslmode=require"
  sensitive   = true
}

output "ymarketplace_database_url" {
  description = "Connection string for YMarketplace database"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ymarketplace?sslmode=require"
  sensitive   = true
}

# S3 Outputs
output "app_data_bucket_name" {
  description = "S3 bucket for app data and logs"
  value       = module.s3.base_bucket_name
}

# IAM Outputs
output "app_service_role_arn" {
  description = "ARN of IAM role for application services"
  value       = module.iam.app_service_role_arn
}

output "app_service_user_name" {
  description = "IAM user name used by backends"
  value       = module.iam.app_service_user_name
}

output "app_service_access_key_id" {
  description = "Access key ID for app-service IAM user"
  value       = module.iam.app_service_access_key_id
  sensitive   = true
}

output "app_service_secret_access_key" {
  description = "Secret access key for app-service IAM user"
  value       = module.iam.app_service_secret_access_key
  sensitive   = true
}

# ========== GITHUB ACTIONS OIDC OUTPUTS ==========

output "github_actions_role_arn" {
  description = "ARN of IAM role for GitHub Actions OIDC"
  value       = module.iam.github_actions_role_arn
}

output "github_oidc_provider_arn" {
  description = "ARN of GitHub OIDC provider"
  value       = module.iam.github_oidc_provider_arn
}


# CloudWatch Outputs
output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name"
  value       = module.cloudwatch.log_group_name
}

output "cloudwatch_log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = module.cloudwatch.log_group_arn
}

# ========== KUBERNETES / EKS OUTPUTS ==========

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_certificate_authority" {
  description = "EKS cluster certificate authority data"
  value       = module.eks.cluster_certificate_authority
  sensitive   = true
}

output "eks_cluster_security_group_id" {
  description = "Security group ID of EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "eks_node_group_id" {
  description = "EKS node group ID"
  value       = module.eks.node_group_id
}

output "k8s_namespace" {
  description = "Kubernetes namespace for Yuvro applications"
  value       = var.k8s_namespace
}

output "helm_release_name" {
  description = "Helm release name for Yuvro applications"
  value       = module.k8s_deployment.release_name
}

output "helm_release_status" {
  description = "Helm release status"
  value       = module.k8s_deployment.release_status
}

output "k8s_kubeconfig_command" {
  description = "Command to configure kubectl for EKS cluster"
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.aws_region}"
}

# ========== PROD DEPLOYMENT GUIDE ==========

output "prod_deployment_guide" {
  description = "Guide for production Kubernetes deployment"
  value       = <<-EOT
    Production Kubernetes Deployment Complete!
    
    1. Configure kubectl:
       aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.aws_region}
    
    2. Verify cluster:
       kubectl cluster-info
       kubectl get nodes
    
    3. Check Yuvro namespace and deployments:
       kubectl get namespace
       kubectl -n ${var.k8s_namespace} get deployments
       kubectl -n ${var.k8s_namespace} get pods
    
    4. View logs:
       kubectl -n ${var.k8s_namespace} logs -f deployment/ycode-backend
    
    5. Database connection:
       Host: ${module.rds_main.db_host}
       Port: ${module.rds_main.db_port}
       User: ${var.db_master_username}
    
    6. Access applications:
       Configure DNS records and ingress URLs as per your setup
       Helm release: ${module.k8s_deployment.release_name}
       Namespace: ${var.k8s_namespace}
  EOT
  sensitive   = true
}

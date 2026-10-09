# Production ECS Environment Outputs

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

# ========== ECS OUTPUTS ==========

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = module.ecs.cluster_arn
}

output "ecs_task_execution_role_arn" {
  description = "ARN of ECS task execution role"
  value       = module.ecs.ecs_task_execution_role_arn
}

output "ecs_task_role_arn" {
  description = "ARN of ECS task role"
  value       = module.ecs.ecs_task_role_arn
}

output "ecs_log_group_name" {
  description = "CloudWatch log group name for ECS"
  value       = module.ecs.log_group_name
}

output "ecs_asg_name" {
  description = "Auto Scaling Group name for ECS"
  value       = module.ecs.asg_name
}

# ========== PROD DEPLOYMENT GUIDE ==========

output "prod_deployment_guide" {
  description = "Guide for production ECS deployment"
  value = "Production ECS Deployment Complete! Cluster: ${module.ecs.cluster_name}. Verify: aws ecs describe-clusters --clusters ${module.ecs.cluster_name} --region ${var.aws_region}"
  sensitive = true
}

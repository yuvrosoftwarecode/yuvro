# VPC Outputs (using existing VPC via data sources)
output "vpc_id" {
  description = "VPC ID"
  value       = data.aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = data.aws_subnets.public.ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = data.aws_subnets.private.ids
}

# EC2 Outputs
output "app_node_ids" {
  description = "EC2 instance IDs"
  value       = var.instance_count > 0 ? module.ec2_nodes[0].instance_ids : []
}

output "app_node_private_ips" {
  description = "Private IP addresses of app nodes"
  value       = var.instance_count > 0 ? module.ec2_nodes[0].private_ips : []
}

output "app_node_public_ips" {
  description = "Public IP addresses of app nodes"
  value       = var.instance_count > 0 ? module.ec2_nodes[0].public_ips : []
}

# RDS Consolidated Database Outputs
output "db_endpoint" {
  description = "Consolidated RDS database endpoint (all apps share this instance)"
  value       = module.rds_main.db_endpoint
  sensitive   = true
}

output "db_host" {
  description = "Consolidated RDS database hostname"
  value       = module.rds_main.db_host
  sensitive   = true
}

output "db_port" {
  description = "Consolidated RDS database port"
  value       = module.rds_main.db_port
}

output "db_master_username" {
  description = "Master username for consolidated database"
  value       = var.db_master_username
  sensitive   = true
}

output "db_instance_id" {
  description = "Consolidated RDS instance ID"
  value       = module.rds_main.db_instance_id
}

output "prod_rds_endpoint" {
  description = "Production RDS endpoint (prod-yuvro-db)"
  value       = var.environment == "prod" ? module.rds_main.db_host : null
  sensitive   = true
}

# Application Database Connection Strings
# Each app uses the same RDS instance but different database schema
output "ycode_database_url" {
  description = "Connection string for YCode database (on consolidated instance)"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ycode"
  sensitive   = true
}

output "ycampus_database_url" {
  description = "Connection string for YCampus database (on consolidated instance)"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ycampus"
  sensitive   = true
}

output "yhub_database_url" {
  description = "Connection string for YHub database (on consolidated instance)"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/yhub"
  sensitive   = true
}

output "ylabs_database_url" {
  description = "Connection string for YLabs database (on consolidated instance)"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ylabs"
  sensitive   = true
}

output "ymarketplace_database_url" {
  description = "Connection string for YMarketplace database (on consolidated instance)"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ymarketplace"
  sensitive   = true
}

# S3 Outputs
output "app_data_bucket_name" {
  description = "S3 base bucket (per-env; app data lives under <env>/<app>-uploads/, logs under <env>/logs/)"
  value       = module.s3.base_bucket_name
}

# IAM Outputs
output "app_service_role_arn" {
  description = "ARN of IAM role for application services"
  value       = module.iam.app_service_role_arn
}

output "app_service_user_name" {
  description = "IAM user name used by the backends to talk to AWS APIs (S3, etc.)"
  value       = module.iam.app_service_user_name
}

output "app_service_access_key_id" {
  description = "Access key id for the app-service IAM user (sensitive — used by deploy-dev-auto.sh)"
  value       = module.iam.app_service_access_key_id
  sensitive   = true
}

output "app_service_secret_access_key" {
  description = "Secret access key for the app-service IAM user (sensitive — used by deploy-dev-auto.sh)"
  value       = module.iam.app_service_secret_access_key
  sensitive   = true
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

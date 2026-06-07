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

# RDS YCode Outputs
output "ycode_db_endpoint" {
  description = "YCode RDS database endpoint"
  value       = module.rds_ycode.db_endpoint
  sensitive   = true
}

output "ycode_db_port" {
  description = "YCode RDS database port"
  value       = module.rds_ycode.db_port
}

output "ycode_db_name" {
  description = "YCode database name"
  value       = module.rds_ycode.db_name
}

output "ycode_db_username" {
  description = "YCode database master username"
  value       = module.rds_ycode.db_username
  sensitive   = true
}

# RDS YCampus Outputs
output "ycampus_db_endpoint" {
  description = "YCampus RDS database endpoint"
  value       = module.rds_ycampus.db_endpoint
  sensitive   = true
}

output "ycampus_db_port" {
  description = "YCampus RDS database port"
  value       = module.rds_ycampus.db_port
}

output "ycampus_db_name" {
  description = "YCampus database name"
  value       = module.rds_ycampus.db_name
}

output "ycampus_db_username" {
  description = "YCampus database master username"
  value       = module.rds_ycampus.db_username
  sensitive   = true
}

# S3 Outputs
output "app_data_bucket_name" {
  description = "S3 base bucket (per-env, per-app data lives under <env>/<app>-uploads/)"
  value       = module.s3.base_bucket_name
}

output "logs_bucket_name" {
  description = "S3 bucket for logs"
  value       = module.s3.logs_bucket_name
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

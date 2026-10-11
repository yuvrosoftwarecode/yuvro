# Development Environment Outputs

# VPC Outputs
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

# EC2 Outputs - Docker Compose Nodes
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

# Application Database Connection Strings
output "ycode_database_url" {
  description = "Connection string for YCode database"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ycode?sslmode=allow"
  sensitive   = true
}

output "ycampus_database_url" {
  description = "Connection string for YCampus database"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ycampus?sslmode=allow"
  sensitive   = true
}

output "yhub_database_url" {
  description = "Connection string for YHub database"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/yhub?sslmode=allow"
  sensitive   = true
}

output "ylabs_database_url" {
  description = "Connection string for YLabs database"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ylabs?sslmode=allow"
  sensitive   = true
}

output "ymarketplace_database_url" {
  description = "Connection string for YMarketplace database"
  value       = "postgresql://${var.db_master_username}:${var.db_master_password}@${module.rds_main.db_host}:${module.rds_main.db_port}/ymarketplace?sslmode=allow"
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

# CloudWatch Outputs
output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name"
  value       = module.cloudwatch.log_group_name
}

output "cloudwatch_log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = module.cloudwatch.log_group_arn
}

# Development Connection Info
output "dev_deployment_guide" {
  description = "Guide for dev deployment"
  value       = <<-EOT
    Dev Environment Deployment:
    
    1. SSH into EC2 instance:
       ssh -i <key-path> ec2-user@${var.instance_count > 0 ? module.ec2_nodes[0].public_ips[0] : "N/A"}
    
    2. Clone repository and setup Docker Compose:
       cd /opt/yuvro && docker-compose -f docker-compose.dev.yml up -d
    
    3. Database connection string:
       ${module.rds_main.db_host}:${module.rds_main.db_port}
    
    4. Access applications:
       - YCode: http://${var.instance_count > 0 ? module.ec2_nodes[0].public_ips[0] : "N/A"}:3000
       - YCampus: http://${var.instance_count > 0 ? module.ec2_nodes[0].public_ips[0] : "N/A"}:3001
  EOT
  sensitive   = true
}

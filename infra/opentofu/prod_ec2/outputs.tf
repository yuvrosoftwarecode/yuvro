# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

# vpc_cidr output removed - not provided by VPC module

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.vpc.private_subnet_ids
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS database endpoint (external, existing)"
  value       = var.existing_rds_endpoint
  sensitive   = true
}

output "rds_host" {
  description = "RDS database host"
  value       = local.rds_host
  sensitive   = true
}

output "rds_port" {
  description = "RDS database port"
  value       = local.rds_port
  sensitive   = true
}

output "rds_instance_id" {
  description = "RDS database instance ID"
  value       = local.rds_id
}

output "rds_status" {
  description = "RDS deployment status"
  value       = "Using EXTERNAL existing RDS (prod-yuvro-db)"
}

# S3 Outputs
output "uploads_bucket" {
  description = "Name of S3 bucket for uploads"
  value       = module.s3.base_bucket_name
}

output "uploads_bucket_arn" {
  description = "ARN of S3 uploads bucket"
  value       = module.s3.base_bucket_arn
}

# EC2 Outputs
output "ec2_instance_ids" {
  description = "IDs of EC2 Docker host instances"
  value       = aws_instance.docker_hosts[*].id
}

output "ec2_instance_ips" {
  description = "Private IP addresses of EC2 instances"
  value       = aws_instance.docker_hosts[*].private_ip
}

output "ec2_elastic_ips" {
  description = "Elastic IP addresses of EC2 instances"
  value       = aws_eip.docker_hosts[*].public_ip
}

output "ec2_public_ips" {
  description = "Public IP addresses of EC2 instances"
  value       = aws_instance.docker_hosts[*].public_ip
}

output "ec2_security_group_id" {
  description = "Security group ID for EC2 Docker hosts"
  value       = aws_security_group.ec2_docker.id
}

# CloudWatch Outputs
output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = module.cloudwatch.log_group_name
}

# SSH Connection Info
output "ec2_ssh_commands" {
  description = "SSH connection commands for EC2 instances"
  value = [
    for i, ip in aws_eip.docker_hosts[*].public_ip :
    "ssh -i /path/to/key.pem ubuntu@${ip}"
  ]
}

output "deployment_info" {
  description = "Deployment information summary"
  value = {
    environment     = var.deploy_env
    infra_type      = var.deploy_infra_type
    ec2_count       = var.ec2_instance_count
    ec2_type        = var.ec2_instance_type
    ami_id          = local.ami_id
    ami_description = "ECS-optimized Amazon Linux 2023"
    db_host         = local.rds_host
    db_port         = local.rds_port
    db_instance     = local.rds_id
    db_status       = "EXTERNAL (not managed by Terraform)"
    s3_bucket       = module.s3.base_bucket_name
    region          = var.aws_region
  }
  sensitive = true
}

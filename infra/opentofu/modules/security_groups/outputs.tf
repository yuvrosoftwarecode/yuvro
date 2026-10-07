output "app_sg_id" {
  description = "App nodes security group ID"
  value       = local.app_sg_id
}

output "rds_sg_id" {
  description = "RDS security group ID"
  value       = local.rds_sg_id
}

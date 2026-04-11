output "app_sg_id" {
  description = "App nodes security group ID"
  value       = aws_security_group.app.id
}

output "rds_sg_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

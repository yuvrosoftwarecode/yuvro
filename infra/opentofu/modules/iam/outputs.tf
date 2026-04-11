output "app_service_role_arn" {
  description = "Application service role ARN"
  value       = aws_iam_role.app_service.arn
}

output "app_service_role_name" {
  description = "Application service role name"
  value       = aws_iam_role.app_service.name
}

output "app_service_instance_profile_arn" {
  description = "Application service instance profile ARN"
  value       = aws_iam_instance_profile.app_service.arn
}

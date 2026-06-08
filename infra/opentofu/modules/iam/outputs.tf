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

output "app_service_user_name" {
  description = "IAM user name used by the app to talk to AWS APIs"
  value       = aws_iam_user.app_service.name
}

output "app_service_access_key_id" {
  description = "Access key id for the app-service IAM user (sensitive)"
  value       = aws_iam_access_key.app_service.id
  sensitive   = true
}

output "app_service_secret_access_key" {
  description = "Secret access key for the app-service IAM user (sensitive)"
  value       = aws_iam_access_key.app_service.secret
  sensitive   = true
}

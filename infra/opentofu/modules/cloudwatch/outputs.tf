output "log_group_name" {
  description = "CloudWatch log group name"
  value       = local.application_log_group_name
}

output "log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = local.application_log_group_arn
}

output "kubernetes_log_group_name" {
  description = "Kubernetes log group name"
  value       = local.kubernetes_log_group_name
}

output "database_log_group_name" {
  description = "Database log group name"
  value       = local.database_log_group_name
}

output "dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

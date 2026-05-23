output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.application.name
}

output "log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = aws_cloudwatch_log_group.application.arn
}

output "kubernetes_log_group_name" {
  description = "Kubernetes log group name"
  value       = aws_cloudwatch_log_group.kubernetes.name
}

output "database_log_group_name" {
  description = "Database log group name"
  value       = aws_cloudwatch_log_group.database.name
}

output "dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

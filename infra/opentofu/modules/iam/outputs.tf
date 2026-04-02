output "app_service_role_arn" {
  description = "Application service role ARN"
  value       = aws_iam_role.app_service.arn
}

output "app_service_role_name" {
  description = "Application service role name"
  value       = aws_iam_role.app_service.name
}

output "kubernetes_node_role_arn" {
  description = "Kubernetes node role ARN"
  value       = aws_iam_role.kubernetes_node.arn
}

output "kubernetes_node_role_name" {
  description = "Kubernetes node role name"
  value       = aws_iam_role.kubernetes_node.name
}

output "app_service_instance_profile_arn" {
  description = "Application service instance profile ARN"
  value       = aws_iam_instance_profile.app_service.arn
}

output "kubernetes_node_instance_profile_arn" {
  description = "Kubernetes node instance profile ARN"
  value       = aws_iam_instance_profile.kubernetes_node.arn
}

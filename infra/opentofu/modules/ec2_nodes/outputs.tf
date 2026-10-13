output "instance_ids" {
  description = "EC2 instance IDs"
  value       = aws_instance.app_node[*].id
}

output "private_ips" {
  description = "Private IP addresses"
  value       = aws_instance.app_node[*].private_ip
}

output "public_ips" {
  description = "Static Elastic IP addresses (stable across stop/start)"
  value       = aws_eip.app_node[*].public_ip
}

output "eip_allocation_ids" {
  description = "Elastic IP allocation IDs"
  value       = aws_eip.app_node[*].id
}

output "iam_role_arn" {
  description = "IAM role ARN for nodes"
  value       = local.app_node_role_id != "" ? data.aws_iam_role.app_node_existing.arn : aws_iam_role.app_node[0].arn
}

output "instance_ids" {
  description = "EC2 instance IDs"
  value       = aws_instance.app_node[*].id
}

output "private_ips" {
  description = "Private IP addresses"
  value       = aws_instance.app_node[*].private_ip
}

output "public_ips" {
  description = "Public IP addresses"
  value       = aws_instance.app_node[*].public_ip
}

output "iam_role_arn" {
  description = "IAM role ARN for nodes"
  value       = aws_iam_role.app_node.arn
}

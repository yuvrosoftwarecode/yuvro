output "base_bucket_name" {
  description = "Base bucket name (per-env, per-app data lives under <env>/<app>-uploads/)"
  value       = aws_s3_bucket.base.id
}

output "base_bucket_arn" {
  description = "Base bucket ARN"
  value       = aws_s3_bucket.base.arn
}

output "logs_bucket_name" {
  description = "Logs bucket name"
  value       = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  description = "Logs bucket ARN"
  value       = aws_s3_bucket.logs.arn
}

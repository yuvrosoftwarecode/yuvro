output "base_bucket_name" {
  description = "Base bucket name (per-env, per-app data lives under <env>/<app>-uploads/, logs under <env>/logs/)"
  value       = aws_s3_bucket.base.id
}

output "base_bucket_arn" {
  description = "Base bucket ARN"
  value       = aws_s3_bucket.base.arn
}

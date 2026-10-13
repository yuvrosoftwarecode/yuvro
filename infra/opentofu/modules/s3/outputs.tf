output "base_bucket_name" {
  description = "Base bucket name (per-env, per-app data lives under <env>/<app>-uploads/, logs under <env>/logs/)"
  value       = local.s3_bucket_id
}

output "base_bucket_arn" {
  description = "Base bucket ARN"
  value       = local.s3_bucket_arn
}

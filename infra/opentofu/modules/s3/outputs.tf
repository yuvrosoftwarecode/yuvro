output "app_data_bucket_name" {
  description = "Application data bucket name"
  value       = aws_s3_bucket.app_data.id
}

output "app_data_bucket_arn" {
  description = "Application data bucket ARN"
  value       = aws_s3_bucket.app_data.arn
}

output "logs_bucket_name" {
  description = "Logs bucket name"
  value       = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  description = "Logs bucket ARN"
  value       = aws_s3_bucket.logs.arn
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "s3_bucket_arns" {
  description = "S3 bucket ARNs for policy"
  type        = list(string)
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "base" {
  # Use pattern: yuvro-{environment}
  # This allows all environments (dev, prod) to use consistent naming
  bucket = "yuvro-${var.environment}"

  tags = {
    Name        = "yuvro-${var.environment}"
    Environment = var.environment
  }
}

locals {
  s3_bucket_id  = aws_s3_bucket.base.id
  s3_bucket_arn = aws_s3_bucket.base.arn
}

resource "aws_s3_bucket_versioning" "base" {
  bucket = local.s3_bucket_id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "base" {
  bucket = local.s3_bucket_id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "base" {
  bucket = local.s3_bucket_id

  # Allow public read access for serving images/files
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "public_read" {
  bucket = local.s3_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicRead"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${local.s3_bucket_arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.base]
}

resource "aws_s3_bucket_lifecycle_configuration" "base" {
  bucket = local.s3_bucket_id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"
    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  rule {
    id     = "expire-logs-prefix"
    status = "Enabled"
    filter {
      prefix = "logs/"
    }

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "delete-old-noncurrent-versions"
    status = "Enabled"
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "base" {
  bucket = local.s3_bucket_id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

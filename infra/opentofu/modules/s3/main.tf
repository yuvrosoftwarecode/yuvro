# ----------------------------------------------------------------------------
# S3 layout
#
# A single base bucket holds all environments' data, organized as:
#
#   <base-bucket>/
#   ├── <env>/ycode-uploads/...        # ycode profile pics, snapshots, etc.
#   ├── <env>/ycampus-uploads/...      # ycampus profile pics, resumes, etc.
#   ├── <env>/ylabs-uploads/...        # ylabs (future)
#   └── logs/                          # app / access logs (separate bucket)
#
# Per-app "buckets" (ycode-uploads, ycampus-uploads, …) are *folders* under
# the env prefix, not separate AWS buckets. This keeps the bucket count low
# (cheaper, simpler IAM, one lifecycle policy) while still isolating each
# environment's data.
# ----------------------------------------------------------------------------
resource "aws_s3_bucket" "base" {
  bucket = "yuvro-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "yuvro-${var.environment}-base"
    Environment = var.environment
    Purpose     = "Base bucket — env/app data lives under <env>/<app>-uploads/"
  }
}

resource "aws_s3_bucket_versioning" "base" {
  bucket = aws_s3_bucket.base.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "base" {
  bucket = aws_s3_bucket.base.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "base" {
  bucket = aws_s3_bucket.base.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "base" {
  bucket = aws_s3_bucket.base.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"
    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
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

# Separate logs bucket (same region, same encryption/lifecycle, distinct
# access pattern — logs are written by CloudWatch / app and rarely read).
resource "aws_s3_bucket" "logs" {
  bucket = "yuvro-${var.environment}-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "yuvro-${var.environment}-logs"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "expire-logs"
    status = "Enabled"
    filter {}

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

data "aws_caller_identity" "current" {}

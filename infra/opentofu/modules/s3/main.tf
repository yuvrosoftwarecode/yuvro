resource "aws_s3_bucket" "base" {
  bucket = "yuvro-${var.environment}"

  tags = {
    Name        = "yuvro-${var.environment}"
    Environment = var.environment
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
    id     = "expire-logs-prefix"
    status = "Enabled"
    prefix = "logs/"

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

data "aws_caller_identity" "current" {}

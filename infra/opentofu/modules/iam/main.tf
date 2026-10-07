# Try to get existing role
data "aws_iam_role" "app_service_existing" {
  name = "${var.environment}-app-service-role"
}

# Only create if doesn't exist
resource "aws_iam_role" "app_service" {
  count = try(data.aws_iam_role.app_service_existing.arn, null) != null ? 0 : 1
  name = "${var.environment}-app-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "ec2.amazonaws.com",
            "eks.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = {
    Name = "${var.environment}-app-service-role"
  }

  lifecycle {
    ignore_changes = [assume_role_policy, tags]
  }
}

# Local to reference either created or existing
locals {
  app_service_role_id   = try(data.aws_iam_role.app_service_existing.id, aws_iam_role.app_service[0].id)
  app_service_role_arn  = try(data.aws_iam_role.app_service_existing.arn, aws_iam_role.app_service[0].arn)
  app_service_role_name = try(data.aws_iam_role.app_service_existing.name, aws_iam_role.app_service[0].name)
}

resource "aws_iam_role_policy" "app_service_s3" {
  name = "${var.environment}-app-service-s3-policy"
  role = local.app_service_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = var.s3_bucket_arns
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListAllMyBuckets"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "app_service_cloudwatch" {
  name = "${var.environment}-app-service-cloudwatch-policy"
  role = local.app_service_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "app_service_secrets" {
  name = "${var.environment}-app-service-secrets-policy"
  role = local.app_service_role_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:${var.environment}/*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "app_service" {
  name = "${var.environment}-app-service-profile"
  role = local.app_service_role_name

  lifecycle {
    ignore_changes = all
  }
}

data "aws_iam_user" "app_service_existing" {
  user_name = "${var.environment}-app-service-user"
}

resource "aws_iam_user" "app_service" {
  count = try(data.aws_iam_user.app_service_existing.arn, null) != null ? 0 : 1
  name = "${var.environment}-app-service-user"

  tags = {
    Name = "${var.environment}-app-service-user"
  }

  lifecycle {
    ignore_changes = [tags]
  }
}

locals {
  app_service_user_id   = try(data.aws_iam_user.app_service_existing.user_id, aws_iam_user.app_service[0].unique_id)
  app_service_user_name = try(data.aws_iam_user.app_service_existing.user_name, aws_iam_user.app_service[0].name)
  app_service_user_arn  = try(data.aws_iam_user.app_service_existing.arn, aws_iam_user.app_service[0].arn)
}

resource "aws_iam_user_policy" "app_service_s3" {
  name = "${var.environment}-app-service-user-s3"
  user = local.app_service_user_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = var.s3_bucket_arns
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObjectVersion",
          "s3:DeleteObjectVersion"
        ]
        Resource = [for arn in var.s3_bucket_arns : "${arn}/*"]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListAllMyBuckets"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_access_key" "app_service" {
  user = local.app_service_user_name

  depends_on = [aws_iam_user_policy.app_service_s3]

  lifecycle {
    ignore_changes = all
  }
}

# GitHub Actions OIDC Provider and Role for ECR Access

# Get AWS account ID
data "aws_caller_identity" "current" {}

# Get the GitHub OIDC provider thumbprint
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_iam_openid_connect_provider" "github_existing" {
  arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

# Only create if doesn't exist
resource "aws_iam_openid_connect_provider" "github" {
  count           = try(data.aws_iam_openid_connect_provider.github_existing.arn, null) != null ? 0 : 1
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
  url             = "https://token.actions.githubusercontent.com"

  tags = {
    Name = "github-actions-oidc"
  }

  lifecycle {
    ignore_changes = [client_id_list, thumbprint_list, url, tags]
  }
}

locals {
  github_oidc_provider_arn = try(data.aws_iam_openid_connect_provider.github_existing.arn, aws_iam_openid_connect_provider.github[0].arn)
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name               = "github-actions-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.github_oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:*"  # Allow all repos; restrict if needed
          }
        }
      }
    ]
  })

  tags = {
    Name = "github-actions-role"
  }

  lifecycle {
    ignore_changes = all
  }
}

# Policy for ECR access
resource "aws_iam_role_policy" "github_actions_ecr" {
  name   = "github-actions-ecr-policy"
  role   = aws_iam_role.github_actions.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/*"
      }
    ]
  })
}

output "github_actions_role_arn" {
  description = "ARN of GitHub Actions IAM role"
  value       = aws_iam_role.github_actions.arn
}

output "github_oidc_provider_arn" {
  description = "ARN of GitHub OIDC provider"
  value       = local.github_oidc_provider_arn
}

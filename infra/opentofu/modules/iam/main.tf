resource "aws_iam_role" "app_service" {
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
}

resource "aws_iam_role_policy" "app_service_s3" {
  name = "${var.environment}-app-service-s3-policy"
  role = aws_iam_role.app_service.id

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
  role = aws_iam_role.app_service.id

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
  role = aws_iam_role.app_service.id

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
  role = aws_iam_role.app_service.name
}

resource "aws_iam_role" "kubernetes_node" {
  name = "${var.environment}-kubernetes-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.environment}-kubernetes-node-role"
  }
}

resource "aws_iam_role_policy_attachment" "kubernetes_node_ssm" {
  role       = aws_iam_role.kubernetes_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "kubernetes_node_ecr" {
  role       = aws_iam_role.kubernetes_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy" "kubernetes_node_custom" {
  name = "${var.environment}-kubernetes-node-policy"
  role = aws_iam_role.kubernetes_node.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeTags",
          "ec2:DescribeVolumes",
          "ec2:DescribeSnapshots"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = var.s3_bucket_arns
      }
    ]
  })
}

resource "aws_iam_instance_profile" "kubernetes_node" {
  name = "${var.environment}-kubernetes-node-profile"
  role = aws_iam_role.kubernetes_node.name
}

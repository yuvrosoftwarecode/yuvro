terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Uncomment for remote state management
  # backend "s3" {
  #   bucket         = "ycode-terraform-state"
  #   key            = "prod-ec2/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "prod"
      Project     = "Yuvro"
      ManagedBy   = "Terraform"
      DeployType  = "EC2"
    }
  }
}

# Get current AWS account
data "aws_caller_identity" "current" {}

# Get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Fetch ECS-optimized Amazon Linux 2023 AMI from SSM Parameter Store
# This ensures we always get the latest secure version
data "aws_ssm_parameter" "ecs_optimized_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2023/recommended"
}

locals {
  # Use SSM parameter if ami_id is not explicitly provided, otherwise use the provided value
  ami_id = var.ami_id != "" ? var.ami_id : jsondecode(data.aws_ssm_parameter.ecs_optimized_ami.value).image_id
}

# ========== VPC SETUP - Create dedicated Production VPC ==========

module "vpc" {
  source = "../modules/vpc"

  environment              = "prod"
  vpc_cidr                 = var.vpc_cidr
  availability_zones       = var.availability_zones
  public_subnet_cidrs      = var.public_subnet_cidrs
  private_subnet_cidrs     = var.private_subnet_cidrs
  create_nat_gateway       = var.create_nat_gateway

  tags = {
    Environment = "prod"
    Project     = "Yuvro"
    ManagedBy   = "Terraform"
  }
}

# ========== SHARED MODULES (Common across dev/prod) ==========

# Security Groups Module - reference new VPC
module "security_groups" {
  source = "../modules/security_groups"

  environment = "prod"
  vpc_id      = module.vpc.vpc_id
}

# Use existing RDS - parse the endpoint and port
locals {
  # If using existing RDS, parse the endpoint
  rds_endpoint_parts = split(":", var.existing_rds_endpoint)
  rds_host           = local.rds_endpoint_parts[0]
  rds_port           = length(local.rds_endpoint_parts) > 1 ? tonumber(local.rds_endpoint_parts[1]) : 5432
  rds_id             = "prod-yuvro-db"
}

# S3 Buckets Module
module "s3" {
  source = "../modules/s3"

  environment          = "prod"
  cors_allowed_origins = var.s3_cors_allowed_origins
}

# IAM Roles Module
module "iam" {
  source = "../modules/iam"

  environment    = "prod"
  aws_region     = var.aws_region
  s3_bucket_arns = [module.s3.base_bucket_arn]
}

# CloudWatch Module
module "cloudwatch" {
  source = "../modules/cloudwatch"

  environment = "prod"
}

# ========== EC2 INSTANCES - Docker Compose Hosts ==========

# EC2 Security Group for Docker hosts
resource "aws_security_group" "ec2_docker" {
  name        = "yuvro-prod-ec2-docker-sg"
  description = "Security group for Yuvro production EC2 Docker hosts"
  vpc_id      = module.vpc.vpc_id

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidrs
  }

  # Application ports (3000-3004, 8000-8004, 8009)
  ingress {
    from_port   = 3000
    to_port     = 3004
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8000
    to_port     = 8004
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8009
    to_port     = 8009
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress - Allow all outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "yuvro-prod-ec2-docker-sg"
  }
}

# IAM Role for EC2 instances (allows pulling from GHCR via GitHub OIDC)
resource "aws_iam_role" "ec2_docker_role" {
  name = "yuvro-prod-ec2-docker-role"

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
    Name = "yuvro-prod-ec2-docker-role"
  }
}

# Allow EC2 to write logs to CloudWatch
resource "aws_iam_role_policy" "ec2_cloudwatch_logs" {
  name = "yuvro-prod-ec2-cloudwatch-logs"
  role = aws_iam_role.ec2_docker_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Instance Profile
resource "aws_iam_instance_profile" "ec2_docker_profile" {
  name = "yuvro-prod-ec2-docker-profile"
  role = aws_iam_role.ec2_docker_role.name
}

# EC2 Instance Launch Template
resource "aws_launch_template" "docker_host" {
  name_prefix            = "yuvro-prod-ec2-"
  image_id               = local.ami_id
  instance_type          = var.ec2_instance_type
  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_docker_profile.name
  }

  vpc_security_group_ids = [aws_security_group.ec2_docker.id]

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.ec2_root_volume_size
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  # User data script to configure application-specific settings
  user_data = base64encode(templatefile("${path.module}/launch_template_init.tpl", {
    github_token      = var.github_token
    db_host           = local.rds_host
    db_port           = local.rds_port
    db_username       = var.db_master_username
    db_password       = var.db_master_password
    s3_bucket         = module.s3.base_bucket_name
  }))

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name                = "yuvro-prod-ec2-docker"
      Environment         = "prod"
      DeployType          = "EC2"
      ManagedBy           = "Terraform"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# EC2 Instances
resource "aws_instance" "docker_hosts" {
  count                = var.ec2_instance_count
  launch_template {
    id      = aws_launch_template.docker_host.id
    version = "$Latest"
  }

  subnet_id                   = module.vpc.public_subnet_ids[count.index % length(module.vpc.public_subnet_ids)]
  associate_public_ip_address = true

  tags = {
    Name = "yuvro-prod-ec2-instance-${count.index + 1}"
  }

  # Conditional dependency on RDS - only on S3 since RDS is external
  depends_on = [
    module.s3
  ]
}

# Elastic IP for instances (for stable DNS)
resource "aws_eip" "docker_hosts" {
  count      = var.ec2_instance_count
  instance   = aws_instance.docker_hosts[count.index].id
  domain     = "vpc"

  tags = {
    Name = "yuvro-prod-ec2-eip-${count.index + 1}"
  }

  depends_on = [module.vpc]
}

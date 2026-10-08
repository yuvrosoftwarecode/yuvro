terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment for remote state management
  # backend "s3" {
  #   bucket         = "ycode-terraform-state"
  #   key            = "prod-ecs/terraform.tfstate"
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
      Platform    = "ECS"
    }
  }
}

# ===== ECS PRODUCTION INFRASTRUCTURE =====
# This configuration deploys Yuvro services to AWS ECS

# VPC and Networking
module "vpc" {
  source = "../modules/vpc"

  environment = var.environment
  aws_region  = var.aws_region
  
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  private_subnet_cidrs = var.private_subnet_cidrs
  public_subnet_cidrs  = var.public_subnet_cidrs
}

# Security Groups
module "security_groups" {
  source = "../modules/security_groups"

  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-yuvro-ecs-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.environment}-ecs-cluster"
  }
}

# ECS Cluster Capacity Providers
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.environment}-yuvro-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [module.security_groups.alb_security_group_id]
  subnets            = module.vpc.public_subnet_ids

  enable_deletion_protection = false

  tags = {
    Name = "${var.environment}-alb"
  }
}

# Target Groups for each service
resource "aws_lb_target_group" "services" {
  for_each = toset(var.services)

  name        = "${var.environment}-${each.value}-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    interval            = 30
    path                = "/health/"
    matcher             = "200"
  }

  tags = {
    Name = "${var.environment}-${each.value}-target-group"
  }
}

# ALB Listeners
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.services["ycode"].arn
  }
}

# RDS Database
module "rds" {
  source = "../modules/rds"

  environment           = var.environment
  db_subnet_group_name  = "${var.environment}-yuvro-db-subnet-group"
  security_group_id     = module.security_groups.rds_security_group_id
  db_name               = var.db_name
  db_username           = var.db_username
  db_master_password    = var.db_master_password
  
  db_instance_class = "db.t3.medium"
  allocated_storage  = 100
  storage_type       = "gp3"
  multi_az           = true
  
  tags = {
    Name = "${var.environment}-rds"
  }
}

# IAM Roles for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.environment}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.environment}-yuvro"
  retention_in_days = 30

  tags = {
    Name = "${var.environment}-ecs-logs"
  }
}

# Auto Scaling Target for ECS Services
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/*"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy - Scale up on CPU
resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  name               = "${var.environment}-ecs-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# Auto Scaling Policy - Scale up on Memory
resource "aws_appautoscaling_policy" "ecs_policy_memory" {
  name               = "${var.environment}-ecs-memory-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
  }
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  value = aws_ecs_cluster.main.arn
}

output "alb_arn" {
  value = aws_lb.main.arn
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "rds_db_instance_id" {
  value = module.rds.db_instance_id
}

# Always create security groups
resource "aws_security_group" "app" {
  name        = "${var.environment}-app-sg"
  description = "Security group for app nodes"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.environment}-app-sg"
  }
}

# Always create RDS security group
resource "aws_security_group" "rds" {
  name        = "${var.environment}-rds-sg"
  description = "Security group for RDS databases"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.environment}-rds-sg"
  }
}

locals {
  app_sg_id = aws_security_group.app.id
  rds_sg_id = aws_security_group.rds.id
}

# App SSH rule
resource "aws_vpc_security_group_ingress_rule" "app_ssh" {
  security_group_id = local.app_sg_id
  description       = "SSH access"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "ssh" }

  lifecycle {
    ignore_changes = all
  }
}

# HTTP rule
resource "aws_vpc_security_group_ingress_rule" "app_http" {
  security_group_id = local.app_sg_id
  description       = "HTTP"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "http" }

  lifecycle {
    ignore_changes = all
  }
}

# HTTPS rule
resource "aws_vpc_security_group_ingress_rule" "app_https" {
  security_group_id = local.app_sg_id
  description       = "HTTPS"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "https" }

  lifecycle {
    ignore_changes = all
  }
}

# App ports rule
resource "aws_vpc_security_group_ingress_rule" "app_ports" {
  security_group_id = local.app_sg_id
  description       = "Application ports"
  from_port         = 3000
  to_port           = 9000
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "app-ports" }

  lifecycle {
    ignore_changes = all
  }
}

# App egress rule
resource "aws_vpc_security_group_egress_rule" "app_all" {
  security_group_id = local.app_sg_id
  description       = "Allow all outbound traffic"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "all-outbound" }

  lifecycle {
    ignore_changes = all
  }
}

# RDS postgres rule
resource "aws_vpc_security_group_ingress_rule" "rds_postgres" {
  security_group_id            = local.rds_sg_id
  description                  = "PostgreSQL from app nodes"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = local.app_sg_id
  tags = { Name = "postgres" }

  lifecycle {
    ignore_changes = all
  }
}

# RDS egress rule
resource "aws_vpc_security_group_egress_rule" "rds_all" {
  security_group_id = local.rds_sg_id
  description       = "Allow all outbound traffic"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "all-outbound" }

  lifecycle {
    ignore_changes = all
  }
}

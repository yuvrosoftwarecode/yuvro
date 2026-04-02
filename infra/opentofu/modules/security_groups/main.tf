resource "aws_security_group" "kubernetes" {
  name        = "${var.environment}-kubernetes-sg"
  description = "Security group for Kubernetes nodes"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.environment}-kubernetes-sg"
  }
}

# Allow inbound SSH
resource "aws_vpc_security_group_ingress_rule" "kubernetes_ssh" {
  security_group_id = aws_security_group.kubernetes.id
  description       = "SSH access"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = {
    Name = "ssh"
  }
}

# Allow inbound Kubernetes API
resource "aws_vpc_security_group_ingress_rule" "kubernetes_api" {
  security_group_id = aws_security_group.kubernetes.id
  description       = "Kubernetes API"
  from_port         = 6443
  to_port           = 6443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = {
    Name = "kubernetes-api"
  }
}

# Allow inbound kubelet
resource "aws_vpc_security_group_ingress_rule" "kubernetes_kubelet" {
  security_group_id = aws_security_group.kubernetes.id
  description       = "Kubelet"
  from_port         = 10250
  to_port           = 10250
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = {
    Name = "kubelet"
  }
}

# Allow inbound node communication
resource "aws_vpc_security_group_ingress_rule" "kubernetes_node_comm" {
  security_group_id = aws_security_group.kubernetes.id
  description       = "Node communication"
  from_port         = 30000
  to_port           = 32767
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = {
    Name = "node-ports"
  }
}

# Allow intra-node communication
resource "aws_vpc_security_group_ingress_rule" "kubernetes_intra" {
  security_group_id = aws_security_group.kubernetes.id
  description       = "Intra-node communication"
  from_port         = 0
  to_port           = 65535
  ip_protocol       = "tcp"
  referenced_security_group_id = aws_security_group.kubernetes.id

  tags = {
    Name = "intra-node"
  }
}

# Allow outbound all traffic
resource "aws_vpc_security_group_egress_rule" "kubernetes_all" {
  security_group_id = aws_security_group.kubernetes.id
  description       = "Allow all outbound traffic"
  from_port         = 0
  to_port           = 0
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"

  tags = {
    Name = "all-outbound"
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.environment}-rds-sg"
  description = "Security group for RDS databases"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.environment}-rds-sg"
  }
}

# Allow inbound PostgreSQL from Kubernetes nodes
resource "aws_vpc_security_group_ingress_rule" "rds_postgres" {
  security_group_id = aws_security_group.rds.id
  description       = "PostgreSQL from Kubernetes"
  from_port         = 5432
  to_port           = 5432
  ip_protocol       = "tcp"
  referenced_security_group_id = aws_security_group.kubernetes.id

  tags = {
    Name = "postgres"
  }
}

# Allow outbound all traffic from RDS
resource "aws_vpc_security_group_egress_rule" "rds_all" {
  security_group_id = aws_security_group.rds.id
  description       = "Allow all outbound traffic"
  from_port         = 0
  to_port           = 0
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"

  tags = {
    Name = "all-outbound"
  }
}

# ALB Security Group (for future use)
resource "aws_security_group" "alb" {
  name        = "${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.environment}-alb-sg"
  }
}

# Allow inbound HTTP
resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = {
    Name = "http"
  }
}

# Allow inbound HTTPS
resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTPS"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"

  tags = {
    Name = "https"
  }
}

# Allow outbound all traffic from ALB
resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow all outbound traffic"
  from_port         = 0
  to_port           = 0
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"

  tags = {
    Name = "all-outbound"
  }
}

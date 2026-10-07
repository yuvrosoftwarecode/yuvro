# Get existing security groups if they exist
data "aws_security_group" "app_existing" {
  count  = var.vpc_id != "" ? 1 : 0
  name   = "${var.environment}-app-sg"
  vpc_id = var.vpc_id

  # Optional: try to find by name only if not found by name+vpc
  depends_on = []
}

# Only create if doesn't exist
resource "aws_security_group" "app" {
  count       = try(length(data.aws_security_group.app_existing) > 0 && data.aws_security_group.app_existing[0].id != null, false) ? 0 : 1
  name        = "${var.environment}-app-sg"
  description = "Security group for app nodes"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.environment}-app-sg"
  }

  lifecycle {
    ignore_changes = [name, description, vpc_id, tags]
  }
}

# Get the actual security group (either created or existing)
locals {
  app_sg_id = try(data.aws_security_group.app_existing[0].id, aws_security_group.app[0].id)
}

data "aws_security_group" "rds_existing" {
  count  = var.vpc_id != "" ? 1 : 0
  name   = "${var.environment}-rds-sg"
  vpc_id = var.vpc_id
}

resource "aws_security_group" "rds" {
  count       = try(length(data.aws_security_group.rds_existing) > 0 && data.aws_security_group.rds_existing[0].id != null, false) ? 0 : 1
  name        = "${var.environment}-rds-sg"
  description = "Security group for RDS databases"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.environment}-rds-sg"
  }

  lifecycle {
    ignore_changes = [name, description, vpc_id, tags]
  }
}

locals {
  rds_sg_id = try(data.aws_security_group.rds_existing[0].id, aws_security_group.rds[0].id)
}

# Get existing ingress rules
data "aws_vpc_security_group_ingress_rules" "app_ssh_existing" {
  filter {
    name   = "security_group_id"
    values = [local.app_sg_id]
  }
  filter {
    name   = "from_port"
    values = ["22"]
  }
}

resource "aws_vpc_security_group_ingress_rule" "app_ssh" {
  count             = length(data.aws_vpc_security_group_ingress_rules.app_ssh_existing.ids) > 0 ? 0 : 1
  security_group_id = local.app_sg_id
  description       = "SSH access"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "ssh" }

  lifecycle {
    ignore_changes = [tags]
  }
}

# Get existing HTTP rule
data "aws_vpc_security_group_ingress_rules" "app_http_existing" {
  filter {
    name   = "security_group_id"
    values = [local.app_sg_id]
  }
  filter {
    name   = "from_port"
    values = ["80"]
  }
}

resource "aws_vpc_security_group_ingress_rule" "app_http" {
  count             = length(data.aws_vpc_security_group_ingress_rules.app_http_existing.ids) > 0 ? 0 : 1
  security_group_id = local.app_sg_id
  description       = "HTTP"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "http" }

  lifecycle {
    ignore_changes = [tags]
  }
}

# Get existing HTTPS rule
data "aws_vpc_security_group_ingress_rules" "app_https_existing" {
  filter {
    name   = "security_group_id"
    values = [local.app_sg_id]
  }
  filter {
    name   = "from_port"
    values = ["443"]
  }
}

resource "aws_vpc_security_group_ingress_rule" "app_https" {
  count             = length(data.aws_vpc_security_group_ingress_rules.app_https_existing.ids) > 0 ? 0 : 1
  security_group_id = local.app_sg_id
  description       = "HTTPS"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "https" }

  lifecycle {
    ignore_changes = [tags]
  }
}

# Get existing app ports rule
data "aws_vpc_security_group_ingress_rules" "app_ports_existing" {
  filter {
    name   = "security_group_id"
    values = [local.app_sg_id]
  }
  filter {
    name   = "from_port"
    values = ["3000"]
  }
}

# App ports: ycode-frontend(3000), ycode-backend(8001), executor(8009), ycampus-backend(8003), ycampus-frontend(3002)
resource "aws_vpc_security_group_ingress_rule" "app_ports" {
  count             = length(data.aws_vpc_security_group_ingress_rules.app_ports_existing.ids) > 0 ? 0 : 1
  security_group_id = local.app_sg_id
  description       = "Application ports"
  from_port         = 3000
  to_port           = 9000
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "app-ports" }

  lifecycle {
    ignore_changes = [tags]
  }
}

# Get existing app egress rule
data "aws_vpc_security_group_egress_rules" "app_all_existing" {
  filter {
    name   = "security_group_id"
    values = [local.app_sg_id]
  }
  filter {
    name   = "cidr_ipv4"
    values = ["0.0.0.0/0"]
  }
  filter {
    name   = "ip_protocol"
    values = ["-1"]
  }
}

resource "aws_vpc_security_group_egress_rule" "app_all" {
  count             = length(data.aws_vpc_security_group_egress_rules.app_all_existing.ids) > 0 ? 0 : 1
  security_group_id = local.app_sg_id
  description       = "Allow all outbound traffic"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "all-outbound" }

  lifecycle {
    ignore_changes = [tags]
  }
}

# Get existing RDS postgres rule
data "aws_vpc_security_group_ingress_rules" "rds_postgres_existing" {
  filter {
    name   = "security_group_id"
    values = [local.rds_sg_id]
  }
  filter {
    name   = "from_port"
    values = ["5432"]
  }
}

resource "aws_vpc_security_group_ingress_rule" "rds_postgres" {
  count                        = length(data.aws_vpc_security_group_ingress_rules.rds_postgres_existing.ids) > 0 ? 0 : 1
  security_group_id            = local.rds_sg_id
  description                  = "PostgreSQL from app nodes"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = local.app_sg_id
  tags = { Name = "postgres" }

  lifecycle {
    ignore_changes = [tags]
  }
}

# Get existing RDS egress rule
data "aws_vpc_security_group_egress_rules" "rds_all_existing" {
  filter {
    name   = "security_group_id"
    values = [local.rds_sg_id]
  }
  filter {
    name   = "cidr_ipv4"
    values = ["0.0.0.0/0"]
  }
  filter {
    name   = "ip_protocol"
    values = ["-1"]
  }
}

resource "aws_vpc_security_group_egress_rule" "rds_all" {
  count             = length(data.aws_vpc_security_group_egress_rules.rds_all_existing.ids) > 0 ? 0 : 1
  security_group_id = local.rds_sg_id
  description       = "Allow all outbound traffic"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
  tags = { Name = "all-outbound" }

  lifecycle {
    ignore_changes = [tags]
  }
}

data "aws_db_subnet_group" "main_existing" {
  name = "${var.environment}-yuvro-db-subnet-group"
}

resource "aws_db_subnet_group" "main" {
  count      = try(data.aws_db_subnet_group.main_existing.id, null) != null ? 0 : 1
  name       = "${var.environment}-yuvro-db-subnet-group"
  subnet_ids = length(var.subnet_ids) >= 2 ? var.subnet_ids : concat(var.subnet_ids, var.subnet_ids)

  tags = {
    Name = "${var.environment}-yuvro-db-subnet-group"
  }

  lifecycle {
    ignore_changes = [subnet_ids, tags]
  }
}

locals {
  db_subnet_group_id   = try(data.aws_db_subnet_group.main_existing.id, aws_db_subnet_group.main[0].id)
  db_subnet_group_name = try(data.aws_db_subnet_group.main_existing.name, aws_db_subnet_group.main[0].name)
}

resource "aws_db_instance" "main" {
  identifier     = "${var.environment}-yuvro-db"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp2"
  storage_encrypted     = var.environment != "dev" ? true : false

  db_subnet_group_name   = local.db_subnet_group_name
  vpc_security_group_ids = [var.security_group_id]

  multi_az               = var.multi_az
  publicly_accessible    = false
  skip_final_snapshot    = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.environment}-yuvro-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  enabled_cloudwatch_logs_exports = var.backup_retention_days > 0 ? ["postgresql"] : []
  iam_database_authentication_enabled = false

  deletion_protection = var.environment == "prod" ? true : false

  parameter_group_name = local.db_parameter_group_name

  tags = {
    Name = "${var.environment}-yuvro-db"
  }

  lifecycle {
    ignore_changes = [backup_retention_period]
  }
}

data "aws_db_parameter_group" "main_existing" {
  name = "${var.environment}-yuvro-db-params"
}

resource "aws_db_parameter_group" "main" {
  count  = try(data.aws_db_parameter_group.main_existing.id, null) != null ? 0 : 1
  name   = "${var.environment}-yuvro-db-params"
  family = "postgres${split(".", var.engine_version)[0]}"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_duration"
    value = "on"
  }

  tags = {
    Name = "${var.environment}-yuvro-db-params"
  }

  lifecycle {
    create_before_destroy = true
  }
}

locals {
  db_parameter_group_id   = try(data.aws_db_parameter_group.main_existing.id, aws_db_parameter_group.main[0].id)
  db_parameter_group_name = try(data.aws_db_parameter_group.main_existing.name, aws_db_parameter_group.main[0].name)
}

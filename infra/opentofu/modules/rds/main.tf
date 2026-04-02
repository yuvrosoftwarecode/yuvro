resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-${var.db_name}-subnet-group"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${var.environment}-${var.db_name}-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.environment}-${var.db_name}-db"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]

  multi_az               = var.multi_az
  publicly_accessible    = false
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.environment}-${var.db_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  enable_cloudwatch_logs_exports = ["postgresql"]
  enable_iam_database_authentication = true

  deletion_protection = var.environment == "prod" ? true : false

  tags = {
    Name = "${var.environment}-${var.db_name}-db"
  }
}

resource "aws_db_parameter_group" "main" {
  name   = "${var.environment}-${var.db_name}-params"
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
    Name = "${var.environment}-${var.db_name}-params"
  }
}

resource "aws_db_instance_parameter_group_association" "main" {
  db_instance_identifier = aws_db_instance.main.id
  parameter_group_name   = aws_db_parameter_group.main.name
}

# Try to get existing log group
data "aws_cloudwatch_log_group" "application_existing" {
  name = "/aws/ycode/${var.environment}/application"
}

# Use data source if exists, create otherwise
resource "aws_cloudwatch_log_group" "application" {
  count             = try(data.aws_cloudwatch_log_group.application_existing.id, null) != null ? 0 : 1
  name              = "/aws/ycode/${var.environment}/application"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.environment}-application-logs"
  }
}

data "aws_cloudwatch_log_group" "kubernetes_existing" {
  name = "/aws/ycode/${var.environment}/kubernetes"
}

resource "aws_cloudwatch_log_group" "kubernetes" {
  count             = try(data.aws_cloudwatch_log_group.kubernetes_existing.id, null) != null ? 0 : 1
  name              = "/aws/ycode/${var.environment}/kubernetes"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.environment}-kubernetes-logs"
  }
}

data "aws_cloudwatch_log_group" "database_existing" {
  name = "/aws/ycode/${var.environment}/database"
}

resource "aws_cloudwatch_log_group" "database" {
  count             = try(data.aws_cloudwatch_log_group.database_existing.id, null) != null ? 0 : 1
  name              = "/aws/ycode/${var.environment}/database"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.environment}-database-logs"
  }
}

resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "${var.environment}-high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when CPU utilization is high"
  treat_missing_data  = "notBreaching"

  tags = {
    Name = "${var.environment}-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "memory_utilization" {
  alarm_name          = "${var.environment}-high-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Alert when memory utilization is high"
  treat_missing_data  = "notBreaching"

  tags = {
    Name = "${var.environment}-memory-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "disk_utilization" {
  alarm_name          = "${var.environment}-high-disk-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DiskUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "90"
  alarm_description   = "Alert when disk utilization is high"
  treat_missing_data  = "notBreaching"

  tags = {
    Name = "${var.environment}-disk-alarm"
  }
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.environment}-ycode-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization"],
            [".", "NetworkIn"],
            [".", "NetworkOut"]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "EC2 Metrics"
        }
      },
      {
        type = "log"
        properties = {
          query   = "fields @timestamp, @message | stats count() by bin(5m)"
          region  = data.aws_region.current.name
          title   = "Application Logs"
        }
      }
    ]
  })
}

data "aws_region" "current" {}

# Locals to reference either created or existing log groups
locals {
  application_log_group_name = try(data.aws_cloudwatch_log_group.application_existing.name, aws_cloudwatch_log_group.application[0].name)
  application_log_group_arn  = try(data.aws_cloudwatch_log_group.application_existing.arn, aws_cloudwatch_log_group.application[0].arn)
  kubernetes_log_group_name  = try(data.aws_cloudwatch_log_group.kubernetes_existing.name, aws_cloudwatch_log_group.kubernetes[0].name)
  database_log_group_name    = try(data.aws_cloudwatch_log_group.database_existing.name, aws_cloudwatch_log_group.database[0].name)
}

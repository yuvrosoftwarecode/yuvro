resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/ycode/${var.environment}/application"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.environment}-application-logs"
  }
}

resource "aws_cloudwatch_log_group" "kubernetes" {
  name              = "/aws/ycode/${var.environment}/kubernetes"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.environment}-kubernetes-logs"
  }
}

resource "aws_cloudwatch_log_group" "database" {
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

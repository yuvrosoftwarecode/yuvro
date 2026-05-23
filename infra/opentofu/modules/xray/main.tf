# X-Ray Sampling Rules for distributed tracing
resource "aws_xray_sampling_rule" "application" {
  rule_name      = "${var.environment}-application-sampling"
  priority       = 1000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.05
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  attributes = {
    Environment = var.environment
    Service     = "ycode-application"
  }
}

resource "aws_xray_sampling_rule" "kubernetes" {
  rule_name      = "${var.environment}-kubernetes-sampling"
  priority       = 1001
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "aws"
  service_name   = "kubernetes"
  resource_arn   = "*"

  attributes = {
    Environment = var.environment
    Service     = "kubernetes"
  }
}

resource "aws_xray_sampling_rule" "database" {
  rule_name      = "${var.environment}-database-sampling"
  priority       = 1002
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "aws"
  service_name   = "rds"
  resource_arn   = "*"

  attributes = {
    Environment = var.environment
    Service     = "database"
  }
}

# X-Ray Group for application errors
resource "aws_xray_group" "application_errors" {
  group_name        = "${var.environment}-application-errors"
  filter_expression = "service(\"ycode-application\") AND http.status >= 400"
  insights_enabled  = true

  tags = {
    Name = "${var.environment}-application-errors"
  }
}

# X-Ray Group for slow requests
resource "aws_xray_group" "slow_requests" {
  group_name        = "${var.environment}-slow-requests"
  filter_expression = "service(\"ycode-application\") AND response_time > 1"
  insights_enabled  = true

  tags = {
    Name = "${var.environment}-slow-requests"
  }
}

# X-Ray Group for database issues
resource "aws_xray_group" "database_issues" {
  group_name        = "${var.environment}-database-issues"
  filter_expression = "service(\"rds\") AND (error OR throttle)"
  insights_enabled  = true

  tags = {
    Name = "${var.environment}-database-issues"
  }
}

# CloudWatch Log Group for X-Ray Insights
resource "aws_cloudwatch_log_group" "xray_insights" {
  name              = "/aws/xray/${var.environment}/insights"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "${var.environment}-xray-insights"
  }
}

# CloudWatch Metric Alarm for X-Ray Errors
resource "aws_cloudwatch_metric_alarm" "xray_errors" {
  alarm_name          = "${var.environment}-xray-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TracedRequestCount"
  namespace           = "AWS/X-Ray"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "Alert when X-Ray detects high error rate"
  treat_missing_data  = "notBreaching"

  dimensions = {
    GroupName = aws_xray_group.application_errors.group_name
  }

  tags = {
    Name = "${var.environment}-xray-errors-alarm"
  }
}

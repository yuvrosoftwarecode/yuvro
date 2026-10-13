#!/bin/bash
# Import existing AWS resources into OpenTofu state

set -e

REGION="ap-south-1"
ENV="dev"

echo "Importing existing resources into OpenTofu state..."
echo

# CloudWatch Log Groups
echo "Importing CloudWatch Log Groups..."
tofu import module.cloudwatch.aws_cloudwatch_log_group.application "/aws/ycode/dev/application" || true
tofu import module.cloudwatch.aws_cloudwatch_log_group.kubernetes "/aws/ycode/dev/kubernetes" || true
tofu import module.cloudwatch.aws_cloudwatch_log_group.database "/aws/ycode/dev/database" || true

# IAM Roles
echo "Importing IAM Roles..."
tofu import module.ec2_nodes[0].aws_iam_role.app_node "dev-app-node-role" || true
tofu import module.iam.aws_iam_role.app_service "dev-app-service-role" || true
tofu import module.vpc.aws_iam_role.flow_logs "dev-vpc-flow-logs-role" || true

# IAM User
echo "Importing IAM User..."
tofu import module.iam.aws_iam_user.app_service "dev-app-service-user" || true

# S3 Bucket
echo "Importing S3 Bucket..."
tofu import module.s3.aws_s3_bucket.base "yuvro-dev" || true

# RDS Parameter Group
echo "Importing RDS Parameter Group..."
tofu import module.rds_main.aws_db_parameter_group.main "dev-yuvro-db-params" || true

# VPC Flow Logs
echo "Importing VPC Flow Logs..."
tofu import module.vpc.aws_cloudwatch_log_group.flow_logs "/aws/vpc/flowlogs/dev" || true

echo
echo "✓ Import complete!"

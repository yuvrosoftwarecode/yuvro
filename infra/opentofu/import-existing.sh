#!/bin/bash

# Import existing AWS resources into OpenTofu state
# This script imports resources that already exist in AWS but aren't in OpenTofu state

set -e

cd /Users/devendradora/projects-other/yuvro/infra/opentofu

REGION="ap-south-1"
ENVIRONMENT="dev"
VPC_ID="vpc-0893533f938d45e9d"

echo "=== Importing Existing AWS Resources into OpenTofu State ==="
echo ""

# Function to import a resource
import_resource() {
  local resource_type="$1"
  local resource_name="$2"
  local resource_id="$3"
  
  echo "Importing: $resource_type -> $resource_name (ID: $resource_id)"
  tofu import -var-file=dev.tfvars "$resource_type" "$resource_id" 2>&1 | tail -1
}

echo "--- CloudWatch Log Groups ---"
import_resource "module.cloudwatch.aws_cloudwatch_log_group.application" "application" "/aws/ycode/dev/application"
import_resource "module.cloudwatch.aws_cloudwatch_log_group.kubernetes" "kubernetes" "/aws/ycode/dev/kubernetes"
import_resource "module.cloudwatch.aws_cloudwatch_log_group.database" "database" "/aws/ycode/dev/database"

echo ""
echo "--- S3 Bucket ---"
import_resource "module.s3.aws_s3_bucket.base" "base" "yuvro-dev"

echo ""
echo "--- RDS Parameter Group ---"
import_resource "module.rds_main.aws_db_parameter_group.main" "main" "dev-yuvro-db-params"

echo ""
echo "--- IAM Roles ---"
import_resource "module.iam.aws_iam_role.app_service" "app_service" "dev-app-service-role"
import_resource "module.iam.aws_iam_user.app_service" "app_service" "dev-app-service-user"

echo ""
echo "--- VPC Flow Logs ---"
import_resource "module.vpc.aws_cloudwatch_log_group.flow_logs" "flow_logs" "/aws/vpc/flowlogs/dev"
import_resource "module.vpc.aws_iam_role.flow_logs" "flow_logs" "dev-vpc-flow-logs-role"

echo ""
echo "=== Import Complete ==="
echo ""
echo "Next steps:"
echo "1. Verify import success: tofu state list | wc -l"
echo "2. Run plan again: tofu plan -var-file=dev.tfvars"
echo "3. Apply: tofu apply tfplan"

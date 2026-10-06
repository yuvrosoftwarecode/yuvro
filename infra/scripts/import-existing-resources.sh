#!/bin/bash
# Import existing AWS resources into OpenTofu state
# This prevents "already exists" errors when re-running provision-infra

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"

# ── colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

print_header()  { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${NC}"; echo -e "${BOLD}${BLUE}  $1${NC}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}"; }
print_success() { echo -e "${GREEN}  ✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
print_info()    { echo -e "${CYAN}  ℹ $1${NC}"; }

print_header "Importing Existing AWS Resources"

cd "$OPENTOFU_DIR"

# Initialize OpenTofu first
print_info "Initializing OpenTofu..."
tofu init -upgrade

print_info "Importing existing resources into state..."

# CloudWatch Log Groups
print_info "Importing CloudWatch log groups..."
tofu import "module.cloudwatch.aws_cloudwatch_log_group.application" "/aws/ycode/dev/application" 2>/dev/null || print_warning "Log group /aws/ycode/dev/application may not exist"
tofu import "module.cloudwatch.aws_cloudwatch_log_group.kubernetes" "/aws/ycode/dev/kubernetes" 2>/dev/null || print_warning "Log group /aws/ycode/dev/kubernetes may not exist"
tofu import "module.cloudwatch.aws_cloudwatch_log_group.database" "/aws/ycode/dev/database" 2>/dev/null || print_warning "Log group /aws/ycode/dev/database may not exist"

# S3 Bucket
print_info "Importing S3 bucket..."
tofu import "module.s3.aws_s3_bucket.base" "yuvro-dev" 2>/dev/null || print_warning "S3 bucket yuvro-dev may not exist"

# IAM Roles
print_info "Importing IAM roles..."
tofu import "module.ec2_nodes[0].aws_iam_role.app_node" "dev-app-node-role" 2>/dev/null || print_warning "IAM role dev-app-node-role may not exist"
tofu import "module.iam.aws_iam_role.app_service" "dev-app-service-role" 2>/dev/null || print_warning "IAM role dev-app-service-role may not exist"
tofu import "module.vpc.aws_iam_role.flow_logs" "dev-vpc-flow-logs-role" 2>/dev/null || print_warning "IAM role dev-vpc-flow-logs-role may not exist"

# IAM User
print_info "Importing IAM user..."
tofu import "module.iam.aws_iam_user.app_service" "dev-app-service-user" 2>/dev/null || print_warning "IAM user dev-app-service-user may not exist"

# VPC Flow Logs Log Group
print_info "Importing VPC flow logs group..."
tofu import "module.vpc.aws_cloudwatch_log_group.flow_logs" "/aws/vpc/flowlogs/dev" 2>/dev/null || print_warning "Log group /aws/vpc/flowlogs/dev may not exist"

print_success "Import complete!"
print_info "Some resources may have been skipped if they don't exist"
print_info "Run: cd infra/opentofu && tofu plan"

cd "$PROJECT_ROOT" >/dev/null

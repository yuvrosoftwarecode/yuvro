#!/bin/bash
# Provision Infrastructure using OpenTofu
# Creates RDS databases, S3 buckets, VPCs, security groups, etc.
# Usage: bash infra/scripts/provision-infra.sh [environment] [action]
#   environment  dev | staging | prod (default: dev)
#   action       plan | apply | destroy (default: plan)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"

# ── colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

print_header()  { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${NC}"; echo -e "${BOLD}${BLUE}  $1${NC}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}"; }
print_success() { echo -e "${GREEN}  ✓ $1${NC}"; }
print_error()   { echo -e "${RED}  ✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
print_info()    { echo -e "${CYAN}  ℹ $1${NC}"; }
print_step()    { echo -e "${BOLD}  › $1${NC}"; }

# ── parameters ──────────────────────────────────────────────────────────────
ENVIRONMENT="${1:-dev}"
ACTION="${2:-plan}"

case "$ACTION" in
    plan|apply|destroy) ;;
    *) print_error "Invalid action: $ACTION (use: plan, apply, destroy)"; exit 1 ;;
esac

case "$ENVIRONMENT" in
    dev|staging|prod) ;;
    *) print_error "Invalid environment: $ENVIRONMENT (use: dev, staging, prod)"; exit 1 ;;
esac

# ── prerequisites ───────────────────────────────────────────────────────────
print_header "Provisioning Infrastructure [$ENVIRONMENT - $ACTION]"

if ! command -v tofu &>/dev/null; then
    print_error "OpenTofu not installed. Install from: https://opentofu.org"
    exit 1
fi
print_success "OpenTofu found: $(tofu version | head -1)"

if ! command -v aws &>/dev/null; then
    print_error "AWS CLI not installed"
    exit 1
fi
print_success "AWS CLI found"

# Verify AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
    print_error "AWS credentials not configured"
    exit 1
fi
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
print_success "AWS Account: $ACCOUNT"

# ── opentofu initialization ─────────────────────────────────────────────────
print_step "Initializing OpenTofu..."
cd "$OPENTOFU_DIR"

if [ ! -d ".terraform" ]; then
    tofu init
    print_success "OpenTofu initialized"
else
    print_info "OpenTofu already initialized"
fi

# ── select tfvars ───────────────────────────────────────────────────────────
TFVARS="${ENVIRONMENT}.tfvars"
if [ ! -f "$TFVARS" ]; then
    print_error "Missing: $TFVARS"
    exit 1
fi
print_success "Using: $TFVARS"

# ── workspace selection ─────────────────────────────────────────────────────
WORKSPACE="$ENVIRONMENT"
CURRENT_WORKSPACE=$(tofu workspace show)

if [ "$CURRENT_WORKSPACE" != "$WORKSPACE" ]; then
    print_step "Switching to workspace: $WORKSPACE"
    tofu workspace select "$WORKSPACE" 2>/dev/null || tofu workspace new "$WORKSPACE"
fi
print_success "Workspace: $WORKSPACE"

# ── validate configuration ──────────────────────────────────────────────────
print_step "Validating configuration..."
tofu validate
print_success "Configuration valid"

# ── terraform fmt (optional) ────────────────────────────────────────────────
# tofu fmt -check . || { print_warning "Run: tofu fmt to format code"; }

# ── plan ────────────────────────────────────────────────────────────────────
print_step "Planning infrastructure changes..."
TFPLAN="tfplan-${ENVIRONMENT}"

tofu plan \
    -var-file="$TFVARS" \
    -out="$TFPLAN" \
    -compact-warnings

PLAN_EXIT=$?
if [ $PLAN_EXIT -ne 0 ]; then
    print_error "Plan failed"
    exit 1
fi

print_success "Plan saved: $TFPLAN"

# ── apply or destroy ────────────────────────────────────────────────────────
case "$ACTION" in
    plan)
        print_info "Plan complete. Review changes above."
        print_info "To apply: bash $SCRIPT_DIR/provision-infra.sh $ENVIRONMENT apply"
        exit 0
        ;;
    apply)
        print_step "Applying infrastructure changes..."
        read -p "Apply infrastructure changes? (yes/no) " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_warning "Cancelled"
            exit 0
        fi
        tofu apply "$TFPLAN"
        rm -f "$TFPLAN"
        print_success "Infrastructure provisioned"
        
        # Show outputs
        print_step "Infrastructure Outputs:"
        tofu output -json | jq '.' || tofu output
        ;;
    destroy)
        print_warning "Destroy will delete ALL infrastructure in $ENVIRONMENT"
        read -p "Type 'yes' to confirm destruction: " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            print_warning "Cancelled"
            exit 0
        fi
        print_error "Destroying infrastructure..."
        tofu destroy -var-file="$TFVARS" -auto-approve
        print_success "Infrastructure destroyed"
        ;;
esac

cd "$PROJECT_ROOT" >/dev/null

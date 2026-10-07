#!/bin/bash
# Unified OpenTofu Deployment Script
# Deploys Yuvro infrastructure to AWS for dev or prod environment
#
# Usage: ./deploy-all.sh <dev|prod> [--plan-only] [--skip-db-migration]
#
# Examples:
#   ./deploy-all.sh dev                    # Plan and apply dev infrastructure
#   ./deploy-all.sh prod --plan-only       # Plan prod infrastructure only
#   ./deploy-all.sh prod --skip-db-migration # Deploy prod without data migration

set -euo pipefail

# ========== CONFIGURATION ==========
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
ENVIRONMENT="${1:-}"
PLAN_ONLY="${2:-}"
SKIP_DB_MIGRATION="${3:-}"

# ========== COLOR OUTPUT ==========
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========== FUNCTIONS ==========

print_header() {
    echo -e "${BLUE}========== $1 ==========${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

show_usage() {
    cat <<EOF
Unified Yuvro OpenTofu Deployment Script

USAGE:
    deploy-all.sh <environment> [OPTIONS]

ENVIRONMENTS:
    dev                 Deploy development environment (EC2 + Docker Compose)
    prod                Deploy production environment (EKS + Kubernetes)

OPTIONS:
    --plan-only         Show Terraform plan without applying
    --skip-db-migration Skip database migration (prod only)
    -h, --help         Show this help message

EXAMPLES:
    # Deploy dev infrastructure
    ./deploy-all.sh dev

    # Show prod plan without applying
    ./deploy-all.sh prod --plan-only

    # Deploy prod with Kubernetes
    ./deploy-all.sh prod

EOF
}

# Validate environment parameter
if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    show_usage
    exit 1
fi

# Check if OpenTofu is installed
if ! command -v tofu &> /dev/null; then
    print_error "tofu (OpenTofu) is not installed or not in PATH"
    exit 1
fi

# ========== MAIN DEPLOYMENT LOGIC ==========

print_header "Yuvro OpenTofu Deployment - $ENVIRONMENT"

# Change to environment-specific directory
ENV_DIR="$OPENTOFU_DIR/$ENVIRONMENT"
if [[ ! -d "$ENV_DIR" ]]; then
    print_error "Environment directory not found: $ENV_DIR"
    exit 1
fi

cd "$ENV_DIR"
print_info "Working directory: $(pwd)"

# Initialize Terraform/OpenTofu
print_header "Initializing OpenTofu"
tofu init

# Show environment details
print_header "Environment Configuration"
print_info "Environment: $ENVIRONMENT"
print_info "OpenTofu directory: $ENV_DIR"

if [[ "$ENVIRONMENT" == "dev" ]]; then
    print_info "Deployment type: EC2 + Docker Compose"
    print_info "Instance type: t3.medium"
    print_info "Database: db.t3.small RDS"
elif [[ "$ENVIRONMENT" == "prod" ]]; then
    print_info "Deployment type: EKS + Kubernetes"
    print_info "Node type: t3.large (3 nodes)"
    print_info "Database: db.t3.medium RDS (Multi-AZ)"
fi

# Run Terraform plan
print_header "Planning Infrastructure"
tofu plan -out=tfplan

# Confirm before applying
if [[ ! "$PLAN_ONLY" =~ ^(--plan-only)$ ]]; then
    print_warning "Review the plan above carefully!"
    read -p "Do you want to apply this plan? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        print_warning "Deployment cancelled"
        rm -f tfplan
        exit 0
    fi
    
    # Apply Terraform plan
    print_header "Applying Infrastructure Changes"
    tofu apply tfplan
    rm -f tfplan
    
    # Get outputs
    print_header "Deployment Outputs"
    print_success "Infrastructure deployed successfully!"
    
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        # Dev deployment outputs
        DB_HOST=$(tofu output -raw db_host)
        APP_IPS=$(tofu output -json app_node_public_ips)
        
        print_info "Database host: $DB_HOST"
        print_info "Application nodes: $APP_IPS"
        print_info "SSH command: ssh -i <key-path> ec2-user@<public-ip>"
        
        echo ""
        echo -e "${GREEN}Next steps:${NC}"
        echo "1. SSH into your EC2 instance"
        echo "2. Clone the Yuvro repository"
        echo "3. Set up Docker Compose with environment variables"
        echo "4. Run: docker-compose -f docker-compose.dev.yml up -d"
        
    elif [[ "$ENVIRONMENT" == "prod" ]]; then
        # Prod deployment outputs
        CLUSTER_NAME=$(tofu output -raw eks_cluster_name)
        KUBECONFIG_CMD=$(tofu output -raw k8s_kubeconfig_command)
        
        print_info "EKS cluster: $CLUSTER_NAME"
        print_info "Kubernetes namespace: yuvro-production"
        print_info "Helm release: yuvro"
        
        echo ""
        echo -e "${GREEN}Next steps:${NC}"
        echo "1. Configure kubectl:"
        echo "   $KUBECONFIG_CMD"
        echo "2. Verify cluster:"
        echo "   kubectl cluster-info"
        echo "3. Check deployments:"
        echo "   kubectl -n yuvro-production get deployments"
        echo "4. View logs:"
        echo "   kubectl -n yuvro-production logs -f deployment/ycode-backend"
        
        # Database migration (if not skipped)
        if [[ ! "$SKIP_DB_MIGRATION" =~ ^(--skip-db-migration)$ ]]; then
            print_header "Database Setup"
            print_info "Skipping database migration (use --skip-db-migration to skip)"
        fi
    fi
    
    # Save outputs to file
    tofu output > outputs.json
    print_success "Outputs saved to $ENV_DIR/outputs.json"
    
else
    print_info "Plan-only mode: Terraform has been planned but not applied"
    rm -f tfplan
fi

print_header "Deployment Complete"
print_success "OpenTofu deployment finished for environment: $ENVIRONMENT"

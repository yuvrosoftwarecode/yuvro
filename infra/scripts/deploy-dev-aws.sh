#!/bin/bash

# YCode Dev Environment AWS Deployment Script
# This script automates the deployment of YCode to AWS using OpenTofu
# Usage: bash infra/scripts/deploy-dev-aws.sh [init|plan|apply|destroy|status]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
TFVARS_FILE="$OPENTOFU_DIR/dev.tfvars"
TFPLAN_FILE="$OPENTOFU_DIR/tfplan"
KUBECONFIG_DIR="$HOME/.kube"
SSH_KEY_PATH="$HOME/.ssh/ycode-dev.pem"
KEY_PAIR_NAME="ycode-dev"
AWS_REGION="us-east-1"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
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

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=0
    
    # Check OpenTofu
    if ! command -v tofu &> /dev/null; then
        print_error "OpenTofu is not installed"
        echo "  Install from: https://opentofu.org/docs/intro/install/"
        missing_tools=1
    else
        print_success "OpenTofu $(tofu version | head -1)"
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        echo "  Install from: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        missing_tools=1
    else
        print_success "AWS CLI $(aws --version | cut -d' ' -f1)"
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        echo "  Install from: https://kubernetes.io/docs/tasks/tools/"
        missing_tools=1
    else
        print_success "kubectl $(kubectl version --client --short 2>/dev/null | cut -d' ' -f3)"
    fi
    
    # Check Helm
    if ! command -v helm &> /dev/null; then
        print_error "Helm is not installed"
        echo "  Install from: https://helm.sh/docs/intro/install/"
        missing_tools=1
    else
        print_success "Helm $(helm version --short | cut -d':' -f2)"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured"
        echo "  Run: aws configure"
        missing_tools=1
    else
        local account_id=$(aws sts get-caller-identity --query Account --output text)
        print_success "AWS Account: $account_id"
    fi
    
    if [ $missing_tools -eq 1 ]; then
        print_error "Please install missing tools and try again"
        exit 1
    fi
    
    echo ""
}

check_aws_setup() {
    print_header "Checking AWS Setup"
    
    # Check if key pair exists
    if aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" &> /dev/null; then
        print_success "EC2 Key Pair '$KEY_PAIR_NAME' exists"
    else
        print_warning "EC2 Key Pair '$KEY_PAIR_NAME' does not exist"
        read -p "Create it now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            create_key_pair
        else
            print_error "Key pair is required for deployment"
            exit 1
        fi
    fi
    
    # Check if SSH key file exists
    if [ -f "$SSH_KEY_PATH" ]; then
        print_success "SSH key file exists: $SSH_KEY_PATH"
    else
        print_warning "SSH key file not found: $SSH_KEY_PATH"
        if aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" &> /dev/null; then
            print_info "Key pair exists in AWS but local file is missing"
            print_error "Please download the key pair from AWS Console or recreate it"
            exit 1
        fi
    fi
    
    echo ""
}

create_key_pair() {
    print_info "Creating EC2 Key Pair: $KEY_PAIR_NAME"
    
    mkdir -p "$(dirname "$SSH_KEY_PATH")"
    aws ec2 create-key-pair --key-name "$KEY_PAIR_NAME" --query 'KeyMaterial' --output text > "$SSH_KEY_PATH"
    chmod 400 "$SSH_KEY_PATH"
    
    print_success "Key pair created and saved to: $SSH_KEY_PATH"
}

init_opentofu() {
    print_header "Initializing OpenTofu"
    
    cd "$OPENTOFU_DIR"
    
    if [ -d ".terraform" ]; then
        print_warning "OpenTofu already initialized"
    else
        tofu init
        print_success "OpenTofu initialized"
    fi
    
    cd "$PROJECT_ROOT"
    echo ""
}

plan_deployment() {
    print_header "Planning Deployment"
    
    cd "$OPENTOFU_DIR"
    
    if [ ! -f "$TFVARS_FILE" ]; then
        print_error "Variables file not found: $TFVARS_FILE"
        exit 1
    fi
    
    print_info "Using variables file: $TFVARS_FILE"
    tofu plan -var-file="$TFVARS_FILE" -out="$TFPLAN_FILE"
    
    print_success "Deployment plan created: $TFPLAN_FILE"
    
    cd "$PROJECT_ROOT"
    echo ""
}

apply_deployment() {
    print_header "Applying Deployment"
    
    cd "$OPENTOFU_DIR"
    
    if [ ! -f "$TFPLAN_FILE" ]; then
        print_error "Plan file not found: $TFPLAN_FILE"
        print_info "Run 'bash infra/scripts/deploy-dev-aws.sh plan' first"
        exit 1
    fi
    
    print_warning "This will create AWS resources and incur costs"
    read -p "Continue with deployment? (yes/no) " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
    
    tofu apply "$TFPLAN_FILE"
    
    print_success "Deployment completed"
    
    # Save outputs
    print_info "Saving deployment outputs..."
    tofu output > "$OPENTOFU_DIR/outputs.txt"
    
    cd "$PROJECT_ROOT"
    echo ""
}

destroy_deployment() {
    print_header "Destroying Deployment"
    
    cd "$OPENTOFU_DIR"
    
    print_warning "This will destroy all AWS resources"
    read -p "Continue with destruction? (yes/no) " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Destruction cancelled"
        exit 0
    fi
    
    tofu plan -destroy -var-file="$TFVARS_FILE" -out="$TFPLAN_FILE"
    tofu apply "$TFPLAN_FILE"
    
    print_success "Destruction completed"
    
    cd "$PROJECT_ROOT"
    echo ""
}

show_status() {
    print_header "Deployment Status"
    
    cd "$OPENTOFU_DIR"
    
    if [ ! -f "terraform.tfstate" ]; then
        print_warning "No deployment state found"
        exit 0
    fi
    
    print_info "OpenTofu State:"
    tofu show -no-color | head -50
    
    echo ""
    print_info "AWS Resources:"
    
    # EC2 Instances
    echo ""
    print_info "EC2 Instances:"
    aws ec2 describe-instances \
        --filters "Name=tag:Environment,Values=dev" "Name=instance-state-name,Values=running" \
        --query 'Reservations[].Instances[].[InstanceId,InstanceType,PublicIpAddress,PrivateIpAddress]' \
        --output table
    
    # RDS Instances
    echo ""
    print_info "RDS Databases:"
    aws rds describe-db-instances \
        --query 'DBInstances[?TagList[?Key==`Environment` && Value==`dev`]].[DBInstanceIdentifier,DBInstanceClass,Engine,DBInstanceStatus]' \
        --output table
    
    # S3 Buckets
    echo ""
    print_info "S3 Buckets:"
    aws s3 ls | grep dev || print_warning "No dev S3 buckets found"
    
    cd "$PROJECT_ROOT"
    echo ""
}

show_outputs() {
    print_header "Deployment Outputs"
    
    cd "$OPENTOFU_DIR"
    
    if [ ! -f "terraform.tfstate" ]; then
        print_error "No deployment state found"
        exit 1
    fi
    
    print_info "Infrastructure Outputs:"
    tofu output
    
    cd "$PROJECT_ROOT"
    echo ""
}

setup_kubeconfig() {
    print_header "Setting up kubeconfig"
    
    cd "$OPENTOFU_DIR"
    
    # Get instance IPs
    local instance_ips=$(tofu output -json kubernetes_node_public_ips 2>/dev/null | jq -r '.[]' 2>/dev/null)
    
    if [ -z "$instance_ips" ]; then
        print_error "Could not retrieve instance IPs"
        print_info "Make sure deployment is complete: bash infra/scripts/deploy-dev-aws.sh apply"
        exit 1
    fi
    
    local first_ip=$(echo "$instance_ips" | head -1)
    
    print_info "Connecting to instance: $first_ip"
    print_info "Retrieving kubeconfig..."
    
    mkdir -p "$KUBECONFIG_DIR"
    
    # SSH and get kubeconfig
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        "ubuntu@$first_ip" "sudo cat /etc/kubernetes/admin.conf" > "$KUBECONFIG_DIR/config" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        chmod 600 "$KUBECONFIG_DIR/config"
        print_success "kubeconfig saved to: $KUBECONFIG_DIR/config"
        
        # Verify connection
        if kubectl cluster-info &> /dev/null; then
            print_success "Successfully connected to Kubernetes cluster"
            kubectl get nodes
        else
            print_warning "kubeconfig saved but cluster connection failed"
            print_info "Try again in a few moments when the cluster is fully initialized"
        fi
    else
        print_error "Failed to retrieve kubeconfig"
        print_info "Try manually:"
        echo "  ssh -i $SSH_KEY_PATH ubuntu@$first_ip"
        echo "  sudo cat /etc/kubernetes/admin.conf"
    fi
    
    cd "$PROJECT_ROOT"
    echo ""
}

deploy_applications() {
    print_header "Deploying Applications"
    
    # Verify kubeconfig
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Kubernetes cluster not accessible"
        print_info "Run: bash infra/scripts/deploy-dev-aws.sh kubeconfig"
        exit 1
    fi
    
    print_info "Deploying YCode and YCampus to Kubernetes..."
    
    cd "$PROJECT_ROOT"
    DEPLOY_ENV=dev DEPLOY_TYPE=k8s make install
    
    print_success "Applications deployed"
    echo ""
}

docker_start() {
    print_header "Starting Docker Compose Applications"
    
    cd "$OPENTOFU_DIR"
    
    # Get RDS endpoints
    local ycode_endpoint=$(tofu output -raw ycode_db_endpoint 2>/dev/null)
    local ycampus_endpoint=$(tofu output -raw ycampus_db_endpoint 2>/dev/null)
    
    if [ -z "$ycode_endpoint" ] || [ -z "$ycampus_endpoint" ]; then
        print_error "Could not retrieve RDS endpoints"
        print_info "Make sure RDS deployment is complete: bash infra/scripts/deploy-dev-aws.sh apply"
        exit 1
    fi
    
    print_info "RDS Endpoints:"
    echo "  YCode: $ycode_endpoint"
    echo "  YCampus: $ycampus_endpoint"
    echo ""
    print_warning "Make sure .env files are configured with RDS endpoints before starting"
    echo "  - yc-backend-api/.env.dev"
    echo "  - ycampus-backend-api/.env.dev"
    echo ""
    
    read -p "Continue with Docker Compose startup? (yes/no) " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Startup cancelled"
        exit 0
    fi
    
    cd "$PROJECT_ROOT"
    print_info "Starting applications with Docker Compose..."
    DEPLOY_ENV=dev make install
    
    print_success "Applications started"
    echo ""
    print_info "Access applications at:"
    echo "  YCode Frontend: http://localhost:3000"
    echo "  YCode Backend: http://localhost:8001"
    echo "  YCampus Frontend: http://localhost:3002"
    echo "  YCampus Backend: http://localhost:8003"
    echo ""
}

docker_stop() {
    print_header "Stopping Docker Compose Applications"
    
    cd "$PROJECT_ROOT"
    DEPLOY_ENV=dev make stop
    
    print_success "Applications stopped"
    echo ""
}

docker_logs() {
    print_header "Docker Compose Logs"
    
    cd "$PROJECT_ROOT"
    DEPLOY_ENV=dev make logs
}

show_help() {
    cat << EOF
YCode Dev Environment AWS Deployment Script

Usage: bash infra/scripts/deploy-dev-aws.sh [COMMAND]

Commands:
  init              Initialize OpenTofu (download providers)
  plan              Plan the deployment (shows what will be created)
  apply             Apply the deployment (creates AWS RDS resources)
  destroy           Destroy the deployment (deletes AWS resources)
  status            Show deployment status
  outputs           Show deployment outputs
  docker-start      Start applications with Docker Compose (requires RDS deployed)
  docker-stop       Stop Docker Compose applications
  docker-logs       View Docker Compose logs
  full              Run all steps (init -> plan -> apply -> docker-start)
  help              Show this help message

Examples:
  # Full deployment with Docker Compose
  bash infra/scripts/deploy-dev-aws.sh full

  # Step by step
  bash infra/scripts/deploy-dev-aws.sh init
  bash infra/scripts/deploy-dev-aws.sh plan
  bash infra/scripts/deploy-dev-aws.sh apply
  bash infra/scripts/deploy-dev-aws.sh outputs
  bash infra/scripts/deploy-dev-aws.sh docker-start

  # Check status
  bash infra/scripts/deploy-dev-aws.sh status
  bash infra/scripts/deploy-dev-aws.sh outputs

  # Manage Docker Compose
  bash infra/scripts/deploy-dev-aws.sh docker-logs
  bash infra/scripts/deploy-dev-aws.sh docker-stop

  # Cleanup
  bash infra/scripts/deploy-dev-aws.sh destroy

EOF
}

# Main script
main() {
    local command="${1:-help}"
    
    case "$command" in
        init)
            check_prerequisites
            check_aws_setup
            init_opentofu
            ;;
        plan)
            check_prerequisites
            check_aws_setup
            plan_deployment
            ;;
        apply)
            check_prerequisites
            check_aws_setup
            apply_deployment
            ;;
        destroy)
            check_prerequisites
            destroy_deployment
            ;;
        status)
            check_prerequisites
            show_status
            ;;
        outputs)
            check_prerequisites
            show_outputs
            ;;
        kubeconfig)
            check_prerequisites
            setup_kubeconfig
            ;;
        deploy-apps)
            deploy_applications
            ;;
        full)
            check_prerequisites
            check_aws_setup
            init_opentofu
            plan_deployment
            apply_deployment
            print_info "Waiting for RDS to initialize (this may take a few minutes)..."
            sleep 30
            docker_start
            show_outputs
            ;;
        docker-start)
            docker_start
            ;;
        docker-stop)
            docker_stop
            ;;
        docker-logs)
            docker_logs
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"

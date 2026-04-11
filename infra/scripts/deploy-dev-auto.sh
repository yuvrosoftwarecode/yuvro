#!/bin/bash

# YCode Dev Environment - Fully Automated Deployment
# This script deploys infrastructure and applications to AWS EC2 with no manual steps
# Usage: bash infra/scripts/deploy-dev-auto.sh

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
AWS_REGION="ap-south-1"
SSH_KEY_PATH="$HOME/.ssh/ycode-dev.pem"
KEY_PAIR_NAME="ycode-dev"
MAX_RETRIES=60
RETRY_DELAY=10

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
    
    # Check SSH
    if ! command -v ssh &> /dev/null; then
        print_error "SSH is not installed"
        missing_tools=1
    else
        print_success "SSH installed"
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
    if aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" --region "$AWS_REGION" &> /dev/null; then
        print_success "EC2 Key Pair '$KEY_PAIR_NAME' exists"
    else
        print_warning "EC2 Key Pair '$KEY_PAIR_NAME' does not exist"
        print_info "Creating EC2 Key Pair..."
        mkdir -p "$(dirname "$SSH_KEY_PATH")"
        aws ec2 create-key-pair --key-name "$KEY_PAIR_NAME" --region "$AWS_REGION" --query 'KeyMaterial' --output text > "$SSH_KEY_PATH"
        chmod 400 "$SSH_KEY_PATH"
        print_success "Key pair created and saved to: $SSH_KEY_PATH"
    fi
    
    # Check if SSH key file exists
    if [ -f "$SSH_KEY_PATH" ]; then
        print_success "SSH key file exists: $SSH_KEY_PATH"
    else
        print_error "SSH key file not found: $SSH_KEY_PATH"
        exit 1
    fi
    
    echo ""
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
    
    print_success "Deployment plan created"
    
    cd "$PROJECT_ROOT"
    echo ""
}

apply_deployment() {
    print_header "Applying Deployment"
    
    cd "$OPENTOFU_DIR"
    
    if [ ! -f "$TFPLAN_FILE" ]; then
        print_error "Plan file not found: $TFPLAN_FILE"
        exit 1
    fi
    
    print_info "Creating AWS resources..."
    tofu apply "$TFPLAN_FILE"
    
    print_success "Infrastructure deployed"
    
    cd "$PROJECT_ROOT"
    echo ""
}

get_instance_ip() {
    print_header "Getting EC2 Instance IP"
    
    print_info "Retrieving EC2 instance IP..." >&2
    
    local instance_ip=""
    local retries=0
    
    while [ -z "$instance_ip" ] && [ $retries -lt $MAX_RETRIES ]; do
        instance_ip=$(aws ec2 describe-instances \
            --region "$AWS_REGION" \
            --filters "Name=tag:Environment,Values=dev" "Name=instance-state-name,Values=running" \
            --query 'Reservations[0].Instances[0].PublicIpAddress' \
            --output text 2>/dev/null)
        
        if [ "$instance_ip" = "None" ] || [ -z "$instance_ip" ]; then
            instance_ip=""
        fi
        
        if [ -z "$instance_ip" ]; then
            retries=$((retries + 1))
            if [ $retries -lt $MAX_RETRIES ]; then
                print_info "Waiting for EC2 instance to be ready... ($retries/$MAX_RETRIES)" >&2
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    if [ -z "$instance_ip" ]; then
        print_error "Could not retrieve EC2 instance IP after $MAX_RETRIES attempts" >&2
        exit 1
    fi
    
    print_success "EC2 Instance IP: $instance_ip" >&2
    echo "$instance_ip"
}

wait_for_ssh() {
    local instance_ip=$1
    
    print_header "Waiting for SSH Access"
    
    print_info "Waiting for EC2 instance to be SSH-ready..."
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 "ubuntu@$instance_ip" "echo 'SSH ready'" &> /dev/null; then
            print_success "SSH access available"
            echo ""
            return 0
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            print_info "SSH not ready yet... ($retries/$MAX_RETRIES)"
            sleep $RETRY_DELAY
        fi
    done
    
    print_error "SSH access not available after $MAX_RETRIES attempts"
    exit 1
}

wait_for_docker() {
    local instance_ip=$1

    print_header "Waiting for Docker"

    print_info "Waiting for user_data (Docker install) to complete on EC2..."

    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 "ubuntu@$instance_ip" "docker info &>/dev/null && echo ok" 2>/dev/null | grep -q ok; then
            print_success "Docker is ready"
            echo ""
            return 0
        fi

        retries=$((retries + 1))
        print_info "Docker not ready yet... ($retries/$MAX_RETRIES)"
        sleep $RETRY_DELAY
    done

    print_error "Docker not available after $MAX_RETRIES attempts"
    exit 1
}

deploy_applications() {
    local instance_ip=$1
    local repo_url=$2

    print_header "Deploying Applications"

    print_info "Copying GitHub deploy key to EC2..."
    scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
        "$HOME/.ssh/ycode-ec2-github" \
        "ubuntu@$instance_ip:/home/ubuntu/.ssh/github_deploy_key"

    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "ubuntu@$instance_ip" bash << DEPLOY_EOF
set -e

# Configure SSH for GitHub
chmod 600 /home/ubuntu/.ssh/github_deploy_key
cat > /home/ubuntu/.ssh/config << 'SSHCONF'
Host github.com
  HostName github.com
  User git
  IdentityFile /home/ubuntu/.ssh/github_deploy_key
  StrictHostKeyChecking no
SSHCONF
chmod 600 /home/ubuntu/.ssh/config

echo "📦 Cloning repository..."
cd /home/ubuntu
if [ -d "yuvro-code" ]; then
    cd yuvro-code && git pull
else
    git clone -b k8s-setup-iac "$repo_url" yuvro-code
    cd yuvro-code
fi

echo "📦 Configuring environment..."
[ ! -f "ycode-backend-api/.env" ] && cp ycode-backend-api/.env.example ycode-backend-api/.env
[ ! -f "ycampus-backend-api/.env" ] && cp ycampus-backend-api/.env.example ycampus-backend-api/.env
[ ! -f "ycode-web/.env" ] && cp ycode-web/.env.example ycode-web/.env
[ ! -f "ycampus-web/.env" ] && cp ycampus-web/.env.example ycampus-web/.env
[ ! -f "yuvro-code-executer/.env" ] && cp yuvro-code-executer/.env.example yuvro-code-executer/.env

echo "📦 Building services (this takes a few minutes on t3.medium)..."
docker compose \
  -f docker-compose.common.yml \
  -f docker-compose.yml \
  -f docker-compose.ycampus.yml \
  -f docker-compose.dev.yml \
  build 2>&1 | tail -20

echo "📦 Starting services..."
docker compose \
  -f docker-compose.common.yml \
  -f docker-compose.yml \
  -f docker-compose.ycampus.yml \
  -f docker-compose.dev.yml \
  up -d

echo "✅ Applications deployed!"
docker compose \
  -f docker-compose.common.yml \
  -f docker-compose.yml \
  -f docker-compose.ycampus.yml \
  -f docker-compose.dev.yml \
  ps
DEPLOY_EOF

    print_success "Applications deployed"
    echo ""
}

show_summary() {
    local instance_ip=$1
    
    print_header "Deployment Complete"
    
    echo ""
    print_success "Infrastructure and applications deployed successfully!"
    echo ""
    
    print_info "Access Information:"
    echo "  EC2 Instance IP: $instance_ip"
    echo "  SSH Command: ssh -i $SSH_KEY_PATH ubuntu@$instance_ip"
    echo ""
    
    print_info "Application URLs (direct access via EC2 IP):"
    echo "  YCode Frontend:    http://$instance_ip:3000"
    echo "  YCode Backend:     http://$instance_ip:8000"
    echo "  YCampus Frontend:  http://$instance_ip:3001"
    echo "  YCampus Backend:   http://$instance_ip:8001"
    echo "  Code Executor:     http://$instance_ip:8002"
    echo ""
    
    print_info "Setup port forwarding:"
    echo "  ssh -i $SSH_KEY_PATH -L 3000:localhost:3000 -L 8001:localhost:8001 -L 3002:localhost:3002 -L 8003:localhost:8003 ubuntu@$instance_ip"
    echo ""
    
    print_info "View logs:"
    echo "  ssh -i $SSH_KEY_PATH ubuntu@$instance_ip"
    echo "  cd yuvro-code"
    echo "  DEPLOY_ENV=dev docker-compose logs -f"
    echo ""
    
    print_info "Stop applications:"
    echo "  ssh -i $SSH_KEY_PATH ubuntu@$instance_ip"
    echo "  cd yuvro-code"
    echo "  DEPLOY_ENV=dev docker-compose down"
    echo ""
}

cleanup_on_error() {
    print_error "Deployment failed!"
    print_warning "To cleanup, run:"
    echo "  cd $OPENTOFU_DIR"
    echo "  tofu plan -destroy -var-file=dev.tfvars -out=tfplan_destroy"
    echo "  tofu apply tfplan_destroy"
}

# Main script
main() {
    print_header "YCode Dev Environment - Fully Automated Deployment"

    # Detect git remote URL from local repo
    REPO_URL=$(git -C "$PROJECT_ROOT" remote get-url origin 2>/dev/null || echo "")
    if [ -z "$REPO_URL" ]; then
        print_error "Could not detect git remote URL. Make sure you're in a git repo with an 'origin' remote."
        exit 1
    fi
    print_success "Repo URL: $REPO_URL"

    check_prerequisites
    check_aws_setup
    init_opentofu
    plan_deployment
    
    print_warning "This will create AWS resources and incur costs"
    read -p "Continue with deployment? (yes/no) " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
    
    apply_deployment
    
    local instance_ip
    instance_ip=$(get_instance_ip)
    wait_for_ssh "$instance_ip"
    wait_for_docker "$instance_ip"
    deploy_applications "$instance_ip" "$REPO_URL"
    show_summary "$instance_ip"
}

# Error handling
trap cleanup_on_error EXIT

main "$@"

# Remove error trap on success
trap - EXIT
print_success "Deployment completed successfully!"

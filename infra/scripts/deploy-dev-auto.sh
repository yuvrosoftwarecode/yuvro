#!/bin/bash

# YCode Dev Environment - Fully Automated Deployment
# This script deploys infrastructure and applications to AWS EC2 with no manual steps
# Usage: bash infra/scripts/deploy-dev-auto.sh [branch]
#   branch  Git branch to deploy (default: main)
#
# Examples:
#   bash infra/scripts/deploy-dev-auto.sh              # deploys main
#   bash infra/scripts/deploy-dev-auto.sh my-feature   # deploys my-feature branch

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
DEPLOY_BRANCH="${1:-main}"

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

    # ── Copy secrets files to EC2 ──────────────────────────────────────────
    print_info "Copying .env.dev-secrets files to EC2..."
    SECRETS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

    for secrets_file in \
        "ycode-backend-api/.env.dev-secrets" \
        "ycampus-backend-api/.env.dev-secrets" \
        "ycode-web/.env.dev-secrets" \
        "ycampus-web/.env.dev-secrets" \
        "yuvro-code-executer/.env.dev-secrets"
    do
        local_path="$SECRETS_DIR/$secrets_file"
        remote_dir="/home/ubuntu/yuvro/$(dirname "$secrets_file")"
        if [ -f "$local_path" ]; then
            ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "ubuntu@$instance_ip" "mkdir -p $remote_dir"
            scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
                "$local_path" \
                "ubuntu@$instance_ip:$remote_dir/$(basename "$secrets_file")"
            print_success "Copied $secrets_file"
        else
            print_warning "Secrets file not found locally: $local_path — skipping"
        fi
    done

    # Read VITE_GOOGLE_CLIENT_ID from local secrets for build args
    VITE_GOOGLE_CLIENT_ID_VAL=""
    if [ -f "$SECRETS_DIR/ycode-web/.env.dev-secrets" ]; then
        VITE_GOOGLE_CLIENT_ID_VAL=$(grep '^VITE_GOOGLE_CLIENT_ID=' "$SECRETS_DIR/ycode-web/.env.dev-secrets" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    fi

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

# Stop any running containers first to free ports (must happen before build)
echo "📦 Stopping any existing containers to free ports..."
if [ -d "/home/ubuntu/yuvro" ]; then
  cd /home/ubuntu/yuvro
  docker compose \
    -f docker-compose.yuvro.yml \
    -f docker-compose.ycode.yml \
    -f docker-compose.ycampus.yml \
    -f docker-compose.dev.yml \
    down --remove-orphans 2>/dev/null || true
  cd /home/ubuntu
fi

# Hard-kill any container still holding the ports we need
echo "🔪 Force-freeing ports 3000, 3002, 8001, 8009, 8003..."
set +e
for port in 3000 3002 8001 8009 8003; do
  cid=\$(docker ps -q --filter "publish=\$port" 2>/dev/null)
  [ -n "\$cid" ] && docker kill \$cid 2>/dev/null && docker rm -f \$cid 2>/dev/null
  pid=\$(sudo lsof -ti tcp:\$port 2>/dev/null)
  [ -n "\$pid" ] && sudo kill -9 \$pid 2>/dev/null
done
running=\$(docker ps -q 2>/dev/null)
[ -n "\$running" ] && docker stop \$running 2>/dev/null
all=\$(docker ps -aq 2>/dev/null)
[ -n "\$all" ] && docker rm \$all 2>/dev/null
set -e
sleep 3
echo "✅ Ports cleared"

echo "📦 Cloning/updating repository..."
cd /home/ubuntu
if [ -d "yuvro" ]; then
    cd yuvro
    git fetch origin
    git checkout -- .
    git checkout "$DEPLOY_BRANCH"
    git pull origin "$DEPLOY_BRANCH"
else
    git clone -b "$DEPLOY_BRANCH" "$repo_url" yuvro
    cd yuvro
fi

echo "📦 Restoring secrets files (copied before this step)..."
# Secrets were already scp'd to the correct paths before this SSH session.
# Verify they exist; warn if missing.
for sf in \
    ycode-backend-api/.env.dev-secrets \
    ycampus-backend-api/.env.dev-secrets \
    ycode-web/.env.dev-secrets \
    ycampus-web/.env.dev-secrets \
    yuvro-code-executer/.env.dev-secrets
do
  if [ -f "\$sf" ]; then
    echo "  ✓ \$sf"
  else
    echo "  ⚠ Missing: \$sf — service may fail to start without secrets"
  fi
done

# Export Vite build args (URLs baked into the frontend bundle at build time)
export YCODE_VITE_BACKEND_API_BASE_URL="https://backend-code-dev.yuvro.ai/api"
export YCODE_VITE_CODE_EXECUTOR_BASE_URL="https://code-executer-dev.yuvro.ai"
export YCAMPUS_VITE_BACKEND_API_BASE_URL="https://backend-campus-dev.yuvro.ai/api"
export YCAMPUS_VITE_CODE_EXECUTOR_BASE_URL="https://code-executer-dev.yuvro.ai"
export VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID_VAL}"

echo "✓ Build args configured"
echo "  YCODE_VITE_BACKEND_API_BASE_URL=\$YCODE_VITE_BACKEND_API_BASE_URL"
echo "  YCAMPUS_VITE_BACKEND_API_BASE_URL=\$YCAMPUS_VITE_BACKEND_API_BASE_URL"
echo "  VITE_GOOGLE_CLIENT_ID=\${VITE_GOOGLE_CLIENT_ID:0:20}..."

echo "📦 Building services (this takes a few minutes on t3.medium)..."
docker compose \
  -f docker-compose.yuvro.yml \
  -f docker-compose.ycode.yml \
  -f docker-compose.ycampus.yml \
  -f docker-compose.dev.yml \
  build 2>&1 | tail -20

echo "📦 Starting services..."
# Final port safety check
for port in 3000 3002 8001 8009 8003; do
  cid=\$(docker ps -q --filter "publish=\$port" 2>/dev/null)
  [ -n "\$cid" ] && docker rm -f \$cid 2>/dev/null || true
done
running=\$(docker ps -q 2>/dev/null)
[ -n "\$running" ] && docker stop \$running 2>/dev/null || true
all=\$(docker ps -aq 2>/dev/null)
[ -n "\$all" ] && docker rm \$all 2>/dev/null || true
sleep 2

docker compose \
  -f docker-compose.yuvro.yml \
  -f docker-compose.ycode.yml \
  -f docker-compose.ycampus.yml \
  -f docker-compose.dev.yml \
  up -d --force-recreate

echo "✅ Applications deployed!"
docker compose \
  -f docker-compose.yuvro.yml \
  -f docker-compose.ycode.yml \
  -f docker-compose.ycampus.yml \
  -f docker-compose.dev.yml \
  ps

echo "⏳ Waiting for backends to be healthy..."
sleep 20

echo "📦 Loading sample data for YCode..."
docker exec yuvro-ycode-backend-1 python manage.py setup_fixtures_data 2>&1 | tail -5 || echo "⚠ YCode sample data already loaded or failed"

echo "📦 Loading sample data for YCampus..."
docker exec yuvro-ycampus-backend-1 python manage.py setup_fixtures_data 2>&1 | tail -5 || echo "⚠ YCampus sample data already loaded or failed"

echo "🔒 Restoring nginx HTTPS config..."
if [ -f "/etc/nginx/yuvro-dev-https.conf" ]; then
  sudo cp /etc/nginx/yuvro-dev-https.conf /etc/nginx/sites-available/yuvro-dev
  sudo nginx -t && sudo systemctl reload nginx \
    && echo "✅ Nginx HTTPS config restored" \
    || echo "⚠ Nginx config test failed — check /etc/nginx/sites-available/yuvro-dev"
else
  echo "⚠ No saved HTTPS config found at /etc/nginx/yuvro-dev-https.conf"
  echo "  Run a full deploy (make clean && DEPLOY_ENV=dev make install) to set up nginx"
fi
DEPLOY_EOF

    print_success "Applications deployed"
    echo ""
}

setup_nginx() {
    local instance_ip=$1

    print_header "Setting up Nginx Reverse Proxy with Let's Encrypt SSL"

    # ── Install nginx and certbot (idempotent) ─────────────────────────────
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "ubuntu@$instance_ip" bash << 'NGINX_INSTALL_EOF'
set -e
if ! command -v nginx &>/dev/null; then
    sudo apt-get update -q
    sudo apt-get install -y nginx certbot python3-certbot-nginx -q
fi
sudo mkdir -p /var/www/certbot
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/yuvro-dev /etc/nginx/sites-enabled/yuvro-dev 2>/dev/null || true
echo "✅ Nginx and certbot ready"
NGINX_INSTALL_EOF

    # ── Always upload the HTTPS config from the repo ───────────────────────
    # This is the single source of truth — infra/nginx/yuvro-dev.conf
    print_info "Uploading nginx HTTPS config..."
    scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
        "$PROJECT_ROOT/infra/nginx/yuvro-dev.conf" \
        "ubuntu@$instance_ip:/tmp/yuvro-nginx-https.conf"

    # ── Deploy HTTP-only config for certbot ACME challenge ─────────────────
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "ubuntu@$instance_ip" 'sudo python3 -c "
domains = [
    \"code-dev.yuvro.ai\",
    \"campus-dev.yuvro.ai\",
    \"backend-code-dev.yuvro.ai\",
    \"backend-campus-dev.yuvro.ai\",
    \"code-executer-dev.yuvro.ai\",
]
conf = \"\"
for d in domains:
    conf += f\"\"\"server {{
    listen 80;
    server_name {d};
    location /.well-known/acme-challenge/ {{ root /var/www/certbot; }}
    location / {{ return 301 https://\$host\$request_uri; }}
}}
\"\"\"
open(\"/etc/nginx/sites-available/yuvro-dev\", \"w\").write(conf)
print(\"HTTP-only config written for ACME challenge\")
"'

    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "ubuntu@$instance_ip" bash << 'NGINX_HTTP_EOF'
set -e
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx || sudo systemctl restart nginx
echo "✅ Nginx HTTP-only config active (for certbot)"
NGINX_HTTP_EOF

    # ── Obtain Let's Encrypt certificates (skip if already exist) ──────────
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "ubuntu@$instance_ip" bash << 'CERTBOT_EOF'
DOMAINS=(
    "code-dev.yuvro.ai"
    "campus-dev.yuvro.ai"
    "backend-code-dev.yuvro.ai"
    "backend-campus-dev.yuvro.ai"
    "code-executer-dev.yuvro.ai"
)
CERT_EMAIL="rohith@yuvro.ai"

for domain in "${DOMAINS[@]}"; do
    if [ -d "/etc/letsencrypt/live/$domain" ]; then
        echo "✅ Cert exists for $domain — skipping"
    else
        echo "🔐 Obtaining cert for $domain ..."
        sudo certbot certonly \
            --webroot \
            --webroot-path /var/www/certbot \
            --non-interactive \
            --agree-tos \
            --email "$CERT_EMAIL" \
            --domain "$domain" 2>&1 \
        && echo "✅ Got cert for $domain" \
        || echo "⚠ certbot failed for $domain — check DNS"
    fi
done
CERTBOT_EOF

    # ── Always activate HTTPS config at the end ────────────────────────────
    # Check if all certs exist; if so use HTTPS config, otherwise keep HTTP
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "ubuntu@$instance_ip" bash << 'NGINX_FINAL_EOF'
set -e
DOMAINS=(
    "code-dev.yuvro.ai"
    "campus-dev.yuvro.ai"
    "backend-code-dev.yuvro.ai"
    "backend-campus-dev.yuvro.ai"
    "code-executer-dev.yuvro.ai"
)

ALL_CERTS=true
for domain in "${DOMAINS[@]}"; do
    [ ! -d "/etc/letsencrypt/live/$domain" ] && ALL_CERTS=false && echo "⚠ Missing cert: $domain"
done

if [ "$ALL_CERTS" = "true" ]; then
    sudo cp /tmp/yuvro-nginx-https.conf /etc/nginx/sites-available/yuvro-dev
    # Save a permanent copy so re-deploys can restore it without re-running certbot
    sudo cp /tmp/yuvro-nginx-https.conf /etc/nginx/yuvro-dev-https.conf
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ HTTPS nginx config active — all sites on HTTPS"
    echo "✅ Saved to /etc/nginx/yuvro-dev-https.conf for future re-deploys"
else
    echo "⚠ Some certs missing — staying on HTTP redirect config"
    echo "  Re-run deployment once DNS is confirmed pointing to this server"
fi

# Auto-renewal cron
CRON_JOB="0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
( sudo crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "$CRON_JOB" ) | sudo crontab -
echo "✅ Certbot auto-renewal cron configured"
NGINX_FINAL_EOF

    print_success "Nginx reverse proxy configured"
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

    print_info "Application URLs (HTTPS):"
    echo "  YCode Frontend:    https://code-dev.yuvro.ai"
    echo "  YCampus Frontend:  https://campus-dev.yuvro.ai"
    echo "  YCode Backend:     https://backend-code-dev.yuvro.ai"
    echo "  YCampus Backend:   https://backend-campus-dev.yuvro.ai"
    echo "  Code Executor:     https://code-executer-dev.yuvro.ai"
    echo ""

    print_info "View logs:"
    echo "  ssh -i $SSH_KEY_PATH ubuntu@$instance_ip"
    echo "  cd yuvro"
    echo "  docker compose -f docker-compose.yuvro.yml -f docker-compose.ycode.yml -f docker-compose.ycampus.yml -f docker-compose.dev.yml logs -f"
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
    print_success "Deploy branch: $DEPLOY_BRANCH"

    check_prerequisites
    check_aws_setup

    # Check if EC2 instance is already running - skip infra if so
    local existing_ip
    existing_ip=$(aws ec2 describe-instances \
        --region "$AWS_REGION" \
        --filters "Name=tag:Environment,Values=dev" "Name=instance-state-name,Values=running" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text 2>/dev/null || echo "")

    if [ -n "$existing_ip" ] && [ "$existing_ip" != "None" ]; then
        print_warning "EC2 instance already running at $existing_ip - skipping infrastructure provisioning"
        print_info "Run 'DEPLOY_ENV=dev make clean' first to destroy and recreate infrastructure"
        local instance_ip="$existing_ip"
        wait_for_ssh "$instance_ip"
        wait_for_docker "$instance_ip"
        deploy_applications "$instance_ip" "$REPO_URL"
        setup_nginx "$instance_ip"
        show_summary "$instance_ip"
        return
    fi

    init_opentofu
    plan_deployment

    print_warning "This will create AWS resources and incur costs (~\$15-25/month)"
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
    setup_nginx "$instance_ip"
    show_summary "$instance_ip"
}

# Error handling
trap cleanup_on_error EXIT

main "$@"

# Remove error trap on success
trap - EXIT
print_success "Deployment completed successfully!"

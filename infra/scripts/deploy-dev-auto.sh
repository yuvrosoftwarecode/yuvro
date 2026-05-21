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

# Stop any running containers first to free ports (must happen before build)
echo "📦 Stopping any existing containers to free ports..."
if [ -d "/home/ubuntu/yuvro-code" ]; then
  cd /home/ubuntu/yuvro-code
  docker compose \
    -f docker-compose.yuvro.yml \
    -f docker-compose.ycode.yml \
    -f docker-compose.ycampus.yml \
    -f docker-compose.dev.yml \
    down --remove-orphans 2>/dev/null || true
  cd /home/ubuntu
fi

# Hard-kill any container still holding the ports we need
echo "🔪 Force-freeing ports 3000, 3002, 8001, 8002, 8003..."
set +e  # don't abort on kill failures
for port in 3000 3002 8001 8002 8003; do
  cid=\$(docker ps -q --filter "publish=\$port" 2>/dev/null)
  if [ -n "\$cid" ]; then
    echo "  Killing container \$cid holding port \$port"
    docker kill \$cid 2>/dev/null
    docker rm -f \$cid 2>/dev/null
  fi
  pid=\$(sudo lsof -ti tcp:\$port 2>/dev/null)
  if [ -n "\$pid" ]; then
    echo "  Killing PID \$pid holding port \$port"
    sudo kill -9 \$pid 2>/dev/null
  fi
done
# Nuclear: stop and remove ALL containers on this box
running=\$(docker ps -q 2>/dev/null)
[ -n "\$running" ] && docker stop \$running 2>/dev/null
all=\$(docker ps -aq 2>/dev/null)
[ -n "\$all" ] && docker rm \$all 2>/dev/null
set -e
sleep 3  # give OS time to release port bindings
echo "✅ Ports cleared"

echo "📦 Cloning repository..."
cd /home/ubuntu
if [ -d "yuvro-code" ]; then
    cd yuvro-code
    # Discard any local patches (vite configs, env files) before pulling
    git checkout -- .
    git pull
else
    git clone -b k8s-setup-iac "$repo_url" yuvro-code
    cd yuvro-code
fi

echo "📦 Configuring environment..."
# Patch compose files to use .env.dev instead of .env.local
sed -i 's/\.env\.local/.env.dev/g' docker-compose.yuvro.yml docker-compose.ycode.yml docker-compose.ycampus.yml 2>/dev/null || true

# Create .env.dev files from .env.example if missing
for svcdir in ycode-backend-api ycampus-backend-api ycode-web ycampus-web yuvro-code-executer; do
  [ ! -f "\$svcdir/.env.dev" ] && cp "\$svcdir/.env.example" "\$svcdir/.env.dev"
done

# Patch vite configs: allow all hosts (needed if dev server is ever used locally)
python3 -c "
import re
fixes = {
    'ycode-web/vite.config.ts': {},
    'ycampus-web/vite.config.ts': {},
}
for filepath, cfg in fixes.items():
    try:
        content = open(filepath).read()
        # allowedHosts: true (Vite 7)
        if 'allowedHosts' not in content:
            content = content.replace('host: \"0.0.0.0\"', 'host: \"0.0.0.0\",\n    allowedHosts: true')
        else:
            content = re.sub(r'allowedHosts:\s*[^\n,]+', 'allowedHosts: true', content)
        open(filepath, 'w').write(content)
        print(f'Patched {filepath}')
    except Exception as e:
        print(f'Warning: could not patch {filepath}: {e}')
" 2>/dev/null || true

# Set ALLOWED_HOSTS=* and DEBUG=True in backend .env.dev
for svcdir in ycode-backend-api ycampus-backend-api; do
  if grep -q '^ALLOWED_HOSTS=' "\$svcdir/.env.dev" 2>/dev/null; then
    sed -i 's/^ALLOWED_HOSTS=.*/ALLOWED_HOSTS=*/' "\$svcdir/.env.dev"
  else
    echo 'ALLOWED_HOSTS=*' >> "\$svcdir/.env.dev"
  fi
  if grep -q '^DEBUG=' "\$svcdir/.env.dev" 2>/dev/null; then
    sed -i 's/^DEBUG=.*/DEBUG=True/' "\$svcdir/.env.dev"
  else
    echo 'DEBUG=True' >> "\$svcdir/.env.dev"
  fi
done

# Set CORS origins for dev subdomains (HTTPS)
if grep -q '^CORS_ALLOWED_ORIGINS=' ycode-backend-api/.env.dev 2>/dev/null; then
  sed -i 's|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://code-dev.yuvro.ai,http://code-dev.yuvro.ai,http://localhost:3000|' ycode-backend-api/.env.dev
else
  echo 'CORS_ALLOWED_ORIGINS=https://code-dev.yuvro.ai,http://code-dev.yuvro.ai,http://localhost:3000' >> ycode-backend-api/.env.dev
fi
if grep -q '^CORS_ALLOWED_ORIGINS=' ycampus-backend-api/.env.dev 2>/dev/null; then
  sed -i 's|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://campus-dev.yuvro.ai,http://campus-dev.yuvro.ai,http://localhost:3002|' ycampus-backend-api/.env.dev
else
  echo 'CORS_ALLOWED_ORIGINS=https://campus-dev.yuvro.ai,http://campus-dev.yuvro.ai,http://localhost:3002' >> ycampus-backend-api/.env.dev
fi

# Set correct API base URLs in frontend .env.dev so they point to HTTPS subdomains
# These are used as docker-compose build args (baked into the Vite bundle at build time)
for key in VITE_BACKEND_API_BASE_URL; do
  if grep -q "^\$key=" ycode-web/.env.dev 2>/dev/null; then
    sed -i "s|^\$key=.*|\$key=https://backend-code-dev.yuvro.ai/api|" ycode-web/.env.dev
  else
    echo "\$key=https://backend-code-dev.yuvro.ai/api" >> ycode-web/.env.dev
  fi
done
for key in VITE_CODE_EXECUTOR_BASE_URL; do
  if grep -q "^\$key=" ycode-web/.env.dev 2>/dev/null; then
    sed -i "s|^\$key=.*|\$key=https://code-executer-dev.yuvro.ai|" ycode-web/.env.dev
  else
    echo "\$key=https://code-executer-dev.yuvro.ai" >> ycode-web/.env.dev
  fi
done

# ycampus frontend -> backend-campus-dev.yuvro.ai (HTTPS via Nginx)
for key in VITE_BACKEND_API_BASE_URL; do
  if grep -q "^\$key=" ycampus-web/.env.dev 2>/dev/null; then
    sed -i "s|^\$key=.*|\$key=https://backend-campus-dev.yuvro.ai/api|" ycampus-web/.env.dev
  else
    echo "\$key=https://backend-campus-dev.yuvro.ai/api" >> ycampus-web/.env.dev
  fi
done
for key in VITE_CODE_EXECUTOR_BASE_URL; do
  if grep -q "^\$key=" ycampus-web/.env.dev 2>/dev/null; then
    sed -i "s|^\$key=.*|\$key=https://code-executer-dev.yuvro.ai|" ycampus-web/.env.dev
  else
    echo "\$key=https://code-executer-dev.yuvro.ai" >> ycampus-web/.env.dev
  fi
done

echo "✓ Frontend API URLs configured (HTTPS)"

# Export VITE_ vars so docker-compose build args pick them up
export YCODE_VITE_BACKEND_API_BASE_URL="https://backend-code-dev.yuvro.ai/api"
export YCODE_VITE_CODE_EXECUTOR_BASE_URL="https://code-executer-dev.yuvro.ai"
export YCAMPUS_VITE_BACKEND_API_BASE_URL="https://backend-campus-dev.yuvro.ai/api"
export YCAMPUS_VITE_CODE_EXECUTOR_BASE_URL="https://code-executer-dev.yuvro.ai"

echo "📦 Building services (this takes a few minutes on t3.medium)..."
docker compose \
  -f docker-compose.yuvro.yml \
  -f docker-compose.ycode.yml \
  -f docker-compose.ycampus.yml \
  -f docker-compose.dev.yml \
  build 2>&1 | tail -20

echo "📦 Starting services..."
# Final port check - kill anything still holding our ports right before up
for port in 3000 3002 8001 8002 8003; do
  cid=\$(docker ps -q --filter "publish=\$port" 2>/dev/null)
  if [ -n "\$cid" ]; then
    echo "  ⚠ Container \$cid still on port \$port — force removing"
    docker rm -f \$cid 2>/dev/null || true
  fi
done
# Also stop ALL running containers as a nuclear option - we own this box
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
docker exec yuvro-code-ycode-backend-1 python manage.py setup_local_testing 2>&1 | tail -5 || echo "⚠ YCode sample data already loaded or failed"

echo "📦 Loading sample data for YCampus..."
docker exec yuvro-code-ycampus-backend-1 python manage.py setup_local_testing 2>&1 | tail -5 || echo "⚠ YCampus sample data already loaded or failed"
DEPLOY_EOF

    print_success "Applications deployed"
    echo ""
}

setup_nginx() {
    local instance_ip=$1

    print_header "Setting up Nginx Reverse Proxy with Let's Encrypt SSL"

    # Write nginx HTTP-only config first (needed for certbot ACME challenge)
    local nginx_http_conf
    nginx_http_conf=$(cat << 'NGINX_HTTP_CONF'
# Temporary HTTP-only config for Let's Encrypt ACME challenge
server {
    listen 80;
    server_name code-dev.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 80;
    server_name campus-dev.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 80;
    server_name backend-code-dev.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 80;
    server_name backend-campus-dev.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 80;
    server_name code-executer-dev.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
NGINX_HTTP_CONF
)

    local tmp_http_conf
    tmp_http_conf=$(mktemp)
    echo "$nginx_http_conf" > "$tmp_http_conf"
    scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$tmp_http_conf" "ubuntu@$instance_ip:/tmp/yuvro-nginx-http.conf"
    rm -f "$tmp_http_conf"

    # Write the full HTTPS nginx config (used after certs are obtained)
    local nginx_https_conf
    nginx_https_conf=$(cat << 'NGINX_HTTPS_CONF'
# Shared proxy settings snippet
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# ── code-dev.yuvro.ai ──────────────────────────────────────────────────────
server {
    listen 80;
    server_name code-dev.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name code-dev.yuvro.ai;

    ssl_certificate     /etc/letsencrypt/live/code-dev.yuvro.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/code-dev.yuvro.ai/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/code-dev.yuvro.ai/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/manifest+json image/svg+xml font/woff font/woff2;

    # Cache static assets (nginx serves them from the container via proxy)
    location ~* \.(js|css|woff|woff2|ttf|eot|ico|png|jpg|jpeg|gif|svg|webp)$ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
}

# ── campus-dev.yuvro.ai ────────────────────────────────────────────────────
server {
    listen 80;
    server_name campus-dev.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name campus-dev.yuvro.ai;

    ssl_certificate     /etc/letsencrypt/live/campus-dev.yuvro.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/campus-dev.yuvro.ai/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/campus-dev.yuvro.ai/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/manifest+json image/svg+xml font/woff font/woff2;

    location ~* \.(js|css|woff|woff2|ttf|eot|ico|png|jpg|jpeg|gif|svg|webp)$ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
}

# ── backend-code-dev.yuvro.ai ──────────────────────────────────────────────
server {
    listen 80;
    server_name backend-code-dev.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name backend-code-dev.yuvro.ai;

    ssl_certificate     /etc/letsencrypt/live/backend-code-dev.yuvro.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backend-code-dev.yuvro.ai/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/backend-code-dev.yuvro.ai/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }
}

# ── backend-campus-dev.yuvro.ai ────────────────────────────────────────────
server {
    listen 80;
    server_name backend-campus-dev.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name backend-campus-dev.yuvro.ai;

    ssl_certificate     /etc/letsencrypt/live/backend-campus-dev.yuvro.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backend-campus-dev.yuvro.ai/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/backend-campus-dev.yuvro.ai/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:8003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }
}

# ── code-executer-dev.yuvro.ai ─────────────────────────────────────────────
server {
    listen 80;
    server_name code-executer-dev.yuvro.ai;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name code-executer-dev.yuvro.ai;

    ssl_certificate     /etc/letsencrypt/live/code-executer-dev.yuvro.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/code-executer-dev.yuvro.ai/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/code-executer-dev.yuvro.ai/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:8002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }
}
NGINX_HTTPS_CONF
)

    local tmp_https_conf
    tmp_https_conf=$(mktemp)
    echo "$nginx_https_conf" > "$tmp_https_conf"
    scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$tmp_https_conf" "ubuntu@$instance_ip:/tmp/yuvro-nginx-https.conf"
    rm -f "$tmp_https_conf"

    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "ubuntu@$instance_ip" bash << 'NGINX_EOF'
set -e

# ── Install nginx and certbot ──────────────────────────────────────────────
sudo apt-get update -q
sudo apt-get install -y nginx certbot python3-certbot-nginx -q

# Create webroot for ACME challenges
sudo mkdir -p /var/www/certbot

# ── Deploy HTTP-only config first (needed for ACME challenge) ──────────────
sudo rm -f /etc/nginx/sites-enabled/default
sudo cp /tmp/yuvro-nginx-http.conf /etc/nginx/sites-available/yuvro-dev
sudo ln -sf /etc/nginx/sites-available/yuvro-dev /etc/nginx/sites-enabled/yuvro-dev
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
echo "✅ Nginx HTTP config deployed"

# ── Obtain Let's Encrypt certificates ─────────────────────────────────────
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
        echo "✅ Certificate already exists for $domain — skipping"
    else
        echo "🔐 Obtaining certificate for $domain ..."
        sudo certbot certonly \
            --webroot \
            --webroot-path /var/www/certbot \
            --non-interactive \
            --agree-tos \
            --email "$CERT_EMAIL" \
            --domain "$domain" \
            --deploy-hook "systemctl reload nginx" \
            2>&1 || {
                echo "⚠ certbot failed for $domain — check DNS points to this server"
            }
    fi
done

# ── Check if all certs were obtained, then switch to HTTPS config ──────────
ALL_CERTS=true
for domain in "${DOMAINS[@]}"; do
    if [ ! -d "/etc/letsencrypt/live/$domain" ]; then
        echo "⚠ Missing cert for $domain — staying on HTTP config"
        ALL_CERTS=false
    fi
done

if [ "$ALL_CERTS" = "true" ]; then
    sudo cp /tmp/yuvro-nginx-https.conf /etc/nginx/sites-available/yuvro-dev
    sudo nginx -t
    sudo systemctl reload nginx
    echo "✅ Nginx HTTPS config deployed — all sites now on HTTPS"
else
    echo "⚠ Some certificates missing — running HTTP only. Fix DNS and re-run setup_nginx."
fi

# ── Auto-renewal cron (certbot renew + nginx reload) ──────────────────────
CRON_JOB="0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
( sudo crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "$CRON_JOB" ) | sudo crontab -
echo "✅ Certbot auto-renewal cron configured"

NGINX_EOF

    print_success "Nginx reverse proxy with Let's Encrypt SSL configured"
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
    echo "  cd yuvro-code"
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

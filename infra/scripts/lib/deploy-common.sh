#!/bin/bash
# deploy-common.sh — shared library sourced by all deploy scripts
# Do NOT execute directly.

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

print_header()  { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${NC}"; echo -e "${BOLD}${BLUE}  $1${NC}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}"; }
print_success() { echo -e "${GREEN}  ✓ $1${NC}"; }
print_error()   { echo -e "${RED}  ✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
print_info()    { echo -e "${CYAN}  ℹ $1${NC}"; }
print_step()    { echo -e "${BOLD}  › $1${NC}"; }

# ── timing ───────────────────────────────────────────────────────────────────
DEPLOY_START_TIME=$(date +%s)
elapsed()       { local s=$(( $(date +%s) - DEPLOY_START_TIME )); printf "%dm%02ds" $(( s/60 )) $(( s%60 )); }
elapsed_since() { local s=$(( $(date +%s) - $1 ));                printf "%dm%02ds" $(( s/60 )) $(( s%60 )); }

# ── config (callers may override before sourcing) ─────────────────────────────
AWS_REGION="${AWS_REGION:-ap-south-1}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/ycode-dev.pem}"
KEY_PAIR_NAME="${KEY_PAIR_NAME:-ycode-dev}"
MAX_RETRIES="${MAX_RETRIES:-60}"
RETRY_DELAY="${RETRY_DELAY:-10}"
OPENTOFU_DIR="${OPENTOFU_DIR:-}"   # set by caller relative to PROJECT_ROOT

# ── helpers ───────────────────────────────────────────────────────────────────

_set_kv() {
    local f="$1" key="$2" value="$3"
    [ -z "$value" ] && return 0
    [ ! -f "$f" ]   && touch "$f"
    if grep -qE "^${key}=" "$f"; then
        sed -i.bak -E "s|^${key}=.*$|${key}=${value}|" "$f" && rm -f "$f.bak"
    else
        printf "\n%s=%s\n" "$key" "$value" >> "$f"
    fi
}

ssh_ec2()  { ssh  -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ServerAliveInterval=60 -o ServerAliveCountMax=30 "$@"; }
scp_ec2()  { scp  -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$@"; }

# ── pre-flight ─────────────────────────────────────────────────────────────────

check_prerequisites() {
    print_header "Checking Prerequisites"
    local missing=0
    for tool in tofu aws ssh scp; do
        command -v $tool &>/dev/null && print_success "$tool found" || { print_error "$tool not installed"; missing=1; }
    done
    aws sts get-caller-identity &>/dev/null \
        && print_success "AWS Account: $(aws sts get-caller-identity --query Account --output text)" \
        || { print_error "AWS credentials not configured — run: aws configure"; missing=1; }
    if [ $missing -eq 1 ]; then print_error "Fix missing tools and retry"; exit 1; fi
}

check_aws_setup() {
    print_header "Checking AWS Setup"
    # Use || true so set -e does not kill the script if describe-key-pairs returns non-zero
    if aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" --region "$AWS_REGION" &>/dev/null 2>&1; then
        print_success "EC2 key pair '$KEY_PAIR_NAME' exists"
    else
        print_warning "Key pair '$KEY_PAIR_NAME' not found in AWS — will use local SSH key"
    fi
    if [ ! -f "$SSH_KEY_PATH" ]; then
        print_error "SSH key not found: $SSH_KEY_PATH"
        print_info "Place your EC2 key at $SSH_KEY_PATH and ensure it has chmod 400"
        exit 1
    fi
    print_success "SSH key exists: $SSH_KEY_PATH"
}

# ── opentofu ──────────────────────────────────────────────────────────────────

init_opentofu() {
    print_header "Initializing OpenTofu"
    cd "$OPENTOFU_DIR"
    [ -d ".terraform" ] && print_warning "Already initialized" || tofu init
    cd "$PROJECT_ROOT"
}

plan_deployment() {
    print_header "Planning Infrastructure"
    local tfvars="$OPENTOFU_DIR/dev.tfvars"
    local tfplan="$OPENTOFU_DIR/tfplan"
    [ -f "$tfvars" ] || { print_error "Missing: $tfvars"; exit 1; }
    cd "$OPENTOFU_DIR"
    tofu plan -var-file="$tfvars" -out="$tfplan"
    print_success "Plan saved"
    cd "$PROJECT_ROOT"
}

apply_deployment() {
    print_header "Applying Infrastructure"
    local tfplan="$OPENTOFU_DIR/tfplan"
    [ -f "$tfplan" ] || { print_error "No plan file — run plan first"; exit 1; }
    cd "$OPENTOFU_DIR"
    tofu apply "$tfplan"
    print_success "Infrastructure deployed"
    cd "$PROJECT_ROOT"
}

get_instance_ip() {
    print_info "Fetching EC2 IP..." >&2
    local ip="" retries=0
    while [ -z "$ip" ] && [ $retries -lt $MAX_RETRIES ]; do
        ip=$(aws ec2 describe-instances \
            --region "$AWS_REGION" \
            --filters "Name=tag:Environment,Values=dev" "Name=instance-state-name,Values=running" \
            --query 'Reservations[0].Instances[0].PublicIpAddress' --output text 2>/dev/null)
        [ "$ip" = "None" ] && ip=""
        if [ -z "$ip" ]; then
            retries=$((retries+1))
            print_info "Waiting... ($retries/$MAX_RETRIES)" >&2
            sleep $RETRY_DELAY
        fi
    done
    [ -z "$ip" ] && { print_error "Could not get EC2 IP" >&2; exit 1; }
    print_success "EC2 IP: $ip" >&2
    echo "$ip"
}

wait_for_ssh() {
    local ip=$1
    print_header "Waiting for SSH"
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        ssh_ec2 -o ConnectTimeout=5 "ubuntu@$ip" "echo ok" &>/dev/null \
            && { print_success "SSH ready"; return 0; }
        retries=$((retries+1))
        print_info "Not ready... ($retries/$MAX_RETRIES)"
        sleep $RETRY_DELAY
    done
    print_error "SSH unavailable"; exit 1
}

wait_for_docker() {
    local ip=$1
    print_header "Waiting for Docker"
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        ssh_ec2 -o ConnectTimeout=5 "ubuntu@$ip" \
            "docker info &>/dev/null && echo ok" 2>/dev/null | grep -q ok \
            && { print_success "Docker ready"; return 0; }
        retries=$((retries+1))
        print_info "Not ready... ($retries/$MAX_RETRIES)"
        sleep $RETRY_DELAY
    done
    print_error "Docker unavailable"; exit 1
}

# ── compose helpers ────────────────────────────────────────────────────────────

compose_files_for() {
    local app="${1:-all}"
    local base="-f docker-compose.yuvro.yml"
    case "$app" in
        ycode)   echo "$base -f docker-compose.ycode.yml   -f docker-compose.dev.yml" ;;
        ycampus) echo "$base -f docker-compose.ycampus.yml -f docker-compose.dev.yml" ;;
        ylabs)   echo "$base -f docker-compose.yhub.yml    -f docker-compose.dev.yml" ;;
        yhub)    echo "$base -f docker-compose.yhub.yml    -f docker-compose.dev.yml" ;;
        code-executor) echo "-f docker-compose.code-executor.yml" ;;
        all|*)   echo "$base -f docker-compose.ycode.yml -f docker-compose.ycampus.yml -f docker-compose.ylabs.yml -f docker-compose.yhub.yml -f docker-compose.code-executor.yml -f docker-compose.dev.yml" ;;
    esac
}

services_for() {
    case "${1:-all}" in
        ycode)   echo "ycode-backend ycode-frontend" ;;
        ycampus) echo "ycampus-backend ycampus-frontend" ;;
        ylabs)   echo "ylabs-backend ylabs-frontend" ;;
        yhub)    echo "yhub-backend" ;;
        code-executor) echo "yuvro-code-executor" ;;
        all|*)   echo "" ;;
    esac
}

fixture_containers_for() {
    case "${1:-all}" in
        ycode)   echo "yuvro-ycode-backend-1" ;;
        ycampus) echo "yuvro-ycampus-backend-1" ;;
        ylabs)   echo "yuvro-ylabs-backend-1" ;;
        yhub)    echo "yuvro-yhub-backend-1" ;;
        code-executor) echo "" ;;
        all|*)   echo "yuvro-ycode-backend-1 yuvro-ycampus-backend-1 yuvro-ylabs-backend-1 yuvro-yhub-backend-1" ;;
    esac
}

# ── secrets wiring from OpenTofu outputs ──────────────────────────────────────

wire_secrets() {
    local SECRETS_DIR="$PROJECT_ROOT"
    local tfvars="$OPENTOFU_DIR/dev.tfvars"

    # Skip if OpenTofu state not available locally (e.g. infra already exists, deployed from another machine)
    if [ ! -f "$OPENTOFU_DIR/terraform.tfstate" ] && [ ! -d "$OPENTOFU_DIR/.terraform" ]; then
        print_warning "OpenTofu state not available locally — skipping secrets wiring from outputs"
        print_info "S3 / RDS vars will use values already in .env.dev-secrets files"
        return 0
    fi

    cd "$OPENTOFU_DIR"
    print_step "Reading OpenTofu outputs..."
    S3_BUCKET="$(tofu output -raw app_data_bucket_name          2>/dev/null || true)"
    S3_KEY_ID="$(tofu output -raw app_service_access_key_id     2>/dev/null || true)"
    S3_SECRET="$(tofu output -raw app_service_secret_access_key 2>/dev/null || true)"

    YHUB_DB_HOST="$(tofu output -raw yhub_db_endpoint  2>/dev/null | cut -d: -f1 || true)"
    YHUB_DB_NAME="$(tofu output -raw yhub_db_name      2>/dev/null || true)"
    YHUB_DB_USER="$(tofu output -raw yhub_db_username  2>/dev/null || true)"

    YLABS_DB_HOST="$(tofu output -raw ylabs_db_endpoint 2>/dev/null | cut -d: -f1 || true)"
    YLABS_DB_NAME="$(tofu output -raw ylabs_db_name     2>/dev/null || true)"
    YLABS_DB_USER="$(tofu output -raw ylabs_db_username 2>/dev/null || true)"

    YHUB_DB_PASS="$(grep  '^yhub_db_password'  "$tfvars" | cut -d= -f2- | tr -d ' "'"'")"
    YLABS_DB_PASS="$(grep '^ylabs_db_password' "$tfvars" | cut -d= -f2- | tr -d ' "'"'")"
    cd "$PROJECT_ROOT" >/dev/null

    # S3 into all backends
    for f in ycode-backend-api/.env.dev-secrets ycampus-backend-api/.env.dev-secrets \
              yhub-backend-api/.env.dev-secrets  ylabs-backend-api/.env.dev-secrets; do
        _set_kv "$SECRETS_DIR/$f" "AWS_STORAGE_BUCKET_NAME" "$S3_BUCKET"
        _set_kv "$SECRETS_DIR/$f" "AWS_ACCESS_KEY_ID"        "$S3_KEY_ID"
        _set_kv "$SECRETS_DIR/$f" "AWS_SECRET_ACCESS_KEY"    "$S3_SECRET"
    done
    [ -n "$S3_BUCKET" ] && print_success "S3 bucket wired: $S3_BUCKET"

    # YHub RDS
    if [ -n "$YHUB_DB_HOST" ]; then
        local f="$SECRETS_DIR/yhub-backend-api/.env.dev-secrets"
        _set_kv "$f" "DATABASE_URL" "postgresql://${YHUB_DB_USER}:${YHUB_DB_PASS}@${YHUB_DB_HOST}:5432/${YHUB_DB_NAME}"
        _set_kv "$f" "DB_HOST" "$YHUB_DB_HOST"; _set_kv "$f" "DB_PORT" "5432"
        _set_kv "$f" "DB_NAME" "$YHUB_DB_NAME"; _set_kv "$f" "DB_USER" "$YHUB_DB_USER"
        _set_kv "$f" "DB_PASSWORD" "$YHUB_DB_PASS"
        sed -i.bak '/^POSTGRES_DB=/d;/^POSTGRES_USER=/d;/^POSTGRES_PASSWORD=/d' "$f" && rm -f "$f.bak"
        print_success "YHub RDS: $YHUB_DB_HOST/$YHUB_DB_NAME"
    else
        print_warning "YHub RDS endpoint not available — keeping existing DATABASE_URL"
    fi

    # YLabs RDS
    if [ -n "$YLABS_DB_HOST" ]; then
        local f="$SECRETS_DIR/ylabs-backend-api/.env.dev-secrets"
        _set_kv "$f" "DATABASE_URL" "postgresql://${YLABS_DB_USER}:${YLABS_DB_PASS}@${YLABS_DB_HOST}:5432/${YLABS_DB_NAME}"
        _set_kv "$f" "DB_HOST" "$YLABS_DB_HOST"; _set_kv "$f" "DB_PORT" "5432"
        _set_kv "$f" "DB_NAME" "$YLABS_DB_NAME"; _set_kv "$f" "DB_USER" "$YLABS_DB_USER"
        _set_kv "$f" "DB_PASSWORD" "$YLABS_DB_PASS"
        sed -i.bak '/^POSTGRES_DB=/d;/^POSTGRES_USER=/d;/^POSTGRES_PASSWORD=/d' "$f" && rm -f "$f.bak"
        print_success "YLabs RDS: $YLABS_DB_HOST/$YLABS_DB_NAME"
    else
        print_warning "YLabs RDS endpoint not available — keeping existing DATABASE_URL"
    fi
}

# ── copy secrets to EC2 ────────────────────────────────────────────────────────

# Secrets, nginx config, and domains for each app
app_secrets_for() {
    local app="${1:-all}"
    case "$app" in
        ycode)   echo "ycode-backend-api/.env.dev-secrets ycode-web/.env.dev-secrets" ;;
        ycampus) echo "ycampus-backend-api/.env.dev-secrets ycampus-web/.env.dev-secrets" ;;
        ylabs)   echo "ylabs-backend-api/.env.dev-secrets ylabs-web/.env.dev-secrets" ;;
        yhub)    echo "yhub-backend-api/.env.dev-secrets" ;;
        code-executor) echo "yuvro-code-executer/.env.dev-secrets" ;;
        all|*)   echo "ycode-backend-api/.env.dev-secrets ycode-web/.env.dev-secrets ycampus-backend-api/.env.dev-secrets ycampus-web/.env.dev-secrets ylabs-backend-api/.env.dev-secrets ylabs-web/.env.dev-secrets yhub-backend-api/.env.dev-secrets yuvro-code-executer/.env.dev-secrets" ;;
    esac
}

app_domains_for() {
    local app="${1:-all}"
    case "$app" in
        ycode)   echo "code-dev.yuvro.ai backend-code-dev.yuvro.ai" ;;
        ycampus) echo "campus-dev.yuvro.ai backend-campus-dev.yuvro.ai" ;;
        ylabs)   echo "dev.yuvrolabs.com backend-dev.yuvrolabs.com" ;;
        yhub)    echo "backend-hub-dev.yuvro.ai" ;;
        all|*)   echo "code-dev.yuvro.ai campus-dev.yuvro.ai dev.yuvrolabs.com backend-code-dev.yuvro.ai backend-campus-dev.yuvro.ai backend-dev.yuvrolabs.com backend-hub-dev.yuvro.ai code-executer-dev.yuvro.ai" ;;
    esac
}

app_nginx_config_for() {
    local app="${1:-all}"
    case "$app" in
        ycode)   echo "ycode-web/nginx.ec2.conf" ;;
        ycampus) echo "ycampus-web/nginx.ec2.conf" ;;
        ylabs)   echo "ylabs-web/nginx.ec2.conf" ;;
        yhub)    echo "yhub-backend-api/nginx.ec2.conf" ;;
        code-executor) echo "yuvro-code-executer/nginx.ec2.conf" ;;
        all|*)   echo "ycode-web/nginx.ec2.conf ycampus-web/nginx.ec2.conf ylabs-web/nginx.ec2.conf yhub-backend-api/nginx.ec2.conf yuvro-code-executer/nginx.ec2.conf" ;;
    esac
}

copy_secrets_to_ec2() {
    local ip=$1
    local app="${2:-all}"
    print_step "Copying secrets to EC2..."
    local secrets
    secrets="$(app_secrets_for "$app")"
    for sf in $secrets; do
        local local_path="$PROJECT_ROOT/$sf"
        if [ -f "$local_path" ]; then
            ssh_ec2 "ubuntu@$ip" "mkdir -p /home/ubuntu/yuvro/$(dirname "$sf")"
            scp_ec2 "$local_path" "ubuntu@$ip:/home/ubuntu/yuvro/$sf"
            print_success "Copied $sf"
        else
            print_warning "Not found locally: $local_path"
        fi
    done
}

# ── core deploy function ──────────────────────────────────────────────────────
# Called by every app script and deploy-all.sh
# Args: $1=instance_ip  $2=repo_url  $3=app  $4=branch

run_deploy() {
    local ip="$1" repo_url="$2" app="${3:-all}" branch="${4:-main}"
    local compose_args services fixture_containers
    compose_args="$(compose_files_for "$app")"
    services="$(services_for "$app")"
    fixture_containers="$(fixture_containers_for "$app")"

    print_header "Deploying [$app] on branch [$branch]"

    # Copy GitHub deploy key
    scp_ec2 "$HOME/.ssh/ycode-ec2-github" "ubuntu@$ip:/home/ubuntu/.ssh/github_deploy_key"

    # Wire + copy secrets
    wire_secrets "$app"
    copy_secrets_to_ec2 "$ip" "$app"

    # Read Vite Google IDs
    local vite_google="" ycampus_google="" ylabs_google=""
    [ -f "$PROJECT_ROOT/ycode-web/.env.dev-secrets" ]   && vite_google=$(grep   '^VITE_GOOGLE_CLIENT_ID=' "$PROJECT_ROOT/ycode-web/.env.dev-secrets"   | cut -d= -f2- | tr -d '"'"'")
    [ -f "$PROJECT_ROOT/ycampus-web/.env.dev-secrets" ] && ycampus_google=$(grep '^VITE_GOOGLE_CLIENT_ID=' "$PROJECT_ROOT/ycampus-web/.env.dev-secrets" | cut -d= -f2- | tr -d '"'"'")
    [ -f "$PROJECT_ROOT/ylabs-web/.env.dev-secrets" ]   && ylabs_google=$(grep   '^VITE_GOOGLE_CLIENT_ID=' "$PROJECT_ROOT/ylabs-web/.env.dev-secrets"   | cut -d= -f2- | tr -d '"'"'")
    ycampus_google="${ycampus_google:-$vite_google}"
    ylabs_google="${ylabs_google:-$vite_google}"

    ssh_ec2 "ubuntu@$ip" bash << DEPLOY_EOF
set -e
T0=\$(date +%s)
elapsed_s() { echo "\$(( \$(date +%s) - T0 ))s"; }

# ── git ──────────────────────────────────────────────────────────────────────
chmod 600 /home/ubuntu/.ssh/github_deploy_key
cat > /home/ubuntu/.ssh/config << 'SSHCFG'
Host github.com
  HostName github.com
  User git
  IdentityFile /home/ubuntu/.ssh/github_deploy_key
  StrictHostKeyChecking no
SSHCFG
chmod 600 /home/ubuntu/.ssh/config

echo "── git: branch=$branch ─────────────────────────────"
T1=\$(date +%s)
cd /home/ubuntu
if [ -d yuvro ]; then
    cd yuvro
    git fetch origin
    git checkout -- .
    git checkout "$branch"
    git pull origin "$branch"
else
    git clone -b "$branch" "$repo_url" yuvro && cd yuvro
fi
echo "   ✓ git  [elapsed \$(( \$(date +%s)-T1 ))s]"

# secrets status
echo "── secrets ─────────────────────────────────────────"
for sf in yhub-backend-api/.env.dev-secrets ylabs-backend-api/.env.dev-secrets \
          ycode-backend-api/.env.dev-secrets ycampus-backend-api/.env.dev-secrets; do
    [ -f "\$sf" ] && echo "   ✓ \$sf" || echo "   ⚠ missing: \$sf"
done

# ── build args ───────────────────────────────────────────────────────────────
export YCODE_VITE_BACKEND_API_BASE_URL="https://backend-code-dev.yuvro.ai/api"
export YCODE_VITE_CODE_EXECUTOR_BASE_URL="https://code-executer-dev.yuvro.ai"
export YCAMPUS_VITE_BACKEND_API_BASE_URL="https://backend-campus-dev.yuvro.ai/api"
export YCAMPUS_VITE_CODE_EXECUTOR_BASE_URL="https://code-executer-dev.yuvro.ai"
export YLABS_VITE_BACKEND_API_BASE_URL="https://backend-dev.yuvrolabs.com/api"
export YLABS_VITE_YHUB_BACKEND_API_BASE_URL="https://backend-hub-dev.yuvro.ai/api"
export YLABS_VITE_YCODE_BACKEND_API_BASE_URL="https://backend-code-dev.yuvro.ai/api"
export VITE_GOOGLE_CLIENT_ID="$vite_google"
export YCAMPUS_VITE_GOOGLE_CLIENT_ID="$ycampus_google"
export YLABS_VITE_GOOGLE_CLIENT_ID="$ylabs_google"
export VITE_DEPLOY_COMMIT_SHA=\$(git rev-parse HEAD 2>/dev/null || echo unknown)
export VITE_DEPLOY_BRANCH=\$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
export VITE_DEPLOY_APP_VERSION=\$(python3 -c "import json;print(json.load(open('ycode-web/package.json'))['version'])" 2>/dev/null || echo 1.0.0)
export CACHEBUST=\$(date +%s)
echo "── build args ──────────────────────────────────────"
echo "   branch=\$VITE_DEPLOY_BRANCH  sha=\${VITE_DEPLOY_COMMIT_SHA:0:7}"

# ── EBS expand ───────────────────────────────────────────────────────────────
sudo growpart /dev/nvme0n1 1 2>/dev/null || true
sudo resize2fs /dev/root 2>/dev/null || sudo resize2fs /dev/nvme0n1p1 2>/dev/null || true

# ── auto-expand EBS if free space < 15 GB ────────────────────────────────────
echo "── disk check ──────────────────────────────────────"
FREE_GB=\$(df -BG / | awk 'NR==2{gsub("G","",\$4); print \$4}')
TOTAL_GB=\$(df -BG / | awk 'NR==2{gsub("G","",\$2); print \$2}')
echo "   disk: \${FREE_GB}GB free of \${TOTAL_GB}GB"
if [ "\${FREE_GB}" -lt 15 ]; then
    echo "   ⚠ Low disk — expanding EBS volume by 20GB..."
    INSTANCE_ID=\$(curl -sf http://169.254.169.254/latest/meta-data/instance-id)
    VOLUME_ID=\$(aws ec2 describe-instances --instance-ids "\$INSTANCE_ID" \
        --region "$AWS_REGION" \
        --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' \
        --output text 2>/dev/null)
    if [ -n "\$VOLUME_ID" ] && [ "\$VOLUME_ID" != "None" ]; then
        NEW_SIZE=\$(( TOTAL_GB + 20 ))
        aws ec2 modify-volume --volume-id "\$VOLUME_ID" --size "\$NEW_SIZE" \
            --region "$AWS_REGION" 2>/dev/null \
            && echo "   ✓ EBS volume resize requested: \${TOTAL_GB}GB → \${NEW_SIZE}GB" \
            || echo "   ⚠ EBS resize failed (may already be in progress)"
        # Wait for modification to complete then expand filesystem
        sleep 10
        sudo growpart /dev/nvme0n1 1 2>/dev/null || true
        sudo resize2fs /dev/root 2>/dev/null || sudo resize2fs /dev/nvme0n1p1 2>/dev/null || true
        echo "   ✓ filesystem expanded: \$(df -h / | awk 'NR==2{print \$4\" free\"}')"
    else
        echo "   ⚠ Could not determine volume ID — skipping resize"
    fi
fi

# ── build (layer cache enabled via BuildKit) ─────────────────────────────────
echo "── docker build [$app] ─────────────────────────────"
T1=\$(date +%s)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker image prune -f 2>/dev/null || true   # dangling only — keep layer cache

docker compose $compose_args build \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    $services

echo "   ✓ build  [\$(( \$(date +%s)-T1 ))s]"

# ── up ───────────────────────────────────────────────────────────────────────
echo "── docker up [$app] ────────────────────────────────"
T1=\$(date +%s)
docker network create executor    2>/dev/null || true
docker network create yuvro_ylabs 2>/dev/null || true
docker compose $compose_args up -d --remove-orphans --force-recreate $services
echo "   ✓ up  [\$(( \$(date +%s)-T1 ))s]"

docker compose $compose_args ps

# ── nginx ────────────────────────────────────────────────────────────────────
local nginx_config
nginx_config="$(app_nginx_config_for "$app")"
if [ -n "$nginx_config" ]; then
    # Copy app-specific nginx config to EC2
    for nc in $nginx_config; do
        scp_ec2 "$PROJECT_ROOT/$nc" "ubuntu@$ip:/tmp/$(basename $nc)"
    done
    # Merge configs and install
    ssh_ec2 "ubuntu@$ip" "
        cat /tmp/*.ec2.conf > /etc/nginx/sites-available/yuvro-dev
        sudo nginx -t && sudo systemctl reload nginx
    "
    echo "   ✓ nginx reloaded"
else
    echo "   ⚠ No nginx config for $app"
fi

# ── fixtures ─────────────────────────────────────────────────────────────────
echo "── fixtures — waiting 20s ──────────────────────────"
sleep 20
for c in $fixture_containers; do
    name=\$(echo "\$c" | sed 's/yuvro-//;s/-backend-1//')
    echo "   loading: \$name"
    docker exec "\$c" python manage.py setup_fixtures_data 2>&1 | tail -5 \
        || echo "   ⚠ \$name: already loaded or failed"
done

echo ""
echo "✅ [$app] done  [total \$(elapsed_s)]"
DEPLOY_EOF

    print_success "[$app] deployed  [total elapsed: $(elapsed)]"
}

# ── nginx + certbot ────────────────────────────────────────────────────────────

setup_nginx() {
    local ip=$1
    print_header "Setting up Nginx + SSL"

    ssh_ec2 "ubuntu@$ip" bash << 'NINST'
set -e
command -v nginx  &>/dev/null || sudo apt-get install -y nginx certbot python3-certbot-nginx -q
command -v make   &>/dev/null || sudo apt-get install -y make -q
sudo mkdir -p /var/www/certbot
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/yuvro-dev /etc/nginx/sites-enabled/yuvro-dev 2>/dev/null || true
echo "✓ nginx + certbot ready"
NINST

    scp_ec2 "$PROJECT_ROOT/ycode-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ycode.ec2.conf"
    scp_ec2 "$PROJECT_ROOT/ycampus-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ycampus.ec2.conf"
    scp_ec2 "$PROJECT_ROOT/ylabs-web/nginx.ec2.conf" "ubuntu@$ip:/tmp/ylabs.ec2.conf"
    scp_ec2 "$PROJECT_ROOT/yhub-backend-api/nginx.ec2.conf" "ubuntu@$ip:/tmp/yhub.ec2.conf"
    scp_ec2 "$PROJECT_ROOT/yuvro-code-executer/nginx.ec2.conf" "ubuntu@$ip:/tmp/code-executor.ec2.conf"

    ssh_ec2 "ubuntu@$ip" bash << 'CERTBOT'
DOMAINS=( "code-dev.yuvro.ai" "campus-dev.yuvro.ai" "backend-code-dev.yuvro.ai"
          "backend-campus-dev.yuvro.ai" "code-executer-dev.yuvro.ai"
          "backend-hub-dev.yuvro.ai" "backend-dev.yuvrolabs.com" "dev.yuvrolabs.com" )
CERT_EMAIL="rohith@yuvro.ai"

ALL=true
for d in "${DOMAINS[@]}"; do [ -d "/etc/letsencrypt/live/$d" ] || { ALL=false; break; }; done

if [ "$ALL" = "true" ]; then
    echo "✓ All certs exist — skipping certbot"
else
    sudo python3 -c "
ds=['code-dev.yuvro.ai','campus-dev.yuvro.ai','backend-code-dev.yuvro.ai',
    'backend-campus-dev.yuvro.ai','code-executer-dev.yuvro.ai',
    'backend-hub-dev.yuvro.ai','backend-dev.yuvrolabs.com','dev.yuvrolabs.com']
c=''.join(f'''server{{listen 80;server_name {d};location /.well-known/acme-challenge/{{root /var/www/certbot;}}location /{{return 301 https://\$host\$request_uri;}}}}\n''' for d in ds)
open('/etc/nginx/sites-available/yuvro-dev','w').write(c)
"
    sudo nginx -t && sudo systemctl reload nginx || sudo systemctl restart nginx
    for d in "${DOMAINS[@]}"; do
        [ -d "/etc/letsencrypt/live/$d" ] && echo "✓ exists: $d" && continue
        sudo certbot certonly --webroot --webroot-path /var/www/certbot \
            --non-interactive --agree-tos --email "$CERT_EMAIL" -d "$d" 2>&1 \
            && echo "✓ cert: $d" || echo "⚠ certbot failed: $d"
    done
fi

sudo cp /tmp/yuvro-nginx-https.conf /etc/nginx/sites-available/yuvro-dev
sudo nginx -t && sudo systemctl reload nginx && echo "✓ HTTPS config active" || echo "⚠ nginx error"
CRON="0 3 * * * certbot renew --quiet --deploy-hook 'systemctl reload nginx'"
( sudo crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "$CRON" ) | sudo crontab -
CERTBOT

    print_success "Nginx + SSL ready"
}

# ── summary ────────────────────────────────────────────────────────────────────

show_summary() {
    local ip=$1 app="${2:-all}"
    print_header "🎉  Deployment Complete  [$app]"
    print_success "Total time: $(elapsed)"
    echo ""
    print_info "EC2: $ip   SSH: ssh -i $SSH_KEY_PATH ubuntu@$ip"
    echo ""
    print_info "URLs:"
    [ "$app" = "all" ] || [ "$app" = "ycode" ]   && echo "  YCode     https://code-dev.yuvro.ai  |  https://backend-code-dev.yuvro.ai"
    [ "$app" = "all" ] || [ "$app" = "ycampus" ] && echo "  YCampus   https://campus-dev.yuvro.ai  |  https://backend-campus-dev.yuvro.ai"
    [ "$app" = "all" ] || [ "$app" = "ylabs" ]   && echo "  YLabs     https://dev.yuvrolabs.com  |  https://backend-dev.yuvrolabs.com"
    [ "$app" = "all" ] || [ "$app" = "yhub" ]    && echo "  YHub      https://backend-hub-dev.yuvro.ai"
    [ "$app" = "all" ]                            && echo "  Executor  https://code-executer-dev.yuvro.ai"
    echo ""
}

cleanup_on_error() {
    print_error "Deployment FAILED after $(elapsed)"
    echo "  Destroy: cd $OPENTOFU_DIR && tofu destroy -var-file=dev.tfvars"
}

# ── ensure infra is up (shared by all scripts) ─────────────────────────────────

ensure_infra_and_deploy() {
    # $1=app  $2=branch
    local app="${1:-all}" branch="${2:-main}"

    REPO_URL=$(git -C "$PROJECT_ROOT" remote get-url origin 2>/dev/null || echo "")
    [ -z "$REPO_URL" ] && { print_error "Not a git repo or no origin remote"; exit 1; }
    print_success "Repo: $REPO_URL"
    print_success "Branch: $branch  |  App: $app"

    check_prerequisites
    check_aws_setup

    local ip
    ip=$(aws ec2 describe-instances \
        --region "$AWS_REGION" \
        --filters "Name=tag:Environment,Values=dev" "Name=instance-state-name,Values=running" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text 2>/dev/null || echo "")

    # Normalize AWS CLI "None" string when no instance found
    [ "$ip" = "None" ] && ip=""

    if [ -n "$ip" ]; then
        print_warning "EC2 already running at $ip — skipping infra provisioning"
        print_info "Run DEPLOY_ENV=dev make clean to destroy and recreate infra"
    else
        init_opentofu
        plan_deployment
        print_warning "This will create AWS resources (~\$35-50/month with 4 RDS instances)"
        # DEPLOY_CONFIRM=yes skips interactive prompt (for CI / make)
        if [ "${DEPLOY_CONFIRM:-}" = "yes" ]; then
            print_info "Auto-confirming (DEPLOY_CONFIRM=yes)"
        else
            read -p "Continue? (yes/no) " -r; echo
            [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]] || { print_info "Cancelled"; exit 0; }
        fi
        apply_deployment
        ip=$(get_instance_ip)
    fi

    wait_for_ssh    "$ip"
    wait_for_docker "$ip"
    run_deploy      "$ip" "$REPO_URL" "$app" "$branch"
    setup_nginx     "$ip"
    show_summary    "$ip" "$app"
}

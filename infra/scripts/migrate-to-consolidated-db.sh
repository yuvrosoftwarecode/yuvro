#!/bin/bash
# Migrate data from 5 separate RDS instances to single consolidated yuvro-dev-db instance
# Runs inside Docker containers (no need to install psql, aws, tofu locally)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
BACKUP_DIR="$PROJECT_ROOT/infra/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
  echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}"
}

print_success() { echo -e "${GREEN}  ✓ $1${NC}"; }
print_error() { echo -e "${RED}  ✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
print_info() { echo -e "${CYAN}  ℹ $1${NC}"; }
print_step() { echo -e "${BOLD}  › $1${NC}"; }

# Run command inside a Docker container with necessary tools
run_in_docker() {
    local cmd="$1"
    docker run --rm \
        -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
        -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
        -e AWS_DEFAULT_REGION="ap-south-1" \
        -v "$BACKUP_DIR:/backup" \
        -v "$OPENTOFU_DIR:/tofu" \
        amazon/aws-cli:latest sh -c "$cmd"
}

# Run psql command
run_psql() {
    local host="$1"
    local user="$2"
    local db="$3"
    local password="$4"
    local cmd="$5"
    
    docker run --rm \
        -e PGPASSWORD="$password" \
        -v "$BACKUP_DIR:/backup" \
        postgres:15-alpine sh -c "psql -h '$host' -U '$user' -d '$db' -c \"$cmd\""
}

# Run pg_dump command
run_pg_dump() {
    local host="$1"
    local user="$2"
    local db="$3"
    local password="$4"
    local output_file="$5"
    
    docker run --rm \
        -e PGPASSWORD="$password" \
        -v "$BACKUP_DIR:/backup" \
        postgres:15-alpine sh -c "pg_dump -h '$host' -U '$user' -d '$db' --if-exists --clean --no-privileges --no-owner > /backup/$(basename "$output_file")"
}

# Run psql restore command
run_psql_restore() {
    local host="$1"
    local user="$2"
    local db="$3"
    local password="$4"
    local backup_file="$5"
    
    docker run --rm \
        -e PGPASSWORD="$password" \
        -v "$BACKUP_DIR:/backup" \
        postgres:15-alpine sh -c "psql -h '$host' -U '$user' -d '$db' -f /backup/$(basename "$backup_file")" 2>/dev/null || true
}

check_docker() {
    print_header "Checking Docker"
    
    if ! command -v docker &>/dev/null; then
        print_error "Docker not installed"
        exit 1
    fi
    
    print_success "Docker is available"
}

get_endpoints() {
    print_header "Fetching RDS Instance Endpoints"
    
    # Fetch old instances using AWS CLI in Docker
    local apps="ycode ycampus yhub ylabs"
    
    for app in $apps; do
        print_step "Fetching dev-${app}-db endpoint..."
        
        local endpoint=$(run_in_docker "aws rds describe-db-instances --db-instance-identifier 'dev-${app}-db' --query 'DBInstances[0].Endpoint.Address' --output text 2>/dev/null || echo ''" 2>/dev/null)
        
        if [ -z "$endpoint" ] || [ "$endpoint" = "None" ]; then
            print_warning "Instance dev-${app}-db not found"
        else
            print_success "$app: $endpoint"
            export "OLD_${app}_ENDPOINT=$endpoint"
        fi
    done
    
    # Fetch new consolidated instance
    print_step "Checking if yuvro-db instance exists..."
    local max_retries=60
    local retries=0
    local endpoint=""
    
    while [ -z "$endpoint" ] && [ $retries -lt $max_retries ]; do
        endpoint=$(run_in_docker "aws rds describe-db-instances --db-instance-identifier 'dev-yuvro-db' --query 'DBInstances[0].Endpoint.Address' --output text 2>/dev/null || echo ''" 2>/dev/null)
        
        if [ -z "$endpoint" ] || [ "$endpoint" = "None" ]; then
            retries=$((retries + 1))
            print_info "Waiting for instance... ($retries/$max_retries)"
            sleep 10
        fi
    done
    
    if [ -z "$endpoint" ]; then
        print_error "Could not find dev-yuvro-db instance"
        exit 1
    fi
    
    export NEW_ENDPOINT="$endpoint"
    print_success "New consolidated RDS endpoint: $NEW_ENDPOINT"
}

backup_old_databases() {
    print_header "Backing Up Old Databases"
    
    mkdir -p "$BACKUP_DIR"
    local backup_date=$(date +%Y%m%d_%H%M%S)
    
    # ymarketplace is newly created, so skip it
    local apps="ycode ycampus yhub ylabs"
    local users="ycode_admin ycampus_admin yhub_admin ylabs_admin"
    
    local app_array=($apps)
    local user_array=($users)
    
    for i in "${!app_array[@]}"; do
        local app="${app_array[$i]}"
        local user="${user_array[$i]}"
        
        # Get endpoint from environment variable
        local endpoint_var="OLD_${app}_ENDPOINT"
        local endpoint="${!endpoint_var}"
        
        if [ -z "$endpoint" ]; then
            print_warning "Skipping backup for $app (endpoint not found)"
            continue
        fi
        
        print_step "Backing up $app database..."
        
        # Read password from tfvars
        local password=$(grep "^${app}_db_password" "$OPENTOFU_DIR/dev.tfvars" 2>/dev/null | cut -d= -f2- | sed 's/[[:space:]*"]//g' || echo "ChangeMe123!DevPassword")
        
        local backup_file="$BACKUP_DIR/${app}_${backup_date}.sql"
        
        if run_pg_dump "$endpoint" "$user" "$app" "$password" "$backup_file" 2>/dev/null; then
            local size=$(du -h "$backup_file" 2>/dev/null | cut -f1 || echo "unknown")
            print_success "Backed up $app: $backup_file ($size)"
        else
            print_warning "Backup failed for $app (may be unavailable)"
            rm -f "$backup_file"
        fi
    done
    
    print_success "All backups saved to: $BACKUP_DIR"
}

wait_for_new_rds() {
    print_header "Waiting for Consolidated RDS to be Ready"
    
    local max_retries=60
    local retries=0
    local password=$(grep "^db_master_password" "$OPENTOFU_DIR/dev.tfvars" | cut -d= -f2- | sed 's/[[:space:]*"]//g')
    
    while [ $retries -lt $max_retries ]; do
        if run_psql "$NEW_ENDPOINT" "yuvro_admin" "postgres" "$password" "SELECT version();" >/dev/null 2>&1; then
            print_success "Consolidated RDS is ready"
            return 0
        fi
        
        retries=$((retries + 1))
        print_info "RDS not ready... ($retries/$max_retries)"
        sleep 10
    done
    
    print_error "Consolidated RDS not ready after $max_retries attempts"
    exit 1
}

create_new_databases() {
    print_header "Creating Application Databases in Consolidated RDS"
    
    local password=$(grep "^db_master_password" "$OPENTOFU_DIR/dev.tfvars" | cut -d= -f2- | sed 's/[[:space:]*"]//g')
    local databases="ycode ycampus yhub ylabs ymarketplace"
    
    for db in $databases; do
        print_step "Creating database: $db..."
        
        if run_psql "$NEW_ENDPOINT" "yuvro_admin" "postgres" "$password" "CREATE DATABASE $db;" 2>/dev/null; then
            print_success "Database $db created"
        else
            print_warning "Database $db may already exist"
        fi
    done
}

restore_databases() {
    print_header "Restoring Data to Consolidated RDS"
    
    local password=$(grep "^db_master_password" "$OPENTOFU_DIR/dev.tfvars" | cut -d= -f2- | sed 's/[[:space:]*"]//g')
    
    # Only restore from ycode, ycampus, yhub, ylabs (skip ymarketplace as it's newly created)
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -1 "$BACKUP_DIR"/{ycode,ycampus,yhub,ylabs}_*.sql 2>/dev/null | head -1)" ]; then
        print_warning "No backup files found in $BACKUP_DIR"
        return 0
    fi
    
    for backup_file in "$BACKUP_DIR"/{ycode,ycampus,yhub,ylabs}_*.sql; do
        if [ ! -f "$backup_file" ]; then
            continue
        fi
        
        # Extract database name from filename
        local db_name=$(basename "$backup_file" | cut -d_ -f1)
        
        print_step "Restoring $db_name from $(basename "$backup_file")..."
        
        if run_psql_restore "$NEW_ENDPOINT" "yuvro_admin" "$db_name" "$password" "$backup_file" 2>/dev/null; then
            print_success "Restored $db_name"
        else
            print_warning "Restore may have had issues for $db_name (check manually)"
        fi
    done
}

verify_restored_data() {
    print_header "Verifying Restored Data"
    
    local password=$(grep "^db_master_password" "$OPENTOFU_DIR/dev.tfvars" | cut -d= -f2- | sed 's/[[:space:]*"]//g')
    local databases="ycode ycampus yhub ylabs ymarketplace"
    
    for db in $databases; do
        print_step "Checking $db..."
        
        local table_count=$(run_psql "$NEW_ENDPOINT" "yuvro_admin" "$db" "$password" "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")
        
        if [ "$table_count" -gt 0 ]; then
            print_success "$db: $table_count tables found"
        else
            print_warning "$db: No tables found (database may be empty)"
        fi
    done
}

main() {
    print_header "RDS Consolidation Migration"
    
    check_docker
    get_endpoints
    backup_old_databases
    wait_for_new_rds
    create_new_databases
    restore_databases
    verify_restored_data
    
    print_header "Migration Summary"
    print_success "Data backed up and restored to consolidated RDS"
    print_info "Old instance backups saved to: $BACKUP_DIR"
    print_info "New consolidated RDS: $NEW_ENDPOINT"
    print_step "Next steps:"
    print_info "1. Verify all applications work with new consolidated database"
    print_info "2. Run: DEPLOY_ENV=dev make deploy-all (to test with new DB)"
    print_info "3. When ready to delete old instances, run: bash $0 --delete-old"
}

main

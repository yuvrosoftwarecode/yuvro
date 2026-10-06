#!/bin/bash
# Migrate data from 5 separate RDS instances to single consolidated yuvro-dev-db instance

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

check_prerequisites() {
    print_header "Checking Prerequisites"
    local missing=0
    
    for tool in psql tofu aws; do
        if command -v "$tool" &>/dev/null; then
            print_success "$tool found"
        else
            print_error "$tool not installed"
            missing=1
        fi
    done
    
    if [ ! -f "$OPENTOFU_DIR/dev.tfvars" ]; then
        print_error "Missing: $OPENTOFU_DIR/dev.tfvars"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "Fix missing tools and retry"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

get_endpoints() {
    print_header "Fetching RDS Instance Endpoints"
    
    # Fetch old instances
    local apps="ycode ycampus yhub ylabs"
    
    for app in $apps; do
        print_step "Fetching dev-${app}-db endpoint..."
        local endpoint=$(aws rds describe-db-instances \
            --db-instance-identifier "dev-${app}-db" \
            --region ap-south-1 \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text 2>/dev/null || echo "")
        
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
        endpoint=$(aws rds describe-db-instances \
            --db-instance-identifier "dev-yuvro-db" \
            --region ap-south-1 \
            --query 'DBInstances[0].Endpoint.Address' \
            --output text 2>/dev/null || echo "")
        
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
        
        if PGPASSWORD="$password" pg_dump \
            -h "$endpoint" \
            -U "$user" \
            -d "$app" \
            --if-exists \
            --clean \
            --no-privileges \
            --no-owner \
            > "$backup_file" 2>/dev/null; then
            local size=$(du -h "$backup_file" | cut -f1)
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
        if PGPASSWORD="$password" psql -h "$NEW_ENDPOINT" -U yuvro_admin -d postgres -c "SELECT version();" >/dev/null 2>&1; then
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
        
        if PGPASSWORD="$password" psql \
            -h "$NEW_ENDPOINT" \
            -U yuvro_admin \
            -d postgres \
            -c "CREATE DATABASE $db;" 2>/dev/null; then
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
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -1 "$BACKUP_DIR"/{ycode,ycampus,yhub,ylabs}_*.sql 2>/dev/null)" ]; then
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
        
        if PGPASSWORD="$password" psql \
            -h "$NEW_ENDPOINT" \
            -U yuvro_admin \
            -d "$db_name" \
            -f "$backup_file" >/dev/null 2>&1; then
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
        
        local table_count=$(PGPASSWORD="$password" psql \
            -h "$NEW_ENDPOINT" \
            -U yuvro_admin \
            -d "$db" \
            -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
        
        if [ "$table_count" -gt 0 ]; then
            print_success "$db: $table_count tables found"
        else
            print_warning "$db: No tables found (database may be empty)"
        fi
    done
}

delete_old_instances() {
    print_header "Deleting Old RDS Instances"
    
    print_warning "This will delete the 4 old RDS instances. Make sure backups are verified first!"
    read -p "Continue with deletion? (yes/no) " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Skipped deletion"
        return 0
    fi
    
    cd "$OPENTOFU_DIR"
    
    print_step "Planning destruction of old RDS instances..."
    tofu plan -destroy -var-file="dev.tfvars" || {
        print_warning "Plan may show no changes (old modules already removed)"
    }
    
    print_warning "Old RDS instances will be destroyed via next OpenTofu apply"
    print_info "To complete deletion, run: DEPLOY_ENV=dev make provision-infra-destroy"
    
    cd "$PROJECT_ROOT"
}

main() {
    print_header "RDS Consolidation Migration"
    
    check_prerequisites
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

if [ "${1:-}" = "--delete-old" ]; then
    check_prerequisites
    get_endpoints
    delete_old_instances
else
    main
fi

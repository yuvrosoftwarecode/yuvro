#!/bin/bash
# Migrate data from 5 separate RDS instances to single consolidated yuvro-dev-db instance
# Runs on EC2 host with direct network access to RDS instances in VPC

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

# RDS endpoints (hardcoded - these are stable)
OLD_YCODE_ENDPOINT="dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
OLD_YCAMPUS_ENDPOINT="dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
OLD_YHUB_ENDPOINT="dev-yhub-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
OLD_YLABS_ENDPOINT="dev-ylabs-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
NEW_ENDPOINT="dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if we have psql available in Docker
    if ! command -v docker &>/dev/null; then
        print_error "Docker not installed"
        exit 1
    fi
    
    print_success "Docker is available"
    
    # Test if Docker can run postgres
    if ! docker run --rm postgres:15-alpine psql --version >/dev/null 2>&1; then
        print_error "Cannot run postgres:15-alpine Docker image"
        exit 1
    fi
    
    print_success "PostgreSQL Docker image ready"
}

get_endpoints() {
    print_header "RDS Endpoints"
    print_info "Old instances:"
    print_info "  ycode:   $OLD_YCODE_ENDPOINT"
    print_info "  ycampus: $OLD_YCAMPUS_ENDPOINT"
    print_info "  yhub:    $OLD_YHUB_ENDPOINT"
    print_info "  ylabs:   $OLD_YLABS_ENDPOINT"
    print_info "New consolidated:"
    print_info "  yuvro:   $NEW_ENDPOINT"
}

backup_old_databases() {
    print_header "Backing Up Old Databases"
    
    mkdir -p "$BACKUP_DIR"
    local backup_date=$(date +%Y%m%d_%H%M%S)
    
    # Define arrays for old instances
    local apps=("ycode" "ycampus" "yhub" "ylabs")
    local endpoints=("$OLD_YCODE_ENDPOINT" "$OLD_YCAMPUS_ENDPOINT" "$OLD_YHUB_ENDPOINT" "$OLD_YLABS_ENDPOINT")
    local users=("ycode_admin" "ycampus_admin" "yhub_admin" "ylabs_admin")
    
    for i in 0 1 2 3; do
        local app="${apps[$i]}"
        local endpoint="${endpoints[$i]}"
        local user="${users[$i]}"
        
        print_step "Backing up $app database..."
        
        # Read password from tfvars
        local password=$(grep "^${app}_db_password" "$OPENTOFU_DIR/dev.tfvars" 2>/dev/null | cut -d= -f2- | sed 's/[[:space:]*"]//g' || echo "ChangeMe123!DevPassword")
        
        local backup_file="$BACKUP_DIR/${app}_${backup_date}.sql"
        
        # Run pg_dump with docker using host network (runs on EC2 host network, not container network)
        local error_output=""
        error_output=$(docker run --rm --network host \
            -e PGPASSWORD="$password" \
            postgres:15-alpine \
            pg_dump -h "$endpoint" -U "$user" -d "$app" \
            --if-exists --clean --no-privileges --no-owner \
            > "$backup_file" 2>&1)
        
        if [ $? -eq 0 ] && [ -s "$backup_file" ]; then
            local size=$(du -h "$backup_file" 2>/dev/null | cut -f1)
            print_success "Backed up $app: $backup_file ($size)"
        else
            print_warning "Backup failed for $app"
            if [ -n "$error_output" ]; then
                print_info "Error: $error_output"
            fi
            rm -f "$backup_file"
        fi
    done
    
    print_success "All backups completed"
}

wait_for_new_rds() {
    print_header "Waiting for Consolidated RDS to be Ready"
    
    local max_retries=60
    local retries=0
    local password=$(grep "^db_master_password" "$OPENTOFU_DIR/dev.tfvars" | cut -d= -f2- | sed 's/[[:space:]*"]//g')
    
    while [ $retries -lt $max_retries ]; do
        if docker run --rm --network host \
            -e PGPASSWORD="$password" \
            postgres:15-alpine \
            psql -h "$NEW_ENDPOINT" -U yuvro_admin -d postgres -c "SELECT version();" >/dev/null 2>&1; then
            
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
        
        docker run --rm --network host \
            -e PGPASSWORD="$password" \
            postgres:15-alpine \
            psql -h "$NEW_ENDPOINT" -U yuvro_admin -d postgres \
            -c "CREATE DATABASE $db;" 2>/dev/null || true
        
        print_success "Database $db ready"
    done
}

restore_databases() {
    print_header "Restoring Data to Consolidated RDS"
    
    local password=$(grep "^db_master_password" "$OPENTOFU_DIR/dev.tfvars" | cut -d= -f2- | sed 's/[[:space:]*"]//g')
    
    # Find all backup files for ycode, ycampus, yhub, ylabs
    local backup_files=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql' | sort -r)
    
    if [ -z "$backup_files" ]; then
        print_warning "No backup files found in $BACKUP_DIR"
        return 0
    fi
    
    for backup_file in $backup_files; do
        # Extract database name from filename
        local db_name=$(basename "$backup_file" | cut -d_ -f1)
        
        # Skip if not one of the apps we want to restore
        case "$db_name" in
            ycode|ycampus|yhub|ylabs)
                print_step "Restoring $db_name from $(basename "$backup_file")..."
                
                docker run --rm --network host \
                    -e PGPASSWORD="$password" \
                    -v "$backup_file:/backup.sql:ro" \
                    postgres:15-alpine \
                    psql -h "$NEW_ENDPOINT" -U yuvro_admin -d "$db_name" \
                    -f /backup.sql 2>/dev/null || true
                
                print_success "Restored $db_name"
                ;;
            *)
                print_info "Skipping $db_name (not in migration list)"
                ;;
        esac
    done
}

verify_restored_data() {
    print_header "Verifying Restored Data"
    
    local password=$(grep "^db_master_password" "$OPENTOFU_DIR/dev.tfvars" | cut -d= -f2- | sed 's/[[:space:]*"]//g')
    local databases="ycode ycampus yhub ylabs ymarketplace"
    
    for db in $databases; do
        print_step "Checking $db..."
        
        local output=$(docker run --rm --network host \
            -e PGPASSWORD="$password" \
            postgres:15-alpine \
            psql -h "$NEW_ENDPOINT" -U yuvro_admin -d "$db" -t \
            -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null)
        
        local table_count=$(echo "$output" | grep -o '^[[:space:]]*[0-9]*' | xargs)
        
        if [ "$table_count" -gt 0 ]; then
            print_success "$db: $table_count tables found"
        else
            print_warning "$db: No tables found (database may be empty)"
        fi
    done
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
}

main

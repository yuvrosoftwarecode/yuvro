#!/bin/bash
# Truncate all tables in consolidated RDS and reload data from old RDS instances
# WARNING: This is DESTRUCTIVE - all data in dev-yuvro-db will be dropped and replaced

set -e

# Old RDS endpoints and credentials
declare -A OLD_RDS_ENDPOINTS=(
    [ycode]="dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
    [ycampus]="dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
    [yhub]="dev-yhub-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
    [ylabs]="dev-ylabs-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
)

declare -A OLD_RDS_USERS=(
    [ycode]="ycode_admin"
    [ycampus]="ycampus_admin"
    [yhub]="yhub_admin"
    [ylabs]="ylabs_admin"
)

# New consolidated RDS
NEW_RDS_HOST="dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
NEW_RDS_USER="yuvro_admin"
NEW_RDS_PASSWORD="ChangeMe123!DevPassword"
NEW_RDS_PORT=5432

PASSWORD="ChangeMe123!DevPassword"
DB_PORT=5432

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

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }
print_step() { echo -e "${BOLD}› $1${NC}"; }

# Set SSL mode
export PGPASSWORD="$PASSWORD"
export PGSSLMODE=allow

print_header "Consolidate RDS - Truncate and Reload Data"
print_info "This will DROP ALL DATA in dev-yuvro-db and reload from old instances"
print_warning "Make sure you have backups before proceeding!"

# Confirmation
echo ""
echo "⚠️  WARNING: This operation CANNOT be undone!"
echo ""
read -p "Type 'YES I UNDERSTAND' to continue: " response
if [ "$response" != "YES I UNDERSTAND" ]; then
    print_info "Cancelled"
    exit 0
fi

# Check requirements
print_header "Checking Requirements"

print_step "Checking PostgreSQL tools..."

if command -v pg_dump &> /dev/null; then
    print_success "pg_dump found: $(pg_dump --version)"
else
    print_error "pg_dump not found. Install PostgreSQL client:"
    print_info "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    print_info "  macOS: brew install postgresql"
    exit 1
fi

if command -v psql &> /dev/null; then
    print_success "psql found: $(psql --version)"
else
    print_error "psql not found"
    exit 1
fi

# Test connections
print_header "Testing Connections"

print_step "Testing connection to new consolidated RDS..."
if PGPASSWORD="$NEW_RDS_PASSWORD" psql \
    -h "$NEW_RDS_HOST" \
    -U "$NEW_RDS_USER" \
    -p "$NEW_RDS_PORT" \
    -d postgres \
    -c "SELECT version();" &>/dev/null; then
    print_success "Connected to new RDS"
else
    print_error "Cannot connect to new RDS"
    exit 1
fi

# Drop existing data
print_header "Dropping Existing Data"

for app_name in "${!OLD_RDS_ENDPOINTS[@]}"; do
    db_name="$app_name"
    
    print_step "Dropping tables from $db_name..."
    
    if PGPASSWORD="$NEW_RDS_PASSWORD" psql \
        -h "$NEW_RDS_HOST" \
        -U "$NEW_RDS_USER" \
        -p "$NEW_RDS_PORT" \
        -d "$db_name" \
        -c "DO \$\$ DECLARE r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END \$\$;" 2>/dev/null; then
        print_success "Dropped all tables from $db_name"
    else
        print_warning "Could not drop tables from $db_name, continuing anyway..."
    fi
done

# Reload data
print_header "Reloading Data from Old RDS Instances"

failed_count=0

for app_name in "${!OLD_RDS_ENDPOINTS[@]}"; do
    db_name="$app_name"
    old_endpoint="${OLD_RDS_ENDPOINTS[$app_name]}"
    old_user="${OLD_RDS_USERS[$app_name]}"
    
    print_step "Reloading $app_name database..."
    print_info "  Dumping from $old_endpoint..."
    
    if PGPASSWORD="$PASSWORD" pg_dump \
        -h "$old_endpoint" \
        -U "$old_user" \
        -d "$db_name" \
        -p "$DB_PORT" \
        --no-password \
        --verbose 2>/dev/null | \
       PGPASSWORD="$NEW_RDS_PASSWORD" psql \
        -h "$NEW_RDS_HOST" \
        -U "$NEW_RDS_USER" \
        -p "$NEW_RDS_PORT" \
        -d "$db_name" &>/dev/null; then
        print_success "$app_name data reloaded successfully"
    else
        print_error "Failed to reload $app_name"
        failed_count=$((failed_count + 1))
    fi
    
    echo ""
done

# Verify
print_header "Verifying Data Reload"

for app_name in "${!OLD_RDS_ENDPOINTS[@]}"; do
    db_name="$app_name"
    
    table_count=$(PGPASSWORD="$NEW_RDS_PASSWORD" psql \
        -h "$NEW_RDS_HOST" \
        -U "$NEW_RDS_USER" \
        -p "$NEW_RDS_PORT" \
        -d "$db_name" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
    
    print_success "$app_name: $table_count tables"
done

# Summary
print_header "Reload Summary"

total=${#OLD_RDS_ENDPOINTS[@]}
successful=$((total - failed_count))

print_success "Reloaded $successful/$total databases"

if [ $failed_count -gt 0 ]; then
    print_warning "Failed to reload $failed_count database(s)"
    exit 1
fi

print_success "All data reloaded successfully!"
print_info "Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

exit 0

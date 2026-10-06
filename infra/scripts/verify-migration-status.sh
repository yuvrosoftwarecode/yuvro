#!/bin/bash
# Verify RDS data migration status
# Shows which databases have data on the consolidated RDS instance

set -e

DB_HOST="dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
DB_USER="yuvro_admin"
DB_PASSWORD="ChangeMe123!DevPassword"
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

# Set environment for connections
export PGPASSWORD="$DB_PASSWORD"
export PGSSLMODE=allow

print_header "Verifying RDS Consolidation Migration Status"

# Test connection to consolidated RDS
print_info "Testing connection to consolidated RDS..."
if psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d postgres -c "SELECT version();" &>/dev/null; then
    print_success "Connected to consolidated RDS"
else
    print_error "Cannot connect to consolidated RDS"
    exit 1
fi

echo ""
print_header "Database Status"

# Check each database
for db_name in ycode ycampus yhub ylabs ymarketplace; do
    echo ""
    echo -e "${BOLD}Database: $db_name${NC}"
    
    # Check if database exists
    db_exists=$(psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d postgres -t -c "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname='$db_name');" 2>/dev/null | tr -d ' ')
    
    if [ "$db_exists" = "t" ]; then
        print_success "Database exists"
        
        # Count tables
        table_count=$(psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$db_name" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
        echo "  Tables: $table_count"
        
        # Count users
        user_count=$(psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$db_name" -t -c "SELECT COUNT(*) FROM auth_user;" 2>/dev/null | tr -d ' ')
        echo "  Users: $user_count"
        
        # Check for admin@yuvro.com user
        admin_exists=$(psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$db_name" -t -c "SELECT COUNT(*) FROM auth_user WHERE email='admin@yuvro.com';" 2>/dev/null | tr -d ' ')
        
        if [ "$admin_exists" -gt 0 ]; then
            print_success "admin@yuvro.com found"
        else
            print_warning "admin@yuvro.com NOT found"
        fi
        
    else
        print_error "Database does not exist"
    fi
done

echo ""
print_header "Migration Summary"

# Count how many databases have data
databases_with_data=0
databases_without_admin=0

for db_name in ycode ycampus yhub ylabs ymarketplace; do
    db_exists=$(psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d postgres -t -c "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname='$db_name');" 2>/dev/null | tr -d ' ')
    
    if [ "$db_exists" = "t" ]; then
        table_count=$(psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$db_name" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
        
        if [ "$table_count" -gt 0 ]; then
            databases_with_data=$((databases_with_data + 1))
        fi
        
        admin_exists=$(psql -h "$DB_HOST" -U "$DB_USER" -p "$DB_PORT" -d "$db_name" -t -c "SELECT COUNT(*) FROM auth_user WHERE email='admin@yuvro.com';" 2>/dev/null | tr -d ' ')
        
        if [ "$admin_exists" -eq 0 ]; then
            databases_without_admin=$((databases_without_admin + 1))
        fi
    fi
done

echo ""
print_info "Databases with data: $databases_with_data/5"
print_info "Databases missing admin@yuvro.com: $databases_without_admin/5"

if [ $databases_with_data -eq 5 ]; then
    print_success "All 5 databases have data"
else
    print_warning "Not all databases have data - migration may not be complete"
fi

if [ $databases_without_admin -gt 0 ]; then
    print_warning "Some databases missing admin@yuvro.com user"
    echo ""
    echo "To load fixtures and create admin user, run:"
    echo "  make setup-fixtures-data     # Load all fixtures"
    echo "  make setup-fixtures-data SERVICE=ycode  # Load specific app"
fi

echo ""

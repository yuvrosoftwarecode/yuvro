#!/bin/bash
# Compare row counts between old RDS instances and new consolidated RDS
# Verifies that all data was successfully migrated

set -e

# Old RDS endpoints (master users)
declare -A OLD_RDS=(
    [ycode]="dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:ycode_admin"
    [ycampus]="dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:ycampus_admin"
    [yhub]="dev-yhub-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:yhub_admin"
    [ylabs]="dev-ylabs-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com:ylabs_admin"
)

# New consolidated RDS
NEW_RDS_HOST="dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
NEW_RDS_USER="yuvro_admin"
NEW_RDS_PASSWORD="ChangeMe123!DevPassword"
NEW_RDS_PORT=5432

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
print_match() { echo -e "${GREEN}  ✓ $1${NC}"; }
print_mismatch() { echo -e "${RED}  ✗ MISMATCH: $1${NC}"; }

# Set environment for connections
export PGPASSWORD="$DB_PASSWORD"
export PGSSLMODE=allow

print_header "Comparing Row Counts: Old vs New RDS"

total_tables=0
matching_tables=0
mismatched_tables=0
missing_tables=0

for app_name in "${!OLD_RDS[@]}"; do
    db_name="$app_name"
    combined="${OLD_RDS[$app_name]}"
    old_endpoint="${combined%:*}"
    old_user="${combined#*:}"
    
    echo ""
    echo -e "${BOLD}════════════════════════════════════════════${NC}"
    echo -e "${BOLD}Database: $db_name${NC}"
    echo -e "${BOLD}════════════════════════════════════════════${NC}"
    
    # Get list of tables from old database
    echo ""
    print_info "Fetching table list from old RDS ($old_endpoint)..."
    
    old_tables=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$old_endpoint" \
        -U "$old_user" \
        -p "$DB_PORT" \
        -d "$db_name" \
        -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>/dev/null || echo "")
    
    if [ -z "$old_tables" ]; then
        print_warning "Could not connect to old $app_name database"
        continue
    fi
    
    # For each table, compare row counts
    echo ""
    print_info "Comparing row counts..."
    echo ""
    
    table_matches=0
    table_mismatches=0
    table_missing=0
    
    while IFS= read -r table_name; do
        [ -z "$table_name" ] && continue
        
        total_tables=$((total_tables + 1))
        
        # Get old row count
        old_count=$(PGPASSWORD="$DB_PASSWORD" psql \
            -h "$old_endpoint" \
            -U "$old_user" \
            -p "$DB_PORT" \
            -d "$db_name" \
            -t -c "SELECT COUNT(*) FROM \"$table_name\";" 2>/dev/null | tr -d ' ')
        
        # Get new row count
        new_count=$(PGPASSWORD="$NEW_RDS_PASSWORD" psql \
            -h "$NEW_RDS_HOST" \
            -U "$NEW_RDS_USER" \
            -p "$NEW_RDS_PORT" \
            -d "$db_name" \
            -t -c "SELECT COUNT(*) FROM \"$table_name\";" 2>/dev/null | tr -d ' ')
        
        if [ -z "$new_count" ]; then
            print_mismatch "$db_name.$table_name missing in new RDS"
            table_missing=$((table_missing + 1))
            missing_tables=$((missing_tables + 1))
        elif [ "$old_count" = "$new_count" ]; then
            print_match "$db_name.$table_name: $old_count rows"
            table_matches=$((table_matches + 1))
            matching_tables=$((matching_tables + 1))
        else
            print_mismatch "$db_name.$table_name: old=$old_count, new=$new_count"
            table_mismatches=$((table_mismatches + 1))
            mismatched_tables=$((mismatched_tables + 1))
        fi
    done <<< "$old_tables"
    
    # Summary for this database
    echo ""
    echo -e "${BOLD}Summary for $app_name:${NC}"
    echo "  Tables checked: $((table_matches + table_mismatches + table_missing))"
    print_success "Matching: $table_matches"
    if [ $table_mismatches -gt 0 ]; then
        print_error "Mismatched: $table_mismatches"
    fi
    if [ $table_missing -gt 0 ]; then
        print_error "Missing in new: $table_missing"
    fi
done

# Overall summary
echo ""
print_header "Overall Migration Verification"

echo ""
echo "Total tables checked: $total_tables"
print_success "Matching row counts: $matching_tables"

if [ $mismatched_tables -gt 0 ]; then
    print_error "Mismatched row counts: $mismatched_tables"
fi

if [ $missing_tables -gt 0 ]; then
    print_error "Missing in new RDS: $missing_tables"
fi

echo ""

if [ $mismatched_tables -eq 0 ] && [ $missing_tables -eq 0 ]; then
    print_success "Migration verification PASSED - All row counts match!"
    exit 0
else
    print_error "Migration verification FAILED - Discrepancies found"
    echo ""
    echo "Next steps:"
    echo "1. Check above for specific mismatches"
    echo "2. If tables missing: migration may be incomplete"
    echo "3. If row counts differ: re-run migration or check data integrity"
    exit 1
fi

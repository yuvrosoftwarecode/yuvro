#!/bin/bash

################################################################################
# Migrate Data from Dev RDS (dev-yuvro-db) to Prod RDS (prod-yuvro-db)
# 
# This script:
# 1. Connects to dev-yuvro-db
# 2. Dumps all databases (ycode, ycampus, ylabs, yhub, ymarketplace)
# 3. Connects to prod-yuvro-db
# 4. Restores all databases
# 5. Verifies row counts match
#
# Prerequisites:
# - Both RDS instances must exist and be accessible
# - Must have PostgreSQL client tools installed (pg_dump, psql)
# - Must have AWS credentials configured
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEV_RDS_HOST="${DEV_RDS_HOST:-dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com}"
PROD_RDS_HOST="${PROD_RDS_HOST:-prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com}"
RDS_PORT="${RDS_PORT:-5432}"
RDS_USER="${RDS_USER:-yuvro_admin}"
RDS_PASSWORD="${RDS_PASSWORD:-ChangeMe123!DevPassword}"
PROD_PASSWORD="${PROD_PASSWORD:-ChangeMe123!ProdPassword}"

DATABASES=("ycode" "ycampus" "ylabs" "yhub" "ymarketplace")
DUMP_DIR="/tmp/yuvro-migration-$(date +%s)"
PGSSLMODE="allow"

# Helper functions
print_step() {
  echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

# Create dump directory
print_step "Creating dump directory: $DUMP_DIR"
mkdir -p "$DUMP_DIR"

# Verify connectivity to both RDS instances
print_step "Verifying connectivity to dev RDS..."
PGPASSWORD="$RDS_PASSWORD" PGSSLMODE="$PGSSLMODE" psql \
  -h "$DEV_RDS_HOST" \
  -U "$RDS_USER" \
  -d postgres \
  -c "SELECT version();" > /dev/null || print_error "Cannot connect to dev RDS"
print_success "Connected to dev RDS"

print_step "Verifying connectivity to prod RDS..."
PGPASSWORD="$PROD_PASSWORD" PGSSLMODE="$PGSSLMODE" psql \
  -h "$PROD_RDS_HOST" \
  -U "$RDS_USER" \
  -d postgres \
  -c "SELECT version();" > /dev/null || print_error "Cannot connect to prod RDS"
print_success "Connected to prod RDS"

# Get row counts from dev before migration
print_step "Getting row counts from dev databases..."
declare -A DEV_ROW_COUNTS

for db in "${DATABASES[@]}"; do
  print_step "Counting rows in dev.$db..."
  row_count=$(PGPASSWORD="$RDS_PASSWORD" PGSSLMODE="$PGSSLMODE" psql \
    -h "$DEV_RDS_HOST" \
    -U "$RDS_USER" \
    -d "$db" \
    -t -c "SELECT sum(n_live_tup) FROM pg_stat_user_tables;" 2>/dev/null | xargs)
  
  DEV_ROW_COUNTS["$db"]=${row_count:-0}
  echo "  $db: ${DEV_ROW_COUNTS[$db]} rows"
done

# Dump all databases from dev
print_step "Dumping all databases from dev RDS..."
for db in "${DATABASES[@]}"; do
  print_step "Dumping $db from dev..."
  PGPASSWORD="$RDS_PASSWORD" PGSSLMODE="$PGSSLMODE" pg_dump \
    -h "$DEV_RDS_HOST" \
    -U "$RDS_USER" \
    -d "$db" \
    -F c \
    -f "$DUMP_DIR/$db.dump" \
    --verbose 2>&1 | tail -5
  
  dump_size=$(du -h "$DUMP_DIR/$db.dump" | awk '{print $1}')
  print_success "$db dumped (size: $dump_size)"
done

# Create databases in prod (if they don't exist)
print_step "Creating databases in prod RDS..."
for db in "${DATABASES[@]}"; do
  PGPASSWORD="$PROD_PASSWORD" PGSSLMODE="$PGSSLMODE" psql \
    -h "$PROD_RDS_HOST" \
    -U "$RDS_USER" \
    -d postgres \
    -tc "SELECT 1 FROM pg_database WHERE datname = '$db';" | grep -q 1 || \
  PGPASSWORD="$PROD_PASSWORD" PGSSLMODE="$PGSSLMODE" psql \
    -h "$PROD_RDS_HOST" \
    -U "$RDS_USER" \
    -d postgres \
    -c "CREATE DATABASE $db;"
  
  print_success "Database $db ready in prod"
done

# Restore all databases to prod
print_step "Restoring all databases to prod RDS..."
for db in "${DATABASES[@]}"; do
  print_step "Restoring $db to prod..."
  PGPASSWORD="$PROD_PASSWORD" PGSSLMODE="$PGSSLMODE" pg_restore \
    -h "$PROD_RDS_HOST" \
    -U "$RDS_USER" \
    -d "$db" \
    -F c \
    "$DUMP_DIR/$db.dump" \
    --verbose 2>&1 | tail -5
  
  print_success "$db restored to prod"
done

# Verify row counts match
print_step "Verifying data integrity..."
declare -A PROD_ROW_COUNTS
all_match=true

for db in "${DATABASES[@]}"; do
  dev_count=${DEV_ROW_COUNTS[$db]}
  
  prod_count=$(PGPASSWORD="$PROD_PASSWORD" PGSSLMODE="$PGSSLMODE" psql \
    -h "$PROD_RDS_HOST" \
    -U "$RDS_USER" \
    -d "$db" \
    -t -c "SELECT sum(n_live_tup) FROM pg_stat_user_tables;" 2>/dev/null | xargs)
  
  PROD_ROW_COUNTS["$db"]=${prod_count:-0}
  
  if [ "$dev_count" = "$prod_count" ]; then
    print_success "$db: $dev_count rows match between dev and prod"
  else
    print_warning "$db: dev=$dev_count rows, prod=$prod_count rows (may differ due to activity during migration)"
    all_match=false
  fi
done

# Cleanup
print_step "Cleaning up dump files..."
rm -rf "$DUMP_DIR"
print_success "Migration dump directory removed"

# Summary
echo ""
echo "=========================================="
echo "Migration Summary"
echo "=========================================="
echo "Dev RDS:  $DEV_RDS_HOST"
echo "Prod RDS: $PROD_RDS_HOST"
echo "Databases: ${DATABASES[*]}"
echo ""
echo "Row Counts:"
for db in "${DATABASES[@]}"; do
  echo "  $db: dev=${DEV_ROW_COUNTS[$db]}, prod=${PROD_ROW_COUNTS[$db]}"
done
echo ""

if [ "$all_match" = true ]; then
  print_success "✅ Migration completed successfully with data verification!"
else
  print_warning "⚠️ Migration completed but row counts differ. Please verify data integrity."
fi

echo "=========================================="

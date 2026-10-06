#!/bin/bash
# Create PostgreSQL databases in consolidated RDS instance
# This is called by deploy scripts AFTER RDS is available
# Typically not needed - Django migrations create databases automatically
#
# Usage: bash infra/scripts/create-databases.sh <db_host> <db_user> <db_password>

set -e

DB_HOST="${1:-}"
DB_USER="${2:-}"
DB_PASSWORD="${3:-}"
DB_PORT="${4:-5432}"

if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "Usage: bash $0 <db_host> <db_user> <db_password> [db_port]"
    exit 1
fi

echo "Creating databases in RDS at $DB_HOST..."

for db in ycode ycampus yhub ylabs ymarketplace; do
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "CREATE DATABASE $db;" 2>&1 | grep -v "already exists" || true
    echo "✓ $db"
done

echo "✓ All databases created (or already exist)"


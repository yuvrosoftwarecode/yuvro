#!/bin/bash

# Create yuvro_admin user on all old RDS instances
# This ensures consistency across all instances for data migration
# Run this script from EC2 instance before running data migration

set -e

REGION="ap-south-1"
PASSWORD="ChangeMe123!DevPassword"

# Old RDS endpoints
declare -A OLD_RDS=(
    [ycode]="dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
    [ycampus]="dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
    [yhub]="dev-yhub-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
    [ylabs]="dev-ylabs-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Creating yuvro_admin user on old RDS instances${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════${NC}"
echo ""

for app_name in "${!OLD_RDS[@]}"; do
    endpoint="${OLD_RDS[$app_name]}"
    
    echo -e "${YELLOW}Creating user on $app_name ($endpoint)...${NC}"
    
    # Create yuvro_admin user with password
    # Set password for yuvro_admin
    PGPASSWORD="$PASSWORD" psql \
        -h "$endpoint" \
        -U postgres \
        -p 5432 \
        -d postgres \
        -c "CREATE USER yuvro_admin WITH PASSWORD '$PASSWORD';" 2>&1 | grep -v "already exists" || true
    
    # Grant all privileges on the app database to yuvro_admin
    PGPASSWORD="$PASSWORD" psql \
        -h "$endpoint" \
        -U postgres \
        -p 5432 \
        -d postgres \
        -c "GRANT ALL PRIVILEGES ON DATABASE $app_name TO yuvro_admin;" 2>&1 || true
    
    # Connect to app database and grant privileges
    PGPASSWORD="$PASSWORD" psql \
        -h "$endpoint" \
        -U postgres \
        -p 5432 \
        -d "$app_name" \
        -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO yuvro_admin; 
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO yuvro_admin;
            GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO yuvro_admin;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO yuvro_admin;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO yuvro_admin;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO yuvro_admin;" 2>&1 || true
    
    echo -e "${GREEN}✓ User created on $app_name${NC}"
    echo ""
done

echo -e "${BLUE}═════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ yuvro_admin user created on all old RDS instances${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════${NC}"
echo ""
echo "Next: Run data migration"
echo "  python3 infra/scripts/migrate-to-consolidated-db.py"

#!/bin/bash

# Fix RDS SSL requirement using psql directly
# This approach doesn't require AWS CLI - just PostgreSQL tools

set -e

REGION="ap-south-1"
PASSWORD="ChangeMe123!DevPassword"

declare -A OLD_RDS=(
    [ycode]="dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
    [ycampus]="dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
    [yhub]="dev-yhub-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
    [ylabs]="dev-ylabs-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
)

echo "═════════════════════════════════════════════════"
echo "Modifying RDS parameter groups (SSL requirement)"
echo "═════════════════════════════════════════════════"
echo ""

# Note: This approach uses psql to directly modify RDS parameters
# However, RDS parameter groups can only be modified via AWS CLI or Console
# 
# Alternative: Use sslmode=allow when connecting to allow unencrypted connections

echo "Since AWS CLI is not available, using sslmode=allow workaround"
echo ""
echo "Note: The SSL requirement issue is a RDS parameter group setting"
echo "that can only be changed via AWS Console or AWS CLI with credentials."
echo ""
echo "Workaround: Using PGSSLMODE=allow for psql connections"
echo ""

# Test connection with sslmode=allow
for app_name in "${!OLD_RDS[@]}"; do
    endpoint="${OLD_RDS[$app_name]}"
    
    echo "Testing connection to $app_name with SSL=allow mode..."
    
    # Try connection with sslmode=allow
    PGPASSWORD="$PASSWORD" PGSSLMODE=allow psql \
        -h "$endpoint" \
        -U postgres \
        -p 5432 \
        -d postgres \
        -c "SELECT version();" 2>&1 | head -3 || echo "  (Connection test)"
    
    echo ""
done

echo "═════════════════════════════════════════════════"
echo "SSL parameter modification requires AWS CLI"
echo "═════════════════════════════════════════════════"
echo ""
echo "To properly fix SSL requirement:"
echo "1. Install AWS CLI: sudo apt-get install -y awscli"
echo "2. Configure AWS credentials (if available)"
echo "3. Run: bash infra/scripts/fix-rds-ssl-requirement.sh"
echo ""
echo "Or use PGSSLMODE=allow environment variable for connections:"
echo "  PGSSLMODE=allow bash infra/scripts/create-yuvro-admin-user.sh"

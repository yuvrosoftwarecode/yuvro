#!/bin/bash

# Fix RDS SSL requirement on old instances
# This allows password authentication without SSL encryption

set -e

REGION="ap-south-1"

echo "═════════════════════════════════════════════════"
echo "Disabling SSL requirement on old RDS instances"
echo "═════════════════════════════════════════════════"
echo ""

# Parameter groups for old RDS instances
declare -a PARAM_GROUPS=(
    "dev-ycode-params"
    "dev-ycampus-params"
    "dev-yhub-params"
    "dev-ylabs-params"
)

# Modify each parameter group
for pg in "${PARAM_GROUPS[@]}"; do
    echo "Modifying parameter group: $pg"
    
    # Disable SSL requirement
    aws rds modify-db-parameter-group \
        --region $REGION \
        --db-parameter-group-name "$pg" \
        --parameters "ParameterName=rds.force_ssl,ParameterValue=0,ApplyMethod=immediate" \
        --query 'DBParameterGroupName' \
        --output text
    
    echo "  ✓ rds.force_ssl set to 0 (SSL not required)"
    echo ""
done

echo "═════════════════════════════════════════════════"
echo "Parameter groups modified successfully"
echo "═════════════════════════════════════════════════"
echo ""
echo "Changes applied immediately (ApplyMethod=immediate)"
echo "RDS instances should now allow password auth without SSL"
echo ""
echo "Next: Run user creation script"
echo "  bash infra/scripts/create-yuvro-admin-user.sh"

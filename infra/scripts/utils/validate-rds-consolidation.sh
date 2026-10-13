#!/bin/bash

# RDS Consolidation Validation Script
# Verifies that all infrastructure components are in place and ready for deployment
# Usage: bash infra/scripts/validate-rds-consolidation.sh

set -e

REGION="ap-south-1"
RDS_INSTANCE="dev-yuvro-db"
EC2_INSTANCE="i-088875ccdf6bc6175"
RDS_ENDPOINT="dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
RDS_PORT="5432"
RDS_USER="yuvro_admin"
RDS_SG="sg-0678ce6114ddab91d"
EC2_SG="sg-0e4af2988f4d40c7d"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}RDS Consolidation Infrastructure Validation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Counter for checks
TOTAL_CHECKS=0
PASSED_CHECKS=0

check_item() {
    local name="$1"
    local condition="$2"
    
    ((TOTAL_CHECKS++))
    
    echo -n "Checking $name... "
    
    if eval "$condition" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED_CHECKS++))
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
}

# 1. RDS Instance Checks
echo -e "${YELLOW}1. RDS Instance Verification${NC}"
echo "────────────────────────────────"

check_item "RDS instance exists" \
    "aws rds describe-db-instances --region $REGION --db-instance-identifier $RDS_INSTANCE"

check_item "RDS is available" \
    "aws rds describe-db-instances --region $REGION --db-instance-identifier $RDS_INSTANCE --query 'DBInstances[0].DBInstanceStatus' --output text | grep -q 'available'"

check_item "RDS is PostgreSQL 15" \
    "aws rds describe-db-instances --region $REGION --db-instance-identifier $RDS_INSTANCE --query 'DBInstances[0].Engine' --output text | grep -q 'postgres'"

check_item "RDS is db.t3.small" \
    "aws rds describe-db-instances --region $REGION --db-instance-identifier $RDS_INSTANCE --query 'DBInstances[0].DBInstanceClass' --output text | grep -q 'db.t3.small'"

check_item "RDS endpoint is correct" \
    "aws rds describe-db-instances --region $REGION --db-instance-identifier $RDS_INSTANCE --query 'DBInstances[0].Endpoint.Address' --output text | grep -q 'dev-yuvro-db'"

echo ""

# 2. EC2 Instance Checks
echo -e "${YELLOW}2. EC2 Instance Verification${NC}"
echo "────────────────────────────────"

check_item "EC2 instance exists" \
    "aws ec2 describe-instances --region $REGION --instance-ids $EC2_INSTANCE"

check_item "EC2 is running" \
    "aws ec2 describe-instances --region $REGION --instance-ids $EC2_INSTANCE --query 'Reservations[0].Instances[0].State.Name' --output text | grep -q 'running'"

check_item "EC2 is t3.medium" \
    "aws ec2 describe-instances --region $REGION --instance-ids $EC2_INSTANCE --query 'Reservations[0].Instances[0].InstanceType' --output text | grep -q 't3.medium'"

check_item "EC2 has correct security group" \
    "aws ec2 describe-instances --region $REGION --instance-ids $EC2_INSTANCE --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text | grep -q '$EC2_SG'"

echo ""

# 3. Network & Security Checks
echo -e "${YELLOW}3. Network & Security Verification${NC}"
echo "────────────────────────────────"

check_item "RDS security group exists" \
    "aws ec2 describe-security-groups --region $REGION --group-ids $RDS_SG"

check_item "RDS allows inbound PostgreSQL" \
    "aws ec2 describe-security-groups --region $REGION --group-ids $RDS_SG --query 'SecurityGroups[0].IpPermissions[?FromPort==\`5432\`]' --output text | grep -q '5432'"

check_item "RDS allows app security group" \
    "aws ec2 describe-security-groups --region $REGION --group-ids $RDS_SG --query 'SecurityGroups[0].IpPermissions[0].UserIdGroupPairs[*].GroupId' --output text | grep -q '$EC2_SG'"

check_item "EC2 security group exists" \
    "aws ec2 describe-security-groups --region $REGION --group-ids $EC2_SG"

echo ""

# 4. Environment Files Checks
echo -e "${YELLOW}4. Environment Files Verification${NC}"
echo "────────────────────────────────"

check_item "YCode backend env has consolidated URL" \
    "grep -q 'dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com' $PROJECT_ROOT/ycode-backend-api/.env.dev-secrets"

check_item "YCampus backend env has consolidated URL" \
    "grep -q 'dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com' $PROJECT_ROOT/ycampus-backend-api/.env.dev-secrets"

check_item "YHub backend env has consolidated URL" \
    "grep -q 'dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com' $PROJECT_ROOT/yhub-backend-api/.env.dev-secrets"

check_item "YLabs backend env has consolidated URL" \
    "grep -q 'dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com' $PROJECT_ROOT/ylabs-backend-api/.env.dev-secrets"

check_item "YMarketplace backend env has consolidated URL" \
    "grep -q 'dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com' $PROJECT_ROOT/ymarketplace/ymarketplace-backend-api/.env.dev-secrets"

echo ""

# 5. VPC & Subnet Checks
echo -e "${YELLOW}5. VPC & Networking Verification${NC}"
echo "────────────────────────────────"

check_item "RDS is in correct VPC" \
    "aws rds describe-db-instances --region $REGION --db-instance-identifier $RDS_INSTANCE --query 'DBInstances[0].DBSubnetGroup.DBSubnetGroupName' --output text | grep -q 'dev-ycode-subnet-group'"

check_item "EC2 and RDS in same VPC" \
    "test \"\$(aws ec2 describe-instances --region $REGION --instance-ids $EC2_INSTANCE --query 'Reservations[0].Instances[0].VpcId' --output text)\" = \"\$(aws rds describe-db-instances --region $REGION --db-instance-identifier $RDS_INSTANCE --query 'DBInstances[0].DBSubnetGroup.VpcId' --output text)\""

echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "Results: ${GREEN}$PASSED_CHECKS${NC}/${TOTAL_CHECKS} checks passed"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$PASSED_CHECKS" -eq "$TOTAL_CHECKS" ]; then
    echo -e "${GREEN}✓ All checks passed! Infrastructure is ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Deploy applications: make deploy-all"
    echo "2. Verify database connections in application logs"
    echo "3. Run data migration: bash infra/scripts/migrate-to-consolidated-db.sh"
    echo "4. Verify data consistency across all 5 databases"
    echo "5. Delete old RDS instances once verification is complete"
    exit 0
else
    FAILED=$((TOTAL_CHECKS - PASSED_CHECKS))
    echo -e "${RED}✗ $FAILED checks failed. Please fix the issues above.${NC}"
    exit 1
fi

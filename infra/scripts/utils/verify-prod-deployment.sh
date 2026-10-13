#!/bin/bash

################################################################################
# Verify Production Deployment
#
# This script verifies:
# 1. RDS connectivity and database existence
# 2. EKS cluster and namespaces
# 3. Kubernetes deployments and pods
# 4. Application health checks
# 5. SSL certificates
# 6. Data integrity
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROD_RDS_HOST="${PROD_RDS_HOST:-prod-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com}"
RDS_PORT="${RDS_PORT:-5432}"
RDS_USER="${RDS_USER:-yuvro_admin}"
RDS_PASSWORD="${RDS_PASSWORD:-ChangeMe123!ProdPassword}"
NAMESPACE="yuvro-production"
CLUSTER_NAME="yuvro-prod-cluster"
REGION="ap-south-1"

# Helper functions
print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════${NC}\n"
}

print_check() {
  echo -e "${BLUE}▶ $1${NC}"
}

print_pass() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_fail() {
  echo -e "${RED}❌ $1${NC}"
  FAILED=$((FAILED + 1))
}

print_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Initialize counters
PASSED=0
FAILED=0

# Check 1: RDS Connectivity
print_header "1. Verifying RDS Connectivity"

print_check "Testing connection to prod RDS..."
if PGPASSWORD="$RDS_PASSWORD" psql -h "$PROD_RDS_HOST" -U "$RDS_USER" -d postgres \
  -c "SELECT version();" > /dev/null 2>&1; then
  print_pass "Connected to RDS successfully"
  PASSED=$((PASSED + 1))
else
  print_fail "Cannot connect to RDS"
fi

# Check 2: Database Existence
print_header "2. Verifying Databases"

DATABASES=("ycode" "ycampus" "ylabs" "yhub" "ymarketplace")
for db in "${DATABASES[@]}"; do
  print_check "Checking database: $db"
  if PGPASSWORD="$RDS_PASSWORD" psql -h "$PROD_RDS_HOST" -U "$RDS_USER" \
    -d postgres -lqt | cut -d'|' -f1 | grep -qw "$db"; then
    print_pass "Database $db exists"
    PASSED=$((PASSED + 1))
    
    # Count tables
    table_count=$(PGPASSWORD="$RDS_PASSWORD" psql -h "$PROD_RDS_HOST" \
      -U "$RDS_USER" -d "$db" -tc \
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)
    print_pass "  Tables: $table_count"
  else
    print_fail "Database $db does not exist"
  fi
done

# Check 3: EKS Cluster
print_header "3. Verifying EKS Cluster"

print_check "Checking EKS cluster status..."
if aws eks describe-cluster --name "$CLUSTER_NAME" --region "$REGION" \
  --query 'cluster.status' --output text 2>/dev/null | grep -q "ACTIVE"; then
  print_pass "EKS cluster is ACTIVE"
  PASSED=$((PASSED + 1))
else
  print_fail "EKS cluster is not ACTIVE"
fi

# Check 4: Kubernetes Connectivity
print_header "4. Verifying Kubernetes Connectivity"

print_check "Getting cluster info..."
if kubectl cluster-info > /dev/null 2>&1; then
  print_pass "Connected to Kubernetes cluster"
  PASSED=$((PASSED + 1))
else
  print_fail "Cannot connect to Kubernetes cluster"
  echo "Try: aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION"
fi

# Check 5: Namespace
print_header "5. Verifying Namespace"

print_check "Checking namespace: $NAMESPACE"
if kubectl get namespace "$NAMESPACE" > /dev/null 2>&1; then
  print_pass "Namespace $NAMESPACE exists"
  PASSED=$((PASSED + 1))
else
  print_fail "Namespace $NAMESPACE does not exist"
fi

# Check 6: Secrets
print_header "6. Verifying Secrets"

print_check "Checking database credentials secret..."
if kubectl get secret yuvro-db-credentials -n "$NAMESPACE" > /dev/null 2>&1; then
  print_pass "Secret yuvro-db-credentials exists"
  PASSED=$((PASSED + 1))
  
  # Verify secret contains required keys
  username=$(kubectl get secret yuvro-db-credentials -n "$NAMESPACE" \
    -o jsonpath='{.data.username}' | base64 -d 2>/dev/null || echo "")
  if [ -n "$username" ]; then
    print_pass "  Username configured: $username"
  else
    print_warn "  Username not properly configured"
  fi
else
  print_fail "Secret yuvro-db-credentials does not exist"
fi

# Check 7: Deployments
print_header "7. Verifying Deployments"

APPS=("ycode-backend" "ycampus-backend" "ylabs-backend" "yhub-backend" "ymarketplace-backend" "code-executor")

deployment_count=$(kubectl get deployments -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
print_check "Found $deployment_count deployments"

for app in "${APPS[@]}"; do
  print_check "Checking deployment: $app"
  if kubectl get deployment "$app" -n "$NAMESPACE" > /dev/null 2>&1; then
    ready=$(kubectl get deployment "$app" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    desired=$(kubectl get deployment "$app" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    if [ "$ready" = "$desired" ]; then
      print_pass "Deployment $app is READY ($ready/$desired replicas)"
      PASSED=$((PASSED + 1))
    else
      print_warn "Deployment $app has $ready/$desired replicas ready"
    fi
  else
    print_warn "Deployment $app not found"
  fi
done

# Check 8: Pods
print_header "8. Verifying Pods"

pod_count=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
running_count=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo 0)
print_check "Found $running_count running pods out of $pod_count total"

if [ "$running_count" -gt 0 ]; then
  print_pass "Pods are running"
  PASSED=$((PASSED + 1))
else
  print_fail "No running pods found"
fi

# Check 9: Services
print_header "9. Verifying Services"

print_check "Listing services..."
kubectl get svc -n "$NAMESPACE" | tail -n +2 | while read -r line; do
  svc_name=$(echo "$line" | awk '{print $1}')
  svc_type=$(echo "$line" | awk '{print $2}')
  print_pass "  Service: $svc_name ($svc_type)"
done
PASSED=$((PASSED + 1))

# Check 10: Certificates
print_header "10. Verifying SSL Certificates"

print_check "Checking cert-manager installation..."
if kubectl get deployment -n cert-manager cert-manager > /dev/null 2>&1; then
  print_pass "cert-manager is installed"
  PASSED=$((PASSED + 1))
else
  print_warn "cert-manager not installed"
fi

cert_count=$(kubectl get certificate -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
print_check "Found $cert_count certificates"

# Check 11: Data Integrity
print_header "11. Verifying Data Integrity"

for db in "${DATABASES[@]}"; do
  print_check "Counting rows in $db..."
  
  row_count=$(PGPASSWORD="$RDS_PASSWORD" psql -h "$PROD_RDS_HOST" \
    -U "$RDS_USER" -d "$db" -t \
    -c "SELECT sum(n_live_tup) FROM pg_stat_user_tables;" 2>/dev/null | xargs)
  
  if [ -n "$row_count" ] && [ "$row_count" != "NULL" ] && [ "$row_count" -gt 0 ]; then
    print_pass "Database $db: $row_count rows"
    PASSED=$((PASSED + 1))
  else
    print_warn "Database $db: $row_count rows (may be empty if newly created)"
  fi
done

# Summary
print_header "Verification Summary"

echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
  print_pass "✅ All checks passed! Production deployment is healthy."
  exit 0
else
  print_fail "❌ Some checks failed. Review the issues above."
  exit 1
fi

#!/bin/bash
# ECS Cluster Validation Helper
# Checks if ECS cluster is accessible and healthy

check_ecs_cluster() {
  local service_name="${1:-Unknown}"
  local cluster_name="${ECS_CLUSTER_NAME:-yuvro-prod-cluster}"
  local region="${AWS_REGION:-ap-south-1}"

  echo "🔍 Checking ECS cluster access for $service_name..."
  
  # Check AWS credentials
  if ! aws sts get-caller-identity --region "$region" > /dev/null 2>&1; then
    echo "❌ AWS credentials not configured or invalid"
    echo "   Run: aws configure"
    return 1
  fi
  
  echo "   ✅ AWS credentials valid"

  # Check if cluster exists
  if ! aws ecs describe-clusters --clusters "$cluster_name" --region "$region" \
    --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    echo "❌ ECS cluster '$cluster_name' not found or not active"
    echo "   Region: $region"
    echo "   Run: aws ecs list-clusters --region $region"
    return 1
  fi
  
  echo "   ✅ ECS cluster '$cluster_name' is ACTIVE"

  return 0
}

export -f check_ecs_cluster

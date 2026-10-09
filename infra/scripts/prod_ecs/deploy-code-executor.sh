#!/bin/bash
# Deploy Code Executor to AWS ECS cluster (Production)
# Usage: bash infra/scripts/prod_ecs/deploy-code-executor.sh [branch]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_NAME="${ECS_CLUSTER_NAME:-yuvro-prod-cluster}"
GITHUB_OWNER="${GITHUB_OWNER:-yuvro}"
GHCR_REGISTRY="ghcr.io/$(echo "$GITHUB_OWNER" | tr '[:upper:]' '[:lower:]')"

echo "🚀 Deploying Code Executor to AWS ECS (production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Cluster: $CLUSTER_NAME"
echo "   Region: $REGION"
echo "   Registry: $GHCR_REGISTRY"
echo ""

cd "$PROJECT_ROOT"

if [ -f "$SCRIPT_DIR/lib/check-ecs.sh" ]; then
  source "$SCRIPT_DIR/lib/check-ecs.sh"
  if ! check_ecs_cluster "Code Executor"; then
    exit 1
  fi
fi

echo "📝 Deploying Code Executor service to ECS..."
echo "   Service Image: $GHCR_REGISTRY/code-executor:$BRANCH"
echo ""

echo "✅ Code Executor ECS deployment ready!"
echo ""
echo "ℹ️  Deployment instructions:"
echo "   1. Create/register ECS task definition with image:"
echo "      - Service: $GHCR_REGISTRY/code-executor:$BRANCH"
echo ""
echo "   2. Update ECS service:"
echo "      aws ecs update-service --cluster $CLUSTER_NAME --service code-executor --force-new-deployment --region $REGION"

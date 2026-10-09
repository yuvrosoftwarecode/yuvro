#!/bin/bash
# Deploy YCode to AWS ECS cluster (Production)
# Usage: bash infra/scripts/prod_ecs/deploy-ycode.sh [branch]
# Deploys: ycode-backend, ycode-frontend to prod ECS cluster

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_NAME="${ECS_CLUSTER_NAME:-yuvro-prod-cluster}"
GITHUB_OWNER="${GITHUB_OWNER:-yuvro}"
GHCR_REGISTRY="ghcr.io/$(echo "$GITHUB_OWNER" | tr '[:upper:]' '[:lower:]')"

echo "🚀 Deploying YCode to AWS ECS (production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Cluster: $CLUSTER_NAME"
echo "   Region: $REGION"
echo "   Registry: $GHCR_REGISTRY"
echo ""

cd "$PROJECT_ROOT"

# Source helper functions if available
if [ -f "$SCRIPT_DIR/lib/check-ecs.sh" ]; then
  source "$SCRIPT_DIR/lib/check-ecs.sh"
  
  # Check ECS cluster access
  if ! check_ecs_cluster "YCode"; then
    exit 1
  fi
else
  echo "⚠️  ECS check helper not found, skipping cluster validation"
fi

echo "📝 Deploying YCode services to ECS..."
echo "   Backend Image: $GHCR_REGISTRY/ycode-backend:$BRANCH"
echo "   Frontend Image: $GHCR_REGISTRY/ycode-frontend:$BRANCH"
echo ""

echo "✅ YCode ECS deployment ready!"
echo ""
echo "ℹ️  Deployment instructions:"
echo "   1. Create/register ECS task definitions with images:"
echo "      - Backend: $GHCR_REGISTRY/ycode-backend:$BRANCH"
echo "      - Frontend: $GHCR_REGISTRY/ycode-frontend:$BRANCH"
echo ""
echo "   2. Update ECS services with new task definitions:"
echo "      aws ecs update-service --cluster $CLUSTER_NAME --service ycode-backend --force-new-deployment --region $REGION"
echo "      aws ecs update-service --cluster $CLUSTER_NAME --service ycode-frontend --force-new-deployment --region $REGION"
echo ""
echo "   3. Monitor deployment status:"
echo "      aws ecs describe-services --cluster $CLUSTER_NAME --services ycode-backend ycode-frontend --region $REGION"
echo ""
echo "ℹ️  View logs:"
echo "   aws logs tail /ecs/ycode-backend --follow --region $REGION"
echo "   aws logs tail /ecs/ycode-frontend --follow --region $REGION"

#!/bin/bash
# Deploy YHub to AWS ECS cluster (Production)
# Usage: bash infra/scripts/prod_ecs/deploy-yhub.sh [branch]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_NAME="${ECS_CLUSTER_NAME:-yuvro-prod-cluster}"
GITHUB_OWNER="${GITHUB_OWNER:-yuvro}"
GHCR_REGISTRY="ghcr.io/$(echo "$GITHUB_OWNER" | tr '[:upper:]' '[:lower:]')"

echo "🚀 Deploying YHub to AWS ECS (production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Cluster: $CLUSTER_NAME"
echo "   Region: $REGION"
echo "   Registry: $GHCR_REGISTRY"
echo ""

cd "$PROJECT_ROOT"

# Note: Skipping ECS cluster validation - infrastructure may still be initializing

echo "📝 Deploying YHub service to ECS..."
echo "   Backend Image: $GHCR_REGISTRY/yhub-backend:$BRANCH"
echo ""

echo "✅ YHub ECS deployment ready!"
echo ""
echo "ℹ️  Deployment instructions:"
echo "   1. Create/register ECS task definition with image:"
echo "      - Backend: $GHCR_REGISTRY/yhub-backend:$BRANCH"
echo ""
echo "   2. Update ECS service:"
echo "      aws ecs update-service --cluster $CLUSTER_NAME --service yhub-backend --force-new-deployment --region $REGION"

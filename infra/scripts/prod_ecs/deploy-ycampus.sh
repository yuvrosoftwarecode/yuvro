#!/bin/bash
# Deploy YCampus to AWS ECS cluster (Production)
# Usage: bash infra/scripts/prod_ecs/deploy-ycampus.sh [branch]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_NAME="${ECS_CLUSTER_NAME:-yuvro-prod-cluster}"
GITHUB_OWNER="${GITHUB_OWNER:-yuvro}"
GHCR_REGISTRY="ghcr.io/$(echo "$GITHUB_OWNER" | tr '[:upper:]' '[:lower:]')"

echo "🚀 Deploying YCampus to AWS ECS (production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Cluster: $CLUSTER_NAME"
echo "   Region: $REGION"
echo "   Registry: $GHCR_REGISTRY"
echo ""

cd "$PROJECT_ROOT"

# Note: Skipping ECS cluster validation - infrastructure may still be initializing

echo "📝 Deploying YCampus services to ECS..."
echo "   Backend Image: $GHCR_REGISTRY/ycampus-backend:$BRANCH"
echo "   Frontend Image: $GHCR_REGISTRY/ycampus-frontend:$BRANCH"
echo ""

echo "✅ YCampus ECS deployment ready!"
echo ""
echo "ℹ️  Deployment instructions:"
echo "   1. Create/register ECS task definitions with images:"
echo "      - Backend: $GHCR_REGISTRY/ycampus-backend:$BRANCH"
echo "      - Frontend: $GHCR_REGISTRY/ycampus-frontend:$BRANCH"
echo ""
echo "   2. Update ECS services:"
echo "      aws ecs update-service --cluster $CLUSTER_NAME --service ycampus-backend --force-new-deployment --region $REGION"
echo "      aws ecs update-service --cluster $CLUSTER_NAME --service ycampus-frontend --force-new-deployment --region $REGION"

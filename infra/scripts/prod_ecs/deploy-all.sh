#!/bin/bash
# ECS Production Deployment Script
# Deploys all Yuvro services to AWS ECS cluster
#
# Usage: ./deploy-all.sh [branch]
#   branch  Git branch or tag to deploy (default: main)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
REGION="${AWS_REGION:-ap-south-1}"
CLUSTER_NAME="${ECS_CLUSTER_NAME:-yuvro-prod-cluster}"

echo "🚀 Deploying ALL Yuvro services to AWS ECS (Production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Cluster: $CLUSTER_NAME"
echo "   Region: $REGION"
echo ""

cd "$PROJECT_ROOT"

# Deploy each service
echo "📦 Deploying YCode..."
bash infra/scripts/prod_ecs/deploy-ycode.sh "$BRANCH" || true

echo ""
echo "📦 Deploying YCampus..."
bash infra/scripts/prod_ecs/deploy-ycampus.sh "$BRANCH" || true

echo ""
echo "📦 Deploying YLabs..."
bash infra/scripts/prod_ecs/deploy-ylabs.sh "$BRANCH" || true

echo ""
echo "📦 Deploying YHub..."
bash infra/scripts/prod_ecs/deploy-yhub.sh "$BRANCH" || true

echo ""
echo "📦 Deploying YMarketplace..."
bash infra/scripts/prod_ecs/deploy-ymarketplace.sh "$BRANCH" || true

echo ""
echo "📦 Deploying Code Executor..."
bash infra/scripts/prod_ecs/deploy-code-executor.sh "$BRANCH" || true

echo ""
echo "=========================================="
echo "✅ All services ECS deployment ready!"
echo "=========================================="
echo ""
echo "📊 Deployment Summary:"
echo "   Environment: $DEPLOY_ENV"
echo "   Branch: $BRANCH"
echo "   Cluster: $CLUSTER_NAME"
echo "   Region: $REGION"
echo ""
echo "Services to update:"
echo "   1. ycode-backend"
echo "   2. ycode-frontend"
echo "   3. ycampus-backend"
echo "   4. ycampus-frontend"
echo "   5. ylabs-backend"
echo "   6. ylabs-frontend"
echo "   7. yhub-backend"
echo "   8. ymarketplace-backend"
echo "   9. ymarketplace-frontend"
echo "   10. code-executor"
echo ""
echo "Next steps:"
echo "   1. Ensure ECS services and task definitions are created in AWS"
echo "   2. Update services with new images:"
echo "      aws ecs update-service --cluster $CLUSTER_NAME --service <service-name> --force-new-deployment"
echo ""
echo "View deployment status:"
echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services ycode-backend ycode-frontend"
echo ""
echo "View logs:"
echo "   aws logs tail /ecs/<service-name> --follow --region $REGION"
echo ""


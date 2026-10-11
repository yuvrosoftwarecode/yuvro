#!/bin/bash
# Deploy all Yuvro services locally using Docker Compose
# Usage: bash infra/scripts/local_docker/deploy-all.sh [branch]
# Deploys all services: common apps, YCode, YCampus, YLabs, YMarketplace, Code Executor

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "Branch: $BRANCH"

cd "$PROJECT_ROOT"

# Step 1: Deploy common services (executor, yhub, minio)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/5: Deploying common shared services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/deploy-common-apps.sh" "$BRANCH" || {
  echo "❌ Failed to deploy common services"
  exit 1
}

echo ""

# Step 2: Deploy YCode
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/5: Deploying YCode services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/deploy-ycode.sh" "$BRANCH" || {
  echo "❌ Failed to deploy YCode"
  exit 1
}

echo ""

# Step 3: Deploy YCampus
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/5: Deploying YCampus services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/deploy-ycampus.sh" "$BRANCH" || {
  echo "❌ Failed to deploy YCampus"
  exit 1
}

echo ""

# Step 4: Deploy YLabs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/5: Deploying YLabs services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/deploy-ylabs.sh" "$BRANCH" || {
  echo "❌ Failed to deploy YLabs"
  exit 1
}

echo ""

# Step 5: Deploy YMarketplace
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5/5: Deploying YMarketplace services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bash "$SCRIPT_DIR/deploy-ymarketplace.sh" "$BRANCH" || {
  echo "❌ Failed to deploy YMarketplace"
  exit 1
}

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ All Yuvro Services Deployed Successfully!                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "🌐 Service URLs:"
echo ""
echo "  YCode Platform:"
echo "    Frontend:      http://localhost:3000"
echo "    Backend:       http://localhost:8000"
echo ""
echo "  YCampus Platform:"
echo "    Frontend:      http://localhost:3001"
echo "    Backend:       http://localhost:8001"
echo ""
echo "  YLabs Platform:"
echo "    Frontend:      http://localhost:3002"
echo "    Backend:       http://localhost:8002"
echo ""
echo "  YMarketplace Platform:"
echo "    Frontend:      http://localhost:3004"
echo "    Backend:       http://localhost:8004"
echo ""
echo "  Shared Services:"
echo "    Code Executor: http://localhost:8009"
echo "    YHub Backend:  http://localhost:8003"
echo "    MinIO S3:      http://localhost:9100"
echo "    MinIO Console: http://localhost:9101"
echo ""

echo "📝 Next steps:"
echo "   1. Create admin users: make setup-fixtures-data"
echo "   2. Load test data: make load-fixtures-data-ycode"
echo "   3. View logs: make logs"
echo "   4. Check status: make status"
echo ""

echo "📖 Documentation:"
echo "   - View logs: docker compose logs -f"
echo "   - Stop services: make stop"
echo "   - Clean up: make destroy"
echo ""

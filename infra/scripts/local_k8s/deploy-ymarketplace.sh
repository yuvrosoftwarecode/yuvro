#!/bin/bash
# Deploy YMarketplace to local Kubernetes using centralized Helm chart
# Databases are managed by Helm
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
NAMESPACE="yuvro-ns"
HELM_CHART="$PROJECT_ROOT/infra/helm"

echo "🚀 Deploying YMarketplace to local Kubernetes..."
echo "   Branch: $BRANCH"
echo "   Environment: ${DEPLOY_ENV:-local}"

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-k8s.sh"

# Verify Kubernetes cluster
if ! check_k8s_cluster "YMarketplace"; then 
  exit 1
fi

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose -f "$PROJECT_ROOT/docker-compose.ymarketplace.yml" build 2>/dev/null || true

# Set deploy environment
DEPLOY_ENV="${DEPLOY_ENV:-local}"
echo "📦 Loading configuration for DEPLOY_ENV=$DEPLOY_ENV..."

echo ""
echo "📝 Deploying YMarketplace with Helm (databases managed by Helm)..."
helm upgrade --install ymarketplace "$HELM_CHART" \
  --namespace "$NAMESPACE" \
  --create-namespace \
  --set "image.pullPolicy=IfNotPresent" \
  --set "image.tag=$BRANCH" \
  --set "env.DEPLOY_ENV=$DEPLOY_ENV" \
  --set "components.ycode-backend.enabled=false" \
  --set "components.ycode-frontend.enabled=false" \
  --set "components.ycampus-backend.enabled=false" \
  --set "components.ycampus-frontend.enabled=false" \
  --set "components.ylabs-backend.enabled=false" \
  --set "components.ylabs-frontend.enabled=false" \
  --set "components.yhub-backend.enabled=false" \
  --set "components.ymarketplace-backend.enabled=true" \
  --set "components.ymarketplace-backend.database.enabled=true" \
  --set "components.ymarketplace-frontend.enabled=true" \
  --set "components.code-executor.enabled=false" || exit 1

echo ""
echo "✅ YMarketplace deployed to local Kubernetes!"
echo "📊 Deployment status:"
helm list -n "$NAMESPACE"
echo ""
echo "🔍 Pod status:"
kubectl get pods -n "$NAMESPACE" || true
echo ""
echo "🌐 Services:"
kubectl get svc -n "$NAMESPACE" || true
echo ""
echo "ℹ️  Access services at:"
echo "   - http://localhost:3004 (YMarketplace Frontend)"
echo "   - http://localhost:8004 (YMarketplace Backend)"
echo ""
echo "💡 To view logs:"
echo "   kubectl logs -n $NAMESPACE deployment/ymarketplace-ymarketplace-backend -f"
echo "   kubectl logs -n $NAMESPACE deployment/ymarketplace-ymarketplace-frontend -f"

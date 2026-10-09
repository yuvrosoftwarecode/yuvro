#!/bin/bash
# Deploy YCampus to local Kubernetes using centralized Helm chart
# Databases are managed by Helm
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
NAMESPACE="yuvro-ns"
HELM_CHART="$PROJECT_ROOT/infra/helm"

echo "🚀 Deploying YCampus to local Kubernetes..."
echo "   Branch: $BRANCH"
echo "   Environment: ${DEPLOY_ENV:-local}"

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-k8s.sh"

# Verify Kubernetes cluster
if ! check_k8s_cluster "YCampus"; then 
  exit 1
fi

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose -f "$PROJECT_ROOT/docker-compose.ycampus.yml" build 2>/dev/null || true

# Set deploy environment
DEPLOY_ENV="${DEPLOY_ENV:-local}"
echo "📦 Loading configuration for DEPLOY_ENV=$DEPLOY_ENV..."

echo ""
echo "📝 Deploying YCampus with Helm (databases managed by Helm)..."
helm upgrade --install ycampus "$HELM_CHART" \
  --namespace "$NAMESPACE" \
  --create-namespace \
  --set "image.pullPolicy=IfNotPresent" \
  --set "image.tag=$BRANCH" \
  --set "env.DEPLOY_ENV=$DEPLOY_ENV" \
  --set "components.ycode-backend.enabled=false" \
  --set "components.ycode-frontend.enabled=false" \
  --set "components.ycampus-backend.enabled=true" \
  --set "components.ycampus-backend.database.enabled=true" \
  --set "components.ycampus-frontend.enabled=true" \
  --set "components.ylabs-backend.enabled=false" \
  --set "components.ylabs-frontend.enabled=false" \
  --set "components.yhub-backend.enabled=false" \
  --set "components.ymarketplace-backend.enabled=false" \
  --set "components.ymarketplace-frontend.enabled=false" \
  --set "components.code-executor.enabled=false" || exit 1

echo ""
echo "✅ YCampus deployed to local Kubernetes!"
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
echo "   - http://localhost:3001 (YCampus Frontend)"
echo "   - http://localhost:8001 (YCampus Backend)"
echo ""
echo "💡 To view logs:"
echo "   kubectl logs -n $NAMESPACE deployment/ycampus-ycampus-backend -f"
echo "   kubectl logs -n $NAMESPACE deployment/ycampus-ycampus-frontend -f"

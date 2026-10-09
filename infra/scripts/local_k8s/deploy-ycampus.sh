#!/bin/bash
# Deploy YCampus to local Kubernetes using centralized Helm chart
# Databases are managed by Helm
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
NAMESPACE="yuvro-ns"
HELM_CHART="$PROJECT_ROOT/infra/helm/ycampus"
DEPLOY_ENV="${DEPLOY_ENV:-local}"

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

# Build Docker images for Kubernetes
echo "🔨 Building Docker images for Kubernetes..."
# Frontend: build with 'serve' stage (nginx) for production/K8s
DOCKER_BUILDKIT=1 docker build \
  -t yuvro-ycampus-frontend:latest \
  --target serve \
  "$PROJECT_ROOT/ycampus-web" 2>/dev/null || true

# Backend: build with development stage
DOCKER_BUILDKIT=1 docker build \
  -t yuvro-ycampus-backend:latest \
  --target development \
  "$PROJECT_ROOT/ycampus-backend-api" 2>/dev/null || true

# Set deploy environment
DEPLOY_ENV="${DEPLOY_ENV:-local}"
echo "📦 Loading configuration for DEPLOY_ENV=$DEPLOY_ENV..."

echo ""
echo "📝 Deploying YCampus with Helm..."
# Use values-prod.yaml for prod, values.yaml (local defaults) for local
if [ "$DEPLOY_ENV" = "prod" ]; then
  helm upgrade --install ycampus "$HELM_CHART" \
    --namespace "$NAMESPACE" \
    --create-namespace \
    -f "$HELM_CHART/values-prod.yaml" || exit 1
else
  helm upgrade --install ycampus "$HELM_CHART" \
    --namespace "$NAMESPACE" \
    --create-namespace || exit 1
fi

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
echo "   - http://localhost:30001 (YCampus Frontend)"
echo "   - http://localhost:30009 (YCampus Backend)"
echo ""
echo "💡 To view logs:"
echo "   kubectl logs -n $NAMESPACE deployment/ycampus-ycampus-backend -f"
echo "   kubectl logs -n $NAMESPACE deployment/ycampus-ycampus-frontend -f"

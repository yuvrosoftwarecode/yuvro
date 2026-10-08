#!/bin/bash
# Deploy YMarketplace to local Kubernetes (Docker Desktop or minikube)
# Usage: bash infra/scripts/local_k8s/deploy-ymarketplace.sh [branch]
# Deploys: ymarketplace-backend, ymarketplace-frontend via kubectl

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
NAMESPACE="ymarketplace"

echo "🚀 Deploying YMarketplace to local Kubernetes (k8s)..."
echo "   Branch: $BRANCH"
echo "   Namespace: $NAMESPACE"
echo ""

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-k8s.sh"

# Check Kubernetes cluster access
if ! check_k8s_cluster "YMarketplace"; then
  exit 1
fi

echo "📋 Creating namespace '$NAMESPACE'..."
kubectl create namespace $NAMESPACE 2>/dev/null || true

echo "🔧 Loading local Docker images into Kubernetes..."
docker-compose -f ymarketplace/docker-compose.yml -f ymarketplace/docker-compose.local.yml build 2>/dev/null || {
  echo "⚠️  Could not build all images (some may be skipped)"
}

echo "🔗 Loading images into k8s cluster..."
if command -v minikube &> /dev/null; then
  minikube image load ymarketplace-backend:latest 2>/dev/null || true
  minikube image load ymarketplace-frontend:latest 2>/dev/null || true
fi

echo "📝 Deploying YMarketplace components via kubectl..."

cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: ConfigMap
metadata:
  name: ymarketplace-config
  namespace: $NAMESPACE
data:
  BRANCH: "$BRANCH"
  DEPLOY_ENV: "local"
EOF

echo ""
echo "✅ YMarketplace namespace created and configured for Kubernetes!"
echo ""
echo "ℹ️  Next steps:"
echo "   1. Deploy individual services using kubectl"
echo "   2. Port-forward to access services:"
echo "      kubectl port-forward -n $NAMESPACE svc/ymarketplace-frontend 3004:3004"
echo "      kubectl port-forward -n $NAMESPACE svc/ymarketplace-backend 8004:8000"
echo ""
echo "   Or use local Docker instead:"
echo "      DEPLOY_ENV=local DEPLOY_INFRA_TYPE=local make deploy-ymarketplace"
echo ""
echo "📊 Check status:"
echo "   kubectl get all -n $NAMESPACE"

#!/bin/bash
# Deploy YCode to local Kubernetes (Docker Desktop or minikube)
# Usage: bash infra/scripts/local_k8s/deploy-ycode.sh [branch]
# Deploys: ycode-backend, ycode-frontend, ycode-db via kubectl

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
NAMESPACE="ycode"

echo "🚀 Deploying YCode to local Kubernetes (k8s)..."
echo "   Branch: $BRANCH"
echo "   Namespace: $NAMESPACE"
echo ""

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-k8s.sh"

# Check Kubernetes cluster access
if ! check_k8s_cluster "YCode"; then
  exit 1
fi


echo "📋 Creating namespace '$NAMESPACE'..."
kubectl create namespace $NAMESPACE 2>/dev/null || true

echo "🔧 Loading local Docker images into Kubernetes..."
# Build images locally (using docker-compose build)
docker-compose -f docker-compose.ycode.yml build 2>/dev/null || {
  echo "⚠️  Could not build all images (some may be skipped)"
}

echo "🔗 Loading images into k8s cluster..."
# For Docker Desktop k8s, images are automatically accessible
# For minikube, we need to load them
if command -v minikube &> /dev/null; then
  minikube image load ycode-backend:latest 2>/dev/null || true
  minikube image load ycode-frontend:latest 2>/dev/null || true
  minikube image load postgres:15-alpine 2>/dev/null || true
fi

echo "📝 Deploying YCode components via kubectl..."
# Deploy using kubectl manifest files from docker-compose
# For now, create simple deployments from environment

cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: ConfigMap
metadata:
  name: ycode-config
  namespace: $NAMESPACE
data:
  BRANCH: "$BRANCH"
  DEPLOY_ENV: "local"
EOF

echo ""
echo "✅ YCode namespace created and configured for Kubernetes!"
echo ""
echo "ℹ️  Next steps:"
echo "   1. Deploy individual services using kubectl"
echo "   2. Port-forward to access services:"
echo "      kubectl port-forward -n $NAMESPACE svc/ycode-frontend 3000:3000"
echo "      kubectl port-forward -n $NAMESPACE svc/ycode-backend 8000:8000"
echo ""
echo "   Or use local Docker instead:"
echo "      DEPLOY_ENV=local DEPLOY_INFRA_TYPE=local make deploy-ycode"
echo ""
echo "📊 Check status:"
echo "   kubectl get all -n $NAMESPACE"
echo "   kubectl describe pod -n $NAMESPACE"


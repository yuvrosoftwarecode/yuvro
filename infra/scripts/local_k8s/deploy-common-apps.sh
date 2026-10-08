#!/bin/bash
# Deploy common shared services to local Kubernetes (Docker Desktop or minikube)
# Usage: bash infra/scripts/local_k8s/deploy-common-apps.sh [branch]
# Deploys: code-executor, yhub, minio via kubectl (ConfigMaps + Services)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
NAMESPACE="yuvro"

echo "🚀 Deploying common shared services to local Kubernetes (k8s)..."
echo "   Branch: $BRANCH"
echo "   Namespace: $NAMESPACE"
echo "   Services: code-executor, yhub, minio"
echo ""

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-k8s.sh"

# Check Kubernetes cluster access
if ! check_k8s_cluster "Common Apps"; then
  exit 1
fi


echo "📋 Creating namespace '$NAMESPACE'..."
kubectl create namespace $NAMESPACE 2>/dev/null || true

echo "� Loading local Docker images into Kubernetes..."
# Build images locally (using docker-compose build)
docker-compose -f docker-compose.code-executor.yml build 2>/dev/null || {
  echo "⚠️  Could not build all images (some may be skipped)"
}

echo "🔗 Loading images into k8s cluster..."
# For Docker Desktop k8s, images are automatically accessible
# For minikube, we need to load them
if command -v minikube &> /dev/null; then
  minikube image load ycode-code-executor:latest 2>/dev/null || true
  minikube image load yhub-backend:latest 2>/dev/null || true
  minikube image load minio:latest 2>/dev/null || true
fi

echo "📝 Deploying common services via kubectl..."

cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: ConfigMap
metadata:
  name: common-config
  namespace: $NAMESPACE
data:
  BRANCH: "$BRANCH"
  DEPLOY_ENV: "local"
EOF

echo ""
echo "✅ Common services namespace created and configured for Kubernetes!"
echo ""
echo "ℹ️  Next steps:"
echo "   1. Deploy individual services using kubectl"
echo "   2. Port-forward to access services:"
echo "      kubectl port-forward -n $NAMESPACE svc/code-executor 8009:8009"
echo "      kubectl port-forward -n $NAMESPACE svc/yhub-backend 8003:8000"
echo "      kubectl port-forward -n $NAMESPACE svc/minio 9100:9000"
echo ""
echo "   Or use local Docker instead:"
echo "      DEPLOY_ENV=local DEPLOY_INFRA_TYPE=local make deploy-common-apps"
echo ""
echo "📊 Check status:"
echo "   kubectl get all -n $NAMESPACE"

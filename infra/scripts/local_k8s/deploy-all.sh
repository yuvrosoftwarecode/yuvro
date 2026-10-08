#!/bin/bash
# Deploy all services locally to Kubernetes via Helm
# Usage: bash infra/scripts/local_k8s/deploy-all.sh [branch]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying ALL services locally to Kubernetes via Helm..."
echo "   Branch: $BRANCH"
echo ""

# Check prerequisites
if ! command -v helm &> /dev/null; then
  echo "❌ Helm is not installed"
  exit 1
fi

if ! command -v kubectl &> /dev/null; then
  echo "❌ kubectl is not installed"
  exit 1
fi

if ! kubectl cluster-info &> /dev/null; then
  echo "❌ Kubernetes cluster not accessible"
  exit 1
fi

cd "$PROJECT_ROOT"

echo "📦 Checking Helm configuration..."
HELM_VALUES_FILE="helm/values-local.yaml"
if [ ! -f "$HELM_VALUES_FILE" ]; then
  echo "❌ Values file not found: $HELM_VALUES_FILE"
  exit 1
fi

echo "📦 Creating namespaces..."
kubectl apply -f helm/namespace.yaml || true

echo "📦 Updating Helm dependencies..."
helm dependency update helm

echo "🚀 Deploying Yuvro via Helm..."
helm upgrade --install yuvro helm \
  --namespace yuvro \
  --create-namespace \
  --values "$HELM_VALUES_FILE" \
  --wait \
  --timeout 5m

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Service URLs (use port-forward or NodePort):"
echo "   YCode Frontend:    http://localhost:3000"
echo "   YCode Backend:     http://localhost:8000"
echo "   YCampus Frontend:  http://localhost:3001"
echo "   YCampus Backend:   http://localhost:8001"
echo "   Code Executor:     http://localhost:8009"
echo ""
echo "📊 Check deployment status:"
echo "   kubectl get all -n yuvro"
echo "   kubectl get pods -n yuvro -w"
echo ""
echo "📝 View logs:"
echo "   kubectl logs -n yuvro -l app=ycode-backend -f"
echo ""
echo "🔌 Setup port forwarding:"
echo "   kubectl port-forward -n yuvro svc/yuvro-ycode-frontend 3000:3000 &"
echo "   kubectl port-forward -n yuvro svc/yuvro-ycode-backend 8000:8000 &"

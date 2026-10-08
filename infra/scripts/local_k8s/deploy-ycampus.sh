#!/bin/bash
# Deploy YCampus locally to Kubernetes via Helm
# Usage: bash infra/scripts/local_k8s/deploy-ycampus.sh [branch]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying YCampus locally to Kubernetes via Helm..."
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

echo "🚀 Deploying YCampus via Helm..."
helm upgrade --install yuvro helm \
  --namespace yuvro \
  --create-namespace \
  --values "$HELM_VALUES_FILE" \
  --set ycode-backend.enabled=false \
  --set ycampus-backend.enabled=true \
  --set ycode-frontend.enabled=false \
  --set ycampus-frontend.enabled=true \
  --set code-executor.enabled=true \
  --wait \
  --timeout 5m

echo ""
echo "✅ YCampus deployment complete!"
echo ""
echo "🌐 Service URLs (use port-forward or NodePort):"
echo "   YCampus Frontend: http://localhost:3001"
echo "   YCampus Backend:  http://localhost:8001"
echo ""
echo "📊 Check deployment status:"
echo "   kubectl get pods -n yuvro -w"
echo ""
echo "📝 View logs:"
echo "   kubectl logs -n yuvro -l app=ycampus-backend -f"

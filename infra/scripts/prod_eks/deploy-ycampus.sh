#!/bin/bash
# Deploy YCampus to AWS EKS cluster using Helm from infra/helm/ycampus
# Usage: bash infra/scripts/prod_eks/deploy-ycampus.sh [branch]
# Uses app-specific Helm chart at infra/helm/ycampus/
# Deploys: ycampus-backend, ycampus-frontend to prod EKS from GHCR registry

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
NAMESPACE="yuvro-ns"
HELM_CHART="$PROJECT_ROOT/infra/helm/ycampus"
HELM_VALUES_FILE="$HELM_CHART/values-prod.yaml"
GITHUB_OWNER="${GITHUB_OWNER:-yuvro}"
GHCR_REGISTRY="ghcr.io/$(echo "$GITHUB_OWNER" | tr '[:upper:]' '[:lower:]')"

echo "🚀 Deploying YCampus to AWS EKS (production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Namespace: $NAMESPACE"
echo "   Helm Chart: $HELM_CHART"
echo "   Registry: $GHCR_REGISTRY"
echo ""

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-eks.sh"

# Check EKS cluster access
if ! check_eks_cluster "YCampus"; then
  exit 1
fi

echo ""
echo "🔍 Checking Helm chart..."
if [ ! -f "$HELM_VALUES_FILE" ]; then
  echo "❌ Values file not found: $HELM_VALUES_FILE"
  echo "   Please create prod values file for YCampus deployment"
  exit 1
fi

echo "📝 Deploying YCampus with Helm (values-prod.yaml)..."
echo "   Using images from: $GHCR_REGISTRY/ycampus-backend:$BRANCH"
echo "   Using images from: $GHCR_REGISTRY/ycampus-frontend:$BRANCH"
echo ""

helm upgrade --install ycampus "$HELM_CHART" \
  --namespace "$NAMESPACE" \
  --create-namespace \
  -f "$HELM_VALUES_FILE" \
  --set image.registry="$GHCR_REGISTRY" \
  --set image.tag="$BRANCH" \
  --set env.DEPLOY_ENV="$DEPLOY_ENV" \
  || {
  echo "❌ Helm deployment failed"
  exit 1
}

echo ""
echo "✅ YCampus deployed to EKS via Helm!"
echo ""
echo "📊 Deployment status:"
helm list -n "$NAMESPACE" | grep ycampus || true
echo ""
kubectl get pods -n "$NAMESPACE" -l app=ycampus || true
echo ""
echo "ℹ️  View logs:"
echo "   kubectl logs -n $NAMESPACE deployment/ycampus-backend -f"
echo "   kubectl logs -n $NAMESPACE deployment/ycampus-frontend -f"


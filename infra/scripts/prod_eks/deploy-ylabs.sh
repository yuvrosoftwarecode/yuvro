#!/bin/bash
# Deploy YLabs to AWS EKS cluster using Helm from infra/helm/ylabs
# Usage: bash infra/scripts/prod_eks/deploy-ylabs.sh [branch]
# Uses app-specific Helm chart at infra/helm/ylabs/
# Deploys: ylabs-backend, ylabs-frontend to prod EKS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
NAMESPACE="yuvro-ns"
HELM_CHART="$PROJECT_ROOT/infra/helm/ylabs"
HELM_VALUES_FILE="$HELM_CHART/values-prod.yaml"

echo "🚀 Deploying YLabs to AWS EKS (production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Namespace: $NAMESPACE"
echo "   Helm Chart: $HELM_CHART"
echo ""

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-eks.sh"

# Check EKS cluster access
if ! check_eks_cluster "YLabs"; then
  exit 1
fi

echo ""
echo "🔍 Checking Helm chart..."
if [ ! -f "$HELM_VALUES_FILE" ]; then
  echo "❌ Values file not found: $HELM_VALUES_FILE"
  echo "   Please create prod values file for YLabs deployment"
  exit 1
fi

echo "📝 Deploying YLabs with Helm (values-prod.yaml)..."
helm upgrade --install ylabs "$HELM_CHART" \
  --namespace "$NAMESPACE" \
  --create-namespace \
  -f "$HELM_VALUES_FILE" \
  --set image.tag="$BRANCH" \
  --set env.DEPLOY_ENV="$DEPLOY_ENV" \
  || {
  echo "❌ Helm deployment failed"
  exit 1
}

echo ""
echo "✅ YLabs deployed to EKS via Helm!"
echo ""
echo "📊 Deployment status:"
helm list -n "$NAMESPACE" | grep ylabs || true
echo ""
kubectl get pods -n "$NAMESPACE" -l app=ylabs || true
echo ""
echo "ℹ️  View logs:"
echo "   kubectl logs -n $NAMESPACE deployment/ylabs-backend -f"
echo "   kubectl logs -n $NAMESPACE deployment/ylabs-frontend -f"

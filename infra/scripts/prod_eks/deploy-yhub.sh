#!/bin/bash
# Deploy YHub to AWS EKS cluster using Helm from infra/helm/yhub
# Usage: bash infra/scripts/prod_eks/deploy-yhub.sh [branch]
# Uses app-specific Helm chart at infra/helm/yhub/
# Deploys: yhub-backend to prod EKS (no frontend)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
NAMESPACE="yuvro-ns"
HELM_CHART="$PROJECT_ROOT/infra/helm/yhub"
HELM_VALUES_FILE="$HELM_CHART/values-prod.yaml"

echo "🚀 Deploying YHub to AWS EKS (production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Namespace: $NAMESPACE"
echo "   Helm Chart: $HELM_CHART"
echo "   Note: YHub is backend-only (no frontend)"
echo ""

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-eks.sh"

# Check EKS cluster access
if ! check_eks_cluster "YHub"; then
  exit 1
fi

echo ""
echo "🔍 Checking Helm chart..."
if [ ! -f "$HELM_VALUES_FILE" ]; then
  echo "❌ Values file not found: $HELM_VALUES_FILE"
  echo "   Please create prod values file for YHub deployment"
  exit 1
fi

echo "📝 Deploying YHub with Helm (values-prod.yaml)..."
helm upgrade --install yhub "$HELM_CHART" \
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
echo "✅ YHub deployed to EKS via Helm!"
echo ""
echo "📊 Deployment status:"
helm list -n "$NAMESPACE" | grep yhub || true
echo ""
kubectl get pods -n "$NAMESPACE" -l app=yhub || true
echo ""
echo "ℹ️  View logs:"
echo "   kubectl logs -n $NAMESPACE deployment/yhub-backend -f"

#!/bin/bash
# Deploy Code Executor to AWS EKS cluster using Helm from infra/helm/code-executor
# Usage: bash infra/scripts/prod_eks/deploy-code-executor.sh [branch]
# Uses app-specific Helm chart at infra/helm/code-executor/
# Deploys: code-executor service to prod EKS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
NAMESPACE="yuvro-ns"
HELM_CHART="$PROJECT_ROOT/infra/helm/code-executor"
HELM_VALUES_FILE="$HELM_CHART/values-prod.yaml"

echo "🚀 Deploying Code Executor to AWS EKS (production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Namespace: $NAMESPACE"
echo "   Helm Chart: $HELM_CHART"
echo ""

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-eks.sh"

# Check EKS cluster access
if ! check_eks_cluster "Code Executor"; then
  exit 1
fi

echo ""
echo "🔍 Checking Helm chart..."
if [ ! -f "$HELM_VALUES_FILE" ]; then
  echo "❌ Values file not found: $HELM_VALUES_FILE"
  echo "   Please create prod values file for Code Executor deployment"
  exit 1
fi

echo "📝 Deploying Code Executor with Helm (values-prod.yaml)..."
helm upgrade --install code-executor "$HELM_CHART" \
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
echo "✅ Code Executor deployed to EKS via Helm!"
echo ""
echo "📊 Deployment status:"
helm list -n "$NAMESPACE" | grep code-executor || true
echo ""
kubectl get pods -n "$NAMESPACE" -l app=code-executor || true
echo ""
echo "ℹ️  View logs:"
echo "   kubectl logs -n $NAMESPACE deployment/code-executor -f"

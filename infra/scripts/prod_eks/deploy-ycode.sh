#!/bin/bash
# Deploy YCode to AWS EKS cluster using Helm from infra/helm/ycode
# Usage: bash infra/scripts/prod_eks/deploy-ycode.sh [branch]
# Uses app-specific Helm chart at infra/helm/ycode/
# Deploys: ycode-backend, ycode-frontend to prod EKS with GHCR images

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
NAMESPACE="yuvro-ns"
HELM_CHART="$PROJECT_ROOT/infra/helm/ycode"
HELM_VALUES_FILE="$HELM_CHART/values-prod.yaml"

echo "🚀 Deploying YCode to AWS EKS (production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Namespace: $NAMESPACE"
echo "   Helm Chart: $HELM_CHART"
echo ""

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-eks.sh"

# Check EKS cluster access
if ! check_eks_cluster "YCode"; then
  exit 1
fi

echo ""
echo "🔍 Checking Helm chart..."
if [ ! -f "$HELM_VALUES_FILE" ]; then
  echo "❌ Values file not found: $HELM_VALUES_FILE"
  echo "   Please create prod values file for YCode deployment"
  exit 1
fi

echo "📝 Deploying YCode with Helm (values-prod.yaml)..."
helm upgrade --install ycode "$HELM_CHART" \
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
echo "✅ YCode deployed to EKS via Helm!"
echo ""
echo "📊 Deployment status:"
helm list -n "$NAMESPACE" | grep ycode || true
echo ""
kubectl get pods -n "$NAMESPACE" -l app=ycode || true
echo ""
echo "ℹ️  View logs:"
echo "   kubectl logs -n $NAMESPACE deployment/ycode-backend -f"
echo "   kubectl logs -n $NAMESPACE deployment/ycode-frontend -f"
echo ""
echo "ℹ️  Port-forward for local testing:"
echo "   kubectl port-forward -n $NAMESPACE svc/ycode-backend 8000:80"
echo "   kubectl port-forward -n $NAMESPACE svc/ycode-frontend 3000:80"
docker tag ycode-backend:latest ${GHCR_REGISTRY}/ycode-backend:${BRANCH} || true
docker tag ycode-frontend:latest ${GHCR_REGISTRY}/ycode-frontend:${BRANCH} || true

echo "📨 Pushing images to GHCR..."
docker push ${GHCR_REGISTRY}/ycode-backend:${BRANCH} 2>/dev/null || {
  echo "⚠️  Warning: Could not push backend image"
}
docker push ${GHCR_REGISTRY}/ycode-frontend:${BRANCH} 2>/dev/null || {
  echo "⚠️  Warning: Could not push frontend image"
}

echo ""
echo "🔄 Generating/updating Helm manifests from docker-compose..."

# Generate Helm chart templates from docker-compose (in infra/helm/templates)
if ! regenerate_helm_templates_if_needed \
  "$COMPOSE_FILE" \
  "$HELM_CHART/templates" \
  "ycode" \
  "$NAMESPACE" \
  "$GHCR_REGISTRY" \
  "$BRANCH" \
  "false"; then
  echo "❌ Failed to generate Helm templates"
  exit 1
fi

echo ""
echo "📝 Creating image pull secret for GHCR..."
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=oauth2 \
  --docker-password="$GITHUB_TOKEN" \
  --docker-email=not-used@example.com \
  -n $NAMESPACE 2>/dev/null || {
  echo "⚠️  Secret already exists"
}

echo ""
echo "🚀 Deploying YCode via Helm from infra/helm/..."

# Get DEPLOY_ENV from environment or default to prod
DEPLOY_ENV="${DEPLOY_ENV:-prod}"

helm upgrade --install ycode "$HELM_CHART" \
  --namespace "yuvro-ns" \
  --create-namespace \
  --set "image.registry=$GHCR_REGISTRY" \
  --set "image.tag=$BRANCH" \
  --set "env.DEPLOY_ENV=$DEPLOY_ENV" \
  --set "components.ycode.enabled=true" \
  --set "components.ycampus.enabled=false" \
  --set "components.ylabs.enabled=false" \
  --set "components.ymarketplace.enabled=false" \
  --set "components.codeExecutor.enabled=false" || {
  echo "❌ Helm deployment failed"
  exit 1
}

echo ""
echo "✅ YCode deployed to EKS via Helm!"
echo ""
echo "📊 Deployment status:"
helm list -n "$NAMESPACE"
echo ""
kubectl get all -n "$NAMESPACE"
echo ""
echo "ℹ️  View logs:"
echo "   kubectl logs -n $NAMESPACE -l app=ycode-backend -f"
echo "   kubectl logs -n $NAMESPACE -l app=ycode-frontend -f"

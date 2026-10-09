#!/bin/bash
# Deploy YCode to AWS EKS cluster using Helm from infra/helm
# Usage: bash infra/scripts/prod_eks/deploy-ycode.sh [branch]
# Uses centralized Helm chart at infra/helm/
# Generates manifests from docker-compose.ycode.yml if needed
# Deploys: ycode-backend, ycode-frontend to prod EKS with GHCR images

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_OWNER="${GITHUB_OWNER:-$(git -C "$PROJECT_ROOT" config user.name 2>/dev/null || echo 'yuvro')}"
CLUSTER_NAME="yuvro-prod-eks"
NAMESPACE="yuvro-ns"
HELM_CHART="$PROJECT_ROOT/infra/helm"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.ycode.yml"

echo "🚀 Deploying YCode to AWS EKS (prod)..."
echo "   Branch: $BRANCH"
echo "   Cluster: $CLUSTER_NAME"
echo "   Namespace: $NAMESPACE"
echo "   Registry: GitHub Container Registry (GHCR)"
echo "   Helm Chart: infra/helm/"
echo ""

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-eks.sh"
source "$PROJECT_ROOT/infra/scripts/lib/kompose-helper.sh"

# Check if kompose is installed
if ! check_kompose; then
  exit 1
fi

# Check EKS cluster access
if ! check_eks_cluster "YCode"; then
  exit 1
fi

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ GITHUB_TOKEN environment variable not set"
  echo ""
  echo "ℹ️  To use GHCR for image storage:"
  echo "   1. Create a GitHub Personal Access Token (PAT) with 'write:packages' scope:"
  echo "      https://github.com/settings/tokens/new"
  echo "   2. Export the token:"
  echo "      export GITHUB_TOKEN='ghp_xxxxxxxxxxxxx'"
  echo "   3. Then run: DEPLOY_ENV=prod DEPLOY_INFRA_TYPE=eks make deploy-ycode"
  echo ""
  exit 1
fi

# Check GHCR access
if ! check_ghcr_access "$GITHUB_TOKEN"; then
  exit 1
fi

GHCR_REGISTRY="ghcr.io/${GITHUB_OWNER,,}"
echo "📦 GHCR Registry: $GHCR_REGISTRY"
echo ""

# Login to GHCR
if ! login_to_ghcr "$GITHUB_TOKEN"; then
  exit 1
fi

echo ""
echo "📋 Helm will create namespace via templates..."

echo "🔧 Building Docker images..."
docker-compose -f "$COMPOSE_FILE" build 2>/dev/null || {
  echo "⚠️  Could not build all images (some may be skipped)"
}

echo "📤 Tagging images for GHCR..."
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

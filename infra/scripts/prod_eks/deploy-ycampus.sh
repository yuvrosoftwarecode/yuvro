#!/bin/bash
# Deploy YCampus to AWS EKS using centralized Helm chart from infra/helm
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_OWNER="${GITHUB_OWNER:-$(git -C "$PROJECT_ROOT" config user.name 2>/dev/null || echo 'yuvro')}"
NAMESPACE="ycampus"
HELM_CHART="$PROJECT_ROOT/infra/helm"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.ycampus.yml"

echo "🚀 Deploying YCampus to AWS EKS (prod)..."
cd "$PROJECT_ROOT"
source "$SCRIPT_DIR/lib/check-eks.sh"
source "$PROJECT_ROOT/infra/scripts/lib/kompose-helper.sh"

if ! check_kompose || ! check_eks_cluster "YCampus"; then exit 1; fi
if [ -z "$GITHUB_TOKEN" ]; then echo "❌ GITHUB_TOKEN not set"; exit 1; fi
if ! check_ghcr_access "$GITHUB_TOKEN"; then exit 1; fi

GHCR_REGISTRY="ghcr.io/${GITHUB_OWNER,,}"
if ! login_to_ghcr "$GITHUB_TOKEN"; then exit 1; fi

kubectl create namespace $NAMESPACE 2>/dev/null || true
docker-compose -f "$COMPOSE_FILE" build 2>/dev/null || true

docker tag ycampus-backend:latest ${GHCR_REGISTRY}/ycampus-backend:${BRANCH} || true
docker tag ycampus-frontend:latest ${GHCR_REGISTRY}/ycampus-frontend:${BRANCH} || true

docker push ${GHCR_REGISTRY}/ycampus-backend:${BRANCH} 2>/dev/null || true
docker push ${GHCR_REGISTRY}/ycampus-frontend:${BRANCH} 2>/dev/null || true

regenerate_helm_templates_if_needed \
  "$COMPOSE_FILE" "$HELM_CHART/templates" "ycampus" "$NAMESPACE" \
  "$GHCR_REGISTRY" "$BRANCH" "false" || exit 1

kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io --docker-username=oauth2 --docker-password="$GITHUB_TOKEN" \
  --docker-email=not-used@example.com -n $NAMESPACE 2>/dev/null || true

helm upgrade --install ycampus "$HELM_CHART" \
  --namespace "yuvro-ns" --create-namespace \
  --set "image.registry=$GHCR_REGISTRY" --set "image.tag=$BRANCH" \
  --set "env.DEPLOY_ENV=${DEPLOY_ENV:-prod}" \
  --set "components.ycampus.enabled=true" \
  --set "components.ycode.enabled=false" \
  --set "components.ylabs.enabled=false" \
  --set "components.ymarketplace.enabled=false" || exit 1

echo "✅ YCampus deployed!"
helm list -n "$NAMESPACE"
kubectl get all -n "$NAMESPACE"

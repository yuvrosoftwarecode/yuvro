#!/bin/bash
# Deploy Code Executor to local Kubernetes using centralized Helm chart
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
NAMESPACE="yuvro"
HELM_CHART="$PROJECT_ROOT/infra/helm"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.code-executor.yml"

echo "🚀 Deploying Code Executor to local Kubernetes..."
cd "$PROJECT_ROOT"
source "$SCRIPT_DIR/lib/check-k8s.sh"
source "$PROJECT_ROOT/infra/scripts/lib/kompose-helper.sh"

if ! check_kompose || ! check_k8s_cluster "Code Executor"; then exit 1; fi

docker-compose -f "$COMPOSE_FILE" build 2>/dev/null || true

regenerate_helm_templates_if_needed \
  "$COMPOSE_FILE" "$HELM_CHART/templates" "code-executor" "$NAMESPACE" \
  "ycode-code-executor" "$BRANCH" "false" || exit 1

helm upgrade --install code-executor "$HELM_CHART" \
  --namespace "yuvro-ns" --create-namespace \
  --set "image.registry=ycode-code-executor" --set "image.tag=$BRANCH" \
  --set "env.DEPLOY_ENV=${DEPLOY_ENV:-local}" \
  --set "components.codeExecutor.enabled=true" \
  --set "components.ycode.enabled=false" \
  --set "components.ycampus.enabled=false" \
  --set "components.ylabs.enabled=false" \
  --set "components.ymarketplace.enabled=false" || exit 1

echo "✅ Code Executor deployed!"
helm list -n "$NAMESPACE"
kubectl get all -n "$NAMESPACE"

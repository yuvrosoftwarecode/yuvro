#!/bin/bash
# Deploy Code Executor to local Kubernetes
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
NAMESPACE="yuvro-ns"
HELM_CHART="$PROJECT_ROOT/infra/helm/code-executor"
DEPLOY_ENV="${DEPLOY_ENV:-local}"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.code-executor.yml"

echo "🚀 Deploying Code Executor to local Kubernetes..."
echo "   Branch: $BRANCH"
echo "   Environment: ${DEPLOY_ENV:-local}"

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-k8s.sh"

# Verify Kubernetes cluster
if ! check_k8s_cluster "Code Executor"; then 
  exit 1
fi

# Build Docker images
echo "🔨 Building Docker images..."
DOCKER_BUILDKIT=1 docker build \
  -t yuvro-code-executor:latest \
  "$PROJECT_ROOT/ycode-executor-api" 2>/dev/null || true

# Set deploy environment
echo "📦 Loading configuration for DEPLOY_ENV=$DEPLOY_ENV..."

echo ""
echo "📝 Deploying Code Executor with Helm..."
if [ "$DEPLOY_ENV" = "prod" ]; then
  helm upgrade --install code-executor "$HELM_CHART" \
    --namespace "$NAMESPACE" \
    --create-namespace \
    -f "$HELM_CHART/values-prod.yaml" || exit 1
else
  helm upgrade --install code-executor "$HELM_CHART" \
    --namespace "$NAMESPACE" \
    --create-namespace || exit 1
fi

echo ""
echo "✅ Code Executor deployed successfully!"
echo "📊 Deployment status:"
helm list -n "$NAMESPACE"
echo ""
echo "🔍 Pod status:"
kubectl get pods -n "$NAMESPACE" --selector app=code-executor || true
echo ""
echo "🌐 Services:"
kubectl get svc -n "$NAMESPACE" --selector app=code-executor || true
echo ""
echo "ℹ️  Access services at:"
echo "   - http://localhost:30013 (Code Executor)"
echo ""
echo "💡 To view logs:"
echo "   kubectl logs -n $NAMESPACE deployment/yuvro-code-executor -f"

#!/bin/bash
# Deploy all services to local Kubernetes (Docker Desktop or minikube)
# Usage: bash infra/scripts/local_k8s/deploy-all.sh [branch]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying all services to local Kubernetes (k8s)..."
echo "   Branch: $BRANCH"

cd "$PROJECT_ROOT"

# Source helper functions
source "$SCRIPT_DIR/lib/check-k8s.sh"

# Check Kubernetes cluster access
if ! check_k8s_cluster "All Services"; then
  exit 1
fi

echo "📦 Deploying all services..."

# Deploy common apps first
echo "1️⃣  Deploying common apps (code-executor, yhub, minio)..."
bash "$SCRIPT_DIR/deploy-common-apps.sh" "$BRANCH" || true

# Deploy individual apps
echo "2️⃣  Deploying YCode..."
bash "$SCRIPT_DIR/deploy-ycode.sh" "$BRANCH" || true

echo "3️⃣  Deploying YCampus..."
bash "$SCRIPT_DIR/deploy-ycampus.sh" "$BRANCH" || true

echo "4️⃣  Deploying YLabs..."
bash "$SCRIPT_DIR/deploy-ylabs.sh" "$BRANCH" || true

echo "5️⃣  Deploying YMarketplace..."
bash "$SCRIPT_DIR/deploy-ymarketplace.sh" "$BRANCH" || true

echo "✅ All services deployed to Kubernetes namespaces!"
echo "📊 Check status across all namespaces:"
echo "   kubectl get pods --all-namespaces"
echo "   kubectl get services --all-namespaces"
echo "🌐 Available services (after port-forwarding):"
echo "   YCode Frontend:       localhost:3000 → kubectl port-forward -n ycode svc/ycode-frontend 3000:3000"
echo "   YCampus Frontend:     localhost:3001 → kubectl port-forward -n ycampus svc/ycampus-frontend 3001:3000"
echo "   YLabs Frontend:       localhost:3002 → kubectl port-forward -n ylabs svc/ylabs-frontend 3002:3000"
echo "   YHub Frontend:        localhost:3003 → kubectl port-forward -n yhub svc/yhub-frontend 3003:3000"
echo "   YMarketplace Frontend:localhost:3004 → kubectl port-forward -n ymarketplace svc/ymarketplace-frontend 3004:3004"
echo "   Code Executor:        localhost:8009 → kubectl port-forward -n yuvro svc/code-executor 8009:8009"

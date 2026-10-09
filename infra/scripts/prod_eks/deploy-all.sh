#!/bin/bash
# Deploy all Yuvro apps to AWS EKS cluster using Helm charts
# Usage: bash infra/scripts/prod_eks/deploy-all.sh [branch]
# Deploys all apps in sequence: ycode, ycampus, ylabs, yhub, ymarketplace, code-executor
# Images pulled from GHCR registry

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-prod}"
GITHUB_OWNER="${GITHUB_OWNER:-yuvro}"
GHCR_REGISTRY="ghcr.io/$(echo "$GITHUB_OWNER" | tr '[:upper:]' '[:lower:]')"

echo "🚀 Deploying ALL Yuvro apps to AWS EKS (production)..."
echo "   Branch: $BRANCH"
echo "   Environment: $DEPLOY_ENV"
echo "   Registry: $GHCR_REGISTRY"
echo ""

cd "$PROJECT_ROOT"

# Array of apps to deploy
APPS=("ycode" "ycampus" "ylabs" "yhub" "ymarketplace" "code-executor")

# Deploy each app
for app in "${APPS[@]}"; do
  echo ""
  echo "════════════════════════════════════════════════"
  echo "📦 Deploying $app..."
  echo "════════════════════════════════════════════════"
  echo ""
  
  if ! bash "$SCRIPT_DIR/deploy-$app.sh" "$BRANCH"; then
    echo "❌ Failed to deploy $app"
    exit 1
  fi
  
  echo ""
done

echo ""
echo "════════════════════════════════════════════════"
echo "✅ ALL apps deployed successfully!"
echo "════════════════════════════════════════════════"
echo ""
echo "📊 Deployment summary:"
kubectl get pods -n yuvro-ns || true
echo ""
echo "📊 Helm releases:"
helm list -n yuvro-ns || true
echo ""
echo "ℹ️  Monitor deployments:"
echo "   kubectl get pods -n yuvro-ns --watch"
echo ""
echo "ℹ️  View logs:"
echo "   kubectl logs -n yuvro-ns deployment/ycode-backend -f"
echo "   kubectl logs -n yuvro-ns deployment/ycampus-backend -f"


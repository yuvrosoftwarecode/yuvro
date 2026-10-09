#!/bin/bash
# Deploy common shared services to AWS EKS using centralized Helm chart
# Usage: bash infra/scripts/prod_eks/deploy-common-apps.sh [branch]
# Prepares and deploys: code-executor, yhub

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying common shared services to AWS EKS (prod)..."
echo "   Branch: $BRANCH"
echo "   Using centralized Helm chart: infra/helm/"
echo ""

cd "$PROJECT_ROOT"

# Deploy each common service
echo "📦 Deploying common services..."
echo ""

echo "1️⃣  Code Executor..."
bash "$SCRIPT_DIR/deploy-code-executor.sh" "$BRANCH" || true
echo ""

echo "2️⃣  YHub..."
bash "$SCRIPT_DIR/deploy-yhub.sh" "$BRANCH" || true
echo ""

echo "✅ Common services deployment via Helm (infra/helm) complete!"

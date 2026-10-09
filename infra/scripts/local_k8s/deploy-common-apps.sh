#!/bin/bash
# Deploy common shared services to local Kubernetes using centralized Helm chart
# Usage: bash infra/scripts/local_k8s/deploy-common-apps.sh [branch]
# Deploys: code-executor, yhub

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying common shared services to local Kubernetes..."
echo "   Branch: $BRANCH"
echo "   Using centralized Helm chart: infra/helm/"

cd "$PROJECT_ROOT"

# Deploy each common service
echo "📦 Deploying common services..."

echo "1️⃣  Code Executor..."
bash "$SCRIPT_DIR/deploy-code-executor.sh" "$BRANCH" || true

echo "2️⃣  YHub..."
bash "$SCRIPT_DIR/deploy-yhub.sh" "$BRANCH" || true

echo "✅ Common services deployment to local Kubernetes complete!"

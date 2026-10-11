#!/bin/bash
# Deploy Code Executor locally using Docker Compose
# Usage: bash infra/scripts/local_docker/deploy-code-executor.sh [branch]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying Code Executor locally via Docker Compose..."
echo "   Branch: $BRANCH"
echo ""

# Build and start Code Executor service
cd "$PROJECT_ROOT"

echo "📦 Creating Docker networks..."
docker network create executor 2>/dev/null || true

echo "🔨 Building Code Executor service..."
docker compose \
  -f docker-compose.code-executor.yml \
  build --build-arg BUILDKIT_INLINE_CACHE=1

echo "🚀 Starting Code Executor service..."
docker compose \
  -f docker-compose.code-executor.yml \
  up -d --wait || {
  echo "❌ Code Executor service failed to become healthy"
  docker compose \
    -f docker-compose.code-executor.yml \
    ps
  exit 1
}

echo ""
echo "✅ Code Executor service is up and healthy!"
echo ""
echo "🌐 Service URLs:"
echo "   Code Executor: http://localhost:8009"

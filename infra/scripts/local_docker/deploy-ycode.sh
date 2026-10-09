#!/bin/bash
# Deploy YCode locally using Docker Compose (YCode services only)
# Usage: bash infra/scripts/local_docker/deploy-ycode.sh [branch]
# Deploys: ycode-backend, ycode-frontend, ycode-db

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying YCode services locally via Docker Compose..."
echo "   Branch: $BRANCH"
echo "   Services: ycode-backend, ycode-frontend, ycode-db"
echo ""

cd "$PROJECT_ROOT"

echo "📦 Creating Docker networks..."
docker network create executor 2>/dev/null || true
docker network create yuvro_ylabs 2>/dev/null || true

echo "🔨 Building YCode services..."
docker compose \
  -f docker-compose.ycode.yml \
  build --build-arg BUILDKIT_INLINE_CACHE=1

echo "🚀 Starting YCode services..."
docker compose \
  -f docker-compose.ycode.yml \
  up -d --wait || {
  echo "❌ One or more YCode services failed to become healthy"
  docker compose \
    -f docker-compose.ycode.yml \
    ps
  exit 1
}

echo ""
echo "✅ YCode services are up and healthy!"
echo ""
echo "🌐 Service URLs:"
echo "   YCode Frontend:  http://localhost:3000"
echo "   YCode Backend:   http://localhost:8000"
echo ""
echo "📝 Note: To deploy common services (executor, minio, yhub), run:"
echo "   bash infra/scripts/local_docker/deploy-common.sh"

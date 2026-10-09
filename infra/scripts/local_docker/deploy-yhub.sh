#!/bin/bash
# Deploy YHub locally using Docker Compose (YHub services only)
# Usage: bash infra/scripts/local_docker/deploy-yhub.sh [branch]
# Deploys: yhub-backend, yhub-db
# Note: Usually deployed as part of common services with deploy-common.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying YHub services locally via Docker Compose..."
echo "   Branch: $BRANCH"
echo "   Services: yhub-backend, yhub-db"
echo ""

# Build and start YHub services
cd "$PROJECT_ROOT"

echo "📦 Creating Docker networks..."
docker network create executor 2>/dev/null || true
docker network create yuvro_ylabs 2>/dev/null || true

echo "🔨 Building YHub services..."
docker compose \
  -f docker-compose.yhub.yml \
  build --build-arg BUILDKIT_INLINE_CACHE=1

echo "🚀 Starting YHub services..."
docker compose \
  -f docker-compose.yhub.yml \
  up -d --wait || {
  echo "❌ One or more YHub services failed to become healthy"
  docker compose \
    -f docker-compose.yhub.yml \
    ps
  exit 1
}

echo ""
echo "✅ YHub services are up and healthy!"
echo ""
echo "🌐 Service URLs:"
echo "   YHub Backend:   http://localhost:8003"

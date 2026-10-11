#!/bin/bash
# Deploy YMarketplace locally using Docker Compose (YMarketplace services only)
# Usage: bash infra/scripts/local_docker/deploy-ymarketplace.sh [branch]
# Deploys: ymarketplace-backend, ymarketplace-frontend, ymarketplace-db

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying YMarketplace services locally via Docker Compose..."
echo "   Branch: $BRANCH"
echo "   Services: ymarketplace-backend, ymarketplace-frontend, ymarketplace-db"
echo ""

# Build and start YMarketplace services
cd "$PROJECT_ROOT"

echo "📦 Creating Docker networks..."
docker network create executor 2>/dev/null || true
docker network create yuvro_marketplace 2>/dev/null || true

echo "🔨 Building YMarketplace services..."
# Change to ymarketplace directory so compose file paths are relative to it
(
  cd ymarketplace
  docker compose \
    -f docker-compose.yml \
    -f docker-compose.local.yml \
    build --build-arg BUILDKIT_INLINE_CACHE=1
)

echo "🚀 Starting YMarketplace services..."
# Change to ymarketplace directory so compose file paths are relative to it
(
  cd ymarketplace
  docker compose \
    -f docker-compose.yml \
    -f docker-compose.local.yml \
    up -d --wait || {
    echo "❌ One or more YMarketplace services failed to become healthy"
    docker compose \
      -f docker-compose.yml \
      -f docker-compose.local.yml \
      ps
    exit 1
  }
)

echo ""
echo "✅ YMarketplace services are up and healthy!"
echo ""
echo "🌐 Service URLs:"
echo "   YMarketplace Frontend: http://localhost:9004"
echo "   YMarketplace Backend:  http://localhost:8004"

#!/bin/bash
# Deploy YLabs locally using Docker Compose (YLabs services only)
# Usage: bash infra/scripts/local_docker/deploy-ylabs.sh [branch]
# Deploys: ylabs-backend, ylabs-frontend, ylabs-db

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying YLabs services locally via Docker Compose..."
echo "   Branch: $BRANCH"
echo "   Services: ylabs-backend, ylabs-frontend, ylabs-db"
echo ""

# Build and start YLabs services
cd "$PROJECT_ROOT"

echo "📦 Creating Docker networks..."
docker network create executor 2>/dev/null || true
docker network create yuvro_ylabs 2>/dev/null || true

echo "🔨 Building YLabs services..."
docker compose \
  -f docker-compose.ylabs.yml \
  build --build-arg BUILDKIT_INLINE_CACHE=1

echo "🚀 Starting YLabs services..."
docker compose \
  -f docker-compose.ylabs.yml \
  up -d --wait || {
  echo "❌ One or more YLabs services failed to become healthy"
  docker compose \
    -f docker-compose.ylabs.yml \
    ps
  exit 1
}

echo ""
echo "✅ YLabs services are up and healthy!"
echo ""
echo "🌐 Service URLs:"
echo "   YLabs Frontend: http://localhost:3002"
echo "   YLabs Backend:  http://localhost:8002"

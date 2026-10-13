#!/bin/bash
# Deploy YCampus locally using Docker Compose (YCampus services only)
# Usage: bash infra/scripts/local_docker/deploy-ycampus.sh [branch]
# Deploys: ycampus-backend, ycampus-frontend, ycampus-db

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying YCampus services locally via Docker Compose..."
echo "   Branch: $BRANCH"
echo "   Services: ycampus-backend, ycampus-frontend, ycampus-db"
echo ""

# Build and start YCampus services
cd "$PROJECT_ROOT"

echo "📦 Creating Docker networks..."
docker network create executor 2>/dev/null || true
docker network create yuvro_ylabs 2>/dev/null || true

echo "🔨 Building YCampus services..."
docker compose \
  -f docker-compose.ycampus.yml \
  build --build-arg BUILDKIT_INLINE_CACHE=1

echo "🚀 Starting YCampus services..."
docker compose \
  -f docker-compose.ycampus.yml \
  up -d --wait || {
  echo "❌ One or more YCampus services failed to become healthy"
  docker compose \
    -f docker-compose.ycampus.yml \
    ps
  exit 1
}

echo ""
echo "✅ YCampus services are up and healthy!"
echo ""
echo "🌐 Service URLs:"
echo "   YCampus Frontend: http://localhost:3001"
echo "   YCampus Backend:  http://localhost:8001"

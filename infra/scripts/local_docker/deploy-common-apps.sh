#!/bin/bash
# Deploy common shared services locally using Docker Compose
# Usage: bash infra/scripts/local_docker/deploy-common-apps.sh [branch]
# Deploys: ycode-executor, yhub-backend, yuvro-minio (shared infrastructure)
# Note: Only for local deployment. These are dependencies for other services.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BRANCH="${1:-main}"

echo "🚀 Deploying common shared services locally via Docker Compose..."
echo "   Branch: $BRANCH"
echo "   Services: ycode-executor, yhub-backend, minio"
echo ""

cd "$PROJECT_ROOT"

echo "📦 Creating Docker networks..."
docker network create executor 2>/dev/null || true
docker network create yuvro_ylabs 2>/dev/null || true
docker network create yuvro_marketplace 2>/dev/null || true
docker network create yuvro_yuvro-storage 2>/dev/null || true

echo "🔨 Building common services..."
docker compose \
  -f docker-compose.yuvro.yml \
  -f docker-compose.yhub.yml \
  build --build-arg BUILDKIT_INLINE_CACHE=1

echo "🚀 Starting common services..."
docker compose \
  -f docker-compose.yuvro.yml \
  -f docker-compose.yhub.yml \
  up -d --remove-orphans || {
  echo "❌ Failed to start common services"
  docker compose \
    -f docker-compose.yuvro.yml \
    -f docker-compose.yhub.yml \
    ps
  exit 1
}

# Wait for critical services (executor, yhub) but be lenient with minio
echo "⏳ Waiting for services to become healthy..."
for i in {1..30}; do
  EXECUTOR_HEALTHY=$(docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml ps yuvro-code-executor --format "table {{.Status}}" | grep -c "healthy" || true)
  YHUB_HEALTHY=$(docker compose -f docker-compose.yuvro.yml -f docker-compose.yhub.yml ps yhub-backend --format "table {{.Status}}" | grep -c "healthy" || true)
  
  if [ "$EXECUTOR_HEALTHY" -gt 0 ] && [ "$YHUB_HEALTHY" -gt 0 ]; then
    echo "✅ Common services are up and healthy!"
    break
  fi
  
  if [ $i -eq 30 ]; then
    echo "⚠️  Timeout waiting for services, but continuing..."
    break
  fi
  
  sleep 1
done

echo ""
echo "✅ Common services deployment complete!"
echo ""
echo "🌐 Service URLs:"
echo "   Code Executor:    http://localhost:8009"
echo "   YHub Backend:     http://localhost:8003"
echo "   MinIO S3:         http://localhost:9100"
echo "   MinIO Console:    http://localhost:9101"
echo ""
echo "📝 These are shared services. Deploy app-specific services next:"
echo "   - YCode:   bash infra/scripts/local_docker/deploy-ycode.sh"
echo "   - YCampus: bash infra/scripts/local_docker/deploy-ycampus.sh"
echo "   - YLabs:   bash infra/scripts/local_docker/deploy-ylabs.sh"
echo "   - YMarketplace: bash infra/scripts/local_docker/deploy-ymarketplace.sh"

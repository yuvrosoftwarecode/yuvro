#!/bin/bash
# Run fixtures on EC2 for a specific app or all apps
# Usage: bash infra/scripts/run-fixtures-ec2.sh [ycode|ycampus|yhub|ylabs|all]
#   App name: ycode, ycampus, yhub, ylabs (default: all)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/yuvro-dev.pem}"

APP="${1:-all}"
ACTION="${2:-setup}"
CLEAR_FLAG=""
if [ "$ACTION" = "--clear" ] || [ "$ACTION" = "clear" ] || [ "$CLEAR" = "true" ]; then
    CLEAR_FLAG="--clear"
fi

EC2_IP=$(aws ec2 describe-instances \
    --region ap-south-1 \
    --filters "Name=tag:Environment,Values=dev" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text 2>/dev/null || echo "")

if [ -z "$EC2_IP" ] || [ "$EC2_IP" = "None" ]; then
    echo "❌ EC2 instance not found or not running"
    exit 1
fi

echo "🚀 Running fixtures on EC2 for: $APP (mode: ${CLEAR_FLAG:-setup})"
echo "   EC2 IP: $EC2_IP"

# Map app names to container names
case "$APP" in
    all)
        CONTAINERS="yuvro-ycode-backend-1 yuvro-ycampus-backend-1 yuvro-ylabs-backend-1 yuvro-yhub-backend-1 yuvro-ymarketplace-backend-1"
        ;;
    ycode)
        CONTAINERS="yuvro-ycode-backend-1"
        ;;
    ycampus)
        CONTAINERS="yuvro-ycampus-backend-1"
        ;;
    ylabs)
        CONTAINERS="yuvro-ylabs-backend-1"
        ;;
    yhub)
        CONTAINERS="yuvro-yhub-backend-1"
        ;;
    ymarketplace)
        CONTAINERS="yuvro-ymarketplace-backend-1"
        ;;
    *)
        echo "❌ Unknown app: $APP"
        echo "Usage: $0 [ycode|ycampus|yhub|ylabs|ymarketplace|all] [--clear]"
        exit 1
        ;;
esac

echo "   Containers: $CONTAINERS"

# SSH into EC2 and run fixtures
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "ubuntu@$EC2_IP" bash << EOF
set -e
cd /home/ubuntu/yuvro

echo "Waiting for containers to be healthy..."
sleep 10

EXTRA_ARGS="$CLEAR_FLAG"

for container in $CONTAINERS; do
    echo "Loading fixtures for: \$container (args: \$EXTRA_ARGS)"
    docker exec "\$container" python manage.py setup_fixtures_data \$EXTRA_ARGS 2>&1 | tail -10 || echo "   ⚠ \$container: already loaded or failed"
    echo ""
done

echo "✅ Fixtures processed successfully!"
EOF

echo "✅ Done!"
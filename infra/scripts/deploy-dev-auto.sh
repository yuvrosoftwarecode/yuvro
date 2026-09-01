#!/bin/bash
# Legacy entry-point — delegates to deploy-all.sh
# Usage: bash infra/scripts/deploy-dev-auto.sh [branch]
# Kept for backward compatibility with `make install` (DEPLOY_ENV=dev)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/deploy-all.sh" "$@"

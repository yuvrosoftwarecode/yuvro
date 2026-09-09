#!/bin/bash
# Deploy YHub only
# Usage: bash infra/scripts/deploy-yhub.sh [branch]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
source "$SCRIPT_DIR/lib/deploy-common.sh"
ensure_infra_and_deploy "yhub" "${1:-main}"

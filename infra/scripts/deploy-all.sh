#!/bin/bash
# Deploy ALL services
# Usage: bash infra/scripts/deploy-all.sh [branch]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
source "$SCRIPT_DIR/lib/deploy-common.sh"
ensure_infra_and_deploy "all" "${1:-main}"

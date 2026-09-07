#!/bin/bash
# Deploy YCode only
# Usage: bash infra/scripts/deploy-ycode.sh [branch]
#   branch  Git branch to deploy (default: main)
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
source "$SCRIPT_DIR/lib/deploy-common.sh"
ensure_infra_and_deploy "ycode" "${1:-main}"

#!/bin/bash
# Deploy YCode only
# Usage: bash infra/scripts/deploy-ycode.sh [branch]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
source "$SCRIPT_DIR/lib/deploy-common.sh"

# ── YCode-specific secrets ─────────────────────────────────────────────────────
APP_SECRET_FILES=(
    "ycode-backend-api/.env.dev-secrets"
    "ycode-web/.env.dev-secrets"
    "yuvro-code-executer/.env.dev-secrets"
)

# ── YCode-specific SSL certificates ───────────────────────────────────────────
APP_CERT_DOMAINS=(
    "code-dev.yuvro.ai"
    "backend-code-dev.yuvro.ai"
    "code-executer-dev.yuvro.ai"
)

ensure_infra_and_deploy "ycode" "${1:-main}"

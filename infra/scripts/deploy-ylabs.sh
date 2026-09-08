#!/bin/bash
# Deploy YLabs only
# Usage: bash infra/scripts/deploy-ylabs.sh [branch]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
source "$SCRIPT_DIR/lib/deploy-common.sh"

# ── YLabs-specific secrets ─────────────────────────────────────────────────────
APP_SECRET_FILES=(
    "ylabs-backend-api/.env.dev-secrets"
    "ylabs-web/.env.dev-secrets"
    "yuvro-code-executer/.env.dev-secrets"
)

# ── YLabs-specific SSL certificates ───────────────────────────────────────────
APP_CERT_DOMAINS=(
    "dev.yuvrolabs.com"
    "backend-dev.yuvrolabs.com"
    "code-executer-dev.yuvro.ai"
)

ensure_infra_and_deploy "ylabs" "${1:-main}"

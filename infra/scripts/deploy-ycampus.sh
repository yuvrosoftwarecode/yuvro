#!/bin/bash
# Deploy YCampus only
# Usage: bash infra/scripts/deploy-ycampus.sh [branch]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OPENTOFU_DIR="$PROJECT_ROOT/infra/opentofu"
source "$SCRIPT_DIR/lib/deploy-common.sh"

# ── YCampus-specific secrets ───────────────────────────────────────────────────
APP_SECRET_FILES=(
    "ycampus-backend-api/.env.dev-secrets"
    "ycampus-web/.env.dev-secrets"
    "yuvro-code-executer/.env.dev-secrets"
)

# ── YCampus-specific SSL certificates ─────────────────────────────────────────
APP_CERT_DOMAINS=(
    "campus-dev.yuvro.ai"
    "backend-campus-dev.yuvro.ai"
    "code-executer-dev.yuvro.ai"
)

ensure_infra_and_deploy "ycampus" "${1:-main}"

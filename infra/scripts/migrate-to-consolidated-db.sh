#!/bin/bash
# Migrate data from 5 separate RDS instances to single consolidated yuvro-dev-db instance
# Use the Python version instead: bash infra/scripts/migrate-to-consolidated-db.py

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Run Python version if available
if command -v python3 &>/dev/null; then
    exec python3 "$SCRIPT_DIR/migrate-to-consolidated-db.py" "$@"
elif command -v python &>/dev/null; then
    exec python "$SCRIPT_DIR/migrate-to-consolidated-db.py" "$@"
else
    echo "Error: Python not found. Please install Python 3."
    exit 1
fi

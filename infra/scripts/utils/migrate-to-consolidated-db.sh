#!/bin/bash
# Migrate data from 5 separate RDS instances to single consolidated yuvro-dev-db instance
# Uses pg_dump and psql for database migration
# Must be run from EC2 instance with network access to both old and new RDS instances

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== RDS Data Migration Script ==="
echo ""
echo "This script migrates all data from 5 old RDS instances to the new consolidated instance"
echo "IMPORTANT: This must be run from the EC2 instance with network access to both RDS instances"
echo ""

# Check if running on EC2
if [ ! -f /opt/aws/ec2/userdata ] && [ ! -f /sys/hypervisor/uuid ]; then
    echo "Warning: This may not be running on EC2. Ensure you have network access to both RDS instances."
fi

# Run Python version if available
if command -v python3 &>/dev/null; then
    python3 "$SCRIPT_DIR/migrate-to-consolidated-db.py" "$@"
    exit $?
elif command -v python &>/dev/null; then
    python "$SCRIPT_DIR/migrate-to-consolidated-db.py" "$@"
    exit $?
else
    echo "Error: Python not found. Please install Python 3."
    exit 1
fi

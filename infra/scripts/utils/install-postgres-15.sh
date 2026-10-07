#!/bin/bash
# Install PostgreSQL 15 client tools on Ubuntu/Debian EC2 instance
# Fixes version mismatch between pg_dump 14 and PostgreSQL 15 RDS servers

set -e

echo "Installing PostgreSQL 15 client tools..."

# Add PostgreSQL official repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Add GPG key
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update package lists
sudo apt-get update

# Install PostgreSQL 15 client
sudo apt-get install -y postgresql-client-15

# Verify installation
echo ""
echo "Verifying installation..."
pg_dump --version
psql --version

echo ""
echo "✓ PostgreSQL 15 client tools installed successfully"
echo ""
echo "Now you can run the migration script:"
echo "  python3 infra/scripts/migrate-to-consolidated-db.py"

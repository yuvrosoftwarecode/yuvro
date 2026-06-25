#!/bin/bash

# Script to delete all migration files from YCode and YCampus backends
# This is useful when you need to regenerate migrations from scratch

set -e

echo "🧹 Resetting migrations for YCode and YCampus backends..."
echo ""

# Function to delete migrations from a directory
delete_migrations() {
    local backend_path=$1
    local backend_name=$2
    
    if [ ! -d "$backend_path" ]; then
        echo "❌ Directory not found: $backend_path"
        return 1
    fi
    
    echo "Processing $backend_name..."
    
    # Find all migration files (excluding __init__.py and __pycache__)
    find "$backend_path" -type d -name "migrations" | while read migrations_dir; do
        echo "  Found migrations directory: $migrations_dir"
        
        # Delete all .py files except __init__.py
        find "$migrations_dir" -maxdepth 1 -name "*.py" ! -name "__init__.py" -type f -delete
        echo "  ✓ Deleted migration files from $migrations_dir"
        
        # Delete __pycache__ directory if it exists
        if [ -d "$migrations_dir/__pycache__" ]; then
            rm -rf "$migrations_dir/__pycache__"
            echo "  ✓ Deleted __pycache__ from $migrations_dir"
        fi
    done
    
    echo "✅ $backend_name migrations reset complete!"
    echo ""
}

# Reset YCode migrations
delete_migrations "ycode-backend-api" "YCode Backend"

# Reset YCampus migrations
delete_migrations "ycampus-backend-api" "YCampus Backend"

# Reset YHub migrations
delete_migrations "yhub-backend-api" "YHub Backend"

echo "🎉 All migrations have been reset!"
echo ""
echo "Next steps:"
echo "1. Run: make makemigrations-ycode"
echo "2. Run: make makemigrations-ycampus"
echo "3. Run: make makemigrations-yhub"
echo "4. Run: make -f Makefile.ycode setup"
echo "5. Run: make -f Makefile.ycampus setup"
echo "6. Run: make -f Makefile.yhub setup"

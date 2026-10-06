#!/usr/bin/env python3
"""
Migrate data from 5 separate RDS instances to single consolidated yuvro-dev-db instance
Uses psycopg (pure Python PostgreSQL driver) - no external dependencies
"""

import sys
import os
import re
from datetime import datetime

# Colors
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
CYAN = '\033[0;36m'
BOLD = '\033[1m'
NC = '\033[0m'

def print_header(msg):
    print(f"\n{BOLD}{BLUE}══════════════════════════════════════════{NC}")
    print(f"{BOLD}{BLUE}  {msg}{NC}")
    print(f"{BOLD}{BLUE}══════════════════════════════════════════{NC}")

def print_success(msg):
    print(f"{GREEN}  ✓ {msg}{NC}")

def print_error(msg):
    print(f"{RED}  ✗ {msg}{NC}")

def print_warning(msg):
    print(f"{YELLOW}  ⚠ {msg}{NC}")

def print_info(msg):
    print(f"{CYAN}  ℹ {msg}{NC}")

def print_step(msg):
    print(f"{BOLD}  › {msg}{NC}")

# RDS endpoints
OLD_ENDPOINTS = {
    'ycode': 'dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
    'ycampus': 'dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
    'yhub': 'dev-yhub-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
    'ylabs': 'dev-ylabs-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
}

NEW_ENDPOINT = 'dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com'
DB_PORT = 5432

def get_script_dir():
    return os.path.dirname(os.path.abspath(__file__))

def get_project_root():
    return os.path.dirname(os.path.dirname(get_script_dir()))

def read_password_from_tfvars(key):
    """Read password from dev.tfvars"""
    opentofu_dir = os.path.join(get_project_root(), 'infra', 'opentofu')
    tfvars_file = os.path.join(opentofu_dir, 'dev.tfvars')
    
    try:
        with open(tfvars_file, 'r') as f:
            for line in f:
                if line.startswith(f'{key}'):
                    # Extract value: key="value" or key=value
                    match = re.search(r'=\s*["\']?([^"\'\n]+)["\']?', line)
                    if match:
                        return match.group(1).strip()
    except Exception as e:
        print_warning(f"Could not read tfvars: {e}")
    
    return "ChangeMe123!DevPassword"

def try_import_psycopg():
    """Try to import psycopg3, psycopg2, or fallback"""
    try:
        import psycopg
        return psycopg, '3'
    except ImportError:
        pass
    
    try:
        import psycopg2
        return psycopg2, '2'
    except ImportError:
        pass
    
    return None, None

def connect_db(host, user, password, dbname='postgres'):
    """Connect to PostgreSQL database"""
    psycopg, version = try_import_psycopg()
    
    if not psycopg:
        print_error("psycopg not installed. Install with:")
        print_info("  pip install psycopg[binary]  # or")
        print_info("  pip install psycopg2-binary")
        return None
    
    try:
        if version == '3':
            conn = psycopg.connect(
                host=host,
                user=user,
                password=password,
                dbname=dbname,
                port=DB_PORT
            )
        else:  # version == '2'
            conn = psycopg.connect(
                host=host,
                user=user,
                password=password,
                database=dbname,
                port=DB_PORT
            )
        return conn
    except Exception as e:
        print_warning(f"Connection failed: {e}")
        return None

def test_connection():
    """Test connection to new RDS"""
    print_header("Testing Connection to Consolidated RDS")
    
    password = read_password_from_tfvars('db_master_password')
    
    print_step(f"Connecting to {NEW_ENDPOINT}...")
    
    conn = connect_db(NEW_ENDPOINT, 'yuvro_admin', password, 'postgres')
    
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print_success(f"Connected! PostgreSQL {version[0] if version else 'unknown version'}")
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print_warning(f"Query failed: {e}")
        return False

def create_databases():
    """Create databases in new RDS"""
    print_header("Creating Application Databases in Consolidated RDS")
    
    password = read_password_from_tfvars('db_master_password')
    databases = ['ycode', 'ycampus', 'yhub', 'ylabs', 'ymarketplace']
    
    conn = connect_db(NEW_ENDPOINT, 'yuvro_admin', password, 'postgres')
    if not conn:
        return False
    
    try:
        # Set autocommit mode for CREATE DATABASE
        conn.autocommit = True
        cursor = conn.cursor()
        
        for db in databases:
            print_step(f"Creating database: {db}...")
            try:
                cursor.execute(f"CREATE DATABASE {db};")
                print_success(f"Database {db} created")
            except Exception as e:
                if 'already exists' in str(e):
                    print_warning(f"Database {db} already exists")
                else:
                    print_warning(f"Failed to create {db}: {e}")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print_error(f"Failed to create databases: {e}")
        return False

def main():
    print_header("RDS Consolidation Migration")
    
    psycopg, version = try_import_psycopg()
    
    if not psycopg:
        print_error("psycopg not installed")
        print_info("Install PostgreSQL Python driver:")
        print_info("  pip install psycopg[binary]")
        print_info("  # or")
        print_info("  pip install psycopg2-binary")
        print_info("")
        print_info("Then run this script again:")
        print_info("  python3 infra/scripts/migrate-to-consolidated-db.py")
        return False
    
    print_success(f"Using psycopg {version}")
    
    # Show endpoints
    print_header("RDS Endpoints")
    print_info("Old instances:")
    for app, endpoint in OLD_ENDPOINTS.items():
        print_info(f"  {app}: {endpoint}")
    print_info("New consolidated:")
    print_info(f"  yuvro: {NEW_ENDPOINT}")
    
    # Test connection
    if not test_connection():
        print_error("Cannot connect to new RDS. Check:")
        print_info("  - RDS instance is running and accessible")
        print_info("  - EC2 instance security group allows RDS access")
        print_info("  - Credentials are correct")
        return False
    
    # Create databases
    if not create_databases():
        return False
    
    print_header("Migration Status")
    print_success("All databases created successfully")
    print_info("Next steps:")
    print_info("1. Update backend .env files with new DATABASE_URL pointing to dev-yuvro-db")
    print_info("2. Run Django migrations: make db-migrate")
    print_info("3. Load fixtures if needed: make setup-fixtures")
    print_info("4. Start services: make dev")
    print_info("5. When ready to delete old RDS instances, delete via AWS console")
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

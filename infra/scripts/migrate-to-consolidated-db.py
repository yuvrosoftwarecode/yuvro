#!/usr/bin/env python3
"""
Migrate data from 5 separate RDS instances to single consolidated yuvro-dev-db instance
Uses pg_dump and psql for database migration - runs commands via subprocess
This script must be run from an EC2 instance with network access to both old and new RDS instances
"""

import sys
import os
import subprocess
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
    print(f"{GREEN}✓ {msg}{NC}")

def print_error(msg):
    print(f"{RED}✗ {msg}{NC}")

def print_warning(msg):
    print(f"{YELLOW}⚠ {msg}{NC}")

def print_info(msg):
    print(f"{CYAN}ℹ {msg}{NC}")

def print_step(msg):
    print(f"{BOLD}› {msg}{NC}")

# RDS endpoints and credentials
# Both old and new instances use the same username (yuvro_admin) and password
OLD_INSTANCES = {
    'ycode': {
        'endpoint': 'dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
        'database': 'ycode',
        'user': 'yuvro_admin'  # Same as new instance
    },
    'ycampus': {
        'endpoint': 'dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
        'database': 'ycampus',
        'user': 'yuvro_admin'  # Same as new instance
    },
    'yhub': {
        'endpoint': 'dev-yhub-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
        'database': 'yhub',
        'user': 'yuvro_admin'  # Same as new instance
    },
    'ylabs': {
        'endpoint': 'dev-ylabs-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
        'database': 'ylabs',
        'user': 'yuvro_admin'  # Same as new instance
    },
}

NEW_INSTANCE = {
    'endpoint': 'dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
    'user': 'yuvro_admin'
}

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

def check_requirements():
    """Check if pg_dump and psql are available"""
    print_step("Checking PostgreSQL tools...")
    
    try:
        subprocess.run(['pg_dump', '--version'], capture_output=True, check=True, text=True)
        print_success("pg_dump found")
    except (FileNotFoundError, subprocess.CalledProcessError):
        print_error("pg_dump not found. Install PostgreSQL client:")
        print_info("  Ubuntu/Debian: sudo apt-get install postgresql-client")
        print_info("  macOS: brew install postgresql")
        return False
    
    try:
        subprocess.run(['psql', '--version'], capture_output=True, check=True, text=True)
        print_success("psql found")
    except (FileNotFoundError, subprocess.CalledProcessError):
        print_error("psql not found. Install PostgreSQL client")
        return False
    
    return True

def test_connection(endpoint, user, password, dbname='postgres'):
    """Test connection to PostgreSQL database"""
    env = os.environ.copy()
    env['PGPASSWORD'] = password
    
    cmd = [
        'psql',
        '-h', endpoint,
        '-U', user,
        '-d', dbname,
        '-p', str(DB_PORT),
        '-c', 'SELECT version();'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10, env=env)
        if result.returncode == 0:
            return True, result.stdout.strip()
        else:
            return False, result.stderr.strip()
    except Exception as e:
        return False, str(e)

def migrate_database(old_instance, new_password):
    """Migrate a single database from old to new RDS"""
    app_name = list(OLD_INSTANCES.keys())[list(OLD_INSTANCES.values()).index(old_instance)]
    db_name = old_instance['database']
    
    print_step(f"Migrating {app_name} database...")
    
    # Get password - same for old and new instances
    old_password = new_password
    
    # Environment variables for both connections
    env = os.environ.copy()
    env['PGPASSWORD'] = old_password
    
    try:
        # Dump from old RDS
        print_info(f"  Dumping from {old_instance['endpoint']}...")
        pg_dump_cmd = [
            'pg_dump',
            '-h', old_instance['endpoint'],
            '-U', old_instance['user'],
            '-d', old_instance['database'],
            '-p', str(DB_PORT),
            '--no-password',
            '--create',  # Include CREATE DATABASE statement
            '--verbose'
        ]
        
        dump_result = subprocess.run(pg_dump_cmd, capture_output=True, text=True, timeout=300, env=env)
        
        if dump_result.returncode != 0:
            print_error(f"pg_dump failed: {dump_result.stderr}")
            return False
        
        dump_data = dump_result.stdout
        print_success(f"  Database dump created ({len(dump_data) / (1024*1024):.2f} MB)")
        
        # Restore to new RDS
        print_info(f"  Restoring to {NEW_INSTANCE['endpoint']}...")
        
        # First, create database if it doesn't exist
        env['PGPASSWORD'] = new_password
        
        create_db_cmd = [
            'psql',
            '-h', NEW_INSTANCE['endpoint'],
            '-U', NEW_INSTANCE['user'],
            '-p', str(DB_PORT),
            '-d', 'postgres',
            '-c', f"CREATE DATABASE {db_name};"
        ]
        
        create_result = subprocess.run(create_db_cmd, capture_output=True, text=True, timeout=30, env=env)
        if create_result.returncode != 0:
            if 'already exists' in create_result.stderr:
                print_warning(f"  Database {db_name} already exists, will overwrite")
            else:
                print_warning(f"  Could not create database: {create_result.stderr}")
        else:
            print_success(f"  Database {db_name} created")
        
        # Restore data
        psql_cmd = [
            'psql',
            '-h', NEW_INSTANCE['endpoint'],
            '-U', NEW_INSTANCE['user'],
            '-p', str(DB_PORT),
            '-d', 'postgres'
        ]
        
        restore_result = subprocess.run(
            psql_cmd,
            input=dump_data,
            capture_output=True,
            text=True,
            timeout=600,
            env=env
        )
        
        if restore_result.returncode != 0:
            print_error(f"psql restore failed: {restore_result.stderr}")
            return False
        
        print_success(f"  {app_name} data migrated successfully")
        return True
        
    except subprocess.TimeoutExpired:
        print_error(f"  Migration timed out for {app_name}")
        return False
    except Exception as e:
        print_error(f"  Migration failed: {str(e)}")
        return False

def verify_migration():
    """Verify data was migrated correctly"""
    print_header("Verifying Migration")
    
    new_password = read_password_from_tfvars('db_master_password')
    env = os.environ.copy()
    env['PGPASSWORD'] = new_password
    
    for app_name, old_instance in OLD_INSTANCES.items():
        db_name = old_instance['database']
        
        cmd = [
            'psql',
            '-h', NEW_INSTANCE['endpoint'],
            '-U', NEW_INSTANCE['user'],
            '-p', str(DB_PORT),
            '-d', db_name,
            '-c', "SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10, env=env)
            if result.returncode == 0:
                output = result.stdout.strip().split('\n')
                if len(output) >= 3:
                    table_count = output[-2].strip()
                    print_success(f"{app_name}: {table_count} tables")
            else:
                print_warning(f"{app_name}: Could not verify")
        except Exception as e:
            print_warning(f"{app_name}: Verification error - {str(e)}")

def main():
    print_header("RDS Data Migration - Copy All Databases")
    print_info("This script migrates data from 5 old RDS instances to new consolidated instance")
    print_info("IMPORTANT: Must run from EC2 instance with network access to both RDS instances")
    
    # Check requirements
    print_header("Checking Requirements")
    if not check_requirements():
        return False
    
    # Get passwords
    new_password = read_password_from_tfvars('db_master_password')
    
    # Show endpoints
    print_header("Migration Plan")
    print_info("Source instances:")
    for app_name, config in OLD_INSTANCES.items():
        print_info(f"  {app_name}: {config['endpoint']}/{config['database']}")
    print_info("Target instance:")
    print_info(f"  consolidated: {NEW_INSTANCE['endpoint']}")
    
    # Test connections
    print_header("Testing Connections")
    
    print_step(f"Testing connection to new RDS...")
    success, msg = test_connection(
        NEW_INSTANCE['endpoint'],
        NEW_INSTANCE['user'],
        new_password
    )
    if success:
        print_success("Connected to new RDS")
    else:
        print_error(f"Cannot connect to new RDS: {msg}")
        print_info("Make sure:")
        print_info("  - You're running this from EC2 instance")
        print_info("  - EC2 security group allows RDS access")
        print_info("  - New RDS instance is available")
        return False
    
    # Migrate each database
    print_header("Migrating Databases")
    failed_migrations = []
    
    for app_name, old_instance in OLD_INSTANCES.items():
        if not migrate_database(old_instance, new_password):
            failed_migrations.append(app_name)
    
    # Verify
    verify_migration()
    
    # Summary
    print_header("Migration Summary")
    total = len(OLD_INSTANCES)
    successful = total - len(failed_migrations)
    
    print_success(f"Migrated {successful}/{total} databases")
    
    if failed_migrations:
        print_warning(f"Failed to migrate: {', '.join(failed_migrations)}")
        return False
    
    print_success("All data migrated successfully!")
    print_info("Next steps:")
    print_info("  1. Update backend .env files if not already done")
    print_info("  2. Deploy applications with new DATABASE_URL")
    print_info("  3. Verify applications connect and function correctly")
    print_info("  4. Delete old RDS instances via AWS console when ready")
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

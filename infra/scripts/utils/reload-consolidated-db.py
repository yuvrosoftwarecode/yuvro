#!/usr/bin/env python3
"""
Truncate all tables in consolidated RDS and reload data from old RDS instances
This script performs a clean migration:
1. Drops all tables/data in each database on dev-yuvro-db
2. Dumps fresh data from old RDS instances
3. Restores to consolidated RDS
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

# Old RDS endpoints and credentials
OLD_INSTANCES = {
    'ycode': {
        'endpoint': 'dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
        'database': 'ycode',
        'master_user': 'ycode_admin'
    },
    'ycampus': {
        'endpoint': 'dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
        'database': 'ycampus',
        'master_user': 'ycampus_admin'
    },
    'yhub': {
        'endpoint': 'dev-yhub-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
        'database': 'yhub',
        'master_user': 'yhub_admin'
    },
    'ylabs': {
        'endpoint': 'dev-ylabs-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
        'database': 'ylabs',
        'master_user': 'ylabs_admin'
    },
}

NEW_INSTANCE = {
    'endpoint': 'dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com',
    'user': 'yuvro_admin',
    'password': 'ChangeMe123!DevPassword'
}

DB_PORT = 5432
PASSWORD = 'ChangeMe123!DevPassword'

def check_requirements():
    """Check if pg_dump and psql are available"""
    print_step("Checking PostgreSQL tools...")
    
    try:
        result = subprocess.run(['pg_dump', '--version'], capture_output=True, check=True, text=True)
        print_success(f"pg_dump found: {result.stdout.strip()}")
    except (FileNotFoundError, subprocess.CalledProcessError):
        print_error("pg_dump not found. Install PostgreSQL client:")
        print_info("  Ubuntu/Debian: sudo apt-get install postgresql-client")
        print_info("  macOS: brew install postgresql")
        return False
    
    try:
        result = subprocess.run(['psql', '--version'], capture_output=True, check=True, text=True)
        print_success(f"psql found: {result.stdout.strip()}")
    except (FileNotFoundError, subprocess.CalledProcessError):
        print_error("psql not found. Install PostgreSQL client")
        return False
    
    return True

def test_connection(endpoint, user, password, dbname='postgres'):
    """Test connection to PostgreSQL database"""
    env = os.environ.copy()
    env['PGPASSWORD'] = password
    env['PGSSLMODE'] = 'allow'
    
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

def drop_database_content(endpoint, user, password, db_name):
    """Drop all tables from a database"""
    print_step(f"Dropping tables from {db_name}...")
    
    env = os.environ.copy()
    env['PGPASSWORD'] = password
    env['PGSSLMODE'] = 'allow'
    
    # Drop all tables, views, sequences, etc.
    cmd = [
        'psql',
        '-h', endpoint,
        '-U', user,
        '-p', str(DB_PORT),
        '-d', db_name,
        '-c', """
        DO $$ DECLARE r RECORD;
        BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
        """
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=env)
        if result.returncode == 0:
            print_success(f"Dropped all tables from {db_name}")
            return True
        else:
            print_error(f"Failed to drop tables: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print_error(f"Timeout dropping tables from {db_name}")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def dump_and_restore(app_name, old_instance, new_password):
    """Dump from old RDS and restore to new RDS"""
    db_name = old_instance['database']
    old_endpoint = old_instance['endpoint']
    old_user = old_instance['master_user']
    new_endpoint = NEW_INSTANCE['endpoint']
    new_user = NEW_INSTANCE['user']
    
    print_step(f"Dumping {app_name} database...")
    
    # Environment variables for both connections
    env = os.environ.copy()
    env['PGPASSWORD'] = PASSWORD
    env['PGSSLMODE'] = 'allow'
    
    try:
        # Dump from old RDS
        print_info(f"  Dumping from {old_endpoint}...")
        
        dump_cmd = [
            'pg_dump',
            '-h', old_endpoint,
            '-U', old_user,
            '-d', db_name,
            '-p', str(DB_PORT),
            '--no-password',
            '--verbose'
        ]
        
        dump_result = subprocess.run(dump_cmd, capture_output=True, text=True, timeout=600, env=env)
        
        dump_data = dump_result.stdout
        
        if not dump_data or len(dump_data) < 100:
            print_error(f"pg_dump produced no output for {app_name}")
            if dump_result.stderr:
                print_info(f"Error details: {dump_result.stderr[:200]}")
            return False
        
        print_success(f"Database dump created ({len(dump_data) / (1024*1024):.2f} MB)")
        
        # Restore to new RDS
        print_info(f"  Restoring to {new_endpoint}...")
        
        env['PGPASSWORD'] = new_password
        
        psql_cmd = [
            'psql',
            '-h', new_endpoint,
            '-U', new_user,
            '-p', str(DB_PORT),
            '-d', db_name
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
            print_error(f"psql restore failed: {restore_result.stderr[:500]}")
            return False
        
        print_success(f"  {app_name} data restored successfully")
        return True
        
    except subprocess.TimeoutExpired:
        print_error(f"  Migration timed out for {app_name}")
        return False
    except Exception as e:
        print_error(f"  Migration failed: {str(e)}")
        return False

def verify_reload():
    """Verify data was reloaded correctly"""
    print_header("Verifying Data Reload")
    
    new_password = NEW_INSTANCE['password']
    env = os.environ.copy()
    env['PGPASSWORD'] = new_password
    env['PGSSLMODE'] = 'allow'
    
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
    print_header("Consolidate RDS - Truncate and Reload Data")
    print_info("This will DROP ALL DATA in dev-yuvro-db and reload from old instances")
    print_warning("Make sure you have backups before proceeding!")
    
    # Confirmation
    print()
    print("⚠️  WARNING: This operation CANNOT be undone!")
    print()
    response = input("Type 'YES I UNDERSTAND' to continue: ").strip()
    if response != 'YES I UNDERSTAND':
        print_info("Cancelled")
        return False
    
    # Check requirements
    print_header("Checking Requirements")
    if not check_requirements():
        return False
    
    # Test connections
    print_header("Testing Connections")
    
    print_step("Testing connection to new consolidated RDS...")
    success, msg = test_connection(
        NEW_INSTANCE['endpoint'],
        NEW_INSTANCE['user'],
        NEW_INSTANCE['password']
    )
    if success:
        print_success("Connected to new RDS")
    else:
        print_error(f"Cannot connect to new RDS: {msg}")
        return False
    
    # Drop existing data from all databases
    print_header("Dropping Existing Data")
    
    for app_name in OLD_INSTANCES.keys():
        db_name = app_name
        if not drop_database_content(
            NEW_INSTANCE['endpoint'],
            NEW_INSTANCE['user'],
            NEW_INSTANCE['password'],
            db_name
        ):
            print_warning(f"Could not drop tables from {db_name}, continuing anyway...")
    
    # Reload data from old instances
    print_header("Reloading Data from Old RDS Instances")
    
    failed_migrations = []
    
    for app_name, old_instance in OLD_INSTANCES.items():
        if not dump_and_restore(app_name, old_instance, NEW_INSTANCE['password']):
            failed_migrations.append(app_name)
        print()
    
    # Verify
    verify_reload()
    
    # Summary
    print_header("Reload Summary")
    total = len(OLD_INSTANCES)
    successful = total - len(failed_migrations)
    
    print_success(f"Reloaded {successful}/{total} databases")
    
    if failed_migrations:
        print_warning(f"Failed to reload: {', '.join(failed_migrations)}")
        return False
    
    print_success("All data reloaded successfully!")
    print_info("Timestamp: " + datetime.now().isoformat())
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

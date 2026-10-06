#!/usr/bin/env python3
"""
Migrate data from 5 separate RDS instances to single consolidated yuvro-dev-db instance
Runs directly on EC2 without Docker dependencies
"""

import subprocess
import sys
import os
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

def read_password_from_tfvars(app):
    """Read password from dev.tfvars"""
    opentofu_dir = os.path.join(get_project_root(), 'infra', 'opentofu')
    tfvars_file = os.path.join(opentofu_dir, 'dev.tfvars')
    
    try:
        with open(tfvars_file, 'r') as f:
            for line in f:
                if line.startswith(f'{app}_db_password'):
                    # Extract password: key="value" or key=value
                    parts = line.split('=', 1)
                    if len(parts) == 2:
                        password = parts[1].strip()
                        # Remove quotes
                        password = password.strip('"\'')
                        return password
    except Exception as e:
        print_warning(f"Could not read tfvars: {e}")
    
    return "ChangeMe123!DevPassword"

def run_command(cmd, env=None):
    """Run shell command and return output"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            env=env or os.environ.copy(),
            timeout=300
        )
        return result.stdout.strip(), result.stderr.strip(), result.returncode
    except subprocess.TimeoutExpired:
        return "", "Command timed out", 1
    except Exception as e:
        return "", str(e), 1

def backup_database(app, user, endpoint, password):
    """Backup a single database"""
    backup_dir = os.path.join(get_project_root(), 'infra', 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    
    backup_date = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = os.path.join(backup_dir, f'{app}_{backup_date}.sql')
    
    print_step(f"Backing up {app} database...")
    
    env = os.environ.copy()
    env['PGPASSWORD'] = password
    
    cmd = f"pg_dump -h {endpoint} -U {user} -d {app} --if-exists --clean --no-privileges --no-owner > {backup_file}"
    
    stdout, stderr, returncode = run_command(cmd, env)
    
    if returncode == 0 and os.path.getsize(backup_file) > 0:
        size_kb = os.path.getsize(backup_file) / 1024
        print_success(f"Backed up {app}: {backup_file} ({size_kb:.1f}KB)")
        return backup_file
    else:
        print_warning(f"Backup failed for {app}")
        if stderr:
            print_info(f"Error: {stderr}")
        if os.path.exists(backup_file):
            os.remove(backup_file)
        return None

def wait_for_rds(endpoint, user, password):
    """Wait for RDS to be ready"""
    print_header("Waiting for Consolidated RDS to be Ready")
    
    for i in range(60):
        env = os.environ.copy()
        env['PGPASSWORD'] = password
        
        cmd = f"psql -h {endpoint} -U {user} -d postgres -c 'SELECT version();' > /dev/null 2>&1"
        stdout, stderr, returncode = run_command(cmd, env)
        
        if returncode == 0:
            print_success("Consolidated RDS is ready")
            return True
        
        print_info(f"RDS not ready... ({i+1}/60)")
        import time
        time.sleep(10)
    
    print_error("RDS not ready after 60 attempts")
    return False

def create_databases(endpoint, password):
    """Create databases in new RDS"""
    print_header("Creating Application Databases in Consolidated RDS")
    
    databases = ['ycode', 'ycampus', 'yhub', 'ylabs', 'ymarketplace']
    
    env = os.environ.copy()
    env['PGPASSWORD'] = password
    
    for db in databases:
        print_step(f"Creating database: {db}...")
        
        cmd = f"psql -h {endpoint} -U yuvro_admin -d postgres -c 'CREATE DATABASE {db};' 2>/dev/null"
        stdout, stderr, returncode = run_command(cmd, env)
        
        print_success(f"Database {db} ready")

def restore_database(app, endpoint, password, backup_file):
    """Restore a single database"""
    print_step(f"Restoring {app} from {os.path.basename(backup_file)}...")
    
    env = os.environ.copy()
    env['PGPASSWORD'] = password
    
    cmd = f"psql -h {endpoint} -U yuvro_admin -d {app} -f {backup_file}"
    stdout, stderr, returncode = run_command(cmd, env)
    
    if returncode == 0:
        print_success(f"Restored {app}")
    else:
        print_warning(f"Restore may have had issues for {app}")
        if stderr:
            print_info(f"Details: {stderr[:200]}")

def verify_databases(endpoint, password):
    """Verify restored data"""
    print_header("Verifying Restored Data")
    
    databases = ['ycode', 'ycampus', 'yhub', 'ylabs', 'ymarketplace']
    
    env = os.environ.copy()
    env['PGPASSWORD'] = password
    
    for db in databases:
        print_step(f"Checking {db}...")
        
        cmd = f"psql -h {endpoint} -U yuvro_admin -d {db} -t -c 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \"public\";'"
        stdout, stderr, returncode = run_command(cmd, env)
        
        if returncode == 0:
            try:
                table_count = int(stdout.strip())
                if table_count > 0:
                    print_success(f"{db}: {table_count} tables found")
                else:
                    print_warning(f"{db}: No tables found (database may be empty)")
            except:
                print_warning(f"{db}: Could not verify table count")
        else:
            print_warning(f"{db}: Could not connect to verify")

def main():
    print_header("RDS Consolidation Migration")
    
    # Check if psql is available
    stdout, stderr, returncode = run_command("which psql")
    if returncode != 0:
        print_error("psql not found. Install PostgreSQL client:")
        print_info("  Ubuntu/Debian: sudo apt-get install postgresql-client")
        print_info("  macOS: brew install libpq")
        return False
    
    print_success("PostgreSQL client found")
    
    # Show endpoints
    print_header("RDS Endpoints")
    print_info("Old instances:")
    for app, endpoint in OLD_ENDPOINTS.items():
        print_info(f"  {app}: {endpoint}")
    print_info("New consolidated:")
    print_info(f"  yuvro: {NEW_ENDPOINT}")
    
    # Backup old databases
    print_header("Backing Up Old Databases")
    
    users = {
        'ycode': 'ycode_admin',
        'ycampus': 'ycampus_admin',
        'yhub': 'yhub_admin',
        'ylabs': 'ylabs_admin',
    }
    
    backup_files = {}
    
    for app, endpoint in OLD_ENDPOINTS.items():
        user = users[app]
        password = read_password_from_tfvars(app)
        
        backup_file = backup_database(app, user, endpoint, password)
        if backup_file:
            backup_files[app] = backup_file
    
    print_success("All backups completed")
    
    # Wait for new RDS
    new_password = read_password_from_tfvars('db_master')
    if not wait_for_rds(NEW_ENDPOINT, 'yuvro_admin', new_password):
        return False
    
    # Create databases
    create_databases(NEW_ENDPOINT, new_password)
    
    # Restore databases
    print_header("Restoring Data to Consolidated RDS")
    
    for app, backup_file in backup_files.items():
        restore_database(app, NEW_ENDPOINT, new_password, backup_file)
    
    # Verify
    verify_databases(NEW_ENDPOINT, new_password)
    
    # Summary
    print_header("Migration Summary")
    print_success("Data backed up and restored to consolidated RDS")
    print_info(f"Backups saved to: {os.path.join(get_project_root(), 'infra', 'backups')}")
    print_info(f"New consolidated RDS: {NEW_ENDPOINT}")
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

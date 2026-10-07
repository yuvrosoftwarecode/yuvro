#!/usr/bin/env python3
"""
Compare row counts between old RDS instances and new consolidated RDS
Verifies data migration integrity by checking table row counts
"""

import sys
import subprocess
import os
from collections import defaultdict

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

def print_match(msg):
    print(f"{GREEN}  ✓ {msg}{NC}")

def print_mismatch(msg):
    print(f"{RED}  ✗ MISMATCH: {msg}{NC}")

# Old RDS endpoints (with master usernames)
OLD_RDS = {
    'ycode': ('dev-ycode-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com', 'ycode_admin'),
    'ycampus': ('dev-ycampus-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com', 'ycampus_admin'),
    'yhub': ('dev-yhub-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com', 'yhub_admin'),
    'ylabs': ('dev-ylabs-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com', 'ylabs_admin'),
}

# New consolidated RDS
NEW_RDS_HOST = "dev-yuvro-db.ctie88aqw5oa.ap-south-1.rds.amazonaws.com"
NEW_RDS_USER = "yuvro_admin"
NEW_RDS_PASSWORD = "ChangeMe123!DevPassword"
NEW_RDS_PORT = 5432

DB_PASSWORD = "ChangeMe123!DevPassword"
DB_PORT = 5432

def get_table_list(endpoint, user, password, db_name):
    """Get list of tables in a database"""
    env = os.environ.copy()
    env['PGPASSWORD'] = password
    env['PGSSLMODE'] = 'allow'
    
    cmd = [
        'psql',
        '-h', endpoint,
        '-U', user,
        '-p', str(DB_PORT),
        '-d', db_name,
        '-t', '-c',
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10, env=env)
        if result.returncode == 0:
            tables = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
            return tables
        else:
            return None
    except Exception as e:
        print_error(f"Error fetching table list: {str(e)}")
        return None

def get_row_count(endpoint, user, password, db_name, table_name):
    """Get row count for a specific table"""
    env = os.environ.copy()
    env['PGPASSWORD'] = password
    env['PGSSLMODE'] = 'allow'
    
    cmd = [
        'psql',
        '-h', endpoint,
        '-U', user,
        '-p', str(DB_PORT),
        '-d', db_name,
        '-t', '-c',
        f'SELECT COUNT(*) FROM "{table_name}";'
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, env=env)
        if result.returncode == 0:
            count = int(result.stdout.strip())
            return count
        else:
            return None
    except Exception as e:
        return None

def compare_databases():
    """Compare all databases and their tables"""
    print_header("Comparing Row Counts: Old vs New RDS")
    
    stats = {
        'total_tables': 0,
        'matching_tables': 0,
        'mismatched_tables': 0,
        'missing_tables': 0,
        'error_tables': 0,
        'databases': {}
    }
    
    for app_name, (old_endpoint, old_user) in OLD_RDS.items():
        db_name = app_name
        
        print(f"\n{BOLD}════════════════════════════════════════════{NC}")
        print(f"{BOLD}Database: {app_name}{NC}")
        print(f"{BOLD}════════════════════════════════════════════{NC}")
        
        # Get table list from old database
        print()
        print_info(f"Fetching table list from old RDS ({old_endpoint})...")
        
        old_tables = get_table_list(old_endpoint, old_user, DB_PASSWORD, db_name)
        
        if old_tables is None:
            print_warning(f"Could not connect to old {app_name} database")
            continue
        
        print_success(f"Found {len(old_tables)} tables")
        
        # Compare each table
        print()
        print_info("Comparing row counts...")
        print()
        
        db_matches = 0
        db_mismatches = 0
        db_missing = 0
        db_errors = 0
        
        for table_name in old_tables:
            stats['total_tables'] += 1
            
            # Get old row count
            old_count = get_row_count(old_endpoint, old_user, DB_PASSWORD, db_name, table_name)
            
            if old_count is None:
                print_mismatch(f"{db_name}.{table_name}: Could not query old database")
                db_errors += 1
                stats['error_tables'] += 1
                continue
            
            # Get new row count
            new_count = get_row_count(NEW_RDS_HOST, NEW_RDS_USER, NEW_RDS_PASSWORD, db_name, table_name)
            
            if new_count is None:
                print_mismatch(f"{db_name}.{table_name}: Missing in new RDS")
                db_missing += 1
                stats['missing_tables'] += 1
            elif old_count == new_count:
                print_match(f"{db_name}.{table_name}: {old_count} rows")
                db_matches += 1
                stats['matching_tables'] += 1
            else:
                print_mismatch(f"{db_name}.{table_name}: old={old_count}, new={new_count}")
                db_mismatches += 1
                stats['mismatched_tables'] += 1
        
        # Summary for this database
        print()
        print(f"{BOLD}Summary for {app_name}:{NC}")
        total_checked = db_matches + db_mismatches + db_missing + db_errors
        print(f"  Tables checked: {total_checked}")
        print_success(f"Matching: {db_matches}")
        if db_mismatches > 0:
            print_error(f"Mismatched: {db_mismatches}")
        if db_missing > 0:
            print_error(f"Missing in new: {db_missing}")
        if db_errors > 0:
            print_error(f"Errors: {db_errors}")
        
        stats['databases'][app_name] = {
            'matches': db_matches,
            'mismatches': db_mismatches,
            'missing': db_missing,
            'errors': db_errors
        }
    
    # Overall summary
    print_header("Overall Migration Verification")
    
    print()
    print(f"Total tables checked: {stats['total_tables']}")
    print_success(f"Matching row counts: {stats['matching_tables']}")
    
    if stats['mismatched_tables'] > 0:
        print_error(f"Mismatched row counts: {stats['mismatched_tables']}")
    
    if stats['missing_tables'] > 0:
        print_error(f"Missing in new RDS: {stats['missing_tables']}")
    
    if stats['error_tables'] > 0:
        print_error(f"Query errors: {stats['error_tables']}")
    
    print()
    
    # Detailed results by database
    print(f"{BOLD}Results by Database:{NC}")
    for app_name, db_stats in stats['databases'].items():
        total = db_stats['matches'] + db_stats['mismatches'] + db_stats['missing'] + db_stats['errors']
        match_pct = (db_stats['matches'] / total * 100) if total > 0 else 0
        status = f"{match_pct:.1f}% match"
        if db_stats['mismatches'] > 0 or db_stats['missing'] > 0 or db_stats['errors'] > 0:
            print(f"  {app_name}: {status} ({db_stats['matches']}/{total} tables) ⚠️")
        else:
            print(f"  {app_name}: {status} ({db_stats['matches']}/{total} tables) ✓")
    
    print()
    
    # Final verdict
    if stats['mismatched_tables'] == 0 and stats['missing_tables'] == 0 and stats['error_tables'] == 0:
        print_success("Migration verification PASSED - All row counts match!")
        return 0
    else:
        print_error("Migration verification FAILED - Discrepancies found")
        print()
        print("Next steps:")
        print("1. Check above for specific mismatches")
        print("2. If tables missing: migration may be incomplete")
        print("3. If row counts differ: re-run migration or check data integrity")
        return 1

if __name__ == '__main__':
    exit_code = compare_databases()
    sys.exit(exit_code)

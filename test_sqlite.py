import asyncio
import tempfile
import os

async def test_sqlite():
    db_file = "__none__"
    workspace_dir = "."
    query = "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT NOT NULL);"
    system_query = "PRAGMA table_info(users);"

    # Execute
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        f.write(query)
        temp_path = f.name
    
    proc = await asyncio.create_subprocess_shell(
        f'sqlite3 "{db_file}" < "{temp_path}"',
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=workspace_dir
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
    os.unlink(temp_path)
    
    # System query
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as f:
        f.write(system_query)
        temp_path = f.name
    
    proc = await asyncio.create_subprocess_shell(
        f'sqlite3 "{db_file}" < "{temp_path}"',
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=workspace_dir
    )
    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
    os.unlink(temp_path)

    actual_result = stdout.decode().strip() if proc.returncode == 0 else stderr.decode().strip()
    print("Actual Result:", repr(actual_result))

asyncio.run(test_sqlite())

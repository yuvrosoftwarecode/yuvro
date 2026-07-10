import os
import re
import json

from generate_sqlite_sprints import sprints

BASE_DIR = "yuvro-scoring-rules"

def to_snake_case(name):
    # Remove special characters, replace spaces with underscores, lower case
    s = re.sub(r'[^a-zA-Z0-9\s_]', '', name)
    s = re.sub(r'\s+', '_', s).lower()
    return s

def parse_markdown_table_to_dicts(table_str):
    if not table_str.strip().startswith('|'):
        # If it's not a table, just wrap it in a dict to be JSON compatible
        return [{"message": table_str.strip()}]
    
    lines = [line.strip() for line in table_str.strip().split('\n') if line.strip()]
    if len(lines) < 3:
        return [{"message": table_str.strip()}]
    
    # Header
    headers = [col.strip() for col in lines[0].split('|')[1:-1]]
    
    data = []
    for line in lines[2:]:
        cols = [col.strip() for col in line.split('|')[1:-1]]
        row_dict = {}
        for i, header in enumerate(headers):
            val = cols[i] if i < len(cols) else ""
            # Try to convert to int if possible
            try:
                if val.upper() != 'NULL':
                    val = int(val)
                else:
                    val = None
            except ValueError:
                pass
            row_dict[header] = val
        data.append(row_dict)
    
    return data

def main():
    if not os.path.exists(BASE_DIR):
        os.makedirs(BASE_DIR)
        
    for i, sprint in enumerate(sprints, 1):
        sprint_name_clean = sprint['name'].split(' - ')[1] if ' - ' in sprint['name'] else sprint['name']
        sprint_code = f"S{i:02d}_{to_snake_case(sprint_name_clean)}"
        
        sprint_dir = os.path.join(BASE_DIR, sprint_code)
        if not os.path.exists(sprint_dir):
            os.makedirs(sprint_dir)
            
        for task in sprint['tasks']:
            # Example title: 'Task 101 — Create the Database'
            title_parts = task['title'].split(' — ')
            task_code = title_parts[0].replace('Task ', '').strip()
            task_name = title_parts[1].strip()
            
            task_file_name = f"{task_code}_{to_snake_case(task_name)}.py"
            task_path = os.path.join(sprint_dir, task_file_name)
            
            # Extract points
            points = 50
            if 'pts' in task['scoring']:
                pts_str = task['scoring'].split(' ')[0]
                if pts_str.isdigit():
                    points = int(pts_str)
            
            # Write Python file
            with open(task_path, 'w', encoding='utf-8') as f:
                f.write('import sqlite3\n')
                f.write('import tempfile\n')
                f.write('import shutil\n')
                f.write('import os\n\n')
                f.write('\"\"\"\n')
                f.write(f'Task Code : {task_code}\n')
                f.write(f'Task Name : {task_name}\n')
                f.write(f'Sprint    : {sprint_code}\n')
                f.write(f'Points    : {points}\n')
                f.write(f'Eval Type : {task["eval_type"]}\n')
                f.write('\"\"\"\n\n')
                
                f.write('LAB = "SQLITE"\n')
                f.write(f'TASK_CODE = "{task_code}"\n')
                f.write(f'TASK_NAME = "{task_name}"\n')
                f.write(f'SPRINT_CODE = "{sprint_code}"\n')
                f.write(f'POINTS = {points}\n')
                f.write(f'EVALUATION_TYPE = "{task["eval_type"]}"\n')
                f.write('DATABASE_FILE = "todo.db"\n\n')
                
                f.write('HIDDEN_REFERENCE_SOLUTION = """\n')
                f.write(task['solution'] + '\n')
                f.write('"""\n\n')
                
                f.write('SYSTEM_VERIFICATION_QUERY = """\n')
                f.write(task['system_query'] + '\n')
                f.write('"""\n\n')
                
                f.write('def evaluate(user_query):\n')
                f.write('    """\n')
                f.write('    Executes the dynamic evaluation lifecycle.\n')
                f.write('    """\n')
                f.write('    fd, temp_db_path = tempfile.mkstemp(suffix=".db")\n')
                f.write('    os.close(fd)\n')
                f.write('    if os.path.exists(DATABASE_FILE):\n')
                f.write('        shutil.copy2(DATABASE_FILE, temp_db_path)\n')
                f.write('    else:\n')
                f.write('        open(temp_db_path, "w").close()\n\n')
                
                f.write('    try:\n')
                f.write('        # 1. Execute the student SQL query.\\n')
                f.write('        conn = sqlite3.connect(temp_db_path)\n')
                f.write('        cursor = conn.cursor()\n')
                f.write('        try:\n')
                f.write('            cursor.executescript(user_query)\n')
                f.write('        except Exception as e:\n')
                f.write('            return {"success": False, "message": f"Syntax error in your query: {str(e)}"}\n\n')
                
                f.write('        # 2. Execute the SYSTEM_VERIFICATION_QUERY and store student_result\n')
                f.write('        try:\n')
                f.write('            cursor.execute(SYSTEM_VERIFICATION_QUERY)\n')
                f.write('            student_result = cursor.fetchall()\n')
                f.write('        except Exception as e:\n')
                f.write('            return {"success": False, "message": f"Verification query failed on your database state: {str(e)}"}\n')
                f.write('        finally:\n')
                f.write('            conn.close()\n\n')
                
                f.write('        # 3. Reset the database back to its initial state.\n')
                f.write('        if os.path.exists(DATABASE_FILE):\n')
                f.write('            shutil.copy2(DATABASE_FILE, temp_db_path)\n')
                f.write('        else:\n')
                f.write('            open(temp_db_path, "w").close()\n\n')
                
                f.write('        # 4. Execute the HIDDEN_REFERENCE_SOLUTION.\n')
                f.write('        conn = sqlite3.connect(temp_db_path)\n')
                f.write('        cursor = conn.cursor()\n')
                f.write('        try:\n')
                f.write('            cursor.executescript(HIDDEN_REFERENCE_SOLUTION)\n')
                f.write('        except Exception as e:\n')
                f.write('            return {"success": False, "message": f"System error executing reference solution: {str(e)}"}\n\n')
                
                f.write('        # 5. Execute the SAME SYSTEM_VERIFICATION_QUERY again and store reference_result\n')
                f.write('        try:\n')
                f.write('            cursor.execute(SYSTEM_VERIFICATION_QUERY)\n')
                f.write('            reference_result = cursor.fetchall()\n')
                f.write('        except Exception as e:\n')
                f.write('            return {"success": False, "message": f"System error executing verification query: {str(e)}"}\n')
                f.write('        finally:\n')
                f.write('            conn.close()\n\n')
                
                f.write('        # 6. Normalize both result sets if required\n')
                f.write('        try:\n')
                f.write('            student_result_norm = sorted(student_result)\n')
                f.write('            reference_result_norm = sorted(reference_result)\n')
                f.write('        except TypeError:\n')
                f.write('            student_result_norm = student_result\n')
                f.write('            reference_result_norm = reference_result\n\n')
                
                f.write('        # 7. Compare results and award points\n')
                f.write('        is_correct = (student_result_norm == reference_result_norm)\n')
                f.write('        if is_correct:\n')
                f.write('            return {\n')
                f.write('                "success": True,\n')
                f.write('                "score_awarded": POINTS,\n')
                f.write('                "points_possible": POINTS,\n')
                f.write('                "evaluation_type": EVALUATION_TYPE,\n')
                f.write('                "message": "Correct solution.",\n')
                f.write('                "actual_result": student_result,\n')
                f.write('                "expected_result": reference_result\n')
                f.write('            }\n')
                f.write('        else:\n')
                f.write('            return {\n')
                f.write('                "success": False,\n')
                f.write('                "score_awarded": 0,\n')
                f.write('                "points_possible": POINTS,\n')
                f.write('                "evaluation_type": EVALUATION_TYPE,\n')
                f.write('                "message": "Your query did not produce the expected database state or result set.",\n')
                f.write('                "actual_result": student_result,\n')
                f.write('                "expected_result": reference_result\n')
                f.write('            }\n')
                
                f.write('    finally:\n')
                f.write('        if os.path.exists(temp_db_path):\n')
                f.write('            os.remove(temp_db_path)\n')

    # Generate README
    readme_content = """# Yuvro Scoring Rules (SQLite)

This directory acts as the central reference repository for all SQLite evaluation rules and logic within the YLabs ecosystem.

## Purpose of the Scoring Rules
This folder definitively separates student-facing learning material from internal evaluation and scoring logic. It acts as the source of truth for verification queries and expected database states. 

**IMPORTANT**: These files currently exist as developer reference templates. They validate our organizational structure, expected results schema, and metadata schemas prior to final integration.

## Folder Organization & Naming Conventions
- **Sprints**: Each sprint possesses its own directory (e.g., `S01_database_initialization`).
- **Tasks**: Each task possesses exactly one Python evaluator file within its corresponding sprint folder.
- **Task Naming**: Files use the `<task_code>_<task_name>.py` format (e.g., `201_create_users_table.py`) so the backend can instantly map a student submission ID to the correct evaluator.

## Metadata Fields
Each Python file is fully loaded with evaluation metadata:
- `LAB`: The lab context (`SQLITE`).
- `TASK_CODE`: Unique task ID matching the frontend.
- `TASK_NAME`: Human-readable task name.
- `SPRINT_CODE`: Human-readable sprint name.
- `POINTS`: Base points achievable.
- `EVALUATION_TYPE`: Determines how `yuvro-code-executer` will process the file (`DATABASE_STATE`, `SCHEMA`, `RESULT_SET`, `INDEX`).
- `DATABASE_FILE`: Local file target (`todo.db`).
- `HIDDEN_REFERENCE_SOLUTION`: The correct, hidden student query.
- `SYSTEM_VERIFICATION_QUERY`: The query the evaluator runs after the student.

*Note: The expected output is generated dynamically by executing the HIDDEN_REFERENCE_SOLUTION on a fresh database and then executing the SYSTEM_VERIFICATION_QUERY. This approach avoids hardcoding expected outputs, keeps the evaluator generic, and automatically adapts if the reference solution changes.*

## Evaluation Flow
1. Start with a fresh copy of the SQLite database.
2. Execute the student's SQL query.
3. Execute the `SYSTEM_VERIFICATION_QUERY`.
4. Store the returned result as `student_result`.
5. Reset the database back to its initial state.
6. Execute the `HIDDEN_REFERENCE_SOLUTION`.
7. Execute the same `SYSTEM_VERIFICATION_QUERY` again.
8. Store the returned result as `reference_result`.
9. Normalize both result sets if required (ordering, formatting, etc.).
10. Compare `student_result` with `reference_result`.
11. If both match exactly, award full points, otherwise award zero points.
"""
    with open(os.path.join(BASE_DIR, 'README.md'), 'w', encoding='utf-8') as f:
        f.write(readme_content)
        
    print(f"Successfully generated {BASE_DIR} and README.md")

if __name__ == '__main__':
    main()

import sqlite3
import tempfile
import shutil
import os

"""
Task Code : 903
Task Name : Create Index
Sprint    : S09_set_operations_advanced_schema
Points    : 50
Eval Type : INDEX
"""

LAB = "SQLITE"
TASK_CODE = "903"
TASK_NAME = "Create Index"
SPRINT_CODE = "S09_set_operations_advanced_schema"
POINTS = 50
EVALUATION_TYPE = "INDEX"
DATABASE_FILE = "todo.db"

HIDDEN_REFERENCE_SOLUTION = """
CREATE INDEX idx_todos_status ON todos(status);
"""

SYSTEM_VERIFICATION_QUERY = """
SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_todos_status';
"""

def evaluate(user_query):
    """
    Executes the dynamic evaluation lifecycle.
    """
    fd, temp_db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    if os.path.exists(DATABASE_FILE):
        shutil.copy2(DATABASE_FILE, temp_db_path)
    else:
        open(temp_db_path, "w").close()

    try:
        # 1. Execute the student SQL query.\n        conn = sqlite3.connect(temp_db_path)
        cursor = conn.cursor()
        try:
            cursor.executescript(user_query)
        except Exception as e:
            return {"success": False, "message": f"Syntax error in your query: {str(e)}"}

        # 2. Execute the SYSTEM_VERIFICATION_QUERY and store student_result
        try:
            cursor.execute(SYSTEM_VERIFICATION_QUERY)
            student_result = cursor.fetchall()
        except Exception as e:
            return {"success": False, "message": f"Verification query failed on your database state: {str(e)}"}
        finally:
            conn.close()

        # 3. Reset the database back to its initial state.
        if os.path.exists(DATABASE_FILE):
            shutil.copy2(DATABASE_FILE, temp_db_path)
        else:
            open(temp_db_path, "w").close()

        # 4. Execute the HIDDEN_REFERENCE_SOLUTION.
        conn = sqlite3.connect(temp_db_path)
        cursor = conn.cursor()
        try:
            cursor.executescript(HIDDEN_REFERENCE_SOLUTION)
        except Exception as e:
            return {"success": False, "message": f"System error executing reference solution: {str(e)}"}

        # 5. Execute the SAME SYSTEM_VERIFICATION_QUERY again and store reference_result
        try:
            cursor.execute(SYSTEM_VERIFICATION_QUERY)
            reference_result = cursor.fetchall()
        except Exception as e:
            return {"success": False, "message": f"System error executing verification query: {str(e)}"}
        finally:
            conn.close()

        # 6. Normalize both result sets if required
        try:
            student_result_norm = sorted(student_result)
            reference_result_norm = sorted(reference_result)
        except TypeError:
            student_result_norm = student_result
            reference_result_norm = reference_result

        # 7. Compare results and award points
        is_correct = (student_result_norm == reference_result_norm)
        if is_correct:
            return {
                "success": True,
                "score_awarded": POINTS,
                "points_possible": POINTS,
                "evaluation_type": EVALUATION_TYPE,
                "message": "Correct solution.",
                "actual_result": student_result,
                "expected_result": reference_result
            }
        else:
            return {
                "success": False,
                "score_awarded": 0,
                "points_possible": POINTS,
                "evaluation_type": EVALUATION_TYPE,
                "message": "Your query did not produce the expected database state or result set.",
                "actual_result": student_result,
                "expected_result": reference_result
            }
    finally:
        if os.path.exists(temp_db_path):
            os.remove(temp_db_path)

import sqlite3
import tempfile
import shutil
import os

"""
Task Code : 302
Task Name : Insert First Todos
Sprint    : S03_basic_data_insertion
Points    : 50
Eval Type : DATABASE_STATE
"""

LAB = "SQLITE"
TASK_CODE = "302"
TASK_NAME = "Insert First Todos"
SPRINT_CODE = "S03_basic_data_insertion"
POINTS = 50
EVALUATION_TYPE = "DATABASE_STATE"
DATABASE_FILE = "todo.db"

HIDDEN_REFERENCE_SOLUTION = """
INSERT INTO todos (id, user_id, title, priority, status) VALUES (1, 1, 'Setup database', 3, 'pending');
INSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (2, 1, 'Design schema', 1, '2026-06-15', 'completed');
INSERT INTO todos (id, user_id, title, priority, status) VALUES (3, 1, 'Configure CI/CD', 3, 'cancelled');
INSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (4, 2, 'Deploy production', 1, '2026-06-20', 'completed');
INSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (5, 2, 'Monitor disk usage', 2, '2026-06-25', 'pending');
INSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (6, 3, 'Create wireframes', 2, '2026-06-10', 'completed');
INSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (7, 4, 'Write test cases', 3, '2026-07-25', 'pending');
INSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (8, 5, 'Project kickoff', 1, '2026-06-01', 'completed');
INSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (9, 5, 'Weekly sync', 3, '2026-07-30', 'pending');
"""

SYSTEM_VERIFICATION_QUERY = """
SELECT * FROM todos ORDER BY id;
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

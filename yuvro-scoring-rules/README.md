# Yuvro Scoring Rules (SQLite)

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

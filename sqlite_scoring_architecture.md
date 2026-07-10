# SQLite Scoring Architecture

This document describes how the SQLite Lab is evaluated by the YLabs platform. Its intended audience is developers working on `ylabs-web`, `ylabs-backend-api`, and `yuvro-code-executer`. It establishes the guidelines for how scoring logic is separated from the student-facing curriculum.

---

## 1. High Level Architecture

The evaluation ecosystem relies on three core components communicating to validate the learner's SQL submissions.

**Interaction Flow:**
```text
Student
   ↓
ylabs-web
   ↓
ylabs-backend-api
   ↓
SQLite Code Executor
   ↓
SQLite Scoring Rules
   ↓
Evaluation Result
   ↓
Backend
   ↓
Frontend
```

**Responsibilities:**
- **ylabs-web**: The frontend interface where the student interacts with the lab, writes SQL queries, and views evaluation results.
- **ylabs-backend-api**: The central hub that routes student submissions from the frontend to the code executor and handles recording the awarded score upon completion.
- **yuvro-code-executer**: An isolated environment that receives the student's submission, dynamically loads the appropriate scoring rules, executes the queries safely against the database, and returns a structured JSON evaluation result.

---

## 2. SQLite Repository Structure

The project structure rigidly separates student-facing content from the hidden evaluation logic.

**Example Folder Structure:**
```text
sqlite-lab/
    notion_sqlite_sprints.md
    starter-files/
        todo.db
        README.md
        student.sql
    yuvro-scoring-rules/
        S01_database_schema/
        S02_insert/
        S03_select/
        S04_filtering/
        S05_sorting/
        S06_updates/
        S07_aggregation/
        S08_joins/
        S09_advanced/
```

**Purpose of Folders:**
- `notion_sqlite_sprints.md`: The curriculum definition (not directly used by the evaluator runtime).
- `starter-files/`: Contains the baseline files provided to every student at the start of the lab. This is the extent of their file visibility.
- `yuvro-scoring-rules/`: The highly isolated directory containing all Python scoring files used by the `yuvro-code-executer`. This folder is invisible to learners.

---

## 3. Sprint Folder Naming Convention

Scoring rules are grouped logically by sprint to maintain organization.

**Naming Convention:**
`S<Sprint Number>_<Sprint Topic>`

**Examples:**
- `S01_database_schema`
- `S02_insert`
- `S03_select`
- `S04_filtering`

**Reasoning:**
Every sprint has its own folder to keep the repository navigable. Since the lab contains nearly 40 tasks, placing all evaluation files into a single directory would become unmanageable.

---

## 4. Task File Naming Convention

Every task should have exactly one Python evaluator to ensure modularity and ease of debugging.

**Naming Format:**
`<task_code>_<task_name>.py`

**Examples:**
- `101_create_database.py`
- `102_create_users_table.py`
- `202_insert_users.py`
- `403_filter_pending_tasks.py`
- `705_group_by_status.py`

**Reasoning:**
The task code in the filename allows the backend to instantly and programmatically resolve the correct evaluation file based strictly on the ID of the task being submitted by the student, preventing naming collisions and simplifying the routing logic.

---

## 5. Standard Structure of a Scoring File

Each Python scoring file must expose a standard interface containing evaluation metadata and a primary `evaluate()` function.

**Standard Template:**
```python
TASK_CODE = "201"
TASK_NAME = "Insert Users"
SPRINT_CODE = "S02"
POINTS = 50
EVALUATION_TYPE = "DATABASE_STATE"

REFERENCE_SOLUTION = """
INSERT INTO users (username, email) VALUES 
('alice_dev', 'alice@email.com'),
('bob_ops', 'bob@email.com');
"""

SYSTEM_VERIFICATION_QUERY = "SELECT * FROM users ORDER BY id;"

EXPECTED_VERIFICATION_RESULT = [
    (1, 'alice_dev', 'alice@email.com'),
    (2, 'bob_ops', 'bob@email.com')
]

def evaluate(user_submission):
    """
    Execute student's query.
    Execute verification query.
    Compare result.
    Return evaluation JSON.
    """
    pass
```

**Purpose of Fields:**
- `TASK_CODE` / `TASK_NAME` / `SPRINT_CODE`: Identifiers for logging and mapping.
- `POINTS`: The maximum score achievable for this specific task.
- `EVALUATION_TYPE`: Directs the executor on how to evaluate the task (see Section 6).
- `REFERENCE_SOLUTION`: The correct query (used for fallback or hints).
- `SYSTEM_VERIFICATION_QUERY`: The query the evaluator runs *after* the student's query to verify state.
- `EXPECTED_VERIFICATION_RESULT`: The literal object the system query must return to award full points.
- `evaluate()`: The singular function invoked by `yuvro-code-executer` to evaluate this exact task.

---

## 6. Evaluation Types

The `EVALUATION_TYPE` instructs the executor on how to validate the submission.

- **RESULT_SET**
  - **Used for**: `SELECT`, `GROUP BY`, `HAVING`, `JOIN`
  - **Verification Method**: The evaluator compares the raw rows returned by the student's query against the rows returned by the reference solution.

- **DATABASE_STATE**
  - **Used for**: `INSERT`, `UPDATE`, `DELETE`
  - **Verification Method**: The evaluator executes the student's query, then executes the `SYSTEM_VERIFICATION_QUERY` to inspect the entire state of the table, ensuring the side effects occurred as expected.

- **SCHEMA**
  - **Used for**: `CREATE TABLE`, `ALTER TABLE`
  - **Verification Method**: The evaluator queries `sqlite_master` (or similar schema metadata) to verify the presence of exact tables, columns, defaults, and constraints.

- **INDEX**
  - **Used for**: `CREATE INDEX`, `DROP INDEX`
  - **Verification Method**: The evaluator queries `PRAGMA index_list()` or `sqlite_master` to confirm the index exists and covers the required columns.

---

## 7. Evaluation Workflow

The complete lifecycle of a single submission:

```text
Student writes SQL
       ↓
Backend sends submission
       ↓
Executor loads corresponding scoring file
       ↓
Reference metadata is loaded
       ↓
Student SQL is executed
       ↓
Verification query is executed
       ↓
Actual result is compared with expected result
       ↓
JSON response is generated
       ↓
Backend stores score
       ↓
Frontend displays result
```

---

## 8. Verification Strategy

We do **not** perform string comparisons on the student's SQL. SQL can be formatted in hundreds of valid ways. Instead, we always rely on verification queries to test the final state of the engine.

- **SELECT**: We compare the returned result set. If the rows match, the query is correct, regardless of how they wrote it.
- **INSERT**: We execute a `SELECT *` verification query to confirm the exact rows were inserted into the table.
- **UPDATE**: We execute a verification query to verify the updated database state matches the expected state.
- **DELETE**: We execute a verification query to verify the remaining database state (e.g., ensuring the deleted rows are gone and others remain).
- **CREATE TABLE**: We verify the schema directly using `sqlite_master`.
- **ALTER TABLE**: We verify the updated schema structure using `sqlite_master`.
- **CREATE INDEX**: We verify the index exists in the metadata.

---

## 9. JSON Response Format

The `evaluate()` function must always return a standardized JSON response back to the backend.

**Example Response:**
```json
{
    "success": true,
    "score_awarded": 50,
    "points_possible": 50,
    "evaluation_type": "DATABASE_STATE",
    "message": "Correct solution.",
    "actual_result": [
        [1, "alice_dev", "alice@email.com"]
    ],
    "expected_result": [
        [1, "alice_dev", "alice@email.com"]
    ]
}
```

**Fields:**
- `success`: Boolean indicating if the evaluation passed.
- `score_awarded`: Points earned by the student (0 to `points_possible`).
- `points_possible`: Max points for the task.
- `evaluation_type`: The evaluation strategy used.
- `message`: Feedback for the student (e.g., "Correct solution." or error details).
- `actual_result`: The raw output returned by the student's query (or verification query).
- `expected_result`: The required output that was being compared against.

---

## 10. Student vs Admin Visibility

Maintaining the integrity of the lab requires strict visibility controls.

**Student View:**
```text
starter-files/
student.sql
todo.db
README.md
```

**Admin View:**
```text
starter-files/
student.sql
todo.db
README.md
yuvro-scoring-rules/
```

**Reasoning:**
Scoring rules, verification queries, and expected results must remain hidden from learners. If learners have access to the `yuvro-scoring-rules/` folder, they can bypass the evaluation by returning the expected hardcoded payloads or reading the exact criteria being tested.

---

## 11. Future Extensibility

This architecture is designed specifically for the SQLite Lab. Other labs (such as MongoDB, Python, HTML, CSS, etc.) will possess their own localized scoring architecture documents, because their internal evaluation execution engines operate differently (e.g., checking DOM elements vs executing Python ASTs).

However, **all labs** must adhere to the same overarching organizational principles:
1. One isolated Python evaluator file per task.
2. Organization based on sprints.
3. Completely hidden scoring rules separated from student-facing code.

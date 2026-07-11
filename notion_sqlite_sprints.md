# 📚 SQLite Learning Lab — Interactive Curriculum

Curriculum, Sprint Structure & Planning Document for the SQLite Lab.

---

## 📋 Notion Copy-Paste Instructions
To import this planning page into Notion:
1. Click the raw contents of this file in GitHub/VS Code.
2. Select All and Copy.
3. Paste directly into an empty Notion page (Notion will auto-format the Markdown).

---

## 🎯 Course Overview
* **Lab Name**: SQLite Lab
* **Total Points**: 4500 (approx)
* **Goal**: Take students from basic database initialization to advanced subqueries and performance optimization using an interactive, auto-graded SQLite terminal in the browser.

---

## 🏗 Yuvro Scoring Rules Architecture

We are building an automated evaluation system for YLabs. Every lab (SQLite, MongoDB, Python, HTML, CSS, etc.) should follow the exact same scoring folder structure. The scoring logic should be completely separated from the student-facing files.

### Directory Structure

```text
sqlite-lab/

student-files/
    todo.db
    README.md
    solution.sql

yuvro-scoring-rules/
    S01_database_schema/
        101_create_database.py
        102_create_users_table.py
        103_create_todos_table.py

    S02_insert/
        201_insert_users.py
        202_insert_todos.py

    S03_select/
        301_select_all.py
        302_select_columns.py
        303_distinct.py
```

### Purpose of the Scoring Folder
The `yuvro-scoring-rules/` folder contains only evaluation logic. It is **not visible to learners.** Only administrators and the backend evaluation engine can access it.

### File Explorers

**Student File Explorer**
Here is an example of what a learner sees:
```text
todo.db
solution.sql
README.md
```
The learner must never see `yuvro-scoring-rules/` because it contains hidden evaluation logic.

**Admin File Explorer**
Here is what an administrator sees:
```text
todo.db
solution.sql
README.md
yuvro-scoring-rules/
```
Administrators should have access to all scoring files.

### Purpose of Every Python File
Every task has its own scoring file. Each Python file is responsible for evaluating exactly one task. For example, `201_insert_users.py` should only evaluate Task 201.

### Suggested Structure of Every Scoring File
```python
TASK_CODE = "201"
TASK_NAME = "Insert Users"
POINTS = 50
EVALUATION_TYPE = "DATABASE_STATE"

def evaluate(user_submission):
    """
    Execute student's query.
    Execute verification query.
    Compare result.
    Return evaluation JSON.
    """
```

### Evaluation Flow
Student submits query
↓
`ylabs-web` sends submission
↓
`ylabs-backend-api` receives submission
↓
Backend calls `yuvro-code-executer`
↓
Code executor loads the corresponding scoring file
↓
Runs evaluation
↓
Returns JSON response
↓
Backend awards score
↓
Frontend displays result

### Mapping Between Database Tasks and Scoring Files

| Sprint | Task | Python Scoring File |
|---------|------|--------------------|
| Sprint 1 | Task 101 | 101_create_database.py |
| Sprint 2 | Task 201 | 201_create_users_table.py |
| Sprint 2 | Task 202 | 202_create_todos_table.py |
| Sprint 2 | Task 203 | 203_unique_check_not_null_constraints.py |
| Sprint 3 | Task 301 | 301_insert_first_users.py |
| Sprint 3 | Task 302 | 302_insert_first_todos.py |
| Sprint 3 | Task 303 | 303_default_demonstration.py |
| Sprint 4 | Task 401 | 401_fetch_all_users.py |
| Sprint 4 | Task 402 | 402_distinct_retrieval.py |
| Sprint 4 | Task 403 | 403_filter_active_todos.py |
| Sprint 4 | Task 404 | 404_comparison_operators.py |
| Sprint 4 | Task 405 | 405_logical_operators.py |
| Sprint 4 | Task 406 | 406_in_operator.py |
| Sprint 4 | Task 407 | 407_between_operator.py |
| Sprint 4 | Task 408 | 408_like_operator.py |
| Sprint 4 | Task 409 | 409_is_null.py |
| Sprint 5 | Task 501 | 501_sort_tasks_ascending.py |
| Sprint 5 | Task 502 | 502_top_5_recent_tasks.py |
| Sprint 5 | Task 503 | 503_complete_task.py |
| Sprint 5 | Task 504 | 504_delete_old_data.py |
| Sprint 6 | Task 601 | 601_count_total_tasks.py |
| Sprint 6 | Task 602 | 602_sum_min_max_avg.py |
| Sprint 6 | Task 603 | 603_task_count_by_status.py |
| Sprint 6 | Task 604 | 604_overloaded_users.py |
| Sprint 7 | Task 701 | 701_users_todo_list.py |
| Sprint 7 | Task 702 | 702_all_users_tasks.py |
| Sprint 8 | Task 801 | 801_overdue_tasks.py |
| Sprint 8 | Task 802 | 802_string_functions.py |
| Sprint 8 | Task 803 | 803_task_urgency_levels.py |
| Sprint 9 | Task 901 | 901_find_alice_tasks.py |
| Sprint 9 | Task 902 | 902_user_task_counts_cte.py |
| Sprint 9 | Task 903 | 903_create_index.py |
| Sprint 9 | Task 904 | 904_view_existing_indexes.py |
| Sprint 9 | Task 905 | 905_inspect_indexed_columns.py |
| Sprint 9 | Task 906 | 906_drop_index.py |
| Sprint 9 | Task 907 | 907_altering_table_schema.py |

### Future Scalability
This architecture will be reused for:
- SQLite Lab
- MongoDB Lab
- Python Lab
- HTML Lab
- CSS Lab

Every lab should expose the same folder name `yuvro-scoring-rules/` so that the backend and code executor can discover scoring logic consistently across repositories.

---

## Sprint 1 - Database Initialization
### Task 101 — Create the Database

**Learning Objective**
Understand how to create a database file in SQLite.

**Problem Statement**
Before we can create tables, we must initialize the SQLite database file.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
-- SQLite creates the database automatically when you connect to a file.
-- Command line equivalent: sqlite3 learning_lab.db '.databases'
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT name FROM sqlite_master WHERE type='table';
```

**Expected Verification Result**
(The output of the verification query)
Verifies the database is usable and accessible by querying its metadata table.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the semicolon at the end of the query.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 2 - Table Creation & Schema
### Task 201 — Create the Users Table

**Learning Objective**
Master the CREATE TABLE statement and basic data types.

**Problem Statement**
We need a place to store our users. Create a table named `users` with `id` (auto-incrementing primary key), `username` (text, not null), and `email` (text, not null).

**Hidden Reference Solution**
(What the student is expected to write)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL
);
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='users';
```

**Expected Verification Result**
(The output of the verification query)
The full CREATE TABLE statement for users, verifying the complete schema including PRIMARY KEY, AUTOINCREMENT, and NOT NULL constraints.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the semicolon at the end of the query.
Using double quotes instead of single quotes for strings.

**Evaluation Type**
SCHEMA

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 202 — Create the Todos Table

**Learning Objective**
Understand FOREIGN KEY constraints and DEFAULT values.

**Problem Statement**
Create the `todos` table that links to the `users` table. It must have `id`, `user_id` (foreign key), `title`, `priority` (integer default 3), `due_date` (date), and `status` (defaulting to 'pending').

**Hidden Reference Solution**
(What the student is expected to write)
```sql
CREATE TABLE todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    priority INTEGER DEFAULT 3,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='todos';
```

**Expected Verification Result**
(The output of the verification query)
The full CREATE TABLE statement for todos, verifying the complete schema including DEFAULT values and FOREIGN KEY constraints in one query.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the semicolon at the end of the query.
Using double quotes instead of single quotes for strings.

**Evaluation Type**
SCHEMA

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 203 — UNIQUE, CHECK, NOT NULL Constraints

**Learning Objective**
Apply advanced constraints to ensure data integrity.

**Problem Statement**
Create a `categories` table with `id` (integer primary key), `name` (text, NOT NULL, UNIQUE), and `color_code` (text, CHECK that it starts with '#').

**Hidden Reference Solution**
(What the student is expected to write)
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color_code TEXT CHECK(color_code LIKE '#%')
);
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='categories';
```

**Expected Verification Result**
(The output of the verification query)
The full CREATE TABLE statement including all constraints, which we can parse to ensure constraints are present.

**Hints**
Use the CHECK constraint for custom validation.

**Common Mistakes**
Forgetting the LIKE operator in the CHECK constraint.

**Evaluation Type**
SCHEMA

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.
---

## Sprint 3 - Basic Data Insertion
### Task 301 — Insert First Users

**Learning Objective**
Use INSERT INTO for multiple rows.

**Problem Statement**
Add two users to the system: 'alice_dev' (alice@email.com) and 'bob_ops' (bob@email.com).

**Hidden Reference Solution**
(What the student is expected to write)
```sql
INSERT INTO users (username, email) VALUES 
('alice_dev', 'alice@email.com'),
('bob_ops', 'bob@email.com');
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT * FROM users ORDER BY id;
```

**Expected Verification Result**
(The output of the verification query)
| id | username  | email           |
| -- | --------- | --------------- |
| 1  | alice_dev | alice@email.com |
| 2  | bob_ops   | bob@email.com   |

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the semicolon at the end of the query.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**

* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 302 — Insert First Todos

**Learning Objective**
Understand auto-increment IDs and default values during insertion.

**Problem Statement**
Assign a task to Alice (`user_id = 1`) with the title 'Setup database'. Allow the status to fall back to its default value.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
INSERT INTO todos (user_id, title) VALUES 
(1, 'Setup database');
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT * FROM todos ORDER BY id;
```

**Expected Verification Result**
(The output of the verification query)
| id | user_id | title          | priority | due_date | status  |
| -- | ------- | -------------- | -------- | -------- | ------- |
| 1  | 1       | Setup database | 3        | NULL     | pending |

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the semicolon at the end of the query.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 303 — DEFAULT Demonstration

**Learning Objective**
Explicitly use DEFAULT keyword in INSERT.

**Problem Statement**
Assign another task to Alice with the title 'Write documentation', but explicitly specify DEFAULT for priority and status.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
INSERT INTO todos (user_id, title, priority, status) VALUES 
(1, 'Write documentation', DEFAULT, DEFAULT);
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT * FROM todos ORDER BY id;
```

**Expected Verification Result**
(The output of the verification query)
| id | user_id | title               | priority | due_date | status  |
| -- | ------- | ------------------- | -------- | -------- | ------- |
| 1  | 1       | Setup database      | 3        | NULL     | pending |
| 2  | 1       | Write documentation | 3        | NULL     | pending |

**Hints**
You can literally type DEFAULT in the VALUES list.

**Common Mistakes**
Omitting the columns from the insert list.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 4 - Basic Retrieval & Filtering
### Task 401 — Fetch All Users

**Learning Objective**
The SELECT * statement.

**Problem Statement**
Retrieve all columns and all rows from the `users` table.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT * FROM users;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT * FROM users;
```

**Expected Verification Result**
(The output of the verification query)
All users in the table.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the semicolon at the end of the query.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 402 — DISTINCT Retrieval

**Learning Objective**
Use DISTINCT to remove duplicates.

**Problem Statement**
Fetch a list of all unique statuses currently present in the `todos` table.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT DISTINCT status FROM todos;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT DISTINCT status FROM todos;
```

**Expected Verification Result**
(The output of the verification query)
| status  |
| ------- |
| pending |

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the DISTINCT keyword.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 403 — Filter Active Todos (Equality)

**Learning Objective**
Using the WHERE clause for equality.

**Problem Statement**
Fetch only the `title` of todos that have a status of 'pending'.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT title FROM todos WHERE status = 'pending';
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT title FROM todos WHERE status = 'pending';
```

**Expected Verification Result**
(The output of the verification query)
List of pending task titles.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Using double quotes instead of single quotes for strings.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 404 — Comparison Operators

**Learning Objective**
Filter data using comparison operators like >.

**Problem Statement**
Fetch the `title` of todos that have a priority greater than 1.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT title FROM todos WHERE priority > 1;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT title FROM todos WHERE priority > 1;
```

**Expected Verification Result**
(The output of the verification query)
Tasks with priority 2 or 3.

**Hints**
Use the > operator.

**Common Mistakes**
Using >= instead of >.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 405 — Logical Operators (AND / OR / NOT)

**Learning Objective**
Combine conditions using logical operators.

**Problem Statement**
Fetch the `title` of todos that have a priority of 3 AND status is 'pending'.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT title FROM todos WHERE priority = 3 AND status = 'pending';
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT title FROM todos WHERE priority = 3 AND status = 'pending';
```

**Expected Verification Result**
(The output of the verification query)
Tasks matching both conditions.

**Hints**
Use the AND operator.

**Common Mistakes**
Using OR instead of AND.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 406 — The IN Operator

**Learning Objective**
Filter against a list of values.

**Problem Statement**
Fetch the `title` of todos where the status is IN ('pending', 'completed').

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT title FROM todos WHERE status IN ('pending', 'completed');
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT title FROM todos WHERE status IN ('pending', 'completed');
```

**Expected Verification Result**
(The output of the verification query)
Tasks matching any of the statuses.

**Hints**
Use IN (val1, val2).

**Common Mistakes**
Using multiple ORs instead of IN.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.
---

### Task 407 — The BETWEEN Operator

**Learning Objective**
Filter within a range.

**Problem Statement**
Fetch the `title` of todos where priority is BETWEEN 1 AND 3.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT title FROM todos WHERE priority BETWEEN 1 AND 3;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT title FROM todos WHERE priority BETWEEN 1 AND 3;
```

**Expected Verification Result**
(The output of the verification query)
Tasks within priority range.

**Hints**
Use BETWEEN min AND max.

**Common Mistakes**
Using > and < instead of BETWEEN.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 408 — The LIKE Operator

**Learning Objective**
Using LIKE with wildcards (%).

**Problem Statement**
Find all todos where the title contains the word 'database'.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT * FROM todos WHERE title LIKE '%database%';
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT * FROM todos WHERE title LIKE '%database%';
```

**Expected Verification Result**
(The output of the verification query)
Tasks matching the LIKE pattern.

**Hints**
Use % as wildcard.

**Common Mistakes**
Forgetting % wildcards.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 409 — IS NULL

**Learning Objective**
Check for NULL values.

**Problem Statement**
Fetch the `title` of todos where the due_date IS NULL.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT title FROM todos WHERE due_date IS NULL;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT title FROM todos WHERE due_date IS NULL;
```

**Expected Verification Result**
(The output of the verification query)
Tasks with no due date set.

**Hints**
Use IS NULL, not = NULL.

**Common Mistakes**
Using = NULL.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 5 - Sorting, Limiting & Updating
### Task 501 — Sort Tasks Ascending

**Learning Objective**
Use ORDER BY ... ASC.

**Problem Statement**
Get the `id` and `title` of all tasks, ordered by priority in ascending order.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT id, title FROM todos ORDER BY priority ASC;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT id, title FROM todos ORDER BY priority ASC;
```

**Expected Verification Result**
(The output of the verification query)
Tasks ordered by priority ascending.

**Hints**
ASC is the default, but write it explicitly for practice.

**Common Mistakes**
Forgetting ORDER BY.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 502 — Top 5 Recent Tasks (DESC)

**Learning Objective**
Combining ORDER BY ... DESC and LIMIT.

**Problem Statement**
Get the 5 most recently created todos (assuming highest ID is most recent). Fetch their `id` and `title`.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT id, title FROM todos ORDER BY id DESC LIMIT 5;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT id, title FROM todos ORDER BY id DESC LIMIT 5;
```

**Expected Verification Result**
(The output of the verification query)
Top 5 recent tasks.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the DESC keyword.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 503 — Complete a Task

**Learning Objective**
Using UPDATE with a specific WHERE condition.

**Problem Statement**
Task with `id = 1` has been finished. Change its status to 'completed'.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
UPDATE todos SET status = 'completed' WHERE id = 1;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT * FROM todos ORDER BY id;
```

**Expected Verification Result**
(The output of the verification query)
Full table view ensuring only id 1 has status 'completed', and others are unaffected.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the WHERE clause (updates all rows).

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 504 — Delete Old Data

**Learning Objective**
Using DELETE.

**Problem Statement**
Delete any todos that belong to `user_id = 2`.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
DELETE FROM todos WHERE user_id = 2;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT * FROM todos ORDER BY id;
```

**Expected Verification Result**
(The output of the verification query)
Full table view ensuring no rows have user_id = 2, but others remain.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the WHERE clause (deletes all rows).

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 6 - Aggregation Basics
### Task 601 — Count Total Tasks

**Learning Objective**
Using the COUNT() aggregate function.

**Problem Statement**
Find out exactly how many total tasks exist in the system.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT COUNT(*) FROM todos;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT COUNT(*) FROM todos;
```

**Expected Verification Result**
(The output of the verification query)
The total count.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting COUNT().

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 602 — SUM, MIN, MAX, AVG

**Learning Objective**
Use multiple aggregation functions.

**Problem Statement**
Find the total sum, minimum, maximum, and average of the `priority` column for all tasks.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT SUM(priority), MIN(priority), MAX(priority), AVG(priority) FROM todos;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT SUM(priority), MIN(priority), MAX(priority), AVG(priority) FROM todos;
```

**Expected Verification Result**
(The output of the verification query)
Calculated aggregates for priority.

**Hints**
You can use multiple aggregate functions in one SELECT.

**Common Mistakes**
Forgetting to wrap column names in parentheses.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 603 — Task Count by Status

**Learning Objective**
Using GROUP BY.

**Problem Statement**
Create a report showing each `status` and the total number of tasks in that status.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT status, COUNT(*) AS task_count FROM todos GROUP BY status;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT status, COUNT(*) AS task_count FROM todos GROUP BY status;
```

**Expected Verification Result**
(The output of the verification query)
Status counts.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Selecting non-aggregated columns without GROUP BY.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 604 — Overloaded Users

**Learning Objective**
Filtering aggregated data with HAVING.

**Problem Statement**
Show the `user_id` and count of tasks only for users who have strictly more than 5 tasks.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT user_id, COUNT(*) AS total_tasks FROM todos GROUP BY user_id HAVING COUNT(*) > 5;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT user_id, COUNT(*) AS total_tasks FROM todos GROUP BY user_id HAVING COUNT(*) > 5;
```

**Expected Verification Result**
(The output of the verification query)
Filtered grouped results.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Using WHERE instead of HAVING for aggregates.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 7 - Advanced Aggregation & Math
### Task 701 — User's Todo List

**Learning Objective**
Master the INNER JOIN and Aliases.

**Problem Statement**
The front-end needs to display the task title alongside the username. Join the tables to fetch `username` and `title`. Use aliases `u` for users and `t` for todos.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT u.username, t.title 
FROM users u 
INNER JOIN todos t ON u.id = t.user_id;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT u.username, t.title FROM users u INNER JOIN todos t ON u.id = t.user_id;
```

**Expected Verification Result**
(The output of the verification query)
Joined user and task names.

**Hints**
Use `users u` to alias the table to `u`.

**Common Mistakes**
Forgetting the ON clause.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 702 — All Users and Their Tasks

**Learning Objective**
Understand LEFT JOIN.

**Problem Statement**
Get a list of ALL users, along with their tasks. If a user hasn't created any tasks, they should still appear in the list with a NULL task title. Use table aliases.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT u.username, t.title 
FROM users u 
LEFT JOIN todos t ON u.id = t.user_id;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT u.username, t.title FROM users u LEFT JOIN todos t ON u.id = t.user_id;
```

**Expected Verification Result**
(The output of the verification query)
All users with or without tasks.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Using INNER JOIN instead of LEFT JOIN.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 8 - Subqueries, String Functions & CTEs
### Task 801 — Overdue Tasks

**Learning Objective**
Filtering using date strings.

**Problem Statement**
Find all tasks where the due_date is in the past.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT * FROM todos WHERE due_date < date('now');
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT * FROM todos WHERE due_date < date('now');
```

**Expected Verification Result**
(The output of the verification query)
List of overdue tasks.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Using wrong date formatting.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 802 — String Functions

**Learning Objective**
Use UPPER, LOWER, LENGTH, SUBSTR, TRIM.

**Problem Statement**
Select the `username` in uppercase, the length of the `email`, the first 3 characters of the `status` (SUBSTR), and the `title` with any surrounding spaces removed (TRIM) from `users` and `todos` (joined).

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT UPPER(u.username), LENGTH(u.email), SUBSTR(t.status, 1, 3), TRIM(t.title)
FROM users u
JOIN todos t ON u.id = t.user_id;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT UPPER(u.username), LENGTH(u.email), SUBSTR(t.status, 1, 3), TRIM(t.title) FROM users u JOIN todos t ON u.id = t.user_id;
```

**Expected Verification Result**
(The output of the verification query)
Transformed string columns.

**Hints**
SUBSTR(string, start, length). Index is 1-based.

**Common Mistakes**
Using 0-based index for SUBSTR.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 803 — Task Urgency Levels

**Learning Objective**
Using CASE WHEN statements.

**Problem Statement**
Output the title of the task and a new column called 'urgency'. If priority is 1, urgency is 'High', otherwise 'Normal'.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT title, 
  CASE 
    WHEN priority = 1 THEN 'High' 
    ELSE 'Normal' 
  END AS urgency 
FROM todos;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT title, CASE WHEN priority = 1 THEN 'High' ELSE 'Normal' END AS urgency FROM todos;
```

**Expected Verification Result**
(The output of the verification query)
Task titles and urgency levels.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting the END keyword.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 9 - Set Operations & Advanced Schema
### Task 901 — Find Alice's Tasks via Subquery

**Learning Objective**
Writing Subqueries in the WHERE clause.

**Problem Statement**
Find all task titles for the user 'alice_dev' without using a JOIN, but instead using a subquery.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
SELECT title FROM todos 
WHERE user_id = (
    SELECT id FROM users WHERE username = 'alice_dev'
);
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT title FROM todos WHERE user_id = (SELECT id FROM users WHERE username = 'alice_dev');
```

**Expected Verification Result**
(The output of the verification query)
Alice's tasks.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Using = when subquery returns multiple rows (use IN instead in that case).

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 902 — User Task Counts (CTE)

**Learning Objective**
Structuring queries with WITH (CTEs).

**Problem Statement**
Use a Common Table Expression (CTE) named `user_counts` to calculate the total tasks per user_id, then select all records from the CTE.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
WITH user_counts AS (
    SELECT user_id, COUNT(*) as total_tasks 
    FROM todos 
    GROUP BY user_id
)
SELECT * FROM user_counts;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
WITH user_counts AS (SELECT user_id, COUNT(*) as total_tasks FROM todos GROUP BY user_id) SELECT * FROM user_counts;
```

**Expected Verification Result**
(The output of the verification query)
CTE results.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Forgetting to SELECT from the CTE after defining it.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 903 — Create Index

**Learning Objective**
Using CREATE INDEX to optimize performance.

**Problem Statement**
Create an index called `idx_todos_status` on the `status` column of the `todos` table to speed up filtering.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
CREATE INDEX idx_todos_status ON todos(status);
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_todos_status';
```

**Expected Verification Result**
(The output of the verification query)
The index creation statement.

**Hints**
Read the SQLite documentation for the specific keyword.

**Common Mistakes**
Using string quotes for table or column names.

**Evaluation Type**
INDEX

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 904 — View Existing Indexes

**Learning Objective**
Check which indexes exist on a table.

**Problem Statement**
Use the appropriate PRAGMA to list all indexes on the `todos` table.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
PRAGMA index_list('todos');
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
PRAGMA index_list('todos');
```

**Expected Verification Result**
(The output of the verification query)
| seq | name             | unique | origin | partial |
| --- | ---------------- | ------ | ------ | ------- |
| 0   | idx_todos_status | 0      | c      | 0       |

**Hints**
PRAGMA index_list('table_name');

**Common Mistakes**
Forgetting quotes around the table name.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 905 — Inspect Indexed Columns

**Learning Objective**
Check which columns are covered by an index.

**Problem Statement**
Use the appropriate PRAGMA to inspect the `idx_todos_status` index.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
PRAGMA index_info('idx_todos_status');
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
PRAGMA index_info('idx_todos_status');
```

**Expected Verification Result**
(The output of the verification query)
| seqno | cid | name   |
| ----- | --- | ------ |
| 0     | 5   | status |

**Hints**
PRAGMA index_info('index_name');

**Common Mistakes**
Checking the table name instead of the index name.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 906 — Drop Index

**Learning Objective**
Remove an existing index.

**Problem Statement**
Drop the `idx_todos_status` index.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
DROP INDEX idx_todos_status;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
PRAGMA index_list('todos');
```

**Expected Verification Result**
(The output of the verification query)
No idx_todos_status shown.

**Hints**
DROP INDEX index_name;

**Common Mistakes**
Trying to drop the index from a specific table (e.g. DROP INDEX ON table).

**Evaluation Type**
INDEX

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 907 — Altering Table Schema

**Learning Objective**
Using ALTER TABLE to modify existing tables.

**Problem Statement**
The product team wants to track when a task was last updated. Add a new column `updated_at` of type DATE to the `todos` table.

**Hidden Reference Solution**
(What the student is expected to write)
```sql
ALTER TABLE todos ADD COLUMN updated_at DATE;
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
SELECT sql FROM sqlite_master WHERE type='table' AND name='todos';
```

**Expected Verification Result**
(The output of the verification query)
The updated CREATE TABLE statement for 'todos', which will now include 'updated_at DATE' at the end.

**Hints**
ALTER TABLE table_name ADD COLUMN column_name datatype;

**Common Mistakes**
Forgetting ADD COLUMN.

**Evaluation Type**
SCHEMA

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---


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

## Sprint 1 - Database Initialization

### Task 101 — Create the Database
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Understand how to create a database file in SQLite.
* **What the user does**:
  - Before we can create tables, we must initialize the SQLite database file.
  - **Solution Code**:
    ```sql
    -- SQLite creates the database automatically when you connect to a file.
    -- Command line equivalent: sqlite3 learning_lab.db '.databases'
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---


## Sprint 2 - Table Creation & Schema

### Task 201 — Create the Users Table
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Master the CREATE TABLE statement and basic data types.
* **What the user does**:
  - We need a place to store our users. Create a table named `users` with `id` (auto-incrementing primary key), `username` (text, not null), and `email` (text, not null).
  - **Solution Code**:
    ```sql
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL
    );
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 202 — Create the Todos Table
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Understand FOREIGN KEY constraints and DEFAULT values.
* **What the user does**:
  - Create the `todos` table that links to the `users` table. It must have `id`, `user_id` (foreign key), `title`, `priority` (integer default 3), `due_date` (date), and `status` (defaulting to 'pending').
  - **Solution Code**:
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
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---


## Sprint 3 - Basic Data Insertion

### Task 301 — Insert First Users
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Use INSERT INTO for multiple rows.
* **What the user does**:
  - Add two users to the system: 'alice_dev' (alice@email.com) and 'bob_ops' (bob@email.com).
  - **Solution Code**:
    ```sql
    INSERT INTO users (username, email) VALUES 
    ('alice_dev', 'alice@email.com'),
    ('bob_ops', 'bob@email.com');
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 302 — Insert First Todos
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Understand auto-increment IDs and default values during insertion.
* **What the user does**:
  - Assign a task to Alice (`user_id = 1`) with the title "Setup database". Allow the status to fall back to its default value.
  - **Solution Code**:
    ```sql
    INSERT INTO todos (user_id, title) VALUES 
    (1, 'Setup database');
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---


## Sprint 4 - Basic Retrieval & Filtering

### Task 401 — Fetch All Users
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: The SELECT * statement.
* **What the user does**:
  - Retrieve all columns and all rows from the `users` table.
  - **Solution Code**:
    ```sql
    SELECT * FROM users;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 402 — Filter Active Todos
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Using the WHERE clause.
* **What the user does**:
  - Fetch only the `title` of todos that have a status of 'pending'.
  - **Solution Code**:
    ```sql
    SELECT title FROM todos WHERE status = 'pending';
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 403 — Top 5 Recent Tasks
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Combining ORDER BY and LIMIT.
* **What the user does**:
  - Get the 5 most recently created todos (assuming highest ID is most recent). Fetch their `id` and `title`.
  - **Solution Code**:
    ```sql
    SELECT id, title FROM todos ORDER BY id DESC LIMIT 5;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---


## Sprint 5 - Sorting, Limiting & Updating

### Task 501 — Complete a Task
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Using UPDATE with a specific WHERE condition.
* **What the user does**:
  - Task with `id = 1` has been finished. Change its status to 'completed'.
  - **Solution Code**:
    ```sql
    UPDATE todos SET status = 'completed' WHERE id = 1;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 502 — Delete Old Data
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Using DELETE.
* **What the user does**:
  - Delete any todos that belong to `user_id = 2`.
  - **Solution Code**:
    ```sql
    DELETE FROM todos WHERE user_id = 2;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 503 — Search by Title
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Using LIKE with wildcards (%).
* **What the user does**:
  - Find all todos where the title contains the word "database".
  - **Solution Code**:
    ```sql
    SELECT * FROM todos WHERE title LIKE '%database%';
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---


## Sprint 6 - Deleting & Aggregation Basics

### Task 601 — Count Total Tasks
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Using the COUNT() aggregate function.
* **What the user does**:
  - Find out exactly how many total tasks exist in the system.
  - **Solution Code**:
    ```sql
    SELECT COUNT(*) FROM todos;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 602 — Task Count by Status
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Using GROUP BY.
* **What the user does**:
  - Create a report showing each `status` and the total number of tasks in that status.
  - **Solution Code**:
    ```sql
    SELECT status, COUNT(*) AS task_count FROM todos GROUP BY status;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 603 — Overloaded Users
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Filtering aggregated data with HAVING.
* **What the user does**:
  - Show the `user_id` and count of tasks only for users who have strictly more than 5 tasks.
  - **Solution Code**:
    ```sql
    SELECT user_id, COUNT(*) AS total_tasks 
    FROM todos 
    GROUP BY user_id 
    HAVING COUNT(*) > 5;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---


## Sprint 7 - Advanced Aggregation & Math

### Task 701 — User's Todo List
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Master the INNER JOIN.
* **What the user does**:
  - The front-end needs to display the task title alongside the username. Join the tables to fetch `username` and `title`.
  - **Solution Code**:
    ```sql
    SELECT users.username, todos.title 
    FROM users 
    INNER JOIN todos ON users.id = todos.user_id;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 702 — All Users and Their Tasks
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Understand LEFT JOIN.
* **What the user does**:
  - Get a list of ALL users, along with their tasks. If a user hasn't created any tasks, they should still appear in the list with a NULL task title.
  - **Solution Code**:
    ```sql
    SELECT u.username, t.title 
    FROM users u 
    LEFT JOIN todos t ON u.id = t.user_id;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---


## Sprint 8 - Subqueries, CTEs & Optimization

### Task 801 — Average Priority
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Use AVG() aggregation function.
* **What the user does**:
  - Calculate the average priority of all pending tasks.
  - **Solution Code**:
    ```sql
    SELECT AVG(priority) FROM todos WHERE status = 'pending';
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 802 — Overdue Tasks
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Filtering using date strings.
* **What the user does**:
  - Find all tasks where the due_date is in the past.
  - **Solution Code**:
    ```sql
    SELECT * FROM todos WHERE due_date < date('now');
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 803 — Task Urgency Levels
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Using CASE WHEN statements.
* **What the user does**:
  - Output the title of the task and a new column called 'urgency'. If priority is 1, urgency is 'High', otherwise 'Normal'.
  - **Solution Code**:
    ```sql
    SELECT title, 
      CASE 
        WHEN priority = 1 THEN 'High' 
        ELSE 'Normal' 
      END AS urgency 
    FROM todos;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---


## Sprint 9 - Set Operations & Constraints

### Task 901 — Find Alice's Tasks via Subquery
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Writing Subqueries in the WHERE clause.
* **What the user does**:
  - Find all task titles for the user 'alice_dev' without using a JOIN, but instead using a subquery.
  - **Solution Code**:
    ```sql
    SELECT title FROM todos 
    WHERE user_id = (
        SELECT id FROM users WHERE username = 'alice_dev'
    );
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 902 — User Task Counts (CTE)
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Structuring queries with WITH (CTEs).
* **What the user does**:
  - Use a Common Table Expression (CTE) named `user_counts` to calculate the total tasks per user_id, then select all records from the CTE.
  - **Solution Code**:
    ```sql
    WITH user_counts AS (
        SELECT user_id, COUNT(*) as total_tasks 
        FROM todos 
        GROUP BY user_id
    )
    SELECT * FROM user_counts;
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---

### Task 903 — Optimize Status Queries
* **Points**: 50 | **Method**: Logic Grader
* **Difficulty**: EASY
* **Time Limit**: 15 minutes
* **Learning Objective**: Using CREATE INDEX to optimize performance.
* **What the user does**:
  - Create an index called `idx_todos_status` on the `status` column of the `todos` table to speed up filtering.
  - **Solution Code**:
    ```sql
    CREATE INDEX idx_todos_status ON todos(status);
    ```
* **Hints**:
  - Read the SQLite documentation for the specific keyword.
* **Common Mistakes**:
  - Forgetting the semicolon at the end of the query.
  - Using double quotes instead of single quotes for strings.
* **How the system evaluates**:
  - Runs your query and compares against the system solution using the isolated Two-Universe executor.
* **Auto-scoring**:
  - **[A] Logic (100 pts)**: 100 pts if the query execution output perfectly matches the expected Answer Key.

---


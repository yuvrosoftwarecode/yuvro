import json
import os

sprints = [
    {
        'name': 'Sprint 1 - Database Initialization',
        'tasks': [
            {
                'title': 'Task 101 — Create the Database',
                'objective': 'Understand how to create a database file in SQLite.',
                'problem': 'Before we can create tables, we must initialize the SQLite database file.',
                'solution': '-- SQLite creates the database automatically when you connect to a file.\n-- Command line equivalent: sqlite3 learning_lab.db \'.databases\'',
                'system_query': "SELECT name FROM sqlite_master WHERE type='table';",
                'expected': 'Verifies the database is usable and accessible by querying its metadata table.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the semicolon at the end of the query.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            }
        ]
    },
    {
        'name': 'Sprint 2 - Table Creation & Schema',
        'tasks': [
            {
                'title': 'Task 201 — Create the Users Table',
                'objective': 'Master the CREATE TABLE statement and basic data types.',
                'problem': 'We need a place to store our users. Create a table named `users` with `id` (auto-incrementing primary key), `username` (text, not null), and `email` (text, not null).',
                'solution': 'CREATE TABLE users (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    username TEXT NOT NULL,\n    email TEXT NOT NULL\n);',
                'system_query': "SELECT sql FROM sqlite_master WHERE type='table' AND name='users';",
                'expected': 'The full CREATE TABLE statement for users, verifying the complete schema including PRIMARY KEY, AUTOINCREMENT, and NOT NULL constraints.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the semicolon at the end of the query.\nUsing double quotes instead of single quotes for strings.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'SCHEMA',
            },
            {
                'title': 'Task 202 — Create the Todos Table',
                'objective': 'Understand FOREIGN KEY constraints and DEFAULT values.',
                'problem': 'Create the `todos` table that links to the `users` table. It must have `id`, `user_id` (foreign key), `title`, `priority` (integer default 3), `due_date` (date), and `status` (defaulting to \'pending\').',
                'solution': 'CREATE TABLE todos (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    user_id INTEGER NOT NULL,\n    title TEXT NOT NULL,\n    priority INTEGER DEFAULT 3,\n    due_date DATE,\n    status TEXT DEFAULT \'pending\',\n    FOREIGN KEY(user_id) REFERENCES users(id)\n);',
                'system_query': "SELECT sql FROM sqlite_master WHERE type='table' AND name='todos';",
                'expected': 'The full CREATE TABLE statement for todos, verifying the complete schema including DEFAULT values and FOREIGN KEY constraints in one query.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the semicolon at the end of the query.\nUsing double quotes instead of single quotes for strings.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'SCHEMA',
            },
            {
                'title': 'Task 203 — UNIQUE, CHECK, NOT NULL Constraints',
                'objective': 'Apply advanced constraints to ensure data integrity.',
                'problem': 'Create a `categories` table with `id` (integer primary key), `name` (text, NOT NULL, UNIQUE), and `color_code` (text, CHECK that it starts with \'#\').',
                'solution': 'CREATE TABLE categories (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    name TEXT NOT NULL UNIQUE,\n    color_code TEXT CHECK(color_code LIKE \'#%\')\n);',
                'system_query': 'SELECT sql FROM sqlite_master WHERE type=\'table\' AND name=\'categories\';',
                'expected': 'The full CREATE TABLE statement including all constraints, which we can parse to ensure constraints are present.',
                'hints': 'Use the CHECK constraint for custom validation.',
                'mistakes': 'Forgetting the LIKE operator in the CHECK constraint.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'SCHEMA',
            }
        ]
    },
    {
        'name': 'Sprint 3 - Basic Data Insertion',
        'tasks': [
            {
                'title': 'Task 301 — Insert First Users',
                'objective': 'Use INSERT INTO for multiple rows.',
                'problem': 'Add two users to the system: \'alice_dev\' (alice@email.com) and \'bob_ops\' (bob@email.com).',
                'solution': 'INSERT INTO users (username, email) VALUES \n(\'alice_dev\', \'alice@email.com\'),\n(\'bob_ops\', \'bob@email.com\');',
                'system_query': 'SELECT * FROM users ORDER BY id;',
                'expected': '| id | username  | email           |\n| -- | --------- | --------------- |\n| 1  | alice_dev | alice@email.com |\n| 2  | bob_ops   | bob@email.com   |',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the semicolon at the end of the query.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            },
            {
                'title': 'Task 302 — Insert First Todos',
                'objective': 'Understand auto-increment IDs and default values during insertion.',
                'problem': 'Assign a task to Alice (`user_id = 1`) with the title \'Setup database\'. Allow the status to fall back to its default value.',
                'solution': 'INSERT INTO todos (user_id, title) VALUES \n(1, \'Setup database\');',
                'system_query': 'SELECT * FROM todos ORDER BY id;',
                'expected': '| id | user_id | title          | priority | due_date | status  |\n| -- | ------- | -------------- | -------- | -------- | ------- |\n| 1  | 1       | Setup database | 3        | NULL     | pending |',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the semicolon at the end of the query.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            },
            {
                'title': 'Task 303 — DEFAULT Demonstration',
                'objective': 'Explicitly use DEFAULT keyword in INSERT.',
                'problem': 'Assign another task to Alice with the title \'Write documentation\', but explicitly specify DEFAULT for priority and status.',
                'solution': 'INSERT INTO todos (user_id, title, priority, status) VALUES \n(1, \'Write documentation\', DEFAULT, DEFAULT);',
                'system_query': 'SELECT * FROM todos ORDER BY id;',
                'expected': '| id | user_id | title               | priority | due_date | status  |\n| -- | ------- | ------------------- | -------- | -------- | ------- |\n| 1  | 1       | Setup database      | 3        | NULL     | pending |\n| 2  | 1       | Write documentation | 3        | NULL     | pending |',
                'hints': 'You can literally type DEFAULT in the VALUES list.',
                'mistakes': 'Omitting the columns from the insert list.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            }
        ]
    },
    {
        'name': 'Sprint 4 - Basic Retrieval & Filtering',
        'tasks': [
            {
                'title': 'Task 401 — Fetch All Users',
                'objective': 'The SELECT * statement.',
                'problem': 'Retrieve all columns and all rows from the `users` table.',
                'solution': 'SELECT * FROM users;',
                'system_query': 'SELECT * FROM users;',
                'expected': 'All users in the table.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the semicolon at the end of the query.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 402 — DISTINCT Retrieval',
                'objective': 'Use DISTINCT to remove duplicates.',
                'problem': 'Fetch a list of all unique statuses currently present in the `todos` table.',
                'solution': 'SELECT DISTINCT status FROM todos;',
                'system_query': 'SELECT DISTINCT status FROM todos;',
                'expected': '| status  |\n| ------- |\n| pending |',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the DISTINCT keyword.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 403 — Filter Active Todos (Equality)',
                'objective': 'Using the WHERE clause for equality.',
                'problem': 'Fetch only the `title` of todos that have a status of \'pending\'.',
                'solution': 'SELECT title FROM todos WHERE status = \'pending\';',
                'system_query': 'SELECT title FROM todos WHERE status = \'pending\';',
                'expected': 'List of pending task titles.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Using double quotes instead of single quotes for strings.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 404 — Comparison Operators',
                'objective': 'Filter data using comparison operators like >.',
                'problem': 'Fetch the `title` of todos that have a priority greater than 1.',
                'solution': 'SELECT title FROM todos WHERE priority > 1;',
                'system_query': 'SELECT title FROM todos WHERE priority > 1;',
                'expected': 'Tasks with priority 2 or 3.',
                'hints': 'Use the > operator.',
                'mistakes': 'Using >= instead of >.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 405 — Logical Operators (AND / OR / NOT)',
                'objective': 'Combine conditions using logical operators.',
                'problem': 'Fetch the `title` of todos that have a priority of 3 AND status is \'pending\'.',
                'solution': 'SELECT title FROM todos WHERE priority = 3 AND status = \'pending\';',
                'system_query': 'SELECT title FROM todos WHERE priority = 3 AND status = \'pending\';',
                'expected': 'Tasks matching both conditions.',
                'hints': 'Use the AND operator.',
                'mistakes': 'Using OR instead of AND.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 406 — The IN Operator',
                'objective': 'Filter against a list of values.',
                'problem': 'Fetch the `title` of todos where the status is IN (\'pending\', \'completed\').',
                'solution': 'SELECT title FROM todos WHERE status IN (\'pending\', \'completed\');',
                'system_query': 'SELECT title FROM todos WHERE status IN (\'pending\', \'completed\');',
                'expected': 'Tasks matching any of the statuses.',
                'hints': 'Use IN (val1, val2).',
                'mistakes': 'Using multiple ORs instead of IN.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 407 — The BETWEEN Operator',
                'objective': 'Filter within a range.',
                'problem': 'Fetch the `title` of todos where priority is BETWEEN 1 AND 3.',
                'solution': 'SELECT title FROM todos WHERE priority BETWEEN 1 AND 3;',
                'system_query': 'SELECT title FROM todos WHERE priority BETWEEN 1 AND 3;',
                'expected': 'Tasks within priority range.',
                'hints': 'Use BETWEEN min AND max.',
                'mistakes': 'Using > and < instead of BETWEEN.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 408 — The LIKE Operator',
                'objective': 'Using LIKE with wildcards (%).',
                'problem': 'Find all todos where the title contains the word \'database\'.',
                'solution': 'SELECT * FROM todos WHERE title LIKE \'%database%\';',
                'system_query': 'SELECT * FROM todos WHERE title LIKE \'%database%\';',
                'expected': 'Tasks matching the LIKE pattern.',
                'hints': 'Use % as wildcard.',
                'mistakes': 'Forgetting % wildcards.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 409 — IS NULL',
                'objective': 'Check for NULL values.',
                'problem': 'Fetch the `title` of todos where the due_date IS NULL.',
                'solution': 'SELECT title FROM todos WHERE due_date IS NULL;',
                'system_query': 'SELECT title FROM todos WHERE due_date IS NULL;',
                'expected': 'Tasks with no due date set.',
                'hints': 'Use IS NULL, not = NULL.',
                'mistakes': 'Using = NULL.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            }
        ]
    },
    {
        'name': 'Sprint 5 - Sorting, Limiting & Updating',
        'tasks': [
            {
                'title': 'Task 501 — Sort Tasks Ascending',
                'objective': 'Use ORDER BY ... ASC.',
                'problem': 'Get the `id` and `title` of all tasks, ordered by priority in ascending order.',
                'solution': 'SELECT id, title FROM todos ORDER BY priority ASC;',
                'system_query': 'SELECT id, title FROM todos ORDER BY priority ASC;',
                'expected': 'Tasks ordered by priority ascending.',
                'hints': 'ASC is the default, but write it explicitly for practice.',
                'mistakes': 'Forgetting ORDER BY.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 502 — Top 5 Recent Tasks (DESC)',
                'objective': 'Combining ORDER BY ... DESC and LIMIT.',
                'problem': 'Get the 5 most recently created todos (assuming highest ID is most recent). Fetch their `id` and `title`.',
                'solution': 'SELECT id, title FROM todos ORDER BY id DESC LIMIT 5;',
                'system_query': 'SELECT id, title FROM todos ORDER BY id DESC LIMIT 5;',
                'expected': 'Top 5 recent tasks.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the DESC keyword.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 503 — Complete a Task',
                'objective': 'Using UPDATE with a specific WHERE condition.',
                'problem': 'Task with `id = 1` has been finished. Change its status to \'completed\'.',
                'solution': 'UPDATE todos SET status = \'completed\' WHERE id = 1;',
                'system_query': 'SELECT * FROM todos ORDER BY id;',
                'expected': 'Full table view ensuring only id 1 has status \'completed\', and others are unaffected.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the WHERE clause (updates all rows).',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            },
            {
                'title': 'Task 504 — Delete Old Data',
                'objective': 'Using DELETE.',
                'problem': 'Delete any todos that belong to `user_id = 2`.',
                'solution': 'DELETE FROM todos WHERE user_id = 2;',
                'system_query': 'SELECT * FROM todos ORDER BY id;',
                'expected': 'Full table view ensuring no rows have user_id = 2, but others remain.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the WHERE clause (deletes all rows).',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            }
        ]
    },
    {
        'name': 'Sprint 6 - Aggregation Basics',
        'tasks': [
            {
                'title': 'Task 601 — Count Total Tasks',
                'objective': 'Using the COUNT() aggregate function.',
                'problem': 'Find out exactly how many total tasks exist in the system.',
                'solution': 'SELECT COUNT(*) FROM todos;',
                'system_query': 'SELECT COUNT(*) FROM todos;',
                'expected': 'The total count.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting COUNT().',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 602 — SUM, MIN, MAX, AVG',
                'objective': 'Use multiple aggregation functions.',
                'problem': 'Find the total sum, minimum, maximum, and average of the `priority` column for all tasks.',
                'solution': 'SELECT SUM(priority), MIN(priority), MAX(priority), AVG(priority) FROM todos;',
                'system_query': 'SELECT SUM(priority), MIN(priority), MAX(priority), AVG(priority) FROM todos;',
                'expected': 'Calculated aggregates for priority.',
                'hints': 'You can use multiple aggregate functions in one SELECT.',
                'mistakes': 'Forgetting to wrap column names in parentheses.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 603 — Task Count by Status',
                'objective': 'Using GROUP BY.',
                'problem': 'Create a report showing each `status` and the total number of tasks in that status.',
                'solution': 'SELECT status, COUNT(*) AS task_count FROM todos GROUP BY status;',
                'system_query': 'SELECT status, COUNT(*) AS task_count FROM todos GROUP BY status;',
                'expected': 'Status counts.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Selecting non-aggregated columns without GROUP BY.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 604 — Overloaded Users',
                'objective': 'Filtering aggregated data with HAVING.',
                'problem': 'Show the `user_id` and count of tasks only for users who have strictly more than 5 tasks.',
                'solution': 'SELECT user_id, COUNT(*) AS total_tasks FROM todos GROUP BY user_id HAVING COUNT(*) > 5;',
                'system_query': 'SELECT user_id, COUNT(*) AS total_tasks FROM todos GROUP BY user_id HAVING COUNT(*) > 5;',
                'expected': 'Filtered grouped results.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Using WHERE instead of HAVING for aggregates.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            }
        ]
    },
    {
        'name': 'Sprint 7 - Advanced Aggregation & Math',
        'tasks': [
            {
                'title': 'Task 701 — User\'s Todo List',
                'objective': 'Master the INNER JOIN and Aliases.',
                'problem': 'The front-end needs to display the task title alongside the username. Join the tables to fetch `username` and `title`. Use aliases `u` for users and `t` for todos.',
                'solution': 'SELECT u.username, t.title \nFROM users u \nINNER JOIN todos t ON u.id = t.user_id;',
                'system_query': 'SELECT u.username, t.title FROM users u INNER JOIN todos t ON u.id = t.user_id;',
                'expected': 'Joined user and task names.',
                'hints': 'Use `users u` to alias the table to `u`.',
                'mistakes': 'Forgetting the ON clause.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 702 — All Users and Their Tasks',
                'objective': 'Understand LEFT JOIN.',
                'problem': 'Get a list of ALL users, along with their tasks. If a user hasn\'t created any tasks, they should still appear in the list with a NULL task title. Use table aliases.',
                'solution': 'SELECT u.username, t.title \nFROM users u \nLEFT JOIN todos t ON u.id = t.user_id;',
                'system_query': 'SELECT u.username, t.title FROM users u LEFT JOIN todos t ON u.id = t.user_id;',
                'expected': 'All users with or without tasks.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Using INNER JOIN instead of LEFT JOIN.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            }
        ]
    },
    {
        'name': 'Sprint 8 - Subqueries, String Functions & CTEs',
        'tasks': [
            {
                'title': 'Task 801 — Overdue Tasks',
                'objective': 'Filtering using date strings.',
                'problem': 'Find all tasks where the due_date is in the past.',
                'solution': 'SELECT * FROM todos WHERE due_date < date(\'now\');',
                'system_query': 'SELECT * FROM todos WHERE due_date < date(\'now\');',
                'expected': 'List of overdue tasks.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Using wrong date formatting.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 802 — String Functions',
                'objective': 'Use UPPER, LOWER, LENGTH, SUBSTR, TRIM.',
                'problem': 'Select the `username` in uppercase, the length of the `email`, the first 3 characters of the `status` (SUBSTR), and the `title` with any surrounding spaces removed (TRIM) from `users` and `todos` (joined).',
                'solution': 'SELECT UPPER(u.username), LENGTH(u.email), SUBSTR(t.status, 1, 3), TRIM(t.title)\nFROM users u\nJOIN todos t ON u.id = t.user_id;',
                'system_query': 'SELECT UPPER(u.username), LENGTH(u.email), SUBSTR(t.status, 1, 3), TRIM(t.title) FROM users u JOIN todos t ON u.id = t.user_id;',
                'expected': 'Transformed string columns.',
                'hints': 'SUBSTR(string, start, length). Index is 1-based.',
                'mistakes': 'Using 0-based index for SUBSTR.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 803 — Task Urgency Levels',
                'objective': 'Using CASE WHEN statements.',
                'problem': 'Output the title of the task and a new column called \'urgency\'. If priority is 1, urgency is \'High\', otherwise \'Normal\'.',
                'solution': 'SELECT title, \n  CASE \n    WHEN priority = 1 THEN \'High\' \n    ELSE \'Normal\' \n  END AS urgency \nFROM todos;',
                'system_query': 'SELECT title, CASE WHEN priority = 1 THEN \'High\' ELSE \'Normal\' END AS urgency FROM todos;',
                'expected': 'Task titles and urgency levels.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting the END keyword.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            }
        ]
    },
    {
        'name': 'Sprint 9 - Set Operations & Advanced Schema',
        'tasks': [
            {
                'title': 'Task 901 — Find Alice\'s Tasks via Subquery',
                'objective': 'Writing Subqueries in the WHERE clause.',
                'problem': 'Find all task titles for the user \'alice_dev\' without using a JOIN, but instead using a subquery.',
                'solution': 'SELECT title FROM todos \nWHERE user_id = (\n    SELECT id FROM users WHERE username = \'alice_dev\'\n);',
                'system_query': 'SELECT title FROM todos WHERE user_id = (SELECT id FROM users WHERE username = \'alice_dev\');',
                'expected': 'Alice\'s tasks.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Using = when subquery returns multiple rows (use IN instead in that case).',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 902 — User Task Counts (CTE)',
                'objective': 'Structuring queries with WITH (CTEs).',
                'problem': 'Use a Common Table Expression (CTE) named `user_counts` to calculate the total tasks per user_id, then select all records from the CTE.',
                'solution': 'WITH user_counts AS (\n    SELECT user_id, COUNT(*) as total_tasks \n    FROM todos \n    GROUP BY user_id\n)\nSELECT * FROM user_counts;',
                'system_query': 'WITH user_counts AS (SELECT user_id, COUNT(*) as total_tasks FROM todos GROUP BY user_id) SELECT * FROM user_counts;',
                'expected': 'CTE results.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Forgetting to SELECT from the CTE after defining it.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 903 — Create Index',
                'objective': 'Using CREATE INDEX to optimize performance.',
                'problem': 'Create an index called `idx_todos_status` on the `status` column of the `todos` table to speed up filtering.',
                'solution': 'CREATE INDEX idx_todos_status ON todos(status);',
                'system_query': 'SELECT sql FROM sqlite_master WHERE type=\'index\' AND name=\'idx_todos_status\';',
                'expected': 'The index creation statement.',
                'hints': 'Read the SQLite documentation for the specific keyword.',
                'mistakes': 'Using string quotes for table or column names.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'INDEX',
            },
            {
                'title': 'Task 904 — View Existing Indexes',
                'objective': 'Check which indexes exist on a table.',
                'problem': 'Use the appropriate PRAGMA to list all indexes on the `todos` table.',
                'solution': 'PRAGMA index_list(\'todos\');',
                'system_query': 'PRAGMA index_list(\'todos\');',
                'expected': '| seq | name             | unique | origin | partial |\n| --- | ---------------- | ------ | ------ | ------- |\n| 0   | idx_todos_status | 0      | c      | 0       |',
                'hints': 'PRAGMA index_list(\'table_name\');',
                'mistakes': 'Forgetting quotes around the table name.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 905 — Inspect Indexed Columns',
                'objective': 'Check which columns are covered by an index.',
                'problem': 'Use the appropriate PRAGMA to inspect the `idx_todos_status` index.',
                'solution': 'PRAGMA index_info(\'idx_todos_status\');',
                'system_query': 'PRAGMA index_info(\'idx_todos_status\');',
                'expected': '| seqno | cid | name   |\n| ----- | --- | ------ |\n| 0     | 5   | status |',
                'hints': 'PRAGMA index_info(\'index_name\');',
                'mistakes': 'Checking the table name instead of the index name.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 906 — Drop Index',
                'objective': 'Remove an existing index.',
                'problem': 'Drop the `idx_todos_status` index.',
                'solution': 'DROP INDEX idx_todos_status;',
                'system_query': 'PRAGMA index_list(\'todos\');',
                'expected': 'No idx_todos_status shown.',
                'hints': 'DROP INDEX index_name;',
                'mistakes': 'Trying to drop the index from a specific table (e.g. DROP INDEX ON table).',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'INDEX',
            },
            {
                'title': 'Task 907 — Altering Table Schema',
                'objective': 'Using ALTER TABLE to modify existing tables.',
                'problem': 'The product team wants to track when a task was last updated. Add a new column `updated_at` of type DATE to the `todos` table.',
                'solution': 'ALTER TABLE todos ADD COLUMN updated_at DATE;',
                'system_query': "SELECT sql FROM sqlite_master WHERE type='table' AND name='todos';",
                'expected': "The updated CREATE TABLE statement for 'todos', which will now include 'updated_at DATE' at the end.",
                'hints': 'ALTER TABLE table_name ADD COLUMN column_name datatype;',
                'mistakes': 'Forgetting ADD COLUMN.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'SCHEMA',
            }
        ]
    }
]

header = """# 📚 SQLite Learning Lab — Interactive Curriculum

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
    \"\"\"
    Execute student's query.
    Execute verification query.
    Compare result.
    Return evaluation JSON.
    \"\"\"
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

"""

output = []
output.append(header)

for sprint in sprints:
    output.append(f"## {sprint['name']}\n")
    for task in sprint['tasks']:
        task_str = f"""### {task['title']}

**Learning Objective**
{task['objective']}

**Problem Statement**
{task['problem']}

**Hidden Reference Solution**
(What the student is expected to write)
```sql
{task['solution']}
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```sql
{task['system_query']}
```

**Expected Verification Result**
(The output of the verification query)
{task['expected']}

**Hints**
{task['hints']}

**Common Mistakes**
{task['mistakes']}

**Evaluation Type**
{task['eval_type']}

**Scoring**
{task['scoring']}

**Evaluation Strategy**
* Execute student's query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

"""
        output.append(task_str)

with open(r'c:\Users\vloke\OneDrive\Documents\yuvro intern\yuvro\notion_sqlite_sprints.md', 'w', encoding='utf-8') as f:
    f.write(''.join(output))

print('Done rewriting notion_sqlite_sprints.md (Phase 2)')

import json
import os

sprints = [
    {
        'name': 'Sprint 1 - Database Initialization',
        'tasks': [
            {
                'title': 'Task 101 — Create the Database',
                'objective': 'Understand how MongoDB switches to/initializes a database.',
                'problem': 'Before we can create collections, we must switch to or initialize the MongoDB database. Switch to the database named `learning_lab`.',
                'sql_equiv': '-- SQLite creates the database automatically when you connect to a file.\n-- Command line equivalent: sqlite3 learning_lab.db \'.databases\'',
                'solution': 'use learning_lab',
                'system_query': 'db.getName()',
                'expected': 'learning_lab',
                'hints': 'Use the `use` command followed by the database name.',
                'mistakes': 'Forgetting the `use` keyword.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            }
        ]
    },
    {
        'name': 'Sprint 2 - Table Creation & Schema',
        'tasks': [
            {
                'title': 'Task 201 — Create the Users Collection',
                'objective': 'Learn how to explicitly create a collection using `createCollection`.',
                'problem': 'We need a place to store our users. Create a collection named `users`.',
                'sql_equiv': 'CREATE TABLE users (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    username TEXT NOT NULL,\n    email TEXT NOT NULL\n);',
                'solution': 'db.createCollection("users")',
                'system_query': 'db.getCollectionNames().sort()',
                'expected': 'Returns the list of collections including \'users\'.',
                'hints': 'Use db.createCollection("users").',
                'mistakes': 'Using SQL CREATE TABLE syntax or using wrong casing for the collection name.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'SCHEMA',
            },
            {
                'title': 'Task 202 — Create the Todos Collection',
                'objective': 'Learn how to explicitly create a collection named `todos`.',
                'problem': 'Create the `todos` collection that will link to the `users` collection.',
                'sql_equiv': 'CREATE TABLE todos (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    user_id INTEGER NOT NULL,\n    title TEXT NOT NULL,\n    priority INTEGER DEFAULT 3,\n    due_date DATE,\n    status TEXT DEFAULT \'pending\',\n    FOREIGN KEY(user_id) REFERENCES users(id)\n);',
                'solution': 'db.createCollection("todos")',
                'system_query': 'db.getCollectionNames().sort()',
                'expected': 'Returns the list of collections including \'todos\'.',
                'hints': 'Use db.createCollection("todos").',
                'mistakes': 'Using SQL CREATE TABLE syntax or wrong collection name.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'SCHEMA',
            },
            {
                'title': 'Task 203 — UNIQUE, CHECK, NOT NULL Constraints',
                'objective': 'Understand explicit collection creation for categories.',
                'problem': 'Create a `categories` collection. (In MongoDB, validations are dynamic or defined as jsonSchema. For this task, explicitly create the collection).',
                'sql_equiv': 'CREATE TABLE categories (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    name TEXT NOT NULL UNIQUE,\n    color_code TEXT CHECK(color_code LIKE \'#%\')\n);',
                'solution': 'db.createCollection("categories")',
                'system_query': 'db.getCollectionNames().sort()',
                'expected': 'Returns the list of collections including \'categories\'.',
                'hints': 'Use db.createCollection("categories").',
                'mistakes': 'Using SQL CREATE TABLE syntax.',
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
                'objective': 'Use insertMany for inserting multiple documents.',
                'problem': 'Add five users to the system: \'alice_dev\' (alice@email.com), \'bob_ops\' (bob@email.com), \'charlie_ux\' (charlie@email.com), \'david_qa\' (david@email.com), and \'eve_mgr\' (eve@email.com). For MongoDB, assign them custom `_id` values: 1 through 5 respectively to match the autoincrement IDs.',
                'sql_equiv': 'INSERT INTO users (id, username, email) VALUES \n(1, \'alice_dev\', \'alice@email.com\'),\n(2, \'bob_ops\', \'bob@email.com\'),\n(3, \'charlie_ux\', \'charlie@email.com\'),\n(4, \'david_qa\', \'david@email.com\'),\n(5, \'eve_mgr\', \'eve@email.com\');',
                'solution': 'db.users.insertMany([\n  { _id: 1, username: "alice_dev", email: "alice@email.com" },\n  { _id: 2, username: "bob_ops", email: "bob@email.com" },\n  { _id: 3, username: "charlie_ux", email: "charlie@email.com" },\n  { _id: 4, username: "david_qa", email: "david@email.com" },\n  { _id: 5, username: "eve_mgr", email: "eve@email.com" }\n])',
                'system_query': 'db.users.find({}, { _id: 1, username: 1, email: 1 }).sort({ _id: 1 })',
                'expected': 'Returns the array of five user documents with their usernames and emails.',
                'hints': 'Use db.users.insertMany() and pass an array of documents.',
                'mistakes': 'Using SQL INSERT INTO syntax or omitting the array brackets in insertMany.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            },
            {
                'title': 'Task 302 — Insert First Todos',
                'objective': 'Understand default values during insertOne.',
                'problem': 'Assign a first batch of tasks (with `_id` values 1 through 9) to different users:\n1. For Alice (`user_id = 1`): \'Setup database\' (priority 3, status \'pending\', no due date).\n2. For Alice (`user_id = 1`): \'Design schema\' (priority 1, status \'completed\', due date in the past \'2026-06-15\').\n3. For Alice (`user_id = 1`): \'Configure CI/CD\' (priority 3, status \'cancelled\', no due date).\n4. For Bob (`user_id = 2`): \'Deploy production\' (priority 1, status \'completed\', due date in the past \'2026-06-20\').\n5. For Bob (`user_id = 2`): \'Monitor disk usage\' (priority 2, status \'pending\', due date in the past \'2026-06-25\').\n6. For Charlie (`user_id = 3`): \'Create wireframes\' (priority 2, status \'completed\', due date in the past \'2026-06-10\').\n7. For David (`user_id = 4`): \'Write test cases\' (priority 3, status \'pending\', due date in the future \'2026-07-25\').\n8. For Eve (`user_id = 5`): \'Project kickoff\' (priority 1, status \'completed\', due date in the past \'2026-06-01\').\n9. For Eve (`user_id = 5`): \'Weekly sync\' (priority 3, status \'pending\', due date in the future \'2026-07-30\').\n\nNote: To demonstrate MongoDB\'s flexible schema, omit the `due_date` field entirely in documents where it is not set (instead of using null).',
                'sql_equiv': 'INSERT INTO todos (id, user_id, title, priority, status) VALUES (1, 1, \'Setup database\', 3, \'pending\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (2, 1, \'Design schema\', 1, \'2026-06-15\', \'completed\');\nINSERT INTO todos (id, user_id, title, priority, status) VALUES (3, 1, \'Configure CI/CD\', 3, \'cancelled\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (4, 2, \'Deploy production\', 1, \'2026-06-20\', \'completed\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (5, 2, \'Monitor disk usage\', 2, \'2026-06-25\', \'pending\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (6, 3, \'Create wireframes\', 2, \'2026-06-10\', \'completed\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (7, 4, \'Write test cases\', 3, \'2026-07-25\', \'pending\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (8, 5, \'Project kickoff\', 1, \'2026-06-01\', \'completed\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (9, 5, \'Weekly sync\', 3, \'2026-07-30\', \'pending\');',
                'solution': 'db.todos.insertMany([\n  { _id: 1, user_id: 1, title: "Setup database", priority: 3, status: "pending" },\n  { _id: 2, user_id: 1, title: "Design schema", priority: 1, due_date: new Date("2026-06-15"), status: "completed" },\n  { _id: 3, user_id: 1, title: "Configure CI/CD", priority: 3, status: "cancelled" },\n  { _id: 4, user_id: 2, title: "Deploy production", priority: 1, due_date: new Date("2026-06-20"), status: "completed" },\n  { _id: 5, user_id: 2, title: "Monitor disk usage", priority: 2, due_date: new Date("2026-06-25"), status: "pending" },\n  { _id: 6, user_id: 3, title: "Create wireframes", priority: 2, due_date: new Date("2026-06-10"), status: "completed" },\n  { _id: 7, user_id: 4, title: "Write test cases", priority: 3, due_date: new Date("2026-07-25"), status: "pending" },\n  { _id: 8, user_id: 5, title: "Project kickoff", priority: 1, due_date: new Date("2026-06-01"), status: "completed" },\n  { _id: 9, user_id: 5, title: "Weekly sync", priority: 3, due_date: new Date("2026-07-30"), status: "pending" }\n])',
                'system_query': 'db.todos.find().sort({ _id: 1 })',
                'expected': 'Returns the list of todos containing the new tasks.',
                'hints': 'Use db.todos.insertMany() and omit due_date where it is null/empty.',
                'mistakes': 'Omitting fields, spelling names incorrectly, or writing due_date: null instead of omitting it.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            },
            {
                'title': 'Task 303 — DEFAULT Demonstration',
                'objective': 'Explicitly define default values during insertion.',
                'problem': 'Assign a second batch of tasks (with `_id` values 10 through 18) to represent different scenarios:\n1. For Alice (`user_id = 1`): \'Write documentation\' (priority 3, status \'pending\', no due date).\n2. For Alice (`user_id = 1`): \'Review pull requests\' (priority 2, status \'pending\', due date in the future \'2026-07-20\').\n3. For Alice (`user_id = 1`): \'Fix bug #104\' (priority 1, status \'pending\', due date in the past \'2026-06-30\').\n4. For Alice (`user_id = 1`): \'Refactor auth logic\' (priority 2, status \'pending\', due date in the future \'2026-07-22\').\n5. For Alice (`user_id = 1`): \'Run security audit\' (priority 5, status \'pending\', due date in the future \'2026-07-28\').\n6. For Bob (`user_id = 2`): \'Backup database\' (priority 3, status \'completed\', no due date).\n7. For Charlie (`user_id = 3`): \'User testing\' (priority 3, status \'pending\', no due date).\n8. For David (`user_id = 4`): \'Run load tests\' (priority 2, status \'pending\', no due date).\n9. For Eve (`user_id = 5`): \'Budget review\' (priority 5, status \'pending\', due date in the future \'2026-07-27\').\n\nNote: Omit the `due_date` field from documents that have no due date.',
                'sql_equiv': 'INSERT INTO todos (id, user_id, title, priority, status) VALUES (10, 1, \'Write documentation\', 3, \'pending\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (11, 1, \'Review pull requests\', 2, \'2026-07-20\', \'pending\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (12, 1, \'Fix bug #104\', 1, \'2026-06-30\', \'pending\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (13, 1, \'Refactor auth logic\', 2, \'2026-07-22\', \'pending\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (14, 1, \'Run security audit\', 5, \'2026-07-28\', \'pending\');\nINSERT INTO todos (id, user_id, title, priority, status) VALUES (15, 2, \'Backup database\', 3, \'completed\');\nINSERT INTO todos (id, user_id, title, priority, status) VALUES (16, 3, \'User testing\', 3, \'pending\');\nINSERT INTO todos (id, user_id, title, priority, status) VALUES (17, 4, \'Run load tests\', 2, \'pending\');\nINSERT INTO todos (id, user_id, title, priority, due_date, status) VALUES (18, 5, \'Budget review\', 5, \'2026-07-27\', \'pending\');',
                'solution': 'db.todos.insertMany([\n  { _id: 10, user_id: 1, title: "Write documentation", priority: 3, status: "pending" },\n  { _id: 11, user_id: 1, title: "Review pull requests", priority: 2, due_date: new Date("2026-07-20"), status: "pending" },\n  { _id: 12, user_id: 1, title: "Fix bug #104", priority: 1, due_date: new Date("2026-06-30"), status: "pending" },\n  { _id: 13, user_id: 1, title: "Refactor auth logic", priority: 2, due_date: new Date("2026-07-22"), status: "pending" },\n  { _id: 14, user_id: 1, title: "Run security audit", priority: 5, due_date: new Date("2026-07-28"), status: "pending" },\n  { _id: 15, user_id: 2, title: "Backup database", priority: 3, status: "completed" },\n  { _id: 16, user_id: 3, title: "User testing", priority: 3, status: "pending" },\n  { _id: 17, user_id: 4, title: "Run load tests", priority: 2, status: "pending" },\n  { _id: 18, user_id: 5, title: "Budget review", priority: 5, due_date: new Date("2026-07-27"), status: "pending" }\n])',
                'system_query': 'db.todos.find().sort({ _id: 1 })',
                'expected': 'Returns the list of todos including all tasks.',
                'hints': 'Insert documents with _id 10 through 18, omitting the due_date field when null.',
                'mistakes': 'Forgetting to specify fields or including due_date as null.',
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
                'objective': 'The find() statement to fetch all documents.',
                'problem': 'Retrieve all columns and all rows from the `users` collection.',
                'sql_equiv': 'SELECT * FROM users;',
                'solution': 'db.users.find({})',
                'system_query': 'db.users.find({}).sort({ _id: 1 })',
                'expected': 'Returns all documents in the users collection.',
                'hints': 'Use db.users.find({}).',
                'mistakes': 'Using SQL SELECT syntax.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 402 — DISTINCT Retrieval',
                'objective': 'Use distinct() to remove duplicates.',
                'problem': 'Fetch a list of all unique statuses currently present in the `todos` collection. Note that while SQL DISTINCT returns a result set of rows, MongoDB\'s `distinct()` method returns a raw JavaScript array of unique values.',
                'sql_equiv': 'SELECT DISTINCT status FROM todos;',
                'solution': 'db.todos.distinct("status")',
                'system_query': 'db.todos.distinct("status").sort()',
                'expected': '[ "cancelled", "completed", "pending" ]',
                'hints': 'Use db.todos.distinct("status").',
                'mistakes': 'Using find() instead of distinct().',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 403 — Filter Active Todos (Equality)',
                'objective': 'Filter using equality in find().',
                'problem': 'Fetch only the `title` of todos that have a status of \'pending\'. Hide the `_id` field.',
                'sql_equiv': 'SELECT title FROM todos WHERE status = \'pending\';',
                'solution': 'db.todos.find({ status: "pending" }, { title: 1, _id: 0 })',
                'system_query': 'db.todos.find({ status: "pending" }, { title: 1, _id: 0 }).sort({ title: 1 })',
                'expected': 'List of pending todo titles.',
                'hints': 'Use projection `{ title: 1, _id: 0 }` in the second argument of find().',
                'mistakes': 'Forgetting to hide _id.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 404 — Comparison Operators',
                'objective': 'Filter data using comparison operators like `$gt`.',
                'problem': 'Fetch the `title` of todos that have a priority greater than 1. Hide the `_id` field.',
                'sql_equiv': 'SELECT title FROM todos WHERE priority > 1;',
                'solution': 'db.todos.find({ priority: { $gt: 1 } }, { title: 1, _id: 0 })',
                'system_query': 'db.todos.find({ priority: { $gt: 1 } }, { title: 1, _id: 0 }).sort({ title: 1 })',
                'expected': 'Todos with priority greater than 1.',
                'hints': 'Use the $gt operator.',
                'mistakes': 'Using SQL > operator syntax directly.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 405 — Logical Operators (AND / OR / NOT)',
                'objective': 'Combine conditions using logical operators.',
                'problem': 'Fetch the `title` of todos that have a priority of 3 AND status is \'pending\'. Hide the `_id` field.',
                'sql_equiv': 'SELECT title FROM todos WHERE priority = 3 AND status = \'pending\';',
                'solution': 'db.todos.find({ priority: 3, status: "pending" }, { title: 1, _id: 0 })',
                'system_query': 'db.todos.find({ priority: 3, status: "pending" }, { title: 1, _id: 0 }).sort({ title: 1 })',
                'expected': 'Todos matching priority 3 and status pending.',
                'hints': 'In MongoDB, fields in the query object are implicitly ANDed together.',
                'mistakes': 'Using explicit $and unnecessarily or using incorrect syntax.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 406 — The IN Operator',
                'objective': 'Filter against a list of values using `$in`.',
                'problem': 'Fetch the `title` of todos where the status is IN (\'pending\', \'completed\'). Hide the `_id` field.',
                'sql_equiv': 'SELECT title FROM todos WHERE status IN (\'pending\', \'completed\');',
                'solution': 'db.todos.find({ status: { $in: ["pending", "completed"] } }, { title: 1, _id: 0 })',
                'system_query': 'db.todos.find({ status: { $in: ["pending", "completed"] } }, { title: 1, _id: 0 }).sort({ title: 1 })',
                'expected': 'Todos with status pending or completed.',
                'hints': 'Use { status: { $in: ["pending", "completed"] } }.',
                'mistakes': 'Using multiple OR conditions instead of $in.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 407 — The BETWEEN Operator',
                'objective': 'Filter within a range using `$gte` and `$lte`.',
                'problem': 'Fetch the `title` of todos where priority is BETWEEN 1 AND 3. Hide the `_id` field.',
                'sql_equiv': 'SELECT title FROM todos WHERE priority BETWEEN 1 AND 3;',
                'solution': 'db.todos.find({ priority: { $gte: 1, $lte: 3 } }, { title: 1, _id: 0 })',
                'system_query': 'db.todos.find({ priority: { $gte: 1, $lte: 3 } }, { title: 1, _id: 0 }).sort({ title: 1 })',
                'expected': 'Todos with priority in range 1 to 3.',
                'hints': 'Use { priority: { $gte: 1, $lte: 3 } }.',
                'mistakes': 'Using only one boundary or wrong operator keys.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 408 — The LIKE Operator',
                'objective': 'Match patterns using regular expressions (`$regex`).',
                'problem': 'Find all todos where the title contains the word \'database\'. For now, perform a standard pattern match using the string `"database"`.',
                'sql_equiv': 'SELECT * FROM todos WHERE title LIKE \'%database%\';',
                'solution': 'db.todos.find({ title: { $regex: "database" } })',
                'system_query': 'db.todos.find({ title: { $regex: "database" } }).sort({ _id: 1 })',
                'expected': 'Returns todos matching the string "database" inside their title.',
                'hints': 'Use { title: { $regex: "database" } } for standard matching.',
                'mistakes': 'Using SQL wildcard % characters in MongoDB.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 409 — Exists Operator ($exists)',
                'objective': 'Verify field existence using $exists.',
                'problem': 'Fetch the `title` of todos that contain a `due_date` field. Hide the `_id` field.',
                'sql_equiv': 'SELECT title FROM todos WHERE due_date IS NOT NULL;',
                'solution': 'db.todos.find({ due_date: { $exists: true } }, { title: 1, _id: 0 })',
                'system_query': 'db.todos.find({ due_date: { $exists: true } }, { title: 1, _id: 0 }).sort({ title: 1 })',
                'expected': 'Todos that possess a due_date field.',
                'hints': 'Query with { due_date: { $exists: true } }.',
                'mistakes': 'Using { due_date: null } which checks for null or missing values instead of checking existence.',
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
                'objective': 'Sort results in ascending order.',
                'problem': 'Get the `_id` and `title` of all tasks, ordered by priority in ascending order.',
                'sql_equiv': 'SELECT id, title FROM todos ORDER BY priority ASC;',
                'solution': 'db.todos.find({}, { _id: 1, title: 1 }).sort({ priority: 1 })',
                'system_query': 'db.todos.find({}, { _id: 1, title: 1 }).sort({ priority: 1, _id: 1 })',
                'expected': 'Todos sorted by priority ascending.',
                'hints': 'Chain .sort({ priority: 1 }) onto your find() query.',
                'mistakes': 'Using ASC keyword instead of 1.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 502 — Top 5 Recent Tasks (DESC)',
                'objective': 'Combine sort and limit.',
                'problem': 'Get the 5 most recently created todos (assuming highest `_id` is most recent). Fetch their `_id` and `title`.',
                'sql_equiv': 'SELECT id, title FROM todos ORDER BY id DESC LIMIT 5;',
                'solution': 'db.todos.find({}, { title: 1 }).sort({ _id: -1 }).limit(5)',
                'system_query': 'db.todos.find({}, { title: 1 }).sort({ _id: -1 }).limit(5)',
                'expected': 'Top 5 recent tasks.',
                'hints': 'Chain .sort({ _id: -1 }).limit(5) onto find().',
                'mistakes': 'Forgetting descending sort (-1) or wrong limit.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 503 — Complete a Task',
                'objective': 'Update a single document using updateOne.',
                'problem': 'Task with `_id = 1` has been finished. Change its status to \'completed\'.',
                'sql_equiv': 'UPDATE todos SET status = \'completed\' WHERE id = 1;',
                'solution': 'db.todos.updateOne({ _id: 1 }, { $set: { status: "completed" } })',
                'system_query': 'db.todos.find().sort({ _id: 1 })',
                'expected': 'The todo with _id: 1 has its status updated to completed.',
                'hints': 'Use the $set operator in updateOne.',
                'mistakes': 'Forgetting the $set operator or omitting the filter.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            },
            {
                'title': 'Task 504 — Delete Old Data',
                'objective': 'Delete multiple documents using deleteMany.',
                'problem': 'Delete any todos that belong to `user_id = 2`.',
                'sql_equiv': 'DELETE FROM todos WHERE user_id = 2;',
                'solution': 'db.todos.deleteMany({ user_id: 2 })',
                'system_query': 'db.todos.find().sort({ _id: 1 })',
                'expected': 'Removes all todos with user_id: 2 (exactly 3 documents are deleted).',
                'hints': 'Use db.todos.deleteMany({ user_id: 2 }).',
                'mistakes': 'Using deleteOne instead of deleteMany.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            },
            {
                'title': 'Task 505 — Increment Priority',
                'objective': 'Increment a numeric field using $inc.',
                'problem': 'Increase the `priority` of all pending todos by 1.',
                'sql_equiv': 'UPDATE todos SET priority = priority + 1 WHERE status = \'pending\';',
                'solution': 'db.todos.updateMany({ status: "pending" }, { $inc: { priority: 1 } })',
                'system_query': 'db.todos.find().sort({ _id: 1 })',
                'expected': 'Pending tasks have their priority incremented by 1.',
                'hints': 'Use updateMany with { status: "pending" } and $inc operator.',
                'mistakes': 'Using $set instead of $inc, or forgetting update filter.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE',
            },
            {
                'title': 'Task 506 — Unset a Field ($unset)',
                'objective': 'Remove a field from documents using $unset.',
                'problem': 'Remove the `due_date` field entirely from all documents in the `todos` collection.',
                'sql_equiv': 'ALTER TABLE todos DROP COLUMN due_date;',
                'solution': 'db.todos.updateMany({}, { $unset: { due_date: "" } })',
                'system_query': 'db.todos.find().sort({ _id: 1 })',
                'expected': 'Verifies the due_date field is removed from all todos.',
                'hints': 'Use db.todos.updateMany({}, { $unset: { due_date: "" } }).',
                'mistakes': 'Using $set to set it to null instead of completely removing it via $unset.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'SCHEMA',
            },
            {
                'title': 'Task 507 — Rename a Field ($rename)',
                'objective': 'Rename a field using $rename.',
                'problem': 'Rename the `title` field to `task_name` in all documents of the `todos` collection.',
                'sql_equiv': 'ALTER TABLE todos RENAME COLUMN title TO task_name;',
                'solution': 'db.todos.updateMany({}, { $rename: { "title": "task_name" } })',
                'system_query': 'db.todos.find().sort({ _id: 1 })',
                'expected': 'Verifies the todos now contain task_name instead of title.',
                'hints': 'Use db.todos.updateMany({}, { $rename: { "title": "task_name" } }).',
                'mistakes': 'Forgetting to quote field names inside the $rename block.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'SCHEMA',
            },
            {
                'title': 'Task 508 — Replace a Document Entirely (replaceOne)',
                'objective': 'Learn replaceOne and understand the preservation of _id.',
                'problem': 'Replace user with `_id = 2` (Bob) with a new profile having the username \'Robert\' and no other user-defined fields (such as email). Note: In MongoDB, `replaceOne()` completely replaces all user-defined fields of the target document, but the `_id` field is automatically preserved and remains unchanged.',
                'sql_equiv': 'UPDATE users SET username = \'Robert\', email = NULL WHERE id = 2;',
                'solution': 'db.users.replaceOne({ _id: 2 }, { username: "Robert" })',
                'system_query': 'db.users.find().sort({ _id: 1 })',
                'expected': 'Verifies Bob is replaced by Robert, keeping _id: 2 but removing the email field.',
                'hints': 'Use db.users.replaceOne({ _id: 2 }, { username: "Robert" }).',
                'mistakes': 'Trying to include _id in the replacement object (causes write error) or using updateOne with $set.',
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
                'objective': 'Count documents using countDocuments.',
                'problem': 'Find out exactly how many total tasks exist in the system.',
                'sql_equiv': 'SELECT COUNT(*) FROM todos;',
                'solution': 'db.todos.countDocuments({})',
                'system_query': 'db.todos.countDocuments({})',
                'expected': 'Returns count of total todos.',
                'hints': 'Use db.todos.countDocuments({}).',
                'mistakes': 'Using deprecated count() function.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 602 — SUM, MIN, MAX, AVG',
                'objective': 'Use the aggregation framework for basic statistics.',
                'problem': 'Find the total sum, minimum, maximum, and average of the `priority` field for all tasks.',
                'sql_equiv': 'SELECT SUM(priority), MIN(priority), MAX(priority), AVG(priority) FROM todos;',
                'solution': 'db.todos.aggregate([\n  { $group: { _id: null, sumPriority: { $sum: "$priority" }, minPriority: { $min: "$priority" }, maxPriority: { $max: "$priority" }, avgPriority: { $avg: "$priority" } } }\n])',
                'system_query': 'db.todos.aggregate([\n  { $group: { _id: null, sumPriority: { $sum: "$priority" }, minPriority: { $min: "$priority" }, maxPriority: { $max: "$priority" }, avgPriority: { $avg: "$priority" } } }\n])',
                'expected': 'Returns a single document with the calculated metrics.',
                'hints': 'To aggregate all documents, group by _id: null.',
                'mistakes': 'Forgetting the $ sign on the field path "$priority".',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 603 — Task Count by Status',
                'objective': 'Group documents by a field using the aggregation framework.',
                'problem': 'Create a report showing each `status` and the total number of tasks in that status.',
                'sql_equiv': 'SELECT status, COUNT(*) AS task_count FROM todos GROUP BY status;',
                'solution': 'db.todos.aggregate([\n  { $group: { _id: "$status", task_count: { $sum: 1 } } }\n])',
                'system_query': 'db.todos.aggregate([\n  { $group: { _id: "$status", task_count: { $sum: 1 } } },\n  { $sort: { _id: 1 } }\n])',
                'expected': 'Returns status groups with total counts sorted deterministically by status ID.',
                'hints': 'Use the $group stage and count documents using { $sum: 1 }.',
                'mistakes': 'Grouping by _id: "status" instead of _id: "$status".',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 604 — Overloaded Users',
                'objective': 'Filter grouped data with `$match` (having equivalent).',
                'problem': 'Show the `user_id` and count of tasks only for users who have strictly more than 5 tasks.',
                'sql_equiv': 'SELECT user_id, COUNT(*) AS total_tasks FROM todos GROUP BY user_id HAVING COUNT(*) > 5;',
                'solution': 'db.todos.aggregate([\n  { $group: { _id: "$user_id", total_tasks: { $sum: 1 } } },\n  { $match: { total_tasks: { $gt: 5 } } }\n])',
                'system_query': 'db.todos.aggregate([\n  { $group: { _id: "$user_id", total_tasks: { $sum: 1 } } },\n  { $match: { total_tasks: { $gt: 5 } } },\n  { $sort: { _id: 1 } }\n])',
                'expected': 'Returns users having more than 5 tasks (specifically Alice with user_id: 1).',
                'hints': 'The second stage should be a $match on total_tasks.',
                'mistakes': 'Placing the filter before the $group stage.',
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
                'objective': 'Perform an inner join using `$lookup`.',
                'problem': 'The front-end needs to display the task title alongside the username. Join the collections to fetch `username` and `title`. Hide `_id`.',
                'sql_equiv': 'SELECT u.username, t.title \nFROM users u \nINNER JOIN todos t ON u.id = t.user_id;',
                'solution': 'db.todos.aggregate([\n  { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "u" } },\n  { $unwind: "$u" },\n  { $project: { _id: 0, username: "$u.username", title: 1 } }\n])',
                'system_query': 'db.todos.aggregate([\n  { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "u" } },\n  { $unwind: "$u" },\n  { $project: { _id: 0, username: "$u.username", title: 1 } },\n  { $sort: { username: 1, title: 1 } }\n])',
                'expected': 'Flat list containing username and title for tasks.',
                'hints': 'Use $lookup on users, $unwind the resulting array, and $project to format.',
                'mistakes': 'Forgetting to unwind the lookup result array.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 702 — All Users and Their Tasks',
                'objective': 'Perform a left join using `$lookup` and `$unwind`.',
                'problem': 'Get a list of ALL users, along with their tasks. If a user hasn\'t created any tasks, they should still appear in the list with a null/empty task title.',
                'sql_equiv': 'SELECT u.username, t.title \nFROM users u \nLEFT JOIN todos t ON u.id = t.user_id;',
                'solution': 'db.users.aggregate([\n  { $lookup: { from: "todos", localField: "_id", foreignField: "user_id", as: "t" } },\n  { $unwind: { path: "$t", preserveNullAndEmptyArrays: true } },\n  { $project: { _id: 0, username: 1, title: "$t.title" } }\n])',
                'system_query': 'db.users.aggregate([\n  { $lookup: { from: "todos", localField: "_id", foreignField: "user_id", as: "t" } },\n  { $unwind: { path: "$t", preserveNullAndEmptyArrays: true } },\n  { $project: { _id: 0, username: 1, title: "$t.title" } },\n  { $sort: { username: 1, title: 1 } }\n])',
                'expected': 'Lists all users and titles, with null title for users without tasks.',
                'hints': 'Use $unwind with option { path: "$t", preserveNullAndEmptyArrays: true }.',
                'mistakes': 'Using simple unwind which drops users without tasks.',
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
                'objective': 'Filter documents using date comparisons.',
                'problem': 'Find all tasks where the due_date is in the past.',
                'sql_equiv': 'SELECT * FROM todos WHERE due_date < date(\'now\');',
                'solution': 'db.todos.find({ due_date: { $lt: new Date() } })',
                'system_query': 'db.todos.find({ due_date: { $lt: new Date() } }).sort({ _id: 1 })',
                'expected': 'List of overdue tasks.',
                'hints': 'Match using { due_date: { $lt: new Date() } }.',
                'mistakes': 'Comparing against a string date instead of a Date object.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 802 — String Functions',
                'objective': 'Use string aggregation operators.',
                'problem': 'Select the `username` in uppercase, the length of the `email`, the first 3 characters of the `status`, and the `title` with any surrounding spaces removed.',
                'sql_equiv': 'SELECT UPPER(u.username), LENGTH(u.email), SUBSTR(t.status, 1, 3), TRIM(t.title)\nFROM users u\nJOIN todos t ON u.id = t.user_id;',
                'solution': 'db.todos.aggregate([\n  { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "u" } },\n  { $unwind: "$u" },\n  { $project: {\n    _id: 0,\n    username_upper: { $toUpper: "$u.username" },\n    email_length: { $strLenCP: "$u.email" },\n    status_sub: { $substrCP: ["$status", 0, 3] },\n    title_trimmed: { $trim: { input: "$title" } }\n  } }\n])',
                'system_query': 'db.todos.aggregate([\n  { $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "u" } },\n  { $unwind: "$u" },\n  { $project: {\n    _id: 0,\n    username_upper: { $toUpper: "$u.username" },\n    email_length: { $strLenCP: "$u.email" },\n    status_sub: { $substrCP: ["$status", 0, 3] },\n    title_trimmed: { $trim: { input: "$title" } }\n  } },\n  { $sort: { username_upper: 1, title_trimmed: 1 } }\n])',
                'expected': 'Transformed string attributes.',
                'hints': 'Use $toUpper, $strLenCP, $substrCP (0-indexed), and $trim.',
                'mistakes': 'Forgetting $substrCP is 0-indexed while SQLite SUBSTR is 1-indexed.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 803 — Task Urgency Levels',
                'objective': 'Use conditional logic with `$cond`.',
                'problem': 'Output the title of the task and a new column called \'urgency\'. If priority is 1, urgency is \'High\', otherwise \'Normal\'. Hide `_id`.',
                'sql_equiv': 'SELECT title, \n  CASE \n    WHEN priority = 1 THEN \'High\' \n    ELSE \'Normal\' \n  END AS urgency \nFROM todos;',
                'solution': 'db.todos.aggregate([\n  { $project: {\n    _id: 0,\n    title: 1,\n    urgency: { $cond: { if: { $eq: ["$priority", 1] }, then: "High", else: "Normal" } }\n  } }\n])',
                'system_query': 'db.todos.aggregate([\n  { $project: {\n    _id: 0,\n    title: 1,\n    urgency: { $cond: { if: { $eq: ["$priority", 1] }, then: "High", else: "Normal" } }\n  } },\n  { $sort: { title: 1 } }\n])',
                'expected': 'Shows tasks with urgency labels (displays a mix of High and Normal).',
                'hints': 'Use { $cond: { if: { $eq: ["$priority", 1] }, then: "High", else: "Normal" } }.',
                'mistakes': 'Incorrect placement of $cond arguments.',
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
                'objective': 'Use nested queries in place of joins.',
                'problem': 'Find all task titles for the user \'alice_dev\' without using a lookup/join, but instead by querying the user collection inline.',
                'sql_equiv': 'SELECT title FROM todos \nWHERE user_id = (\n    SELECT id FROM users WHERE username = \'alice_dev\'\n);',
                'solution': 'db.todos.find({ user_id: db.users.findOne({ username: "alice_dev" })._id }, { title: 1, _id: 0 })',
                'system_query': 'db.todos.find({ user_id: db.users.findOne({ username: "alice_dev" })._id }, { title: 1, _id: 0 }).sort({ title: 1 })',
                'expected': 'Alice\'s task titles.',
                'hints': 'Resolve the user ID using db.users.findOne first, then pass it as user_id filter.',
                'mistakes': 'Doing a $lookup join instead of querying inline.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 902 — User Task Counts (CTE)',
                'objective': 'Build clean aggregation pipelines.',
                'problem': 'Calculate the total tasks per user_id, returning the fields `user_id` and `total_tasks`.',
                'sql_equiv': 'WITH user_counts AS (\n    SELECT user_id, COUNT(*) as total_tasks \n    FROM todos \n    GROUP BY user_id\n)\nSELECT * FROM user_counts;',
                'solution': 'db.todos.aggregate([\n  { $group: { _id: "$user_id", total_tasks: { $sum: 1 } } },\n  { $project: { _id: 0, user_id: "$_id", total_tasks: 1 } }\n])',
                'system_query': 'db.todos.aggregate([\n  { $group: { _id: "$user_id", total_tasks: { $sum: 1 } } },\n  { $project: { _id: 0, user_id: "$_id", total_tasks: 1 } },\n  { $sort: { user_id: 1 } }\n])',
                'expected': 'Task counts grouped by user_id.',
                'hints': 'Group by _id: "$user_id" and then project user_id from the _id.',
                'mistakes': 'Forgetting to project user_id from the group _id key.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 903 — Create Index',
                'objective': 'Create an index with a custom name.',
                'problem': 'Create an index called `idx_todos_status` on the `status` field of the `todos` collection.',
                'sql_equiv': 'CREATE INDEX idx_todos_status ON todos(status);',
                'solution': 'db.todos.createIndex({ status: 1 }, { name: "idx_todos_status" })',
                'system_query': 'db.todos.getIndexes().sort((a,b) => a.name.localeCompare(b.name))',
                'expected': 'Verify the new index list includes \'idx_todos_status\'.',
                'hints': 'Pass { name: "idx_todos_status" } as the second argument to createIndex.',
                'mistakes': 'Creating the index without naming it.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'INDEX',
            },
            {
                'title': 'Task 904 — View Existing Indexes',
                'objective': 'View collection indexes.',
                'problem': 'List all indexes currently defined on the `todos` collection.',
                'sql_equiv': 'PRAGMA index_list(\'todos\');',
                'solution': 'db.todos.getIndexes()',
                'system_query': 'db.todos.getIndexes().sort((a,b) => a.name.localeCompare(b.name))',
                'expected': 'Returns index definitions.',
                'hints': 'Use getIndexes().',
                'mistakes': 'Querying system collections directly.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 905 — Inspect Indexed Columns',
                'objective': 'Inspect key structure of indexes.',
                'problem': 'Inspect the index `idx_todos_status` to see its key definitions. Note: Since `db.todos.getIndexes()` returns a standard JavaScript array of index definitions (not a MongoDB cursor), we isolate the index named `"idx_todos_status"` using JavaScript\'s built-in `.filter()` function in the shell.',
                'sql_equiv': 'PRAGMA index_info(\'idx_todos_status\');',
                'solution': 'db.todos.getIndexes().filter(idx => idx.name === "idx_todos_status")',
                'system_query': 'db.todos.getIndexes().filter(idx => idx.name === "idx_todos_status")',
                'expected': 'Details of the idx_todos_status index.',
                'hints': 'Use JavaScript array .filter() on the getIndexes() list.',
                'mistakes': 'Trying to lookup index_info via system.indexes, or forgetting that getIndexes() returns a JS array.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET',
            },
            {
                'title': 'Task 906 — Drop Index',
                'objective': 'Remove indexes using dropIndex.',
                'problem': 'Drop the `idx_todos_status` index from the `todos` collection.',
                'sql_equiv': 'DROP INDEX idx_todos_status;',
                'solution': 'db.todos.dropIndex("idx_todos_status")',
                'system_query': 'db.todos.getIndexes().sort((a,b) => a.name.localeCompare(b.name))',
                'expected': 'The index is no longer listed.',
                'hints': 'Pass the index name "idx_todos_status" to dropIndex.',
                'mistakes': 'Trying to drop it via the key pattern { status: 1 } when dropping by name.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'INDEX',
            },
            {
                'title': 'Task 907 — Altering Table Schema',
                'objective': 'Understand schemaless additions using updates.',
                'problem': 'The product team wants to track when a task was last updated. Since MongoDB collections are schemaless, there is no direct schema alteration command (like SQL\'s ALTER TABLE). Instead, we simulate adding a new field `updated_at` (current date) to the schema by updating all existing documents in the `todos` collection using `updateMany()`.',
                'sql_equiv': 'ALTER TABLE todos ADD COLUMN updated_at DATE;',
                'solution': 'db.todos.updateMany({}, { $set: { updated_at: new Date() } })',
                'system_query': 'db.todos.find().sort({ _id: 1 })',
                'expected': 'All documents now contain the updated_at field.',
                'hints': 'Use updateMany with {} filter and $set.',
                'mistakes': 'Forgetting $set or update filter.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'SCHEMA',
            }
        ]
    }
]

header = """# 🍃 MongoDB Learning Lab — Interactive Curriculum

Curriculum, Sprint Structure & Planning Document for the MongoDB Lab (SQL Transition).

---

## 📋 Notion Copy-Paste Instructions
To import this planning page into Notion:
1. Click the raw contents of this file in GitHub/VS Code.
2. Select All and Copy.
3. Paste directly into an empty Notion page (Notion will auto-format the Markdown).

---

## 🎯 Course Overview
* **Lab Name**: MongoDB Lab (SQL Transition)
* **Total Points**: 4500 (approx)
* **Goal**: Help students who already understand SQL transition naturally into MongoDB by teaching them collections, CRUD operations, aggregation pipelines, and indexing, directly mapped to their SQL equivalents.
* **Audience**: Students who have completed the SQLite Lab.

---

"""

output = []
output.append(header)

for sprint in sprints:
    output.append(f"## {sprint['name']}\n\n")
    for task in sprint['tasks']:
        task_str = f"""### {task['title']}

**Learning Objective**
{task['objective']}

**Problem Statement**
{task['problem']}

### SQL Equivalent
```sql
{task['sql_equiv']}
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
{task['solution']}
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
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
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

"""
        output.append(task_str)

with open(r'c:\Users\vloke\OneDrive\Documents\yuvro intern\yuvro\notion_mongodb_sprints.md', 'w', encoding='utf-8') as f:
    f.write(''.join(output))

print('Done writing notion_mongodb_sprints.md (Phase 2 - Fix)')

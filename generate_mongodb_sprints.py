import json
import os

sprints = [
    {
        'name': 'Sprint 1 - Introduction to MongoDB',
        'tasks': [
            {
                'title': 'Task 101 — Show Collections',
                'objective': 'Understand how to view collections in a database.',
                'problem': 'In SQL, you would list all tables. In MongoDB, data is stored in collections (which are like tables). List all collections in the current database.',
                'sql_equiv': 'SHOW TABLES;',
                'solution': 'show collections',
                'system_query': 'db.getCollectionNames()',
                'expected': 'Returns an array of collection names.',
                'hints': 'Type `show collections` directly in the mongo shell.',
                'mistakes': 'Trying to use the SQL SHOW TABLES command.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            },
            {
                'title': 'Task 102 — Create a Collection',
                'objective': 'Understand how to explicitly create a collection.',
                'problem': 'While MongoDB creates collections automatically when you insert data, you can also create them explicitly. Create a collection named `categories`.',
                'sql_equiv': 'CREATE TABLE categories (id INT PRIMARY KEY, name VARCHAR(255));',
                'solution': 'db.createCollection("categories")',
                'system_query': 'db.getCollectionNames()',
                'expected': 'The `categories` collection is now present in the list of collections.',
                'hints': 'Use db.createCollection("name").',
                'mistakes': 'Using CREATE TABLE instead of the MongoDB method.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'SCHEMA'
            }
        ]
    },
    {
        'name': 'Sprint 2 - Insert Documents',
        'tasks': [
            {
                'title': 'Task 201 — Insert One User',
                'objective': 'Learn how to insert a single document using insertOne.',
                'problem': 'Insert a single document into the `users` collection for Alice with the name "Alice" and email "alice@gmail.com".',
                'sql_equiv': 'INSERT INTO users (name, email) VALUES (\'Alice\', \'alice@gmail.com\');',
                'solution': 'db.users.insertOne({ name: "Alice", email: "alice@gmail.com" })',
                'system_query': 'db.users.find({ name: "Alice" })',
                'expected': 'Returns the document for Alice.',
                'hints': 'Use db.users.insertOne(). Pass a JSON/BSON object.',
                'mistakes': 'Using standard SQL INSERT syntax.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            },
            {
                'title': 'Task 202 — Insert Multiple Users',
                'objective': 'Learn how to insert multiple documents using insertMany.',
                'problem': 'Insert two users into the `users` collection: Bob (bob@gmail.com) and Charlie (charlie@gmail.com).',
                'sql_equiv': 'INSERT INTO users (name, email) VALUES (\'Bob\', \'bob@gmail.com\'), (\'Charlie\', \'charlie@gmail.com\');',
                'solution': 'db.users.insertMany([\n  { name: "Bob", email: "bob@gmail.com" },\n  { name: "Charlie", email: "charlie@gmail.com" }\n])',
                'system_query': 'db.users.find({ name: { $in: ["Bob", "Charlie"] } }).sort({name: 1})',
                'expected': 'Returns the documents for Bob and Charlie.',
                'hints': 'Use db.users.insertMany(). Pass an array of objects [{}, {}].',
                'mistakes': 'Passing a single object instead of an array of objects.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            },
            {
                'title': 'Task 203 — Insert Todos',
                'objective': 'Insert documents with varying schema structures.',
                'problem': 'Insert two todos into the `todos` collection. The first is for "Setup MongoDB" with a priority of 1 and status "completed". The second is "Learn Aggregation" with priority 2, status "pending", and a `due_date` field (just use a string "2026-12-31" for now).',
                'sql_equiv': 'INSERT INTO todos (title, priority, status, due_date) VALUES (\'Setup MongoDB\', 1, \'completed\', NULL), (\'Learn Aggregation\', 2, \'pending\', \'2026-12-31\');',
                'solution': 'db.todos.insertMany([\n  { title: "Setup MongoDB", priority: 1, status: "completed" },\n  { title: "Learn Aggregation", priority: 2, status: "pending", due_date: "2026-12-31" }\n])',
                'system_query': 'db.todos.find().sort({priority: 1})',
                'expected': 'Returns both inserted todos.',
                'hints': 'MongoDB has a flexible schema, so you don\'t need to pass due_date for the first document if it doesn\'t exist.',
                'mistakes': 'Trying to set due_date to NULL instead of just omitting it entirely.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            }
        ]
    },
    {
        'name': 'Sprint 3 - Reading Documents',
        'tasks': [
            {
                'title': 'Task 301 — Fetch All Users',
                'objective': 'Read all documents in a collection.',
                'problem': 'Retrieve all documents from the `users` collection.',
                'sql_equiv': 'SELECT * FROM users;',
                'solution': 'db.users.find({})',
                'system_query': 'db.users.find({})',
                'expected': 'Returns all users in the collection.',
                'hints': 'Use db.collection.find({}). An empty object matches everything.',
                'mistakes': 'Omitting the empty braces `find()` might work in compass, but it is best practice to pass `{}`.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 302 — Projection (Selecting Specific Fields)',
                'objective': 'Return only specific fields (like specific SQL columns).',
                'problem': 'Retrieve all users, but only show their `name` and `email`. Hide the `_id` field.',
                'sql_equiv': 'SELECT name, email FROM users;',
                'solution': 'db.users.find({}, { name: 1, email: 1, _id: 0 })',
                'system_query': 'db.users.find({}, { name: 1, email: 1, _id: 0 })',
                'expected': 'Returns all users, but only includes the name and email fields.',
                'hints': 'The second argument to find() is the projection object. Use 1 to include, 0 to exclude.',
                'mistakes': 'Forgetting to explicitly exclude `_id: 0`, since MongoDB includes it by default.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 303 — Find Distinct Statuses',
                'objective': 'Use distinct() to find unique values.',
                'problem': 'Retrieve a list of all unique `status` values from the `todos` collection.',
                'sql_equiv': 'SELECT DISTINCT status FROM todos;',
                'solution': 'db.todos.distinct("status")',
                'system_query': 'db.todos.distinct("status")',
                'expected': 'Returns an array like ["completed", "pending"].',
                'hints': 'Use db.collection.distinct("fieldName").',
                'mistakes': 'Using find() instead of distinct().',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 304 — Limit Results',
                'objective': 'Limit the number of returned documents.',
                'problem': 'Retrieve only the first user from the `users` collection.',
                'sql_equiv': 'SELECT * FROM users LIMIT 1;',
                'solution': 'db.users.find({}).limit(1)',
                'system_query': 'db.users.find({}).limit(1)',
                'expected': 'Returns exactly one user document.',
                'hints': 'Chain .limit(1) after find().',
                'mistakes': 'Passing the limit inside the find() object.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 305 — Sort Results',
                'objective': 'Sort the returned documents.',
                'problem': 'Retrieve all todos, sorted by `priority` in descending order.',
                'sql_equiv': 'SELECT * FROM todos ORDER BY priority DESC;',
                'solution': 'db.todos.find({}).sort({ priority: -1 })',
                'system_query': 'db.todos.find({}).sort({ priority: -1 })',
                'expected': 'Returns todos with highest priority first.',
                'hints': 'Chain .sort({ field: -1 }) after find(). 1 is ascending, -1 is descending.',
                'mistakes': 'Using DESC instead of -1.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            }
        ]
    },
    {
        'name': 'Sprint 4 - Filtering',
        'tasks': [
            {
                'title': 'Task 401 — Equality Match',
                'objective': 'Filter documents by exact match.',
                'problem': 'Find all todos where the `status` is exactly "pending".',
                'sql_equiv': 'SELECT * FROM todos WHERE status = \'pending\';',
                'solution': 'db.todos.find({ status: "pending" })',
                'system_query': 'db.todos.find({ status: "pending" })',
                'expected': 'Returns all pending todos.',
                'hints': 'Pass `{ field: "value" }` into the find() method.',
                'mistakes': 'Using $eq unnecessarily when a simple key-value pair works.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 402 — Greater Than ($gt)',
                'objective': 'Filter using the greater than operator.',
                'problem': 'Find all todos with a `priority` strictly greater than 1.',
                'sql_equiv': 'SELECT * FROM todos WHERE priority > 1;',
                'solution': 'db.todos.find({ priority: { $gt: 1 } })',
                'system_query': 'db.todos.find({ priority: { $gt: 1 } })',
                'expected': 'Returns todos matching the condition.',
                'hints': 'Use the $gt operator inside the field object.',
                'mistakes': 'Using standard > operator symbol.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 403 — Less Than or Equal ($lte)',
                'objective': 'Filter using the less than or equal operator.',
                'problem': 'Find all todos with a `priority` less than or equal to 2.',
                'sql_equiv': 'SELECT * FROM todos WHERE priority <= 2;',
                'solution': 'db.todos.find({ priority: { $lte: 2 } })',
                'system_query': 'db.todos.find({ priority: { $lte: 2 } })',
                'expected': 'Returns todos matching the condition.',
                'hints': 'Use the $lte operator.',
                'mistakes': 'Using <= symbol.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 404 — Not Equal ($ne)',
                'objective': 'Filter using the not equal operator.',
                'problem': 'Find all todos where the `status` is NOT "completed".',
                'sql_equiv': 'SELECT * FROM todos WHERE status != \'completed\';',
                'solution': 'db.todos.find({ status: { $ne: "completed" } })',
                'system_query': 'db.todos.find({ status: { $ne: "completed" } })',
                'expected': 'Returns todos matching the condition.',
                'hints': 'Use the $ne operator.',
                'mistakes': 'Using != or <> symbols.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 405 — IN Operator ($in)',
                'objective': 'Filter documents against an array of valid values.',
                'problem': 'Find all users whose `name` is either "Alice" or "Bob".',
                'sql_equiv': 'SELECT * FROM users WHERE name IN (\'Alice\', \'Bob\');',
                'solution': 'db.users.find({ name: { $in: ["Alice", "Bob"] } })',
                'system_query': 'db.users.find({ name: { $in: ["Alice", "Bob"] } }).sort({name: 1})',
                'expected': 'Returns documents for Alice and Bob.',
                'hints': 'Use the $in operator and pass an array of acceptable values.',
                'mistakes': 'Forgetting the array brackets around the values.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 406 — Exists Operator ($exists)',
                'objective': 'Check for the existence of a field.',
                'problem': 'Find all todos that have a `due_date` field defined, regardless of its value.',
                'sql_equiv': 'SELECT * FROM todos WHERE due_date IS NOT NULL;',
                'solution': 'db.todos.find({ due_date: { $exists: true } })',
                'system_query': 'db.todos.find({ due_date: { $exists: true } })',
                'expected': 'Returns only todos that possess a due_date field.',
                'hints': 'MongoDB lets documents have completely different shapes. Use $exists: true.',
                'mistakes': 'Checking for != null instead of $exists.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 407 — Regular Expressions ($regex)',
                'objective': 'Perform pattern matching.',
                'problem': 'Find all users whose email ends with "gmail.com".',
                'sql_equiv': 'SELECT * FROM users WHERE email LIKE \'%gmail.com\';',
                'solution': 'db.users.find({ email: { $regex: /gmail\\.com$/ } })',
                'system_query': 'db.users.find({ email: { $regex: /gmail\\.com$/ } })',
                'expected': 'Returns users matching the regex.',
                'hints': 'Use the $regex operator with a JavaScript regular expression.',
                'mistakes': 'Using SQL % wildcards inside the MongoDB string.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            }
        ]
    },
    {
        'name': 'Sprint 5 - Updating Documents',
        'tasks': [
            {
                'title': 'Task 501 — Update One Document',
                'objective': 'Modify a single existing document.',
                'problem': 'Update Alice\'s email in the `users` collection to "alice_new@gmail.com".',
                'sql_equiv': 'UPDATE users SET email = \'alice_new@gmail.com\' WHERE name = \'Alice\';',
                'solution': 'db.users.updateOne({ name: "Alice" }, { $set: { email: "alice_new@gmail.com" } })',
                'system_query': 'db.users.find({ name: "Alice" })',
                'expected': 'Alice\'s document reflects the new email address.',
                'hints': 'Use db.users.updateOne(filter, update). You MUST use the $set operator.',
                'mistakes': 'Forgetting the $set operator, which would traditionally replace the ENTIRE document (though updateOne prevents this without explicit operators).',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            },
            {
                'title': 'Task 502 — Update Multiple Documents',
                'objective': 'Modify multiple documents matching a criteria.',
                'problem': 'Set the `status` of all todos to "completed" if their `priority` is 1.',
                'sql_equiv': 'UPDATE todos SET status = \'completed\' WHERE priority = 1;',
                'solution': 'db.todos.updateMany({ priority: 1 }, { $set: { status: "completed" } })',
                'system_query': 'db.todos.find({ priority: 1 })',
                'expected': 'All priority 1 tasks are now marked completed.',
                'hints': 'Use db.todos.updateMany().',
                'mistakes': 'Using updateOne instead of updateMany.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            },
            {
                'title': 'Task 503 — Increment a Number ($inc)',
                'objective': 'Use the increment operator to increase a numeric value.',
                'problem': 'Increase the `priority` of all pending todos by 1.',
                'sql_equiv': 'UPDATE todos SET priority = priority + 1 WHERE status = \'pending\';',
                'solution': 'db.todos.updateMany({ status: "pending" }, { $inc: { priority: 1 } })',
                'system_query': 'db.todos.find({ status: "pending" })',
                'expected': 'Pending tasks have their priority incremented by 1.',
                'hints': 'Use the $inc operator.',
                'mistakes': 'Using $set and trying to reference the existing value dynamically (which requires an aggregation pipeline in updates). $inc is the correct way.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            },
            {
                'title': 'Task 504 — Unset a Field ($unset)',
                'objective': 'Remove a field entirely from a document.',
                'problem': 'Remove the `due_date` field entirely from all todos.',
                'sql_equiv': 'ALTER TABLE todos DROP COLUMN due_date; (Sort of - MongoDB does this per document)',
                'solution': 'db.todos.updateMany({}, { $unset: { due_date: "" } })',
                'system_query': 'db.todos.find({ due_date: { $exists: true } })',
                'expected': 'Returns no documents, as the field is gone from all.',
                'hints': 'Use the $unset operator. The value you set it to (like "") doesn\'t matter, MongoDB just removes the key.',
                'mistakes': 'Using $set: { due_date: null } instead of $unset.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            },
            {
                'title': 'Task 505 — Rename a Field ($rename)',
                'objective': 'Rename a field key within documents.',
                'problem': 'Rename the `title` field to `task_name` for all documents in the `todos` collection.',
                'sql_equiv': 'ALTER TABLE todos RENAME COLUMN title TO task_name;',
                'solution': 'db.todos.updateMany({}, { $rename: { "title": "task_name" } })',
                'system_query': 'db.todos.find({ title: { $exists: true } })',
                'expected': 'No documents should have the old "title" field.',
                'hints': 'Use the $rename operator.',
                'mistakes': 'Trying to create a new field and unset the old one in two operations.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            },
            {
                'title': 'Task 506 — Replace a Document Entirely',
                'objective': 'Use replaceOne to overwrite the entire document.',
                'problem': 'Replace Bob\'s entire document in the `users` collection with a new document that ONLY contains `{ name: "Robert" }` (losing his email).',
                'sql_equiv': 'DELETE and INSERT ... (No direct standard SQL single command for entire overwrite without specifying all columns)',
                'solution': 'db.users.replaceOne({ name: "Bob" }, { name: "Robert" })',
                'system_query': 'db.users.find({ name: { $in: ["Bob", "Robert"] } })',
                'expected': 'Only Robert exists, and he lacks an email field.',
                'hints': 'Use replaceOne(). Do NOT use $set inside a replaceOne.',
                'mistakes': 'Using $set inside replaceOne (which is invalid).',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            }
        ]
    },
    {
        'name': 'Sprint 6 - Deleting Documents',
        'tasks': [
            {
                'title': 'Task 601 — Delete One Document',
                'objective': 'Remove a single document.',
                'problem': 'Delete Charlie from the `users` collection.',
                'sql_equiv': 'DELETE FROM users WHERE name = \'Charlie\' LIMIT 1;',
                'solution': 'db.users.deleteOne({ name: "Charlie" })',
                'system_query': 'db.users.find({ name: "Charlie" })',
                'expected': 'Returns no documents.',
                'hints': 'Use db.users.deleteOne().',
                'mistakes': 'Using SQL DELETE syntax.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            },
            {
                'title': 'Task 602 — Delete Multiple Documents',
                'objective': 'Remove all matching documents.',
                'problem': 'Delete all todos where the `status` is "completed".',
                'sql_equiv': 'DELETE FROM todos WHERE status = \'completed\';',
                'solution': 'db.todos.deleteMany({ status: "completed" })',
                'system_query': 'db.todos.find({ status: "completed" })',
                'expected': 'Returns no documents.',
                'hints': 'Use db.todos.deleteMany().',
                'mistakes': 'Using deleteOne which leaves other completed tasks.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'DATABASE_STATE'
            }
        ]
    },
    {
        'name': 'Sprint 7 - Aggregation Framework',
        'tasks': [
            {
                'title': 'Task 701 — Count Documents',
                'objective': 'Get the total count of documents.',
                'problem': 'Count the total number of users in the `users` collection.',
                'sql_equiv': 'SELECT COUNT(*) FROM users;',
                'solution': 'db.users.countDocuments({})',
                'system_query': 'db.users.countDocuments({})',
                'expected': 'Returns a number representing the count.',
                'hints': 'Use db.users.countDocuments({}).',
                'mistakes': 'Using deprecated .count().',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 702 — Group By and Count ($group)',
                'objective': 'Use the aggregation pipeline to group data.',
                'problem': 'Count the number of todos per `status` using the aggregation framework.',
                'sql_equiv': 'SELECT status, COUNT(*) FROM todos GROUP BY status;',
                'solution': 'db.todos.aggregate([\n  { $group: { _id: "$status", total: { $sum: 1 } } }\n])',
                'system_query': 'db.todos.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }])',
                'expected': 'Returns documents with _id as the status and total as the count.',
                'hints': 'The aggregate function takes an array of pipeline stages. Use the $group stage, mapping _id to "$status".',
                'mistakes': 'Forgetting the $ prefix when referencing a field path (e.g. "$status").',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 703 — Average ($avg) and Sum ($sum)',
                'objective': 'Perform math over grouped fields.',
                'problem': 'Calculate the average priority and the total sum of priority for all todos.',
                'sql_equiv': 'SELECT AVG(priority), SUM(priority) FROM todos;',
                'solution': 'db.todos.aggregate([\n  { $group: { _id: null, avgPriority: { $avg: "$priority" }, sumPriority: { $sum: "$priority" } } }\n])',
                'system_query': 'db.todos.aggregate([{ $group: { _id: null, avgPriority: { $avg: "$priority" }, sumPriority: { $sum: "$priority" } } }])',
                'expected': 'Returns a single document with the calculated average and sum.',
                'hints': 'To group everything together, use `_id: null`.',
                'mistakes': 'Grouping by "$priority" instead of null.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 704 — Min and Max',
                'objective': 'Find minimum and maximum values in a group.',
                'problem': 'Find the minimum and maximum priority values among all pending tasks. Hint: Use $match then $group.',
                'sql_equiv': 'SELECT MIN(priority), MAX(priority) FROM todos WHERE status = \'pending\';',
                'solution': 'db.todos.aggregate([\n  { $match: { status: "pending" } },\n  { $group: { _id: null, minPri: { $min: "$priority" }, maxPri: { $max: "$priority" } } }\n])',
                'system_query': 'db.todos.aggregate([{ $match: { status: "pending" } }, { $group: { _id: null, minPri: { $min: "$priority" }, maxPri: { $max: "$priority" } } }])',
                'expected': 'Returns the min and max priority for pending tasks.',
                'hints': 'The first stage is $match to filter, the second is $group to calculate.',
                'mistakes': 'Putting the filter inside the $group stage.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 705 — Sorting and Limiting in Aggregation',
                'objective': 'Chain $sort and $limit stages.',
                'problem': 'Use aggregation to find the 3 tasks with the highest priority.',
                'sql_equiv': 'SELECT * FROM todos ORDER BY priority DESC LIMIT 3;',
                'solution': 'db.todos.aggregate([\n  { $sort: { priority: -1 } },\n  { $limit: 3 }\n])',
                'system_query': 'db.todos.aggregate([{ $sort: { priority: -1 } }, { $limit: 3 }])',
                'expected': 'Returns the top 3 highest priority tasks.',
                'hints': 'Use $sort stage, then $limit stage.',
                'mistakes': 'Placing $limit before $sort, yielding incorrect results.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            }
        ]
    },
    {
        'name': 'Sprint 8 - Relationships',
        'tasks': [
            {
                'title': 'Task 801 — The $lookup Stage (JOIN)',
                'objective': 'Join two collections together.',
                'problem': 'We need a list of todos along with the full details of the user who created them. (Assume todos have a `user_id` field that matches the `_id` of a user).',
                'sql_equiv': 'SELECT * FROM todos JOIN users ON todos.user_id = users.id;',
                'solution': 'db.todos.aggregate([\n  {\n    $lookup: {\n      from: "users",\n      localField: "user_id",\n      foreignField: "_id",\n      as: "user_details"\n    }\n  }\n])',
                'system_query': 'db.todos.aggregate([{ $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user_details" } }])',
                'expected': 'Returns todos, with a new array field `user_details` containing the joined user.',
                'hints': 'Use the $lookup stage with `from`, `localField`, `foreignField`, and `as`.',
                'mistakes': 'Forgetting that $lookup produces an ARRAY in the `as` field, not a single object.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            }
        ]
    },
    {
        'name': 'Sprint 9 - Indexes',
        'tasks': [
            {
                'title': 'Task 901 — Create an Index',
                'objective': 'Create indexes to optimize queries.',
                'problem': 'Create an index on the `status` field of the `todos` collection to speed up filtering.',
                'sql_equiv': 'CREATE INDEX idx_status ON todos(status);',
                'solution': 'db.todos.createIndex({ status: 1 })',
                'system_query': 'db.todos.getIndexes()',
                'expected': 'The index list now includes an index for the `status` key.',
                'hints': 'Use db.collection.createIndex({ field: 1 }) where 1 means ascending.',
                'mistakes': 'Passing a string instead of an object.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'INDEX'
            },
            {
                'title': 'Task 902 — View Existing Indexes',
                'objective': 'View all indexes on a collection.',
                'problem': 'Check all the indexes currently present on the `todos` collection.',
                'sql_equiv': 'SHOW INDEX FROM todos;',
                'solution': 'db.todos.getIndexes()',
                'system_query': 'db.todos.getIndexes()',
                'expected': 'Returns an array of index definitions (always including the default _id index).',
                'hints': 'Use getIndexes().',
                'mistakes': 'Trying to query a system collection directly.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'RESULT_SET'
            },
            {
                'title': 'Task 903 — Drop an Index',
                'objective': 'Remove an existing index.',
                'problem': 'Drop the index you just created on the `status` field of the `todos` collection.',
                'sql_equiv': 'DROP INDEX idx_status ON todos;',
                'solution': 'db.todos.dropIndex({ status: 1 })',
                'system_query': 'db.todos.getIndexes()',
                'expected': 'The index for `status` is removed.',
                'hints': 'You can pass the same object you used to create it: { status: 1 }.',
                'mistakes': 'Trying to drop it by a guessed string name without knowing it.',
                'scoring': '50 pts | Logic Grader',
                'eval_type': 'INDEX'
            }
        ]
    }
]

header = """# 🍃 MongoDB Learning Lab — Interactive Curriculum

Curriculum, Sprint Structure & Planning Document for the MongoDB Lab.

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

print('Done writing notion_mongodb_sprints.md')

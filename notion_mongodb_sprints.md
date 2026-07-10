# 🍃 MongoDB Learning Lab — Interactive Curriculum

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

## Sprint 1 - Introduction to MongoDB

### Task 101 — Show Collections

**Learning Objective**
Understand how to view collections in a database.

**Problem Statement**
In SQL, you would list all tables. In MongoDB, data is stored in collections (which are like tables). List all collections in the current database.

### SQL Equivalent
```sql
SHOW TABLES;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
show collections
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.getCollectionNames()
```

**Expected Verification Result**
(The output of the verification query)
Returns an array of collection names.

**Hints**
Type `show collections` directly in the mongo shell.

**Common Mistakes**
Trying to use the SQL SHOW TABLES command.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 102 — Create a Collection

**Learning Objective**
Understand how to explicitly create a collection.

**Problem Statement**
While MongoDB creates collections automatically when you insert data, you can also create them explicitly. Create a collection named `categories`.

### SQL Equivalent
```sql
CREATE TABLE categories (id INT PRIMARY KEY, name VARCHAR(255));
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.createCollection("categories")
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.getCollectionNames()
```

**Expected Verification Result**
(The output of the verification query)
The `categories` collection is now present in the list of collections.

**Hints**
Use db.createCollection("name").

**Common Mistakes**
Using CREATE TABLE instead of the MongoDB method.

**Evaluation Type**
SCHEMA

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 2 - Insert Documents

### Task 201 — Insert One User

**Learning Objective**
Learn how to insert a single document using insertOne.

**Problem Statement**
Insert a single document into the `users` collection for Alice with the name "Alice" and email "alice@gmail.com".

### SQL Equivalent
```sql
INSERT INTO users (name, email) VALUES ('Alice', 'alice@gmail.com');
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.insertOne({ name: "Alice", email: "alice@gmail.com" })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.find({ name: "Alice" })
```

**Expected Verification Result**
(The output of the verification query)
Returns the document for Alice.

**Hints**
Use db.users.insertOne(). Pass a JSON/BSON object.

**Common Mistakes**
Using standard SQL INSERT syntax.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 202 — Insert Multiple Users

**Learning Objective**
Learn how to insert multiple documents using insertMany.

**Problem Statement**
Insert two users into the `users` collection: Bob (bob@gmail.com) and Charlie (charlie@gmail.com).

### SQL Equivalent
```sql
INSERT INTO users (name, email) VALUES ('Bob', 'bob@gmail.com'), ('Charlie', 'charlie@gmail.com');
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.insertMany([
  { name: "Bob", email: "bob@gmail.com" },
  { name: "Charlie", email: "charlie@gmail.com" }
])
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.find({ name: { $in: ["Bob", "Charlie"] } }).sort({name: 1})
```

**Expected Verification Result**
(The output of the verification query)
Returns the documents for Bob and Charlie.

**Hints**
Use db.users.insertMany(). Pass an array of objects [{}, {}].

**Common Mistakes**
Passing a single object instead of an array of objects.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 203 — Insert Todos

**Learning Objective**
Insert documents with varying schema structures.

**Problem Statement**
Insert two todos into the `todos` collection. The first is for "Setup MongoDB" with a priority of 1 and status "completed". The second is "Learn Aggregation" with priority 2, status "pending", and a `due_date` field (just use a string "2026-12-31" for now).

### SQL Equivalent
```sql
INSERT INTO todos (title, priority, status, due_date) VALUES ('Setup MongoDB', 1, 'completed', NULL), ('Learn Aggregation', 2, 'pending', '2026-12-31');
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.insertMany([
  { title: "Setup MongoDB", priority: 1, status: "completed" },
  { title: "Learn Aggregation", priority: 2, status: "pending", due_date: "2026-12-31" }
])
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find().sort({priority: 1})
```

**Expected Verification Result**
(The output of the verification query)
Returns both inserted todos.

**Hints**
MongoDB has a flexible schema, so you don't need to pass due_date for the first document if it doesn't exist.

**Common Mistakes**
Trying to set due_date to NULL instead of just omitting it entirely.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 3 - Reading Documents

### Task 301 — Fetch All Users

**Learning Objective**
Read all documents in a collection.

**Problem Statement**
Retrieve all documents from the `users` collection.

### SQL Equivalent
```sql
SELECT * FROM users;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.find({})
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.find({})
```

**Expected Verification Result**
(The output of the verification query)
Returns all users in the collection.

**Hints**
Use db.collection.find({}). An empty object matches everything.

**Common Mistakes**
Omitting the empty braces `find()` might work in compass, but it is best practice to pass `{}`.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 302 — Projection (Selecting Specific Fields)

**Learning Objective**
Return only specific fields (like specific SQL columns).

**Problem Statement**
Retrieve all users, but only show their `name` and `email`. Hide the `_id` field.

### SQL Equivalent
```sql
SELECT name, email FROM users;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.find({}, { name: 1, email: 1, _id: 0 })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.find({}, { name: 1, email: 1, _id: 0 })
```

**Expected Verification Result**
(The output of the verification query)
Returns all users, but only includes the name and email fields.

**Hints**
The second argument to find() is the projection object. Use 1 to include, 0 to exclude.

**Common Mistakes**
Forgetting to explicitly exclude `_id: 0`, since MongoDB includes it by default.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 303 — Find Distinct Statuses

**Learning Objective**
Use distinct() to find unique values.

**Problem Statement**
Retrieve a list of all unique `status` values from the `todos` collection.

### SQL Equivalent
```sql
SELECT DISTINCT status FROM todos;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.distinct("status")
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.distinct("status")
```

**Expected Verification Result**
(The output of the verification query)
Returns an array like ["completed", "pending"].

**Hints**
Use db.collection.distinct("fieldName").

**Common Mistakes**
Using find() instead of distinct().

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 304 — Limit Results

**Learning Objective**
Limit the number of returned documents.

**Problem Statement**
Retrieve only the first user from the `users` collection.

### SQL Equivalent
```sql
SELECT * FROM users LIMIT 1;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.find({}).limit(1)
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.find({}).limit(1)
```

**Expected Verification Result**
(The output of the verification query)
Returns exactly one user document.

**Hints**
Chain .limit(1) after find().

**Common Mistakes**
Passing the limit inside the find() object.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 305 — Sort Results

**Learning Objective**
Sort the returned documents.

**Problem Statement**
Retrieve all todos, sorted by `priority` in descending order.

### SQL Equivalent
```sql
SELECT * FROM todos ORDER BY priority DESC;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.find({}).sort({ priority: -1 })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({}).sort({ priority: -1 })
```

**Expected Verification Result**
(The output of the verification query)
Returns todos with highest priority first.

**Hints**
Chain .sort({ field: -1 }) after find(). 1 is ascending, -1 is descending.

**Common Mistakes**
Using DESC instead of -1.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 4 - Filtering

### Task 401 — Equality Match

**Learning Objective**
Filter documents by exact match.

**Problem Statement**
Find all todos where the `status` is exactly "pending".

### SQL Equivalent
```sql
SELECT * FROM todos WHERE status = 'pending';
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.find({ status: "pending" })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({ status: "pending" })
```

**Expected Verification Result**
(The output of the verification query)
Returns all pending todos.

**Hints**
Pass `{ field: "value" }` into the find() method.

**Common Mistakes**
Using $eq unnecessarily when a simple key-value pair works.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 402 — Greater Than ($gt)

**Learning Objective**
Filter using the greater than operator.

**Problem Statement**
Find all todos with a `priority` strictly greater than 1.

### SQL Equivalent
```sql
SELECT * FROM todos WHERE priority > 1;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.find({ priority: { $gt: 1 } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({ priority: { $gt: 1 } })
```

**Expected Verification Result**
(The output of the verification query)
Returns todos matching the condition.

**Hints**
Use the $gt operator inside the field object.

**Common Mistakes**
Using standard > operator symbol.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 403 — Less Than or Equal ($lte)

**Learning Objective**
Filter using the less than or equal operator.

**Problem Statement**
Find all todos with a `priority` less than or equal to 2.

### SQL Equivalent
```sql
SELECT * FROM todos WHERE priority <= 2;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.find({ priority: { $lte: 2 } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({ priority: { $lte: 2 } })
```

**Expected Verification Result**
(The output of the verification query)
Returns todos matching the condition.

**Hints**
Use the $lte operator.

**Common Mistakes**
Using <= symbol.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 404 — Not Equal ($ne)

**Learning Objective**
Filter using the not equal operator.

**Problem Statement**
Find all todos where the `status` is NOT "completed".

### SQL Equivalent
```sql
SELECT * FROM todos WHERE status != 'completed';
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.find({ status: { $ne: "completed" } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({ status: { $ne: "completed" } })
```

**Expected Verification Result**
(The output of the verification query)
Returns todos matching the condition.

**Hints**
Use the $ne operator.

**Common Mistakes**
Using != or <> symbols.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 405 — IN Operator ($in)

**Learning Objective**
Filter documents against an array of valid values.

**Problem Statement**
Find all users whose `name` is either "Alice" or "Bob".

### SQL Equivalent
```sql
SELECT * FROM users WHERE name IN ('Alice', 'Bob');
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.find({ name: { $in: ["Alice", "Bob"] } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.find({ name: { $in: ["Alice", "Bob"] } }).sort({name: 1})
```

**Expected Verification Result**
(The output of the verification query)
Returns documents for Alice and Bob.

**Hints**
Use the $in operator and pass an array of acceptable values.

**Common Mistakes**
Forgetting the array brackets around the values.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 406 — Exists Operator ($exists)

**Learning Objective**
Check for the existence of a field.

**Problem Statement**
Find all todos that have a `due_date` field defined, regardless of its value.

### SQL Equivalent
```sql
SELECT * FROM todos WHERE due_date IS NOT NULL;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.find({ due_date: { $exists: true } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({ due_date: { $exists: true } })
```

**Expected Verification Result**
(The output of the verification query)
Returns only todos that possess a due_date field.

**Hints**
MongoDB lets documents have completely different shapes. Use $exists: true.

**Common Mistakes**
Checking for != null instead of $exists.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 407 — Regular Expressions ($regex)

**Learning Objective**
Perform pattern matching.

**Problem Statement**
Find all users whose email ends with "gmail.com".

### SQL Equivalent
```sql
SELECT * FROM users WHERE email LIKE '%gmail.com';
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.find({ email: { $regex: /gmail\.com$/ } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.find({ email: { $regex: /gmail\.com$/ } })
```

**Expected Verification Result**
(The output of the verification query)
Returns users matching the regex.

**Hints**
Use the $regex operator with a JavaScript regular expression.

**Common Mistakes**
Using SQL % wildcards inside the MongoDB string.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 5 - Updating Documents

### Task 501 — Update One Document

**Learning Objective**
Modify a single existing document.

**Problem Statement**
Update Alice's email in the `users` collection to "alice_new@gmail.com".

### SQL Equivalent
```sql
UPDATE users SET email = 'alice_new@gmail.com' WHERE name = 'Alice';
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.updateOne({ name: "Alice" }, { $set: { email: "alice_new@gmail.com" } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.find({ name: "Alice" })
```

**Expected Verification Result**
(The output of the verification query)
Alice's document reflects the new email address.

**Hints**
Use db.users.updateOne(filter, update). You MUST use the $set operator.

**Common Mistakes**
Forgetting the $set operator, which would traditionally replace the ENTIRE document (though updateOne prevents this without explicit operators).

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 502 — Update Multiple Documents

**Learning Objective**
Modify multiple documents matching a criteria.

**Problem Statement**
Set the `status` of all todos to "completed" if their `priority` is 1.

### SQL Equivalent
```sql
UPDATE todos SET status = 'completed' WHERE priority = 1;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.updateMany({ priority: 1 }, { $set: { status: "completed" } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({ priority: 1 })
```

**Expected Verification Result**
(The output of the verification query)
All priority 1 tasks are now marked completed.

**Hints**
Use db.todos.updateMany().

**Common Mistakes**
Using updateOne instead of updateMany.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 503 — Increment a Number ($inc)

**Learning Objective**
Use the increment operator to increase a numeric value.

**Problem Statement**
Increase the `priority` of all pending todos by 1.

### SQL Equivalent
```sql
UPDATE todos SET priority = priority + 1 WHERE status = 'pending';
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.updateMany({ status: "pending" }, { $inc: { priority: 1 } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({ status: "pending" })
```

**Expected Verification Result**
(The output of the verification query)
Pending tasks have their priority incremented by 1.

**Hints**
Use the $inc operator.

**Common Mistakes**
Using $set and trying to reference the existing value dynamically (which requires an aggregation pipeline in updates). $inc is the correct way.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 504 — Unset a Field ($unset)

**Learning Objective**
Remove a field entirely from a document.

**Problem Statement**
Remove the `due_date` field entirely from all todos.

### SQL Equivalent
```sql
ALTER TABLE todos DROP COLUMN due_date; (Sort of - MongoDB does this per document)
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.updateMany({}, { $unset: { due_date: "" } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({ due_date: { $exists: true } })
```

**Expected Verification Result**
(The output of the verification query)
Returns no documents, as the field is gone from all.

**Hints**
Use the $unset operator. The value you set it to (like "") doesn't matter, MongoDB just removes the key.

**Common Mistakes**
Using $set: { due_date: null } instead of $unset.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 505 — Rename a Field ($rename)

**Learning Objective**
Rename a field key within documents.

**Problem Statement**
Rename the `title` field to `task_name` for all documents in the `todos` collection.

### SQL Equivalent
```sql
ALTER TABLE todos RENAME COLUMN title TO task_name;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.updateMany({}, { $rename: { "title": "task_name" } })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({ title: { $exists: true } })
```

**Expected Verification Result**
(The output of the verification query)
No documents should have the old "title" field.

**Hints**
Use the $rename operator.

**Common Mistakes**
Trying to create a new field and unset the old one in two operations.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 506 — Replace a Document Entirely

**Learning Objective**
Use replaceOne to overwrite the entire document.

**Problem Statement**
Replace Bob's entire document in the `users` collection with a new document that ONLY contains `{ name: "Robert" }` (losing his email).

### SQL Equivalent
```sql
DELETE and INSERT ... (No direct standard SQL single command for entire overwrite without specifying all columns)
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.replaceOne({ name: "Bob" }, { name: "Robert" })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.find({ name: { $in: ["Bob", "Robert"] } })
```

**Expected Verification Result**
(The output of the verification query)
Only Robert exists, and he lacks an email field.

**Hints**
Use replaceOne(). Do NOT use $set inside a replaceOne.

**Common Mistakes**
Using $set inside replaceOne (which is invalid).

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 6 - Deleting Documents

### Task 601 — Delete One Document

**Learning Objective**
Remove a single document.

**Problem Statement**
Delete Charlie from the `users` collection.

### SQL Equivalent
```sql
DELETE FROM users WHERE name = 'Charlie' LIMIT 1;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.deleteOne({ name: "Charlie" })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.find({ name: "Charlie" })
```

**Expected Verification Result**
(The output of the verification query)
Returns no documents.

**Hints**
Use db.users.deleteOne().

**Common Mistakes**
Using SQL DELETE syntax.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 602 — Delete Multiple Documents

**Learning Objective**
Remove all matching documents.

**Problem Statement**
Delete all todos where the `status` is "completed".

### SQL Equivalent
```sql
DELETE FROM todos WHERE status = 'completed';
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.deleteMany({ status: "completed" })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.find({ status: "completed" })
```

**Expected Verification Result**
(The output of the verification query)
Returns no documents.

**Hints**
Use db.todos.deleteMany().

**Common Mistakes**
Using deleteOne which leaves other completed tasks.

**Evaluation Type**
DATABASE_STATE

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 7 - Aggregation Framework

### Task 701 — Count Documents

**Learning Objective**
Get the total count of documents.

**Problem Statement**
Count the total number of users in the `users` collection.

### SQL Equivalent
```sql
SELECT COUNT(*) FROM users;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.users.countDocuments({})
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.users.countDocuments({})
```

**Expected Verification Result**
(The output of the verification query)
Returns a number representing the count.

**Hints**
Use db.users.countDocuments({}).

**Common Mistakes**
Using deprecated .count().

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 702 — Group By and Count ($group)

**Learning Objective**
Use the aggregation pipeline to group data.

**Problem Statement**
Count the number of todos per `status` using the aggregation framework.

### SQL Equivalent
```sql
SELECT status, COUNT(*) FROM todos GROUP BY status;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.aggregate([
  { $group: { _id: "$status", total: { $sum: 1 } } }
])
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }])
```

**Expected Verification Result**
(The output of the verification query)
Returns documents with _id as the status and total as the count.

**Hints**
The aggregate function takes an array of pipeline stages. Use the $group stage, mapping _id to "$status".

**Common Mistakes**
Forgetting the $ prefix when referencing a field path (e.g. "$status").

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 703 — Average ($avg) and Sum ($sum)

**Learning Objective**
Perform math over grouped fields.

**Problem Statement**
Calculate the average priority and the total sum of priority for all todos.

### SQL Equivalent
```sql
SELECT AVG(priority), SUM(priority) FROM todos;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.aggregate([
  { $group: { _id: null, avgPriority: { $avg: "$priority" }, sumPriority: { $sum: "$priority" } } }
])
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.aggregate([{ $group: { _id: null, avgPriority: { $avg: "$priority" }, sumPriority: { $sum: "$priority" } } }])
```

**Expected Verification Result**
(The output of the verification query)
Returns a single document with the calculated average and sum.

**Hints**
To group everything together, use `_id: null`.

**Common Mistakes**
Grouping by "$priority" instead of null.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 704 — Min and Max

**Learning Objective**
Find minimum and maximum values in a group.

**Problem Statement**
Find the minimum and maximum priority values among all pending tasks. Hint: Use $match then $group.

### SQL Equivalent
```sql
SELECT MIN(priority), MAX(priority) FROM todos WHERE status = 'pending';
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.aggregate([
  { $match: { status: "pending" } },
  { $group: { _id: null, minPri: { $min: "$priority" }, maxPri: { $max: "$priority" } } }
])
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.aggregate([{ $match: { status: "pending" } }, { $group: { _id: null, minPri: { $min: "$priority" }, maxPri: { $max: "$priority" } } }])
```

**Expected Verification Result**
(The output of the verification query)
Returns the min and max priority for pending tasks.

**Hints**
The first stage is $match to filter, the second is $group to calculate.

**Common Mistakes**
Putting the filter inside the $group stage.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 705 — Sorting and Limiting in Aggregation

**Learning Objective**
Chain $sort and $limit stages.

**Problem Statement**
Use aggregation to find the 3 tasks with the highest priority.

### SQL Equivalent
```sql
SELECT * FROM todos ORDER BY priority DESC LIMIT 3;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.aggregate([
  { $sort: { priority: -1 } },
  { $limit: 3 }
])
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.aggregate([{ $sort: { priority: -1 } }, { $limit: 3 }])
```

**Expected Verification Result**
(The output of the verification query)
Returns the top 3 highest priority tasks.

**Hints**
Use $sort stage, then $limit stage.

**Common Mistakes**
Placing $limit before $sort, yielding incorrect results.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 8 - Relationships

### Task 801 — The $lookup Stage (JOIN)

**Learning Objective**
Join two collections together.

**Problem Statement**
We need a list of todos along with the full details of the user who created them. (Assume todos have a `user_id` field that matches the `_id` of a user).

### SQL Equivalent
```sql
SELECT * FROM todos JOIN users ON todos.user_id = users.id;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "user_id",
      foreignField: "_id",
      as: "user_details"
    }
  }
])
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.aggregate([{ $lookup: { from: "users", localField: "user_id", foreignField: "_id", as: "user_details" } }])
```

**Expected Verification Result**
(The output of the verification query)
Returns todos, with a new array field `user_details` containing the joined user.

**Hints**
Use the $lookup stage with `from`, `localField`, `foreignField`, and `as`.

**Common Mistakes**
Forgetting that $lookup produces an ARRAY in the `as` field, not a single object.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

## Sprint 9 - Indexes

### Task 901 — Create an Index

**Learning Objective**
Create indexes to optimize queries.

**Problem Statement**
Create an index on the `status` field of the `todos` collection to speed up filtering.

### SQL Equivalent
```sql
CREATE INDEX idx_status ON todos(status);
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.createIndex({ status: 1 })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.getIndexes()
```

**Expected Verification Result**
(The output of the verification query)
The index list now includes an index for the `status` key.

**Hints**
Use db.collection.createIndex({ field: 1 }) where 1 means ascending.

**Common Mistakes**
Passing a string instead of an object.

**Evaluation Type**
INDEX

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 902 — View Existing Indexes

**Learning Objective**
View all indexes on a collection.

**Problem Statement**
Check all the indexes currently present on the `todos` collection.

### SQL Equivalent
```sql
SHOW INDEX FROM todos;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.getIndexes()
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.getIndexes()
```

**Expected Verification Result**
(The output of the verification query)
Returns an array of index definitions (always including the default _id index).

**Hints**
Use getIndexes().

**Common Mistakes**
Trying to query a system collection directly.

**Evaluation Type**
RESULT_SET

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---

### Task 903 — Drop an Index

**Learning Objective**
Remove an existing index.

**Problem Statement**
Drop the index you just created on the `status` field of the `todos` collection.

### SQL Equivalent
```sql
DROP INDEX idx_status ON todos;
```

**Hidden Reference Solution**
(What the student is expected to write)
```javascript
db.todos.dropIndex({ status: 1 })
```

**System Verification Query**
(Query executed by the evaluator after the student's query)
```javascript
db.todos.getIndexes()
```

**Expected Verification Result**
(The output of the verification query)
The index for `status` is removed.

**Hints**
You can pass the same object you used to create it: { status: 1 }.

**Common Mistakes**
Trying to drop it by a guessed string name without knowing it.

**Evaluation Type**
INDEX

**Scoring**
50 pts | Logic Grader

**Evaluation Strategy**
* Execute student's MongoDB query.
* Execute the System Verification Query.
* Compare the returned results.
* Award full points only if the verification output matches the expected output exactly.

---


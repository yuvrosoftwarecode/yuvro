-- Seed Data for SQLite Evaluation Lab

-- Task 1: Query Optimization: Slow Email Lookup
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    name TEXT
);
-- We won't insert 5 million records for the test environment to keep it fast,
-- but the table must exist for the CREATE INDEX to work.
INSERT INTO users (email, name) VALUES ('abc@example.com', 'Test User');

-- Task 2: Inventory Sync: Upserting Records
CREATE TABLE inventory (
    product_id INTEGER PRIMARY KEY,
    quantity INTEGER NOT NULL
);
INSERT INTO inventory (product_id, quantity) VALUES (101, 20);

-- Task 3: Analytics: Extracting JSON Data
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL
);
INSERT INTO events (event_type, payload) VALUES ('page_view', '{"browser": "Chrome", "os": "Mac"}');
INSERT INTO events (event_type, payload) VALUES ('page_view', '{"browser": "Chrome", "os": "Windows"}');
INSERT INTO events (event_type, payload) VALUES ('page_view', '{"browser": "Safari", "os": "Mac"}');

-- Task 4: Reporting: Monthly Signups
CREATE TABLE signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    signup_date TEXT NOT NULL
);
INSERT INTO signups (user_id, signup_date) VALUES (1, '2023-01-15 10:00:00');
INSERT INTO signups (user_id, signup_date) VALUES (2, '2023-01-20 11:30:00');
INSERT INTO signups (user_id, signup_date) VALUES (3, '2023-02-05 09:15:00');

-- Task 5: E-commerce: Running Total of Sales
CREATE TABLE daily_sales (
    sale_date TEXT PRIMARY KEY,
    amount REAL NOT NULL
);
INSERT INTO daily_sales (sale_date, amount) VALUES ('2023-10-01', 100.0);
INSERT INTO daily_sales (sale_date, amount) VALUES ('2023-10-02', 150.0);
INSERT INTO daily_sales (sale_date, amount) VALUES ('2023-10-03', 200.0);

-- Task 6: Search Feature: Implementing FTS5
-- (Candidate will run CREATE VIRTUAL TABLE documents_fts USING fts5(title, content); so no prior table needed)

-- Task 7: Organization Chart: Finding Managers
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    manager_id INTEGER,
    FOREIGN KEY (manager_id) REFERENCES employees(id)
);
INSERT INTO employees (id, name, manager_id) VALUES (1, 'Alice', NULL); -- CEO
INSERT INTO employees (id, name, manager_id) VALUES (5, 'Bob', 1);
INSERT INTO employees (id, name, manager_id) VALUES (10, 'Jane', 5);

-- Task 8: Reporting: Comma-Separated List of Roles
CREATE TABLE user_roles (
    user_id INTEGER,
    role TEXT
);
INSERT INTO user_roles (user_id, role) VALUES (1, 'Admin'), (1, 'Editor'), (2, 'Viewer');

-- Task 9: Subscriptions: Finding Expired Trials
CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    start_date TEXT
);
INSERT INTO subscriptions (id, user_id, start_date) VALUES (1, 101, '2023-10-10'); -- Expired (10-24 < 11-01)
INSERT INTO subscriptions (id, user_id, start_date) VALUES (2, 102, '2023-10-25'); -- Active (11-08 >= 11-01)

-- Task 10: Tags: Flattening JSON Arrays
CREATE TABLE articles (
    id INTEGER PRIMARY KEY,
    title TEXT,
    tags_json TEXT
);
INSERT INTO articles (id, title, tags_json) VALUES (1, 'SQLite Tips', '["sql", "database"]');
INSERT INTO articles (id, title, tags_json) VALUES (2, 'No Tags', '[]');

-- Task 11: Sales: Average of Top 3 Months
CREATE TABLE monthly_revenue (
    month TEXT PRIMARY KEY,
    revenue REAL
);
INSERT INTO monthly_revenue (month, revenue) VALUES ('2023-01', 10000.0), ('2023-02', 15000.0), ('2023-03', 20000.0), ('2023-04', 5000.0);

-- Task 12: Customer Data: Default Values
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT,
    phone TEXT,
    email TEXT
);
INSERT INTO customers (id, name, phone, email) VALUES (1, 'Alice', '555-1234', 'alice@example.com');
INSERT INTO customers (id, name, phone, email) VALUES (2, 'Bob', NULL, 'bob@example.com');
INSERT INTO customers (id, name, phone, email) VALUES (3, 'Charlie', NULL, NULL);

-- Task 13: HR: Employee Bonus Categories
CREATE TABLE employee_performance (
    id INTEGER PRIMARY KEY,
    emp_name TEXT,
    rating INTEGER
);
INSERT INTO employee_performance (id, emp_name, rating) VALUES (1, 'Dave', 95), (2, 'Eve', 80), (3, 'Frank', 60);

-- Task 14: Marketing: Identifying Exclusive Users
CREATE TABLE newsletter_subscribers (email TEXT);
CREATE TABLE premium_users (email TEXT);
INSERT INTO newsletter_subscribers (email) VALUES ('free@example.com'), ('premium@example.com');
INSERT INTO premium_users (email) VALUES ('premium@example.com'), ('pro@example.com');

-- Task 15: Order Statistics: Conditional Aggregation
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    status TEXT,
    amount REAL
);
INSERT INTO orders (id, status, amount) VALUES (1, 'COMPLETED', 100.0), (2, 'COMPLETED', 150.0), (3, 'PENDING', 50.0);

-- Task 14: Dynamic Typing: The TYPEOF Function
CREATE TABLE mixed_data (id INTEGER PRIMARY KEY, val);
INSERT INTO mixed_data (val) VALUES (10), (20), ('hello'), ('world'), ('test');

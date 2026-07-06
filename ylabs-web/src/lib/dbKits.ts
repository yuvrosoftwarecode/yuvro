export type KitName = "java" | "django" | "python" | "sql" | "mongo" | "ui";

export interface Kit {
  name: KitName;
  files: Record<string, string>;
  fileList: string[];
  primary: string;
  rootLabel: string;
  runtime: string;
}

export interface ReviewData {
  well: string[];
  improve: string[];
  practices: string[];
  reference: string;
  alts: { title: string; tag: string; desc: string; perf: string; read: string; loc: string; community?: boolean }[];
  detailedTests: { name: string; input: string; expected: string; time: string }[];
}

/* ==========================================================================
   1. MYSQL LAB (YUVROCART E-COMMERCE) DATA
   ========================================================================== */

const sqlSchemas: Record<string, string> = {
  default: `CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  country VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  signed_up_at DATE NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id),
  total_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATE NOT NULL
);`,

  multiTable: `CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  country VARCHAR(50) NOT NULL,
  signed_up_at DATE NOT NULL
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price NUMERIC(10,2) NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id),
  total_amount NUMERIC(10,2) NOT NULL,
  created_at DATE NOT NULL
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id),
  product_id INT REFERENCES products(id),
  quantity INT NOT NULL,
  price_per_unit NUMERIC(10,2) NOT NULL
);`,

  slowQuery: `CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL
);`,

  denormalized: `CREATE TABLE store_logs (
  log_id SERIAL PRIMARY KEY,
  customer_name VARCHAR(100),
  customer_email VARCHAR(100),
  product_name VARCHAR(100),
  product_category VARCHAR(50),
  product_price NUMERIC(10,2),
  order_quantity INT,
  order_date TIMESTAMP
);`
};

const sqlSeeds: Record<string, string> = {
  default: `INSERT INTO customers (name, email, country, status, signed_up_at) VALUES
  ('Alice Johnson', 'alice@yuvrocart.com', 'USA', 'active', '2024-03-15'),
  ('Bob Smith', 'bob@yuvrocart.com', 'Canada', 'active', '2024-02-10'),
  ('Charlie Brown', 'charlie@yuvrocart.com', 'USA', 'active', '2023-11-20'),
  ('Diana Prince', 'diana@yuvrocart.com', 'USA', 'inactive', '2024-05-01'),
  ('Evan Wright', 'evan@yuvrocart.com', 'UK', 'active', '2024-01-10');

INSERT INTO orders (customer_id, total_amount, status, created_at) VALUES
  (1, 250.00, 'completed', '2024-03-16'),
  (1, 120.00, 'completed', '2024-04-05'),
  (2, 350.00, 'completed', '2024-02-12'),
  (3, 800.00, 'completed', '2024-01-18'),
  (5, 50.00, 'cancelled', '2024-01-11'),
  (5, 600.00, 'completed', '2024-02-28');`,

  multiTable: `INSERT INTO customers (name, email, country, signed_up_at) VALUES
  ('Alice Johnson', 'alice@yuvrocart.com', 'USA', '2024-03-15'),
  ('Bob Smith', 'bob@yuvrocart.com', 'Canada', '2024-02-10'),
  ('Charlie Brown', 'charlie@yuvrocart.com', 'USA', '2023-11-20');

INSERT INTO products (name, category, price) VALUES
  ('Wireless Mouse', 'Electronics', 25.00),
  ('Mechanical Keyboard', 'Electronics', 85.00),
  ('Leather Notebook', 'Stationery', 15.00),
  ('Ergonomic Chair', 'Furniture', 250.00);

INSERT INTO orders (customer_id, total_amount, created_at) VALUES
  (1, 110.00, '2024-03-16'),
  (2, 30.00, '2024-02-12'),
  (3, 250.00, '2024-01-18');

INSERT INTO order_items (order_id, product_id, quantity, price_per_unit) VALUES
  (1, 1, 25.00),
  (1, 2, 1, 85.00),
  (2, 3, 2, 15.00),
  (3, 4, 1, 250.00);`,

  slowQuery: `INSERT INTO orders (customer_id, status, total_amount, created_at)
SELECT
  (random() * 1000)::int + 1,
  CASE WHEN random() > 0.1 THEN 'completed' ELSE 'cancelled' END,
  (random() * 500)::numeric(10,2) + 10.00,
  TIMESTAMP '2024-01-01' + random() * (INTERVAL '150 days')
FROM generate_series(1, 10000);`,

  denormalized: `INSERT INTO store_logs (customer_name, customer_email, product_name, product_category, product_price, order_quantity, order_date) VALUES
  ('Alice Johnson', 'alice@yuvrocart.com', 'Wireless Mouse', 'Electronics', 25.00, 2, '2024-03-16 10:14:00'),
  ('Alice Johnson', 'alice@yuvrocart.com', 'Mechanical Keyboard', 'Electronics', 85.00, 1, '2024-03-16 10:14:00'),
  ('Bob Smith', 'bob@yuvrocart.com', 'Leather Notebook', 'Stationery', 15.00, 3, '2024-02-12 14:30:00');`
};

export function getSqlKit(ticketId: string): Kit {
  let schema = sqlSchemas.default;
  let seed = sqlSeeds.default;
  let query = "";
  let readme = "";

  switch (ticketId) {
    case "SQL-101":
      query = `-- YuvroCart: Customer Signups
-- Find all active customers from the 'USA' who signed up after '2024-01-01'.
-- Sort the result by signed_up_at DESC.
-- Select columns: id, name, email, country, signed_up_at.

SELECT id, name, email, country, signed_up_at
FROM customers
WHERE country = 'USA'
  AND status = 'active'
  AND signed_up_at >= '2024-01-01'
ORDER BY signed_up_at DESC;
`;
      readme = `# SQL-101 · Customer Signups & Filtering
Locate active advertising targets in 'YuvroCart'. Complete the query to retrieve customers who reside in the 'USA', have an 'active' account status, and signed up on or after Jan 1, 2024.
`;
      break;

    case "SQL-102":
      query = `-- YuvroCart: Sales Revenue Reporting
-- Compute total sales revenue and average order value for each month in 2024.
-- Group by the order month (in YYYY-MM format) and only include months with total sales > 500.
-- Order by month ASC.

SELECT
  TO_CHAR(created_at, 'YYYY-MM') AS order_month,
  SUM(total_amount) AS total_sales,
  ROUND(AVG(total_amount), 2) AS avg_order_value
FROM orders
WHERE status = 'completed'
  AND created_at BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
HAVING SUM(total_amount) > 500
ORDER BY order_month ASC;
`;
      readme = `# SQL-102 · Monthly Sales Revenue
Calculate metrics for the shop sales dashboard. Aggregate total revenue and average values per month, keeping only high-performance months.
`;
      break;

    case "SQL-103":
      query = `-- YuvroCart: Churned Shoppers Auditing
-- Retrieve all customers who signed up but have NEVER placed an order.
-- Output columns: customer_id (customers.id), name, email.
-- Sort alphabetically by name.

SELECT c.id AS customer_id, c.name, c.email
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL
ORDER BY c.name ASC;
`;
      readme = `# SQL-103 · Churned Customers (LEFT JOIN)
Audit user accounts. Find customers with no corresponding orders to trigger a customer reactivation email.
`;
      break;

    case "SQL-104":
      schema = sqlSchemas.multiTable;
      seed = sqlSeeds.multiTable;
      query = `-- YuvroCart: Product Category Performance
-- Join customers, orders, order_items, and products to evaluate categories.
-- Return the category name, total quantity of items sold, and total revenue.
-- Sort by total_revenue DESC.

SELECT
  p.category,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.quantity * oi.price_per_unit) AS total_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.id
GROUP BY p.category
ORDER BY total_revenue DESC;
`;
      readme = `# SQL-104 · Category Performance (Multi-table JOIN)
Combine information across order items and product tables to calculate inventory sales totals per category.
`;
      break;

    case "SQL-105":
      query = `-- YuvroCart: High-Value VIP Shoppers
-- Write a query utilizing a CTE to find customers whose total spending
-- exceeds the average total spending across all active buyers.
-- Output: customer_id, name, total_spent. Order by total_spent DESC.

WITH customer_spending AS (
  SELECT customer_id, SUM(total_amount) AS total_spent
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT c.id AS customer_id, c.name, cs.total_spent
FROM customer_spending cs
JOIN customers c ON cs.customer_id = c.id
WHERE cs.total_spent > (SELECT AVG(total_spent) FROM customer_spending)
ORDER BY total_spent DESC;
`;
      readme = `# SQL-105 · High-Value Shoppers (Subqueries & CTEs)
Find VIP customers whose order balances exceed the store averages.
`;
      break;

    case "SQL-201":
      schema = sqlSchemas.multiTable;
      seed = sqlSeeds.multiTable;
      query = `-- YuvroCart: Top Category Products
-- Calculate the product sales rank within each product category.
-- Retrieve the top 3 best-selling products per category based on total quantity sold.
-- Output: category, product_name, total_units, product_rank.

WITH product_sales AS (
  SELECT
    p.category,
    p.name AS product_name,
    SUM(oi.quantity) AS total_units,
    DENSE_RANK() OVER (PARTITION BY p.category ORDER BY SUM(oi.quantity) DESC) AS product_rank
  FROM order_items oi
  JOIN products p ON oi.product_id = p.id
  GROUP BY p.category, p.name
)
SELECT category, product_name, total_units, product_rank
FROM product_sales
WHERE product_rank <= 3;
`;
      readme = `# SQL-201 · Best-Selling Products (RANK / ROW_NUMBER)
Use window rankings to find the most popular inventory items per product shelf.
`;
      break;

    case "SQL-202":
      query = `-- YuvroCart: Financial Growth Analytics
-- Compute month-over-month (MoM) store revenue growth.
-- Display: month, current_month_revenue, previous_month_revenue, and growth_pct.
-- Use LAG() over the aggregate revenues.

WITH monthly_rev AS (
  SELECT
    TO_CHAR(created_at, 'YYYY-MM') AS order_month,
    SUM(total_amount) AS revenue
  FROM orders
  WHERE status = 'completed'
  GROUP BY TO_CHAR(created_at, 'YYYY-MM')
)
SELECT
  order_month,
  revenue,
  LAG(revenue, 1) OVER (ORDER BY order_month) AS prev_revenue,
  ROUND(
    ((revenue - LAG(revenue, 1) OVER (ORDER BY order_month)) / LAG(revenue, 1) OVER (ORDER BY order_month)) * 100,
    2
  ) AS growth_pct
FROM monthly_rev;
`;
      readme = `# SQL-202 · Month-over-Month Revenue Growth (LAG/LEAD)
Track sales progression trends. Fetch previous sales offsets to report monthly growth percentages.
`;
      break;

    case "SQL-301":
      schema = sqlSchemas.slowQuery;
      seed = sqlSeeds.slowQuery;
      query = `-- YuvroCart: Index Tuning
-- EXPLAIN ANALYZE shows a sequential scan on 'orders' when filtering by 'created_at'.
-- 1. Create a composite index on orders (created_at, status).
-- 2. Write the optimized query below.

CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(created_at, status);

SELECT id, customer_id, total_amount
FROM orders
WHERE created_at >= TIMESTAMP '2024-03-01'
  AND status = 'completed';
`;
      readme = `# SQL-301 · EXPLAIN & Indexing
Tuning slow lookups in YuvroCart. Write indexes to eliminate heavy table scans on order timestamps.
`;
      break;

    case "SQL-302":
      schema = sqlSchemas.denormalized;
      seed = sqlSeeds.denormalized;
      query = `-- YuvroCart: 3NF Database Normalization
-- Write DDL queries to create normalized tables from the flat 'store_logs':
-- 1. normalized_customers (id, name, email)
-- 2. normalized_products (id, name, category, price)
-- 3. normalized_orders (id, customer_id, product_id, quantity, order_date)

CREATE TABLE normalized_customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE normalized_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price NUMERIC(10,2) NOT NULL
);

CREATE TABLE normalized_orders (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES normalized_customers(id),
  product_id INT REFERENCES normalized_products(id),
  quantity INT NOT NULL,
  order_date TIMESTAMP NOT NULL
);
`;
      readme = `# SQL-302 · Normalization (3NF)
Migrate flat, raw logs to fully structured relations. Define constraints and foreign keys to prevent data anomalies.
`;
      break;

    default:
      query = `-- MySQL Lab Query
SELECT * FROM customers;`;
      readme = `# MySQL Lab Task
Complete the query.
`;
  }

  return {
    name: "sql",
    rootLabel: "sql-lab",
    primary: "query.sql",
    runtime: "MySQL 8.0",
    fileList: ["query.sql", "schema.sql", "seed.sql", "README.md"],
    files: {
      "query.sql": query,
      "schema.sql": schema,
      "seed.sql": seed,
      "README.md": readme
    }
  };
}

/* ==========================================================================
   2. POSTGRESQL LAB (APEXBANK TRANSACTIONS & AUDITS) DATA
   ========================================================================== */

const pgSchemas: Record<string, string> = {
  default: `CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  risk_level VARCHAR(20) DEFAULT 'Low'
);

CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id),
  account_type VARCHAR(20) NOT NULL,
  balance NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATE NOT NULL
);`,

  transactions: `CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  account_number VARCHAR(20) UNIQUE NOT NULL,
  account_type VARCHAR(20) NOT NULL,
  balance NUMERIC(15,2) NOT NULL
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  account_id INT REFERENCES accounts(id),
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`,

  referrals: `CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE referrals (
  referred_id INT PRIMARY KEY REFERENCES customers(id),
  referrer_id INT REFERENCES customers(id)
);`,

  auditLogs: `CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
};

const pgSeeds: Record<string, string> = {
  default: `INSERT INTO customers (name, email, risk_level) VALUES
  ('Bruce Wayne', 'bruce@waynecorp.com', 'Low'),
  ('Clark Kent', 'clark@dailyplanet.com', 'Low'),
  ('Diana Prince', 'diana@themyscira.gov', 'Low'),
  ('Peter Parker', 'peter@bugle.com', 'Medium'),
  ('Tony Stark', 'tony@stark.com', 'High');

INSERT INTO accounts (customer_id, account_type, balance, status, created_at) VALUES
  (1, 'checking', 250000.00, 'active', '2023-05-12'),
  (2, 'savings', 1200.00, 'active', '2024-01-10'),
  (3, 'checking', 8500.00, 'active', '2024-03-01'),
  (4, 'checking', 450.00, 'active', '2024-04-15'),
  (5, 'checking', 5000000.00, 'suspended', '2023-01-20'),
  (5, 'savings', 800000.00, 'active', '2023-06-15');`,

  transactions: `INSERT INTO accounts (account_number, account_type, balance) VALUES
  ('ACC-1001', 'checking', 5000.00),
  ('ACC-1002', 'savings', 15000.00),
  ('ACC-1003', 'checking', 250.00);

INSERT INTO transactions (account_id, amount, type, status, created_at) VALUES
  (1, 1500.00, 'deposit', 'completed', '2024-05-01 10:00:00+05:30'),
  (1, -200.00, 'withdrawal', 'completed', '2024-05-01 14:30:00+05:30'),
  (2, 5000.00, 'deposit', 'completed', '2024-05-02 09:15:00+05:30'),
  (3, -50.00, 'withdrawal', 'failed', '2024-05-02 11:00:00+05:30'),
  (1, -1200.00, 'withdrawal', 'completed', '2024-05-03 16:45:00+05:30');`,

  referrals: `INSERT INTO customers VALUES
  (1, 'Bruce Wayne'), (2, 'Clark Kent'), (3, 'Diana Prince'), (4, 'Barry Allen'), (5, 'Hal Jordan');

INSERT INTO referrals VALUES
  (2, 1), (3, 1), (4, 2), (5, 4);`,

  auditLogs: `INSERT INTO audit_logs (event_type, payload) VALUES
  ('transfer', '{"from": "ACC-1001", "to": "ACC-1002", "amount": 150.00, "status": "approved", "meta": {"gateway": "ACH"}}'),
  ('login', '{"user": "bruce", "ip": "192.168.1.5", "status": "success"}'),
  ('transfer', '{"from": "ACC-1003", "to": "ACC-1001", "amount": 4200.00, "status": "flagged", "meta": {"reason": "high_velocity", "gateway": "Fedwire"}}'),
  ('settings_change', '{"user": "tony", "field": "mfa", "enabled": false, "status": "flagged"}');`
};

export function getPostgresKit(ticketId: string): Kit {
  let schema = pgSchemas.default;
  let seed = pgSeeds.default;
  let query = "";
  let readme = "";

  switch (ticketId) {
    case "PG-101":
      query = `-- ApexBank: High-Balance Checking Accounts
-- Retrieve all active checking accounts with balances above $5,000.
-- Display customer_name, account_type, balance, status, ordered by balance DESC.

SELECT customer_name, account_type, balance, status
FROM accounts
WHERE account_type = 'checking'
  AND status = 'active'
  AND balance > 5000.00
ORDER BY balance DESC;
`;
      readme = `# PG-101 · High-Balance Banking Accounts
Filter premium client records in the ApexBank ledger database. Write a query in \`query.sql\` targeting 'active checking' profiles above a threshold.
`;
      break;

    case "PG-102":
      schema = pgSchemas.transactions;
      seed = pgSeeds.transactions;
      query = `-- ApexBank: Transaction Daily Volumes
-- Aggregate deposit/withdrawal sizes. Calculate total transaction amount
-- and the average volume per type for completed transfers.
-- Sort by type and date.

SELECT
  type,
  DATE(created_at) AS tx_date,
  COUNT(*) AS tx_count,
  SUM(ABS(amount)) AS total_volume,
  ROUND(AVG(ABS(amount)), 2) AS avg_size
FROM transactions
WHERE status = 'completed'
GROUP BY type, DATE(created_at)
ORDER BY type, tx_date;
`;
      readme = `# PG-102 · Daily Transaction Volume Aggregates
Calculate transaction volume reporting logs. Retrieve count, total sum, and averages grouped by transaction types and days.
`;
      break;

    case "PG-103":
      query = `-- ApexBank: Account Audit Logs
-- Perform an audit using LEFT JOIN to retrieve customers (id, name, email)
-- who have NO accounts associated with them in the ledger.

SELECT c.id, c.name, c.email
FROM customers c
LEFT JOIN accounts a ON a.customer_id = c.id
WHERE a.id IS NULL;
`;
      readme = `# PG-103 · Account Auditing (LEFT/FULL JOIN)
Find orphaned user records. Audit profiles that do not possess any bank account listings.
`;
      break;

    case "PG-104":
      schema = pgSchemas.referrals;
      seed = pgSeeds.referrals;
      query = `-- ApexBank: Customer Referral Hierarchy
-- Traverse a recursive tree structure of banking referrals.
-- Starting from Customer 1 (Bruce Wayne), list all clients referred directly
-- or indirectly, indicating their referral path and recursion depth level.

WITH RECURSIVE referral_tree AS (
  SELECT referred_id, referrer_id, 1 AS depth
  FROM referrals
  WHERE referrer_id = 1
  
  UNION ALL
  
  SELECT r.referred_id, r.referrer_id, rt.depth + 1
  FROM referrals r
  JOIN referral_tree rt ON r.referrer_id = rt.referred_id
)
SELECT rt.referred_id AS customer_id, c.name AS customer_name, rt.depth
FROM referral_tree rt
JOIN customers c ON rt.referred_id = c.id
ORDER BY rt.depth, customer_name;
`;
      readme = `# PG-104 · Recursive CTEs for Referral Networks
Build recursive structures. Traverse referrers in ApexBank to see referral trees.
`;
      break;

    case "PG-105":
      schema = pgSchemas.auditLogs;
      seed = pgSeeds.auditLogs;
      query = `-- ApexBank: JSONB Audit Logs Querying
-- Filter audit logs targeting 'flagged' events.
-- Extract the transaction 'gateway' name from the payload JSONB field.
-- Hint: Use the JSONB containment operator (@>) to check flagged status,
-- and extraction operator (->>) to retrieve gateway.

SELECT
  id,
  event_type,
  payload->>'user' AS user_involved,
  payload->'meta'->>'gateway' AS gateway_name
FROM audit_logs
WHERE payload @> '{"status": "flagged"}';
`;
      readme = `# PG-105 · JSONB Queries & Containment
Query unstructured log fields. Extract payment keys using Postgres JSONB query paths.
`;
      break;

    case "PG-106":
      schema = pgSchemas.transactions;
      seed = pgSeeds.transactions;
      query = `-- ApexBank: Running Ledger Balance
-- Generate a running ledger passbook balance for checking account 1.
-- For each transaction, display: transaction_id, amount, status, created_at, and running_balance.
-- Use SUM(amount) OVER (ORDER BY created_at).

SELECT
  id AS transaction_id,
  amount,
  status,
  created_at,
  SUM(amount) OVER (ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
FROM transactions
WHERE account_id = 1;
`;
      readme = `# PG-106 · Running Account Ledgers (Windows)
Compute running financial sums. Accumulate cashflows chronological ledger offsets using aggregates over window offsets.
`;
      break;

    case "PG-107":
      schema = pgSchemas.transactions;
      seed = pgSeeds.transactions;
      query = `-- ApexBank: EXPLAIN ANALYZE tuning
-- Verify query plans for date-range transaction filters.
-- Create a composite index on (account_id, created_at) to avoid sequential scans,
-- then fetch deposits.

CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions(account_id, created_at);

SELECT id, amount, status
FROM transactions
WHERE account_id = 1
  AND created_at >= TIMESTAMP '2024-05-01 00:00:00+05:30';
`;
      readme = `# PG-107 · EXPLAIN Query Optimizer
Analyze performance statistics of index scans vs table sequential scans on the transaction ledgers.
`;
      break;

    default:
      query = `-- PostgreSQL Lab Query
SELECT * FROM accounts;`;
      readme = `# PostgreSQL Lab Task
Complete the query.
`;
  }

  return {
    name: "sql",
    rootLabel: "postgres-lab",
    primary: "query.sql",
    runtime: "PostgreSQL 16",
    fileList: ["query.sql", "schema.sql", "seed.sql", "README.md"],
    files: {
      "query.sql": query,
      "schema.sql": schema,
      "seed.sql": seed,
      "README.md": readme
    }
  };
}

/* ==========================================================================
   3. PROGRESSIVE HINTS ENGINE
   ========================================================================== */

const ticketHints: Record<string, { title: string; body: string; unlockMin: number }[]> = {
  // MySQL
  "SQL-101": [
    { title: "Understand SELECT", body: "Select only the requested columns: id, name, email, country, and signed_up_at from the customers table.", unlockMin: 0 },
    { title: "Where condition", body: "You need three conditions: country = 'USA', status = 'active', and signed_up_at >= '2024-01-01'. Connect them using AND.", unlockMin: 5 },
    { title: "Sorting syntax", body: "Add 'ORDER BY signed_up_at DESC' at the end of the query.", unlockMin: 15 },
    { title: "Exact query solution", body: "SELECT id, name, email, country, signed_up_at FROM customers WHERE country = 'USA' AND status = 'active' AND signed_up_at >= '2024-01-01' ORDER BY signed_up_at DESC;", unlockMin: 25 }
  ],
  "SQL-102": [
    { title: "Month extraction", body: "Extract the month from 'created_at' in YYYY-MM format. Use TO_CHAR(created_at, 'YYYY-MM') or DATE_FORMAT depending on SQL dialect. Standard Postgres is TO_CHAR.", unlockMin: 0 },
    { title: "Aggregations & Grouping", body: "Use SUM(total_amount) for sales and AVG(total_amount) for order averages. Group by the same monthly formula.", unlockMin: 5 },
    { title: "Having vs Where", body: "Use WHERE status = 'completed' to filter rows, and HAVING SUM(total_amount) > 500 to filter monthly aggregates.", unlockMin: 15 },
    { title: "Full query solution", body: "SELECT TO_CHAR(created_at, 'YYYY-MM') AS order_month, SUM(total_amount) AS total_sales, ROUND(AVG(total_amount), 2) AS avg_order_value FROM orders WHERE status = 'completed' GROUP BY TO_CHAR(created_at, 'YYYY-MM') HAVING SUM(total_amount) > 500 ORDER BY order_month ASC;", unlockMin: 25 }
  ],
  "SQL-103": [
    { title: "Outer JOIN", body: "A LEFT JOIN from customers to orders will match all customers, leaving order columns NULL for those without purchases.", unlockMin: 0 },
    { title: "Isolate churned", body: "Use 'WHERE o.id IS NULL' or 'WHERE o.customer_id IS NULL' to find customers with no corresponding orders.", unlockMin: 5 },
    { title: "Join condition", body: "LEFT JOIN orders o ON o.customer_id = c.id.", unlockMin: 15 },
    { title: "Full query solution", body: "SELECT c.id AS customer_id, c.name, c.email FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL ORDER BY c.name ASC;", unlockMin: 25 }
  ],
  "SQL-104": [
    { title: "Relational join chain", body: "You must join order_items to products using product_id.", unlockMin: 0 },
    { title: "Calculate values", body: "Units sold is SUM(quantity). Revenue is SUM(quantity * price_per_unit).", unlockMin: 5 },
    { title: "Group & Sort", body: "Group by p.category, then order by the revenue sum DESC.", unlockMin: 15 },
    { title: "Full query solution", body: "SELECT p.category, SUM(oi.quantity) AS total_quantity, SUM(oi.quantity * oi.price_per_unit) AS total_revenue FROM order_items oi JOIN products p ON oi.product_id = p.id GROUP BY p.category ORDER BY total_revenue DESC;", unlockMin: 25 }
  ],

  // PostgreSQL
  "PG-101": [
    { title: "Query variables", body: "Filter the accounts table where account_type = 'checking' and status = 'active'.", unlockMin: 0 },
    { title: "Balance limits", body: "Add a condition where balance > 5000.00.", unlockMin: 5 },
    { title: "Sorting output", body: "Use 'ORDER BY balance DESC'.", unlockMin: 15 },
    { title: "Full query solution", body: "SELECT customer_name, account_type, balance, status FROM accounts WHERE account_type = 'checking' AND status = 'active' AND balance > 5000.00 ORDER BY balance DESC;", unlockMin: 25 }
  ],
  "PG-102": [
    { title: "Date conversion", body: "Convert timestamp to Date using DATE(created_at).", unlockMin: 0 },
    { title: "Absolute values", body: "Withdrawals might have negative values. Use ABS(amount) to sum total volumes.", unlockMin: 5 },
    { title: "Grouping details", body: "Group by type, DATE(created_at) and order by type, tx_date.", unlockMin: 15 },
    { title: "Full query solution", body: "SELECT type, DATE(created_at) AS tx_date, COUNT(*) AS tx_count, SUM(ABS(amount)) AS total_volume, ROUND(AVG(ABS(amount)), 2) AS avg_size FROM transactions WHERE status = 'completed' GROUP BY type, DATE(created_at) ORDER BY type, tx_date;", unlockMin: 25 }
  ],
  "PG-104": [
    { title: "Anchor member", body: "The anchor query gets directly referred clients: SELECT referred_id, referrer_id, 1 AS depth FROM referrals WHERE referrer_id = 1", unlockMin: 0 },
    { title: "Recursive member", body: "Join referrals r to the CTE on r.referrer_id = rt.referred_id, incrementing depth.", unlockMin: 5 },
    { title: "Final output join", body: "Join the CTE to customers at the end to get name columns.", unlockMin: 15 },
    { title: "Full query solution", body: "WITH RECURSIVE referral_tree AS (\n  SELECT referred_id, referrer_id, 1 AS depth FROM referrals WHERE referrer_id = 1\n  UNION ALL\n  SELECT r.referred_id, r.referrer_id, rt.depth + 1 FROM referrals r JOIN referral_tree rt ON r.referrer_id = rt.referred_id\n)\nSELECT rt.referred_id AS customer_id, c.name AS customer_name, rt.depth FROM referral_tree rt JOIN customers c ON rt.referred_id = c.id ORDER BY rt.depth, customer_name;", unlockMin: 25 }
  ],
  "PG-105": [
    { title: "JSONB containment", body: "Use 'payload @> '{\"status\": \"flagged\"}'' to check key containment.", unlockMin: 0 },
    { title: "Extract root field", body: "Use ->> 'user' to extract 'user_involved'.", unlockMin: 5 },
    { title: "Extract nested field", body: "Use payload->'meta'->>'gateway' to extract 'gateway_name'.", unlockMin: 15 },
    { title: "Full query solution", body: "SELECT id, event_type, payload->>'user' AS user_involved, payload->'meta'->>'gateway' AS gateway_name FROM audit_logs WHERE payload @> '{\"status\": \"flagged\"}';", unlockMin: 25 }
  ],
  "PG-106": [
    { title: "Running sum", body: "To compute a running balance, use SUM(amount) OVER (ORDER BY created_at).", unlockMin: 0 },
    { title: "Row boundaries", body: "Use ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW for safety in running ledgers.", unlockMin: 5 },
    { title: "Filtering accounts", body: "Ensure you filter by account_id = 1.", unlockMin: 15 },
    { title: "Full query solution", body: "SELECT id AS transaction_id, amount, status, created_at, SUM(amount) OVER (ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance FROM transactions WHERE account_id = 1;", unlockMin: 25 }
  ]
};

export function getDynamicHints(ticketId: string, elapsedMins: number) {
  const hints = ticketHints[ticketId];
  if (!hints) {
    return [
      { n: 1, cost: "Free", title: "Think about it", body: "Analyze the task requirements carefully.", unlockMin: 0 },
      { n: 2, cost: elapsedMins >= 5 ? "Free" : `Free in ${Math.ceil(5 - elapsedMins)}m`, title: "Approach", body: "Check constraints and database tables.", unlockMin: 5 },
      { n: 3, cost: elapsedMins >= 15 ? "Free" : "10 XP", title: "Syntax Check", body: "Verify column names and joins.", unlockMin: 15 },
      { n: 4, cost: elapsedMins >= 25 ? "Free" : "20 XP", title: "Code block solution", body: "Re-read the documentation and examples.", unlockMin: 25 }
    ];
  }
  return hints.map((h, i) => ({
    n: i + 1,
    cost: h.unlockMin === 0 ? "Free" : (elapsedMins >= h.unlockMin ? "Free" : `${i * 10} XP`),
    title: h.title,
    body: h.body,
    unlockMin: h.unlockMin
  }));
}

/* ==========================================================================
   4. POST-SUBMISSION DETAILED REVIEW SOLUTIONS
   ========================================================================== */

const reviewDataMap: Record<string, ReviewData> = {
  "SQL-101": {
    well: ["✓ Filters US customers only", "✓ Verifies account status is active", "✓ Sorts in descending order correctly"],
    improve: ["→ Add explicit column alias for Clarity", "→ Specify table prefix for columns"],
    practices: ["💡 Filter using ISO date format ('YYYY-MM-DD')", "💡 Ensure indexes cover the country filter"],
    reference: `SELECT id, name, email, country, signed_up_at
FROM customers
WHERE country = 'USA'
  AND status = 'active'
  AND signed_up_at >= '2024-01-01'
ORDER BY signed_up_at DESC;`,
    alts: [
      { title: "Using nested filters", tag: "Complex", desc: "Filtering with in-line subqueries, slower due to overhead.", perf: "80%", read: "75%", loc: "8" },
      { title: "Standard WHERE index-friendly scan", tag: "Optimal", desc: "Best performance leveraging composite indexes on country + status.", perf: "99%", read: "98%", loc: "6", community: true }
    ],
    detailedTests: [
      { name: "Test 1 · Schema matches", input: "—", expected: "customers table contains USA, Canada and UK rows", time: "< 0.001s" },
      { name: "Test 2 · Active Filter", input: "Diana Prince (inactive)", expected: "Excluded from results", time: "0.001s" },
      { name: "Test 3 · Country Filter", input: "Bob Smith (Canada)", expected: "Excluded from results", time: "0.001s" },
      { name: "Test 4 · Year constraint", input: "Charlie (2023)", expected: "Excluded from results", time: "0.001s" }
    ]
  },
  "SQL-102": {
    well: ["✓ Accurate MONTH grouping", "✓ Aggregates sum and averages correctly", "✓ Filter aggregates with HAVING"],
    improve: ["→ Format decimals explicitly with ROUND", "→ Order results chronologically"],
    practices: ["💡 Leverage HAVING only for grouped calculations", "💡 Cast numeric values to appropriate decimal sizes"],
    reference: `SELECT
  TO_CHAR(created_at, 'YYYY-MM') AS order_month,
  SUM(total_amount) AS total_sales,
  ROUND(AVG(total_amount), 2) AS avg_order_value
FROM orders
WHERE status = 'completed'
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
HAVING SUM(total_amount) > 500
ORDER BY order_month ASC;`,
    alts: [
      { title: "Subquery monthly totals", tag: "Verbose", desc: "Splits aggregates into separate subqueries, harder to maintain.", perf: "85%", read: "80%", loc: "12" },
      { title: "Direct GROUP BY calendar month", tag: "Optimal", desc: "Aggregates directly in one stage. Uses indexing on status & created_at.", perf: "98%", read: "95%", loc: "8", community: true }
    ],
    detailedTests: [
      { name: "Test 1 · Months grouped", input: "Orders across 3 months", expected: "Yields 3 groups", time: "0.002s" },
      { name: "Test 2 · Total Sales Threshold", input: "Month with $50 total sales", expected: "Filtered out by HAVING", time: "0.001s" }
    ]
  },
  "PG-101": {
    well: ["✓ Correct balance condition", "✓ Targets checking accounts only", "✓ Excludes suspended VIP accounts"],
    improve: ["→ Utilize table aliases for future extension", "→ Filter out NULL values explicitly"],
    practices: ["💡 Use NUMERIC for precision financial values", "💡 Filter accounts by active status before checking balance"],
    reference: `SELECT customer_name, account_type, balance, status
FROM accounts
WHERE account_type = 'checking'
  AND status = 'active'
  AND balance > 5000.00
ORDER BY balance DESC;`,
    alts: [
      { title: "CTE customer lookup first", tag: "Complex", desc: "Queries customer profile before filtering accounts, adds nested operations.", perf: "88%", read: "82%", loc: "10" },
      { title: "Direct WHERE index scan", tag: "Optimal", desc: "Matches indexes directly, minimal execution cost.", perf: "99%", read: "95%", loc: "5", community: true }
    ],
    detailedTests: [
      { name: "Test 1 · Balance check", input: "Peter Parker ($450 balance)", expected: "Excluded", time: "0.001s" },
      { name: "Test 2 · Status suspension", input: "Tony Stark ($5M, suspended)", expected: "Excluded", time: "0.001s" }
    ]
  },
  "PG-104": {
    well: ["✓ Implements recursive CTE anchor correctly", "✓ Increments recursion levels", "✓ Joins nodes properly"],
    improve: ["→ Handle circular cycles if referrers loop", "→ Format referral path as string arrays"],
    practices: ["💡 Constrain recursion depth limits to prevent stack overflow", "💡 Index referrer_id for faster tree traversing"],
    reference: `WITH RECURSIVE referral_tree AS (
  SELECT referred_id, referrer_id, 1 AS depth
  FROM referrals
  WHERE referrer_id = 1
  
  UNION ALL
  
  SELECT r.referred_id, r.referrer_id, rt.depth + 1
  FROM referrals r
  JOIN referral_tree rt ON r.referrer_id = rt.referred_id
)
SELECT rt.referred_id AS customer_id, c.name AS customer_name, rt.depth
FROM referral_tree rt
JOIN customers c ON rt.referred_id = c.id
ORDER BY rt.depth, customer_name;`,
    alts: [
      { title: "Multi-level self JOIN", tag: "Hardcoded", desc: "Performs nested inner joins. Fails if depth exceeds hardcoded links.", perf: "60%", read: "50%", loc: "15" },
      { title: "Recursive Common Table Expression", tag: "Optimal", desc: "Leverages relational recursion, handles arbitrary depth smoothly.", perf: "95%", read: "95%", loc: "11", community: true }
    ],
    detailedTests: [
      { name: "Test 1 · Level 1 direct referrals", input: "Bruce referred Clark and Diana", expected: "Depth 1, correct match", time: "0.002s" },
      { name: "Test 2 · Level 3 indirect referrals", input: "Barry referred Hal, Barry was referred by Clark", expected: "Depth 3, correct match", time: "0.002s" }
    ]
  },
  "PG-105": {
    well: ["✓ Checks containment using @>", "✓ Extracts nested path variables", "✓ Returns correct key fields"],
    improve: ["→ Add GIN indexes on payload", "→ Handle missing gateway attributes"],
    practices: ["💡 Index JSONB columns with gin_trgm or jsonb_path_ops", "💡 Avoid casting values to text when comparing within JSONB"],
    reference: `SELECT
  id,
  event_type,
  payload->>'user' AS user_involved,
  payload->'meta'->>'gateway' AS gateway_name
FROM audit_logs
WHERE payload @> '{"status": "flagged"}';`,
    alts: [
      { title: "Using text casts and LIKE", tag: "Anti-Pattern", desc: "Casts payload to text, very slow on large databases as it skips indexes.", perf: "45%", read: "70%", loc: "6" },
      { title: "JSONB Containment (@>)", tag: "Optimal", desc: "Fast indexing via GIN index, optimal search times.", perf: "99%", read: "92%", loc: "5", community: true }
    ],
    detailedTests: [
      { name: "Test 1 · Matches flagged status", input: "Status flagged and gateway Fedwire", expected: "Extracted: Fedwire", time: "0.001s" },
      { name: "Test 2 · Skips normal logins", input: "Status success", expected: "Excluded", time: "0.001s" }
    ]
  }
};

export function getReviewData(ticketId: string): ReviewData {
  const data = reviewDataMap[ticketId];
  if (!data) {
    return {
      well: ["✓ Query executed successfully", "✓ Syntactically valid"],
      improve: ["→ Consider database indexing", "→ Review query plan statistics"],
      practices: ["💡 Use standard ANSI JOIN syntax", "💡 Limit rows returned in analytics dashboards"],
      reference: `-- Solution for ${ticketId}
SELECT * FROM customers;`,
      alts: [
        { title: "Query solution review", tag: "Standard", desc: "Retrieves matches from table views.", perf: "90%", read: "90%", loc: "5" }
      ],
      detailedTests: [
        { name: "Test 1 · Compile Check", input: "—", expected: "SQL parsed successfully", time: "< 0.001s" },
        { name: "Test 2 · Count Check", input: "—", expected: "Returns matched rows", time: "0.001s" }
      ]
    };
  }
  return data;
}

# 🛒 Yuvro Labs — MySQL E-Commerce (YuvroCart) Lab

Curriculum, Sprint Structure & Automated Evaluation System for MySQL Lab.

---

## 📋 Notion Copy-Paste Instructions
To import this planning page into Notion:
1. Click the raw contents of this file and copy it (`Ctrl + A`, then `Ctrl + C`).
2. Open your Notion workspace and create a new page.
3. Paste the contents directly (`Ctrl + V`). Notion will automatically parse headers, tables, code blocks, lists, and check-boxes!

---

## ⚙️ How Automated Evaluation Works
Every SQL query submitted in the MySQL Lab is evaluated against sandboxed database instances of MySQL 8.0.

### 🧪 Verifier Methods
1. **Method 1 — Query Challenge Runner (Primary for basic queries)**: Compares the query's result set, columns, and ordering with reference outputs.
2. **Method 2 — Index & Execution Plan Checker (Primary for tuning)**: Runs `EXPLAIN` to inspect scan types, index usage, and performance metrics.
3. **Method 3 — Backend Schema & Constraints Validator (Primary for DDL)**: Validates constraints, schemas, and relational normalizations.

---

## 🪙 Scoring System
Every task is scored across 3 dimensions (total = 100 pts per task):
* **[A] Correctness Score (40 pts)**: Automated verifier checks pass/fail.
* **[B] Optimality Score (30 pts)**: Index usage, query execution cost, row scans.
* **[C] Quality Score (20 pts)**: Uppercase keywords, aliasing, clean CTEs, structure.
* **[D] Speed Bonus (10 pts)**: Completed before the sprint deadline.

---

# 🏁 MySQL Sprint Tracks

## 🏁 Sprint 1 — Query Fundamentals & Filtering
**Duration**: 1 week | **XP Pool**: 450 XP
**Goal**: Retrieve, filter, sort, and aggregate customer and order files in the store database.

### Ticket 1.1 — Basic Selection Filters [150 XP]

#### Task 1.1.1 — SELECT & WHERE
* **Points**: 40 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `customers` table with 5,000 rows: `{ id, name, email, country, status, signed_up_at }`
* **What the user does**:
  - Writes a query to retrieve active customers from the USA who signed up after '2024-01-01'.
  - Query:
    ```sql
    SELECT id, name, email, country, signed_up_at
    FROM customers
    WHERE country = 'USA' AND status = 'active' AND signed_up_at >= '2024-01-01'
    ORDER BY signed_up_at DESC;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_projected_fields(actual, included=['id', 'name', 'email', 'country', 'signed_up_at'], excluded=[])`
  - `check_sort_order(actual, 'signed_up_at', 'DESC')`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if exact result set matches; 20 pts if USA filtered correctly but order is wrong.
  - **[B] Optimality (30 pts)**: 30 pts if query executes in `< 5ms`; 10 pts if execution takes longer due to sub-optimal scans.
  - **[C] Quality (20 pts)**: 20 pts if keywords are uppercase (`SELECT`, `FROM`, `WHERE`); 10 pts if lowercase.

---

#### Task 1.1.2 — Pattern Matching & Sorting
* **Points**: 50 | **Method**: Query Challenge Runner (Method 1)
* **Context**: Same `customers` table.
* **What the user does**:
  - Writes a query to select all customers whose names start with 'A', sorted by signup date DESC.
  - Query:
    ```sql
    SELECT id, name, email, signed_up_at
    FROM customers
    WHERE name LIKE 'A%'
    ORDER BY signed_up_at DESC;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("LIKE")`
  - `check_sort_order(actual, 'signed_up_at', 'DESC')`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for correct name filters and sort; 0 pts if `LIKE` pattern is incorrect.
  - **[B] Optimality (30 pts)**: 30 pts for direct scanning using index.
  - **[C] Quality (20 pts)**: 20 pts for structured indentation and casing.

---

### Ticket 1.2 — Aggregations [150 XP]

#### Task 1.2.1 — Monthly Sales Revenue (HAVING)
* **Points**: 60 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `orders` table with 20,000 rows: `{ id, customer_id, total_amount, status, created_at }`
* **What the user does**:
  - Calculates total sales revenue and average order value for each month in 2024.
  - Filters out months with total sales less than or equal to $500.
  - Query:
    ```sql
    SELECT
      DATE_FORMAT(created_at, '%Y-%m') AS order_month,
      SUM(total_amount) AS total_sales,
      ROUND(AVG(total_amount), 2) AS avg_order_value
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    HAVING SUM(total_amount) > 500
    ORDER BY order_month ASC;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("GROUP BY")`
  - `check_command_used("HAVING")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if aggregate sales matches; 20 pts if grouped by month but HAVING clause is missing.
  - **[B] Optimality (30 pts)**: 30 pts if status filter executes first (reducing scan size).
  - **[C] Quality (20 pts)**: 20 pts for using `ROUND()` to format aggregate decimal fields.

---

## 🏁 Sprint 2 — Relational Joins & Schema Design
**Duration**: 2 weeks | **XP Pool**: 500 XP
**Goal**: Combine multiple tables via INNER, LEFT, and self joins to build relational insights.

### Ticket 2.1 — Multi-table Joins [250 XP]

#### Task 2.1.1 — Churned Shoppers (LEFT JOIN)
* **Points**: 50 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `customers` and `orders` tables.
* **What the user does**:
  - Performs a LEFT JOIN to find all customers who signed up but have never placed an order.
  - Query:
    ```sql
    SELECT c.id AS customer_id, c.name, c.email
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    WHERE o.id IS NULL
    ORDER BY c.name ASC;
    ```
  * **Learning Objectives**: Master relational data retrieval across multiple tables.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Ensure you are joining on the correct primary and foreign keys., Consider whether an INNER JOIN or LEFT JOIN is needed.
  * **Common Mistakes**: Using a CROSS JOIN accidentally by forgetting the ON clause., Selecting ambiguous column names without table aliases.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("LEFT JOIN")`
  - `check_document_count(actual, expected_churned)`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for correct listing; 10 pts if INNER JOIN used instead (yielding empty result).
  - **[B] Optimality (30 pts)**: 30 pts if index on `customer_id` is matched.
  - **[C] Quality (20 pts)**: 20 pts for explicit alias definitions (`c` and `o`).

---

#### Task 2.1.2 — Category Sales Performance (Three-Way JOIN)
* **Points**: 60 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `orders`, `order_items`, and `products` tables.
* **What the user does**:
  - Joins the tables to calculate the total quantity sold and total revenue per product category.
  - Query:
    ```sql
    SELECT
      p.category,
      SUM(oi.quantity) AS total_quantity,
      SUM(oi.quantity * oi.price_per_unit) AS total_revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY p.category
    ORDER BY total_revenue DESC;
    ```
  * **Learning Objectives**: Master relational data retrieval across multiple tables.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Ensure you are joining on the correct primary and foreign keys., Consider whether an INNER JOIN or LEFT JOIN is needed.
  * **Common Mistakes**: Using a CROSS JOIN accidentally by forgetting the ON clause., Selecting ambiguous column names without table aliases.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("JOIN")`
  - `check_sort_order(actual, 'total_revenue', 'DESC')`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for category match and sums.
  - **[B] Optimality (30 pts)**: 30 pts for join order execution.
  - **[C] Quality (20 pts)**: 20 pts for explicit column calculations.

---

#### Task 2.1.3 — Product Recommendations (Self JOIN)
* **Points**: 50 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `products` table: `{ id, name, category, price }`
* **What the user does**:
  - Pairs distinct products in the same category that are within $15 price difference for shopping suggestions.
  - Query:
    ```sql
    SELECT p1.name AS prod_a, p2.name AS prod_b, p1.category, ABS(p1.price - p2.price) AS price_diff
    FROM products p1
    JOIN products p2 ON p1.category = p2.category AND p1.id < p2.id
    WHERE ABS(p1.price - p2.price) <= 15.00
    ORDER BY price_diff ASC;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("ABS")`
  - `check_join_condition(p1.id < p2.id to prevent duplication)`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for correct product pairings.
  - **[B] Optimality (30 pts)**: 30 pts if pricing ranges leverage table indices.
  - **[C] Quality (20 pts)**: 20 pts for removing self-pairing mirror records.

---

## 🏁 Sprint 3 — Window Functions & Advanced Analytics
**Duration**: 2 weeks | **XP Pool**: 500 XP
**Goal**: Write analytics queries for executive reports, ranks, running totals, and MoM trends.

### Ticket 3.1 — Window Rankings & CTEs [250 XP]

#### Task 3.1.1 — Best-Selling Category Products (DENSE_RANK)
* **Points**: 60 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `products` and `order_items` tables.
* **What the user does**:
  - Ranks products within each category by quantity sold and extracts the top 3 items.
  - Query:
    ```sql
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
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("DENSE_RANK()")`
  - `check_command_used("OVER")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for top 3 ranked items.
  - **[B] Optimality (30 pts)**: 30 pts for utilizing CTE instead of subquery.
  - **[C] Quality (20 pts)**: 20 pts for partitioning correctly.

---

#### Task 3.1.2 — Month-over-Month Sales Growth (LAG)
* **Points**: 70 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `orders` table.
* **What the user does**:
  - Computes monthly revenue totals and MoM sales growth percentage compared to the previous month.
  - Query:
    ```sql
    WITH monthly_rev AS (
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS order_month,
        SUM(total_amount) AS revenue
      FROM orders
      WHERE status = 'completed'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
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
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("LAG")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for correct revenue growth math.
  - **[B] Optimality (30 pts)**: 30 pts for clean CTE definitions.
  - **[C] Quality (20 pts)**: 20 pts for handling division edge cases.

---

#### Task 3.1.3 — Cumulative Customer Expenditure (SUM OVER)
* **Points**: 60 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `orders` table.
* **What the user does**:
  - Selects orders and calculates a running total of purchases for each customer over time.
  - Query:
    ```sql
    SELECT
      id AS order_id,
      customer_id,
      total_amount,
      created_at,
      SUM(total_amount) OVER (PARTITION BY customer_id ORDER BY created_at) AS running_spent
    FROM orders
    WHERE status = 'completed';
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("SUM")`
  - `check_command_used("PARTITION BY")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for correct cumulative balances.
  - **[B] Optimality (30 pts)**: 30 pts for using standard partitioning.
  - **[C] Quality (20 pts)**: 20 pts for appropriate sorting on order timestamps.

---

## 🏁 Sprint 4 — Indexing, Transactions & Performance
**Duration**: 2 weeks | **XP Pool**: 500 XP
**Goal**: Inspect query plans, optimize index layouts, enforce transactions, and normalize schemas.

### Ticket 4.1 — Performance & Storage [250 XP]

#### Task 4.1.1 — Composite Indexing for Range Filters
* **Points**: 50 | **Method**: Index & Execution Plan Checker (Method 2)
* **Context**: `orders` table with 100,000 entries.
* **What the user does**:
  - Evaluates slow scans on date filtering and creates a composite index on `(created_at, status)`.
  - Query:
    ```sql
    CREATE INDEX idx_orders_date_status ON orders(created_at, status);
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `verify_index_usage("idx_orders_date_status")`
  - `check_no_sequential_scan("orders")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if composite index exists and works.
  - **[B] Optimality (30 pts)**: 30 pts if scan method changes to Index Scan.
  - **[C] Quality (20 pts)**: 20 pts for descriptive index naming rules.

---

#### Task 4.1.2 — Transaction Isolation & Stock Safety
* **Points**: 65 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: `products` table (inventory) and `order_items` table.
* **What the user does**:
  - Writes a transaction block that locks the products row (FOR UPDATE) to prevent race conditions during stock reduction.
  - Query:
    ```sql
    START TRANSACTION;
    SELECT price FROM products WHERE id = 1 FOR UPDATE;
    UPDATE products SET stock = stock - 1 WHERE id = 1 AND stock > 0;
    INSERT INTO order_items (order_id, product_id, quantity, price_per_unit) VALUES (10, 1, 1, 25.00);
    COMMIT;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `check_command_used("FOR UPDATE")`
  - `check_transaction_committed()`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for successful transaction committing.
  - **[B] Optimality (30 pts)**: 30 pts for locking row level only (avoiding table lock).
  - **[C] Quality (20 pts)**: 20 pts for error handling checkpoints.

---

#### Task 4.1.3 — Database Schema Normalization (3NF)
* **Points**: 65 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: Flat `store_logs` table.
* **What the user does**:
  - Normalizes the flat log table into 3rd Normal Form (3NF) tables with foreign keys.
  - Query:
    ```sql
    CREATE TABLE normalized_customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL
    );
    CREATE TABLE normalized_products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      price NUMERIC(10,2) NOT NULL
    );
    CREATE TABLE normalized_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT REFERENCES normalized_customers(id),
      product_id INT REFERENCES normalized_products(id),
      quantity INT NOT NULL,
      order_date TIMESTAMP NOT NULL
    );
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `validate_ddl_structure()`
  - `check_constraint_exists("normalized_orders", "customer_id")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if tables are generated in 3NF structure.
  - **[B] Optimality (30 pts)**: 30 pts for appropriate data type sizes.
  - **[C] Quality (20 pts)**: 20 pts for setting primary/foreign key constraint labels.

---

## 🏁 Sprint 5 — Stored Procedures, Triggers & Events
**Duration**: 1 week | **XP Pool**: 400 XP
**Goal**: Automate actions and abstract logic using Triggers, Functions, and Event Schedulers.

### Ticket 5.1 — MySQL Programmatic Logic [200 XP]

#### Task 5.1.1 — Automated Inventory Triggers
* **Points**: 50 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: `orders` and `products` tables.
* **What the user does**:
  - Creates a trigger that automatically updates product inventory whenever an order is set to 'completed' or 'cancelled'.
  - Query:
    ```sql
    CREATE TRIGGER trg_order_status_update
    AFTER UPDATE ON orders
    FOR EACH ROW
    BEGIN
      IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
         UPDATE products p
         JOIN order_items oi ON oi.product_id = p.id
         SET p.stock = p.stock - oi.quantity
         WHERE oi.order_id = NEW.id;
      END IF;
    END;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `check_trigger_exists("trg_order_status_update")`
  - `verify_inventory_reduced_on_trigger()`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if inventory stock triggers successfully on order updates.
  - **[B] Optimality (30 pts)**: 30 pts if it utilizes bulk joins rather than cursors.
  - **[C] Quality (20 pts)**: 20 pts for clear checking loops of status codes.

---

#### Task 5.1.2 — Monthly Sales Report Procedure
* **Points**: 60 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: `orders` table.
* **What the user does**:
  - Writes a stored procedure that outputs the total sales, completed orders count, and average order value for a given month parameters.
  - Query:
    ```sql
    CREATE PROCEDURE GetMonthlySalesReport(IN report_month VARCHAR(7), OUT total_sales NUMERIC(15,2))
    BEGIN
      SELECT SUM(total_amount) INTO total_sales
      FROM orders
      WHERE status = 'completed' AND DATE_FORMAT(created_at, '%Y-%m') = report_month;
    END;
    ```
  * **Learning Objectives**: Understand stored procedures and programmatic SQL.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `check_procedure_exists("GetMonthlySalesReport")`
  - `verify_procedure_output("GetMonthlySalesReport", '2024-03')`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if variables write back to outputs correctly.
  - **[B] Optimality (30 pts)**: 30 pts for bypassing sequential aggregates using indexed fields.
  - **[C] Quality (20 pts)**: 20 pts for explicit typing on procedure variables.

---

#### Task 5.1.3 — Event Scheduler for Archive Logs
* **Points**: 50 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: `session_logs` table (temporary storage).
* **What the user does**:
  - Enables the MySQL Event Scheduler and defines a recurring event to purge cart logs older than 30 days.
  - Query:
    ```sql
    CREATE EVENT purge_old_sessions
    ON SCHEDULE EVERY 1 DAY
    DO
      DELETE FROM session_logs
      WHERE last_activity < NOW() - INTERVAL 30 DAY;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `check_event_exists("purge_old_sessions")`
  - `verify_scheduler_active()`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if event schedules cleanups correctly.
  - **[B] Optimality (30 pts)**: 30 pts for lightweight, partitioned deleting.
  - **[C] Quality (20 pts)**: 20 pts for clear cron-style event loops.

---

## 🏁 Sprint 6 — Advanced Partitioning & Text Analytics
**Duration**: 1 week | **XP Pool**: 400 XP
**Goal**: Design high-scale structures using range partitioning, full-text indexes, and database views.

### Ticket 6.1 — MySQL Scale & Views [200 XP]

#### Task 6.1.1 — Table Partitioning by Date Range
* **Points**: 50 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: Mega-size orders records layout.
* **What the user does**:
  - Creates a partitioned table for orders using date ranges to split orders by calendar years.
  - Query:
    ```sql
    CREATE TABLE partitioned_orders (
      id INT,
      customer_id INT,
      total_amount NUMERIC(10,2),
      created_at DATE,
      PRIMARY KEY (id, created_at)
    )
    PARTITION BY RANGE COLUMNS(created_at) (
      PARTITION p2023 VALUES LESS THAN ('2024-01-01'),
      PARTITION p2024 VALUES LESS THAN ('2025-01-01'),
      PARTITION pmax VALUES LESS THAN (MAXVALUE)
    );
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `check_table_partitioned("partitioned_orders")`
  - `verify_partition_boundaries("partitioned_orders")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if partition boundaries are set correctly.
  - **[B] Optimality (30 pts)**: 30 pts for using multi-column range partition boundaries.
  - **[C] Quality (20 pts)**: 20 pts for defining MAXVALUE fallback tables.

---

#### Task 6.1.2 — Full-Text Search Indices
* **Points**: 60 | **Method**: Index & Execution Plan Checker (Method 2)
* **Context**: `products` table.
* **What the user does**:
  - Creates a Full-Text index on description search columns and queries names using match-against searches.
  - Query:
    ```sql
    CREATE FULLTEXT INDEX idx_product_search ON products(name, category);
    SELECT id, name
    FROM products
    WHERE MATCH(name, category) AGAINST('Wireless Keyboard' IN NATURAL LANGUAGE MODE);
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the MySQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `verify_index_usage("idx_product_search")`
  - `check_command_used("MATCH")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if text match returns relevant products.
  - **[B] Optimality (30 pts)**: 30 pts for avoiding slow wildcard `LIKE '%word%'` scans.
  - **[C] Quality (20 pts)**: 20 pts for readable match-against syntax structure.

---

#### Task 6.1.3 — Reporting View Enforcements
* **Points**: 50 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: `customers` and `orders` tables.
* **What the user does**:
  - Defines a reporting view with the CHECK OPTION constraint to extract customer summaries safely.
  - Query:
    ```sql
    CREATE VIEW customer_financial_summary AS
    SELECT c.id, c.name, SUM(o.total_amount) AS lifetime_value
    FROM customers c
    JOIN orders o ON o.customer_id = c.id
    WHERE c.status = 'active'
    GROUP BY c.id
    WITH CHECK OPTION;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and querying.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without backticks.
* **How the system evaluates**:
  - `check_view_exists("customer_financial_summary")`
  - `verify_check_option_enforced()`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if view aggregates correctly.
  - **[B] Optimality (30 pts)**: 30 pts if nested joins resolve efficiently.
  - **[C] Quality (20 pts)**: 20 pts for using `WITH CHECK OPTION` write bounds.

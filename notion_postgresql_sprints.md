# 🐘 Yuvro Labs — PostgreSQL Banking (ApexBank) Lab

Curriculum, Sprint Structure & Automated Evaluation System for PostgreSQL Lab.

---

## 📋 Notion Copy-Paste Instructions
To import this planning page into Notion:
1. Click the raw contents of this file and copy it (`Ctrl + A`, then `Ctrl + C`).
2. Open your Notion workspace and create a new page.
3. Paste the contents directly (`Ctrl + V`). Notion will automatically parse headers, tables, code blocks, lists, and check-boxes!

---

## ⚙️ How Automated Evaluation Works
Every SQL query submitted in the PostgreSQL Lab is evaluated against sandboxed database instances of PostgreSQL 16.

### 🧪 Verifier Methods
1. **Method 1 — Query Challenge Runner (Primary for basic queries)**: Compares the query's result set, columns, and ordering with reference outputs.
2. **Method 2 — Index & Execution Plan Checker (Primary for tuning)**: Runs `EXPLAIN ANALYZE` to inspect scan types, index usage, and execution timing.
3. **Method 3 — Backend Schema & Constraints Validator (Primary for DDL)**: Validates constraints, schemas, and relational normalizations.

---

## 🪙 Scoring System
Every task is scored across 3 dimensions (total = 100 pts per task):
* **[A] Correctness Score (40 pts)**: Automated verifier checks pass/fail.
* **[B] Optimality Score (30 pts)**: Index usage, query execution cost, row scans.
* **[C] Quality Score (20 pts)**: Uppercase keywords, aliasing, clean CTEs, structure.
* **[D] Speed Bonus (10 pts)**: Completed before the sprint deadline.

---

# 🏁 PostgreSQL Sprint Tracks

## 🏁 Sprint 1 — Ledger Querying & Aggregation
**Duration**: 1 week | **XP Pool**: 450 XP
**Goal**: Filter banking profiles, manage transaction listings, and aggregate ledger daily sums.

### Ticket 1.1 — Basic Bank account Queries [150 XP]

#### Task 1.1.1 — High-Balance Accounts
* **Points**: 40 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `accounts` table with 10,000 rows: `{ id, customer_id, account_type, balance, status, created_at }`
* **What the user does**:
  - Writes a query to retrieve active checking accounts with balances above $5,000.
  - Query:
    ```sql
    SELECT customer_id, account_type, balance, status
    FROM accounts
    WHERE account_type = 'checking'
      AND status = 'active'
      AND balance > 5000.00
    ORDER BY balance DESC;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_projected_fields(actual, included=['customer_id', 'account_type', 'balance', 'status'], excluded=[])`
  - `check_sort_order(actual, 'balance', 'DESC')`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if exact result set matches; 20 pts if balance filtered correctly but status active check is missing.
  - **[B] Optimality (30 pts)**: 30 pts if query executes in `< 5ms`.
  - **[C] Quality (20 pts)**: 20 pts if keywords are uppercase (`SELECT`, `FROM`, `WHERE`); 10 pts if lowercase.

---

#### Task 1.1.2 — Suspended VIP Audits
* **Points**: 50 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `accounts` and `customers` tables.
* **What the user does**:
  - Locates suspended high-risk customers who still have checking accounts in the database.
  - Query:
    ```sql
    SELECT a.id AS account_id, c.name, c.email, a.balance
    FROM accounts a
    JOIN customers c ON a.customer_id = c.id
    WHERE a.status = 'suspended' AND c.risk_level = 'High'
    ORDER BY a.balance DESC;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("JOIN")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for finding correct matching records.
  - **[B] Optimality (30 pts)**: 30 pts if query targets indexes.
  - **[C] Quality (20 pts)**: 20 pts for structured join conditions.

---

### Ticket 1.2 — Ledger Sums [200 XP]

#### Task 1.2.1 — Daily Transaction Volumes
* **Points**: 60 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `transactions` table with 50,000 rows: `{ id, account_id, amount, type, status, created_at }`
* **What the user does**:
  - Computes total transaction volume (using absolute amount values) and average transaction size per completed type per day.
  - Query:
    ```sql
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
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("ABS")`
  - `check_command_used("GROUP BY")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if daily sums match; 20 pts if aggregates exclude failed status check.
  - **[B] Optimality (30 pts)**: 30 pts if grouping matches indexing.
  - **[C] Quality (20 pts)**: 20 pts for clear column aliases (`tx_date`, `total_volume`).

---

## 🏁 Sprint 2 — Relational Auditing & Recursive Trees
**Duration**: 2 weeks | **XP Pool**: 500 XP
**Goal**: Identify profile leaks and write recursive CTEs to traverse banking networks.

### Ticket 2.1 — Relational Audits [250 XP]

#### Task 2.1.1 — Dormant Account Auditing
* **Points**: 50 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `customers` and `accounts` tables.
* **What the user does**:
  - Performs a LEFT JOIN to find all customer records who have no active accounts in the ledger.
  - Query:
    ```sql
    SELECT c.id, c.name, c.email
    FROM customers c
    LEFT JOIN accounts a ON a.customer_id = c.id
    WHERE a.id IS NULL;
    ```
  * **Learning Objectives**: Master relational data retrieval across multiple tables.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Ensure you are joining on the correct primary and foreign keys., Consider whether an INNER JOIN or LEFT JOIN is needed.
  * **Common Mistakes**: Using a CROSS JOIN accidentally by forgetting the ON clause., Selecting ambiguous column names without table aliases.
  * **Learning Objectives**: Master relational data retrieval across multiple tables.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Ensure you are joining on the correct primary and foreign keys., Consider whether an INNER JOIN or LEFT JOIN is needed.
  * **Common Mistakes**: Using a CROSS JOIN accidentally by forgetting the ON clause., Selecting ambiguous column names without table aliases.
  * **Learning Objectives**: Master relational data retrieval across multiple tables.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Ensure you are joining on the correct primary and foreign keys., Consider whether an INNER JOIN or LEFT JOIN is needed.
  * **Common Mistakes**: Using a CROSS JOIN accidentally by forgetting the ON clause., Selecting ambiguous column names without table aliases.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("LEFT JOIN")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for correct user ID listing.
  - **[B] Optimality (30 pts)**: 30 pts if indexing on `customer_id` is matched.
  - **[C] Quality (20 pts)**: 20 pts for correct aliasing.

---

#### Task 2.1.2 — Full Transaction Reconciliation
* **Points**: 60 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `transactions` ledger and `accounts` tables.
* **What the user does**:
  - Conducts a FULL OUTER JOIN to audit discrepancies between account files and transaction entries.
  - Query:
    ```sql
    SELECT a.id AS account_id, t.id AS transaction_id, t.amount
    FROM accounts a
    FULL OUTER JOIN transactions t ON t.account_id = a.id
    WHERE a.id IS NULL OR t.id IS NULL;
    ```
  * **Learning Objectives**: Master relational data retrieval across multiple tables.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Ensure you are joining on the correct primary and foreign keys., Consider whether an INNER JOIN or LEFT JOIN is needed.
  * **Common Mistakes**: Using a CROSS JOIN accidentally by forgetting the ON clause., Selecting ambiguous column names without table aliases.
  * **Learning Objectives**: Master relational data retrieval across multiple tables.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Ensure you are joining on the correct primary and foreign keys., Consider whether an INNER JOIN or LEFT JOIN is needed.
  * **Common Mistakes**: Using a CROSS JOIN accidentally by forgetting the ON clause., Selecting ambiguous column names without table aliases.
  * **Learning Objectives**: Master relational data retrieval across multiple tables.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Ensure you are joining on the correct primary and foreign keys., Consider whether an INNER JOIN or LEFT JOIN is needed.
  * **Common Mistakes**: Using a CROSS JOIN accidentally by forgetting the ON clause., Selecting ambiguous column names without table aliases.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("FULL OUTER JOIN")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if missing links are captured.
  - **[B] Optimality (30 pts)**: 30 pts for hashing-based join optimization.
  - **[C] Quality (20 pts)**: 20 pts for explicitly naming output fields.

---

### Ticket 2.2 — Recursive Referral Networks [150 XP]

#### Task 2.2.1 — Recursive Referral Trees
* **Points**: 60 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `customers` and `referrals` tables.
* **What the user does**:
  - Writes a recursive CTE to traverse ApexBank's referral structure, starting from Customer 1.
  - Query:
    ```sql
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
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("WITH RECURSIVE")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for exact tree output.
  - **[B] Optimality (30 pts)**: 30 pts for CTE recursion speed.
  - **[C] Quality (20 pts)**: 20 pts for structured joins within CTE limits.

---

## 🏁 Sprint 3 — JSONB Payment Logs
**Duration**: 2 weeks | **XP Pool**: 450 XP
**Goal**: Query and unnest semi-structured JSONB payment gateway audit logs.

### Ticket 3.1 — JSONB Extraction & Arrays [250 XP]

#### Task 3.1.1 — JSONB Containment query (@>)
* **Points**: 50 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `audit_logs` table containing JSONB `payload` structures.
* **What the user does**:
  - Filters transaction logs containing a nested state `status: "flagged"` inside the JSONB payload.
  - Query:
    ```sql
    SELECT
      id,
      event_type,
      payload->>'user' AS user_involved,
      payload->'meta'->>'gateway' AS gateway_name
    FROM audit_logs
    WHERE payload @> '{"status": "flagged"}';
    ```
  * **Learning Objectives**: Understand semi-structured data querying using JSONB.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: PostgreSQL has robust JSONB operators like -> and ->>., Check the Postgres documentation for JSON function syntax.
  * **Common Mistakes**: Confusing the -> operator (returns JSON) with ->> (returns text).
  * **Learning Objectives**: Understand semi-structured data querying using JSONB.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: PostgreSQL has robust JSONB operators like -> and ->>., Check the Postgres documentation for JSON function syntax.
  * **Common Mistakes**: Confusing the -> operator (returns JSON) with ->> (returns text).
  * **Learning Objectives**: Understand semi-structured data querying using JSONB.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Hints**: PostgreSQL has robust JSONB operators like -> and ->>., Check the Postgres documentation for JSON function syntax.
  * **Common Mistakes**: Confusing the -> operator (returns JSON) with ->> (returns text).
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("@>")`
  - `check_command_used("->>")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for exact filtered entries.
  - **[B] Optimality (30 pts)**: 30 pts if query utilizes a GIN index on `payload`.
  - **[C] Quality (20 pts)**: 20 pts for proper key extraction path formats.

---

#### Task 3.1.2 — Extracting Nested Field Paths
* **Points**: 60 | **Method**: Query Challenge Runner (Method 1)
* **Context**: Same `audit_logs` table.
* **What the user does**:
  - Extracts nested routing fields using postgres jsonb path selectors.
  - Query:
    ```sql
    SELECT
      id,
      payload#>>'{meta, gateway}' AS gateway_used,
      (payload->>'amount')::numeric AS transaction_amount
    FROM audit_logs
    WHERE event_type = 'transfer';
    ```
  * **Learning Objectives**: Understand semi-structured data querying using JSONB.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: PostgreSQL has robust JSONB operators like -> and ->>., Check the Postgres documentation for JSON function syntax.
  * **Common Mistakes**: Confusing the -> operator (returns JSON) with ->> (returns text).
  * **Learning Objectives**: Understand semi-structured data querying using JSONB.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: PostgreSQL has robust JSONB operators like -> and ->>., Check the Postgres documentation for JSON function syntax.
  * **Common Mistakes**: Confusing the -> operator (returns JSON) with ->> (returns text).
  * **Learning Objectives**: Understand semi-structured data querying using JSONB.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Hints**: PostgreSQL has robust JSONB operators like -> and ->>., Check the Postgres documentation for JSON function syntax.
  * **Common Mistakes**: Confusing the -> operator (returns JSON) with ->> (returns text).
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("#>>")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for extracting correct gateway keys.
  - **[B] Optimality (30 pts)**: 30 pts for casting parsing.
  - **[C] Quality (20 pts)**: 20 pts for casting JSON string output explicitly to `numeric`.

---

#### Task 3.1.3 — Unnesting JSONB Array Elements
* **Points**: 65 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `audit_logs` where `payload` has a nested JSON list of routing nodes: `{"nodes": ["GatewayA", "GatewayB"]}`.
* **What the user does**:
  - Unnests the JSON array nodes to create a flat list of gateways involved.
  - Query:
    ```sql
    SELECT id, jsonb_array_elements_text(payload->'meta'->'nodes') AS gateway_node
    FROM audit_logs
    WHERE event_type = 'transfer';
    ```
  * **Learning Objectives**: Understand semi-structured data querying using JSONB.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: PostgreSQL has robust JSONB operators like -> and ->>., Check the Postgres documentation for JSON function syntax.
  * **Common Mistakes**: Confusing the -> operator (returns JSON) with ->> (returns text).
  * **Learning Objectives**: Understand semi-structured data querying using JSONB.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: PostgreSQL has robust JSONB operators like -> and ->>., Check the Postgres documentation for JSON function syntax.
  * **Common Mistakes**: Confusing the -> operator (returns JSON) with ->> (returns text).
  * **Learning Objectives**: Understand semi-structured data querying using JSONB.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Hints**: PostgreSQL has robust JSONB operators like -> and ->>., Check the Postgres documentation for JSON function syntax.
  * **Common Mistakes**: Confusing the -> operator (returns JSON) with ->> (returns text).
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("jsonb_array_elements_text")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for correct unnested listings.
  - **[B] Optimality (30 pts)**: 30 pts for memory-safe collection unnesting.
  - **[C] Quality (20 pts)**: 20 pts for returning elements as standard texts.

---

## 🏁 Sprint 4 — Windows, Constraints & Optimizations
**Duration**: 2 weeks | **XP Pool**: 500 XP
**Goal**: Write cumulative statements, build indices, and optimize range scans.

### Ticket 4.1 — Windows & Transaction Alerts [250 XP]

#### Task 4.1.1 — Running Account Ledger Balances
* **Points**: 60 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `transactions` table.
* **What the user does**:
  - Accumulates transaction history to show running passbook totals for Account 1.
  - Query:
    ```sql
    SELECT
      id AS transaction_id,
      amount,
      status,
      created_at,
      SUM(amount) OVER (ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
    FROM transactions
    WHERE account_id = 1;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("SUM")`
  - `check_command_used("OVER")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for correct running cumulative values.
  - **[B] Optimality (30 pts)**: 30 pts if status check is optimized.
  - **[C] Quality (20 pts)**: 20 pts for bounded partition windows.

---

#### Task 4.1.2 — Velocity Risk checks (LAG / LEAD)
* **Points**: 70 | **Method**: Query Challenge Runner (Method 1)
* **Context**: `transactions` table.
* **What the user does**:
  - Detects rapid consecutive transactions (transfers made within 60 seconds of the previous transaction on the same account).
  - Query:
    ```sql
    WITH tx_lag AS (
      SELECT
        id,
        account_id,
        created_at,
        LAG(created_at) OVER (PARTITION BY account_id ORDER BY created_at) AS prev_tx_time
      FROM transactions
    )
    SELECT id, account_id, created_at, prev_tx_time
    FROM tx_lag
    WHERE prev_tx_time IS NOT NULL AND EXTRACT(EPOCH FROM (created_at - prev_tx_time)) <= 60;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `compare_result_set(actual, expected)`
  - `check_command_used("LAG")`
  - `check_command_used("EXTRACT")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts for identifying consecutive swift entries.
  - **[B] Optimality (30 pts)**: 30 pts for utilizing timestamp subtractions.
  - **[C] Quality (20 pts)**: 20 pts for selecting explicit elapsed ranges.

---

#### Task 4.1.3 — EXPLAIN ANALYZE for Ledger Indexing
* **Points**: 65 | **Method**: Index & Execution Plan Checker (Method 2)
* **Context**: `transactions` table with 100,000 records.
* **What the user does**:
  - Creates a composite index on `(account_id, created_at)` to optimize chronological account filters.
  - Query:
    ```sql
    CREATE INDEX idx_tx_account_date ON transactions(account_id, created_at);
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: MEDIUM
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `verify_index_usage("idx_tx_account_date")`
  - `check_no_sequential_scan("transactions")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if index exists and targets correct fields.
  - **[B] Optimality (30 pts)**: 30 pts if scan mode shifts from Sequential to Index Scan.
  - **[C] Quality (20 pts)**: 20 pts for clear index naming conventions.

---

## 🏁 Sprint 5 — PL/pgSQL Programmatic Logic, Triggers & Exceptions
**Duration**: 1 week | **XP Pool**: 400 XP
**Goal**: Automate row audit history and build currency conversion functions with robust rollback catching.

### Ticket 5.1 — Programmatic Postgres [200 XP]

#### Task 5.1.1 — Audit History Triggers
* **Points**: 50 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: `accounts` table and `audit_logs` table.
* **What the user does**:
  - Creates a PL/pgSQL function and trigger to write old balance changes to audit logs whenever account balances are updated.
  - Query:
    ```sql
    CREATE OR REPLACE FUNCTION audit_account_balance_changes()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.balance != OLD.balance THEN
         INSERT INTO audit_logs (event_type, payload)
         VALUES ('balance_update', jsonb_build_object('account_id', NEW.id, 'old_balance', OLD.balance, 'new_balance', NEW.balance));
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_audit_balance
    AFTER UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION audit_account_balance_changes();
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: HARD
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `check_trigger_exists("trg_audit_balance")`
  - `verify_audit_log_written_on_balance_update()`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if trigger inserts logs on balance changes.
  - **[B] Optimality (30 pts)**: 30 pts for JSONB serialization execution.
  - **[C] Quality (20 pts)**: 20 pts for returning the correct `NEW` node in PL/pgSQL.

---

#### Task 5.1.2 — Custom Exchange Conversion Function
* **Points**: 60 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: Financial accounts schemas.
* **What the user does**:
  - Writes a PL/pgSQL database function that takes standard amount, base currency, and target currency, returning converted values.
  - Query:
    ```sql
    CREATE OR REPLACE FUNCTION convert_currency(amount numeric, base_curr varchar, target_curr varchar)
    RETURNS numeric AS $$
    DECLARE
      rate numeric;
    BEGIN
      -- Simplified rates lookup
      IF base_curr = 'USD' AND target_curr = 'EUR' THEN rate := 0.92;
      ELSIF base_curr = 'EUR' AND target_curr = 'USD' THEN rate := 1.08;
      ELSE rate := 1.0;
      END IF;
      RETURN ROUND(amount * rate, 2);
    END;
    $$ LANGUAGE plpgsql;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: HARD
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `check_function_exists("convert_currency")`
  - `verify_function_output("convert_currency(100, 'USD', 'EUR')", 92.00)`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if conversions return correct decimals.
  - **[B] Optimality (30 pts)**: 30 pts for branch lookup speed.
  - **[C] Quality (20 pts)**: 20 pts for declaring explicit typed variables.

---

#### Task 5.1.3 — Transfer Funds Procedure with Rollback Catching
* **Points**: 50 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: `accounts` and `transactions` tables.
* **What the user does**:
  - Writes a stored procedure to transfer cash between accounts, wrapping operations in exceptions checks to rollback on insufficient funds.
  - Query:
    ```sql
    CREATE OR REPLACE PROCEDURE transfer_funds(sender_id int, receiver_id int, amount numeric)
    AS $$
    BEGIN
      -- Check sender balance
      IF (SELECT balance FROM accounts WHERE id = sender_id) < amount THEN
         RAISE EXCEPTION 'Insufficient funds in sender account %', sender_id;
      END IF;
      
      UPDATE accounts SET balance = balance - amount WHERE id = sender_id;
      UPDATE accounts SET balance = balance + amount WHERE id = receiver_id;
      
    EXCEPTION
      WHEN OTHERS THEN
         ROLLBACK;
         RAISE;
    END;
    $$ LANGUAGE plpgsql;
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: HARD
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `check_procedure_exists("transfer_funds")`
  - `verify_transfer_rollback_on_insufficient_funds()`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if procedures execution rolls back invalid states correctly.
  - **[B] Optimality (30 pts)**: 30 pts for safe concurrency updates.
  - **[C] Quality (20 pts)**: 20 pts for descriptive, clear custom error triggers.

---

## 🏁 Sprint 6 — Partitioning, Materialized Views & Fuzzy Search
**Duration**: 2 weeks | **XP Pool**: 500 XP
**Goal**: Design enterprise banking scales via declarative table partitioning, refreshed views, and fuzzy search indexes.

### Ticket 6.1 — Scale & Extensibility [250 XP]

#### Task 6.1.1 — Declarative Table Partitioning by Timestamp Range
* **Points**: 50 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: Millions of transactions.
* **What the user does**:
  - Creates a declaratively partitioned `transactions` table using timestamp ranges to split transaction rows by year.
  - Query:
    ```sql
    CREATE TABLE partitioned_transactions (
      id SERIAL,
      account_id INT,
      amount NUMERIC(12,2),
      created_at TIMESTAMP WITH TIME ZONE,
      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);

    CREATE TABLE tx_2023 PARTITION OF partitioned_transactions
      FOR VALUES FROM ('2023-01-01 00:00:00+00') TO ('2024-01-01 00:00:00+00');

    CREATE TABLE tx_2024 PARTITION OF partitioned_transactions
      FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: HARD
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `check_table_partitioned("partitioned_transactions")`
  - `verify_partition_exists("tx_2024")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if partition tables map records successfully.
  - **[B] Optimality (30 pts)**: 30 pts for correct range bounds without overlaps.
  - **[C] Quality (20 pts)**: 20 pts for explicit timezone settings on partition ranges.

---

#### Task 6.1.2 — Materialized Views with Auto-Refresh
* **Points**: 60 | **Method**: Backend Schema & Constraints Validator (Method 3)
* **Context**: Active account statistics.
* **What the user does**:
  - Generates a materialized view summarizing monthly branch customer deposit statistics, adding index coverage to fast-track reports.
  - Query:
    ```sql
    CREATE MATERIALIZED VIEW mv_branch_deposits AS
    SELECT a.account_type, SUM(a.balance) AS type_total
    FROM accounts a
    GROUP BY a.account_type;
    
    CREATE UNIQUE INDEX idx_mv_branch_type ON mv_branch_deposits(account_type);
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: HARD
  * **Time Limit**: 45 minutes
  * **Hints**: Remember to use GROUP BY for aggregate functions like SUM, COUNT, or AVG.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `check_materialized_view_exists("mv_branch_deposits")`
  - `verify_index_exists("idx_mv_branch_type")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if materialized sums match active balances.
  - **[B] Optimality (30 pts)**: 30 pts if unique index enables concurrent refresh options.
  - **[C] Quality (20 pts)**: 20 pts for structured view naming filters.

---

#### Task 6.1.3 — pg_trgm Fuzzy Customer Name Search
* **Points**: 50 | **Method**: Index & Execution Plan Checker (Method 2)
* **Context**: `customers` table with 50,000 clients.
* **What the user does**:
  - Enables the `pg_trgm` extension and creates a GIN trigram index on customer name columns to facilitate fuzzy search matches.
  - Query:
    ```sql
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
    SELECT id, name
    FROM customers
    WHERE name % 'Bruce Wayne';
    ```
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: EASY
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
  * **Learning Objectives**: Write efficient, standardized SQL queries., Understand relational database design and PostgreSQL features.
  * **Difficulty**: HARD
  * **Time Limit**: 45 minutes
  * **Hints**: Review the PostgreSQL documentation for exact syntax., Test your queries in smaller chunks first.
  * **Common Mistakes**: Forgetting semicolons at the end of statements., Using reserved keywords as column names without quotes.
* **How the system evaluates**:
  - `check_extension_active("pg_trgm")`
  - `verify_index_usage("idx_customers_name_trgm")`
  - `check_command_used("%")`
* **Auto-scoring**:
  - **[A] Correctness (40 pts)**: 40 pts if fuzzy similarity search returns close spelling variants.
  - **[B] Optimality (30 pts)**: 30 pts for using GIN trigram index over standard sequential LIKE scans.
  - **[C] Quality (20 pts)**: 20 pts for clean extension loading syntax.

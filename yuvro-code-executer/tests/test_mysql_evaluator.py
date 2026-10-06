import json
import sqlite3
import pytest
from types import SimpleNamespace
from decimal import Decimal

from database_evaluator.mysql import MySqlEvaluator
from database_evaluator.sqlite import SqliteEvaluator


@pytest.fixture
def evaluator():
    return MySqlEvaluator()


@pytest.fixture
def sqlite_evaluator():
    return SqliteEvaluator()


# ---------------------------------------------------------------------------
# Fixture data matching the E-Commerce SQL Investigation Lab
# ---------------------------------------------------------------------------

TASK1_EXPECTED_OUTPUT = [
    {
        "customer_id": 1,
        "full_name": "Alice Johnson",
        "city": "New York",
        "total_completed_orders": 3,
        "total_spent": 6280.0
    },
    {
        "customer_id": 2,
        "full_name": "Bob Smith",
        "city": "Los Angeles",
        "total_completed_orders": 2,
        "total_spent": 5580.0
    },
    {
        "customer_id": 4,
        "full_name": "Diana Evans",
        "city": "Houston",
        "total_completed_orders": 1,
        "total_spent": 5300.0
    }
]

TASK1_EXPECTED_QUERY = """
SELECT c.customer_id, c.full_name, c.city,
       COUNT(DISTINCT o.order_id) AS total_completed_orders,
       SUM(oi.quantity * oi.unit_price) AS total_spent
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.status = 'completed'
GROUP BY c.customer_id, c.full_name, c.city
HAVING SUM(oi.quantity * oi.unit_price) > 5000
ORDER BY total_spent DESC, c.customer_id ASC;
"""

TASK2_EXPECTED_OUTPUT = [
    {
        "product_id": 1,
        "product_name": "Pro Laptop 15-inch",
        "category": "Electronics",
        "total_units_sold": 10,
        "total_revenue": 11900.0
    },
    {
        "product_id": 3,
        "product_name": "Wireless Ergonomic Mouse",
        "category": "Accessories",
        "total_units_sold": 8,
        "total_revenue": 400.0
    },
    {
        "product_id": 2,
        "product_name": "Noise-Cancelling Headphones",
        "category": "Electronics",
        "total_units_sold": 6,
        "total_revenue": 1480.0
    },
    {
        "product_id": 4,
        "product_name": "Mechanical USB Keyboard",
        "category": "Accessories",
        "total_units_sold": 5,
        "total_revenue": 500.0
    }
]

TASK2_EXPECTED_QUERY = """
SELECT p.product_id, p.product_name, p.category,
       SUM(oi.quantity) AS total_units_sold,
       SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'completed'
  AND p.category IN ('Electronics', 'Accessories')
GROUP BY p.product_id, p.product_name, p.category
HAVING SUM(oi.quantity) >= 5
ORDER BY total_units_sold DESC, p.product_id ASC;
"""

TASK3_EXPECTED_OUTPUT = [
    {
        "customer_id": 6,
        "full_name": "Fiona Green",
        "email": "fiona.green@example.com",
        "city": "Philadelphia",
        "signup_date": "2023-06-18"
    },
    {
        "customer_id": 7,
        "full_name": "George Harris",
        "email": "george.harris@example.com",
        "city": "San Antonio",
        "signup_date": "2023-07-22"
    },
    {
        "customer_id": 9,
        "full_name": "Ian Clark",
        "email": "ian.clark@example.com",
        "city": "Dallas",
        "signup_date": "2023-09-01"
    },
    {
        "customer_id": 10,
        "full_name": "Julia Lewis",
        "email": "julia.lewis@example.com",
        "city": "San Jose",
        "signup_date": "2023-10-10"
    },
    {
        "customer_id": 11,
        "full_name": "Kevin Hall",
        "email": "kevin.hall@example.com",
        "city": "Austin",
        "signup_date": "2023-11-05"
    },
    {
        "customer_id": 12,
        "full_name": "Laura Allen",
        "email": "laura.allen@example.com",
        "city": "Jacksonville",
        "signup_date": "2023-12-01"
    }
]

TASK3_EXPECTED_QUERY = """
SELECT c.customer_id, c.full_name, c.email, c.city, c.signup_date
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.customer_id AND o.status = 'completed'
)
ORDER BY c.signup_date ASC, c.customer_id ASC;
"""


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

def test_correct_solution_task1_receives_passing_score(evaluator):
    """Correct solution for Task 1 receives score 1.0 and passed=True."""
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["customer_id", "full_name", "city", "total_completed_orders", "total_spent"],
                "rows": TASK1_EXPECTED_OUTPUT
            }
        }
    )
    assert result["passed"] is True
    assert result["final_score_pct"] == 1.0
    assert result["output_matches"] is True
    assert result["query_matches"] is True


def test_incorrect_filtering_task1_produces_failing_result(evaluator):
    """Incorrect spending threshold (e.g. > 1000) returning extra rows fails."""
    # Extra customer (Charlie Davis, spent 1670.0) returned due to wrong filter
    extra_rows = list(TASK1_EXPECTED_OUTPUT) + [{
        "customer_id": 3,
        "full_name": "Charlie Davis",
        "city": "Chicago",
        "total_completed_orders": 2,
        "total_spent": 1670.0
    }]
    wrong_query = TASK1_EXPECTED_QUERY.replace("> 5000", "> 1000")
    body = SimpleNamespace(
        query=wrong_query,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["customer_id", "full_name", "city", "total_completed_orders", "total_spent"],
                "rows": extra_rows
            }
        }
    )
    assert result["passed"] is False
    assert result["final_score_pct"] == 0.0
    assert result["output_matches"] is False


def test_incorrect_aggregate_calculation_task1_fails(evaluator):
    """Incorrect aggregation (e.g. wrong sum or counting items instead of distinct orders) fails."""
    wrong_rows = [
        dict(r, total_completed_orders=5) for r in TASK1_EXPECTED_OUTPUT
    ]
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY.replace("COUNT(DISTINCT o.order_id)", "COUNT(o.order_id)"),
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["customer_id", "full_name", "city", "total_completed_orders", "total_spent"],
                "rows": wrong_rows
            }
        }
    )
    assert result["passed"] is False
    assert result["final_score_pct"] == 0.0
    assert result["output_matches"] is False


def test_missing_or_duplicated_rows_produces_failing_result(evaluator):
    """Returning fewer rows or duplicate rows fails."""
    # Missing row
    fewer_rows = TASK1_EXPECTED_OUTPUT[:2]
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["customer_id", "full_name", "city", "total_completed_orders", "total_spent"],
                "rows": fewer_rows
            }
        }
    )
    assert result["passed"] is False
    assert result["final_score_pct"] == 0.0

    # Duplicated row
    dup_rows = TASK1_EXPECTED_OUTPUT + [TASK1_EXPECTED_OUTPUT[0]]
    result_dup = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["customer_id", "full_name", "city", "total_completed_orders", "total_spent"],
                "rows": dup_rows
            }
        }
    )
    assert result_dup["passed"] is False
    assert result_dup["final_score_pct"] == 0.0


def test_incorrect_sorting_task1_produces_failing_result(evaluator):
    """Ascending order instead of descending order fails evaluation."""
    rev_rows = list(reversed(TASK1_EXPECTED_OUTPUT))
    wrong_query = TASK1_EXPECTED_QUERY.replace("ORDER BY total_spent DESC", "ORDER BY total_spent ASC")
    body = SimpleNamespace(
        query=wrong_query,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["customer_id", "full_name", "city", "total_completed_orders", "total_spent"],
                "rows": rev_rows
            }
        }
    )
    assert result["passed"] is False
    assert result["final_score_pct"] == 0.0
    assert result["output_matches"] is False


def test_correct_solution_task2_passes(evaluator):
    """Correct solution for Task 2 receives score 1.0 and passed=True."""
    body = SimpleNamespace(
        query=TASK2_EXPECTED_QUERY,
        expected_query=TASK2_EXPECTED_QUERY,
        expected_output=json.dumps(TASK2_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["product_id", "product_name", "category", "total_units_sold", "total_revenue"],
                "rows": TASK2_EXPECTED_OUTPUT
            }
        }
    )
    assert result["passed"] is True
    assert result["final_score_pct"] == 1.0
    assert result["output_matches"] is True


def test_incorrect_category_filtering_task2_fails(evaluator):
    """Omitting category filtering in Task 2 (e.g. including Books) produces a failing result."""
    # Extra product (Product 8: Mastering SQL Handbook, Category: Books, units: 8)
    extra_product = {
        "product_id": 8,
        "product_name": "Mastering SQL Handbook",
        "category": "Books",
        "total_units_sold": 8,
        "total_revenue": 360.0
    }
    wrong_rows = list(TASK2_EXPECTED_OUTPUT) + [extra_product]
    body = SimpleNamespace(
        query=TASK2_EXPECTED_QUERY.replace("AND p.category IN ('Electronics', 'Accessories')", ""),
        expected_query=TASK2_EXPECTED_QUERY,
        expected_output=json.dumps(TASK2_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["product_id", "product_name", "category", "total_units_sold", "total_revenue"],
                "rows": wrong_rows
            }
        }
    )
    assert result["passed"] is False
    assert result["final_score_pct"] == 0.0


def test_correct_solution_task3_passes(evaluator):
    """Correct solution for Task 3 using NOT EXISTS receives score 1.0 and passed=True."""
    body = SimpleNamespace(
        query=TASK3_EXPECTED_QUERY,
        expected_query=TASK3_EXPECTED_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["customer_id", "full_name", "email", "city", "signup_date"],
                "rows": TASK3_EXPECTED_OUTPUT
            }
        }
    )
    assert result["passed"] is True
    assert result["final_score_pct"] == 1.0


def test_alternative_valid_sql_formulations_accepted(evaluator):
    """Alternative valid formulations (LEFT JOIN ... IS NULL and NOT IN) pass evaluation."""
    left_join_query = """
    SELECT c.customer_id, c.full_name, c.email, c.city, c.signup_date
    FROM customers c
    LEFT JOIN orders o ON c.customer_id = o.customer_id AND o.status = 'completed'
    WHERE o.order_id IS NULL
    ORDER BY c.signup_date ASC, c.customer_id ASC;
    """
    body = SimpleNamespace(
        query=left_join_query,
        expected_query=TASK3_EXPECTED_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["customer_id", "full_name", "email", "city", "signup_date"],
                "rows": TASK3_EXPECTED_OUTPUT
            }
        }
    )
    assert result["passed"] is True
    assert result["final_score_pct"] == 1.0
    assert result["query_matches"] is True

    not_in_query = """
    SELECT c.customer_id, c.full_name, c.email, c.city, c.signup_date
    FROM customers c
    WHERE c.customer_id NOT IN (
        SELECT customer_id FROM orders WHERE status = 'completed'
    )
    ORDER BY c.signup_date ASC, c.customer_id ASC;
    """
    body_not_in = SimpleNamespace(
        query=not_in_query,
        expected_query=TASK3_EXPECTED_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result_not_in = evaluator.evaluate(
        body=body_not_in,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["customer_id", "full_name", "email", "city", "signup_date"],
                "rows": TASK3_EXPECTED_OUTPUT
            }
        }
    )
    assert result_not_in["passed"] is True
    assert result_not_in["final_score_pct"] == 1.0


def test_syntax_error_returns_controlled_failure(evaluator):
    """Syntax error produces controlled failure with exit_code != 0, score 0.0, passed=False."""
    body = SimpleNamespace(
        query="SELECT FROM WHERE SYNTAX ERROR;;;",
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 1,
            "out_str": "",
            "actual_result": "MySQL Error: (1064, \"You have an error in your SQL syntax\")",
            "data": None
        }
    )
    assert result["passed"] is False
    assert result["final_score_pct"] == 0.0
    assert result["query_matches"] is False
    assert result["output_matches"] is False


def test_tabular_output_string_fallback_parsing(evaluator):
    """Tabular formatted string without explicit data dictionary is parsed and evaluated accurately."""
    tabular_output = """customer_id | full_name     | city        | total_completed_orders | total_spent
------------+---------------+-------------+------------------------+------------
1           | Alice Johnson | New York    | 3                      | 6280.00
2           | Bob Smith     | Los Angeles | 2                      | 5580.00
4           | Diana Evans   | Houston     | 1                      | 5300.00
(3 rows)"""
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": tabular_output,
            "data": None
        }
    )
    assert result["passed"] is True
    assert result["final_score_pct"] == 1.0


def test_seed_data_produces_exact_expected_outputs_consistently():
    """Executes the reference queries on the exact seed data to verify exact match with expected output fixtures."""
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()

    # Create schema
    cur.executescript("""
    CREATE TABLE customers (
        customer_id INT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        city VARCHAR(80) NOT NULL,
        signup_date DATE NOT NULL
    );
    CREATE TABLE products (
        product_id INT PRIMARY KEY,
        product_name VARCHAR(100) NOT NULL,
        category VARCHAR(80) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        stock_quantity INT NOT NULL
    );
    CREATE TABLE orders (
        order_id INT PRIMARY KEY,
        customer_id INT NOT NULL,
        order_date DATE NOT NULL,
        status VARCHAR(30) NOT NULL
    );
    CREATE TABLE order_items (
        order_item_id INT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL
    );
    """)

    # Populate seed data
    customers = [
        (1, 'Alice Johnson', 'alice.johnson@example.com', 'New York', '2023-01-15'),
        (2, 'Bob Smith', 'bob.smith@example.com', 'Los Angeles', '2023-02-20'),
        (3, 'Charlie Davis', 'charlie.davis@example.com', 'Chicago', '2023-03-10'),
        (4, 'Diana Evans', 'diana.evans@example.com', 'Houston', '2023-04-05'),
        (5, 'Evan Wright', 'evan.wright@example.com', 'Phoenix', '2023-05-12'),
        (6, 'Fiona Green', 'fiona.green@example.com', 'Philadelphia', '2023-06-18'),
        (7, 'George Harris', 'george.harris@example.com', 'San Antonio', '2023-07-22'),
        (8, 'Hannah Martin', 'hannah.martin@example.com', 'San Diego', '2023-08-14'),
        (9, 'Ian Clark', 'ian.clark@example.com', 'Dallas', '2023-09-01'),
        (10, 'Julia Lewis', 'julia.lewis@example.com', 'San Jose', '2023-10-10'),
        (11, 'Kevin Hall', 'kevin.hall@example.com', 'Austin', '2023-11-05'),
        (12, 'Laura Allen', 'laura.allen@example.com', 'Jacksonville', '2023-12-01')
    ]
    cur.executemany("INSERT INTO customers VALUES (?, ?, ?, ?, ?)", customers)

    products = [
        (1, 'Pro Laptop 15-inch', 'Electronics', 1200.00, 25),
        (2, 'Noise-Cancelling Headphones', 'Electronics', 250.00, 40),
        (3, 'Wireless Ergonomic Mouse', 'Accessories', 50.00, 100),
        (4, 'Mechanical USB Keyboard', 'Accessories', 100.00, 60),
        (5, '4K Ultra HD Monitor', 'Electronics', 400.00, 30),
        (6, 'Smart Coffee Maker', 'Home', 150.00, 20),
        (7, 'Ergonomic Desk Chair', 'Home', 300.00, 15),
        (8, 'Mastering SQL Handbook', 'Books', 45.00, 80),
        (9, 'Cloud Computing Guide', 'Books', 55.00, 50),
        (10, 'USB-C Multiport Hub', 'Accessories', 60.00, 75)
    ]
    cur.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", products)

    orders = [
        (1, 1, '2023-02-01', 'completed'),
        (2, 1, '2023-03-15', 'completed'),
        (3, 2, '2023-03-01', 'completed'),
        (4, 2, '2023-04-10', 'completed'),
        (5, 2, '2023-05-05', 'pending'),
        (6, 3, '2023-04-15', 'completed'),
        (7, 3, '2023-05-20', 'completed'),
        (8, 4, '2023-05-01', 'completed'),
        (9, 4, '2023-06-12', 'cancelled'),
        (10, 5, '2023-06-01', 'completed'),
        (11, 6, '2023-07-04', 'pending'),
        (12, 7, '2023-08-01', 'cancelled'),
        (13, 7, '2023-08-15', 'cancelled'),
        (14, 8, '2023-09-02', 'completed'),
        (15, 8, '2023-09-25', 'pending'),
        (16, 9, '2023-10-05', 'pending'),
        (17, 9, '2023-10-20', 'cancelled'),
        (18, 1, '2023-11-10', 'completed')
    ]
    cur.executemany("INSERT INTO orders VALUES (?, ?, ?, ?)", orders)

    order_items = [
        (1, 1, 1, 2, 1150.00),
        (2, 1, 3, 2, 50.00),
        (3, 2, 5, 2, 400.00),
        (4, 2, 2, 2, 240.00),
        (5, 18, 1, 2, 1200.00),
        (6, 18, 4, 2, 100.00),
        (7, 3, 1, 2, 1200.00),
        (8, 3, 2, 2, 250.00),
        (9, 4, 6, 2, 140.00),
        (10, 4, 7, 8, 300.00),
        (11, 5, 2, 3, 250.00),
        (12, 6, 5, 1, 400.00),
        (13, 6, 4, 1, 100.00),
        (14, 7, 8, 6, 45.00),
        (15, 7, 7, 3, 300.00),
        (16, 8, 1, 4, 1200.00),
        (17, 8, 3, 6, 50.00),
        (18, 8, 4, 2, 100.00),
        (19, 9, 1, 3, 1200.00),
        (20, 10, 6, 2, 150.00),
        (21, 10, 2, 2, 250.00),
        (22, 11, 9, 2, 55.00),
        (23, 12, 5, 2, 400.00),
        (24, 13, 4, 4, 100.00),
        (25, 14, 8, 2, 45.00),
        (26, 14, 9, 2, 55.00),
        (27, 15, 3, 5, 50.00),
        (28, 16, 1, 1, 1200.00),
        (29, 17, 2, 1, 250.00)
    ]
    cur.executemany("INSERT INTO order_items VALUES (?, ?, ?, ?, ?)", order_items)
    conn.commit()

    # Verify Task 1
    cur.execute(TASK1_EXPECTED_QUERY)
    t1_cols = [d[0] for d in cur.description]
    t1_rows = [dict(zip(t1_cols, row)) for row in cur.fetchall()]
    assert len(t1_rows) == len(TASK1_EXPECTED_OUTPUT)
    for act, exp in zip(t1_rows, TASK1_EXPECTED_OUTPUT):
        assert act["customer_id"] == exp["customer_id"]
        assert act["full_name"] == exp["full_name"]
        assert act["city"] == exp["city"]
        assert act["total_completed_orders"] == exp["total_completed_orders"]
        assert abs(float(act["total_spent"]) - float(exp["total_spent"])) < 1e-4

    # Verify Task 2
    cur.execute(TASK2_EXPECTED_QUERY)
    t2_cols = [d[0] for d in cur.description]
    t2_rows = [dict(zip(t2_cols, row)) for row in cur.fetchall()]
    assert len(t2_rows) == len(TASK2_EXPECTED_OUTPUT)
    for act, exp in zip(t2_rows, TASK2_EXPECTED_OUTPUT):
        assert act["product_id"] == exp["product_id"]
        assert act["product_name"] == exp["product_name"]
        assert act["category"] == exp["category"]
        assert act["total_units_sold"] == exp["total_units_sold"]
        assert abs(float(act["total_revenue"]) - float(exp["total_revenue"])) < 1e-4

    # Verify Task 3
    cur.execute(TASK3_EXPECTED_QUERY)
    t3_cols = [d[0] for d in cur.description]
    t3_rows = [dict(zip(t3_cols, row)) for row in cur.fetchall()]
    assert len(t3_rows) == len(TASK3_EXPECTED_OUTPUT)
    for act, exp in zip(t3_rows, TASK3_EXPECTED_OUTPUT):
        assert act["customer_id"] == exp["customer_id"]
        assert act["full_name"] == exp["full_name"]
        assert act["email"] == exp["email"]
        assert act["city"] == exp["city"]
        assert act["signup_date"] == exp["signup_date"]


def test_three_tasks_run_independently(evaluator):
    """The three tasks run and grade completely independently."""
    body1 = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    body2_fail = SimpleNamespace(
        query="SELECT * FROM products;",
        expected_query=TASK2_EXPECTED_QUERY,
        expected_output=json.dumps(TASK2_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    body3 = SimpleNamespace(
        query=TASK3_EXPECTED_QUERY,
        expected_query=TASK3_EXPECTED_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )

    res1 = evaluator.evaluate(
        body=body1,
        execution_result={"exit_code": 0, "out_str": "", "data": {"columns": list(TASK1_EXPECTED_OUTPUT[0].keys()), "rows": TASK1_EXPECTED_OUTPUT}}
    )
    res2 = evaluator.evaluate(
        body=body2_fail,
        execution_result={"exit_code": 0, "out_str": "", "data": {"columns": ["product_id"], "rows": [{"product_id": 1}]}}
    )
    res3 = evaluator.evaluate(
        body=body3,
        execution_result={"exit_code": 0, "out_str": "", "data": {"columns": list(TASK3_EXPECTED_OUTPUT[0].keys()), "rows": TASK3_EXPECTED_OUTPUT}}
    )

    assert res1["passed"] is True
    assert res1["final_score_pct"] == 1.0

    assert res2["passed"] is False
    assert res2["final_score_pct"] == 0.0

    assert res3["passed"] is True
    assert res3["final_score_pct"] == 1.0


def test_mutation_backward_compatibility(evaluator):
    """State-modifying commands (INSERT/UPDATE/DELETE/CREATE) retain existing backward compatibility."""
    body_mutation = SimpleNamespace(
        query="DELETE FROM todos WHERE id = 1;",
        expected_query="DELETE FROM todos WHERE id = 1;",
        expected_output="",
        system_query="SELECT COUNT(*) FROM todos WHERE id = 1;",
        expected_result="0",
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body_mutation,
        execution_result={
            "exit_code": 0,
            "out_str": "Query executed successfully. 1 row(s) affected.",
            "actual_result": "0"
        }
    )
    assert result["passed"] is True
    assert result["final_score_pct"] == 1.0
    assert result["system_matches"] is True

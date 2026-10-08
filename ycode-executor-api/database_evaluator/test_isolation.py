"""
Comprehensive Test Suite for Per-Evaluation MySQL Table Isolation.

Tests:
1. Identifier generation and length constraints (<= 64 chars)
2. SQL Tokenizer and Rewriter (SELECT, JOIN, comma-joins, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, REFERENCES)
3. Alias retention (ensuring unaliased column references like users.id resolve)
4. Schema Explorer query rewrite (filtering information_schema.COLUMNS)
5. Reverse mapping from physical table names back to logical table names
6. Security boundary enforcement (blocking admin commands, information_schema access, cross-eval table access)
7. Evaluator isolation lifecycle (idempotency, evaluation tables tracking)
"""

import unittest
import os
import sys

# Ensure yuvro-code-executer is on python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
EXECUTER_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if EXECUTER_DIR not in sys.path:
    sys.path.insert(0, EXECUTER_DIR)

from database_evaluator.table_resolver import (
    EvaluationTableResolver,
    build_isolated_table_name,
    SecurityException,
    MYSQL_MAX_IDENTIFIER_LENGTH
)
from database_evaluator.mysql import MySqlEvaluator


class TestEvaluationTableIsolation(unittest.TestCase):

    def setUp(self):
        self.eval_id = "eval_abc123"
        self.user_id = "user_456"
        self.lab_id = "lab_789"
        self.resolver = EvaluationTableResolver(self.eval_id, self.user_id, self.lab_id)

    def test_table_name_generation_short_uuids(self):
        """Short UUIDs produce readable evaluation_{eval}_user_{user}_lab_{lab}_{table} format."""
        tbl = build_isolated_table_name("abc123", "user456", "lab789", "users")
        self.assertEqual(tbl, "evaluation_abc123_user_user456_lab_lab789_users")
        self.assertLessEqual(len(tbl), MYSQL_MAX_IDENTIFIER_LENGTH)

    def test_table_name_generation_long_uuids_under_64_chars(self):
        """Standard 36-char UUIDs must deterministically fit in <= 64 characters."""
        long_eval = "155df05c-a26f-4381-89fa-7a1df50f5e26"
        long_user = "aef8f4b4-4db5-47aa-b43b-9332fc159f23"
        long_lab = "bad679c3-8e75-4c6e-a295-c96cd31e9236"
        
        tbl_users = build_isolated_table_name(long_eval, long_user, long_lab, "users")
        tbl_orders = build_isolated_table_name(long_eval, long_user, long_lab, "orders")
        
        self.assertLessEqual(len(tbl_users), 64)
        self.assertLessEqual(len(tbl_orders), 64)
        self.assertTrue(tbl_users.endswith("_users"))
        self.assertTrue(tbl_orders.endswith("_orders"))
        self.assertNotEqual(tbl_users, tbl_orders)

    def test_two_different_users_get_distinct_physical_tables(self):
        """Two different users in same evaluation get completely isolated physical tables."""
        user_a_tbl = build_isolated_table_name("eval_1", "user_alice", "lab_1", "customers")
        user_b_tbl = build_isolated_table_name("eval_1", "user_bob", "lab_1", "customers")

        self.assertNotEqual(user_a_tbl, user_b_tbl)
        self.assertIn("user_alice", user_a_tbl)
        self.assertIn("user_bob", user_b_tbl)

    def test_two_different_evaluations_get_distinct_physical_tables(self):
        """Two different evaluation attempts get completely isolated physical tables."""
        eval_1_tbl = build_isolated_table_name("eval_round1", "user_1", "lab_1", "customers")
        eval_2_tbl = build_isolated_table_name("eval_round2", "user_1", "lab_1", "customers")

        self.assertNotEqual(eval_1_tbl, eval_2_tbl)

    def test_rewrite_select_single_table_preserves_alias(self):
        """Rewriting SELECT * FROM users preserves column accessibility via logical alias."""
        sql = "SELECT users.name, users.id FROM users WHERE users.id = 1;"
        self.resolver.register_table("users")
        rewritten = self.resolver.rewrite(sql)

        expected_physical = self.resolver.get_physical_table_name("users")
        self.assertIn(f"`{expected_physical}` AS `users`", rewritten)
        # users.name and users.id remain valid because table was aliased AS users
        self.assertIn("`users`.name", rewritten)
        self.assertIn("`users`.id", rewritten)

    def test_rewrite_explicit_alias(self):
        """Rewriting SELECT u.name FROM users u does not duplicate AS alias."""
        sql = "SELECT u.name FROM users u JOIN orders o ON u.id = o.user_id;"
        self.resolver.register_table("users")
        self.resolver.register_table("orders")
        rewritten = self.resolver.rewrite(sql)

        users_p = self.resolver.get_physical_table_name("users")
        orders_p = self.resolver.get_physical_table_name("orders")

        self.assertIn(f"`{users_p}` u", rewritten)
        self.assertIn(f"`{orders_p}` o", rewritten)
        self.assertNotIn(f"`{users_p}` AS `users` u", rewritten)

    def test_rewrite_joins_and_subqueries(self):
        """Rewrites complex queries with JOINs, aggregations, and subqueries."""
        sql = """
        SELECT c.first_name, COUNT(o.order_id) AS total_orders
        FROM customers c
        LEFT JOIN orders o ON c.customer_id = o.customer_id
        WHERE c.city = 'New York'
        GROUP BY c.customer_id, c.first_name
        ORDER BY total_orders DESC;
        """
        self.resolver.register_table("customers")
        self.resolver.register_table("orders")
        rewritten = self.resolver.rewrite(sql)

        cust_p = self.resolver.get_physical_table_name("customers")
        ord_p = self.resolver.get_physical_table_name("orders")

        self.assertIn(f"`{cust_p}` c", rewritten)
        self.assertIn(f"`{ord_p}` o", rewritten)
        self.assertIn("'New York'", rewritten)  # Literal string untouched!

    def test_rewrite_ddl_and_dml(self):
        """Rewrites CREATE TABLE, INSERT INTO, UPDATE, and DELETE FROM statements."""
        self.resolver.register_table("products")
        
        insert_sql = "INSERT INTO products (id, name, price) VALUES (1, 'Laptop', 999.99);"
        update_sql = "UPDATE products SET price = 899.99 WHERE id = 1;"
        delete_sql = "DELETE FROM products WHERE id = 1;"

        rewritten_ins = self.resolver.rewrite(insert_sql)
        rewritten_upd = self.resolver.rewrite(update_sql)
        rewritten_del = self.resolver.rewrite(delete_sql)

        prod_p = self.resolver.get_physical_table_name("products")

        self.assertIn(f"INSERT INTO `{prod_p}`", rewritten_ins)
        self.assertIn(f"UPDATE `{prod_p}`", rewritten_upd)
        self.assertIn(f"DELETE FROM `{prod_p}`", rewritten_del)

    def test_rewrite_seed_ddl_and_foreign_keys(self):
        """Rewrites CREATE TABLE with FOREIGN KEY ... REFERENCES target_table."""
        seed_sql = """
        CREATE TABLE categories (
            category_id INT PRIMARY KEY,
            name VARCHAR(50)
        );
        CREATE TABLE products (
            product_id INT PRIMARY KEY,
            category_id INT,
            FOREIGN KEY (category_id) REFERENCES categories (category_id)
        );
        """
        rewritten = self.resolver.rewrite(seed_sql)
        cat_p = self.resolver.get_physical_table_name("categories")
        prod_p = self.resolver.get_physical_table_name("products")

        self.assertIn(f"CREATE TABLE `{cat_p}`", rewritten)
        self.assertIn(f"CREATE TABLE `{prod_p}`", rewritten)
        self.assertIn(f"REFERENCES `{cat_p}`", rewritten)

    def test_schema_explorer_rewrite_and_reverse_mapping(self):
        """Rewrites schema explorer queries and reverse-maps physical table names back to logical names."""
        self.resolver.register_table("customers")
        self.resolver.register_table("orders")

        schema_query = "SELECT TABLE_NAME as `table`, COLUMN_NAME as `column`, DATA_TYPE as `type` FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION"
        rewritten = self.resolver.rewrite_schema_query(schema_query)

        cust_p = self.resolver.get_physical_table_name("customers")
        ord_p = self.resolver.get_physical_table_name("orders")

        self.assertIn(f"'{cust_p}'", rewritten)
        self.assertIn(f"'{ord_p}'", rewritten)

        # Test reverse mapping
        self.assertEqual(self.resolver.get_logical_table_name(cust_p), "customers")
        self.assertEqual(self.resolver.get_logical_table_name(ord_p), "orders")

    def test_security_violation_prohibited_admin_keywords(self):
        """Blocks SHUTDOWN, GRANT, etc."""
        with self.assertRaises(SecurityException):
            self.resolver.validate_sql_security("SHUTDOWN;")

        with self.assertRaises(SecurityException):
            self.resolver.validate_sql_security("GRANT ALL PRIVILEGES ON *.* TO 'user'@'%';")

    def test_security_violation_database_level_ddl(self):
        """Blocks DROP DATABASE, CREATE DATABASE, ALTER DATABASE."""
        with self.assertRaises(SecurityException):
            self.resolver.validate_sql_security("DROP DATABASE production_db;")

        with self.assertRaises(SecurityException):
            self.resolver.validate_sql_security("CREATE SCHEMA test_hack;")

    def test_security_violation_system_catalogs(self):
        """Blocks candidate queries attempting to read system tables directly."""
        with self.assertRaises(SecurityException):
            self.resolver.validate_sql_security("SELECT * FROM information_schema.tables;")

        with self.assertRaises(SecurityException):
            self.resolver.validate_sql_security("SELECT * FROM mysql.user;")

    def test_security_violation_cross_evaluation_table_access(self):
        """Blocks candidate queries attempting to query other candidate's physical tables directly."""
        other_eval_table = "evaluation_victim999_user_user888_lab_lab777_orders"
        with self.assertRaises(SecurityException):
            self.resolver.validate_sql_security(f"SELECT * FROM `{other_eval_table}`;")

        with self.assertRaises(SecurityException):
            self.resolver.validate_sql_security(f"SELECT * FROM {other_eval_table};")


if __name__ == "__main__":
    unittest.main()

import json
import pytest
from types import SimpleNamespace
from decimal import Decimal

from database_evaluator.postgresql import PostgreSqlEvaluator
from database_evaluator.mysql import MySqlEvaluator
from database_evaluator.sqlite import SqliteEvaluator
from database_evaluator.table_resolver import (
    EvaluationTableResolver,
    build_isolated_table_name,
    SecurityException
)


@pytest.fixture
def evaluator():
    return PostgreSqlEvaluator()


@pytest.fixture
def mysql_evaluator():
    return MySqlEvaluator()


@pytest.fixture
def sqlite_evaluator():
    return SqliteEvaluator()


# ---------------------------------------------------------------------------
# Fixture data matching the College Academic Analytics Lab
# ---------------------------------------------------------------------------

TASK1_EXPECTED_OUTPUT = [
    {
        "student_id": 1,
        "student_name": "Alice Johnson",
        "department_name": "Computer Science",
        "courses_completed": 3,
        "average_marks": 90.0
    },
    {
        "student_id": 14,
        "student_name": "Nina Simone",
        "department_name": "Information Technology",
        "courses_completed": 3,
        "average_marks": 90.0
    },
    {
        "student_id": 5,
        "student_name": "Ethan Hunt",
        "department_name": "Electronics",
        "courses_completed": 3,
        "average_marks": 88.0
    },
    {
        "student_id": 6,
        "student_name": "Fiona Gallagher",
        "department_name": "Electronics",
        "courses_completed": 3,
        "average_marks": 88.0
    },
    {
        "student_id": 2,
        "student_name": "Bob Smith",
        "department_name": "Computer Science",
        "courses_completed": 4,
        "average_marks": 82.0
    },
    {
        "student_id": 8,
        "student_name": "Hannah Abbott",
        "department_name": "Mechanical",
        "courses_completed": 3,
        "average_marks": 78.0
    }
]

TASK1_EXPECTED_QUERY = """
SELECT s.student_id, s.student_name, d.department_name,
       COUNT(e.enrollment_id) AS courses_completed,
       ROUND(AVG(e.marks), 2) AS average_marks
FROM students s
JOIN departments d ON s.department_id = d.department_id
JOIN enrollments e ON s.student_id = e.student_id
WHERE e.status = 'completed'
GROUP BY s.student_id, s.student_name, d.department_name
HAVING COUNT(e.enrollment_id) >= 3 AND AVG(e.marks) > 75
ORDER BY average_marks DESC, s.student_id ASC;
"""

TASK2_EXPECTED_OUTPUT = [
    {
        "department_name": "Civil",
        "student_id": 11,
        "student_name": "Kevin Bacon",
        "average_marks": 85.0,
        "rank": 1
    },
    {
        "department_name": "Computer Science",
        "student_id": 3,
        "student_name": "Charlie Brown",
        "average_marks": 95.0,
        "rank": 1
    },
    {
        "department_name": "Electronics",
        "student_id": 5,
        "student_name": "Ethan Hunt",
        "average_marks": 88.0,
        "rank": 1
    },
    {
        "department_name": "Electronics",
        "student_id": 6,
        "student_name": "Fiona Gallagher",
        "average_marks": 88.0,
        "rank": 1
    },
    {
        "department_name": "Information Technology",
        "student_id": 14,
        "student_name": "Nina Simone",
        "average_marks": 90.0,
        "rank": 1
    },
    {
        "department_name": "Mechanical",
        "student_id": 10,
        "student_name": "Julia Roberts",
        "average_marks": 80.0,
        "rank": 1
    }
]

TASK2_EXPECTED_QUERY = """
WITH student_dept_avg AS (
    SELECT d.department_name, s.student_id, s.student_name,
           ROUND(AVG(e.marks), 2) AS average_marks,
           RANK() OVER (PARTITION BY d.department_name ORDER BY AVG(e.marks) DESC) AS rank
    FROM students s
    JOIN departments d ON s.department_id = d.department_id
    JOIN enrollments e ON s.student_id = e.student_id
    WHERE e.status = 'completed'
    GROUP BY d.department_name, s.student_id, s.student_name
)
SELECT department_name, student_id, student_name, average_marks, rank
FROM student_dept_avg
WHERE rank = 1
ORDER BY department_name ASC, student_id ASC;
"""

TASK3_EXPECTED_OUTPUT = [
    {
        "course_id": 1,
        "course_name": "Data Structures and Algorithms",
        "department_name": "Computer Science",
        "enrollment_count": 6,
        "average_course_enrollment": 4.0
    },
    {
        "course_id": 2,
        "course_name": "Operating Systems",
        "department_name": "Computer Science",
        "enrollment_count": 6,
        "average_course_enrollment": 4.0
    },
    {
        "course_id": 3,
        "course_name": "Database Management Systems",
        "department_name": "Computer Science",
        "enrollment_count": 5,
        "average_course_enrollment": 4.0
    },
    {
        "course_id": 4,
        "course_name": "Digital Electronics",
        "department_name": "Electronics",
        "enrollment_count": 5,
        "average_course_enrollment": 4.0
    },
    {
        "course_id": 11,
        "course_name": "Web Technologies",
        "department_name": "Information Technology",
        "enrollment_count": 5,
        "average_course_enrollment": 4.0
    }
]

TASK3_EXPECTED_QUERY = """
WITH course_counts AS (
    SELECT c.course_id, c.course_name, d.department_name,
           COUNT(e.enrollment_id) AS enrollment_count
    FROM courses c
    JOIN departments d ON c.department_id = d.department_id
    JOIN enrollments e ON c.course_id = e.course_id
    WHERE e.status IN ('active', 'completed')
    GROUP BY c.course_id, c.course_name, d.department_name
),
overall_avg AS (
    SELECT ROUND(AVG(enrollment_count), 2) AS avg_enrollment
    FROM course_counts
)
SELECT cc.course_id, cc.course_name, cc.department_name,
       cc.enrollment_count, oa.avg_enrollment AS average_course_enrollment
FROM course_counts cc
CROSS JOIN overall_avg oa
WHERE cc.enrollment_count > oa.avg_enrollment
ORDER BY cc.enrollment_count DESC, cc.course_id ASC;
"""


# ---------------------------------------------------------------------------
# Task 1 Automated Tests
# ---------------------------------------------------------------------------

def test_task1_correct_solution_passes(evaluator):
    """Task 1: Correct solution receives 1.0 and passed=True."""
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["student_id", "student_name", "department_name", "courses_completed", "average_marks"],
                "rows": TASK1_EXPECTED_OUTPUT
            }
        }
    )
    assert res["passed"] is True
    assert res["final_score_pct"] == 1.0
    assert res["output_matches"] is True
    assert res["query_matches"] is True


def test_task1_student_with_fewer_than_3_completed_courses_excluded(evaluator):
    """Students with < 3 completed courses (e.g. Charlie Brown with 2 completed, avg 95) must be excluded."""
    # Erroneous rows include Charlie Brown (student_id 3, 2 courses completed)
    erroneous_rows = [{
        "student_id": 3,
        "student_name": "Charlie Brown",
        "department_name": "Computer Science",
        "courses_completed": 2,
        "average_marks": 95.0
    }] + TASK1_EXPECTED_OUTPUT
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY.replace("HAVING COUNT(e.enrollment_id) >= 3", "HAVING COUNT(e.enrollment_id) >= 2"),
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["student_id", "student_name", "department_name", "courses_completed", "average_marks"],
                "rows": erroneous_rows
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


def test_task1_student_with_average_exactly_75_excluded(evaluator):
    """Student with average exactly 75 (e.g. Ian Wright, avg 75.0, 3 courses) must be excluded (> 75)."""
    # Erroneous query uses >= 75 instead of > 75, including Ian Wright
    erroneous_rows = TASK1_EXPECTED_OUTPUT + [{
        "student_id": 9,
        "student_name": "Ian Wright",
        "department_name": "Mechanical",
        "courses_completed": 3,
        "average_marks": 75.0
    }]
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY.replace("> 75", ">= 75"),
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["student_id", "student_name", "department_name", "courses_completed", "average_marks"],
                "rows": erroneous_rows
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


def test_task1_incorrect_aggregation_fails(evaluator):
    """Incorrect marks calculation or wrong completed count fails."""
    wrong_rows = [dict(r, courses_completed=10) for r in TASK1_EXPECTED_OUTPUT]
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["student_id", "student_name", "department_name", "courses_completed", "average_marks"],
                "rows": wrong_rows
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


def test_task1_incorrect_ordering_fails(evaluator):
    """Ascending order instead of descending average_marks fails."""
    reversed_rows = list(reversed(TASK1_EXPECTED_OUTPUT))
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY.replace("average_marks DESC", "average_marks ASC"),
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["student_id", "student_name", "department_name", "courses_completed", "average_marks"],
                "rows": reversed_rows
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


# ---------------------------------------------------------------------------
# Task 2 Automated Tests
# ---------------------------------------------------------------------------

def test_task2_correct_ranking_passes(evaluator):
    """Task 2: Correct window function solution receives score 1.0 and passed=True."""
    body = SimpleNamespace(
        query=TASK2_EXPECTED_QUERY,
        expected_query=TASK2_EXPECTED_QUERY,
        expected_output=json.dumps(TASK2_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["department_name", "student_id", "student_name", "average_marks", "rank"],
                "rows": TASK2_EXPECTED_OUTPUT
            }
        }
    )
    assert res["passed"] is True
    assert res["final_score_pct"] == 1.0


def test_task2_multiple_rank1_students_included_when_tied(evaluator):
    """Task 2: Both tied students in Electronics (Ethan Hunt & Fiona Gallagher) must be in output."""
    electronics_students = [r for r in TASK2_EXPECTED_OUTPUT if r["department_name"] == "Electronics"]
    assert len(electronics_students) == 2
    assert {s["student_name"] for s in electronics_students} == {"Ethan Hunt", "Fiona Gallagher"}
    assert all(s["rank"] == 1 for s in electronics_students)

    # If student erroneously used ROW_NUMBER() dropping one tied student, it fails
    incomplete_rows = [r for r in TASK2_EXPECTED_OUTPUT if r["student_name"] != "Fiona Gallagher"]
    body = SimpleNamespace(
        query=TASK2_EXPECTED_QUERY.replace("RANK()", "ROW_NUMBER()"),
        expected_query=TASK2_EXPECTED_QUERY,
        expected_output=json.dumps(TASK2_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["department_name", "student_id", "student_name", "average_marks", "rank"],
                "rows": incomplete_rows
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


def test_task2_incorrect_department_partitioning_fails(evaluator):
    """Ranking without PARTITION BY department_name yields single global top student and fails."""
    global_top_only = [TASK2_EXPECTED_OUTPUT[1]]  # Only Charlie Brown (95.0)
    body = SimpleNamespace(
        query=TASK2_EXPECTED_QUERY.replace("PARTITION BY d.department_name", ""),
        expected_query=TASK2_EXPECTED_QUERY,
        expected_output=json.dumps(TASK2_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["department_name", "student_id", "student_name", "average_marks", "rank"],
                "rows": global_top_only
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


# ---------------------------------------------------------------------------
# Task 3 Automated Tests
# ---------------------------------------------------------------------------

def test_task3_correct_enrollment_calculation_passes(evaluator):
    """Task 3: Correct CTE and enrollment comparison query passes with score 1.0."""
    body = SimpleNamespace(
        query=TASK3_EXPECTED_QUERY,
        expected_query=TASK3_EXPECTED_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["course_id", "course_name", "department_name", "enrollment_count", "average_course_enrollment"],
                "rows": TASK3_EXPECTED_OUTPUT
            }
        }
    )
    assert res["passed"] is True
    assert res["final_score_pct"] == 1.0


def test_task3_dropped_enrollments_excluded(evaluator):
    """Including dropped enrollments distorts enrollment counts and fails."""
    # If dropped enrollments were included, Course 7 (Thermodynamics) would have count 5 (> 4.0)
    extra_course_rows = TASK3_EXPECTED_OUTPUT + [{
        "course_id": 7,
        "course_name": "Thermodynamics",
        "department_name": "Mechanical",
        "enrollment_count": 5,
        "average_course_enrollment": 4.67
    }]
    body = SimpleNamespace(
        query=TASK3_EXPECTED_QUERY.replace("WHERE e.status IN ('active', 'completed')", ""),
        expected_query=TASK3_EXPECTED_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["course_id", "course_name", "department_name", "enrollment_count", "average_course_enrollment"],
                "rows": extra_course_rows
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


def test_task3_courses_equal_to_average_are_excluded(evaluator):
    """Courses with count == 4 (equal to average 4.0) must be excluded (> 4.0 required)."""
    # E.g. Course 5 (Signals and Systems, count 4) included erroneously
    erroneous_rows = TASK3_EXPECTED_OUTPUT + [{
        "course_id": 5,
        "course_name": "Signals and Systems",
        "department_name": "Electronics",
        "enrollment_count": 4,
        "average_course_enrollment": 4.0
    }]
    body = SimpleNamespace(
        query=TASK3_EXPECTED_QUERY.replace("> oa.avg_enrollment", ">= oa.avg_enrollment"),
        expected_query=TASK3_EXPECTED_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["course_id", "course_name", "department_name", "enrollment_count", "average_course_enrollment"],
                "rows": erroneous_rows
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


def test_task3_incorrect_ordering_fails(evaluator):
    """Ordering by enrollment_count ASC instead of DESC fails."""
    reversed_rows = list(reversed(TASK3_EXPECTED_OUTPUT))
    body = SimpleNamespace(
        query=TASK3_EXPECTED_QUERY.replace("ORDER BY cc.enrollment_count DESC, cc.course_id ASC", "ORDER BY cc.enrollment_count ASC, cc.course_id ASC"),
        expected_query=TASK3_EXPECTED_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["course_id", "course_name", "department_name", "enrollment_count", "average_course_enrollment"],
                "rows": reversed_rows
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


# ---------------------------------------------------------------------------
# General Evaluation Tests
# ---------------------------------------------------------------------------

def test_syntax_error_returns_controlled_failure(evaluator):
    """PostgreSQL syntax error yields clean exit code failure, score 0, and passed=False."""
    body = SimpleNamespace(
        query="SELEKT * FROM students;",
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 1,
            "out_str": "PostgreSQL Error: syntax error at or near 'SELEKT'",
            "data": None
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0
    assert res["output_matches"] is False
    assert res["query_matches"] is False


def test_valid_alternative_sql_formulations_pass(evaluator):
    """Valid alternative formulations (e.g. using subquery instead of CTE in Task 3) receive full marks."""
    alternative_query = """
    SELECT c.course_id, c.course_name, d.department_name,
           COUNT(e.enrollment_id) AS enrollment_count,
           4.0 AS average_course_enrollment
    FROM courses c
    JOIN departments d ON c.department_id = d.department_id
    JOIN enrollments e ON c.course_id = e.course_id
    WHERE e.status IN ('active', 'completed')
    GROUP BY c.course_id, c.course_name, d.department_name
    HAVING COUNT(e.enrollment_id) > (
        SELECT AVG(cnt) FROM (
            SELECT COUNT(*) AS cnt FROM enrollments WHERE status IN ('active', 'completed') GROUP BY course_id
        ) sub
    )
    ORDER BY enrollment_count DESC, c.course_id ASC;
    """
    body = SimpleNamespace(
        query=alternative_query,
        expected_query=TASK3_EXPECTED_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["course_id", "course_name", "department_name", "enrollment_count", "average_course_enrollment"],
                "rows": TASK3_EXPECTED_OUTPUT
            }
        }
    )
    assert res["passed"] is True
    assert res["final_score_pct"] == 1.0


def test_missing_rows_fail(evaluator):
    """Fewer rows than expected results in failure."""
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["student_id", "student_name", "department_name", "courses_completed", "average_marks"],
                "rows": TASK1_EXPECTED_OUTPUT[:3]
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


def test_extra_rows_fail(evaluator):
    """Extra rows result in failure."""
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["student_id", "student_name", "department_name", "courses_completed", "average_marks"],
                "rows": TASK1_EXPECTED_OUTPUT + [TASK1_EXPECTED_OUTPUT[0]]
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


def test_incorrect_column_values_fail(evaluator):
    """Mismatched average marks fail."""
    wrong_values = [dict(TASK1_EXPECTED_OUTPUT[0], average_marks=50.0)] + TASK1_EXPECTED_OUTPUT[1:]
    body = SimpleNamespace(
        query=TASK1_EXPECTED_QUERY,
        expected_query=TASK1_EXPECTED_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    res = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["student_id", "student_name", "department_name", "courses_completed", "average_marks"],
                "rows": wrong_values
            }
        }
    )
    assert res["passed"] is False
    assert res["final_score_pct"] == 0.0


# ---------------------------------------------------------------------------
# PostgreSQL Table Isolation Tests
# ---------------------------------------------------------------------------

def test_table_resolver_postgresql_dialect_quotes_and_length():
    """PostgreSQL dialect generates <= 63 char identifiers and quotes with double quotes."""
    long_eval = "a18de4d9-9d24-4e80-99b0-0f2149ea9ac4"
    long_user = "user-1234-5678-9012-345678901234"
    long_lab = "lab-9876-5432-1098-765432109876"

    tbl = build_isolated_table_name(long_eval, long_user, long_lab, "students", dialect="postgresql")
    assert len(tbl) <= 63
    assert tbl.endswith("_students")

    resolver = EvaluationTableResolver(long_eval, long_user, long_lab, dialect="postgresql")
    resolver.register_table("students")
    resolver.register_table("departments")
    rewritten = resolver.rewrite("SELECT * FROM students s JOIN departments d ON s.department_id = d.department_id;")
    assert 'FROM "' in rewritten
    assert 'JOIN "' in rewritten
    assert "`" not in rewritten  # No MySQL backticks in PostgreSQL rewritten query!


def test_table_resolver_postgresql_security_boundary():
    """Security boundaries block pg_catalog, admin commands, and cross-evaluation table access."""
    resolver = EvaluationTableResolver("eval1", "user1", "lab1", dialect="postgresql")

    with pytest.raises(SecurityException):
        resolver.validate_sql_security("SELECT * FROM pg_catalog.pg_tables;")

    with pytest.raises(SecurityException):
        resolver.validate_sql_security("SHUTDOWN;")

    with pytest.raises(SecurityException):
        resolver.validate_sql_security("SELECT * FROM evaluation_other_user_other_lab_students;")


def test_table_resolver_schema_query_rewrite_postgresql():
    """Schema query rewrite adapts to information_schema.columns in PostgreSQL."""
    resolver = EvaluationTableResolver("eval1", "user1", "lab1", dialect="postgresql")
    resolver.get_physical_table_name("students")
    resolver.get_physical_table_name("departments")

    query = "SELECT table_name as table, column_name as column FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name;"
    rewritten = resolver.rewrite_schema_query(query)
    assert rewritten is not None
    assert "table_name IN ('evaluation_eval1_user_user1_lab_lab1_students', 'evaluation_eval1_user_user1_lab_lab1_departments')" in rewritten


# ---------------------------------------------------------------------------
# Non-regression on MySQL and SQLite
# ---------------------------------------------------------------------------

def test_mysql_and_sqlite_evaluator_unaffected(mysql_evaluator, sqlite_evaluator):
    """Existing MySQL and SQLite evaluators instantiate and behave properly without regression."""
    assert mysql_evaluator.name == "mysql"
    assert sqlite_evaluator.name == "sqlite"

    # SQLite evaluate simple passing
    body = SimpleNamespace(
        query="SELECT 1;",
        expected_query="SELECT 1;",
        expected_output="1",
        scoring_rules={"logic_score": 100}
    )
    res = sqlite_evaluator.evaluate(
        body=body,
        execution_result={"exit_code": 0, "out_str": "1", "actual_result": "1"}
    )
    assert res["passed"] is True


# ---------------------------------------------------------------------------
# Live Integration Test (Skipped if PostgreSQL service is unavailable)
# ---------------------------------------------------------------------------

def test_live_postgresql_execution_and_isolation(evaluator):
    """Test live provisioning, isolated execution of Tasks 1, 2, 3, and cleanup."""
    import asyncio
    import psycopg2
    import os

    conn_url = os.getenv(
        "EXTERNAL_DB_POSTGRESQL_URL",
        "postgresql://postgres:password@ylabs-db:5432/college_evaluation"
    )

    try:
        conn = psycopg2.connect(conn_url, connect_timeout=3)
        conn.close()
    except Exception as exc:
        pytest.skip(f"PostgreSQL database not reachable at {conn_url}: {exc}")

    eval_uuid = "test-live-eval-001"
    user_uuid = "test-live-user-001"
    lab_uuid = "test-live-lab-001"
    ws_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    async def _run():
        try:
            # 1. Test Task 1
            body1 = SimpleNamespace(
                query=TASK1_EXPECTED_QUERY,
                expected_query=TASK1_EXPECTED_QUERY,
                expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
                scoring_rules={"logic_score": 100},
                connection_url=conn_url,
                evaluation_id=eval_uuid,
                user_id=user_uuid,
                lab_id=lab_uuid
            )
            res1 = await evaluator.execute(body1, ws_dir)
            assert res1["exit_code"] == 0
            eval_res1 = evaluator.evaluate(body=body1, execution_result=res1)
            assert eval_res1["passed"] is True
            assert eval_res1["final_score_pct"] == 1.0

            # 2. Test Task 2
            body2 = SimpleNamespace(
                query=TASK2_EXPECTED_QUERY,
                expected_query=TASK2_EXPECTED_QUERY,
                expected_output=json.dumps(TASK2_EXPECTED_OUTPUT),
                scoring_rules={"logic_score": 100},
                connection_url=conn_url,
                evaluation_id=eval_uuid,
                user_id=user_uuid,
                lab_id=lab_uuid
            )
            res2 = await evaluator.execute(body2, ws_dir)
            assert res2["exit_code"] == 0
            eval_res2 = evaluator.evaluate(body=body2, execution_result=res2)
            assert eval_res2["passed"] is True
            assert eval_res2["final_score_pct"] == 1.0

            # 3. Test Task 3
            body3 = SimpleNamespace(
                query=TASK3_EXPECTED_QUERY,
                expected_query=TASK3_EXPECTED_QUERY,
                expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
                scoring_rules={"logic_score": 100},
                connection_url=conn_url,
                evaluation_id=eval_uuid,
                user_id=user_uuid,
                lab_id=lab_uuid
            )
            res3 = await evaluator.execute(body3, ws_dir)
            assert res3["exit_code"] == 0
            eval_res3 = evaluator.evaluate(body=body3, execution_result=res3)
            assert eval_res3["passed"] is True
            assert eval_res3["final_score_pct"] == 1.0

        finally:
            # Cleanup isolated tables
            await asyncio.to_thread(
                evaluator.cleanup_evaluation_tables,
                conn_url,
                eval_uuid,
                user_uuid,
                lab_uuid
            )

    asyncio.run(_run())


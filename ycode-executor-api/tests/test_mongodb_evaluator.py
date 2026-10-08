import json
import pytest
from types import SimpleNamespace
from decimal import Decimal
from bson import Decimal128, ObjectId

from database_evaluator.mongodb import MongoDbEvaluator
from database_evaluator.table_resolver import (
    EvaluationCollectionResolver,
    SecurityException,
)


@pytest.fixture
def evaluator():
    return MongoDbEvaluator()


@pytest.fixture
def hospital_seed():
    with open("database_evaluator/seed_hospital.json") as f:
        return json.load(f)


# Expected outputs
TASK1_EXPECTED_OUTPUT = [
    {"patient_id": 1009, "name": "Sanjay Rao", "age": 60, "city": "Hyderabad"},
    {"patient_id": 1005, "name": "Rohan Gupta", "age": 52, "city": "Hyderabad"},
    {"patient_id": 1015, "name": "Aditya Kulkarni", "age": 48, "city": "Hyderabad"},
    {"patient_id": 1003, "name": "Vikram Reddy", "age": 45, "city": "Hyderabad"},
    {"patient_id": 1012, "name": "Pooja Hegde", "age": 45, "city": "Hyderabad"},
    {"patient_id": 1007, "name": "Karthik Iyer", "age": 38, "city": "Hyderabad"},
    {"patient_id": 1010, "name": "Divya Menon", "age": 35, "city": "Hyderabad"},
    {"patient_id": 1001, "name": "Aarav Sharma", "age": 34, "city": "Hyderabad"},
    {"patient_id": 1013, "name": "Rahul Roy", "age": 31, "city": "Hyderabad"}
]

TASK2_EXPECTED_OUTPUT = [
    {"doctor_id": 501, "completed_appointments": 5, "total_revenue": 6000, "average_fee": 1200.0},
    {"doctor_id": 502, "completed_appointments": 4, "total_revenue": 6000, "average_fee": 1500.0},
    {"doctor_id": 503, "completed_appointments": 4, "total_revenue": 4000, "average_fee": 1000.0},
    {"doctor_id": 506, "completed_appointments": 5, "total_revenue": 3500, "average_fee": 700.0},
    {"doctor_id": 507, "completed_appointments": 3, "total_revenue": 3300, "average_fee": 1100.0},
    {"doctor_id": 504, "completed_appointments": 4, "total_revenue": 3200, "average_fee": 800.0},
    {"doctor_id": 505, "completed_appointments": 3, "total_revenue": 2700, "average_fee": 900.0}
]

TASK3_EXPECTED_OUTPUT = [
    {"doctor_id": 501, "doctor_name": "Dr. Ananya Rao", "specialization": "Cardiology", "department": "Cardiology", "completed_appointments": 5, "total_revenue": 6000},
    {"doctor_id": 507, "doctor_name": "Dr. Arjun Reddy", "specialization": "Cardiology", "department": "Cardiology", "completed_appointments": 3, "total_revenue": 3300},
    {"doctor_id": 505, "doctor_name": "Dr. Vikram Desai", "specialization": "Dermatology", "department": "Dermatology", "completed_appointments": 3, "total_revenue": 2700},
    {"doctor_id": 506, "doctor_name": "Dr. Neha Verma", "specialization": "General Medicine", "department": "General Medicine", "completed_appointments": 5, "total_revenue": 3500},
    {"doctor_id": 508, "doctor_name": "Dr. Sneha Kulkarni", "specialization": "General Medicine", "department": "General Medicine", "completed_appointments": 0, "total_revenue": 0},
    {"doctor_id": 502, "doctor_name": "Dr. Rajesh Kumar", "specialization": "Neurology", "department": "Neurology", "completed_appointments": 4, "total_revenue": 6000},
    {"doctor_id": 503, "doctor_name": "Dr. Suresh Mehta", "specialization": "Orthopedics", "department": "Orthopedics", "completed_appointments": 4, "total_revenue": 4000},
    {"doctor_id": 504, "doctor_name": "Dr. Priya Sharma", "specialization": "Pediatrics", "department": "Pediatrics", "completed_appointments": 4, "total_revenue": 3200}
]

TASK1_QUERY = 'db.patients.find({ "city": "Hyderabad", "age": { "$gt": 30 } }, { "_id": 0, "patient_id": 1, "name": 1, "age": 1, "city": 1 }).sort({ "age": -1, "patient_id": 1 }).limit(10)'

TASK2_QUERY = '''db.appointments.aggregate([
  { "$match": { "status": "completed" } },
  { "$group": {
      "_id": "$doctor_id",
      "completed_appointments": { "$sum": 1 },
      "total_revenue": { "$sum": "$consultation_fee" },
      "average_fee": { "$avg": "$consultation_fee" }
  } },
  { "$project": {
      "_id": 0,
      "doctor_id": "$_id",
      "completed_appointments": 1,
      "total_revenue": 1,
      "average_fee": 1
  } },
  { "$sort": { "total_revenue": -1, "doctor_id": 1 } }
])'''

TASK3_QUERY = '''db.doctors.aggregate([
  { "$lookup": {
      "from": "appointments",
      "localField": "doctor_id",
      "foreignField": "doctor_id",
      "as": "appts"
  } },
  { "$unwind": {
      "path": "$appts",
      "preserveNullAndEmptyArrays": true
  } },
  { "$group": {
      "_id": "$doctor_id",
      "doctor_name": { "$first": "$name" },
      "specialization": { "$first": "$specialization" },
      "department": { "$first": "$department" },
      "completed_appointments": {
          "$sum": {
              "$cond": [{ "$eq": ["$appts.status", "completed"] }, 1, 0]
          }
      },
      "total_revenue": {
          "$sum": {
              "$cond": [{ "$eq": ["$appts.status", "completed"] }, "$appts.consultation_fee", 0]
          }
      }
  } },
  { "$project": {
      "_id": 0,
      "doctor_id": "$_id",
      "doctor_name": 1,
      "specialization": 1,
      "department": 1,
      "completed_appointments": 1,
      "total_revenue": 1
  } },
  { "$sort": {
      "department": 1,
      "total_revenue": -1,
      "doctor_id": 1
  } }
])'''


# ===========================================================================
# 1. Parsing and BSON Normalization Tests
# ===========================================================================

def test_parse_json_structured_query(evaluator):
    structured = {
        "collection": "patients",
        "operation": "find",
        "filter": {"city": "Hyderabad"},
        "projection": {"_id": 0, "name": 1},
        "sort": {"age": -1},
        "limit": 5
    }
    parsed = evaluator.parse_mongo_query(json.dumps(structured))
    assert parsed["collection"] == "patients"
    assert parsed["operation"] == "find"
    assert parsed["filter"] == {"city": "Hyderabad"}
    assert parsed["projection"] == {"_id": 0, "name": 1}
    assert parsed["sort"] == {"age": -1}
    assert parsed["limit"] == 5


def test_parse_shell_find_query(evaluator):
    q = 'db.patients.find({ "city": "Hyderabad", "age": { "$gt": 30 } }, { "_id": 0, "patient_id": 1 }).sort({ "age": -1, "patient_id": 1 }).limit(10)'
    parsed = evaluator.parse_mongo_query(q)
    assert parsed["collection"] == "patients"
    assert parsed["operation"] == "find"
    assert parsed["filter"] == {"city": "Hyderabad", "age": {"$gt": 30}}
    assert parsed["projection"] == {"_id": 0, "patient_id": 1}
    assert parsed["sort"] == {"age": -1, "patient_id": 1}
    assert parsed["limit"] == 10


def test_parse_shell_aggregate_query(evaluator):
    q = 'db.appointments.aggregate([ { "$match": { "status": "completed" } }, { "$sort": { "doctor_id": 1 } } ])'
    parsed = evaluator.parse_mongo_query(q)
    assert parsed["collection"] == "appointments"
    assert parsed["operation"] == "aggregate"
    assert len(parsed["pipeline"]) == 2
    assert parsed["pipeline"][0] == {"$match": {"status": "completed"}}


def test_normalize_bson(evaluator):
    oid = ObjectId()
    doc = {
        "_id": oid,
        "fee": Decimal128("1200.50"),
        "ratio": Decimal("0.75"),
        "val": 12.00000000001,
        "items": [{"inner_fee": Decimal128("500")}]
    }
    normalized = evaluator.normalize_bson(doc)
    assert normalized["_id"] == str(oid)
    assert normalized["fee"] == 1200.50
    assert normalized["ratio"] == 0.75
    assert isinstance(normalized["val"], float)
    assert normalized["items"][0]["inner_fee"] == 500.0


# ===========================================================================
# 2. Evaluation Collection Resolver & Security Tests
# ===========================================================================

def test_resolver_collection_isolation():
    resolver = EvaluationCollectionResolver(
        evaluation_uuid="eval-123",
        user_uuid="user-456",
        lab_uuid="hospital-lab"
    )
    col1 = resolver.get_physical_collection_name("patients")
    col2 = resolver.get_physical_collection_name("doctors")
    assert col1 != "patients"
    assert "patients" in col1

    # User 2 has isolated namespace
    resolver_user2 = EvaluationCollectionResolver(
        evaluation_uuid="eval-123",
        user_uuid="user-999",
        lab_uuid="hospital-lab"
    )
    col1_u2 = resolver_user2.get_physical_collection_name("patients")
    assert col1 != col1_u2


def test_resolver_rejects_unauthorized_collection():
    resolver = EvaluationCollectionResolver(
        evaluation_uuid="eval-123",
        user_uuid="user-456",
        lab_uuid="hospital-lab"
    )
    # Register authorized collections
    resolver.register_collection("patients")
    resolver.register_collection("doctors")

    with pytest.raises(SecurityException):
        resolver.validate_collection_access("admin_users")

    with pytest.raises(SecurityException):
        resolver.validate_collection_access("system.views")


def test_resolver_rejects_physical_table_injection():
    resolver = EvaluationCollectionResolver(
        evaluation_uuid="eval-123",
        user_uuid="user-456",
        lab_uuid="hospital-lab"
    )
    resolver.register_collection("patients")

    # A user cannot refer directly to a physical name from another user
    with pytest.raises(SecurityException):
        resolver.validate_collection_access("evaluation_user999_patients")


def test_resolver_pipeline_rewrite():
    resolver = EvaluationCollectionResolver(
        evaluation_uuid="eval-123",
        user_uuid="user-456",
        lab_uuid="hospital-lab"
    )
    resolver.register_collection("doctors")
    resolver.register_collection("appointments")

    pipeline = [
        {"$lookup": {"from": "appointments", "localField": "doctor_id", "foreignField": "doctor_id", "as": "appts"}},
        {"$sort": {"department": 1}}
    ]
    rewritten = resolver.rewrite_pipeline(pipeline)
    assert rewritten[0]["$lookup"]["from"] == resolver.get_physical_collection_name("appointments")


# ===========================================================================
# 3. Evaluation Tasks Full Results Verification
# ===========================================================================

def test_task1_correct_submission_passes(evaluator):
    body = SimpleNamespace(
        query=TASK1_QUERY,
        expected_query=TASK1_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["patient_id", "name", "age", "city"],
                "rows": TASK1_EXPECTED_OUTPUT
            }
        }
    )
    assert result["passed"] is True
    assert result["final_score_pct"] == 1.0
    assert result["output_matches"] is True


def test_task1_wrong_filter_fails(evaluator):
    # Missing patient or including age <= 30
    wrong_output = list(TASK1_EXPECTED_OUTPUT) + [
        {"patient_id": 1002, "name": "Priya Patel", "age": 28, "city": "Hyderabad"}
    ]
    body = SimpleNamespace(
        query='db.patients.find({ "city": "Hyderabad" })',
        expected_query=TASK1_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["patient_id", "name", "age", "city"],
                "rows": wrong_output
            }
        }
    )
    assert result["passed"] is False
    assert result["final_score_pct"] == 0.0


def test_task1_wrong_sort_fails(evaluator):
    # Sort order ascending instead of descending
    wrong_output = list(reversed(TASK1_EXPECTED_OUTPUT))
    body = SimpleNamespace(
        query=TASK1_QUERY.replace('"age": -1', '"age": 1'),
        expected_query=TASK1_QUERY,
        expected_output=json.dumps(TASK1_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["patient_id", "name", "age", "city"],
                "rows": wrong_output
            }
        }
    )
    assert result["passed"] is False
    assert result["final_score_pct"] == 0.0


def test_task2_correct_submission_passes(evaluator):
    body = SimpleNamespace(
        query=TASK2_QUERY,
        expected_query=TASK2_QUERY,
        expected_output=json.dumps(TASK2_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["doctor_id", "completed_appointments", "total_revenue", "average_fee"],
                "rows": TASK2_EXPECTED_OUTPUT
            }
        }
    )
    assert result["passed"] is True
    assert result["final_score_pct"] == 1.0


def test_task2_including_scheduled_and_cancelled_fails(evaluator):
    # If student didn't filter status = "completed", revenue and counts will be higher
    wrong_output = [
        dict(r, completed_appointments=r["completed_appointments"] + 2, total_revenue=r["total_revenue"] + 2000)
        for r in TASK2_EXPECTED_OUTPUT
    ]
    body = SimpleNamespace(
        query=TASK2_QUERY,
        expected_query=TASK2_QUERY,
        expected_output=json.dumps(TASK2_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["doctor_id", "completed_appointments", "total_revenue", "average_fee"],
                "rows": wrong_output
            }
        }
    )
    assert result["passed"] is False
    assert result["final_score_pct"] == 0.0


def test_task3_correct_submission_passes(evaluator):
    body = SimpleNamespace(
        query=TASK3_QUERY,
        expected_query=TASK3_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["doctor_id", "doctor_name", "specialization", "department", "completed_appointments", "total_revenue"],
                "rows": TASK3_EXPECTED_OUTPUT
            }
        }
    )
    assert result["passed"] is True
    assert result["final_score_pct"] == 1.0


def test_task3_excluding_doctor_with_zero_appointments_fails(evaluator):
    # If student used inner join without preserveNullAndEmptyArrays, Dr 508 is dropped (7 rows instead of 8)
    missing_doctor_508 = [r for r in TASK3_EXPECTED_OUTPUT if r["doctor_id"] != 508]
    assert len(missing_doctor_508) == 7
    body = SimpleNamespace(
        query=TASK3_QUERY,
        expected_query=TASK3_QUERY,
        expected_output=json.dumps(TASK3_EXPECTED_OUTPUT),
        scoring_rules={"logic_score": 100}
    )
    result = evaluator.evaluate(
        body=body,
        execution_result={
            "exit_code": 0,
            "out_str": "",
            "data": {
                "columns": ["doctor_id", "doctor_name", "specialization", "department", "completed_appointments", "total_revenue"],
                "rows": missing_doctor_508
            }
        }
    )
    assert result["passed"] is False
    assert result["final_score_pct"] == 0.0


# ===========================================================================
# 4. Live PyMongo / Mock Execution Integration Test
# ===========================================================================

def test_live_execution_on_mongomock(evaluator, hospital_seed, monkeypatch):
    import mongomock
    mock_client = mongomock.MongoClient()
    db = mock_client["test_hospital_eval"]
    for col, docs in hospital_seed["collections"].items():
        db[col].insert_many(docs)

    monkeypatch.setattr(evaluator, "get_mongo_client", lambda uri: mock_client)
    monkeypatch.setattr(evaluator, "get_database", lambda uri: db)

    # Execute Task 1 query directly via evaluator
    parsed_t1 = evaluator.parse_mongo_query(TASK1_QUERY)
    stdout, stderr, code, data = evaluator.execute_mongo_operation("mongodb://mock:27017/test_hospital_eval", parsed_t1)
    assert code == 0
    rows = data["rows"]
    cols = data["columns"]
    assert len(rows) == 9
    assert set(cols) == {"patient_id", "name", "age", "city"}
    assert rows[0]["patient_id"] == 1009
    assert rows[-1]["patient_id"] == 1013

    # Execute Task 2 aggregation query directly via evaluator
    parsed_t2 = evaluator.parse_mongo_query(TASK2_QUERY)
    stdout2, stderr2, code2, data2 = evaluator.execute_mongo_operation("mongodb://mock:27017/test_hospital_eval", parsed_t2)
    assert code2 == 0
    rows2 = data2["rows"]
    assert len(rows2) == 7
    assert rows2[0]["doctor_id"] == 501
    assert rows2[1]["doctor_id"] == 502

    # Execute Task 3 aggregation query directly via evaluator
    parsed_t3 = evaluator.parse_mongo_query(TASK3_QUERY)
    stdout3, stderr3, code3, data3 = evaluator.execute_mongo_operation("mongodb://mock:27017/test_hospital_eval", parsed_t3)
    assert code3 == 0
    rows3 = data3["rows"]
    assert len(rows3) == 8
    dr_508 = next(r for r in rows3 if r["doctor_id"] == 508)
    assert dr_508["completed_appointments"] == 0
    assert dr_508["total_revenue"] == 0

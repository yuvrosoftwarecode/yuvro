import asyncio
from database_evaluator.mongodb import MongodbEvaluator

class MockBody:
    query = 'db.users.insertOne({username: "alice", email: "alice@test.com"})'
    db_file = 'mock'
    expected_query = 'insert'
    expected_output = ''
    system_query = 'db.users.findOne({username: "alice"})'
    expected_result = 'alice'
    scoring_rules = {"logic_score": 100}

ev = MongodbEvaluator()
execution_result = {
    "out_str": "{ acknowledged: true, insertedId: ObjectId('669e2c608a1c97a7e8b45678') }",
    "actual_result": "alice"
}

res = ev.evaluate(MockBody(), execution_result)
print("EVALUATION RESULT:")
print(res)

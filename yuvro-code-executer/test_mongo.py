import asyncio
from database_evaluator.mongodb import MongodbEvaluator

class MockBody:
    query = 'db.users.insertOne({username: "alice", email: "alice@test.com"})'
    # Use standard mongo URI based on what's likely passed in the environment
    db_file = 'mongodb://root:password@yuvro-mongo-db:27017/yuvro?authSource=admin'
    expected_query = 'insert'
    expected_output = ''
    system_query = 'db.users.findOne({username: "alice"})'
    expected_result = 'alice'

async def main():
    ev = MongodbEvaluator()
    res = await ev.execute(MockBody(), "/app")
    print("EVALUATION RESULT:")
    print(res)

asyncio.run(main())

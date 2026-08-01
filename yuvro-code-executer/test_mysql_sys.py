import asyncio
from database_evaluator.mysql import MysqlEvaluator

class MockBody:
    query = "CREATE TABLE dummy (id INT);"
    db_file = "mysql://root:password@yuvro-ylabs-db:3306/yuvro"  # Check what the actual connection string is
    expected_query = ""
    system_query = "SELECT column_name FROM information_schema.columns WHERE table_name='todos_does_not_exist';"

async def main():
    ev = MysqlEvaluator()
    # Mocking db_file
    res = await ev.get_system_query_result(MockBody(), ".")
    print(f"ACTUAL_RESULT: {repr(res)}")

asyncio.run(main())

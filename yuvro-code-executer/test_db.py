import asyncio
from database_evaluator.postgresql import PostgresqlEvaluator

class MockBody:
    query = "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username TEXT NOT NULL, email TEXT NOT NULL);"
    db_file = "postgresql://postgres:postgres@localhost:5434/yuvro" 
    expected_query = "CREATE TABLE users ( id SERIAL PRIMARY KEY, username TEXT NOT NULL, email TEXT NOT NULL );"
    scoring_rules = {}
    system_query = "SELECT column_name FROM information_schema.columns WHERE table_name='users';"
    expected_result = "id"
    expected_output = None

async def main():
    ev = PostgresqlEvaluator()
    res = await ev.execute(MockBody(), ".")
    print(res)

asyncio.run(main())

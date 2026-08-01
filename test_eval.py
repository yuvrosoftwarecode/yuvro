import sys
sys.path.insert(0, 'yuvro-code-executer')
from database_evaluator.sqlite import SqliteEvaluator

class DummyBody:
    query = 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT NOT NULL);'
    db_file = '__none__'
    scoring_rules = {'system_query': 'PRAGMA table_info(users);', 'expected_result': 'username'}
    system_query = 'PRAGMA table_info(users);'
    expected_result = 'username'
    expected_query = 'CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT NOT NULL);'
    expected_output = ''

body = DummyBody()
evaluator = SqliteEvaluator()

execution_result = {
    "out_str": "",
    "actual_result": "0|id|INTEGER|0||1\n1|username|TEXT|1||0\n2|email|TEXT|1||0"
}

res = evaluator.evaluate(body, execution_result)
print(res)

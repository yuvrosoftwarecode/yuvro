from typing import Dict, Type
from .base import BaseDatabaseEvaluator
from .sqlite import SqliteEvaluator
from .postgresql import PostgreSqlEvaluator
from .mysql import MySqlEvaluator
from .mongodb import MongoDbEvaluator

class DatabaseEvaluatorFactory:
    EVALUATORS: Dict[str, Type[BaseDatabaseEvaluator]] = {
        SqliteEvaluator.name: SqliteEvaluator,
        "sqlite": SqliteEvaluator,
        "postgresql": PostgreSqlEvaluator,
        "postgres": PostgreSqlEvaluator,
        "mysql": MySqlEvaluator,
        "mongodb": MongoDbEvaluator,
        "mongo": MongoDbEvaluator,
        "mongosh": MongoDbEvaluator,
    }

    @classmethod
    def get_evaluator(cls, name: str) -> BaseDatabaseEvaluator:
        evaluator_cls = cls.EVALUATORS.get(str(name).lower())
        if not evaluator_cls:
            evaluator_cls = SqliteEvaluator
        return evaluator_cls()

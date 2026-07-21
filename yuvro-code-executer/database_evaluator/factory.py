from typing import Dict, Type
from .base import BaseDatabaseEvaluator
from .sqlite import SqliteEvaluator

class DatabaseEvaluatorFactory:
    EVALUATORS: Dict[str, Type[BaseDatabaseEvaluator]] = {
        SqliteEvaluator.name: SqliteEvaluator,
    }

    @classmethod
    def get_evaluator(cls, name: str) -> BaseDatabaseEvaluator:
        evaluator_cls = cls.EVALUATORS.get(name)
        if not evaluator_cls:
            raise ValueError(f"Unsupported database evaluator: {name}")
        return evaluator_cls()

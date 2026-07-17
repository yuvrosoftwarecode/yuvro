from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseDatabaseEvaluator(ABC):
    name: str = None

    @abstractmethod
    async def execute(self, body: Any, workspace_dir: str) -> Dict[str, Any]:
        """
        Executes the database query within the given workspace directory.
        Returns a dictionary containing stdout, stderr, exit_code, and optionally the evaluation.
        """
        pass

    @abstractmethod
    def evaluate(self, body: Any, execution_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates the executed query based on scoring rules and expected results.
        Returns the evaluation dictionary.
        """
        pass

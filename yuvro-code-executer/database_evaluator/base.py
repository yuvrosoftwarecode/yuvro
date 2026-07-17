from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseDatabaseEvaluator(ABC):
    name: str = None

    @abstractmethod
    async def execute(self, body: Any, workspace_dir: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def evaluate(self, body: Any, execution_result: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def get_system_query_result(self, body: Any, workspace_dir: str) -> str:
        pass

import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class BaseLabEvaluator(ABC):
    """
    Abstract Base Class for all Lab AI Evaluators in YHub.
    Follows the Factory Method and Strategy design patterns.
    """

    def __init__(
        self,
        provider: str = "deepseek",
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        **kwargs,
    ):
        self.provider = (provider or "deepseek").lower().strip()
        self.model_name = model_name
        self.api_key = api_key
        self.extra_kwargs = kwargs

    @abstractmethod
    def evaluate(
        self, lab_context: Dict[str, Any], user_submission: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Synchronously evaluate a student's lab submission against the lab context.
        Returns a standardized evaluation dictionary.
        """
        pass

    @abstractmethod
    async def aevaluate(
        self, lab_context: Dict[str, Any], user_submission: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Asynchronously evaluate a student's lab submission against the lab context.
        Returns a standardized evaluation dictionary.
        """
        pass

    def validate_input(
        self, lab_context: Dict[str, Any], user_submission: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """Validates that input data structures are appropriate for evaluation."""
        if not isinstance(lab_context, dict):
            return False, "lab_context must be a dictionary"
        if not isinstance(user_submission, dict):
            return False, "user_submission must be a dictionary"
        return True, None

    @staticmethod
    def extract_json(response_text: str) -> Dict[str, Any]:
        """
        Robustly extracts and parses a JSON object from raw model response,
        handling markdown fences (```json ... ```), preamble, and postscript.
        """
        if not response_text:
            raise ValueError("Empty response text from model")

        cleaned = response_text.strip()

        # Remove markdown code fences if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        # Direct parse attempt
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Find first '{' and matching last '}'
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            substring = cleaned[start_idx : end_idx + 1]
            try:
                return json.loads(substring)
            except json.JSONDecodeError:
                # Clean trailing commas before close braces
                sanitized = re.sub(r",\s*([}\]])", r"\1", substring)
                return json.loads(sanitized)

        raise ValueError(f"Could not parse valid JSON from response: {response_text[:200]}...")

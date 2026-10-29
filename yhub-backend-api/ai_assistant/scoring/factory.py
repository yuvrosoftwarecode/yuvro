import logging
from typing import Any, Dict, List, Optional, Type
from .base import BaseLabEvaluator
from .system_design import SystemDesignLabEvaluator
from .practical import PracticalLabEvaluator

logger = logging.getLogger(__name__)


class LabScoreEvaluatorFactory:
    """
    Factory Method Pattern implementation for Lab AI Scoring.
    Dynamically creates and configures the appropriate evaluator based on lab type.
    """

    _registry: Dict[str, Type[BaseLabEvaluator]] = {
        "system_design": SystemDesignLabEvaluator,
        "systemdesign": SystemDesignLabEvaluator,
        "sys_design": SystemDesignLabEvaluator,
        "practical": PracticalLabEvaluator,
        "code": PracticalLabEvaluator,
        "programming": PracticalLabEvaluator,
    }

    @classmethod
    def get_evaluator(
        cls,
        lab_type: str = "system_design",
        provider: str = "deepseek",
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        **kwargs: Any,
    ) -> BaseLabEvaluator:
        """
        Factory method returning an instantiated BaseLabEvaluator.
        Defaults to SystemDesignLabEvaluator using DeepSeek model.
        """
        key = (lab_type or "system_design").lower().replace("-", "_").strip()
        evaluator_class = cls._registry.get(key)

        if not evaluator_class:
            logger.warning(
                f"Unrecognized lab_type '{lab_type}'. Defaulting to SystemDesignLabEvaluator."
            )
            evaluator_class = SystemDesignLabEvaluator

        return evaluator_class(
            provider=provider or "deepseek",
            model_name=model_name,
            api_key=api_key,
            **kwargs,
        )

    @classmethod
    def register_evaluator(cls, lab_type: str, evaluator_class: Type[BaseLabEvaluator]) -> None:
        """Allows dynamic registration of new lab evaluators."""
        key = lab_type.lower().replace("-", "_").strip()
        cls._registry[key] = evaluator_class
        logger.info(f"Registered evaluator for lab_type '{key}': {evaluator_class.__name__}")

    @classmethod
    def get_supported_types(cls) -> List[str]:
        """Returns the list of supported lab types."""
        return list(cls._registry.keys())

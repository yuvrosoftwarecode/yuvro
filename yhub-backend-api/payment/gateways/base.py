from abc import ABC, abstractmethod
from typing import Any, Dict


class BasePaymentGateway(ABC):
    name = None

    @abstractmethod
    def create_customer(self, customer: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def create_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def capture_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def cancel_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def create_refund(self, payment: Dict[str, Any], amount: float) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_refund(self, refund_id: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    def verify_webhook(self, request) -> bool:
        pass

    @abstractmethod
    def parse_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Return normalized event
        """
        pass

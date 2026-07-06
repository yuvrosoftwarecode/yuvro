import hmac
import hashlib
import json
from typing import Any, Dict, Optional

import requests
from django.conf import settings

from .base import BasePaymentGateway


class RazorpayGateway(BasePaymentGateway):
    name = "razorpay"

    def __init__(self):
        self.base_url = "https://api.razorpay.com/v1"
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET

    def _auth(self):
        return (self.key_id, self.key_secret)

    def _post(self, path: str, data: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(f"{self.base_url}/{path}", json=data, auth=self._auth())
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            import logging
            logging.error(f"Razorpay API Error: {response.text}")
            raise
        return response.json()

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        response = requests.get(f"{self.base_url}/{path}", params=params, auth=self._auth())
        response.raise_for_status()
        return response.json()

    def create_customer(self, customer: Dict[str, Any]) -> Dict[str, Any]:
        data = {
            "name": customer.get("name"),
            "email": customer.get("email"),
            "notes": customer.get("metadata", {}),
            "fail_existing": "0",
        }
        resp = self._post("customers", data)
        return {"customer_id": resp["id"], "raw": resp}

    def create_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        data = {
            "amount": int(payment["amount"] * 100),
            "currency": payment["currency"].upper(),
            "customer_id": payment["customer_id"],
            "receipt": payment.get("payment_id"),
            "notes": payment.get("metadata", {}),
        }
        resp = self._post("orders", data)
        return {
            "order_id": resp["id"],
            "status": resp.get("status", "PENDING"),
            "session_id": None,
            "payment_response": resp,
        }

    def get_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        return self._get(f"orders/{payment['payment_id']}")

    def capture_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        data = {"amount": payment.get("amount")}
        return self._post(f"payments/{payment['payment_id']}/capture", data)

    def cancel_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        return self._post(f"payments/{payment['payment_id']}/refund", {})

    def create_refund(self, payment: Dict[str, Any], amount: float) -> Dict[str, Any]:
        data = {"amount": int(amount * 100)}
        return self._post(f"payments/{payment['payment_id']}/refund", data)

    def get_refund(self, refund_id: str) -> Dict[str, Any]:
        return self._get(f"refunds/{refund_id}")

    def verify_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        secret = settings.RAZORPAY_KEY_SECRET
        payload = f"{order_id}|{payment_id}"
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected)

    def verify_webhook(self, request) -> bool:
        signature = request.headers.get("X-Razorpay-Signature")
        if not signature:
            return False

        payload = request.body.decode("utf-8")
        secret = settings.RAZORPAY_WEBHOOK_SECRET
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected)

    def parse_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "gateway": self.name,
            "event": payload.get("event"),
            "data": payload.get("payload", {}).get("payment", {}),
        }

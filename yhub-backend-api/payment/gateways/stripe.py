import hmac
import hashlib
import json
from typing import Any, Dict, Optional

import requests
from django.conf import settings

from .base import BasePaymentGateway


class StripeGateway(BasePaymentGateway):
    name = "stripe"

    def __init__(self):
        self.base_url = "https://api.stripe.com/v1"
        self.api_key = settings.STRIPE_API_KEY

    def _headers(self):
        return {"Authorization": f"Bearer {self.api_key}"}

    def _post(self, path: str, data: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(f"{self.base_url}/{path}", data=data, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        response = requests.get(f"{self.base_url}/{path}", params=params, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def create_customer(self, customer: Dict[str, Any]) -> Dict[str, Any]:
        data = {
            "email": customer.get("email"),
            "name": customer.get("name"),
            "metadata": json.dumps(customer.get("metadata", {})),
        }
        resp = self._post("customers", data)
        return {"customer_id": resp["id"], "raw": resp}

    def create_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        data = {
            "amount": int(payment["amount"] * 100),
            "currency": payment["currency"].lower(),
            "customer": payment["customer_id"],
            "metadata": json.dumps(payment.get("metadata", {})),
            "description": payment.get("description", ""),
        }
        resp = self._post("payment_intents", data)
        return {
            "payment_id": resp["id"],
            "status": resp["status"].upper(),
            "client_secret": resp.get("client_secret"),
            "payment_response": resp,
        }

    def get_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        return self._get(f"payment_intents/{payment['payment_id']}")

    def capture_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        return self._post(f"payment_intents/{payment['payment_id']}/capture", {})

    def cancel_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        return self._post(f"payment_intents/{payment['payment_id']}/cancel", {})

    def create_refund(self, payment: Dict[str, Any], amount: float) -> Dict[str, Any]:
        data = {
            "payment_intent": payment["payment_id"],
            "amount": int(amount * 100),
        }
        return self._post("refunds", data)

    def get_refund(self, refund_id: str) -> Dict[str, Any]:
        return self._get(f"refunds/{refund_id}")

    def verify_webhook(self, request) -> bool:
        signature = request.headers.get("Stripe-Signature")
        if not signature:
            return False

        payload = request.body.decode("utf-8")
        secret = settings.STRIPE_WEBHOOK_SECRET

        try:
            timestamp, signature = self._parse_signature_header(signature)
            expected = hmac.new(secret.encode(), f"{timestamp}.{payload}".encode(), hashlib.sha256).hexdigest()
            return hmac.compare_digest(signature, expected)
        except ValueError:
            return False

    def _parse_signature_header(self, header: str):
        parts = {}
        for part in header.split(","):
            if "=" not in part:
                continue
            key, value = part.split("=", 1)
            parts[key] = value

        if "t" not in parts or "v1" not in parts:
            raise ValueError("Invalid signature header")

        return parts["t"], parts["v1"]

    def parse_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "gateway": self.name,
            "event": payload.get("type"),
            "data": payload.get("data", {}).get("object", {}),
        }

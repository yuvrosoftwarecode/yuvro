from django.http import response
import hmac
import hashlib
import json
import re
from typing import Any, Dict, Optional
import logging

import requests
from django.conf import settings

from .base import BasePaymentGateway
from payment.models import PaymentStatus



class RazorpayGateway(BasePaymentGateway):
    name = "razorpay"

    def __init__(self):
        self.base_url = "https://api.razorpay.com/v1"
        self.key_id = str(getattr(settings, "RAZORPAY_KEY_ID", "") or "").strip()
        self.key_secret = str(getattr(settings, "RAZORPAY_KEY_SECRET", "") or "").strip()

    def _auth(self):
        if not self.key_id or not self.key_secret:
            logging.error(f"RazorpayGateway initialized with missing credentials: key_id='{self.key_id}', key_secret present={bool(self.key_secret)}")
        return (self.key_id, self.key_secret)

    def _post(self, path: str, data: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(f"{self.base_url}/{path}", json=data, auth=self._auth())

        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            logging.error(f"Razorpay API Error [{path}]: {response.text}")
            try:
                err_json = response.json()
                err_desc = err_json.get("error", {}).get("description") or response.text
                masked_key = f"{self.key_id[:8]}...{self.key_id[-4:]}" if len(self.key_id) > 12 else (self.key_id or "EMPTY")
                raise Exception(f"{err_desc} (key: {masked_key})") from e
            except Exception as parse_err:
                if parse_err is not e:
                    raise
            raise
        return response.json()

    def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        response = requests.get(f"{self.base_url}/{path}", params=params, auth=self._auth())
        response.raise_for_status()
        return response.json()

    def create_customer(self, customer: Dict[str, Any]) -> Dict[str, Any]:
        raw_name = (customer.get("name") or "").strip()
        clean_name = re.sub(r"[^a-zA-Z0-9\s\.\-]", "", raw_name).strip()
        if len(clean_name) < 3:
            email = (customer.get("email") or "").strip()
            clean_email_prefix = re.sub(r"[^a-zA-Z0-9\s\.\-]", "", email.split("@")[0]).strip()
            clean_name = clean_email_prefix if len(clean_email_prefix) >= 3 else "Customer"

        data = {
            "name": clean_name[:50],
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
            "receipt": payment.get("payment_id"),
            "notes": payment.get("metadata", {}),
        }
        if payment.get("customer_id"):
            data["customer_id"] = payment["customer_id"]

        resp = self._post("orders", data)
        return {
            "order_id": resp["id"],
            "status": resp.get("status", "PENDING"),
            "session_id": None,
            "payment_response": resp,
        }

    def get_payment(self, payment: Dict[str, Any]) -> Dict[str, Any]:
        return self._get(f"payments/{payment['payment_id']}")
        
    def get_order(self, order_id: str) -> Dict[str, Any]:
        return self._get(f"orders/{order_id}")
        
    def map_status(self, gateway_status: str) -> str:        
        status_map = {
            "created": PaymentStatus.CREATED,
            "attempted": PaymentStatus.PENDING,
            "paid": PaymentStatus.SUCCESS_OR_CAPTURED,
            
            "authorized": PaymentStatus.AUTHORIZED,
            "captured": PaymentStatus.SUCCESS_OR_CAPTURED,
            "failed": PaymentStatus.FAILED,
            "refunded": PaymentStatus.REFUNDED,
        }
        return status_map.get(gateway_status.lower(), PaymentStatus.PENDING)

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
        secret = self.key_secret or getattr(settings, "RAZORPAY_KEY_SECRET", "")
        if not secret:
            return False
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

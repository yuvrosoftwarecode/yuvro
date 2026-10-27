from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Payment, PaymentStatus


User = get_user_model()


class MockGateway:
    def __init__(self, gateway_name):
        self.gateway_name = gateway_name

    def create_customer(self, customer):
        return {
            "customer_id": f"{self.gateway_name}_customer_123",
            "email": customer.get("email"),
            "raw": {"id": f"{self.gateway_name}_customer_123"},
        }

    def create_payment(self, payment):
        if self.gateway_name == "razorpay":
            return {
                "id": "order_razorpay_123",
                "order_id": "order_razorpay_123",
                "status": "created",
                "session_id": None,
                "amount": float(payment["amount"]),
                "currency": payment["currency"],
            }
        return {
            "id": "pi_stripe_123",
            "payment_id": "pi_stripe_123",
            "status": "requires_payment_method",
            "client_secret": "cs_test_123",
            "amount": float(payment["amount"]),
            "currency": payment["currency"],
        }

    def get_payment(self, payment):
        return {"status": "authorized", "id": payment["payment_id"]}

    def capture_payment(self, payment):
        return {"status": "success_or_captured", "id": payment["payment_id"]}

    def cancel_payment(self, payment):
        return {"status": "cancelled", "id": payment["payment_id"]}

    def create_refund(self, payment, amount):
        return {"id": "rf_test_123", "amount": float(amount), "status": "refunded"}

    def verify_webhook(self, request):
        return True

    def parse_webhook(self, payload):
        return {"gateway": self.gateway_name, "event": "payment.authorized"}


class PaymentApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="payer@example.com",
            username="payer",
            password="secret123",
        )
        self.client.force_authenticate(user=self.user)

    @patch("payment.payment_service.PaymentGatewayFactory.get_gateway")
    def test_create_payment_with_razorpay_mock_response(self, mock_get_gateway):
        mock_get_gateway.return_value = MockGateway("razorpay")

        url = reverse("payment:payment-list")
        payload = {
            "amount": 1000.0,
            "currency": "INR",
            "purpose": "course",
            "description": "Course enrollment",
            "gateway": "razorpay",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["gateway"], "razorpay")
        self.assertEqual(response.data["status"], PaymentStatus.PENDING)
        self.assertTrue(Payment.objects.filter(user=self.user).exists())

    @patch("payment.payment_service.PaymentGatewayFactory.get_gateway")
    def test_capture_payment_with_stripe_mock_response(self, mock_get_gateway):
        mock_get_gateway.return_value = MockGateway("stripe")
        payment = Payment.objects.create(
            user=self.user,
            amount=500.0,
            currency="INR",
            gateway="stripe",
            purpose="course",
            description="Test payment",
            status=PaymentStatus.AUTHORIZED,
            gateway_payment_or_charge_id="pi_stripe_123",
        )

        url = reverse("payment:payment-capture", args=[payment.id])
        response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success_or_captured")

from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from mockinterviews.models import (
    CandidateMockInterviewQuota,
    MockInterviewPack,
    MockInterviewCreditLedger,
    MockInterview,
    DEFAULT_MOCK_PACKS,
)
from payment.models import Payment, PaymentStatus, PurchasableItem, PurchasableType

User = get_user_model()


class MockInterviewQuotaTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="candidate1",
            email="candidate1@yuvro.com",
            password="testpassword123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Seed default packs
        for p in DEFAULT_MOCK_PACKS:
            MockInterviewPack.objects.update_or_create(id=p["id"], defaults=p)

        self.interview = MockInterview.objects.create(
            title="Python Backend Engineer",
            description="Django & Python technical interview",
            created_by=self.user,
            publish_status="active",
            interview_mode="automatic",
            max_duration=30,
        )

    def test_default_initial_grant_is_3(self):
        """Candidate automatically receives 3 free mock interviews on first access."""
        quota = CandidateMockInterviewQuota.get_or_create_quota(self.user)
        self.assertEqual(quota.free_interviews, 3)
        self.assertEqual(quota.purchased_interviews, 0)
        self.assertEqual(quota.used_interviews, 0)
        self.assertEqual(quota.available_interviews, 3)
        self.assertEqual(quota.total_granted, 3)

        # Check ledger entry
        ledger = MockInterviewCreditLedger.objects.filter(user=self.user).first()
        self.assertIsNotNone(ledger)
        self.assertEqual(ledger.entry_type, MockInterviewCreditLedger.TYPE_INITIAL_GRANT)
        self.assertEqual(ledger.delta, 3)
        self.assertEqual(ledger.balance_after, 3)

    def test_quota_api_endpoint(self):
        """GET /api/mock-interviews/quota/ returns candidate's available interviews."""
        response = self.client.get("/api/mock-interviews/quota/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["available_interviews"], 3)
        self.assertEqual(response.data["free_interviews"], 3)
        self.assertEqual(response.data["purchased_interviews"], 0)
        self.assertEqual(response.data["used_interviews"], 0)

    def test_packs_api_endpoint(self):
        """GET /api/mock-interviews/packs/ returns the 3 pricing tiers (1: 99, 5: 399, 10: 700)."""
        response = self.client.get("/api/mock-interviews/packs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        pack_1 = next(p for p in response.data if p["id"] == "mock_pack_1")
        self.assertEqual(pack_1["interviews_count"], 1)
        self.assertEqual(float(pack_1["price_inr"]), 99.00)
        self.assertEqual(pack_1["price_paise"], 9900)

        pack_5 = next(p for p in response.data if p["id"] == "mock_pack_5")
        self.assertEqual(pack_5["interviews_count"], 5)
        self.assertEqual(float(pack_5["price_inr"]), 399.00)
        self.assertEqual(pack_5["price_paise"], 39900)

        pack_10 = next(p for p in response.data if p["id"] == "mock_pack_10")
        self.assertEqual(pack_10["interviews_count"], 10)
        self.assertEqual(float(pack_10["price_inr"]), 700.00)
        self.assertEqual(pack_10["price_paise"], 70000)

    @patch("payment.gateways.razorpay.RazorpayGateway.create_customer")
    @patch("payment.gateways.razorpay.RazorpayGateway.create_payment")
    def test_create_order_for_pack(self, mock_create_payment, mock_create_customer):
        """POST /api/mock-interviews/create_order/ creates a Razorpay order for mock interview pack."""
        mock_create_customer.return_value = {"customer_id": "cust_mock_1", "raw": {}}
        mock_create_payment.return_value = {
            "order_id": "order_mock_123",
            "session_id": None,
            "status": "created",
            "payment_response": {"id": "order_mock_123"},
        }

        response = self.client.post("/api/mock-interviews/create_order/", {"pack_id": "mock_pack_5"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["order_id"], "order_mock_123")
        self.assertEqual(response.data["amount"], 39900)
        self.assertEqual(response.data["currency"], "INR")
        self.assertEqual(response.data["interviews_count"], 5)

        # Payment record created in DB
        payment = Payment.objects.get(gateway_order_or_intent_id="order_mock_123")
        self.assertEqual(payment.user, self.user)
        self.assertEqual(float(payment.amount), 399.00)

    @patch("payment.gateways.razorpay.RazorpayGateway.verify_signature")
    def test_verify_payment_credits_mock_interviews(self, mock_verify_signature):
        """POST /api/mock-interviews/verify_payment/ credits interviews upon valid HMAC signature."""
        mock_verify_signature.return_value = True

        purchasable_item = PurchasableItem.objects.create(
            item_type=PurchasableType.MOCK_INTERVIEW,
            item_id="mock_pack_5",
            name="5 Mock Interviews",
            current_price=Decimal("399.00"),
        )
        payment = Payment.objects.create(
            user=self.user,
            gateway="razorpay",
            amount=Decimal("399.00"),
            currency="INR",
            purpose="Mock Interview - 5 Mock Interviews",
            status=PaymentStatus.PENDING,
            gateway_order_or_intent_id="order_mock_verify_456",
            purchasable_item=purchasable_item,
            metadata={"pack_id": "mock_pack_5", "interviews_count": 5},
        )

        response = self.client.post(
            "/api/mock-interviews/verify_payment/",
            {
                "gateway_order_id": "order_mock_verify_456",
                "gateway_payment_id": "pay_mock_789",
                "signature": "valid_signature_123",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "SUCCESS")
        self.assertEqual(response.data["quota"]["available_interviews"], 8) # 3 initial + 5 purchased
        self.assertEqual(response.data["quota"]["purchased_interviews"], 5)

        # Verify quota and ledger
        quota = CandidateMockInterviewQuota.objects.get(user=self.user)
        self.assertEqual(quota.available_interviews, 8)

        ledger = MockInterviewCreditLedger.objects.filter(
            user=self.user, entry_type=MockInterviewCreditLedger.TYPE_PURCHASE
        ).first()
        self.assertIsNotNone(ledger)
        self.assertEqual(ledger.delta, 5)
        self.assertEqual(ledger.balance_after, 8)

    def test_quota_blocks_start_when_exhausted(self):
        """Candidate with 0 mock interviews remaining is blocked with HTTP 402."""
        quota = CandidateMockInterviewQuota.get_or_create_quota(self.user)
        quota.used_interviews = 3 # All 3 consumed
        quota.save()
        self.assertEqual(quota.available_interviews, 0)

        response = self.client.post(
            f"/api/mock-interviews/{self.interview.id}/start_interview/",
            {"source": "student", "force": True},
        )
        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(response.data["code"], "INSUFFICIENT_MOCK_INTERVIEWS")
        self.assertEqual(response.data["available_interviews"], 0)

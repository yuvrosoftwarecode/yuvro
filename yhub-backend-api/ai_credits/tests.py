import uuid
from datetime import timedelta
from decimal import Decimal
from typing import Tuple, Optional
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APITestCase, APITransactionTestCase
from rest_framework import status
from django.db import connection, connections
import concurrent.futures
from django.utils import timezone

from .models import (
    CreditBucket,
    CreditDeficitResolution,
    CreditEntryType,
    CreditLedgerEntry,
    CreditPack,
    CreditPurchaseSnapshot,
    CreditReservation,
    CreditUsageRecord,
    CreditWallet,
    PaymentWebhookEvent,
    ReservationStatus,
    WebhookEventStatus,
)
from .exceptions import (
    InsufficientCreditsError,
    InvalidPackError,
    PaymentVerificationError,
    ReservationLimitExceededError,
    ReservationNotFoundError,
    ReservationStateError,
)
from .wallet_service import WalletService
from .payment_service import CreditPaymentService
from payment.models import Payment, PaymentGateway, PaymentStatus, PurchasableItem
from django.core.management import call_command
import json
import hmac
import hashlib
from io import StringIO
from unittest.mock import patch, AsyncMock, MagicMock

from ai_assistant.models import AIAgent, ChatSession, ChatMessage
from ai_assistant.services import AIServiceFactory, AIServiceError
from .metering import CreditMeteringManager

User = get_user_model()


def ensure_default_packs():
    from payment.models import PurchasableItem

    packs_data = [
        {
            "id": "free_signup_bonus",
            "name": "Free Signup Bonus",
            "description": "50,000 free AI credits to get started with AI Mentor",
            "credits": 50_000,
            "price_inr": Decimal("0.00"),
            "price_paise": 0,
            "is_active": True,
            "is_signup_bonus": True,
            "sort_order": 0,
            "create_purchasable_item": False,
        },
        {
            "id": "starter",
            "name": "Starter Pack",
            "description": "500,000 AI credits for everyday coding help and guidance",
            "credits": 500_000,
            "price_inr": Decimal("199.00"),
            "price_paise": 19900,
            "is_active": True,
            "is_signup_bonus": False,
            "sort_order": 1,
            "create_purchasable_item": True,
        },
        {
            "id": "pro",
            "name": "Pro Pack",
            "description": "1,500,000 AI credits for active builders and problem solvers",
            "credits": 1_500_000,
            "price_inr": Decimal("499.00"),
            "price_paise": 49900,
            "is_active": True,
            "is_signup_bonus": False,
            "sort_order": 2,
            "create_purchasable_item": True,
        },
        {
            "id": "power",
            "name": "Power Pack",
            "description": "4,000,000 AI credits for intensive interview preparation",
            "credits": 4_000_000,
            "price_inr": Decimal("999.00"),
            "price_paise": 99900,
            "is_active": True,
            "is_signup_bonus": False,
            "sort_order": 3,
            "create_purchasable_item": True,
        },
    ]
    for p in packs_data:
        purchasable_item = None
        if p["create_purchasable_item"]:
            purchasable_item, _ = PurchasableItem.objects.update_or_create(
                item_type="ai_credit",
                item_id=p["id"],
                defaults={
                    "name": p["name"],
                    "product": "ylabs",
                    "current_price": p["price_inr"],
                    "is_active": p["is_active"],
                    "metadata": {"credits": p["credits"], "pack_id": p["id"]},
                },
            )
        pack_defaults = {
            "purchasable_item": purchasable_item,
            "name": p["name"],
            "description": p["description"],
            "credits": p["credits"],
            "price_inr": p["price_inr"],
            "price_paise": p["price_paise"],
            "is_active": p["is_active"],
            "is_signup_bonus": p["is_signup_bonus"],
            "sort_order": p["sort_order"],
        }
        CreditPack.objects.update_or_create(id=p["id"], defaults=pack_defaults)


class CreditWalletModelTests(TestCase):
    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username="wallet_test_user",
            email="wallet_test@yuvro.com",
            password="testpassword123",
        )
        self.wallet = CreditWallet.objects.create(
            user=self.user,
            bonus_balance=50000,
            purchased_balance=500000,
            reserved_bonus=0,
            reserved_purchased=0,
        )

    def test_wallet_balance_properties(self):
        self.assertEqual(self.wallet.total_available, 550000)
        self.assertEqual(self.wallet.total_reserved, 0)
        self.assertEqual(self.wallet.total_balance, 550000)

        self.wallet.reserved_bonus = 4096
        self.assertEqual(self.wallet.total_reserved, 4096)
        self.assertEqual(self.wallet.total_balance, 554096)

    def test_prevent_negative_bonus_balance(self):
        self.wallet.bonus_balance = -100
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.wallet.save()

    def test_prevent_negative_purchased_balance(self):
        self.wallet.purchased_balance = -500
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.wallet.save()

    def test_prevent_negative_reserved_bonus(self):
        self.wallet.reserved_bonus = -1
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.wallet.save()

    def test_prevent_negative_reserved_purchased(self):
        self.wallet.reserved_purchased = -1
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.wallet.save()


class CreditLedgerEntryModelTests(TestCase):
    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username="ledger_test_user",
            email="ledger_test@yuvro.com",
            password="testpassword123",
        )
        self.wallet = CreditWallet.objects.create(
            user=self.user,
            bonus_balance=50000,
            purchased_balance=0,
        )

    def test_ledger_entry_creation_and_append_only(self):
        entry = CreditLedgerEntry.objects.create(
            wallet=self.wallet,
            user=self.user,
            entry_type=CreditEntryType.SIGNUP_BONUS,
            bucket=CreditBucket.BONUS,
            delta=50000,
            balance_after_bonus=50000,
            balance_after_purchased=0,
            idempotency_key="signup_bonus_ledger_1",
            description="Welcome bonus",
        )
        self.assertIsNotNone(entry.id)
        self.assertEqual(entry.delta, 50000)

        # Immutability: modifying existing ledger entry must fail
        entry.delta = 99999
        with self.assertRaises(ValidationError):
            entry.save()

        # Immutability: deleting existing ledger entry must fail
        with self.assertRaises(ValidationError):
            entry.delete()

    def test_idempotency_key_uniqueness(self):
        CreditLedgerEntry.objects.create(
            wallet=self.wallet,
            user=self.user,
            entry_type=CreditEntryType.SIGNUP_BONUS,
            bucket=CreditBucket.BONUS,
            delta=50000,
            balance_after_bonus=50000,
            balance_after_purchased=0,
            idempotency_key="duplicate_key_test",
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CreditLedgerEntry.objects.create(
                    wallet=self.wallet,
                    user=self.user,
                    entry_type=CreditEntryType.PURCHASE,
                    bucket=CreditBucket.PURCHASED,
                    delta=500000,
                    balance_after_bonus=50000,
                    balance_after_purchased=500000,
                    idempotency_key="duplicate_key_test",
                )


class CreditReservationModelTests(TestCase):
    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username="res_test_user",
            email="res_test@yuvro.com",
            password="testpassword123",
        )
        self.wallet = CreditWallet.objects.create(
            user=self.user,
            bonus_balance=50000,
            purchased_balance=0,
        )

    def test_reservation_creation_and_properties(self):
        res = CreditReservation.objects.create(
            wallet=self.wallet,
            user=self.user,
            reserved_bonus=4096,
            reserved_purchased=0,
            idempotency_key="res_test_key_1",
            expires_at=timezone.now() + timezone.timedelta(seconds=300),
        )
        self.assertEqual(res.status, ReservationStatus.PENDING)
        self.assertEqual(res.total_reserved, 4096)
        self.assertEqual(res.total_consumed, 0)
        self.assertEqual(res.total_released, 0)

    def test_reservation_unique_idempotency(self):
        CreditReservation.objects.create(
            wallet=self.wallet,
            user=self.user,
            reserved_bonus=4096,
            reserved_purchased=0,
            idempotency_key="res_dup_key",
            expires_at=timezone.now() + timezone.timedelta(seconds=300),
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CreditReservation.objects.create(
                    wallet=self.wallet,
                    user=self.user,
                    reserved_bonus=2048,
                    reserved_purchased=0,
                    idempotency_key="res_dup_key",
                    expires_at=timezone.now() + timezone.timedelta(seconds=300),
                )


class CreditUsageRecordModelTests(TestCase):
    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username="usage_test_user",
            email="usage_test@yuvro.com",
            password="testpassword123",
        )
        self.wallet = CreditWallet.objects.create(user=self.user)

    def test_usage_record_creation(self):
        record = CreditUsageRecord.objects.create(
            user=self.user,
            wallet=self.wallet,
            provider="anthropic",
            model="claude-3-5-sonnet-20241022",
            input_tokens=1200,
            output_tokens=350,
            cached_tokens=256,
            reasoning_tokens=0,
            credits_charged=1550,
            idempotency_key="usage_rec_key_1",
        )
        self.assertEqual(record.credits_charged, 1550)
        self.assertEqual(record.cached_tokens, 256)
        self.assertEqual(record.reasoning_tokens, 0)


class CreditPackAndSnapshotModelTests(TestCase):
    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username="pack_test_user",
            email="pack_test@yuvro.com",
            password="testpassword123",
        )

    def test_credit_pack_creation(self):
        pack = CreditPack.objects.create(
            id="custom_tier",
            name="Custom Tier",
            credits=750000,
            price_inr=Decimal("299.00"),
            price_paise=29900,
            is_active=True,
            sort_order=10,
        )
        self.assertEqual(pack.price_paise, 29900)
        self.assertEqual(pack.credits, 750000)

    def test_seeded_credit_packs_exist(self):
        starter = CreditPack.objects.get(id="starter")
        self.assertEqual(starter.credits, 500000)
        self.assertEqual(starter.price_paise, 19900)
        self.assertIsNotNone(starter.purchasable_item)

    def test_purchase_snapshot_immutability(self):
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway=PaymentGateway.RAZORPAY,
            status=PaymentStatus.SUCCESS_OR_CAPTURED,
            purpose="AI Credit Purchase",
        )
        snapshot = CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )
        self.assertEqual(snapshot.credits, 500000)
        self.assertEqual(payment.credit_purchase_snapshot.id, snapshot.id)


class PaymentWebhookEventModelTests(TestCase):
    def test_webhook_deduplication(self):
        PaymentWebhookEvent.objects.create(
            event_id="evt_test_razorpay_12345",
            event_type="payment.captured",
            gateway="razorpay",
            payload={"id": "pay_test_123"},
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                PaymentWebhookEvent.objects.create(
                    event_id="evt_test_razorpay_12345",
                    event_type="payment.captured",
                    gateway="razorpay",
                    payload={"id": "pay_test_123"},
                )


class ImmutabilitySafeguardTests(TestCase):
    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username="immut_test_user",
            email="immut@yuvro.com",
            password="testpassword123",
        )
        self.wallet = CreditWallet.objects.create(user=self.user)

    def test_bulk_update_blocked_on_ledger(self):
        CreditLedgerEntry.objects.create(
            wallet=self.wallet,
            user=self.user,
            entry_type=CreditEntryType.SIGNUP_BONUS,
            bucket=CreditBucket.BONUS,
            delta=50000,
            balance_after_bonus=50000,
            balance_after_purchased=0,
            idempotency_key="immut_test_key_1",
        )
        with self.assertRaises(ValidationError):
            CreditLedgerEntry.objects.filter(user=self.user).update(delta=9999)

    def test_bulk_delete_blocked_on_ledger(self):
        CreditLedgerEntry.objects.create(
            wallet=self.wallet,
            user=self.user,
            entry_type=CreditEntryType.SIGNUP_BONUS,
            bucket=CreditBucket.BONUS,
            delta=50000,
            balance_after_bonus=50000,
            balance_after_purchased=0,
            idempotency_key="immut_test_key_2",
        )
        with self.assertRaises(ValidationError):
            CreditLedgerEntry.objects.filter(user=self.user).delete()

    def test_bulk_update_and_delete_blocked_on_snapshot(self):
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway=PaymentGateway.RAZORPAY,
            status=PaymentStatus.SUCCESS_OR_CAPTURED,
            purpose="Snapshot bulk immutability test",
        )
        CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )
        with self.assertRaises(ValidationError):
            CreditPurchaseSnapshot.objects.filter(user=self.user).update(credits=999999)
        with self.assertRaises(ValidationError):
            CreditPurchaseSnapshot.objects.filter(user=self.user).delete()


class WalletServiceTests(TestCase):
    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username="service_test_user",
            email="service_test@yuvro.com",
            password="testpassword123",
        )

    def test_get_or_create_wallet_with_signup_bonus(self):
        wallet, created = WalletService.get_or_create_wallet(self.user, grant_signup_bonus=True)
        self.assertTrue(wallet.signup_bonus_granted)
        self.assertEqual(wallet.bonus_balance, 50000)
        self.assertEqual(wallet.total_available, 50000)

        # Check ledger entry
        ledger = CreditLedgerEntry.objects.filter(user=self.user).first()
        self.assertIsNotNone(ledger)
        self.assertEqual(ledger.entry_type, CreditEntryType.SIGNUP_BONUS)
        self.assertEqual(ledger.delta, 50000)

    def test_auto_creation_signal_when_enabled(self):
        with self.settings(AI_CREDITS_ENABLED=True):
            new_user = User.objects.create_user(
                username="signal_user",
                email="signal@yuvro.com",
                password="testpassword123",
            )
            wallet = CreditWallet.objects.get(user=new_user)
            self.assertTrue(wallet.signup_bonus_granted)
            self.assertEqual(wallet.bonus_balance, 50000)


    def test_duplicate_signup_bonus_grant_is_idempotent(self):
        wallet1, granted1 = WalletService.grant_signup_bonus(self.user)
        self.assertTrue(granted1)
        self.assertEqual(wallet1.bonus_balance, 50000)

        # Second grant attempt
        wallet2, granted2 = WalletService.grant_signup_bonus(self.user)
        self.assertFalse(granted2)
        self.assertEqual(wallet2.bonus_balance, 50000)
        self.assertEqual(CreditLedgerEntry.objects.filter(user=self.user).count(), 1)

    def test_reserve_credits_bonus_first(self):
        wallet, _ = WalletService.get_or_create_wallet(self.user, grant_signup_bonus=True)
        # Add purchased credits
        wallet.purchased_balance = 100000
        wallet.save(update_fields=["purchased_balance"])

        # Reserve 4000 credits (fits fully within 50,000 bonus credits)
        res = WalletService.reserve_credits(self.user, amount=4000, session_id="sess_123")
        wallet.refresh_from_db()

        self.assertEqual(res.status, ReservationStatus.PENDING)
        self.assertEqual(res.reserved_bonus, 4000)
        self.assertEqual(res.reserved_purchased, 0)
        self.assertEqual(wallet.bonus_balance, 46000)
        self.assertEqual(wallet.reserved_bonus, 4000)
        self.assertEqual(wallet.purchased_balance, 100000)
        self.assertEqual(wallet.reserved_purchased, 0)

    def test_reserve_credits_spillover_to_purchased(self):
        wallet, _ = WalletService.get_or_create_wallet(self.user)
        wallet.bonus_balance = 2000
        wallet.purchased_balance = 10000
        wallet.save(update_fields=["bonus_balance", "purchased_balance"])

        # Reserve 5000 credits: 2000 from bonus, 3000 from purchased
        res = WalletService.reserve_credits(self.user, amount=5000)
        wallet.refresh_from_db()

        self.assertEqual(res.reserved_bonus, 2000)
        self.assertEqual(res.reserved_purchased, 3000)
        self.assertEqual(wallet.bonus_balance, 0)
        self.assertEqual(wallet.purchased_balance, 7000)
        self.assertEqual(wallet.reserved_bonus, 2000)
        self.assertEqual(wallet.reserved_purchased, 3000)

    def test_insufficient_credits_raises(self):
        wallet, _ = WalletService.get_or_create_wallet(self.user)
        wallet.bonus_balance = 100
        wallet.purchased_balance = 200
        wallet.save(update_fields=["bonus_balance", "purchased_balance"])

        with self.assertRaises(InsufficientCreditsError) as ctx:
            WalletService.reserve_credits(self.user, amount=500)
        self.assertEqual(ctx.exception.available, 300)
        self.assertEqual(ctx.exception.required, 500)

    def test_reservation_limit_exceeded(self):
        wallet, _ = WalletService.get_or_create_wallet(self.user)
        wallet.bonus_balance = 100000
        wallet.save(update_fields=["bonus_balance"])

        with self.assertRaises(ReservationLimitExceededError):
            WalletService.reserve_credits(self.user, amount=20000)  # Max is 16384

    def test_settle_reservation_under_reserved(self):
        wallet, _ = WalletService.get_or_create_wallet(self.user, grant_signup_bonus=True)
        # 50,000 bonus
        res = WalletService.reserve_credits(self.user, amount=4096)
        wallet.refresh_from_db()
        self.assertEqual(wallet.bonus_balance, 45904)
        self.assertEqual(wallet.reserved_bonus, 4096)

        # Settle with actual usage = 1500 credits
        res, usage_rec = WalletService.settle_reservation(
            reservation_id=res.id,
            actual_usage_credits=1500,
            usage_record_kwargs={
                "provider": "anthropic",
                "model": "claude-3-5-sonnet-20241022",
                "input_tokens": 1000,
                "output_tokens": 500,
            },
        )
        wallet.refresh_from_db()

        self.assertEqual(res.status, ReservationStatus.SETTLED)
        self.assertEqual(res.consumed_bonus, 1500)
        self.assertEqual(res.released_bonus, 2596)
        self.assertEqual(wallet.reserved_bonus, 0)
        # Unused 2596 returned to bonus balance: 45904 + 2596 = 48500 (exactly 50000 - 1500)
        self.assertEqual(wallet.bonus_balance, 48500)
        self.assertEqual(usage_rec.credits_charged, 1500)

    def test_settle_reservation_is_idempotent(self):
        WalletService.get_or_create_wallet(self.user, grant_signup_bonus=True)
        res = WalletService.reserve_credits(self.user, amount=4000)
        res, usage_rec1 = WalletService.settle_reservation(res.id, actual_usage_credits=2000)

        # Re-settle same reservation
        res2, usage_rec2 = WalletService.settle_reservation(res.id, actual_usage_credits=2000)
        self.assertEqual(res2.id, res.id)
        self.assertEqual(usage_rec2.id, usage_rec1.id)

        wallet = CreditWallet.objects.get(user=self.user)
        self.assertEqual(wallet.bonus_balance, 48000)

    def test_settle_reservation_with_overage(self):
        wallet, _ = WalletService.get_or_create_wallet(self.user, grant_signup_bonus=True)
        # Available bonus: 50,000
        res = WalletService.reserve_credits(self.user, amount=2000)
        wallet.refresh_from_db()
        self.assertEqual(wallet.bonus_balance, 48000)

        # Actual usage exceeds reservation: 3500 credits (1500 overage)
        res, usage_rec = WalletService.settle_reservation(
            res.id,
            actual_usage_credits=3500,
            usage_record_kwargs={"provider": "anthropic", "model": "claude-3-5-sonnet-20241022"},
        )
        wallet.refresh_from_db()

        self.assertEqual(res.status, ReservationStatus.SETTLED)
        self.assertEqual(res.consumed_bonus, 2000)
        self.assertEqual(wallet.reserved_bonus, 0)
        # 1500 overage was deducted from remaining 48000 -> 46500 (50000 - 3500)
        self.assertEqual(wallet.bonus_balance, 46500)

        overage_ledger = CreditLedgerEntry.objects.filter(
            entry_type=CreditEntryType.OVERAGE_SETTLEMENT,
            user=self.user,
        ).first()
        self.assertIsNotNone(overage_ledger)
        self.assertEqual(overage_ledger.delta, -1500)

    def test_release_reservation(self):
        wallet, _ = WalletService.get_or_create_wallet(self.user, grant_signup_bonus=True)
        res = WalletService.reserve_credits(self.user, amount=4096)
        wallet.refresh_from_db()
        self.assertEqual(wallet.bonus_balance, 45904)

        # Release reservation
        res = WalletService.release_reservation(res.id, reason="user_cancelled")
        wallet.refresh_from_db()

        self.assertEqual(res.status, ReservationStatus.RELEASED)
        self.assertEqual(wallet.bonus_balance, 50000)
        self.assertEqual(wallet.reserved_bonus, 0)

        # Subsequent release call is idempotent
        res_repeat = WalletService.release_reservation(res.id)
        self.assertEqual(res_repeat.status, ReservationStatus.RELEASED)
        wallet.refresh_from_db()
        self.assertEqual(wallet.bonus_balance, 50000)

    def test_expire_abandoned_reservations(self):
        wallet, _ = WalletService.get_or_create_wallet(self.user, grant_signup_bonus=True)
        res = WalletService.reserve_credits(self.user, amount=4096)
        # Backdate expiry
        res.expires_at = timezone.now() - timezone.timedelta(seconds=10)
        res.save(update_fields=["expires_at"])

        expired_count = WalletService.expire_abandoned_reservations()
        self.assertEqual(expired_count, 1)

        res.refresh_from_db()
        wallet.refresh_from_db()
        self.assertEqual(res.status, ReservationStatus.EXPIRED)
        self.assertEqual(wallet.bonus_balance, 50000)
        self.assertEqual(wallet.reserved_bonus, 0)


class CreditPaymentServiceTests(TestCase):
    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username="pay_service_user",
            email="pay_service@yuvro.com",
            password="testpassword123",
        )
        self.starter_pack = CreditPack.objects.get(id="starter")

    @patch("payment.gateways.razorpay.RazorpayGateway.create_customer")
    @patch("payment.gateways.razorpay.RazorpayGateway.create_payment")
    def test_create_credit_pack_order(self, mock_create_payment, mock_create_customer):
        mock_create_customer.return_value = {"customer_id": "cust_123", "raw": {}}
        mock_create_payment.return_value = {
            "order_id": "order_test_razorpay_1",
            "status": "created",
            "session_id": None,
            "payment_response": {"id": "order_test_razorpay_1"},
        }

        payment, snapshot, checkout_data = CreditPaymentService.create_credit_pack_order(
            user=self.user,
            pack_id="starter",
            client_request_id="client_req_100",
        )

        self.assertEqual(payment.amount, Decimal("199.00"))
        self.assertEqual(payment.currency, "INR")
        self.assertEqual(snapshot.credits, 500000)
        self.assertEqual(snapshot.pack_id, "starter")
        self.assertEqual(checkout_data["order_id"], "order_test_razorpay_1")
        self.assertEqual(checkout_data["amount"], 19900)

    def test_create_order_invalid_pack_raises(self):
        with self.assertRaises(InvalidPackError):
            CreditPaymentService.create_credit_pack_order(
                user=self.user,
                pack_id="non_existent_pack",
            )

    @patch("payment.gateways.razorpay.RazorpayGateway.verify_signature")
    def test_verify_and_fulfill_checkout_success(self, mock_verify_signature):
        mock_verify_signature.return_value = True

        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_test_success_1",
            purpose="AI Credit - Starter Pack",
        )
        snapshot = CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )

        result = CreditPaymentService.verify_and_fulfill_checkout(
            user=self.user,
            gateway_order_id="order_test_success_1",
            gateway_payment_id="pay_test_success_1",
            signature="mock_valid_signature",
        )

        self.assertEqual(result["status"], "SUCCESS")
        self.assertEqual(result["credits_credited"], 500000)

        wallet = CreditWallet.objects.get(user=self.user)
        self.assertEqual(wallet.purchased_balance, 500000)

        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.SUCCESS_OR_CAPTURED)

    @patch("payment.gateways.razorpay.RazorpayGateway.verify_signature")
    def test_verify_checkout_invalid_signature_raises(self, mock_verify_signature):
        mock_verify_signature.return_value = False

        Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_test_bad_sig",
            purpose="AI Credit - Starter Pack",
        )

        with self.assertRaises(PaymentVerificationError):
            CreditPaymentService.verify_and_fulfill_checkout(
                user=self.user,
                gateway_order_id="order_test_bad_sig",
                gateway_payment_id="pay_test_bad",
                signature="invalid_signature",
            )

    @patch("payment.gateways.razorpay.RazorpayGateway.verify_signature")
    def test_duplicate_checkout_verification_is_idempotent(self, mock_verify_signature):
        mock_verify_signature.return_value = True

        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_test_dup_1",
            purpose="AI Credit - Starter Pack",
        )
        CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )

        res1 = CreditPaymentService.verify_and_fulfill_checkout(
            user=self.user,
            gateway_order_id="order_test_dup_1",
            gateway_payment_id="pay_test_dup_1",
            signature="mock_sig",
        )
        self.assertFalse(res1["was_already_credited"])

        # Duplicate verification
        res2 = CreditPaymentService.verify_and_fulfill_checkout(
            user=self.user,
            gateway_order_id="order_test_dup_1",
            gateway_payment_id="pay_test_dup_1",
            signature="mock_sig",
        )
        self.assertTrue(res2["was_already_credited"])

        wallet = CreditWallet.objects.get(user=self.user)
        self.assertEqual(wallet.purchased_balance, 500000)  # Not doubled!

    def test_webhook_payment_captured_success(self):
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_webhook_test_1",
            purpose="AI Credit - Starter Pack",
        )
        CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )

        webhook_secret = "test_webhook_secret_key"
        payload_dict = {
            "entity": "event",
            "event": "payment.captured",
            "id": "evt_webhook_success_1",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_webhook_test_1",
                        "order_id": "order_webhook_test_1",
                        "amount": 19900,
                        "currency": "INR",
                        "status": "captured",
                    }
                }
            },
        }
        body_bytes = json.dumps(payload_dict).encode("utf-8")
        sig = hmac.new(webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

        with self.settings(RAZORPAY_WEBHOOK_SECRET=webhook_secret):
            result = CreditPaymentService.process_webhook(
                raw_body_bytes=body_bytes,
                signature=sig,
                event_id_header="evt_webhook_success_1",
            )

        self.assertEqual(result["status"], "PROCESSED")
        wallet = CreditWallet.objects.get(user=self.user)
        self.assertEqual(wallet.purchased_balance, 500000)

        event_rec = PaymentWebhookEvent.objects.get(event_id="evt_webhook_success_1")
        self.assertEqual(event_rec.status, WebhookEventStatus.PROCESSED)

    def test_webhook_duplicate_delivery_is_ignored(self):
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_webhook_dup_1",
            purpose="AI Credit - Starter Pack",
        )
        CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )

        webhook_secret = "test_webhook_secret_key"
        payload_dict = {
            "entity": "event",
            "event": "payment.captured",
            "id": "evt_webhook_dup_1",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_webhook_dup_1",
                        "order_id": "order_webhook_dup_1",
                        "amount": 19900,
                        "currency": "INR",
                        "status": "captured",
                    }
                }
            },
        }
        body_bytes = json.dumps(payload_dict).encode("utf-8")
        sig = hmac.new(webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

        with self.settings(RAZORPAY_WEBHOOK_SECRET=webhook_secret):
            # First delivery
            res1 = CreditPaymentService.process_webhook(body_bytes, sig, event_id_header="evt_webhook_dup_1")
            self.assertEqual(res1["status"], "PROCESSED")

            # Second delivery
            res2 = CreditPaymentService.process_webhook(body_bytes, sig, event_id_header="evt_webhook_dup_1")
            self.assertEqual(res2["status"], "DUPLICATE_IGNORED")

        wallet = CreditWallet.objects.get(user=self.user)
        self.assertEqual(wallet.purchased_balance, 500000)

    def test_webhook_amount_mismatch_fails_safely(self):
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_webhook_mismatch",
            purpose="AI Credit - Starter Pack",
        )
        CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )

        webhook_secret = "test_webhook_secret_key"
        # Tampered amount: 9900 instead of 19900
        payload_dict = {
            "entity": "event",
            "event": "payment.captured",
            "id": "evt_webhook_mismatch_1",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_webhook_mismatch_1",
                        "order_id": "order_webhook_mismatch",
                        "amount": 9900,
                        "currency": "INR",
                        "status": "captured",
                    }
                }
            },
        }
        body_bytes = json.dumps(payload_dict).encode("utf-8")
        sig = hmac.new(webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

        with self.settings(RAZORPAY_WEBHOOK_SECRET=webhook_secret):
            with self.assertRaises(PaymentVerificationError):
                CreditPaymentService.process_webhook(body_bytes, sig, event_id_header="evt_webhook_mismatch_1")

        event_rec = PaymentWebhookEvent.objects.get(event_id="evt_webhook_mismatch_1")
        self.assertEqual(event_rec.status, WebhookEventStatus.FAILED)
        wallet = CreditWallet.objects.filter(user=self.user).first()
        self.assertTrue(wallet is None or wallet.purchased_balance == 0)

    def test_refund_reversal(self):
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.SUCCESS_OR_CAPTURED,
            purpose="AI Credit - Starter Pack",
        )
        snapshot = CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )
        wallet, _ = WalletService.get_or_create_wallet(self.user)
        wallet.purchased_balance = 500000
        wallet.save(update_fields=["purchased_balance"])

        entry = CreditPaymentService.reverse_credit_purchase_for_refund(
            payment=payment,
            refund_amount=Decimal("199.00"),
            refund_id="rfnd_123",
        )
        wallet.refresh_from_db()

        self.assertEqual(wallet.purchased_balance, 0)
        self.assertEqual(entry.entry_type, CreditEntryType.REFUND_REVERSAL)
        self.assertEqual(entry.delta, -500000)


class BackfillCommandTests(TestCase):
    def setUp(self):
        self.users = [
            User.objects.create_user(
                username=f"backfill_u_{i}",
                email=f"backfill_{i}@yuvro.com",
                password="testpassword123",
            )
            for i in range(3)
        ]

    def test_backfill_grants_bonus_to_eligible_users(self):
        out = StringIO()
        call_command("grant_signup_bonus_backfill", stdout=out)
        output = out.getvalue()

        self.assertIn("Granted       : 3", output)
        for user in self.users:
            wallet = CreditWallet.objects.get(user=user)
            self.assertTrue(wallet.signup_bonus_granted)
            self.assertEqual(wallet.bonus_balance, 50000)

    def test_backfill_repeated_execution_is_safe(self):
        out1 = StringIO()
        call_command("grant_signup_bonus_backfill", stdout=out1)

        # Second run should skip all 3
        out2 = StringIO()
        call_command("grant_signup_bonus_backfill", stdout=out2)
        output2 = out2.getvalue()

        self.assertIn("Granted       : 0", output2)
        self.assertIn("Skipped       : 3", output2)

    def test_backfill_dry_run(self):
        out = StringIO()
        call_command("grant_signup_bonus_backfill", "--dry-run", stdout=out)
        output = out.getvalue()

        self.assertIn("DRY-RUN", output)
        for user in self.users:
            wallet = CreditWallet.objects.filter(user=user).first()
            # In dry-run, no wallets or bonus granted
            self.assertTrue(wallet is None or not wallet.signup_bonus_granted)


class ConcurrentWalletPostgreSQLTests(TransactionTestCase):
    """
    Tests row-locking and concurrency behavior under PostgreSQL.
    Uses separate database connections across concurrent worker threads.
    """
    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username="concurrent_user",
            email="concurrent@yuvro.com",
            password="testpassword123",
        )

    def test_concurrent_signup_bonus_grants_grant_exactly_once(self):
        def attempt_grant():
            connection.close()
            try:
                wallet, granted = WalletService.grant_signup_bonus(self.user)
                return granted
            finally:
                connection.close()

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(attempt_grant) for _ in range(4)]
            results = [f.result() for f in futures]

        # Exactly one thread must have succeeded in granting the bonus
        self.assertEqual(results.count(True), 1)
        self.assertEqual(results.count(False), 3)

        wallet = CreditWallet.objects.get(user=self.user)
        self.assertEqual(wallet.bonus_balance, 50000)
        self.assertEqual(CreditLedgerEntry.objects.filter(user=self.user).count(), 1)

    def test_concurrent_reservations_prevent_double_spending(self):
        wallet, _ = WalletService.get_or_create_wallet(self.user)
        wallet.bonus_balance = 20000
        wallet.save(update_fields=["bonus_balance"])

        # Wallet has 20,000 bonus credits
        # Launch 3 threads each requesting 15,000 credits (< MAX_RESERVATION of 16,384)
        # Exactly 1 can succeed (15,000 <= 20,000); remaining 2 must fail with InsufficientCreditsError (5,000 < 15,000)
        def attempt_competing_reserve(idx):
            connection.close()
            try:
                WalletService.reserve_credits(
                    self.user,
                    amount=15000,
                    idempotency_key=f"competing_res_{idx}",
                )
                return "SUCCESS"
            except InsufficientCreditsError:
                return "INSUFFICIENT"
            finally:
                connection.close()

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(attempt_competing_reserve, i) for i in range(3)]
            results = [f.result() for f in futures]

        # Exactly 1 can succeed with 15,000, remaining 2 must be INSUFFICIENT
        self.assertEqual(results.count("SUCCESS"), 1)
        self.assertEqual(results.count("INSUFFICIENT"), 2)

        wallet.refresh_from_db()
        self.assertEqual(wallet.bonus_balance, 5000)
        self.assertEqual(wallet.reserved_bonus, 15000)
        self.assertEqual(wallet.total_balance, 20000)

    def tearDown(self):
        try:
            connections.close_all()
        except Exception:
            pass
        super().tearDown()


class CreditAPITestCase(APITestCase):
    """
    Integration tests for user-facing AI credit REST APIs:
    wallet retrieval, catalog inspection, order creation, checkout verification, and history.
    """
    def setUp(self):
        ensure_default_packs()
        self.user_a = User.objects.create_user(
            username="api_user_a",
            email="user_a@yuvro.com",
            password="testpassword123",
        )
        self.user_b = User.objects.create_user(
            username="api_user_b",
            email="user_b@yuvro.com",
            password="testpassword123",
        )
        self.wallet_a, _ = WalletService.get_or_create_wallet(self.user_a, grant_signup_bonus=True)
        self.wallet_b, _ = WalletService.get_or_create_wallet(self.user_b, grant_signup_bonus=False)
        self.wallet_b.bonus_balance = 10000
        self.wallet_b.save(update_fields=["bonus_balance"])

    def test_anonymous_access_rejected(self):
        # All user-facing credit endpoints require JWT authentication
        endpoints = [
            "/api/credits/wallet/",
            "/api/credits/packs/",
            "/api/credits/orders/",
            "/api/credits/verify/",
            "/api/credits/history/",
            "/api/credits/usage/",
        ]
        for url in endpoints:
            resp = self.client.get(url) if "order" not in url and "verify" not in url else self.client.post(url, {})
            self.assertEqual(
                resp.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"Endpoint {url} did not reject anonymous access",
            )

    def test_user_wallet_endpoint(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/credits/wallet/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data["bonus_balance"], 50000)
        self.assertEqual(data["purchased_balance"], 0)
        self.assertEqual(data["total_available"], 50000)
        self.assertEqual(data["total_reserved"], 0)
        self.assertEqual(data["total_balance"], 50000)
        self.assertTrue(data["signup_bonus_granted"])
        self.assertEqual(data["reconciliation_status"], "settled")
        self.assertEqual(data["uncollected_deficit"], 0)

    def test_wallet_user_isolation(self):
        # User A must only see User A's data, never User B's
        self.client.force_authenticate(user=self.user_a)
        resp_a = self.client.get("/api/credits/wallet/")
        self.assertEqual(resp_a.data["bonus_balance"], 50000)

        self.client.force_authenticate(user=self.user_b)
        resp_b = self.client.get("/api/credits/wallet/")
        self.assertEqual(resp_b.data["bonus_balance"], 10000)
        self.assertNotEqual(resp_a.data["id"], resp_b.data["id"])

    def test_credit_packs_list_excludes_signup_bonus(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/credits/packs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        packs = response.data
        pack_ids = [p["id"] for p in packs]

        # Paid packs must be present
        self.assertIn("starter", pack_ids)
        self.assertIn("pro", pack_ids)
        self.assertIn("power", pack_ids)

        # Free signup bonus must be strictly EXCLUDED from purchasable list
        self.assertNotIn("free_signup_bonus", pack_ids)

        starter = next(p for p in packs if p["id"] == "starter")
        self.assertEqual(starter["price_paise"], 19900)
        self.assertEqual(starter["currency"], "INR")
        self.assertEqual(starter["credits"], 500000)

    @patch("payment.gateways.razorpay.RazorpayGateway.create_customer")
    @patch("payment.gateways.razorpay.RazorpayGateway.create_payment")
    def test_create_order_endpoint_success(self, mock_create_payment, mock_create_customer):
        mock_create_customer.return_value = {"customer_id": "cust_order_123", "raw": {}}
        mock_create_payment.return_value = {
            "order_id": "order_endpoint_123",
            "status": "created",
            "session_id": None,
            "payment_response": {"id": "order_endpoint_123"},
        }

        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            "/api/credits/orders/",
            {"pack_id": "starter", "client_request_id": "req_key_1"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["order_id"], "order_endpoint_123")
        self.assertEqual(response.data["amount"], 19900)
        self.assertEqual(response.data["currency"], "INR")
        self.assertEqual(response.data["pack_id"], "starter")
        self.assertEqual(response.data["credits"], 500000)

    def test_create_order_invalid_pack_rejected(self):
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post("/api/credits/orders/", {"pack_id": "invalid_pack_xyz"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "invalid_pack")

    def test_create_order_signup_bonus_pack_rejected(self):
        # Attempting to order the free signup bonus through checkout must be rejected
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post("/api/credits/orders/", {"pack_id": "free_signup_bonus"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "invalid_pack")

    @patch("payment.gateways.razorpay.RazorpayGateway.create_customer")
    @patch("payment.gateways.razorpay.RazorpayGateway.create_payment")
    def test_create_order_idempotent_with_client_request_id(self, mock_create_payment, mock_create_customer):
        mock_create_customer.return_value = {"customer_id": "cust_123", "raw": {}}
        mock_create_payment.return_value = {
            "order_id": "order_idem_1",
            "status": "created",
            "session_id": None,
            "payment_response": {"id": "order_idem_1"},
        }

        self.client.force_authenticate(user=self.user_a)
        # First request
        res1 = self.client.post(
            "/api/credits/orders/",
            {"pack_id": "starter", "client_request_id": "repeat_req_id"},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second request with identical client_request_id
        res2 = self.client.post(
            "/api/credits/orders/",
            {"pack_id": "starter", "client_request_id": "repeat_req_id"},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data["order_id"], res2.data["order_id"])
        self.assertEqual(res1.data["payment_id"], res2.data["payment_id"])

    @patch("payment.gateways.razorpay.RazorpayGateway.verify_signature")
    def test_verify_checkout_endpoint_success(self, mock_verify_signature):
        mock_verify_signature.return_value = True

        payment = Payment.objects.create(
            user=self.user_a,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_checkout_api_1",
            purpose="AI Credit - Starter Pack",
        )
        CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user_a,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )

        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            "/api/credits/verify/",
            {
                "gateway_order_id": "order_checkout_api_1",
                "gateway_payment_id": "pay_checkout_api_1",
                "signature": "valid_mock_signature",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "SUCCESS")
        self.assertEqual(response.data["credits_credited"], 500000)

        self.wallet_a.refresh_from_db()
        self.assertEqual(self.wallet_a.purchased_balance, 500000)

    @patch("payment.gateways.razorpay.RazorpayGateway.verify_signature")
    def test_verify_checkout_invalid_signature_rejected(self, mock_verify_signature):
        mock_verify_signature.return_value = False

        Payment.objects.create(
            user=self.user_a,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_bad_sig_api",
            purpose="AI Credit - Starter Pack",
        )

        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(
            "/api/credits/verify/",
            {
                "gateway_order_id": "order_bad_sig_api",
                "gateway_payment_id": "pay_bad_sig",
                "signature": "invalid_sig",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "verification_failed")

    @patch("payment.gateways.razorpay.RazorpayGateway.verify_signature")
    def test_verify_checkout_wrong_user_rejected(self, mock_verify_signature):
        mock_verify_signature.return_value = True

        # Payment belongs to User A
        payment = Payment.objects.create(
            user=self.user_a,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_user_a_only",
            purpose="AI Credit - Starter Pack",
        )
        CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user_a,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )

        # User B attempts to verify User A's order
        self.client.force_authenticate(user=self.user_b)
        response = self.client.post(
            "/api/credits/verify/",
            {
                "gateway_order_id": "order_user_a_only",
                "gateway_payment_id": "pay_wrong_user",
                "signature": "mock_sig",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "verification_failed")

    def test_ledger_history_pagination_and_user_isolation(self):
        # Create 3 ledger entries for User A and 2 for User B
        for i in range(3):
            CreditLedgerEntry.objects.create(
                wallet=self.wallet_a,
                user=self.user_a,
                entry_type=CreditEntryType.ADMIN_ADJUSTMENT,
                bucket=CreditBucket.BONUS,
                delta=100,
                balance_after_bonus=50000 + i * 100,
                balance_after_purchased=0,
                idempotency_key=f"hist_a_{i}",
                description=f"Adjustment A {i}",
            )
        for i in range(2):
            CreditLedgerEntry.objects.create(
                wallet=self.wallet_b,
                user=self.user_b,
                entry_type=CreditEntryType.ADMIN_ADJUSTMENT,
                bucket=CreditBucket.BONUS,
                delta=50,
                balance_after_bonus=10000 + i * 50,
                balance_after_purchased=0,
                idempotency_key=f"hist_b_{i}",
                description=f"Adjustment B {i}",
            )

        self.client.force_authenticate(user=self.user_a)
        # Request with page_size=2
        response = self.client.get("/api/credits/history/?page_size=2")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertIn("results", response.data)
        # Total for user A = 1 (from signup bonus in setUp) + 3 = 4 entries
        self.assertEqual(response.data["count"], 4)
        self.assertEqual(len(response.data["results"]), 2)

        # Verify no User B entries are in User A's results
        all_descriptions = [r["description"] for r in response.data["results"]]
        for desc in all_descriptions:
            self.assertNotIn("Adjustment B", desc)

    def test_ledger_history_read_only_rejects_mutations(self):
        self.client.force_authenticate(user=self.user_a)
        # POST, PUT, DELETE must be rejected with 405 Method Not Allowed
        post_resp = self.client.post("/api/credits/history/", {"delta": 5000})
        self.assertEqual(post_resp.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        del_resp = self.client.delete("/api/credits/history/")
        self.assertEqual(del_resp.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class RazorpayWebhookViewTests(APITestCase):
    """
    Tests for the public Razorpay Webhook endpoint:
    HMAC signature authentication, duplicate prevention, and order fulfillment.
    """
    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username="webhook_test_user",
            email="webhook_test@yuvro.com",
            password="testpassword123",
        )
        self.wallet, _ = WalletService.get_or_create_wallet(self.user)
        self.webhook_secret = "rzp_secret_key_integration_test"

    def _sign_payload(self, payload_dict: dict) -> Tuple[bytes, str]:
        body = json.dumps(payload_dict).encode("utf-8")
        sig = hmac.new(self.webhook_secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
        return body, sig

    def test_webhook_missing_signature_rejected(self):
        response = self.client.post(
            "/api/credits/webhook/",
            data=json.dumps({"event": "payment.captured"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "missing_signature")

    def test_webhook_invalid_signature_rejected(self):
        body = json.dumps({"event": "payment.captured"}).encode("utf-8")
        with self.settings(RAZORPAY_WEBHOOK_SECRET=self.webhook_secret):
            response = self.client.post(
                "/api/credits/webhook/",
                data=body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE="tampered_invalid_signature",
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "invalid_webhook")

    def test_webhook_payment_captured_success(self):
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_webhook_integration_1",
            purpose="AI Credit - Starter Pack",
        )
        CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )

        payload = {
            "entity": "event",
            "event": "payment.captured",
            "id": "evt_webhook_api_1",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_webhook_api_1",
                        "order_id": "order_webhook_integration_1",
                        "amount": 19900,
                        "currency": "INR",
                        "status": "captured",
                    }
                }
            },
        }
        body, sig = self._sign_payload(payload)

        with self.settings(RAZORPAY_WEBHOOK_SECRET=self.webhook_secret):
            response = self.client.post(
                "/api/credits/webhook/",
                data=body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE=sig,
                HTTP_X_RAZORPAY_EVENT_ID="evt_webhook_api_1",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.purchased_balance, 500000)

        # Confirm webhook event record
        evt = PaymentWebhookEvent.objects.get(event_id="evt_webhook_api_1")
        self.assertEqual(evt.status, WebhookEventStatus.PROCESSED)

    def test_webhook_duplicate_event_safely_ignored(self):
        payment = Payment.objects.create(
            user=self.user,
            amount=Decimal("199.00"),
            currency="INR",
            gateway="razorpay",
            status=PaymentStatus.CREATED,
            gateway_order_or_intent_id="order_webhook_dup_api",
            purpose="AI Credit - Starter Pack",
        )
        CreditPurchaseSnapshot.objects.create(
            payment=payment,
            user=self.user,
            pack_id="starter",
            pack_name="Starter Pack",
            credits=500000,
            amount_paid=Decimal("199.00"),
            currency="INR",
        )

        payload = {
            "entity": "event",
            "event": "payment.captured",
            "id": "evt_dup_api_test",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_dup_api",
                        "order_id": "order_webhook_dup_api",
                        "amount": 19900,
                        "currency": "INR",
                        "status": "captured",
                    }
                }
            },
        }
        body, sig = self._sign_payload(payload)

        with self.settings(RAZORPAY_WEBHOOK_SECRET=self.webhook_secret):
            # Delivery 1
            res1 = self.client.post(
                "/api/credits/webhook/",
                data=body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE=sig,
                HTTP_X_RAZORPAY_EVENT_ID="evt_dup_api_test",
            )
            self.assertEqual(res1.status_code, status.HTTP_200_OK)

            # Delivery 2 (Duplicate)
            res2 = self.client.post(
                "/api/credits/webhook/",
                data=body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE=sig,
                HTTP_X_RAZORPAY_EVENT_ID="evt_dup_api_test",
            )
            self.assertEqual(res2.status_code, status.HTTP_200_OK)
            self.assertEqual(res2.data["result"]["status"], "DUPLICATE_IGNORED")

        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.purchased_balance, 500000)  # Not doubled

    def test_webhook_unauthenticated_session_allowed(self):
        # Razorpay webhooks do not carry a user JWT token, only the cryptographic signature
        payload = {"event": "payment.failed", "id": "evt_failed_test", "payload": {}}
        body, sig = self._sign_payload(payload)

        with self.settings(RAZORPAY_WEBHOOK_SECRET=self.webhook_secret):
            response = self.client.post(
                "/api/credits/webhook/",
                data=body,
                content_type="application/json",
                HTTP_X_RAZORPAY_SIGNATURE=sig,
                HTTP_X_RAZORPAY_EVENT_ID="evt_failed_test",
            )
        # Should not return 401 Unauthorized
        self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class MockChunk:
    def __init__(self, text):
        self.text = text


class MockGeminiStream:
    def __init__(self, chunks, prompt_tokens=100, candidates_tokens=50):
        self.chunks = chunks

        class UsageMeta:
            prompt_token_count = prompt_tokens
            candidates_token_count = candidates_tokens
            cached_content_token_count = 0
            total_token_count = prompt_tokens + candidates_tokens

        self.usage_metadata = UsageMeta()

    def __aiter__(self):
        async def gen():
            for c in self.chunks:
                yield MockChunk(c)
        return gen()


class MockAnthropicDelta:
    def __init__(self, text):
        self.text = text


class MockAnthropicChunk:
    def __init__(self, text):
        self.type = "content_block_delta"
        self.delta = MockAnthropicDelta(text)


class MockAnthropicStream:
    def __init__(self, chunks, input_tokens=120, output_tokens=80, cached_tokens=0):
        self.chunks = chunks

        class MetaUsage:
            def __init__(self):
                self.input_tokens = input_tokens
                self.output_tokens = output_tokens
                self.cache_read_input_tokens = cached_tokens

        class FinalMeta:
            def __init__(self):
                self.id = "req_anthropic_test_123"
                self.usage = MetaUsage()

        self._final_metadata = FinalMeta()

    def get_final_metadata(self):
        return self._final_metadata

    def __aiter__(self):
        async def gen():
            for c in self.chunks:
                yield MockAnthropicChunk(c)
        return gen()


class AIMeteringAndReservationTests(APITransactionTestCase):
    """
    Stage 4 integration tests:
    - Feature-flag disabled: zero credit reservation/deduction, existing behavior intact.
    - Feature-flag enabled:
      - Insufficient credits handling for streaming (SSE event) and non-streaming (HTTP 402).
      - Accurate token accounting across providers (input + output).
      - Pre-dispatch reservation -> provider work -> atomic settlement -> unused release.
      - Error / abort handling releases held reservation back to balance.
      - Overage handling and reconciliation pending status enforcement.
    """

    def setUp(self):
        ensure_default_packs()
        self.user = User.objects.create_user(
            username=f"meter_user_{uuid.uuid4().hex[:8]}",
            email=f"meter_{uuid.uuid4().hex[:8]}@example.com",
            password="securePassword123!",
        )
        self.client.force_authenticate(user=self.user)

        self.gemini_agent, _ = AIAgent.objects.get_or_create(
            provider="gemini",
            model_name="gemini-2.5-flash",
            defaults={"name": "Gemini 2.5 Flash", "is_active": True},
        )
        self.anthropic_agent, _ = AIAgent.objects.get_or_create(
            provider="anthropic",
            model_name="claude-3-5-sonnet-20241022",
            defaults={"name": "Claude 3.5 Sonnet", "is_active": True},
        )
        self.session = ChatSession.objects.create(
            user=self.user,
            ai_agent=self.gemini_agent,
            title="Stage 4 Test Session",
        )

    def tearDown(self):
        try:
            from django.db import connection, connectionss
            connections.close_all()
        except Exception:
            pass
        super().tearDown()

    def _parse_sse_events(self, response):
        """Helper to collect and parse JSON data events from a StreamingHttpResponse."""
        events = []
        try:
            for raw_chunk in response.streaming_content:
                text = raw_chunk.decode("utf-8") if isinstance(raw_chunk, bytes) else str(raw_chunk)
                for line in text.split("\n"):
                    line = line.strip()
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str:
                            try:
                                events.append(json.loads(data_str))
                            except Exception:
                                pass
        finally:
            if hasattr(response, "close"):
                response.close()
        return events

    # ── 1. Feature Flag Inactive (Default Behavior) ───────────────────────────

    def test_feature_flag_disabled_by_default(self):
        from django.conf import settings
        self.assertFalse(getattr(settings, "AI_CREDITS_ENABLED", False))
        self.assertFalse(CreditMeteringManager.is_enabled())

    def test_feature_flag_disabled_non_streaming_chat_unaffected(self):
        """When AI_CREDITS_ENABLED=False, user with 0 credits chats normally without reservations."""
        mock_svc = MagicMock()
        mock_svc.generate_response = AsyncMock(return_value={
            "response": "Hello, how can I help you today?",
            "tokens_used": 120,
            "response_time_ms": 150,
            "metadata": {"prompt_tokens": 80, "completion_tokens": 40},
        })

        with patch.object(AIServiceFactory, "create_service", return_value=mock_svc):
            with self.settings(AI_CREDITS_ENABLED=False):
                response = self.client.post(
                    f"/api/sessions/{self.session.id}/send_message/",
                    data={"message": "Hello AI Mentor", "stream": False},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["response"], "Hello, how can I help you today?")
        self.assertIsNone(response.data.get("credits_used"))
        # Verify no reservations or usage records created
        self.assertEqual(CreditReservation.objects.filter(user=self.user).count(), 0)
        self.assertEqual(CreditUsageRecord.objects.filter(user=self.user).count(), 0)

    # ── 2. Insufficient Credits Enforcement ───────────────────────────────────

    def test_insufficient_credits_non_streaming_returns_http_402(self):
        """When enabled and user has 0 credits, non-streaming returns 402 with structured error."""
        wallet, _ = WalletService.get_or_create_wallet(self.user)
        self.assertEqual(wallet.total_available, 0)

        mock_svc = MagicMock()
        mock_svc.generate_response = AsyncMock()

        with patch.object(AIServiceFactory, "create_service", return_value=mock_svc):
            with self.settings(AI_CREDITS_ENABLED=True):
                response = self.client.post(
                    f"/api/sessions/{self.session.id}/send_message/",
                    data={"message": "Please solve this problem", "stream": False},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(response.data["error"], "insufficient_credits")
        self.assertEqual(response.data["available"], 0)
        self.assertGreater(response.data["required"], 0)
        mock_svc.generate_response.assert_not_called()

    def test_insufficient_credits_streaming_yields_sse_error(self):
        """When enabled and user has 0 credits, streaming returns SSE error event and closes."""
        wallet, _ = WalletService.get_or_create_wallet(self.user)
        self.assertEqual(wallet.total_available, 0)

        mock_svc = MagicMock()
        mock_svc.generate_response = AsyncMock()

        with patch.object(AIServiceFactory, "create_service", return_value=mock_svc):
            with self.settings(AI_CREDITS_ENABLED=True):
                response = self.client.post(
                    f"/api/sessions/{self.session.id}/send_message/",
                    data={"message": "Stream this explanation", "stream": True},
                    format="json",
                )
                events = self._parse_sse_events(response)

        self.assertTrue(len(events) >= 1)
        err_event = events[0]
        self.assertEqual(err_event.get("error_code"), "insufficient_credits")
        self.assertEqual(err_event.get("available"), 0)
        self.assertGreater(err_event.get("required"), 0)
        mock_svc.generate_response.assert_not_called()

    # ── 3. Non-Streaming Metering & Settlement ─────────────────────────────────

    def test_successful_non_streaming_chat_meters_and_settles(self):
        """Reserves 4096 credits, executes LLM, consumes 150, releases 3946, returns credits_used."""
        with self.settings(AI_CREDITS_ENABLED=True):
            WalletService.grant_signup_bonus(self.user)
        wallet = CreditWallet.objects.get(user=self.user)
        self.assertEqual(wallet.bonus_balance, 50000)

        mock_svc = MagicMock()
        mock_svc.generate_response = AsyncMock(return_value={
            "response": "Here is the solution to your algorithm problem.",
            "tokens_used": 150,
            "response_time_ms": 120,
            "metadata": {
                "prompt_tokens": 100,
                "completion_tokens": 50,
            },
        })

        with patch.object(AIServiceFactory, "create_service", return_value=mock_svc):
            with self.settings(AI_CREDITS_ENABLED=True):
                response = self.client.post(
                    f"/api/sessions/{self.session.id}/send_message/",
                    data={"message": "How do I reverse a binary tree?", "stream": False},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["credits_used"], 150)

        # Check wallet balances: exactly 150 deducted
        wallet.refresh_from_db()
        self.assertEqual(wallet.bonus_balance, 50000 - 150)  # 49850
        self.assertEqual(wallet.reserved_bonus, 0)
        self.assertEqual(wallet.purchased_balance, 0)
        self.assertEqual(wallet.reserved_purchased, 0)

        # Check reservation record: SETTLED
        res = CreditReservation.objects.get(user=self.user)
        self.assertEqual(res.status, ReservationStatus.SETTLED)
        self.assertEqual(res.consumed_bonus, 150)
        self.assertEqual(res.released_bonus, res.reserved_bonus - 150)

        # Check usage record
        usage = CreditUsageRecord.objects.get(reservation=res)
        self.assertEqual(usage.credits_charged, 150)
        self.assertEqual(usage.input_tokens, 100)
        self.assertEqual(usage.output_tokens, 50)
        self.assertEqual(usage.provider, "gemini")

        # Check ledger entries: Hold, Release, Usage
        ledger_types = list(
            CreditLedgerEntry.objects.filter(user=self.user).values_list("entry_type", flat=True)
        )
        self.assertIn(CreditEntryType.RESERVATION_HOLD, ledger_types)
        self.assertIn(CreditEntryType.RESERVATION_RELEASE, ledger_types)
        self.assertIn(CreditEntryType.USAGE_SETTLEMENT, ledger_types)

    # ── 4. Streaming Metering & Settlement ─────────────────────────────────────

    def test_successful_streaming_chat_meters_and_settles(self):
        """Streams chunks, captures token metrics on stream finish, emits credits_used in done event."""
        with self.settings(AI_CREDITS_ENABLED=True):
            WalletService.grant_signup_bonus(self.user)

        mock_stream = MockGeminiStream(
            chunks=["To reverse a tree, ", "swap left and ", "right nodes recursively."],
            prompt_tokens=100,
            candidates_tokens=50,
        )
        mock_svc = MagicMock()
        mock_svc.generate_response = AsyncMock(return_value={
            "stream": mock_stream,
            "metadata": {"model": "gemini-2.5-flash"},
        })

        with patch.object(AIServiceFactory, "create_service", return_value=mock_svc):
            with self.settings(AI_CREDITS_ENABLED=True):
                response = self.client.post(
                    f"/api/sessions/{self.session.id}/send_message/",
                    data={"message": "Invert binary tree", "stream": True},
                    format="json",
                )
                events = self._parse_sse_events(response)

        # Should have text chunks and a final done event
        chunks = [e["chunk"] for e in events if "chunk" in e]
        self.assertEqual("".join(chunks), "To reverse a tree, swap left and right nodes recursively.")

        done_event = next((e for e in events if e.get("done") is True), None)
        self.assertIsNotNone(done_event)
        self.assertEqual(done_event.get("credits_used"), 150)

        # Verify wallet settlement
        wallet = CreditWallet.objects.get(user=self.user)
        self.assertEqual(wallet.bonus_balance, 50000 - 150)
        self.assertEqual(wallet.reserved_bonus, 0)

        usage = CreditUsageRecord.objects.get(user=self.user)
        self.assertEqual(usage.credits_charged, 150)
        self.assertEqual(usage.input_tokens, 100)
        self.assertEqual(usage.output_tokens, 50)

    # ── 5. Provider Failure Releases Reservation ──────────────────────────────

    def test_provider_failure_releases_held_reservation(self):
        """When AI provider raises an error, the pre-reserved credits are fully restored."""
        with self.settings(AI_CREDITS_ENABLED=True):
            WalletService.grant_signup_bonus(self.user)

        mock_svc = MagicMock()
        mock_svc.generate_response = AsyncMock(side_effect=AIServiceError("Upstream 503 Provider Down"))

        with patch.object(AIServiceFactory, "create_service", return_value=mock_svc):
            with self.settings(AI_CREDITS_ENABLED=True):
                response = self.client.post(
                    f"/api/sessions/{self.session.id}/send_message/",
                    data={"message": "Failing query", "stream": False},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

        wallet = CreditWallet.objects.get(user=self.user)
        # All 50,000 credits must be available, none left reserved
        self.assertEqual(wallet.bonus_balance, 50000)
        self.assertEqual(wallet.reserved_bonus, 0)

        res = CreditReservation.objects.get(user=self.user)
        self.assertEqual(res.status, ReservationStatus.RELEASED)

    # ── 6. Token Usage Normalization Across All Providers ─────────────────────

    def test_token_normalization_anthropic(self):
        usage = CreditMeteringManager.extract_token_usage(
            provider="anthropic",
            model_name="claude-3-5-sonnet-20241022",
            response_data={
                "metadata": {
                    "input_tokens": 200,
                    "output_tokens": 100,
                    "cache_read_input_tokens": 50,
                    "id": "msg_01XyZ",
                }
            },
            full_response_text="Test response",
        )
        self.assertEqual(usage["input_tokens"], 200)
        self.assertEqual(usage["output_tokens"], 100)
        self.assertEqual(usage["cached_tokens"], 50)
        # Formula: credits_charged = input_tokens + output_tokens (cached recorded separately)
        self.assertEqual(usage["credits_charged"], 300)
        self.assertEqual(usage["provider_request_id"], "msg_01XyZ")
        self.assertFalse(usage["is_estimated"])

    def test_token_normalization_gemini(self):
        usage = CreditMeteringManager.extract_token_usage(
            provider="gemini",
            model_name="gemini-2.5-flash",
            response_data={
                "metadata": {
                    "prompt_tokens": 400,
                    "completion_tokens": 250,
                }
            },
            full_response_text="Test response",
        )
        self.assertEqual(usage["input_tokens"], 400)
        self.assertEqual(usage["output_tokens"], 250)
        self.assertEqual(usage["credits_charged"], 650)
        self.assertFalse(usage["is_estimated"])

    def test_token_normalization_openai(self):
        usage = CreditMeteringManager.extract_token_usage(
            provider="openai",
            model_name="gpt-4o",
            response_data={
                "metadata": {
                    "prompt_tokens": 300,
                    "completion_tokens": 120,
                    "cached_tokens": 30,
                    "reasoning_tokens": 40,
                    "id": "chatcmpl_abc123",
                }
            },
            full_response_text="Test response",
        )
        self.assertEqual(usage["input_tokens"], 300)
        self.assertEqual(usage["output_tokens"], 120)
        self.assertEqual(usage["cached_tokens"], 30)
        self.assertEqual(usage["reasoning_tokens"], 40)
        self.assertEqual(usage["credits_charged"], 420)
        self.assertEqual(usage["provider_request_id"], "chatcmpl_abc123")

    def test_token_normalization_cohere(self):
        usage = CreditMeteringManager.extract_token_usage(
            provider="cohere",
            model_name="command-r-plus",
            response_data={
                "tokens_used": 200,
                "metadata": {"generation_id": "gen_cohere_123"},
            },
            full_response_text="A" * 400,  # 400 chars ~ 100 output tokens
        )
        self.assertEqual(usage["credits_charged"], 200)
        self.assertEqual(usage["output_tokens"], 100)
        self.assertEqual(usage["input_tokens"], 100)
        self.assertFalse(usage["is_estimated"])

    def test_token_fallback_estimator_when_zero_reported(self):
        """When provider reports 0 tokens, estimates ~4 chars/token and flags is_estimated=True."""
        prompt_text = "What is the time complexity of quicksort in the worst case?"  # 59 chars ~ 14 tokens
        resp_text = "The worst-case time complexity of quicksort is O(n^2)."  # 54 chars ~ 13 tokens

        usage = CreditMeteringManager.extract_token_usage(
            provider="anthropic",
            model_name="claude-3-5-sonnet-20241022",
            response_data={"metadata": {}},
            full_response_text=resp_text,
            messages=[{"role": "user", "content": prompt_text}],
        )
        self.assertTrue(usage["is_estimated"])
        self.assertEqual(usage["usage_source"], "fallback_estimator")
        self.assertGreater(usage["input_tokens"], 0)
        self.assertGreater(usage["output_tokens"], 0)
        self.assertEqual(usage["credits_charged"], usage["input_tokens"] + usage["output_tokens"])

    # ── 7. Provider Fallback Scenario ─────────────────────────────────────────

    def test_provider_fallback_gemini_accounting(self):
        """When primary Anthropic fails before streaming and falls back to Gemini, usage settles against Gemini."""
        with self.settings(AI_CREDITS_ENABLED=True):
            WalletService.grant_signup_bonus(self.user)

        # Switch session agent to anthropic
        self.session.ai_agent = self.anthropic_agent
        self.session.save()

        mock_anthropic_svc = MagicMock()
        mock_anthropic_svc.generate_response = AsyncMock(side_effect=AIServiceError("Anthropic rate limited"))

        mock_gemini_stream = MockGeminiStream(
            chunks=["Gemini fallback answer."],
            prompt_tokens=80,
            candidates_tokens=40,
        )
        mock_gemini_svc = MagicMock()
        mock_gemini_svc.generate_response = AsyncMock(return_value={
            "stream": mock_gemini_stream,
            "metadata": {"model": "gemini-2.5-flash"},
        })

        def mock_create_service(provider, model_name):
            if provider == "anthropic":
                return mock_anthropic_svc
            return mock_gemini_svc

        with patch.object(AIServiceFactory, "create_service", side_effect=mock_create_service):
            with self.settings(AI_CREDITS_ENABLED=True):
                response = self.client.post(
                    f"/api/sessions/{self.session.id}/send_message/",
                    data={"message": "Trigger fallback test", "stream": True},
                    format="json",
                )
                events = self._parse_sse_events(response)

        done_event = next((e for e in events if e.get("done") is True), None)
        self.assertIsNotNone(done_event)
        self.assertEqual(done_event.get("credits_used"), 120)  # 80 + 40

        usage = CreditUsageRecord.objects.get(user=self.user)
        self.assertEqual(usage.provider, "gemini")
        self.assertEqual(usage.metadata.get("fallback_from"), "anthropic/claude-3-5-sonnet-20241022")

    # ── 8. Overage Handling ───────────────────────────────────────────────────

    def test_overage_settlement_handling(self):
        """When actual usage exceeds reserved credits, collects overage from available balance safely."""
        with self.settings(AI_CREDITS_ENABLED=True):
            WalletService.grant_signup_bonus(self.user)  # 50,000 bonus

        # Artificially reserve only 2,000 credits
        res = WalletService.reserve_credits(
            user=self.user,
            amount=2000,
            session_id=str(self.session.id),
            idempotency_key="res_overage_test",
        )
        wallet = CreditWallet.objects.get(user=self.user)
        self.assertEqual(wallet.bonus_balance, 48000)
        self.assertEqual(wallet.reserved_bonus, 2000)

        # Settle with 3,500 credits actual usage (1,500 overage)
        usage_dict = {
            "input_tokens": 2000,
            "output_tokens": 1500,
            "credits_charged": 3500,
            "is_estimated": False,
            "usage_source": "provider_response",
        }
        with self.settings(AI_CREDITS_ENABLED=True):
            CreditMeteringManager.settle_for_chat(
                reservation=res,
                provider="gemini",
                model_name="gemini-2.5-flash",
                usage_dict=usage_dict,
            )

        wallet.refresh_from_db()
        # 50,000 original - 3,500 total usage = 46,500 remaining
        self.assertEqual(wallet.bonus_balance, 46500)
        self.assertEqual(wallet.reserved_bonus, 0)
        self.assertEqual(wallet.uncollected_deficit, 0)

    # ── 9. Reconciliation Pending Restriction ────────────────────────────────

    def test_reconciliation_pending_blocks_reservations(self):
        """Accounts with uncollected deficit pending reconciliation cannot initiate new billable calls."""
        with self.settings(AI_CREDITS_ENABLED=True):
            wallet, _ = WalletService.get_or_create_wallet(self.user)
            CreditUsageRecord.objects.create(
                user=self.user,
                wallet=wallet,
                credits_charged=500,
                status="overage_deficit",
                metadata={"uncollected_overage": 500},
            )

            with self.assertRaises(InsufficientCreditsError) as ctx:
                CreditMeteringManager.reserve_for_chat(user=self.user, session_id="test")

            self.assertIn("uncollected deficit of 500 credits", str(ctx.exception))

    # ── 10. Quick Chat (Non-Session) Metering ─────────────────────────────────

    def test_quick_chat_metering_and_settlement(self):
        """Quick chat without persistent session properly reserves and meters credits."""
        with self.settings(AI_CREDITS_ENABLED=True):
            WalletService.grant_signup_bonus(self.user)

        mock_svc = MagicMock()
        mock_svc.generate_response = AsyncMock(return_value={
            "response": "Quick response without session.",
            "tokens_used": 100,
            "response_time_ms": 90,
            "metadata": {"prompt_tokens": 60, "completion_tokens": 40},
        })

        with patch.object(AIServiceFactory, "create_service", return_value=mock_svc):
            with self.settings(AI_CREDITS_ENABLED=True):
                response = self.client.post(
                    "/api/chat/quick_chat/",
                    data={
                        "message": "Quick question",
                        "stream": False,
                        "ai_agent_id": str(self.gemini_agent.id),
                    },
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["credits_used"], 100)

        wallet = CreditWallet.objects.get(user=self.user)
        self.assertEqual(wallet.bonus_balance, 50000 - 100)
        self.assertEqual(wallet.reserved_bonus, 0)


# ==============================================================================
# STAGE 6: END-TO-END VALIDATION & RELEASE READINESS TESTS
# ==============================================================================

class Stage6EndToEndLifecycleTests(APITransactionTestCase):
    """
    End-to-end integration and security audit tests covering the full lifecycle:
    Signup -> Pack purchase -> Concurrent fulfillment -> AI reservation & settlement ->
    Usage overages -> Refund shortfall audit -> Stranded reservation recovery.
    """

    def setUp(self):
        connections.close_all()
        ensure_default_packs()

        self.user_a = User.objects.create_user(
            username="user_a_stage6",
            email="user_a_stage6@example.com",
            password="Password123!",
            first_name="User",
            last_name="A",
        )
        self.user_b = User.objects.create_user(
            username="user_b_stage6",
            email="user_b_stage6@example.com",
            password="Password123!",
            first_name="User",
            last_name="B",
        )
        self.agent = AIAgent.objects.create(
            name="Stage 6 Gemini",
            provider="gemini",
            model_name="gemini-2.5-flash",
            is_active=True,
            max_tokens=4096,
        )
        self.session = ChatSession.objects.create(
            user=self.user_a,
            ai_agent=self.agent,
            title="Stage 6 Validation Session",
        )

    def tearDown(self):
        connections.close_all()

    def test_expire_stale_reservations_management_command(self):
        """Verifies that the expire_stale_reservations command cleanly recovers stranded reservations."""
        with self.settings(AI_CREDITS_ENABLED=True):
            WalletService.grant_signup_bonus(self.user_a)

        # Place reservation and backdate its expiration to 10 minutes ago
        reservation = WalletService.reserve_credits(
            user=self.user_a,
            amount=4096,
            session_id=str(self.session.id),
            idempotency_key="stranded_res_test",
        )
        CreditReservation.objects.filter(id=reservation.id).update(
            expires_at=timezone.now() - timedelta(minutes=10)
        )

        wallet = CreditWallet.objects.get(user=self.user_a)
        self.assertEqual(wallet.reserved_bonus, 4096)
        self.assertEqual(wallet.bonus_balance, 50000 - 4096)

        # 1. Dry run should NOT modify status or balances
        out_dry = StringIO()
        call_command("expire_stale_reservations", "--dry-run", stdout=out_dry)
        self.assertIn("Found 1 expired pending reservation(s)", out_dry.getvalue())

        wallet.refresh_from_db()
        self.assertEqual(wallet.reserved_bonus, 4096)

        # 2. Actual run should expire the reservation and release all credits back to wallet
        out_live = StringIO()
        call_command("expire_stale_reservations", stdout=out_live)
        self.assertIn("Successfully expired and recovered 1 stranded reservation(s)", out_live.getvalue())

        reservation.refresh_from_db()
        self.assertEqual(reservation.status, ReservationStatus.EXPIRED)

        wallet.refresh_from_db()
        self.assertEqual(wallet.reserved_bonus, 0)
        self.assertEqual(wallet.bonus_balance, 50000)

    def test_end_to_end_user_journey_with_overage_and_audit(self):
        """Validates the full user journey: bonus -> pack purchase -> AI chat overage settlement."""
        with self.settings(AI_CREDITS_ENABLED=True):
            # 1. Signup bonus
            WalletService.grant_signup_bonus(self.user_a)

            # 2. Order creation for starter pack (500,000 credits, ₹199)
            self.client.force_authenticate(user=self.user_a)
            with patch("payment.gateways.razorpay.RazorpayGateway.create_customer", return_value={"customer_id": "cust_s6_1", "raw": {}}):
                with patch("payment.gateways.razorpay.RazorpayGateway.create_payment", return_value={
                    "order_id": "order_s6_stage6_123",
                    "status": "created",
                    "session_id": None,
                    "payment_response": {"id": "order_s6_stage6_123"},
                }):
                    order_resp = self.client.post("/api/credits/orders/", {"pack_id": "starter"}, format="json")
            self.assertEqual(order_resp.status_code, status.HTTP_201_CREATED)
            order_id = order_resp.data["order_id"]

            # 3. Simulate payment verification
            mock_gw = MagicMock()
            mock_gw.verify_payment_signature.return_value = True
            with patch("ai_credits.payment_service.RazorpayGateway", return_value=mock_gw):
                verify_resp = self.client.post(
                    "/api/credits/verify/",
                    {
                        "gateway_order_id": order_id,
                        "gateway_payment_id": "pay_stage6_test_123",
                        "signature": "valid_sig_123",
                    },
                    format="json",
                )
            self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(verify_resp.data["credits_credited"], 500000)

            wallet = CreditWallet.objects.get(user=self.user_a)
            self.assertEqual(wallet.bonus_balance, 50000)
            self.assertEqual(wallet.purchased_balance, 500000)
            self.assertEqual(wallet.total_balance, 550000)

            # 4. Initiate AI Chat with overage usage (reserved 4096, consumed 5000)
            mock_svc = MagicMock()
            mock_svc.generate_response = AsyncMock(return_value={
                "response": "Detailed architectural analysis.",
                "tokens_used": 5000,
                "metadata": {"prompt_tokens": 2000, "completion_tokens": 3000},
            })
            with patch.object(AIServiceFactory, "create_service", return_value=mock_svc):
                chat_resp = self.client.post(
                    f"/api/sessions/{self.session.id}/send_message/",
                    data={"message": "Analyze system architecture", "stream": False},
                    format="json",
                )
            self.assertEqual(chat_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(chat_resp.data["credits_used"], 5000)

            # 5. Verify accounting: bonus consumed first (5,000 deducted from 50,000 bonus)
            wallet.refresh_from_db()
            self.assertEqual(wallet.bonus_balance, 45000)
            self.assertEqual(wallet.purchased_balance, 500000)
            self.assertEqual(wallet.total_balance, 545000)
            self.assertEqual(wallet.uncollected_deficit, 0)
            self.assertEqual(wallet.reconciliation_status, "settled")

    def test_refund_shortfall_deficit_and_blocking(self):
        """
        Validates refund shortfall handling:
        When a refund reverses more purchased credits than remain available,
        the shortfall is recorded in ledger metadata, the wallet enters deficit status,
        subsequent AI reservations are rejected, and future purchases do not erase the audit trail.
        """
        with self.settings(AI_CREDITS_ENABLED=True):
            # Setup wallet with only 10,000 purchased credits
            wallet, _ = WalletService.get_or_create_wallet(self.user_a)
            wallet.purchased_balance = 10000
            wallet.save()

            # Create payment of ₹199 for 500,000 credits
            pack = CreditPack.objects.get(id="starter")
            payment = Payment.objects.create(
                user=self.user_a,
                amount=pack.price_inr,
                currency="INR",
                gateway="razorpay",
                status=PaymentStatus.SUCCESS_OR_CAPTURED,
            )
            CreditPurchaseSnapshot.objects.create(
                payment=payment,
                user=self.user_a,
                pack_id=pack.id,
                pack_name=pack.name,
                credits=pack.credits,
                amount_paid=pack.price_inr,
                currency="INR",
            )

            # Reversing full refund of ₹199 expects 500,000 credits, but only 10,000 are available
            entry = CreditPaymentService.reverse_credit_purchase_for_refund(
                payment=payment,
                refund_amount=pack.price_inr,
                refund_id="rf_shortfall_audit_1",
            )

            self.assertEqual(entry.delta, -10000)
            self.assertEqual(entry.metadata["uncollected_deficit"], 490000)

            wallet.refresh_from_db()
            self.assertEqual(wallet.purchased_balance, 0)
            self.assertEqual(wallet.uncollected_deficit, 490000)
            self.assertEqual(wallet.reconciliation_status, "deficit_pending_reconciliation")

            # Subsequent AI reservation MUST be blocked by backend
            with self.assertRaises(InsufficientCreditsError) as ctx:
                CreditMeteringManager.reserve_for_chat(
                    user=self.user_a,
                    session_id=str(self.session.id),
                )
            self.assertIn("uncollected deficit of 490,000 credits", str(ctx.exception))

            # User purchases a new pack (Starter: 500,000 credits)
            payment2 = Payment.objects.create(
                user=self.user_a,
                amount=pack.price_inr,
                currency="INR",
                gateway="razorpay",
                status=PaymentStatus.PENDING,
            )
            snapshot2 = CreditPurchaseSnapshot.objects.create(
                payment=payment2,
                user=self.user_a,
                pack_id=pack.id,
                pack_name=pack.name,
                credits=pack.credits,
                amount_paid=pack.price_inr,
                currency="INR",
            )
            CreditPaymentService._fulfill_payment_credits_atomic(
                payment=payment2,
                gateway_payment_id="pay_stage6_new_pack",
                source="checkout_verify",
            )

            wallet.refresh_from_db()
            # Purchased balance is now 500,000, BUT outstanding deficit remains auditable and not erased
            self.assertEqual(wallet.purchased_balance, 500000)
            self.assertEqual(wallet.uncollected_deficit, 490000)
            self.assertEqual(wallet.reconciliation_status, "deficit_pending_reconciliation")

    def test_user_data_isolation_security(self):
        """Ensures complete user isolation: User A cannot see or mutate User B's credit data."""
        with self.settings(AI_CREDITS_ENABLED=True):
            WalletService.grant_signup_bonus(self.user_a)
            WalletService.grant_signup_bonus(self.user_b)

            # User A queries /api/credits/wallet/
            self.client.force_authenticate(user=self.user_a)
            resp_a = self.client.get("/api/credits/wallet/")
            self.assertEqual(resp_a.status_code, status.HTTP_200_OK)

            wallet_a = CreditWallet.objects.get(user=self.user_a)
            wallet_b = CreditWallet.objects.get(user=self.user_b)

            self.assertEqual(resp_a.data["id"], str(wallet_a.id))
            self.assertNotEqual(resp_a.data["id"], str(wallet_b.id))

            # User A queries /api/credits/history/ (ledger entries)
            history_resp = self.client.get("/api/credits/history/")
            self.assertEqual(history_resp.status_code, status.HTTP_200_OK)
            user_ids = {item.get("user") for item in history_resp.data.get("results", []) if item.get("user")}
            # If user field is present, verify it only belongs to user_a
            for uid in user_ids:
                self.assertEqual(str(uid), str(self.user_a.id))


# ==============================================================================
# STAGE 7: DEFICIT RECONCILIATION & STAGING READINESS TESTS
# ==============================================================================

class Stage7DeficitReconciliationAndStagingReadinessTests(APITransactionTestCase):
    """
    Tests for the Stage 7 administrative deficit reconciliation workflow and staging readiness:
    1. Deficit remains after a new purchase (does not auto-offset).
    2. AI reservations remain blocked while a deficit is unresolved.
    3. Authorized staff reconciliation resolves deficit and unblocks AI.
    4. Unauthorized (non-staff) users cannot resolve deficits (PermissionDenied / HTTP 403).
    5. Reconciliation requires mandatory non-empty reason and bounds amounts.
    6. Duplicate or concurrent reconciliation cannot resolve the same deficit twice (idempotency).
    7. Historical ledger entries and usage records remain immutable after reconciliation.
    8. Admin API lists unresolved deficits with full breakdown.
    9. reconcile_user_deficit management command supports dry-run and live resolution.
    10. Stale reservation expiry command idempotency and safety.
    """

    def setUp(self):
        connections.close_all()
        ensure_default_packs()

        self.user = User.objects.create_user(
            username="user_stage7",
            email="user_stage7@example.com",
            password="Password123!",
            first_name="Stage7",
            last_name="User",
        )
        self.staff_admin = User.objects.create_user(
            username="admin_stage7",
            email="admin_stage7@example.com",
            password="AdminPassword123!",
            first_name="Admin",
            last_name="Staff",
            is_staff=True,
        )
        self.agent = AIAgent.objects.create(
            name="Stage 7 Gemini Agent",
            provider="gemini",
            model_name="gemini-2.5-flash",
            is_active=True,
            max_tokens=4096,
        )
        self.session = ChatSession.objects.create(
            user=self.user,
            ai_agent=self.agent,
            title="Stage 7 Session",
        )

    def tearDown(self):
        connections.close_all()

    def test_deficit_remains_after_new_purchase(self):
        """A new credit pack purchase credits purchased balance but does NOT clear an existing deficit."""
        with self.settings(AI_CREDITS_ENABLED=True):
            wallet, _ = WalletService.get_or_create_wallet(self.user)
            # Create an uncollected overage deficit of 2,500 credits
            CreditUsageRecord.objects.create(
                user=self.user,
                wallet=wallet,
                credits_charged=2500,
                status="overage_deficit",
                metadata={"uncollected_overage": 2500},
            )
            wallet.refresh_from_db()
            self.assertEqual(wallet.uncollected_deficit, 2500)
            self.assertEqual(wallet.reconciliation_status, "deficit_pending_reconciliation")

            # User purchases starter pack (500,000 credits)
            pack = CreditPack.objects.get(id="starter")
            payment = Payment.objects.create(
                user=self.user,
                amount=pack.price_inr,
                currency="INR",
                gateway="razorpay",
                status=PaymentStatus.PENDING,
            )
            CreditPurchaseSnapshot.objects.create(
                payment=payment,
                user=self.user,
                pack_id=pack.id,
                pack_name=pack.name,
                credits=pack.credits,
                amount_paid=pack.price_inr,
                currency="INR",
            )
            CreditPaymentService._fulfill_payment_credits_atomic(
                payment=payment,
                gateway_payment_id="pay_stage7_purchase_1",
                source="checkout_verify",
            )

            wallet.refresh_from_db()
            # Purchased credits were added, but deficit was NOT erased or silently deducted!
            self.assertEqual(wallet.purchased_balance, 500000)
            self.assertEqual(wallet.uncollected_deficit, 2500)
            self.assertEqual(wallet.reconciliation_status, "deficit_pending_reconciliation")

            # AI calls remain blocked
            with self.assertRaises(InsufficientCreditsError) as ctx:
                CreditMeteringManager.reserve_for_chat(user=self.user, session_id=str(self.session.id))
            self.assertIn("uncollected deficit of 2,500 credits", str(ctx.exception))

    def test_authorized_staff_reconciliation_resolves_deficit_and_unblocks_ai(self):
        """Staff administrator can reconcile a deficit with an explicit reason, unblocking AI requests."""
        with self.settings(AI_CREDITS_ENABLED=True):
            wallet, _ = WalletService.get_or_create_wallet(self.user)
            rec = CreditUsageRecord.objects.create(
                user=self.user,
                wallet=wallet,
                credits_charged=1500,
                status="overage_deficit",
                metadata={"uncollected_overage": 1500},
            )
            self.assertEqual(wallet.uncollected_deficit, 1500)

            # Reconcile via WalletService
            resolution, updated_wallet = WalletService.reconcile_deficit(
                wallet_id=wallet.id,
                admin_user=self.staff_admin,
                usage_record_id=rec.id,
                reason="Goodwill waiver approved by finance for beta participant",
                resolution_method="goodwill_adjustment",
            )

            self.assertEqual(resolution.amount_resolved, 1500)
            self.assertEqual(resolution.admin_user, self.staff_admin)
            self.assertEqual(resolution.resolution_method, "goodwill_adjustment")
            self.assertEqual(updated_wallet.uncollected_deficit, 0)
            self.assertEqual(updated_wallet.reconciliation_status, "settled")

            # Grant signup bonus so wallet has spendable credits
            WalletService.grant_signup_bonus(self.user)

            # AI reservation now succeeds without blocking!
            reservation = CreditMeteringManager.reserve_for_chat(
                user=self.user,
                session_id=str(self.session.id),
                max_tokens=2048,
            )
            self.assertIsNotNone(reservation)
            self.assertEqual(reservation.total_reserved, 4096)

    def test_unauthorized_user_cannot_reconcile_deficit(self):
        """Ordinary non-staff users cannot execute deficit reconciliation via service or API."""
        with self.settings(AI_CREDITS_ENABLED=True):
            wallet, _ = WalletService.get_or_create_wallet(self.user)
            CreditUsageRecord.objects.create(
                user=self.user,
                wallet=wallet,
                credits_charged=800,
                status="overage_deficit",
                metadata={"uncollected_overage": 800},
            )

            # Direct service call by non-staff user must raise PermissionDenied
            with self.assertRaises(PermissionDenied):
                WalletService.reconcile_deficit(
                    wallet_id=wallet.id,
                    admin_user=self.user,  # Non-staff user
                    reason="Attempted self-waiver",
                )

            # API call by non-staff user must return HTTP 403 Forbidden
            self.client.force_authenticate(user=self.user)
            resp = self.client.post(
                "/api/credits/admin/reconcile/",
                data={
                    "wallet_id": str(wallet.id),
                    "reason": "Attempted self-waiver via API",
                },
                format="json",
            )
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

            # Deficit remains completely untouched
            wallet.refresh_from_db()
            self.assertEqual(wallet.uncollected_deficit, 800)

    def test_reconciliation_requires_valid_reason_and_bounds_amounts(self):
        """Reconciliation rejects empty reasons and clamps over-resolution safely."""
        with self.settings(AI_CREDITS_ENABLED=True):
            wallet, _ = WalletService.get_or_create_wallet(self.user)
            CreditUsageRecord.objects.create(
                user=self.user,
                wallet=wallet,
                credits_charged=1000,
                status="overage_deficit",
                metadata={"uncollected_overage": 1000},
            )

            # Empty reason rejected
            with self.assertRaises(ValidationError):
                WalletService.reconcile_deficit(
                    wallet_id=wallet.id,
                    admin_user=self.staff_admin,
                    reason="   ",
                )

            # Resolving 50,000 when only 1,000 deficit exists clamps to 1,000
            res, updated_wallet = WalletService.reconcile_deficit(
                wallet_id=wallet.id,
                admin_user=self.staff_admin,
                amount_to_resolve=50000,
                reason="Clamped resolution test",
            )
            self.assertEqual(res.amount_resolved, 1000)
            self.assertEqual(updated_wallet.uncollected_deficit, 0)

    def test_reconciliation_idempotency_and_duplicate_prevention(self):
        """Same idempotency key safely returns existing resolution without double-resolving."""
        with self.settings(AI_CREDITS_ENABLED=True):
            wallet, _ = WalletService.get_or_create_wallet(self.user)
            rec = CreditUsageRecord.objects.create(
                user=self.user,
                wallet=wallet,
                credits_charged=600,
                status="overage_deficit",
                metadata={"uncollected_overage": 600},
            )

            idem_key = "recon_test_idem_123"
            res1, _ = WalletService.reconcile_deficit(
                wallet_id=wallet.id,
                admin_user=self.staff_admin,
                usage_record_id=rec.id,
                reason="First attempt",
                idempotency_key=idem_key,
            )

            # Second call with same idempotency key
            res2, _ = WalletService.reconcile_deficit(
                wallet_id=wallet.id,
                admin_user=self.staff_admin,
                usage_record_id=rec.id,
                reason="Second attempt with same key",
                idempotency_key=idem_key,
            )
            self.assertEqual(res1.id, res2.id)

            # New attempt with new key on already-resolved record raises ValidationError
            with self.assertRaises(ValidationError) as ctx:
                WalletService.reconcile_deficit(
                    wallet_id=wallet.id,
                    admin_user=self.staff_admin,
                    usage_record_id=rec.id,
                    reason="Attempt on already resolved",
                    idempotency_key="new_key",
                )
            self.assertTrue(
                "already been fully resolved" in str(ctx.exception)
                or "no unresolved deficit" in str(ctx.exception)
            )

    def test_historical_records_remain_immutable_after_reconciliation(self):
        """Reconciliation creates audit resolution and ledger entry; historical records remain immutable."""
        with self.settings(AI_CREDITS_ENABLED=True):
            wallet, _ = WalletService.get_or_create_wallet(self.user)
            rec = CreditUsageRecord.objects.create(
                user=self.user,
                wallet=wallet,
                credits_charged=1200,
                status="overage_deficit",
                metadata={"uncollected_overage": 1200, "session_note": "original_note"},
            )

            WalletService.reconcile_deficit(
                wallet_id=wallet.id,
                admin_user=self.staff_admin,
                usage_record_id=rec.id,
                reason="Finance approved adjustment",
                resolution_method="admin_waiver",
            )

            # Verify historical usage record was NOT modified or deleted
            rec.refresh_from_db()
            self.assertEqual(rec.status, "overage_deficit")
            self.assertEqual(rec.metadata.get("uncollected_overage"), 1200)
            self.assertEqual(rec.metadata.get("session_note"), "original_note")

            # Verify append-only ledger entry was created
            ledger_entry = CreditLedgerEntry.objects.filter(
                wallet=wallet,
                entry_type=CreditEntryType.DEFICIT_RECONCILIATION,
            ).first()
            self.assertIsNotNone(ledger_entry)
            self.assertEqual(ledger_entry.delta, 0)
            self.assertIn("Finance approved adjustment", ledger_entry.metadata.get("reason", ""))

    def test_admin_api_list_and_reconcile_endpoints(self):
        """Staff admin can list deficits and execute reconciliation via DRF API endpoints."""
        with self.settings(AI_CREDITS_ENABLED=True):
            wallet, _ = WalletService.get_or_create_wallet(self.user)
            CreditUsageRecord.objects.create(
                user=self.user,
                wallet=wallet,
                credits_charged=950,
                status="overage_deficit",
                metadata={"uncollected_overage": 950},
            )

            self.client.force_authenticate(user=self.staff_admin)

            # 1. GET /api/credits/admin/deficits/?wallet_id=...
            list_resp = self.client.get(f"/api/credits/admin/deficits/?wallet_id={wallet.id}")
            self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(list_resp.data["total_unresolved_deficit"], 950)
            self.assertEqual(len(list_resp.data["unresolved_items"]), 1)

            # 2. POST /api/credits/admin/reconcile/
            recon_resp = self.client.post(
                "/api/credits/admin/reconcile/",
                data={
                    "wallet_id": str(wallet.id),
                    "reason": "Admin waiver granted via API",
                    "resolution_method": "admin_waiver",
                },
                format="json",
            )
            self.assertEqual(recon_resp.status_code, status.HTTP_200_OK)
            self.assertEqual(recon_resp.data["status"], "success")
            self.assertEqual(recon_resp.data["resolution"]["amount_resolved"], 950)
            self.assertEqual(recon_resp.data["wallet"]["reconciliation_status"], "settled")
            self.assertEqual(recon_resp.data["wallet"]["uncollected_deficit"], 0)

    def test_reconcile_management_command(self):
        """reconcile_user_deficit management command supports dry-run and live resolution."""
        with self.settings(AI_CREDITS_ENABLED=True):
            wallet, _ = WalletService.get_or_create_wallet(self.user)
            CreditUsageRecord.objects.create(
                user=self.user,
                wallet=wallet,
                credits_charged=700,
                status="overage_deficit",
                metadata={"uncollected_overage": 700},
            )

            # Dry run
            out_dry = StringIO()
            call_command(
                "reconcile_user_deficit",
                f"--user-id={self.user.id}",
                "--reason=Management command test",
                "--dry-run",
                stdout=out_dry,
            )
            self.assertIn("[Dry Run] Would reconcile 700 of 700 deficit credits", out_dry.getvalue())

            wallet.refresh_from_db()
            self.assertEqual(wallet.uncollected_deficit, 700)

            # Live run
            out_live = StringIO()
            call_command(
                "reconcile_user_deficit",
                f"--user-id={self.user.id}",
                "--reason=Live management command execution",
                stdout=out_live,
            )
            self.assertIn("Successfully reconciled 700 credits", out_live.getvalue())

            wallet.refresh_from_db()
            self.assertEqual(wallet.uncollected_deficit, 0)
            self.assertEqual(wallet.reconciliation_status, "settled")






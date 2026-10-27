import hashlib
import hmac
import json
import logging
from decimal import Decimal
from typing import Any, Dict, Optional, Tuple

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from payment.gateways.razorpay import RazorpayGateway
from payment.models import Payment, PaymentGateway, PaymentStatus, PurchasableItem, PurchasableType, UserEntitlement
from payment.payment_service import PaymentService

from .exceptions import (
    DuplicateWebhookEventError,
    InvalidPackError,
    PaymentAlreadyFulfilledError,
    PaymentVerificationError,
)
from .models import (
    CreditBucket,
    CreditEntryType,
    CreditLedgerEntry,
    CreditPack,
    CreditPurchaseSnapshot,
    CreditWallet,
    PaymentWebhookEvent,
    WebhookEventStatus,
)
from .wallet_service import WalletService

logger = logging.getLogger(__name__)


class CreditPaymentService:
    """
    Dedicated service handling credit pack order creation, server-side price validation,
    Razorpay checkout verification, atomic credit fulfillment, and idempotent webhook processing.
    """

    @classmethod
    def get_active_packs(cls):
        """Returns all currently active credit packs ordered by catalog sort order."""
        return CreditPack.objects.filter(is_active=True).order_by("sort_order", "price_inr")

    @classmethod
    def create_credit_pack_order(
        cls,
        user,
        pack_id: str,
        client_request_id: Optional[str] = None,
    ) -> Tuple[Payment, CreditPurchaseSnapshot, Dict[str, Any]]:
        """
        Creates a server-validated order for a credit pack.
        Prices and credit amounts are strictly verified from the server-side catalog;
        frontend-supplied amounts are never accepted.
        """
        try:
            pack = CreditPack.objects.get(id=pack_id, is_active=True, is_signup_bonus=False)
        except CreditPack.DoesNotExist:
            raise InvalidPackError(f"Credit pack '{pack_id}' is invalid, inactive, or not purchasable")

        # Idempotency check: if client_request_id was already used, return existing order
        if client_request_id:
            existing_payment = Payment.objects.filter(
                client_request_id=client_request_id,
                user=user,
            ).first()
            if existing_payment and hasattr(existing_payment, "credit_purchase_snapshot"):
                snapshot = existing_payment.credit_purchase_snapshot
                checkout_data = {
                    "order_id": existing_payment.gateway_order_or_intent_id,
                    "payment_id": str(existing_payment.id),
                    "amount": pack.price_paise,
                    "currency": "INR",
                    "key_id": getattr(settings, "RAZORPAY_KEY_ID", ""),
                    "name": "Yuvro",
                    "description": pack.name,
                    "pack_id": pack.id,
                    "credits": pack.credits,
                }
                return existing_payment, snapshot, checkout_data

        # Ensure PurchasableItem is linked
        purchasable_item = pack.purchasable_item
        if not purchasable_item:
            purchasable_item, _ = PurchasableItem.objects.get_or_create(
                item_type=PurchasableType.AI_CREDIT,
                item_id=pack.id,
                defaults={
                    "name": pack.name,
                    "product": "ylabs",
                    "current_price": pack.price_inr,
                    "is_active": True,
                    "metadata": {"credits": pack.credits},
                },
            )

        with transaction.atomic():
            payment_service = PaymentService()
            payment = payment_service.create_payment(
                user=user,
                amount=float(pack.price_inr),
                currency="INR",
                purpose=f"AI Credit - {pack.name}",
                description=pack.description or f"Purchase of {pack.credits:,} AI credits",
                product="ylabs",
                gateway_name="razorpay",
                metadata={
                    "pack_id": pack.id,
                    "credits": pack.credits,
                    "product": "ylabs",
                },
            )

            payment.purchasable_item = purchasable_item
            if client_request_id:
                payment.client_request_id = client_request_id
            payment.save(update_fields=["purchasable_item", "client_request_id"])

            snapshot = CreditPurchaseSnapshot.objects.create(
                payment=payment,
                user=user,
                pack_id=pack.id,
                pack_name=pack.name,
                credits=pack.credits,
                amount_paid=pack.price_inr,
                currency="INR",
                raw_payment_details={
                    "price_paise": pack.price_paise,
                    "purchasable_item_id": purchasable_item.id if purchasable_item else None,
                },
            )

        checkout_data = {
            "order_id": payment.gateway_order_or_intent_id,
            "payment_id": str(payment.id),
            "amount": pack.price_paise,
            "currency": "INR",
            "key_id": getattr(settings, "RAZORPAY_KEY_ID", ""),
            "name": "Yuvro",
            "description": pack.name,
            "pack_id": pack.id,
            "credits": pack.credits,
        }
        logger.info(
            f"Created credit pack order: Payment {payment.id}, Order {payment.gateway_order_or_intent_id}, Pack {pack.id}"
        )
        return payment, snapshot, checkout_data

    @classmethod
    def verify_and_fulfill_checkout(
        cls,
        user,
        gateway_order_id: str,
        gateway_payment_id: str,
        signature: str,
    ) -> Dict[str, Any]:
        """
        Verifies checkout signatures using Razorpay HMAC verification, checks order
        and user association, validates purchase snapshot integrity, and fulfills credits atomically.
        """
        if not all([gateway_order_id, gateway_payment_id, signature]):
            raise PaymentVerificationError("Missing required payment verification fields")

        # Step 1: Cryptographic signature verification
        gateway = RazorpayGateway()
        is_valid = gateway.verify_signature(
            order_id=gateway_order_id,
            payment_id=gateway_payment_id,
            signature=signature,
        )
        if not is_valid:
            logger.error(f"Invalid Razorpay signature for order {gateway_order_id}, payment {gateway_payment_id}")
            raise PaymentVerificationError("Invalid payment signature")

        # Step 2: Fetch and validate Payment record
        try:
            payment = Payment.objects.select_related("credit_purchase_snapshot", "user").get(
                gateway_order_or_intent_id=gateway_order_id,
            )
        except Payment.DoesNotExist:
            raise PaymentVerificationError(f"Payment for order {gateway_order_id} not found")

        if payment.user_id != user.id:
            logger.error(f"User mismatch: Payment {payment.id} belongs to {payment.user_id}, but {user.id} attempted verification")
            raise PaymentVerificationError("Payment user mismatch")

        if not hasattr(payment, "credit_purchase_snapshot"):
            raise PaymentVerificationError("Payment is not associated with an AI credit purchase")

        # Step 3: Atomic credit fulfillment
        return cls._fulfill_payment_credits_atomic(
            payment=payment,
            gateway_payment_id=gateway_payment_id,
            source="checkout_verify",
            signature=signature,
        )

    @classmethod
    def process_webhook(
        cls,
        raw_body_bytes: bytes,
        signature: Optional[str],
        event_id_header: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes incoming Razorpay webhooks with signature verification,
        event-level deduplication, atomic fulfillment, and error handling.
        """
        # Step 1: Signature verification
        secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
        if not secret or not signature:
            raise PaymentVerificationError("Webhook secret or signature missing")

        expected_signature = hmac.new(
            secret.encode("utf-8"),
            raw_body_bytes,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            logger.error("Invalid Razorpay webhook signature")
            raise PaymentVerificationError("Invalid webhook signature")

        # Step 2: Parse JSON payload
        try:
            payload = json.loads(raw_body_bytes.decode("utf-8"))
        except Exception as e:
            raise PaymentVerificationError(f"Invalid webhook JSON payload: {e}")

        event_type = payload.get("event", "")
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        gateway_payment_id = payment_entity.get("id")
        gateway_order_id = payment_entity.get("order_id")

        # Determine unique event ID for deduplication
        event_id = event_id_header or payload.get("id") or f"{event_type}:{gateway_payment_id or uuid.uuid4().hex}"

        # Step 3: Record or retrieve webhook event
        with transaction.atomic():
            webhook_event, created = PaymentWebhookEvent.objects.select_for_update().get_or_create(
                event_id=event_id,
                defaults={
                    "event_type": event_type,
                    "gateway": "razorpay",
                    "payload": payload,
                    "status": WebhookEventStatus.RECEIVED,
                },
            )

            # If already processed, ignore safely
            if not created and webhook_event.status == WebhookEventStatus.PROCESSED:
                logger.info(f"Webhook event {event_id} already processed. Safely ignoring.")
                return {"status": "DUPLICATE_IGNORED", "event_id": event_id}

        # Step 4: Handle events
        try:
            if event_type in ["payment.captured", "order.paid"]:
                if not gateway_order_id:
                    webhook_event.status = WebhookEventStatus.IGNORED
                    webhook_event.processing_error = "No order_id present in webhook payment entity"
                    webhook_event.save(update_fields=["status", "processing_error"])
                    return {"status": "IGNORED", "reason": "No order_id"}

                payment = Payment.objects.filter(gateway_order_or_intent_id=gateway_order_id).first()
                if not payment:
                    webhook_event.status = WebhookEventStatus.IGNORED
                    webhook_event.processing_error = f"Payment for order {gateway_order_id} not found"
                    webhook_event.save(update_fields=["status", "processing_error"])
                    return {"status": "IGNORED", "reason": "Payment not found"}

                if not hasattr(payment, "credit_purchase_snapshot"):
                    webhook_event.status = WebhookEventStatus.IGNORED
                    webhook_event.processing_error = "Non-AI-credit payment event"
                    webhook_event.save(update_fields=["status", "processing_error"])
                    return {"status": "IGNORED", "reason": "Not an AI credit payment"}

                snapshot = payment.credit_purchase_snapshot

                # Validate amount from webhook payload against snapshot
                amount_paise = payment_entity.get("amount")
                expected_paise = int(snapshot.amount_paid * 100)
                if amount_paise is not None and amount_paise != expected_paise:
                    err_msg = f"Amount mismatch: expected {expected_paise} paise, received {amount_paise} paise"
                    logger.error(err_msg)
                    webhook_event.status = WebhookEventStatus.FAILED
                    webhook_event.processing_error = err_msg
                    webhook_event.save(update_fields=["status", "processing_error"])
                    raise PaymentVerificationError(err_msg)

                # Fulfill payment atomically
                result = cls._fulfill_payment_credits_atomic(
                    payment=payment,
                    gateway_payment_id=gateway_payment_id,
                    source="webhook",
                    event_payload=payload,
                )

                webhook_event.status = WebhookEventStatus.PROCESSED
                webhook_event.processed_at = timezone.now()
                webhook_event.save(update_fields=["status", "processed_at"])
                return {"status": "PROCESSED", "result": result}

            elif event_type in ["payment.failed"]:
                if gateway_order_id:
                    payment = Payment.objects.filter(gateway_order_or_intent_id=gateway_order_id).first()
                    if payment and payment.status not in [PaymentStatus.SUCCESS_OR_CAPTURED, PaymentStatus.REFUNDED]:
                        payment.status = PaymentStatus.FAILED
                        payment.save(update_fields=["status"])

                webhook_event.status = WebhookEventStatus.PROCESSED
                webhook_event.processed_at = timezone.now()
                webhook_event.save(update_fields=["status", "processed_at"])
                return {"status": "PROCESSED_FAILED"}

            else:
                webhook_event.status = WebhookEventStatus.IGNORED
                webhook_event.save(update_fields=["status"])
                return {"status": "IGNORED", "event_type": event_type}

        except Exception as e:
            logger.error(f"Error processing webhook event {event_id}: {e}", exc_info=True)
            webhook_event.status = WebhookEventStatus.FAILED
            webhook_event.processing_error = str(e)
            webhook_event.save(update_fields=["status", "processing_error"])
            raise

    @classmethod
    def _fulfill_payment_credits_atomic(
        cls,
        payment: Payment,
        gateway_payment_id: str,
        source: str,
        signature: str = "",
        event_payload: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """
        Atomically fulfills purchased credits.
        Completely idempotent: if payment was already captured or credited, skips duplicate crediting.
        """
        idempotency_key = f"purchase:{payment.id}"

        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(id=payment.id)
            snapshot = payment.credit_purchase_snapshot

            # Idempotency check: if ledger entry exists, credits were already added
            already_credited = CreditLedgerEntry.objects.filter(idempotency_key=idempotency_key).exists()

            if not already_credited:
                WalletService.credit_wallet_for_purchase(
                    user=payment.user,
                    credits=snapshot.credits,
                    payment=payment,
                    snapshot=snapshot,
                    idempotency_key=idempotency_key,
                )

            # Update Payment status and audit attempts
            payment.status = PaymentStatus.SUCCESS_OR_CAPTURED
            payment.gateway_payment_or_charge_id = gateway_payment_id
            payment.completed_at = timezone.now()
            payment.latest_successfull_payment = {
                "amount": float(payment.amount),
                "gateway_payment_id": gateway_payment_id,
                "source": source,
                "signature": signature,
                "completed_at": payment.completed_at.isoformat(),
            }

            attempts = list(payment.payment_attempts or [])
            attempts.append({
                "attempt_number": len(attempts) + 1,
                "gateway_payment_id": gateway_payment_id,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "status": payment.status,
                "source": source,
                "timestamp": timezone.now().isoformat(),
            })
            payment.payment_attempts = attempts
            payment.save(
                update_fields=[
                    "status",
                    "gateway_payment_or_charge_id",
                    "completed_at",
                    "latest_successfull_payment",
                    "payment_attempts",
                ]
            )

            # Create UserEntitlement for backwards compatibility with payment queries
            if payment.purchasable_item:
                UserEntitlement.objects.get_or_create(
                    user=payment.user,
                    payment=payment,
                    purchasable_item=payment.purchasable_item,
                )

        wallet = CreditWallet.objects.get(user=payment.user)
        logger.info(
            f"Fulfillment complete for payment {payment.id}. User {payment.user.id} wallet total: {wallet.total_balance:,} credits"
        )
        return {
            "status": "SUCCESS",
            "payment_id": str(payment.id),
            "credits_credited": snapshot.credits,
            "wallet_balance": wallet.total_available,
            "was_already_credited": already_credited,
        }

    @classmethod
    def reverse_credit_purchase_for_refund(
        cls,
        payment: Payment,
        refund_amount: Decimal,
        refund_id: str,
    ) -> CreditLedgerEntry:
        """
        Reverses purchased credits when a refund is issued.
        Deducts credits up to available purchased credits without creating negative balances.
        """
        idempotency_key = f"refund:{payment.id}:{refund_id}"

        with transaction.atomic():
            existing = CreditLedgerEntry.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing

            payment = Payment.objects.select_for_update().get(id=payment.id)
            snapshot = payment.credit_purchase_snapshot
            wallet = CreditWallet.objects.select_for_update().get(user=payment.user)

            # Calculate proportion of credits to refund
            if payment.amount > 0:
                fraction = min(Decimal("1.0"), Decimal(str(refund_amount)) / payment.amount)
                credits_to_reverse = int(snapshot.credits * fraction)
            else:
                credits_to_reverse = snapshot.credits

            # Deduct from purchased balance down to 0 (never negative)
            deduct_amount = min(wallet.purchased_balance, credits_to_reverse)
            uncollected_deficit = credits_to_reverse - deduct_amount

            wallet.purchased_balance -= deduct_amount
            wallet.save(update_fields=["purchased_balance", "updated_at"])

            entry = CreditLedgerEntry.objects.create(
                wallet=wallet,
                user=payment.user,
                entry_type=CreditEntryType.REFUND_REVERSAL,
                bucket=CreditBucket.PURCHASED,
                delta=-deduct_amount,
                balance_after_bonus=wallet.bonus_balance,
                balance_after_purchased=wallet.purchased_balance,
                reserved_after_bonus=wallet.reserved_bonus,
                reserved_after_purchased=wallet.reserved_purchased,
                idempotency_key=idempotency_key,
                payment=payment,
                description=f"Refund reversal ({credits_to_reverse:,} credits, deducted {deduct_amount:,})",
                metadata={
                    "refund_id": refund_id,
                    "refund_amount": str(refund_amount),
                    "uncollected_deficit": uncollected_deficit,
                },
            )
            return entry

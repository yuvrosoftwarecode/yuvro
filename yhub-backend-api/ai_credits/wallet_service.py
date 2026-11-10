import logging
import uuid
from datetime import timedelta
from typing import Optional, Tuple

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .exceptions import (
    CreditError,
    InsufficientCreditsError,
    ReservationLimitExceededError,
    ReservationNotFoundError,
    ReservationStateError,
)
from .models import (
    CreditBucket,
    CreditDeficitResolution,
    CreditEntryType,
    CreditLedgerEntry,
    CreditReservation,
    CreditUsageRecord,
    CreditWallet,
    ReservationStatus,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class WalletService:
    """
    Dedicated service layer for all AI credit wallet operations,
    atomic reservations, balance locks, and append-only ledger entries.
    """

    DEFAULT_RESERVATION = getattr(settings, "AI_CREDITS_DEFAULT_RESERVATION", 4096)
    MAX_RESERVATION = getattr(settings, "AI_CREDITS_MAX_RESERVATION", 16384)
    RESERVATION_EXPIRY_SECONDS = getattr(settings, "AI_CREDITS_RESERVATION_EXPIRY_SECONDS", 300)
    SIGNUP_BONUS_AMOUNT = 50_000

    @classmethod
    def get_or_create_wallet(
        cls,
        user,
        grant_signup_bonus: bool = False,
    ) -> Tuple[CreditWallet, bool]:
        """
        Safely retrieves or initializes a CreditWallet for the specified user.
        If grant_signup_bonus is True, guarantees the one-time 50k bonus is awarded.
        """
        with transaction.atomic():
            wallet, created = CreditWallet.objects.select_for_update().get_or_create(
                user=user,
                defaults={
                    "bonus_balance": 0,
                    "purchased_balance": 0,
                    "reserved_bonus": 0,
                    "reserved_purchased": 0,
                    "signup_bonus_granted": False,
                },
            )
            if grant_signup_bonus and not wallet.signup_bonus_granted:
                cls.grant_signup_bonus(user=user, wallet=wallet)
                wallet.refresh_from_db()

        return wallet, created

    @classmethod
    def grant_signup_bonus(
        cls,
        user,
        amount: int = SIGNUP_BONUS_AMOUNT,
        wallet: Optional[CreditWallet] = None,
    ) -> Tuple[CreditWallet, bool]:
        """
        Grants the one-time signup bonus of credits exactly once.
        Guaranteed idempotent by row locking and unique ledger idempotency key.
        """
        idempotency_key = f"signup_bonus:{user.id}"

        with transaction.atomic():
            if wallet is None:
                wallet, _ = CreditWallet.objects.select_for_update().get_or_create(
                    user=user,
                    defaults={
                        "bonus_balance": 0,
                        "purchased_balance": 0,
                        "reserved_bonus": 0,
                        "reserved_purchased": 0,
                        "signup_bonus_granted": False,
                    },
                )
            else:
                wallet = CreditWallet.objects.select_for_update().get(pk=wallet.pk)

            if wallet.signup_bonus_granted:
                logger.info(f"Signup bonus already granted for user {user.id}")
                return wallet, False

            # Check if ledger entry already exists (in case wallet flag failed to update previously)
            if CreditLedgerEntry.objects.filter(idempotency_key=idempotency_key).exists():
                wallet.signup_bonus_granted = True
                wallet.save(update_fields=["signup_bonus_granted", "updated_at"])
                return wallet, False

            wallet.bonus_balance += amount
            wallet.signup_bonus_granted = True
            wallet.save(update_fields=["bonus_balance", "signup_bonus_granted", "updated_at"])

            CreditLedgerEntry.objects.create(
                wallet=wallet,
                user=user,
                entry_type=CreditEntryType.SIGNUP_BONUS,
                bucket=CreditBucket.BONUS,
                delta=amount,
                balance_after_bonus=wallet.bonus_balance,
                balance_after_purchased=wallet.purchased_balance,
                reserved_after_bonus=wallet.reserved_bonus,
                reserved_after_purchased=wallet.reserved_purchased,
                idempotency_key=idempotency_key,
                description=f"Initial welcome bonus ({amount:,} credits)",
            )
            logger.info(f"Successfully granted {amount:,} signup bonus credits to user {user.id}")
            return wallet, True

    @classmethod
    def credit_wallet_for_purchase(
        cls,
        user,
        credits: int,
        payment,
        snapshot,
        idempotency_key: str,
    ) -> CreditLedgerEntry:
        """
        Adds purchased credits to the user's purchased balance.
        Idempotent by payment ID / unique idempotency key.
        """
        if credits <= 0:
            raise ValueError(f"Credits to add must be positive, got {credits}")

        with transaction.atomic():
            # Check if this purchase was already credited
            existing_entry = CreditLedgerEntry.objects.filter(idempotency_key=idempotency_key).first()
            if existing_entry:
                logger.info(f"Purchase idempotency key {idempotency_key} already credited. Skipping duplicate.")
                return existing_entry

            wallet, _ = CreditWallet.objects.select_for_update().get_or_create(user=user)
            wallet.purchased_balance += credits
            wallet.save(update_fields=["purchased_balance", "updated_at"])

            entry = CreditLedgerEntry.objects.create(
                wallet=wallet,
                user=user,
                entry_type=CreditEntryType.PURCHASE,
                bucket=CreditBucket.PURCHASED,
                delta=credits,
                balance_after_bonus=wallet.bonus_balance,
                balance_after_purchased=wallet.purchased_balance,
                reserved_after_bonus=wallet.reserved_bonus,
                reserved_after_purchased=wallet.reserved_purchased,
                idempotency_key=idempotency_key,
                payment=payment,
                description=f"Purchased {credits:,} credits ({snapshot.pack_name})",
                metadata={
                    "pack_id": snapshot.pack_id,
                    "pack_name": snapshot.pack_name,
                    "amount_paid": str(snapshot.amount_paid),
                    "currency": snapshot.currency,
                },
            )
            logger.info(f"Credited {credits:,} purchased credits to user {user.id} (Payment: {payment.id})")
            return entry

    @classmethod
    def reserve_credits(
        cls,
        user,
        amount: Optional[int] = None,
        session_id: Optional[str] = None,
        message_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        expiry_seconds: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> CreditReservation:
        """
        Atomically locks credits before making an LLM provider call.
        Consumes bonus credits first, then purchased credits.
        Database row locks are released immediately when this method completes.
        """
        if amount is None:
            amount = cls.DEFAULT_RESERVATION
        if amount <= 0:
            raise ValueError(f"Reservation amount must be positive, got {amount}")
        if amount > cls.MAX_RESERVATION:
            raise ReservationLimitExceededError(
                f"Requested reservation {amount} exceeds configured maximum {cls.MAX_RESERVATION}"
            )

        if not idempotency_key:
            idempotency_key = f"res:{uuid.uuid4()}"

        # Fast idempotent check
        existing_res = CreditReservation.objects.filter(idempotency_key=idempotency_key).first()
        if existing_res:
            return existing_res

        ttl = expiry_seconds or cls.RESERVATION_EXPIRY_SECONDS
        expires_at = timezone.now() + timedelta(seconds=ttl)

        with transaction.atomic():
            # Check idempotency again within transaction
            existing_res = CreditReservation.objects.filter(idempotency_key=idempotency_key).first()
            if existing_res:
                return existing_res

            wallet, _ = CreditWallet.objects.select_for_update().get_or_create(user=user)
            total_available = wallet.bonus_balance + wallet.purchased_balance

            if total_available < amount:
                raise InsufficientCreditsError(
                    f"Insufficient credits: available {total_available}, required {amount}",
                    available=total_available,
                    required=amount,
                )

            # Bonus-first reservation strategy
            reserve_bonus = min(wallet.bonus_balance, amount)
            reserve_purchased = amount - reserve_bonus

            wallet.bonus_balance -= reserve_bonus
            wallet.reserved_bonus += reserve_bonus
            wallet.purchased_balance -= reserve_purchased
            wallet.reserved_purchased += reserve_purchased
            wallet.save(
                update_fields=[
                    "bonus_balance",
                    "purchased_balance",
                    "reserved_bonus",
                    "reserved_purchased",
                    "updated_at",
                ]
            )

            reservation = CreditReservation.objects.create(
                wallet=wallet,
                user=user,
                status=ReservationStatus.PENDING,
                reserved_bonus=reserve_bonus,
                reserved_purchased=reserve_purchased,
                session_id=session_id,
                message_id=message_id,
                idempotency_key=idempotency_key,
                expires_at=expires_at,
                metadata=metadata or {},
            )

            if reserve_bonus > 0:
                CreditLedgerEntry.objects.create(
                    wallet=wallet,
                    user=user,
                    entry_type=CreditEntryType.RESERVATION_HOLD,
                    bucket=CreditBucket.BONUS,
                    delta=-reserve_bonus,
                    balance_after_bonus=wallet.bonus_balance,
                    balance_after_purchased=wallet.purchased_balance,
                    reserved_after_bonus=wallet.reserved_bonus,
                    reserved_after_purchased=wallet.reserved_purchased,
                    idempotency_key=f"{idempotency_key}:hold:bonus",
                    reservation=reservation,
                    description=f"Reservation hold (bonus) for {session_id or 'chat'}",
                )

            if reserve_purchased > 0:
                CreditLedgerEntry.objects.create(
                    wallet=wallet,
                    user=user,
                    entry_type=CreditEntryType.RESERVATION_HOLD,
                    bucket=CreditBucket.PURCHASED,
                    delta=-reserve_purchased,
                    balance_after_bonus=wallet.bonus_balance,
                    balance_after_purchased=wallet.purchased_balance,
                    reserved_after_bonus=wallet.reserved_bonus,
                    reserved_after_purchased=wallet.reserved_purchased,
                    idempotency_key=f"{idempotency_key}:hold:purchased",
                    reservation=reservation,
                    description=f"Reservation hold (purchased) for {session_id or 'chat'}",
                )

        return reservation

    @classmethod
    def settle_reservation(
        cls,
        reservation_id,
        actual_usage_credits: int,
        usage_record_kwargs: Optional[dict] = None,
        idempotency_key: Optional[str] = None,
    ) -> Tuple[CreditReservation, CreditUsageRecord]:
        """
        Settles a completed AI call against its reservation.
        Releases unused reserved credits back to available pools.
        Handles overage explicitly without creating negative balances.
        """
        if actual_usage_credits < 0:
            raise ValueError(f"Actual usage credits cannot be negative, got {actual_usage_credits}")

        usage_kwargs = dict(usage_record_kwargs or {})
        settlement_idempotency = idempotency_key or f"settle:{reservation_id}"

        with transaction.atomic():
            try:
                reservation = CreditReservation.objects.select_for_update().get(id=reservation_id)
            except CreditReservation.DoesNotExist:
                raise ReservationNotFoundError(f"Reservation {reservation_id} not found")

            # Idempotency check: if already settled, return existing records
            if reservation.status == ReservationStatus.SETTLED:
                usage_record = CreditUsageRecord.objects.filter(reservation=reservation).first()
                return reservation, usage_record

            if reservation.status != ReservationStatus.PENDING:
                raise ReservationStateError(
                    f"Cannot settle reservation {reservation_id} with status '{reservation.status}'"
                )

            wallet = CreditWallet.objects.select_for_update().get(id=reservation.wallet_id)
            total_reserved = reservation.total_reserved

            if actual_usage_credits <= total_reserved:
                # Normal settlement (actual usage fits within reservation)
                # Consume bonus first
                consumed_bonus = min(reservation.reserved_bonus, actual_usage_credits)
                consumed_purchased = min(
                    reservation.reserved_purchased, actual_usage_credits - consumed_bonus
                )

                # Calculate unused portion to return to available balance
                released_bonus = reservation.reserved_bonus - consumed_bonus
                released_purchased = reservation.reserved_purchased - consumed_purchased

                # Clear reservations from wallet and refund unused credits
                wallet.reserved_bonus -= reservation.reserved_bonus
                wallet.reserved_purchased -= reservation.reserved_purchased
                wallet.bonus_balance += released_bonus
                wallet.purchased_balance += released_purchased
                wallet.save(
                    update_fields=[
                        "bonus_balance",
                        "purchased_balance",
                        "reserved_bonus",
                        "reserved_purchased",
                        "updated_at",
                    ]
                )

                reservation.consumed_bonus = consumed_bonus
                reservation.consumed_purchased = consumed_purchased
                reservation.released_bonus = released_bonus
                reservation.released_purchased = released_purchased
                reservation.status = ReservationStatus.SETTLED
                reservation.settled_at = timezone.now()
                reservation.save(
                    update_fields=[
                        "consumed_bonus",
                        "consumed_purchased",
                        "released_bonus",
                        "released_purchased",
                        "status",
                        "settled_at",
                        "updated_at",
                    ]
                )

                usage_record = CreditUsageRecord.objects.create(
                    user=reservation.user,
                    wallet=wallet,
                    reservation=reservation,
                    session_id=reservation.session_id,
                    message_id=reservation.message_id,
                    credits_charged=actual_usage_credits,
                    idempotency_key=settlement_idempotency,
                    **usage_kwargs,
                )

                # Record release ledger entries for unused portions returned to available balance
                if released_bonus > 0:
                    CreditLedgerEntry.objects.create(
                        wallet=wallet,
                        user=reservation.user,
                        entry_type=CreditEntryType.RESERVATION_RELEASE,
                        bucket=CreditBucket.BONUS,
                        delta=released_bonus,
                        balance_after_bonus=wallet.bonus_balance,
                        balance_after_purchased=wallet.purchased_balance,
                        reserved_after_bonus=wallet.reserved_bonus,
                        reserved_after_purchased=wallet.reserved_purchased,
                        idempotency_key=f"{settlement_idempotency}:release:bonus",
                        reservation=reservation,
                        usage_record=usage_record,
                        description=f"Released unused bonus credits ({released_bonus:,})",
                    )

                if released_purchased > 0:
                    CreditLedgerEntry.objects.create(
                        wallet=wallet,
                        user=reservation.user,
                        entry_type=CreditEntryType.RESERVATION_RELEASE,
                        bucket=CreditBucket.PURCHASED,
                        delta=released_purchased,
                        balance_after_bonus=wallet.bonus_balance,
                        balance_after_purchased=wallet.purchased_balance,
                        reserved_after_bonus=wallet.reserved_bonus,
                        reserved_after_purchased=wallet.reserved_purchased,
                        idempotency_key=f"{settlement_idempotency}:release:purchased",
                        reservation=reservation,
                        usage_record=usage_record,
                        description=f"Released unused purchased credits ({released_purchased:,})",
                    )

                # Record usage settlement ledger entry
                CreditLedgerEntry.objects.create(
                    wallet=wallet,
                    user=reservation.user,
                    entry_type=CreditEntryType.USAGE_SETTLEMENT,
                    bucket=CreditBucket.BONUS if consumed_bonus >= consumed_purchased else CreditBucket.PURCHASED,
                    delta=0,  # Holds were already deducted at reservation time
                    balance_after_bonus=wallet.bonus_balance,
                    balance_after_purchased=wallet.purchased_balance,
                    reserved_after_bonus=wallet.reserved_bonus,
                    reserved_after_purchased=wallet.reserved_purchased,
                    idempotency_key=f"{settlement_idempotency}:usage",
                    reservation=reservation,
                    usage_record=usage_record,
                    description=f"Usage settled: {actual_usage_credits:,} credits consumed",
                    metadata={
                        "consumed_bonus": consumed_bonus,
                        "consumed_purchased": consumed_purchased,
                    },
                )

            else:
                # Overage situation: actual usage exceeded reservation!
                overage = actual_usage_credits - total_reserved
                logger.warning(
                    f"Reservation {reservation_id} exceeded by {overage} credits (Reserved: {total_reserved}, Actual: {actual_usage_credits})"
                )

                consumed_bonus = reservation.reserved_bonus
                consumed_purchased = reservation.reserved_purchased

                wallet.reserved_bonus -= reservation.reserved_bonus
                wallet.reserved_purchased -= reservation.reserved_purchased

                # Attempt to collect overage from available balance without going negative
                overage_from_bonus = min(wallet.bonus_balance, overage)
                overage_from_purchased = min(wallet.purchased_balance, overage - overage_from_bonus)
                total_collected_overage = overage_from_bonus + overage_from_purchased
                uncollected_overage = overage - total_collected_overage

                wallet.bonus_balance -= overage_from_bonus
                wallet.purchased_balance -= overage_from_purchased
                wallet.save(
                    update_fields=[
                        "bonus_balance",
                        "purchased_balance",
                        "reserved_bonus",
                        "reserved_purchased",
                        "updated_at",
                    ]
                )

                reservation.consumed_bonus = consumed_bonus
                reservation.consumed_purchased = consumed_purchased
                reservation.released_bonus = 0
                reservation.released_purchased = 0
                reservation.status = ReservationStatus.SETTLED
                reservation.settled_at = timezone.now()
                if uncollected_overage > 0:
                    reservation.metadata["uncollected_overage"] = uncollected_overage
                reservation.save(
                    update_fields=[
                        "consumed_bonus",
                        "consumed_purchased",
                        "released_bonus",
                        "released_purchased",
                        "status",
                        "settled_at",
                        "metadata",
                        "updated_at",
                    ]
                )

                if uncollected_overage > 0:
                    usage_kwargs["status"] = "overage_deficit"
                    usage_kwargs["metadata"] = {
                        **usage_kwargs.get("metadata", {}),
                        "uncollected_overage": uncollected_overage,
                        "overage": overage,
                    }
                else:
                    usage_kwargs["status"] = "completed"
                    usage_kwargs["metadata"] = {
                        **usage_kwargs.get("metadata", {}),
                        "overage": overage,
                    }

                usage_record = CreditUsageRecord.objects.create(
                    user=reservation.user,
                    wallet=wallet,
                    reservation=reservation,
                    session_id=reservation.session_id,
                    message_id=reservation.message_id,
                    credits_charged=actual_usage_credits,
                    idempotency_key=settlement_idempotency,
                    **usage_kwargs,
                )

                if overage_from_bonus > 0:
                    CreditLedgerEntry.objects.create(
                        wallet=wallet,
                        user=reservation.user,
                        entry_type=CreditEntryType.OVERAGE_SETTLEMENT,
                        bucket=CreditBucket.BONUS,
                        delta=-overage_from_bonus,
                        balance_after_bonus=wallet.bonus_balance,
                        balance_after_purchased=wallet.purchased_balance,
                        reserved_after_bonus=wallet.reserved_bonus,
                        reserved_after_purchased=wallet.reserved_purchased,
                        idempotency_key=f"{settlement_idempotency}:overage:bonus",
                        reservation=reservation,
                        usage_record=usage_record,
                        description=f"Overage deduction (bonus): {overage_from_bonus:,} credits",
                    )

                if overage_from_purchased > 0:
                    CreditLedgerEntry.objects.create(
                        wallet=wallet,
                        user=reservation.user,
                        entry_type=CreditEntryType.OVERAGE_SETTLEMENT,
                        bucket=CreditBucket.PURCHASED,
                        delta=-overage_from_purchased,
                        balance_after_bonus=wallet.bonus_balance,
                        balance_after_purchased=wallet.purchased_balance,
                        reserved_after_bonus=wallet.reserved_bonus,
                        reserved_after_purchased=wallet.reserved_purchased,
                        idempotency_key=f"{settlement_idempotency}:overage:purchased",
                        reservation=reservation,
                        usage_record=usage_record,
                        description=f"Overage deduction (purchased): {overage_from_purchased:,} credits",
                    )

        return reservation, usage_record

    @classmethod
    def release_reservation(
        cls,
        reservation_id,
        reason: str = "request_cancelled",
        idempotency_key: Optional[str] = None,
    ) -> CreditReservation:
        """
        Releases an active pending reservation, restoring held credits to available pools.
        Completely idempotent: subsequent release attempts safely return the released reservation.
        """
        with transaction.atomic():
            try:
                reservation = CreditReservation.objects.select_for_update().get(id=reservation_id)
            except CreditReservation.DoesNotExist:
                raise ReservationNotFoundError(f"Reservation {reservation_id} not found")

            if reservation.status != ReservationStatus.PENDING:
                logger.info(
                    f"Reservation {reservation_id} is already in status '{reservation.status}'. Skipping release."
                )
                return reservation

            wallet = CreditWallet.objects.select_for_update().get(id=reservation.wallet_id)

            wallet.bonus_balance += reservation.reserved_bonus
            wallet.reserved_bonus -= reservation.reserved_bonus
            wallet.purchased_balance += reservation.reserved_purchased
            wallet.reserved_purchased -= reservation.reserved_purchased
            wallet.save(
                update_fields=[
                    "bonus_balance",
                    "purchased_balance",
                    "reserved_bonus",
                    "reserved_purchased",
                    "updated_at",
                ]
            )

            reservation.released_bonus = reservation.reserved_bonus
            reservation.released_purchased = reservation.reserved_purchased
            reservation.status = ReservationStatus.RELEASED
            reservation.released_at = timezone.now()
            reservation.metadata["release_reason"] = reason
            reservation.save(
                update_fields=[
                    "released_bonus",
                    "released_purchased",
                    "status",
                    "released_at",
                    "metadata",
                    "updated_at",
                ]
            )

            release_idempotency = idempotency_key or f"release:{reservation.id}"

            if reservation.reserved_bonus > 0:
                CreditLedgerEntry.objects.create(
                    wallet=wallet,
                    user=reservation.user,
                    entry_type=CreditEntryType.RESERVATION_RELEASE,
                    bucket=CreditBucket.BONUS,
                    delta=reservation.reserved_bonus,
                    balance_after_bonus=wallet.bonus_balance,
                    balance_after_purchased=wallet.purchased_balance,
                    reserved_after_bonus=wallet.reserved_bonus,
                    reserved_after_purchased=wallet.reserved_purchased,
                    idempotency_key=f"{release_idempotency}:bonus",
                    reservation=reservation,
                    description=f"Released reservation ({reservation.reserved_bonus:,} bonus credits): {reason}",
                )

            if reservation.reserved_purchased > 0:
                CreditLedgerEntry.objects.create(
                    wallet=wallet,
                    user=reservation.user,
                    entry_type=CreditEntryType.RESERVATION_RELEASE,
                    bucket=CreditBucket.PURCHASED,
                    delta=reservation.reserved_purchased,
                    balance_after_bonus=wallet.bonus_balance,
                    balance_after_purchased=wallet.purchased_balance,
                    reserved_after_bonus=wallet.reserved_bonus,
                    reserved_after_purchased=wallet.reserved_purchased,
                    idempotency_key=f"{release_idempotency}:purchased",
                    reservation=reservation,
                    description=f"Released reservation ({reservation.reserved_purchased:,} purchased credits): {reason}",
                )

        logger.info(f"Released reservation {reservation_id} ({reason})")
        return reservation

    @classmethod
    def expire_abandoned_reservations(cls, batch_size: int = 100) -> int:
        """
        Finds abandoned pending reservations whose expiry has passed and safely releases them.
        """
        now = timezone.now()
        expired_ids = list(
            CreditReservation.objects.filter(
                status=ReservationStatus.PENDING,
                expires_at__lte=now,
            ).values_list("id", flat=True)[:batch_size]
        )

        expired_count = 0
        for res_id in expired_ids:
            try:
                res = cls.release_reservation(
                    reservation_id=res_id,
                    reason="expired",
                    idempotency_key=f"expire:{res_id}",
                )
                with transaction.atomic():
                    res.refresh_from_db()
                    res.status = ReservationStatus.EXPIRED
                    res.save(update_fields=["status", "updated_at"])
                expired_count += 1
            except Exception as e:
                logger.error(f"Failed to expire abandoned reservation {res_id}: {e}")

        return expired_count

    @classmethod
    def get_unresolved_deficits(cls, wallet_id: uuid.UUID) -> dict:
        """
        Retrieves a detailed audit breakdown of all unresolved deficits for a wallet,
        including usage overages and refund reversals.
        """
        wallet = CreditWallet.objects.get(id=wallet_id)
        items = []

        # 1. Overages from CreditUsageRecord
        for rec in wallet.usage_records.filter(status="overage_deficit").order_by("created_at"):
            initial_deficit = rec.metadata.get("uncollected_overage", 0)
            resolved = rec.deficit_resolutions.aggregate(t=Sum("amount_resolved"))["t"] or 0
            outstanding = max(0, initial_deficit - resolved)
            if outstanding > 0:
                items.append({
                    "type": "usage_overage",
                    "item_id": str(rec.id),
                    "initial_deficit": initial_deficit,
                    "already_resolved": resolved,
                    "outstanding_deficit": outstanding,
                    "session_id": rec.session_id,
                    "message_id": rec.message_id,
                    "provider": rec.provider,
                    "model": rec.model,
                    "created_at": rec.created_at.isoformat(),
                })

        # 2. Refund shortfalls from CreditLedgerEntry
        for entry in wallet.ledger_entries.filter(entry_type=CreditEntryType.REFUND_REVERSAL).order_by("created_at"):
            initial_deficit = entry.metadata.get("uncollected_deficit", 0)
            resolved = entry.deficit_resolutions.aggregate(t=Sum("amount_resolved"))["t"] or 0
            outstanding = max(0, initial_deficit - resolved)
            if outstanding > 0:
                items.append({
                    "type": "refund_reversal",
                    "item_id": str(entry.id),
                    "initial_deficit": initial_deficit,
                    "already_resolved": resolved,
                    "outstanding_deficit": outstanding,
                    "payment_id": str(entry.payment_id) if entry.payment_id else None,
                    "refund_id": entry.metadata.get("refund_id"),
                    "created_at": entry.created_at.isoformat(),
                })

        general_resolved = wallet.deficit_resolutions.filter(
            usage_record__isnull=True, ledger_entry__isnull=True
        ).aggregate(t=Sum("amount_resolved"))["t"] or 0

        return {
            "wallet_id": str(wallet.id),
            "user_id": str(wallet.user_id),
            "total_unresolved_deficit": wallet.uncollected_deficit,
            "reconciliation_status": wallet.reconciliation_status,
            "general_resolved_amount": general_resolved,
            "unresolved_items": items,
        }

    @classmethod
    def reconcile_deficit(
        cls,
        wallet_id: uuid.UUID,
        admin_user,
        amount_to_resolve: Optional[int] = None,
        usage_record_id: Optional[uuid.UUID] = None,
        ledger_entry_id: Optional[uuid.UUID] = None,
        reason: str = "",
        resolution_method: str = "admin_waiver",
        idempotency_key: Optional[str] = None,
        notes: str = "",
        metadata: Optional[dict] = None,
    ) -> Tuple[CreditDeficitResolution, CreditWallet]:
        """
        Atomically executes an auditable administrative reconciliation of an unresolved credit deficit.
        Restricted to staff administrators.
        Requires a mandatory non-empty reason.
        Does NOT alter historical immutable ledger entries or usage records.
        Creates an immutable CreditDeficitResolution audit record and a non-mutating CreditLedgerEntry audit entry.
        """
        # 1. Authorization check
        if not admin_user or not getattr(admin_user, "is_authenticated", False):
            raise PermissionDenied("Authentication is required for administrative reconciliation.")
        if not (getattr(admin_user, "is_staff", False) or getattr(admin_user, "is_superuser", False)):
            raise PermissionDenied("Only authorized staff administrators can perform deficit reconciliation.")

        # 2. Reason validation
        if not reason or not reason.strip():
            raise ValidationError("A non-empty administrative reconciliation reason is strictly required.")

        meta = dict(metadata or {})

        with transaction.atomic():
            wallet = CreditWallet.objects.select_for_update().get(id=wallet_id)

            # Idempotency check: if resolution with this idempotency key already exists, return it
            if idempotency_key:
                existing = CreditDeficitResolution.objects.filter(idempotency_key=idempotency_key).first()
                if existing:
                    return existing, wallet

            if wallet.uncollected_deficit <= 0:
                raise ValidationError("Wallet has no unresolved deficit to reconcile.")

            target_usage_record = None
            target_ledger_entry = None

            if usage_record_id:
                try:
                    target_usage_record = CreditUsageRecord.objects.select_for_update().get(
                        id=usage_record_id, wallet=wallet
                    )
                except CreditUsageRecord.DoesNotExist:
                    raise ValidationError(f"Usage record {usage_record_id} does not exist for this wallet.")

                initial_deficit = target_usage_record.metadata.get("uncollected_overage", 0)
                if initial_deficit <= 0:
                    raise ValidationError(f"Usage record {usage_record_id} has no uncollected overage deficit.")

                resolved_already = target_usage_record.deficit_resolutions.aggregate(t=Sum("amount_resolved"))["t"] or 0
                max_eligible = max(0, initial_deficit - resolved_already)
                if max_eligible <= 0:
                    raise ValidationError(f"Deficit on usage record {usage_record_id} has already been fully resolved.")

                resolve_amount = min(amount_to_resolve, max_eligible) if amount_to_resolve is not None else max_eligible
                resolve_amount = min(resolve_amount, wallet.uncollected_deficit)

            elif ledger_entry_id:
                try:
                    target_ledger_entry = CreditLedgerEntry.objects.select_for_update().get(
                        id=ledger_entry_id, wallet=wallet
                    )
                except CreditLedgerEntry.DoesNotExist:
                    raise ValidationError(f"Ledger entry {ledger_entry_id} does not exist for this wallet.")

                initial_deficit = target_ledger_entry.metadata.get("uncollected_deficit", 0)
                if initial_deficit <= 0:
                    raise ValidationError(f"Ledger entry {ledger_entry_id} has no uncollected refund deficit.")

                resolved_already = target_ledger_entry.deficit_resolutions.aggregate(t=Sum("amount_resolved"))["t"] or 0
                max_eligible = max(0, initial_deficit - resolved_already)
                if max_eligible <= 0:
                    raise ValidationError(f"Deficit on ledger entry {ledger_entry_id} has already been fully resolved.")

                resolve_amount = min(amount_to_resolve, max_eligible) if amount_to_resolve is not None else max_eligible
                resolve_amount = min(resolve_amount, wallet.uncollected_deficit)

            else:
                # Wallet-level general resolution
                current_unresolved = wallet.uncollected_deficit
                resolve_amount = min(amount_to_resolve, current_unresolved) if amount_to_resolve is not None else current_unresolved

            if resolve_amount <= 0:
                raise ValidationError("Amount to resolve must be greater than zero.")

            resolution_idempotency = idempotency_key or f"reconcile:{wallet.id}:{uuid.uuid4()}"

            resolution = CreditDeficitResolution.objects.create(
                wallet=wallet,
                user=wallet.user,
                admin_user=admin_user,
                usage_record=target_usage_record,
                ledger_entry=target_ledger_entry,
                amount_resolved=resolve_amount,
                resolution_method=resolution_method,
                reason=reason.strip(),
                notes=notes.strip(),
                metadata=meta,
                idempotency_key=resolution_idempotency,
            )

            # Record an append-only ledger entry audit of this resolution
            CreditLedgerEntry.objects.create(
                wallet=wallet,
                user=wallet.user,
                entry_type=CreditEntryType.DEFICIT_RECONCILIATION,
                bucket=CreditBucket.BONUS if (target_usage_record and target_usage_record.metadata.get("bucket") == "bonus") else CreditBucket.PURCHASED,
                delta=0,  # Balances are unchanged
                balance_after_bonus=wallet.bonus_balance,
                balance_after_purchased=wallet.purchased_balance,
                reserved_after_bonus=wallet.reserved_bonus,
                reserved_after_purchased=wallet.reserved_purchased,
                idempotency_key=f"{resolution_idempotency}:ledger",
                description=f"Deficit reconciled: {resolve_amount:,} credits ({resolution_method}) by {admin_user.email}",
                metadata={
                    "resolution_id": str(resolution.id),
                    "admin_user_id": str(admin_user.id),
                    "reason": reason.strip(),
                    "resolution_method": resolution_method,
                    "target_usage_record_id": str(target_usage_record.id) if target_usage_record else None,
                    "target_ledger_entry_id": str(target_ledger_entry.id) if target_ledger_entry else None,
                },
            )

            wallet.refresh_from_db()
            logger.info(
                f"Deficit reconciliation complete: Wallet {wallet.id}, {resolve_amount:,} credits resolved by {admin_user.email}. Remaining deficit: {wallet.uncollected_deficit:,}"
            )
            return resolution, wallet

    @classmethod
    def deduct_credits(
        cls,
        user,
        amount: int = 1,
        description: str = "AI research paper summary",
        idempotency_key: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Tuple[CreditWallet, CreditLedgerEntry]:
        """
        Atomically deducts credits from a user's wallet without a prior reservation hold.
        Consumes bonus credits first, then purchased credits.
        Completely idempotent: if the idempotency_key was already processed, returns the existing ledger entry.
        """
        if amount <= 0:
            raise ValueError(f"Deduct amount must be positive, got {amount}")

        if idempotency_key:
            existing = CreditLedgerEntry.objects.filter(idempotency_key=idempotency_key).first()
            if existing:
                return existing.wallet, existing

        with transaction.atomic():
            if idempotency_key:
                existing = CreditLedgerEntry.objects.filter(idempotency_key=idempotency_key).first()
                if existing:
                    return existing.wallet, existing

            wallet, _ = CreditWallet.objects.select_for_update().get_or_create(user=user)

            if wallet.reconciliation_status == "deficit_pending_reconciliation":
                raise InsufficientCreditsError(
                    f"Account has an uncollected deficit of {wallet.uncollected_deficit:,} credits. Please purchase credits to resolve.",
                    available=wallet.total_available,
                    required=wallet.uncollected_deficit,
                )

            total_available = wallet.bonus_balance + wallet.purchased_balance
            if total_available < amount:
                raise InsufficientCreditsError(
                    f"Insufficient credits: available {total_available}, required {amount}",
                    available=total_available,
                    required=amount,
                )

            deduct_bonus = min(wallet.bonus_balance, amount)
            deduct_purchased = amount - deduct_bonus

            wallet.bonus_balance -= deduct_bonus
            wallet.purchased_balance -= deduct_purchased
            wallet.save(
                update_fields=[
                    "bonus_balance",
                    "purchased_balance",
                    "updated_at",
                ]
            )

            idem = idempotency_key or f"deduct:{user.id}:{uuid.uuid4().hex}"
            bucket = CreditBucket.BONUS if deduct_bonus >= deduct_purchased else CreditBucket.PURCHASED

            entry = CreditLedgerEntry.objects.create(
                wallet=wallet,
                user=user,
                entry_type=CreditEntryType.USAGE_SETTLEMENT,
                bucket=bucket,
                delta=-amount,
                balance_after_bonus=wallet.bonus_balance,
                balance_after_purchased=wallet.purchased_balance,
                reserved_after_bonus=wallet.reserved_bonus,
                reserved_after_purchased=wallet.reserved_purchased,
                idempotency_key=idem,
                description=description,
                metadata={
                    **(metadata or {}),
                    "deducted_bonus": deduct_bonus,
                    "deducted_purchased": deduct_purchased,
                },
            )

            logger.info(f"Deducted {amount} credits from user {user.id} ({description})")
            return wallet, entry


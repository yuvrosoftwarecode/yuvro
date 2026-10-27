import uuid
from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class CreditBucket(models.TextChoices):
    BONUS = "bonus", "Bonus"
    PURCHASED = "purchased", "Purchased"


class CreditEntryType(models.TextChoices):
    SIGNUP_BONUS = "signup_bonus", "Signup Bonus"
    PURCHASE = "purchase", "Credit Purchase"
    RESERVATION_HOLD = "reservation_hold", "Reservation Hold"
    RESERVATION_RELEASE = "reservation_release", "Reservation Release"
    USAGE_SETTLEMENT = "usage_settlement", "Usage Settlement"
    OVERAGE_SETTLEMENT = "overage_settlement", "Overage Settlement"
    REFUND_REVERSAL = "refund_reversal", "Refund Reversal"
    ADMIN_ADJUSTMENT = "admin_adjustment", "Admin Adjustment"
    DEFICIT_RECONCILIATION = "deficit_reconciliation", "Deficit Reconciliation"
    EXPIRY = "expiry", "Credit Expiry"


class ReservationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SETTLED = "settled", "Settled"
    RELEASED = "released", "Released"
    EXPIRED = "expired", "Expired"
    FAILED = "failed", "Failed"


class WebhookEventStatus(models.TextChoices):
    RECEIVED = "received", "Received"
    PROCESSED = "processed", "Processed"
    FAILED = "failed", "Failed"
    IGNORED = "ignored", "Ignored"


class ImmutableLedgerQuerySet(models.QuerySet):
    """QuerySet that blocks bulk updates and bulk deletes on immutable models."""
    def update(self, *args, **kwargs):
        raise ValidationError("CreditLedgerEntry is append-only and cannot be updated.")

    def delete(self, *args, **kwargs):
        raise ValidationError("CreditLedgerEntry is append-only and cannot be deleted.")


class ImmutableSnapshotQuerySet(models.QuerySet):
    """QuerySet that blocks bulk updates and bulk deletes on immutable snapshots."""
    def update(self, *args, **kwargs):
        raise ValidationError("CreditPurchaseSnapshot is immutable and cannot be updated.")

    def delete(self, *args, **kwargs):
        raise ValidationError("CreditPurchaseSnapshot is immutable and cannot be deleted.")


class CreditWallet(models.Model):
    """
    User's AI Credit Wallet maintaining separate balances for bonus and purchased credits,
    with explicit reserved tracking for inflight requests.

    Persisted balances represent AVAILABLE (spendable) credits.
    Reserved balances represent credits currently held for in-flight calls.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_wallet",
    )
    bonus_balance = models.BigIntegerField(
        default=0,
        help_text="Available unreserved bonus credits",
    )
    purchased_balance = models.BigIntegerField(
        default=0,
        help_text="Available unreserved purchased credits",
    )
    reserved_bonus = models.BigIntegerField(
        default=0,
        help_text="Currently reserved bonus credits",
    )
    reserved_purchased = models.BigIntegerField(
        default=0,
        help_text="Currently reserved purchased credits",
    )
    signup_bonus_granted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Indicates whether the one-time signup bonus has been claimed",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_credits_wallet"
        verbose_name = "Credit Wallet"
        verbose_name_plural = "Credit Wallets"
        constraints = [
            models.CheckConstraint(
                check=models.Q(bonus_balance__gte=0),
                name="ai_credits_wallet_bonus_gte_0",
            ),
            models.CheckConstraint(
                check=models.Q(purchased_balance__gte=0),
                name="ai_credits_wallet_purchased_gte_0",
            ),
            models.CheckConstraint(
                check=models.Q(reserved_bonus__gte=0),
                name="ai_credits_wallet_res_bonus_gte_0",
            ),
            models.CheckConstraint(
                check=models.Q(reserved_purchased__gte=0),
                name="ai_credits_wallet_res_purchased_gte_0",
            ),
        ]

    @property
    def total_available(self) -> int:
        """Total spendable credits across bonus and purchased pools."""
        return self.bonus_balance + self.purchased_balance

    @property
    def total_reserved(self) -> int:
        """Total credits currently locked in reservations."""
        return self.reserved_bonus + self.reserved_purchased

    @property
    def total_balance(self) -> int:
        """Total credits owned by the user (available + reserved)."""
        return self.total_available + self.total_reserved

    @property
    def uncollected_deficit(self) -> int:
        """
        Total unresolved deficit from overages or refunds where user balance was insufficient,
        net of any auditable administrative resolutions.
        """
        usage_deficits = 0
        for rec in self.usage_records.filter(status="overage_deficit"):
            initial_deficit = rec.metadata.get("uncollected_overage", 0)
            resolved = sum(r.amount_resolved for r in rec.deficit_resolutions.all())
            usage_deficits += max(0, initial_deficit - resolved)

        refund_deficits = 0
        for entry in self.ledger_entries.filter(entry_type=CreditEntryType.REFUND_REVERSAL):
            initial_deficit = entry.metadata.get("uncollected_deficit", 0)
            resolved = sum(r.amount_resolved for r in entry.deficit_resolutions.all())
            refund_deficits += max(0, initial_deficit - resolved)

        general_resolved = sum(
            r.amount_resolved
            for r in self.deficit_resolutions.filter(usage_record__isnull=True, ledger_entry__isnull=True)
        )
        return max(0, int(usage_deficits + refund_deficits - general_resolved))

    @property
    def reconciliation_status(self) -> str:
        """Exposes whether the wallet has any pending accounting deficits requiring reconciliation."""
        if self.uncollected_deficit > 0:
            return "deficit_pending_reconciliation"
        return "settled"

    def __str__(self):
        user_id = getattr(self.user, "email", str(self.user_id))
        return f"Wallet({user_id} - Avail: {self.total_available}, Res: {self.total_reserved})"


class CreditReservation(models.Model):
    """
    Atomic credit hold placed before invoking an AI provider to prevent overspending.
    Locks bonus credits before purchased credits.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        CreditWallet,
        on_delete=models.PROTECT,
        related_name="reservations",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_reservations",
    )
    status = models.CharField(
        max_length=20,
        choices=ReservationStatus.choices,
        default=ReservationStatus.PENDING,
        db_index=True,
    )
    reserved_bonus = models.BigIntegerField(default=0)
    reserved_purchased = models.BigIntegerField(default=0)
    consumed_bonus = models.BigIntegerField(default=0)
    consumed_purchased = models.BigIntegerField(default=0)
    released_bonus = models.BigIntegerField(default=0)
    released_purchased = models.BigIntegerField(default=0)

    session_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    message_id = models.CharField(max_length=255, blank=True, null=True)
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)

    expires_at = models.DateTimeField(db_index=True)
    settled_at = models.DateTimeField(null=True, blank=True)
    released_at = models.DateTimeField(null=True, blank=True)

    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_credits_reservation"
        verbose_name = "Credit Reservation"
        verbose_name_plural = "Credit Reservations"
        constraints = [
            models.CheckConstraint(
                check=models.Q(reserved_bonus__gte=0),
                name="ai_credits_res_reserved_bonus_gte_0",
            ),
            models.CheckConstraint(
                check=models.Q(reserved_purchased__gte=0),
                name="ai_credits_res_reserved_purchased_gte_0",
            ),
            models.CheckConstraint(
                check=models.Q(consumed_bonus__gte=0),
                name="ai_credits_res_consumed_bonus_gte_0",
            ),
            models.CheckConstraint(
                check=models.Q(consumed_purchased__gte=0),
                name="ai_credits_res_consumed_purchased_gte_0",
            ),
            models.CheckConstraint(
                check=models.Q(released_bonus__gte=0),
                name="ai_credits_res_released_bonus_gte_0",
            ),
            models.CheckConstraint(
                check=models.Q(released_purchased__gte=0),
                name="ai_credits_res_released_purchased_gte_0",
            ),
        ]

    @property
    def total_reserved(self) -> int:
        return self.reserved_bonus + self.reserved_purchased

    @property
    def total_consumed(self) -> int:
        return self.consumed_bonus + self.consumed_purchased

    @property
    def total_released(self) -> int:
        return self.released_bonus + self.released_purchased

    def __str__(self):
        return f"Reservation({self.id} - {self.status} - Reserved: {self.total_reserved})"


class CreditUsageRecord(models.Model):
    """
    Detailed audit log of each individual provider LLM request/stream.
    Preserves exact token metrics and execution metadata.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_usage_records",
    )
    wallet = models.ForeignKey(
        CreditWallet,
        on_delete=models.PROTECT,
        related_name="usage_records",
    )
    reservation = models.ForeignKey(
        CreditReservation,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="usage_records",
    )
    session_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    message_id = models.CharField(max_length=255, blank=True, null=True)

    provider = models.CharField(max_length=50)  # anthropic, google, openai, etc.
    model = models.CharField(max_length=100)

    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    cached_tokens = models.PositiveIntegerField(
        default=0,
        help_text="Informational cached prompt tokens (not billed separately initially)",
    )
    reasoning_tokens = models.PositiveIntegerField(
        default=0,
        help_text="Informational reasoning/thought tokens (not billed separately initially)",
    )
    credits_charged = models.BigIntegerField(default=0)

    provider_request_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    is_estimated = models.BooleanField(
        default=False,
        help_text="True if tokens were estimated because provider did not return exact usage",
    )
    usage_source = models.CharField(
        max_length=50,
        default="provider_response",
        help_text="Source of token metrics: provider_response, stream_chunks, or fallback_estimate",
    )
    call_type = models.CharField(
        max_length=50,
        default="chat",
        help_text="chat, explain, suggest, agent, retry, fallback",
    )
    status = models.CharField(
        max_length=50,
        default="completed",
        help_text="completed, failed, partial, overage",
    )
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)

    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "ai_credits_usage_record"
        verbose_name = "Credit Usage Record"
        verbose_name_plural = "Credit Usage Records"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Usage({self.model} - In: {self.input_tokens}, Out: {self.output_tokens} -> {self.credits_charged} credits)"


class CreditLedgerEntry(models.Model):
    """
    Append-only immutable transaction log of all credit operations.
    Every balance modification MUST produce a corresponding ledger entry.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        CreditWallet,
        on_delete=models.PROTECT,
        related_name="ledger_entries",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_ledger_entries",
    )
    entry_type = models.CharField(
        max_length=32,
        choices=CreditEntryType.choices,
        db_index=True,
    )
    bucket = models.CharField(
        max_length=16,
        choices=CreditBucket.choices,
        db_index=True,
    )
    delta = models.BigIntegerField(
        help_text="Signed credit delta: positive for credit inflows/releases, negative for holds/usage",
    )
    balance_after_bonus = models.BigIntegerField(
        help_text="Snapshot of available bonus credits after this entry",
    )
    balance_after_purchased = models.BigIntegerField(
        help_text="Snapshot of available purchased credits after this entry",
    )
    reserved_after_bonus = models.BigIntegerField(
        default=0,
        help_text="Snapshot of reserved bonus credits after this entry",
    )
    reserved_after_purchased = models.BigIntegerField(
        default=0,
        help_text="Snapshot of reserved purchased credits after this entry",
    )
    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Unique key ensuring idempotent ledger append operations",
    )

    payment = models.ForeignKey(
        "payment.Payment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="credit_ledger_entries",
    )
    reservation = models.ForeignKey(
        CreditReservation,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ledger_entries",
    )
    usage_record = models.ForeignKey(
        CreditUsageRecord,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ledger_entries",
    )

    description = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    objects = ImmutableLedgerQuerySet.as_manager()

    class Meta:
        db_table = "ai_credits_ledger_entry"
        verbose_name = "Credit Ledger Entry"
        verbose_name_plural = "Credit Ledger Entries"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["wallet", "created_at"]),
            models.Index(fields=["entry_type", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and CreditLedgerEntry.objects.filter(pk=self.pk).exists():
            raise ValidationError("CreditLedgerEntry is append-only and cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("CreditLedgerEntry is append-only and cannot be deleted.")

    def __str__(self):
        return f"LedgerEntry({self.entry_type} | {self.bucket} | Delta: {self.delta})"


class CreditPack(models.Model):
    """
    Catalog definition for purchasable credit packs and promotional bonus offers.
    Links to payment.PurchasableItem for standard payment pipeline compatibility.
    """
    id = models.CharField(
        max_length=50,
        primary_key=True,
        help_text="Machine-readable pack identifier, e.g. free_signup_bonus, starter, pro, power",
    )
    purchasable_item = models.ForeignKey(
        "payment.PurchasableItem",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="credit_packs",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    credits = models.BigIntegerField(help_text="Total number of AI credits granted by this pack")
    price_inr = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Price in INR",
    )
    price_paise = models.PositiveIntegerField(
        default=0,
        help_text="Price in integer paise for payment gateways (e.g., 19900 for ₹199)",
    )
    is_active = models.BooleanField(default=True)
    is_signup_bonus = models.BooleanField(
        default=False,
        help_text="Designates the free initial welcome pack",
    )
    sort_order = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_credits_pack"
        verbose_name = "Credit Pack"
        verbose_name_plural = "Credit Packs"
        ordering = ["sort_order", "price_inr"]

    def __str__(self):
        return f"{self.name} ({self.credits:,} credits - ₹{self.price_inr})"


class CreditPurchaseSnapshot(models.Model):
    """
    Immutable historical record of a credit purchase.
    Preserves exact terms and pricing at the time of purchase,
    unaffected by subsequent catalog updates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.OneToOneField(
        "payment.Payment",
        on_delete=models.PROTECT,
        related_name="credit_purchase_snapshot",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_purchases",
    )
    pack_id = models.CharField(max_length=50)
    pack_name = models.CharField(max_length=100)
    credits = models.BigIntegerField()
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    raw_payment_details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = ImmutableSnapshotQuerySet.as_manager()

    class Meta:
        db_table = "ai_credits_purchase_snapshot"
        verbose_name = "Credit Purchase Snapshot"
        verbose_name_plural = "Credit Purchase Snapshots"

    def save(self, *args, **kwargs):
        if self.pk and CreditPurchaseSnapshot.objects.filter(pk=self.pk).exists():
            raise ValidationError("CreditPurchaseSnapshot is immutable and cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("CreditPurchaseSnapshot is immutable and cannot be deleted.")

    def __str__(self):
        return f"PurchaseSnapshot({self.pack_name} - {self.credits:,} credits - {self.currency} {self.amount_paid})"


class PaymentWebhookEvent(models.Model):
    """
    Idempotent event log for incoming Razorpay webhooks.
    Guarantees that each webhook is recorded and processed at most once.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_id = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Gateway-specific event ID (e.g. Razorpay event ID) for deduplication",
    )
    event_type = models.CharField(max_length=100, db_index=True)
    gateway = models.CharField(max_length=20, default="razorpay")
    payload = models.JSONField(default=dict)
    status = models.CharField(
        max_length=20,
        choices=WebhookEventStatus.choices,
        default=WebhookEventStatus.RECEIVED,
        db_index=True,
    )
    processing_error = models.TextField(blank=True, null=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "ai_credits_webhook_event"
        verbose_name = "Payment Webhook Event"
        verbose_name_plural = "Payment Webhook Events"
        ordering = ["-created_at"]

    def __str__(self):
        return f"WebhookEvent({self.gateway}:{self.event_id} - {self.event_type} [{self.status}])"


class CreditDeficitResolution(models.Model):
    """
    Immutable audit record of an administrative deficit reconciliation.
    Records the authorized administrator, reason, timestamp, amount resolved,
    and links to affected usage record and/or ledger entry without mutating historical records.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        CreditWallet,
        on_delete=models.PROTECT,
        related_name="deficit_resolutions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="credit_deficit_resolutions",
    )
    admin_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="administered_deficit_resolutions",
    )
    usage_record = models.ForeignKey(
        CreditUsageRecord,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="deficit_resolutions",
    )
    ledger_entry = models.ForeignKey(
        CreditLedgerEntry,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="deficit_resolutions",
    )
    amount_resolved = models.PositiveIntegerField()
    resolution_method = models.CharField(
        max_length=50,
        default="admin_waiver",
        choices=[
            ("admin_waiver", "Admin Waiver"),
            ("external_settlement", "External Settlement"),
            ("goodwill_adjustment", "Goodwill Adjustment"),
            ("accounting_correction", "Accounting Correction"),
        ],
    )
    reason = models.TextField(help_text="Mandatory explanation for this administrative deficit resolution.")
    notes = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    objects = ImmutableSnapshotQuerySet.as_manager()

    class Meta:
        db_table = "ai_credits_deficit_resolution"
        verbose_name = "Credit Deficit Resolution"
        verbose_name_plural = "Credit Deficit Resolutions"
        ordering = ["-created_at"]

    def clean(self):
        super().clean()
        if not self.reason or not self.reason.strip():
            raise ValidationError({"reason": "A non-empty administrative reason is strictly required."})
        if self.amount_resolved <= 0:
            raise ValidationError({"amount_resolved": "Resolved amount must be greater than zero."})

    def save(self, *args, **kwargs):
        self.full_clean()
        if self.pk and CreditDeficitResolution.objects.filter(pk=self.pk).exists():
            raise ValidationError("CreditDeficitResolution is immutable and cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("CreditDeficitResolution is immutable and cannot be deleted.")

    def __str__(self):
        admin_email = getattr(self.admin_user, "email", str(self.admin_user_id))
        user_email = getattr(self.user, "email", str(self.user_id))
        return f"DeficitResolution({user_email} - {self.amount_resolved:,} credits - {self.resolution_method} by {admin_email})"


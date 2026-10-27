from rest_framework import serializers

from .models import (
    CreditDeficitResolution,
    CreditLedgerEntry,
    CreditPack,
    CreditUsageRecord,
    CreditWallet,
)


class CreditWalletSerializer(serializers.ModelSerializer):
    """
    Public representation of the authenticated user's wallet.
    Exposes separate bonus/purchased balances, reserved amounts,
    and reconciliation status. All fields are read-only.
    """
    total_available = serializers.IntegerField(read_only=True)
    total_reserved = serializers.IntegerField(read_only=True)
    total_balance = serializers.IntegerField(read_only=True)
    uncollected_deficit = serializers.IntegerField(read_only=True)
    reconciliation_status = serializers.CharField(read_only=True)

    class Meta:
        model = CreditWallet
        fields = [
            "id",
            "bonus_balance",
            "purchased_balance",
            "reserved_bonus",
            "reserved_purchased",
            "total_available",
            "total_reserved",
            "total_balance",
            "signup_bonus_granted",
            "uncollected_deficit",
            "reconciliation_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class CreditPackSerializer(serializers.ModelSerializer):
    """
    Public catalog item representation for purchasable packs.
    Never exposes internal provider margin or unpublished costs.
    """
    currency = serializers.SerializerMethodField()

    class Meta:
        model = CreditPack
        fields = [
            "id",
            "name",
            "description",
            "credits",
            "price_inr",
            "price_paise",
            "currency",
            "sort_order",
        ]
        read_only_fields = fields

    def get_currency(self, obj) -> str:
        return "INR"


class CreateOrderRequestSerializer(serializers.Serializer):
    """Request validation for initiating a credit pack purchase order."""
    pack_id = serializers.CharField(
        required=True,
        max_length=50,
        help_text="Machine-readable pack identifier from catalog, e.g. starter, pro, power",
    )
    client_request_id = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
        default=None,
        help_text="Optional client-side idempotency key to prevent accidental duplicate orders",
    )


class VerifyPaymentRequestSerializer(serializers.Serializer):
    """Request validation for client-side checkout verification."""
    gateway_order_id = serializers.CharField(
        required=True,
        max_length=255,
        help_text="Razorpay order identifier (e.g. order_xxx)",
    )
    gateway_payment_id = serializers.CharField(
        required=True,
        max_length=255,
        help_text="Razorpay payment identifier (e.g. pay_xxx)",
    )
    signature = serializers.CharField(
        required=True,
        max_length=255,
        help_text="Razorpay cryptographic HMAC SHA256 signature",
    )


class CreditLedgerEntrySerializer(serializers.ModelSerializer):
    """User-scoped read-only serializer for append-only credit ledger history."""
    class Meta:
        model = CreditLedgerEntry
        fields = [
            "id",
            "entry_type",
            "bucket",
            "delta",
            "balance_after_bonus",
            "balance_after_purchased",
            "reserved_after_bonus",
            "reserved_after_purchased",
            "description",
            "created_at",
        ]
        read_only_fields = fields


class CreditUsageRecordSerializer(serializers.ModelSerializer):
    """User-scoped read-only serializer for LLM token usage audit records."""
    class Meta:
        model = CreditUsageRecord
        fields = [
            "id",
            "provider",
            "model",
            "input_tokens",
            "output_tokens",
            "cached_tokens",
            "reasoning_tokens",
            "credits_charged",
            "is_estimated",
            "call_type",
            "status",
            "created_at",
        ]
        read_only_fields = fields


class CreditDeficitResolutionSerializer(serializers.ModelSerializer):
    """Staff audit serializer for administrative deficit reconciliations."""
    admin_email = serializers.EmailField(source="admin_user.email", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = CreditDeficitResolution
        fields = [
            "id",
            "wallet_id",
            "user_id",
            "user_email",
            "admin_user_id",
            "admin_email",
            "usage_record_id",
            "ledger_entry_id",
            "amount_resolved",
            "resolution_method",
            "reason",
            "notes",
            "metadata",
            "idempotency_key",
            "created_at",
        ]
        read_only_fields = fields


class AdminReconcileRequestSerializer(serializers.Serializer):
    """Validates payload for administrative deficit reconciliation."""
    wallet_id = serializers.UUIDField(required=True)
    amount = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    usage_record_id = serializers.UUIDField(required=False, allow_null=True)
    ledger_entry_id = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.CharField(required=True, min_length=3, max_length=1000)
    resolution_method = serializers.ChoiceField(
        choices=[
            ("admin_waiver", "Admin Waiver"),
            ("external_settlement", "External Settlement"),
            ("goodwill_adjustment", "Goodwill Adjustment"),
            ("accounting_correction", "Accounting Correction"),
        ],
        default="admin_waiver",
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")
    idempotency_key = serializers.CharField(required=False, allow_blank=True, max_length=255)

from django.contrib import admin
from .models import (
    CreditDeficitResolution,
    CreditLedgerEntry,
    CreditPack,
    CreditPurchaseSnapshot,
    CreditReservation,
    CreditUsageRecord,
    CreditWallet,
    PaymentWebhookEvent,
)


@admin.register(CreditWallet)
class CreditWalletAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "bonus_balance",
        "purchased_balance",
        "reserved_bonus",
        "reserved_purchased",
        "uncollected_deficit",
        "reconciliation_status",
        "signup_bonus_granted",
        "updated_at",
    )
    search_fields = ("user__email", "user__username", "id")
    list_filter = ("signup_bonus_granted", "created_at")
    readonly_fields = ("id", "uncollected_deficit", "reconciliation_status", "created_at", "updated_at")


@admin.register(CreditLedgerEntry)
class CreditLedgerEntryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "entry_type",
        "bucket",
        "delta",
        "balance_after_bonus",
        "balance_after_purchased",
        "idempotency_key",
        "created_at",
    )
    search_fields = ("user__email", "idempotency_key", "description")
    list_filter = ("entry_type", "bucket", "created_at")
    readonly_fields = [f.name for f in CreditLedgerEntry._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CreditReservation)
class CreditReservationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "status",
        "reserved_bonus",
        "reserved_purchased",
        "consumed_bonus",
        "consumed_purchased",
        "expires_at",
        "created_at",
    )
    search_fields = ("user__email", "idempotency_key", "session_id", "message_id")
    list_filter = ("status", "created_at")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(CreditUsageRecord)
class CreditUsageRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "provider",
        "model",
        "input_tokens",
        "output_tokens",
        "credits_charged",
        "is_estimated",
        "status",
        "created_at",
    )
    search_fields = ("user__email", "provider_request_id", "session_id", "idempotency_key")
    list_filter = ("provider", "model", "is_estimated", "status", "created_at")
    readonly_fields = [f.name for f in CreditUsageRecord._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(CreditPack)
class CreditPackAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "credits",
        "price_inr",
        "price_paise",
        "is_active",
        "is_signup_bonus",
        "sort_order",
    )
    list_filter = ("is_active", "is_signup_bonus")
    search_fields = ("id", "name")


@admin.register(CreditPurchaseSnapshot)
class CreditPurchaseSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "payment",
        "user",
        "pack_name",
        "credits",
        "amount_paid",
        "currency",
        "created_at",
    )
    search_fields = ("user__email", "pack_id", "pack_name")
    list_filter = ("currency", "created_at")
    readonly_fields = [f.name for f in CreditPurchaseSnapshot._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PaymentWebhookEvent)
class PaymentWebhookEventAdmin(admin.ModelAdmin):
    list_display = (
        "event_id",
        "gateway",
        "event_type",
        "status",
        "processed_at",
        "created_at",
    )
    search_fields = ("event_id", "event_type")
    list_filter = ("gateway", "status", "created_at")
    readonly_fields = ("id", "event_id", "gateway", "event_type", "payload", "created_at")


@admin.register(CreditDeficitResolution)
class CreditDeficitResolutionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "admin_user",
        "amount_resolved",
        "resolution_method",
        "reason",
        "created_at",
    )
    search_fields = ("user__email", "admin_user__email", "reason", "idempotency_key")
    list_filter = ("resolution_method", "created_at")
    readonly_fields = [f.name for f in CreditDeficitResolution._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


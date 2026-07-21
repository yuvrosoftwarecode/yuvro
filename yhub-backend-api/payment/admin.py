from django.contrib import admin

from .models import Payment, PurchasableItem, Refund, UserEntitlement, AiCreditLedger


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "product", "purpose", "gateway", "gateway_order_or_intent_id", "status", "amount", "created_at", "updated_at", "completed_at")
    ordering = ("-updated_at",)
    search_fields = (
        "id",
        "gateway_order_or_intent_id",
        "gateway_payment_or_charge_id",
        "gateway_customer_reference_id",
        "user__email",
    )
    list_filter = ("product", "purpose", "gateway", "status", "currency")
    readonly_fields = ("payment_attempts", "latest_successfull_payment", "gateway_response", "webhook_events", "payment_events")

    @admin.action(description="Sync selected payments with gateway")
    def sync_with_gateway(self, request, queryset):
        from .payment_service import PaymentService
        service = PaymentService()
        synced_count = 0
        for payment in queryset:
            old_status = payment.status
            service.sync_payment_status(payment)
            if payment.status != old_status:
                synced_count += 1
        self.message_user(request, f"Successfully synced and updated statuses for {synced_count} payments.")

    actions = [sync_with_gateway]


@admin.register(PurchasableItem)
class PurchasableItemAdmin(admin.ModelAdmin):
    list_display = ("item_type", "item_id", "name", "current_price", "is_active", "created_at")
    list_filter = ("item_type", "is_active")
    search_fields = ("item_id", "name")


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ("id", "payment", "refund_id", "amount", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("refund_id", "payment__id")


@admin.register(UserEntitlement)
class UserEntitlementAdmin(admin.ModelAdmin):
    list_display = ("user", "purchasable_item", "is_active", "granted_at", "revoked_at")
    list_filter = ("is_active", "purchasable_item__item_type")
    search_fields = ("user__email", "purchasable_item__name")


@admin.register(AiCreditLedger)
class AiCreditLedgerAdmin(admin.ModelAdmin):
    list_display = ("user", "delta", "balance_after", "reason", "created_at")
    search_fields = ("user__email", "reason")

from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "gateway", "status", "amount", "currency", "created_at")
    search_fields = (
        "id",
        "gateway_order_or_intent_id",
        "gateway_payment_or_charge_id",
        "gateway_customer_reference_id",
        "user__email",
    )
    list_filter = ("gateway", "status", "currency")

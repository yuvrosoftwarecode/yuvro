from rest_framework import serializers

from .models import Payment, Refund, PaymentStatus, UserEntitlement, PurchasableItem


class PaymentCreateSerializer(serializers.ModelSerializer):
    gateway = serializers.ChoiceField(choices=["razorpay", "stripe"], required=False, default="razorpay")
    item_type = serializers.CharField(required=False, write_only=True)
    item_id = serializers.CharField(required=False, write_only=True)
    item_name = serializers.CharField(required=False, write_only=True)
    product = serializers.CharField(required=False, write_only=True)

    class Meta:
        model = Payment
        fields = ["amount", "currency", "purpose", "description", "gateway", "metadata", "item_type", "item_id", "item_name", "product"]
        extra_kwargs = {
            "metadata": {"required": False},
            "purpose": {"required": False},
        }


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "gateway",
            "status",
            "amount",
            "currency",
            "purpose",
            "description",
            "product",
            "gateway_order_or_intent_id",
            "gateway_payment_or_charge_id",
            "gateway_customer_reference_id",
            "gateway_session_reference_id",
            "gateway_response",
            "created_at",
            "updated_at",
        ]


class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = ["id", "refund_id", "amount", "status", "gateway_response", "created_at"]

class PurchasableItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchasableItem
        fields = ["item_type", "item_id", "name", "product"]

class UserEntitlementSerializer(serializers.ModelSerializer):
    purchasable_item = PurchasableItemSerializer(read_only=True)
    
    class Meta:
        model = UserEntitlement
        fields = ["id", "purchasable_item", "granted_at", "revoked_at", "is_active"]

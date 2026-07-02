from rest_framework import serializers

from .models import Payment, Refund, PaymentStatus


class PaymentCreateSerializer(serializers.ModelSerializer):
    gateway = serializers.ChoiceField(choices=["razorpay", "stripe"], required=False, default="razorpay")

    class Meta:
        model = Payment
        fields = ["amount", "currency", "purpose", "description", "gateway", "metadata"]
        extra_kwargs = {"metadata": {"required": False}}


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

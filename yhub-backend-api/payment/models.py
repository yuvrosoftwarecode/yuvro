import uuid
from django.db import models


class PaymentGateway(models.TextChoices):
    RAZORPAY = "razorpay", "Razorpay"
    STRIPE = "stripe", "Stripe"


class PaymentStatus(models.TextChoices):
    CREATED = "created", "Created"
    PENDING = "pending", "Pending"
    AUTHORIZED = "authorized", "Authorized"
    SUCCESS_OR_CAPTURED = "success_or_captured", "Success or Captured"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"
    EXPIRED = "expired", "Expired"
    REFUNDED = "refunded", "Refunded"


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey("authentication.User", on_delete=models.CASCADE)

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")

    gateway = models.CharField(max_length=20, choices=PaymentGateway.choices)
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.CREATED,
    )

    gateway_order_or_intent_id = models.CharField(max_length=255, blank=True, null=True)
    gateway_payment_or_charge_id = models.CharField(max_length=255, blank=True, null=True)
    gateway_customer_reference_id = models.CharField(max_length=255, blank=True, null=True)
    gateway_session_reference_id = models.CharField(max_length=500, blank=True, null=True)

    purpose = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    metadata = models.JSONField(default=dict, blank=True)
    latest_payment = models.JSONField(default=dict, blank=True)
    payment_attempts = models.JSONField(default=list, blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    webhook_events = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.id)


class Refund(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    payment = models.ForeignKey(
        "payment.Payment",
        related_name="refunds",
        on_delete=models.CASCADE,
    )
    refund_id = models.CharField(max_length=255, unique=True, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    gateway_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.refund_id

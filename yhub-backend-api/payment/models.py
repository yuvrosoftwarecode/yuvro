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


class PurchasableType(models.TextChoices):
    CONTEST = "contest", "Contest"
    MOCK_INTERVIEW = "mock_interview", "Mock Interview"
    AI_CREDIT = "ai_credit", "AI Credit"


class PurchasableItem(models.Model):
    item_type = models.CharField(max_length=20, choices=PurchasableType.choices)
    item_id = models.CharField(max_length=255)
    name = models.CharField(max_length=255, blank=True)
    current_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['item_type', 'item_id']),
        ]

    def __str__(self):
        return f"{self.name} ({self.item_type})"


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey("authentication.User", on_delete=models.CASCADE)
    purchasable_item = models.ForeignKey(PurchasableItem, on_delete=models.SET_NULL, null=True, blank=True)

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
    
    client_request_id = models.CharField(max_length=255, unique=True, blank=True, null=True)
    failure_reason = models.TextField(blank=True)

    item_snapshot = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    latest_successfull_payment = models.JSONField(default=dict, blank=True)
    payment_attempts = models.JSONField(default=list, blank=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    webhook_events = models.JSONField(default=list, blank=True)
    payment_events = models.JSONField(default=list, blank=True)

    completed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['purchasable_item']),
            models.Index(fields=['gateway']),
        ]

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


class UserEntitlement(models.Model):
    user = models.ForeignKey("authentication.User", on_delete=models.CASCADE)
    payment_transaction = models.ForeignKey(Payment, on_delete=models.CASCADE)
    purchasable_item = models.ForeignKey(PurchasableItem, on_delete=models.CASCADE)
    
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['payment_transaction']),
            models.Index(fields=['purchasable_item']),
        ]

    def __str__(self):
        return f"Entitlement for {self.user_id} - {self.purchasable_item_id}"


class AiCreditLedger(models.Model):
    user = models.ForeignKey("authentication.User", on_delete=models.CASCADE)
    transaction = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    delta = models.IntegerField()
    balance_after = models.IntegerField()
    reason = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['transaction']),
        ]

    def __str__(self):
        return f"{self.user_id} -> {self.delta} (Balance: {self.balance_after})"

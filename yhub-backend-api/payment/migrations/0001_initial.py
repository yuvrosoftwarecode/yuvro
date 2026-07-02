from __future__ import annotations

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Payment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("currency", models.CharField(default="INR", max_length=10)),
                ("gateway", models.CharField(choices=[("razorpay", "Razorpay"), ("stripe", "Stripe")], max_length=20)),
                ("status", models.CharField(choices=[("created", "Created"), ("pending", "Pending"), ("authorized", "Authorized"), ("success_or_captured", "Success or Captured"), ("failed", "Failed"), ("cancelled", "Cancelled"), ("expired", "Expired"), ("refunded", "Refunded")], default="created", max_length=20)),
                ("gateway_order_or_intent_id", models.CharField(blank=True, max_length=255, null=True)),
                ("gateway_payment_or_charge_id", models.CharField(blank=True, max_length=255, null=True)),
                ("gateway_customer_reference_id", models.CharField(blank=True, max_length=255, null=True)),
                ("gateway_session_reference_id", models.CharField(blank=True, max_length=500, null=True)),
                ("purpose", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("latest_payment", models.JSONField(blank=True, default=dict)),
                ("payment_attempts", models.JSONField(blank=True, default=list)),
                ("gateway_response", models.JSONField(blank=True, default=dict)),
                ("webhook_events", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="authentication.user")),
            ],
        ),
        migrations.CreateModel(
            name="Refund",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("refund_id", models.CharField(db_index=True, max_length=255, unique=True)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("status", models.CharField(choices=[("created", "Created"), ("pending", "Pending"), ("authorized", "Authorized"), ("success_or_captured", "Success or Captured"), ("failed", "Failed"), ("cancelled", "Cancelled"), ("expired", "Expired"), ("refunded", "Refunded")], default="pending", max_length=20)),
                ("gateway_response", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("payment", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="refunds", to="payment.payment")),
            ],
        ),
    ]

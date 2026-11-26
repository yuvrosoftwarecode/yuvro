import uuid
from django.conf import settings
from django.db import models


class ReferralCode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referral_code_record",
    )
    code = models.CharField(max_length=50, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Referral Code"
        verbose_name_plural = "Referral Codes"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} -> {self.code}"


class Referral(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referrals_made",
    )
    referred_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referred_by_record",
        null=True,
        blank=True,
    )
    referral_code = models.CharField(max_length=50, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="accepted",
        db_index=True,
    )
    referred_email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Referral"
        verbose_name_plural = "Referrals"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["referrer", "status"]),
            models.Index(fields=["referral_code"]),
        ]

    def __str__(self):
        ref_email = self.referred_user.email if self.referred_user else self.referred_email or "Unknown"
        return f"Referral: {self.referrer.email} -> {ref_email} ({self.status})"

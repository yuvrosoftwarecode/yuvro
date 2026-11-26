import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("authentication", "0010_linkedinconnection_linkedin_handle_user_email_public_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReferralCode",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("code", models.CharField(db_index=True, max_length=50, unique=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referral_code_record",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Referral Code",
                "verbose_name_plural": "Referral Codes",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Referral",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("referral_code", models.CharField(db_index=True, max_length=50)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("accepted", "Accepted"),
                            ("rejected", "Rejected"),
                        ],
                        db_index=True,
                        default="accepted",
                        max_length=20,
                    ),
                ),
                ("referred_email", models.EmailField(blank=True, max_length=254, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "referred_user",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referred_by_record",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "referrer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referrals_made",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Referral",
                "verbose_name_plural": "Referrals",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["referrer", "status"], name="referrals_r_referre_2ffc89_idx"),
                    models.Index(fields=["referral_code"], name="referrals_r_referra_418bc0_idx"),
                ],
            },
        ),
    ]

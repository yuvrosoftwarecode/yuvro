# Generated manually for Candidate Mock Interview Quota and Packs

import uuid
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def seed_default_mock_packs(apps, schema_editor):
    MockInterviewPack = apps.get_model("mockinterviews", "MockInterviewPack")
    packs = [
        {
            "id": "mock_pack_1",
            "name": "1 Mock Interview",
            "description": "1 AI-led Mock Interview session with real-time adaptive questioning, dynamic evaluation, and comprehensive analytics report.",
            "interviews_count": 1,
            "price_inr": Decimal("99.00"),
            "price_paise": 9900,
            "badge": "",
            "sort_order": 1,
            "is_active": True,
        },
        {
            "id": "mock_pack_5",
            "name": "5 Mock Interviews",
            "description": "5 AI-led Mock Interview sessions with real-time adaptive questioning, dynamic evaluation, and comprehensive analytics reports.",
            "interviews_count": 5,
            "price_inr": Decimal("399.00"),
            "price_paise": 39900,
            "badge": "Popular",
            "sort_order": 2,
            "is_active": True,
        },
        {
            "id": "mock_pack_10",
            "name": "10 Mock Interviews",
            "description": "10 AI-led Mock Interview sessions with real-time adaptive questioning, dynamic evaluation, and comprehensive analytics reports.",
            "interviews_count": 10,
            "price_inr": Decimal("700.00"),
            "price_paise": 70000,
            "badge": "Best Value",
            "sort_order": 3,
            "is_active": True,
        },
    ]
    for p in packs:
        MockInterviewPack.objects.update_or_create(id=p["id"], defaults=p)


def remove_default_mock_packs(apps, schema_editor):
    MockInterviewPack = apps.get_model("mockinterviews", "MockInterviewPack")
    MockInterviewPack.objects.filter(id__in=["mock_pack_1", "mock_pack_5", "mock_pack_10"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("payment", "0001_initial"),
        ("mockinterviews", "0006_add_nodejs_mock_interview"),
    ]

    operations = [
        migrations.CreateModel(
            name="MockInterviewPack",
            fields=[
                (
                    "id",
                    models.CharField(
                        help_text="Pack identifier e.g. mock_pack_1, mock_pack_5, mock_pack_10",
                        max_length=50,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                (
                    "interviews_count",
                    models.IntegerField(help_text="Number of mock interviews granted"),
                ),
                (
                    "price_inr",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("0.00"),
                        help_text="Price in INR",
                        max_digits=10,
                    ),
                ),
                (
                    "price_paise",
                    models.PositiveIntegerField(
                        default=0,
                        help_text="Price in integer paise for payment gateways (e.g. 9900 for ₹99)",
                    ),
                ),
                (
                    "badge",
                    models.CharField(
                        blank=True,
                        help_text="UI badge like 'Popular' or 'Best Value'",
                        max_length=50,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.IntegerField(default=0)),
            ],
            options={
                "ordering": ["sort_order", "price_inr"],
            },
        ),
        migrations.CreateModel(
            name="CandidateMockInterviewQuota",
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "free_interviews",
                    models.IntegerField(
                        default=3,
                        help_text="Initial free mock interviews granted",
                    ),
                ),
                (
                    "purchased_interviews",
                    models.IntegerField(
                        default=0,
                        help_text="Total mock interviews purchased",
                    ),
                ),
                (
                    "used_interviews",
                    models.IntegerField(
                        default=0,
                        help_text="Total mock interviews consumed",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="mock_interview_quota",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Candidate Mock Interview Quota",
                "verbose_name_plural": "Candidate Mock Interview Quotas",
            },
        ),
        migrations.CreateModel(
            name="MockInterviewCreditLedger",
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "entry_type",
                    models.CharField(
                        choices=[
                            ("initial_grant", "Initial Grant"),
                            ("purchase", "Purchase"),
                            ("consume", "Consume"),
                            ("refund", "Refund"),
                            ("admin_adjustment", "Admin Adjustment"),
                        ],
                        max_length=30,
                    ),
                ),
                (
                    "delta",
                    models.IntegerField(
                        help_text="Change in available interviews (+3, -1, +5, etc.)"
                    ),
                ),
                (
                    "balance_after",
                    models.IntegerField(
                        help_text="Available balance after this transaction"
                    ),
                ),
                ("description", models.CharField(blank=True, max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "payment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="mock_interview_ledger_entries",
                        to="payment.payment",
                    ),
                ),
                (
                    "quota",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ledger_entries",
                        to="mockinterviews.candidatemockinterviewquota",
                    ),
                ),
                (
                    "submission",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="credit_entries",
                        to="mockinterviews.mockinterviewsubmission",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="mock_interview_ledger_entries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.RunPython(seed_default_mock_packs, remove_default_mock_packs),
    ]

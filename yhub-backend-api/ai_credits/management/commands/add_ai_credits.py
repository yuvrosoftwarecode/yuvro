import uuid
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from ai_credits.models import (
    CreditWallet,
    CreditLedgerEntry,
    CreditEntryType,
    CreditBucket,
)

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Increase AI credits for a user by email. "
        "Allows adding bonus (default) or purchased credits with an auditable ledger entry."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "email",
            type=str,
            help="Email address of the user.",
        )
        parser.add_argument(
            "amount",
            type=int,
            help="Number of credits to add (must be positive).",
        )
        parser.add_argument(
            "--bucket",
            type=str,
            choices=["bonus", "purchased"],
            default="bonus",
            help="Credit bucket to add to: 'bonus' (default) or 'purchased'.",
        )
        parser.add_argument(
            "--description",
            type=str,
            default="Admin credit top-up",
            help="Audit description for the ledger entry.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate the credit addition without committing changes.",
        )

    def handle(self, *args, **options):
        email = options["email"].strip()
        amount = options["amount"]
        bucket_choice = options["bucket"].lower()
        description = options["description"]
        dry_run = options["dry_run"]

        if amount <= 0:
            raise CommandError("Amount of credits must be greater than 0.")

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise CommandError(f"User with email '{email}' not found.")
        except User.MultipleObjectsReturned:
            user = User.objects.filter(email__iexact=email).first()

        bucket = CreditBucket.BONUS if bucket_choice == "bonus" else CreditBucket.PURCHASED

        with transaction.atomic():
            wallet, created = CreditWallet.objects.select_for_update().get_or_create(user=user)
            prev_available = wallet.total_available
            prev_bucket_balance = wallet.bonus_balance if bucket == CreditBucket.BONUS else wallet.purchased_balance

            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f"[DRY RUN] Would add {amount:,} {bucket_choice} credits to user '{user.email}' (ID: {user.id}).\n"
                        f"Current Available: {prev_available:,} -> Projected: {prev_available + amount:,}"
                    )
                )
                return

            if bucket == CreditBucket.BONUS:
                wallet.bonus_balance += amount
                wallet.save(update_fields=["bonus_balance", "updated_at"])
            else:
                wallet.purchased_balance += amount
                wallet.save(update_fields=["purchased_balance", "updated_at"])

            CreditLedgerEntry.objects.create(
                wallet=wallet,
                user=user,
                entry_type=CreditEntryType.ADMIN_ADJUSTMENT,
                bucket=bucket,
                delta=amount,
                balance_after_bonus=wallet.bonus_balance,
                balance_after_purchased=wallet.purchased_balance,
                reserved_after_bonus=wallet.reserved_bonus,
                reserved_after_purchased=wallet.reserved_purchased,
                idempotency_key=str(uuid.uuid4()),
                description=description,
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully added {amount:,} {bucket_choice} credits to '{user.email}' (ID: {user.id}).\n"
                    f"Previous available: {prev_available:,}\n"
                    f"New available: {wallet.total_available:,} "
                    f"(Bonus: {wallet.bonus_balance:,}, Purchased: {wallet.purchased_balance:,})"
                )
            )

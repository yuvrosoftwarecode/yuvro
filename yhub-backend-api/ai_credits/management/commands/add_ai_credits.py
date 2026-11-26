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
from ai_credits.wallet_service import WalletService

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

        wallet, _ = WalletService.get_or_create_wallet(user=user)
        prev_available = wallet.total_available

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[DRY RUN] Would add {amount:,} {bucket_choice} credits to user '{user.email}' (ID: {user.id}).\n"
                    f"Current Available: {prev_available:,} -> Projected: {prev_available + amount:,}"
                )
            )
            return

        wallet, entry = WalletService.add_admin_credits(
            user=user,
            amount=amount,
            bucket=bucket_choice,
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

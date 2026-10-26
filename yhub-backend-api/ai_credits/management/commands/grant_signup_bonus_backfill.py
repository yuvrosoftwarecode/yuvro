import logging
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from ai_credits.models import CreditWallet
from ai_credits.wallet_service import WalletService

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = (
        "Safely and idempotently grants the 50,000 welcome credits signup bonus to eligible existing users. "
        "Can be safely re-run multiple times; skips any user who already received the bonus."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulates the backfill without creating wallets or crediting balances.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=200,
            help="Number of users to process in each chunk (default: 200).",
        )
        parser.add_argument(
            "--user-id",
            type=str,
            default=None,
            help="Target a single specific user UUID.",
        )
        parser.add_argument(
            "--email",
            type=str,
            default=None,
            help="Target a single specific user email.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]
        user_id = options.get("user_id")
        email = options.get("email")

        self.stdout.write(self.style.NOTICE(f"=== Starting Signup Bonus Backfill (Dry Run: {dry_run}) ==="))

        users_qs = User.objects.all().order_by("date_joined")
        if user_id:
            users_qs = users_qs.filter(id=user_id)
        if email:
            users_qs = users_qs.filter(email=email)

        total_users = users_qs.count()
        self.stdout.write(f"Total users identified for evaluation: {total_users}")

        granted_count = 0
        skipped_count = 0
        failed_count = 0

        # Process in batches
        for start_idx in range(0, total_users, batch_size):
            batch = users_qs[start_idx : start_idx + batch_size]
            for user in batch:
                try:
                    # Check if user already has a wallet with bonus granted
                    wallet = CreditWallet.objects.filter(user=user).first()
                    if wallet and wallet.signup_bonus_granted:
                        skipped_count += 1
                        continue

                    if dry_run:
                        self.stdout.write(f"[DRY-RUN] Would grant 50,000 credits to user: {user.email} ({user.id})")
                        granted_count += 1
                        continue

                    # Execute atomic grant
                    wallet, granted = WalletService.grant_signup_bonus(user=user, amount=50_000, wallet=wallet)
                    if granted:
                        granted_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f"Granted 50,000 credits to: {user.email} (Wallet: {wallet.id})")
                        )
                    else:
                        skipped_count += 1

                except Exception as exc:
                    failed_count += 1
                    self.stderr.write(
                        self.style.ERROR(f"Failed to process user {user.email} ({user.id}): {exc}")
                    )

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("Signup Bonus Backfill Complete!"))
        self.stdout.write(f"  Total Scanned : {total_users}")
        self.stdout.write(f"  Granted       : {granted_count}")
        self.stdout.write(f"  Skipped       : {skipped_count}")
        self.stdout.write(f"  Failed        : {failed_count}")
        self.stdout.write("=" * 50)

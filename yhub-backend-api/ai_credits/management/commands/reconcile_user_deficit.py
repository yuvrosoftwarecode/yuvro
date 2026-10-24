import logging
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from ai_credits.models import CreditWallet
from ai_credits.wallet_service import WalletService

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = (
        "Auditably reconciles an unresolved credit deficit for a user's wallet. "
        "Creates an immutable CreditDeficitResolution audit record and ledger entry. "
        "Requires a non-empty administrative reason."
    )

    def add_arguments(self, parser):
        parser.add_argument("--user-id", type=str, help="UUID of the user")
        parser.add_argument("--email", type=str, help="Email of the user")
        parser.add_argument("--wallet-id", type=str, help="UUID of the wallet")
        parser.add_argument(
            "--admin-email",
            type=str,
            help="Email of the staff administrator performing the action (defaults to active superuser)",
        )
        parser.add_argument(
            "--reason",
            type=str,
            required=True,
            help="Mandatory administrative justification for reconciling this deficit",
        )
        parser.add_argument(
            "--amount",
            type=int,
            default=None,
            help="Amount of deficit to reconcile (defaults to all outstanding deficit)",
        )
        parser.add_argument(
            "--method",
            type=str,
            default="admin_waiver",
            choices=["admin_waiver", "external_settlement", "goodwill_adjustment", "accounting_correction"],
            help="Administrative reconciliation method (default: admin_waiver)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulates the reconciliation without creating records",
        )

    def handle(self, *args, **options):
        user_id = options.get("user_id")
        email = options.get("email")
        wallet_id = options.get("wallet_id")
        admin_email = options.get("admin_email")
        reason = options["reason"]
        amount = options.get("amount")
        method = options.get("method")
        dry_run = options["dry_run"]

        if not reason or not reason.strip():
            raise CommandError("A non-empty --reason is strictly required.")

        # Resolve admin user
        if admin_email:
            admin_user = User.objects.filter(email=admin_email).first()
            if not admin_user:
                raise CommandError(f"Admin user with email '{admin_email}' not found.")
            if not (admin_user.is_staff or admin_user.is_superuser):
                raise CommandError(f"User '{admin_email}' is not a staff member or superuser.")
        else:
            admin_user = User.objects.filter(is_superuser=True, is_active=True).first()
            if not admin_user:
                admin_user = User.objects.filter(is_staff=True, is_active=True).first()
            if not admin_user:
                raise CommandError("No active staff or superuser found to attribute administrative action.")

        # Resolve target wallet
        wallet = None
        if wallet_id:
            wallet = CreditWallet.objects.filter(id=wallet_id).first()
        elif user_id:
            wallet = CreditWallet.objects.filter(user_id=user_id).first()
        elif email:
            wallet = CreditWallet.objects.filter(user__email=email).first()

        if not wallet:
            raise CommandError("Target wallet not found. Specify a valid --wallet-id, --user-id, or --email.")

        unresolved = wallet.uncollected_deficit
        if unresolved <= 0:
            self.stdout.write(
                self.style.WARNING(
                    f"Wallet {wallet.id} (User: {wallet.user.email}) has no unresolved deficit (status: {wallet.reconciliation_status}). Nothing to reconcile."
                )
            )
            return

        reconcile_amt = min(amount, unresolved) if amount else unresolved

        if dry_run:
            self.stdout.write(
                self.style.NOTICE(
                    f"[Dry Run] Would reconcile {reconcile_amt:,} of {unresolved:,} deficit credits "
                    f"for wallet {wallet.id} ({wallet.user.email}) via {method} by {admin_user.email}."
                )
            )
            return

        resolution, updated_wallet = WalletService.reconcile_deficit(
            wallet_id=wallet.id,
            admin_user=admin_user,
            amount_to_resolve=reconcile_amt,
            reason=reason.strip(),
            resolution_method=method,
            notes="Executed via reconcile_user_deficit management command",
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully reconciled {reconcile_amt:,} credits (Resolution ID: {resolution.id}).\n"
                f"Remaining deficit: {updated_wallet.uncollected_deficit:,} credits (Status: {updated_wallet.reconciliation_status})."
            )
        )

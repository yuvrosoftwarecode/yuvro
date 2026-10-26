import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from ai_credits.models import CreditReservation, ReservationStatus
from ai_credits.wallet_service import WalletService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Recovers stranded or abandoned credit reservations whose expiration timestamp has passed "
        "(e.g., from worker crashes, killed processes, or network disconnections). "
        "Releases reserved credits back to the user's available balance."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Reports expired reservations without releasing them.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Maximum number of reservations to process per iteration (default: 100).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]
        now = timezone.now()

        stale_qs = CreditReservation.objects.filter(
            status=ReservationStatus.PENDING,
            expires_at__lte=now,
        )
        total_stale = stale_qs.count()

        if dry_run:
            self.stdout.write(
                self.style.NOTICE(
                    f"[Dry Run] Found {total_stale} expired pending reservation(s) ready for recovery."
                )
            )
            return

        self.stdout.write(
            self.style.NOTICE(
                f"Starting recovery for {total_stale} expired pending reservation(s)..."
            )
        )

        total_recovered = 0
        while True:
            recovered = WalletService.expire_abandoned_reservations(batch_size=batch_size)
            if recovered == 0:
                break
            total_recovered += recovered
            self.stdout.write(f"Recovered batch of {recovered} reservation(s)...")

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully expired and recovered {total_recovered} stranded reservation(s)."
            )
        )

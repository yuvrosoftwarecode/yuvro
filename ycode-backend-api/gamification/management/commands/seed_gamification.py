from django.core.management.base import BaseCommand
from gamification.service import seed_badges, seed_missions


class Command(BaseCommand):
    help = "Seed gamification data (badges and missions) into the database. Safe to run multiple times — uses get_or_create."

    def handle(self, *args, **options):
        self.stdout.write("Seeding badge definitions...")
        seed_badges()
        self.stdout.write(self.style.SUCCESS("  ✓ Badges seeded"))

        self.stdout.write("Seeding mission definitions...")
        seed_missions()
        self.stdout.write(self.style.SUCCESS("  ✓ Missions seeded"))

        self.stdout.write(self.style.SUCCESS("\nDone! All gamification seed data is ready."))

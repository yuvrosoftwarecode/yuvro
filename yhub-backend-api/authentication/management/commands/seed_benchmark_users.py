from django.core.management.base import BaseCommand
from django.db import connection
import time


class Command(BaseCommand):
    help = "Seed synthetic benchmark users into authentication_user for scale verification"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=1000000,
            help="Number of users to seed (default: 1,000,000)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear all synthetic benchmark users",
        )

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            if options["clear"]:
                self.stdout.write(self.style.WARNING("Clearing synthetic benchmark users..."))
                cursor.execute(
                    "DELETE FROM authentication_user WHERE email LIKE '%@benchmark.yuvro.internal';"
                )
                self.stdout.write(self.style.SUCCESS("Synthetic benchmark users cleared."))
                return

            count = options["count"]
            self.stdout.write(f"Seeding {count:,} users into PostgreSQL...")
            start = time.perf_counter()

            cursor.execute(
                f"""
                INSERT INTO authentication_user (
                    id, password, last_login, is_superuser, first_name, last_name, is_staff, is_active,
                    date_joined, email, username, is_otp_login, roles, cover_image, profile_image,
                    resume_file, is_guest_user, about, education, employment, location, phone, website
                )
                SELECT
                    gen_random_uuid(),
                    'pbkdf2_sha256$600000$dummy$dummyhash',
                    NULL,
                    FALSE,
                    'Dev' || (i % 100),
                    'User' || i,
                    FALSE,
                    TRUE,
                    NOW() - (i || ' minutes')::interval,
                    'dev_' || i || '@benchmark.yuvro.internal',
                    'dev_user_' || i,
                    FALSE,
                    '{{"ylabs": "student"}}'::jsonb,
                    NULL,
                    NULL,
                    NULL,
                    FALSE,
                    'Synthetic benchmark user ' || i,
                    '[]'::jsonb,
                    '[]'::jsonb,
                    'Bengaluru, India',
                    '+91987654' || LPAD((i % 10000)::text, 4, '0'),
                    'https://github.com/devuser' || i
                FROM generate_series(1, {count}) AS i
                ON CONFLICT (username) DO NOTHING;
                """
            )
            cursor.execute("ANALYZE authentication_user;")
            duration = time.perf_counter() - start

            cursor.execute("SELECT count(*) FROM authentication_user;")
            total = cursor.fetchone()[0]

            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully seeded in {duration:.2f}s! Total users in database: {total:,}"
                )
            )

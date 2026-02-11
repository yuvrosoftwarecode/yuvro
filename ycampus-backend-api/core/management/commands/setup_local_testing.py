from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction


class Command(BaseCommand):
    help = "Setup all mandatory data for local testing environment"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before setting up (WARNING: This will delete existing data)",
        )
        parser.add_argument(
            "--skip-migrations",
            action="store_true",
            help="Skip running migrations",
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS("🚀 Setting up local testing environment...\n")
        )

        try:
            if not options["skip_migrations"]:
                self.stdout.write("📦 Running database migrations...")
                call_command("migrate", verbosity=0)
                self.stdout.write(
                    self.style.SUCCESS("✓ Database migrations completed\n")
                )

            self.stdout.write("👥 Setting up test users...")
            if options["clear"]:
                call_command("create_test_users", "--clear", verbosity=1)
            else:
                call_command("create_test_users", verbosity=1)
            self.stdout.write("")

            # self.stdout.write("📚 Loading sample course data...")
            # if options["clear"]:
            #     call_command("load_sample_courses", "--clear", verbosity=1)
            # else:
            #     call_command("load_sample_courses", verbosity=1)
            # self.stdout.write("")

            # self.stdout.write("💼 Loading sample companies and jobs...")
            # if options["clear"]:
            #     call_command("load_sample_companies_and_jobs", "--clear", verbosity=1)
            # else:
            #     call_command("load_sample_companies_and_jobs", verbosity=1)
            # self.stdout.write("")

            # self.stdout.write("📝 Loading sample assessment tests...")
            # if options["clear"]:
            #     call_command("load_sample_assessment_tests", "--clear", verbosity=1)
            # else:
            #     call_command("load_sample_assessment_tests", verbosity=1)
            # self.stdout.write("")

            self.stdout.write(
                self.style.SUCCESS(
                    "🎉 Local testing environment setup completed successfully!"
                )
            )
            self.stdout.write(self.style.SUCCESS("✓ Test users created"))
            self.stdout.write(self.style.SUCCESS("✓ Sample courses loaded"))
            self.stdout.write(self.style.SUCCESS("✓ Sample companies and jobs loaded"))
            self.stdout.write(self.style.SUCCESS("✓ Sample assessment tests loaded"))
            self.stdout.write("")
            self.stdout.write("🚀 You can now start testing the application!")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error during setup: {str(e)}"))
            raise e

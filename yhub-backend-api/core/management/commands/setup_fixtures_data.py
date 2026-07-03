from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Setup all mandatory fixture data for environment"

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
        parser.add_argument(
            "--deploy_env",
            type=str,
            default="dev",
            choices=["local", "dev", "prod"],
            help="Environment to load fixtures from: local, dev or prod",
        )

    def handle(self, *args, **options):
        deploy_env = "dev" if options["deploy_env"] == "local" else options["deploy_env"]
        self.stdout.write(
            self.style.SUCCESS(f"🚀 Setting up YHub fixtures for {deploy_env}...\n")
        )

        try:
            if not options["skip_migrations"]:
                self.stdout.write("📦 Running database migrations...")
                call_command("migrate", verbosity=0)
                self.stdout.write(
                    self.style.SUCCESS("✓ Database migrations completed\n")
                )

            self.stdout.write("👥 Loading YHub test users...")
            if options["clear"]:
                call_command("create_test_users", "--clear", deploy_env=deploy_env, verbosity=1)
            else:
                call_command("create_test_users", deploy_env=deploy_env, verbosity=1)
            self.stdout.write("")

            self.stdout.write("🤖 Seeding AI Agents...")
            call_command("seed_agents", verbosity=1)
            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS(
                    "🎉 YHub setup completed successfully!"
                )
            )

            self.stdout.write(self.style.SUCCESS("✓ Test users created"))

            self.stdout.write("")
            self.stdout.write("🚀 You can now start testing the application!")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error during setup: {str(e)}"))
            raise e

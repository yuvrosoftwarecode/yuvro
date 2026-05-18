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
        parser.add_argument(
            "--deploy_env",
            type=str,
            default="dev",
            choices=["dev", "prod"],
            help="Environment to load fixtures from: dev or prod",
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
                call_command("create_test_users", "--clear", deploy_env=options["deploy_env"], verbosity=1)
            else:
                call_command("create_test_users", deploy_env=options["deploy_env"], verbosity=1)
            self.stdout.write("")

            self.stdout.write("📚 Loading sample course data...")
            if options["clear"]:
                call_command("load_courses", "--clear", deploy_env=options["deploy_env"], verbosity=1)
            else:
                call_command("load_courses", deploy_env=options["deploy_env"], verbosity=1)
            self.stdout.write("")

            self.stdout.write("💼 Loading sample companies and jobs...")
            if options["clear"]:
                call_command("load_sample_companies_and_jobs", "--clear", deploy_env=options["deploy_env"], verbosity=1)
            else:
                call_command("load_sample_companies_and_jobs", deploy_env=options["deploy_env"], verbosity=1)
            self.stdout.write("")

            self.stdout.write("🤖 Loading AI Interview Planner mock data...")
            if options["clear"]:
                call_command("load_planner_data", "--clear", deploy_env=options["deploy_env"], verbosity=1)
            else:
                call_command("load_planner_data", deploy_env=options["deploy_env"], verbosity=1)
            self.stdout.write("")

            self.stdout.write("📝 Loading sample assessment tests...")
            if options["clear"]:
                call_command("load_sample_assessment_tests", "--clear", deploy_env=options["deploy_env"], verbosity=1)
            else:
                call_command("load_sample_assessment_tests", deploy_env=options["deploy_env"], verbosity=1)
            self.stdout.write("")

            self.stdout.write("🏫 Loading college data...")
            if options["clear"]:
                call_command("load_colleges", "--clear", deploy_env=options["deploy_env"], verbosity=1)
            else:
                call_command("load_colleges", deploy_env=options["deploy_env"], verbosity=1)
            self.stdout.write("")

            self.stdout.write("🤖 Seeding AI agents...")
            call_command("seed_agents", verbosity=1)
            self.stdout.write("")

            self.stdout.write("📚 Assigning subjects and tasks...")
            call_command("assign_subjects_and_tasks", verbosity=1)
            self.stdout.write("")

            self.stdout.write(
                self.style.SUCCESS(
                    "🎉 Local testing environment setup completed successfully!"
                )
            )
            self.stdout.write(self.style.SUCCESS("✓ Test users created"))
            self.stdout.write(self.style.SUCCESS("✓ Sample courses loaded"))
            self.stdout.write(self.style.SUCCESS("✓ Sample companies and jobs loaded"))
            self.stdout.write(self.style.SUCCESS("✓ AI Interview Planner mock data loaded"))
            self.stdout.write(self.style.SUCCESS("✓ Sample assessment tests loaded"))
            self.stdout.write(self.style.SUCCESS("✓ College data loaded"))
            self.stdout.write(self.style.SUCCESS("✓ AI agents seeded"))
            self.stdout.write(self.style.SUCCESS("✓ Subjects and tasks assigned"))
            self.stdout.write("")
            self.stdout.write("🚀 You can now start testing the application!")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error during setup: {str(e)}"))
            raise e
import os
from django.core.management.base import BaseCommand
from django.core.management import call_command

class Command(BaseCommand):
    help = "Load initial college data (colleges, departments, batches, semesters, sections, and users)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before loading (Not implemented for this specific command, use with caution)",
        )
        parser.add_argument(
            "--deploy_env",
            type=str,
            default="dev",
            choices=["dev", "prod"],
            help="Environment to load fixtures from: dev or prod",
        )
        parser.add_argument(
            "--file",
            type=str,
            default="college_initial_data.json",
            help="Filename within fixtures/<deploy_env>/ to load",
        )

    def handle(self, *args, **options):
        deploy_env = options["deploy_env"]
        fixture_file = options["file"]
        
        # Construct the path to the fixture
        # Core app is where this command is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        core_app_dir = os.path.dirname(os.path.dirname(current_dir))
        fixture_path = os.path.join(core_app_dir, "fixtures", deploy_env, fixture_file)

        if not os.path.exists(fixture_path):
            self.stdout.write(
                self.style.ERROR(f"Fixture file not found at: {fixture_path}")
            )
            return

        self.stdout.write(f"⏳ Loading college data from {fixture_path}...")
        
        try:
            import json
            import tempfile
            
            # Read and modify fixture data to remove deprecated fields
            with open(fixture_path, 'r') as f:
                data = json.load(f)
            
            for item in data:
                if item["model"] == "core.college" and "affiliated_university" in item["fields"]:
                    del item["fields"]["affiliated_university"]
            
            # Create a temporary file to load data from
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_f:
                json.dump(data, temp_f)
                temp_fixture_path = temp_f.name
            
            try:
                call_command("loaddata", temp_fixture_path)
            finally:
                if os.path.exists(temp_fixture_path):
                    os.remove(temp_fixture_path)

            self.stdout.write(
                self.style.SUCCESS(f"✓ Successfully loaded college data from {fixture_file}")
            )
            
            # Set default password for all users loaded from this fixture
            self.stdout.write("🔐 Setting default passwords for loaded users (bulk update)...")
            from django.contrib.auth import get_user_model
            from django.contrib.auth.hashers import make_password
            import json
            
            User = get_user_model()
            with open(fixture_path, "r") as f:
                data = json.load(f)
            
            user_ids = [item["pk"] for item in data if item["model"] == "authentication.user"]
            
            # Hash once and update all
            hashed_password = make_password("password123")
            updated_count = User.objects.filter(id__in=user_ids).update(password=hashed_password)
            
            self.stdout.write(
                self.style.SUCCESS(f"✓ Set default password 'password123' for {updated_count} users")
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Error loading fixture: {str(e)}")
            )
            raise e

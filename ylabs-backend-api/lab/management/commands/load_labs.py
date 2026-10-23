import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from lab.models import Lab, LabSprint, LabSprintTicket

User = get_user_model()


class Command(BaseCommand):
    help = "Load labs from fixtures/<env>/*/lab.json + sprints/*.json."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before loading",
        )
        parser.add_argument(
            "--deploy_env",
            type=str,
            default="dev",
            choices=["dev", "prod"],
            help="Fixture environment to load from (default: dev)",
        )

    def handle(self, *args, **options):
        deploy_env = options["deploy_env"]

        if options["clear"]:
            self.stdout.write("Clearing existing lab data...")
            LabSprintTicket.objects.all().delete()
            LabSprint.objects.all().delete()
            Lab.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing data cleared."))

        self._load_instructors(deploy_env)

        fixtures_root = Path(os.path.dirname(__file__)) / "../../fixtures" / deploy_env
        if not fixtures_root.exists():
            self.stdout.write(self.style.ERROR(f"Fixtures directory not found: {fixtures_root}"))
            return

        has_errors = False
        lab_dirs = sorted(d for d in fixtures_root.iterdir() if d.is_dir())

        if not lab_dirs:
            self.stdout.write(self.style.WARNING(f"No lab directories found in {fixtures_root}"))
            return

        for lab_dir in lab_dirs:
            lab_file = lab_dir / "lab.json"
            if not lab_file.exists():
                continue

            self.stdout.write(f"\nProcessing: {lab_dir.name}/lab.json")

            data = self._load_json(lab_file)
            if not data:
                has_errors = True
                continue

            sprints_dir = lab_dir / "sprints"
            if sprints_dir.exists():
                sprint_files = sorted(sprints_dir.glob("*.json"))
                raw_sprints = [self._load_json(f) for f in sprint_files]
                raw_sprints = [s for s in raw_sprints if s]
                
                for lab_config in data.get("labs", []):
                    lab_config["sprints"] = raw_sprints

            try:
                self._load_labs(data)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed loading {lab_file}: {e}"))
                has_errors = True

        if not has_errors:
            self.stdout.write(self.style.SUCCESS("\n✅ All labs loaded successfully!"))
        else:
            self.stdout.write(self.style.WARNING("\n⚠ Finished with some errors (see above)."))

    def _load_json(self, filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error reading {filepath}: {e}"))
        return None

    def _load_instructors(self, deploy_env):
        users_path = Path(os.path.dirname(__file__)) / f"../../../authentication/fixtures/{deploy_env}/test_users_data.json"
        if not users_path.exists():
            return
        data = self._load_json(users_path)
        if not data:
            return
        for u in data.get("users", []):
            if u.get("role") not in ("instructor", "admin"):
                continue
            user, created = User.objects.get_or_create(
                email=u["email"],
                defaults={
                    "username": u["username"],
                    "first_name": u["first_name"],
                    "last_name": u["last_name"],
                    "role": u["role"],
                    "is_staff": u.get("is_staff", False),
                    "is_superuser": u.get("is_superuser", False),
                },
            )
            if created:
                user.set_password(u["password"])
                user.save()

    def _load_labs(self, data):
        admin_user = User.objects.filter(role__in=["admin", "instructor"]).first()
        if not admin_user:
            self.stdout.write(self.style.WARNING("No admin/instructor user found to set as created_by. Please ensure test_users_data.json exists or run with users pre-loaded."))
            admin_user, _ = User.objects.get_or_create(
                username="lab-system-admin",
                defaults={
                    "email": "lab-system-admin@yuvro.com",
                    "role": "admin",
                    "is_staff": True,
                    "is_superuser": True
                }
            )

        for lab_data in data.get("labs", []):
            self.stdout.write(f'Loading lab: {lab_data["title"]}')

            defaults = {
                "type": lab_data.get("type", "BACKEND"),
                "description": lab_data.get("description", ""),
                "icon": lab_data.get("icon", ""),
                "prerequisites": lab_data.get("prerequisites", ""),
                "skills": lab_data.get("skills", []),
                "git_repo_starter_url": lab_data.get("git_repo_starter_url", ""),
                "difficulty": lab_data.get("difficulty", "MEDIUM"),
                "status": lab_data.get("status", "active" if lab_data.get("is_active", True) else "inactive"),
                "created_by": admin_user,
            }
            if "id" in lab_data:
                defaults["id"] = lab_data["id"]

            lab, created = Lab.objects.update_or_create(
                title=lab_data["title"],
                defaults=defaults,
            )
            self.stdout.write(f"  {'✓ Created' if created else '→ Exists'}: {lab.title}")

            for sprint_data in lab_data.get("sprints", []):
                sprint, created = LabSprint.objects.update_or_create(
                    lab=lab,
                    title=sprint_data["title"],
                    defaults={
                        "description": sprint_data.get("description", ""),
                        "order_index": sprint_data.get("order_index", 0),
                        "created_by": admin_user,
                    },
                )

                for ticket_data in sprint_data.get("tickets", []):
                    LabSprintTicket.objects.update_or_create(
                        sprint=sprint,
                        ticket_slug=ticket_data["ticket_slug"],
                        defaults={
                            "title": ticket_data["title"],
                            "description": ticket_data.get("description", ""),
                            "difficulty": ticket_data.get("difficulty", "MEDIUM"),
                            "learning_objectives": ticket_data.get("learning_objectives", []),
                            "tasks": ticket_data.get("tasks", []),
                            "common_mistakes": ticket_data.get("common_mistakes", []),
                            "hints": ticket_data.get("hints", []),
                            "scoring_rules": ticket_data.get("scoring_rules", {}),
                            "solution": ticket_data.get("solution", {}),
                            "test_command": ticket_data.get("test_command", ""),
                            "yuvro_points": ticket_data.get("yuvro_points", 5),
                            "minutes_max": ticket_data.get("minutes_max", 30),
                            "accepted_programming_languages": ticket_data.get("accepted_programming_languages", []),
                            "order_index": ticket_data.get("order_index", 0),
                            "created_by": admin_user,
                        },
                    )

            self.stdout.write(f"✓ Loaded lab fully: {lab.title}")
import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from ai_interview_planner.models import PlannerCompany, PlannerRole, PlannerTopic, PrepTimeline, StudyTime

User = get_user_model()

class Command(BaseCommand):
    help = "Load mock data for AI Interview Planner"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing planner data before loading",
        )
        parser.add_argument(
            "--deploy_env",
            type=str,
            default="dev",
            help="Environment (default: dev)",
        )

    def handle(self, *args, **options):
        self.stdout.write("🤖 Loading AI Interview Planner mock data...")

        if options["clear"]:
            self.stdout.write("🗑️  Clearing existing planner data...")
            PlannerTopic.objects.all().delete()
            PlannerRole.objects.all().delete()
            PlannerCompany.objects.all().delete()
            PrepTimeline.objects.all().delete()
            StudyTime.objects.all().delete()

        # Get a superuser for created_by
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            self.stdout.write(self.style.ERROR("❌ No superuser found to assign as creator."))
            return

        # Seed configuration defaults
        self.stdout.write("⚙️  Seeding roadmap configurations...")
        for days in [30, 45, 60, 90]:
            PrepTimeline.objects.get_or_create(days=days, defaults={"created_by": admin_user})
        
        for hours in [2, 4, 6, 8]:
            StudyTime.objects.get_or_create(hours=hours, defaults={"created_by": admin_user})

        # Path to mock data
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        fixtures_path = os.path.join(base_dir, "fixtures", "mock_planner_data.json")

        if not os.path.exists(fixtures_path):
            self.stdout.write(self.style.ERROR(f"❌ Mock data file not found at {fixtures_path}"))
            return

        with open(fixtures_path, "r") as f:
            data = json.load(f)

        # Load Companies
        companies = {}
        for comp_data in data.get("companies", []):
            company, _ = PlannerCompany.objects.get_or_create(
                name=comp_data["name"],
                defaults={
                    "description": comp_data["description"],
                    "website": comp_data["website"],
                    "created_by": admin_user
                }
            )
            companies[comp_data["name"]] = company

        # Load Roles for each company
        for company_name, target_company in companies.items():
            for role_data in data.get("roles", []):
                PlannerRole.objects.get_or_create(
                    title=role_data["title"],
                    company=target_company,
                    defaults={
                        "difficulty": role_data["difficulty"],
                        "required_skills": role_data["required_skills"],
                        "created_by": admin_user
                    }
                )

        # Load Topics
        for topic_data in data.get("topics", []):
            category = topic_data["category"]
            if category == "Core":
                category = "Core Subjects"
                
            PlannerTopic.objects.get_or_create(
                name=topic_data["name"],
                defaults={
                    "category": category,
                    "difficulty": topic_data["difficulty"],
                    "question_count": topic_data["question_count"],
                    "created_by": admin_user
                }
            )

        self.stdout.write(self.style.SUCCESS("✅ AI Interview Planner mock data loaded successfully!"))

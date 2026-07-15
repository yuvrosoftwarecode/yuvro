import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from skill_evaluation.models import (
    AssessmentQuestionBank,
    LabQuestionBank,
    LabQuestionBankTask,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Load skill evaluation questions from fixtures/<env>/*.json"

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
            self.stdout.write("Clearing existing skill evaluation data...")
            LabQuestionBankTask.objects.all().delete()
            LabQuestionBank.objects.all().delete()
            AssessmentQuestionBank.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing skill evaluation data cleared."))

        fixtures_dir = Path(os.path.dirname(__file__)) / "../../fixtures" / deploy_env
        
        self.stdout.write(f"\nProcessing: {fixtures_dir}/assessment_questions.json")
        aq_file = fixtures_dir / "assessment_questions.json"
        if aq_file.exists():
            data = self._load_json(aq_file)
            if data:
                self._load_assessment_questions(data)
        else:
            self.stdout.write(self.style.WARNING(f"File not found: {aq_file}"))

        self.stdout.write(f"\nProcessing: {fixtures_dir}/lab_questions.json")
        lq_file = fixtures_dir / "lab_questions.json"
        if lq_file.exists():
            data = self._load_json(lq_file)
            if data:
                self._load_lab_questions(data)
        else:
            self.stdout.write(self.style.WARNING(f"File not found: {lq_file}"))

        self.stdout.write(self.style.SUCCESS("\n✅ All skill evaluation questions loaded successfully!"))

    def _load_json(self, filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error reading {filepath}: {e}"))
        return None

    def _get_admin_user(self):
        admin_user = User.objects.filter(role__in=["admin", "instructor"]).first()
        if not admin_user:
            admin_user, _ = User.objects.get_or_create(
                username="lab-system-admin",
                defaults={
                    "email": "lab-system-admin@yuvro.com",
                    "role": "admin",
                    "is_staff": True,
                    "is_superuser": True
                }
            )
        return admin_user

    def _load_assessment_questions(self, data):
        admin_user = self._get_admin_user()
        for q_data in data.get("assessment_questions", []):
            self.stdout.write(f'Loading Assessment Question: {q_data["title"]}')
            q, created = AssessmentQuestionBank.objects.update_or_create(
                title=q_data["title"],
                defaults={
                    "description": q_data.get("description", ""),
                    "difficulty": q_data.get("difficulty", "EASY"),
                    "domain": q_data.get("domain", "OTHER"),
                    "experience": q_data.get("experience", "FRESHER"),
                    "duration_minutes": q_data.get("duration_minutes", 30),
                    "marks": q_data.get("marks", 10),
                    "format": q_data.get("format", "MCQ"),
                    "programming_languages": q_data.get("programming_languages", []),
                    "databases": q_data.get("databases", []),
                    "backend_frameworks": q_data.get("backend_frameworks", []),
                    "frontend_frameworks": q_data.get("frontend_frameworks", []),
                    "created_by": admin_user,
                },
            )

    def _load_lab_questions(self, data):
        admin_user = self._get_admin_user()
        for q_data in data.get("lab_questions", []):
            self.stdout.write(f'Loading Lab Question: {q_data["title"]}')
            q, created = LabQuestionBank.objects.update_or_create(
                title=q_data["title"],
                defaults={
                    "description": q_data.get("description", ""),
                    "difficulty": q_data.get("difficulty", "MEDIUM"),
                    "domain": q_data.get("domain", "OTHER"),
                    "experience": q_data.get("experience", "FRESHER"),
                    "duration_minutes": q_data.get("duration_minutes", 60),
                    "marks": q_data.get("marks", 50),
                    "scenario": q_data.get("scenario", "FEATURE_DEVELOPMENT"),
                    "git_repo_starter_url": q_data.get("git_repo_starter_url", ""),
                    "programming_languages": q_data.get("programming_languages", []),
                    "databases": q_data.get("databases", []),
                    "backend_frameworks": q_data.get("backend_frameworks", []),
                    "frontend_frameworks": q_data.get("frontend_frameworks", []),
                    "created_by": admin_user,
                },
            )

            for task_data in q_data.get("tasks", []):
                LabQuestionBankTask.objects.update_or_create(
                    lab_question_bank=q,
                    title=task_data["title"],
                    defaults={
                        "description": task_data.get("description", ""),
                        "difficulty": task_data.get("difficulty", "MEDIUM"),
                        "marks": task_data.get("marks", 5),
                        "duration_minutes": task_data.get("duration_minutes", 30),
                        "order_index": task_data.get("order_index", 0),
                        "created_by": admin_user,
                    }
                )

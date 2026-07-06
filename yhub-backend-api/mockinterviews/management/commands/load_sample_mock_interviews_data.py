import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from mockinterviews.models import MockInterview, PredefinedInterviewQuestion

User = get_user_model()


class Command(BaseCommand):
    help = "Load sample mock interviews data from JSON file"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing mock interview data before loading new data",
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
            default="sample_mock_interviews_data.json",
            help="Name of the specific mock interviews JSON file to load",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing mock interview data...")
            MockInterview.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing mock interview data cleared."))

        here = Path(__file__).resolve()
        fixtures_dir = here.parents[2] / "fixtures" / options["deploy_env"]
        file_name = options.get("file")
        primary_file = fixtures_dir / file_name

        def _load_json(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Error reading JSON from {path}: {e}"))
                return None

        self.stdout.write(f"Attempting to load data from {primary_file}")
        data = _load_json(primary_file)

        if not data:
            self.stderr.write(self.style.ERROR("No data loaded. Aborting."))
            return

        default_user = User.objects.filter(is_superuser=True).first()
        if not default_user:
            default_user = User.objects.first()
        
        if not default_user:
            self.stderr.write(self.style.ERROR("No users found in database to assign as created_by. Please create a user first."))
            return

        mock_interviews_data = data.get("mock_interviews", [])
        
        if not mock_interviews_data:
            self.stdout.write(self.style.WARNING("No mock interviews found in the JSON file."))
            return

        self.stdout.write(f"Found {len(mock_interviews_data)} mock interviews to load.")

        for mock_interview_data in mock_interviews_data:
            mock_interview_kwargs = {
                "title": mock_interview_data["title"],
                "description": mock_interview_data.get("description", ""),
                "instructions": mock_interview_data.get("instructions", ""),
                "max_duration": mock_interview_data.get(
                    "max_duration", mock_interview_data.get("duration", 45)
                ),
                "required_skills": mock_interview_data.get("required_skills", []),
                "optional_skills": mock_interview_data.get("optional_skills", []),
                "publish_status": mock_interview_data.get(
                    "publish_status", "draft"
                ),
                "created_by": default_user,
            }

            mock_interview, mock_interview_created = MockInterview.objects.update_or_create(
                title=mock_interview_kwargs["title"],
                defaults=mock_interview_kwargs
            )

            if mock_interview_created:
                self.stdout.write(f'✓ Created mock interview: {mock_interview.title}')
            else:
                self.stdout.write(f'→ Mock interview exists (synced): {mock_interview.title}')

            tree_data = mock_interview_data.get("predefined_tree")
            if tree_data and isinstance(tree_data, list):
                PredefinedInterviewQuestion.objects.filter(mock_interview=mock_interview).delete()
                
                def _load_node(node_data, parent=None, level=1):
                    q_obj = PredefinedInterviewQuestion.objects.create(
                        mock_interview=mock_interview,
                        text=node_data["text"],
                        parent=parent,
                        level=level,
                        created_by=default_user
                    )
                    for f_data in node_data.get("follow_ups", []):
                        _load_node(f_data, parent=q_obj, level=level + 1)
                
                for root_data in tree_data:
                    _load_node(root_data)
                
                self.stdout.write(f'  ✓ Loaded predefined questions for: {mock_interview.title}')

        self.stdout.write(self.style.SUCCESS("Successfully loaded mock interviews data."))

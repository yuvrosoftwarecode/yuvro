import json
import os
import random
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from assessment.models import SkillTest, Contest, MockInterview, JobTest, CertificationExam, PredefinedInterviewQuestion
from course.models import Course, Topic, Question
try:
    from ai_assistant.models import AIAgent
except ImportError:
    AIAgent = None

User = get_user_model()


class Command(BaseCommand):
    help = "Load comprehensive sample assessment tests from JSON file"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing assessment data before loading new data",
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
            default="sample_assessment_skill_tests_data.json",
            help="Name of the specific skill tests JSON file to load",
        )
        parser.add_argument(
            "--fallback",
            type=str,
            help="Name of a fallback skill tests JSON file to load if the main file fails",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing assessment data...")
            MockInterview.objects.all().delete()
            Contest.objects.all().delete()
            SkillTest.objects.all().delete()
            CertificationExam.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing assessment data cleared."))

        # Determine fixtures directory based on deploy_env
        here = Path(__file__).resolve()
        fixtures_dir = here.parents[2] / "fixtures" / options["deploy_env"]

        # Ensure at least one AI agent exists for mock interviews (required for ChatSession)
        if AIAgent is not None:
            if not AIAgent.objects.exists():
                self.stdout.write("No AI agents found. Creating default Gemini agent for local testing...")
                AIAgent.objects.create(
                    name="Gemini Pro (Default)",
                    provider="gemini",
                    model_name="gemini-1.5-pro",
                    description="Default agent created for local testing",
                    is_active=True
                )
        else:
            self.stdout.write(self.style.WARNING("ai_assistant module not available, skipping AIAgent setup."))

        skill_file_name = options.get("file")
        primary_skill_file = fixtures_dir / skill_file_name
        fallback_trigger = False

        def _load_json(path):
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except FileNotFoundError:
                self.stdout.write(self.style.WARNING(f"JSON file not found at: {path}"))
                return {}
            except json.JSONDecodeError as e:
                self.stdout.write(self.style.ERROR(f"Invalid JSON format in {path}: {e}"))
                return {}
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error reading JSON from {path}: {e}"))
                return {}

        # Note: Skill tests are now auto-generated in load_courses.py
        # We bypass loading them from a hardcoded JSON file.

        # Below we still load the original contests and mocks
        contests_file = fixtures_dir / "sample_assessment_contests_data.json"
        mock_file = fixtures_dir / "sample_assessment_mock_interviews_data.json"

        contests_data = _load_json(contests_file)
        if contests_data:
            self.load_contests_from_json(contests_data)

        # Load mock interviews
        mock_data = _load_json(mock_file)
        if mock_data:
            self.load_mock_interviews_from_json(mock_data)

        self.stdout.write(
            self.style.SUCCESS(
                "\nSuccessfully completed sample assessment test loading!"
            )
        )

    def get_or_create_default_user(self):
        """Get or create a default user for creating assessments"""
        # Try to get an admin user first
        admin_user = User.objects.filter(role="admin").first()
        if admin_user:
            return admin_user

        # Try to get any superuser
        superuser = User.objects.filter(is_superuser=True).first()
        if superuser:
            return superuser

        # Try to get any staff user
        staff_user = User.objects.filter(is_staff=True).first()
        if staff_user:
            return staff_user

        # Create a default admin user if none exists
        default_user, created = User.objects.get_or_create(
            email="admin@yuvro.com",
            defaults={
                "username": "admin",
                "first_name": "System",
                "last_name": "Admin",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )

        if created:
            default_user.set_password("admin123")
            default_user.save()
            self.stdout.write(f"✓ Created default admin user: {default_user.email}")

        return default_user

    def _select_questions(
        self, qtype, count, category, course_obj=None, topic_obj=None
    ):
        """Select up to `count` question UUIDs matching the filters."""
        qs = Question.objects.filter(type=qtype)
        if category:
            qs = qs.filter(categories__contains=[category])
        if topic_obj:
            qs = qs.filter(topic=topic_obj)
        elif course_obj:
            qs = qs.filter(course=course_obj)

        qs = qs.order_by("created_at")
        ids = list(qs.values_list("id", flat=True)[:count])
        if len(ids) < count:
            # relax filters: ignore topic/course restrictions and pick any remaining
            fallback = Question.objects.filter(type=qtype)
            if category:
                fallback = fallback.filter(categories__contains=[category])
            fallback = fallback.exclude(id__in=ids).order_by("created_at")
            extra = list(fallback.values_list("id", flat=True)[: (count - len(ids))])
            ids.extend(extra)

        return [str(i) for i in ids]

    def get_course_and_topic(self, course_short_code, topic_name=None):
        """Get course and topic objects"""
        try:
            course = Course.objects.get(short_code=course_short_code)
        except Course.DoesNotExist:
            self.stdout.write(
                self.style.WARNING(f"Course {course_short_code} not found")
            )
            return None, None

        topic = None
        if topic_name:
            try:
                topic = Topic.objects.get(course=course, name=topic_name)
            except Topic.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(
                        f"Topic {topic_name} not found in course {course_short_code}"
                    )
                )

        return course, topic

    def load_skill_tests_from_json(self, data):
        """Load skill tests from JSON data"""
        default_user = self.get_or_create_default_user()

        skill_tests = data.get("skill_tests", [])
        if not skill_tests:
            self.stdout.write(self.style.WARNING("No skill tests found in data"))
            return

        self.stdout.write(f"Found {len(skill_tests)} skill tests to load")

        for skill_test_data in skill_tests:
            try:
                self.stdout.write(f'Loading skill test: {skill_test_data["title"]}')

                course, topic = self.get_course_and_topic(
                    skill_test_data.get("course_short_code"),
                    skill_test_data.get("topic_name"),
                )

                if not course:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Skipping skill test '{skill_test_data.get('title')}' - course not found"
                        )
                    )
                    continue

                skill_test_kwargs = {
                    "title": skill_test_data["title"],
                    "description": skill_test_data.get("description", ""),
                    "instructions": skill_test_data.get("instructions", ""),
                    "difficulty": skill_test_data.get("difficulty", "medium"),
                    "duration": skill_test_data.get("duration", 60),
                    "total_marks": skill_test_data.get("total_marks", 100),
                    "passing_marks": skill_test_data.get("passing_marks", 60),
                    "enable_proctoring": skill_test_data.get(
                        "enable_proctoring", False
                    ),
                    "course": course,
                    "topic": topic,
                    "questions_random_config": skill_test_data.get(
                        "questions_random_config", {}
                    ),
                    "publish_status": skill_test_data.get("publish_status", "draft"),
                    "created_by": default_user,
                }

                # Build questions_config from questions_random_config when not provided
                q_config = skill_test_data.get("questions_config") or {}
                q_random = skill_test_data.get("questions_random_config") or {}
                for qtype in ["mcq_single", "mcq_multiple", "coding", "descriptive"]:
                    if qtype not in q_config:
                        count = int(q_random.get(qtype, 0))
                        q_config[qtype] = (
                            self._select_questions(
                                qtype, count, "skill_test", course, topic
                            )
                            if count > 0
                            else []
                        )

                skill_test_kwargs["questions_config"] = q_config

                # Sync skill test (always update if exists)
                skill_test, skill_test_created = SkillTest.objects.update_or_create(
                    title=skill_test_kwargs["title"],
                    course=course,
                    defaults=skill_test_kwargs
                )

                if skill_test_created:
                    self.stdout.write(f'✓ Created skill test: {skill_test.title}')
                else:
                    self.stdout.write(f'→ Skill test exists (synced): {skill_test.title}')

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error loading skill test "{skill_test_data.get("title", "Unknown")}": {str(e)}'
                    )
                )

    def load_contests_from_json(self, data):
        """Load contests from JSON data"""
        default_user = self.get_or_create_default_user()

        contests = data.get("contests", [])
        if not contests:
            self.stdout.write(self.style.WARNING("No contests found in data"))
            return

        self.stdout.write(f"Found {len(contests)} contests to load")

        for contest_data in contests:
            try:
                self.stdout.write(f'Loading contest: {contest_data["title"]}')

                course, topic = self.get_course_and_topic(
                    contest_data.get("course_short_code"),
                    contest_data.get("topic_name"),
                )

                if not course:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Skipping contest '{contest_data.get('title')}' - course not found"
                        )
                    )
                    continue

                # Calculate start and end times
                start_days = contest_data.get("start_days_from_now", 7)
                start_datetime = timezone.now() + timedelta(days=start_days)
                end_datetime = start_datetime + timedelta(
                    minutes=contest_data.get("duration", 180)
                )

                contest_kwargs = {
                    "title": contest_data["title"],
                    "description": contest_data.get("description", ""),
                    "instructions": contest_data.get("instructions", ""),
                    "difficulty": contest_data.get("difficulty", "medium"),
                    "duration": contest_data.get("duration", 180),
                    "total_marks": contest_data.get("total_marks", 100),
                    "passing_marks": contest_data.get("passing_marks", 60),
                    "enable_proctoring": contest_data.get("enable_proctoring", False),
                    "organizer": contest_data.get("organizer", "Unknown"),
                    "type": contest_data.get("type", Contest.TYPE_COMPANY),
                    "start_datetime": start_datetime,
                    "end_datetime": end_datetime,
                    "prize": contest_data.get("prize", ""),
                    "questions_random_config": contest_data.get(
                        "questions_random_config", {}
                    ),
                    "publish_status": contest_data.get("publish_status", "draft"),
                    "created_by": default_user,
                }

                # Build and attach questions_config
                q_config = contest_data.get("questions_config") or {}
                q_random = contest_data.get("questions_random_config") or {}
                for qtype in ["mcq_single", "mcq_multiple", "coding", "descriptive"]:
                    if qtype not in q_config:
                        count = int(q_random.get(qtype, 0))
                        q_config[qtype] = (
                            self._select_questions(
                                qtype, count, "contest", course, None
                            )
                            if count > 0
                            else []
                        )

                contest_kwargs["questions_config"] = q_config

                # Sync contest (always update if exists)
                contest, contest_created = Contest.objects.update_or_create(
                    title=contest_kwargs["title"],
                    organizer=contest_kwargs["organizer"],
                    defaults=contest_kwargs
                )

                if contest_created:
                    self.stdout.write(f'✓ Created contest: {contest.title}')
                else:
                    self.stdout.write(f'→ Contest exists (synced): {contest.title}')

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error loading contest "{contest_data.get("title", "Unknown")}": {str(e)}'
                    )
                )

    def load_mock_interviews_from_json(self, data):
        """Load mock interviews from JSON data"""
        default_user = self.get_or_create_default_user()

        mock_interviews = data.get("mock_interviews", [])
        if not mock_interviews:
            self.stdout.write(self.style.WARNING("No mock interviews found in data"))
            return

        self.stdout.write(f"Found {len(mock_interviews)} mock interviews to load")

        for mock_interview_data in mock_interviews:
            try:
                self.stdout.write(
                    f'Loading mock interview: {mock_interview_data["title"]}'
                )

                # Attempt to resolve course/topic if provided; if not found, proceed without linking
                course = None
                topic = None
                course_code = mock_interview_data.get("course_short_code")
                if course_code:
                    course = Course.objects.filter(short_code=course_code).first()
                topic_name = mock_interview_data.get("topic_name")
                if topic_name and course:
                    topic = Topic.objects.filter(course=course, name=topic_name).first()

                mock_interview_kwargs = {
                    "title": mock_interview_data["title"],
                    "description": mock_interview_data.get("description", ""),
                    "instructions": mock_interview_data.get("instructions", ""),
                    "max_duration": mock_interview_data.get(
                        "max_duration", mock_interview_data.get("duration", 45)
                    ),
                    # Skills configuration
                    "required_skills": mock_interview_data.get("required_skills", []),
                    "optional_skills": mock_interview_data.get("optional_skills", []),
                    "publish_status": mock_interview_data.get(
                        "publish_status", "draft"
                    ),
                    "created_by": default_user,
                }

                # Sync mock interview (always update if exists)
                mock_interview, mock_interview_created = MockInterview.objects.update_or_create(
                    title=mock_interview_kwargs["title"],
                    defaults=mock_interview_kwargs
                )

                if mock_interview_created:
                    self.stdout.write(f'✓ Created mock interview: {mock_interview.title}')
                else:
                    self.stdout.write(f'→ Mock interview exists (synced): {mock_interview.title}')

                # --- NEW: Load Predefined Question Tree if present ---
                tree_data = mock_interview_data.get("predefined_tree")
                if tree_data and isinstance(tree_data, list):
                    # Clear existing to avoid duplicates on re-seed
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
                    
                    self.stdout.write(f'  ↳ Loaded {len(tree_data)} main questions and their follow-up trees')

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error loading mock interview "{mock_interview_data.get("title", "Unknown")}": {str(e)}'
                    )
                )

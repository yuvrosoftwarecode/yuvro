import json
import os
import random
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from assessment.models import SkillTest, Contest, MockInterview, JobTest
from course.models import Course, Topic, Question

User = get_user_model()


class Command(BaseCommand):
    help = "Load comprehensive sample assessment tests from JSON file"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing assessment data before loading new data",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing assessment data...")
            JobTest.objects.all().delete()
            MockInterview.objects.all().delete()
            Contest.objects.all().delete()
            SkillTest.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing assessment data cleared."))

        # Determine fixtures directory (assessment/fixtures)
        here = Path(__file__).resolve()
        fixtures_dir = here.parents[2] / "fixtures"

        skill_file = fixtures_dir / "sample_assessment_skill_tests_data.json"
        contests_file = fixtures_dir / "sample_assessment_contests_data.json"
        mock_file = fixtures_dir / "sample_assessment_mock_interviews_data.json"

        def _load_json(path):
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except FileNotFoundError:
                self.stdout.write(self.style.WARNING(f"JSON file not found at: {path}"))
                return {}
            except json.JSONDecodeError as e:
                self.stdout.write(
                    self.style.ERROR(f"Invalid JSON format in {path}: {e}")
                )
                return {}

        self.stdout.write("Loading sample assessment tests from fixtures...")

        # Load skill tests from skill tests file
        skill_data = _load_json(skill_file)
        if skill_data:
            self.load_skill_tests_from_json(skill_data)

        # Load contests from dedicated contests file
        contests_data = _load_json(contests_file)
        if contests_data:
            self.load_contests_from_json(contests_data)

        # Load mock interviews
        mock_data = _load_json(mock_file)
        if mock_data:
            self.load_mock_interviews_from_json(mock_data)

        self.stdout.write(
            self.style.SUCCESS(
                "Successfully loaded all sample assessment tests from JSON!"
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

                # Check if skill test already exists
                existing_skill_test = SkillTest.objects.filter(
                    title=skill_test_kwargs["title"], course=course
                ).first()

                if not existing_skill_test:
                    SkillTest.objects.create(**skill_test_kwargs)
                    self.stdout.write(
                        f'✓ Created skill test: {skill_test_data["title"]}'
                    )
                else:
                    # Update questions_config if empty
                    if not existing_skill_test.questions_config:
                        existing_skill_test.questions_config = skill_test_kwargs[
                            "questions_config"
                        ]
                        existing_skill_test.save()
                        self.stdout.write(
                            f'↻ Updated questions_config for existing skill test: {skill_test_data["title"]}'
                        )
                    else:
                        self.stdout.write(
                            f'→ Skill test already exists: {skill_test_data["title"]}'
                        )

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

                # Check if contest already exists
                existing_contest = Contest.objects.filter(
                    title=contest_kwargs["title"], organizer=contest_kwargs["organizer"]
                ).first()

                if not existing_contest:
                    Contest.objects.create(**contest_kwargs)
                    self.stdout.write(f'✓ Created contest: {contest_data["title"]}')
                else:
                    if not existing_contest.questions_config:
                        existing_contest.questions_config = contest_kwargs[
                            "questions_config"
                        ]
                        existing_contest.save()
                        self.stdout.write(
                            f'↻ Updated questions_config for existing contest: {contest_data["title"]}'
                        )
                    else:
                        self.stdout.write(
                            f'→ Contest already exists: {contest_data["title"]}'
                        )

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
                    # AI / Voice configuration
                    "ai_generation_mode": mock_interview_data.get(
                        "ai_generation_mode", "full_ai"
                    ),
                    "ai_verbal_question_count": mock_interview_data.get(
                        "ai_verbal_question_count", 5
                    ),
                    "ai_coding_question_count": mock_interview_data.get(
                        "ai_coding_question_count", 1
                    ),
                    "ai_percentage": mock_interview_data.get("ai_percentage", 100),
                    # Voice configuration
                    "voice_type": mock_interview_data.get("voice_type", "junnu"),
                    "interviewer_name": mock_interview_data.get(
                        "interviewer_name", "Junnu"
                    ),
                    "interviewer_voice_id": mock_interview_data.get(
                        "interviewer_voice_id", ""
                    ),
                    "voice_speed": mock_interview_data.get("voice_speed", 1.0),
                    "audio_settings": mock_interview_data.get("audio_settings", {}),
                    "questions_random_config": mock_interview_data.get(
                        "questions_random_config", {}
                    ),
                    "publish_status": mock_interview_data.get(
                        "publish_status", "draft"
                    ),
                    "created_by": default_user,
                }

                # Build questions_config
                q_config = mock_interview_data.get("questions_config") or {}
                q_random = mock_interview_data.get("questions_random_config") or {}
                for qtype in ["mcq_single", "mcq_multiple", "coding", "descriptive"]:
                    if qtype not in q_config:
                        count = int(q_random.get(qtype, 0))
                        q_config[qtype] = (
                            self._select_questions(
                                qtype, count, "mock_interview", course, topic
                            )
                            if count > 0
                            else []
                        )

                mock_interview_kwargs["questions_config"] = q_config

                # Check if mock interview already exists
                existing_mock_interview = MockInterview.objects.filter(
                    title=mock_interview_kwargs["title"]
                ).first()

                if not existing_mock_interview:
                    MockInterview.objects.create(**mock_interview_kwargs)
                    self.stdout.write(
                        f'✓ Created mock interview: {mock_interview_data["title"]}'
                    )
                else:
                    # Update existing mock interview with new data
                    for key, value in mock_interview_kwargs.items():
                        if key != "created_by":  # Don't update the creator
                            setattr(existing_mock_interview, key, value)
                    existing_mock_interview.save()
                    self.stdout.write(
                        f'↻ Updated existing mock interview: {mock_interview_data["title"]}'
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error loading mock interview "{mock_interview_data.get("title", "Unknown")}": {str(e)}'
                    )
                )

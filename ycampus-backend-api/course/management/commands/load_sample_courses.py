import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from Subject.models import Subject, Unit, SubUnit, Video, Question
from assessment.models import SkillTest, Contest

User = get_user_model()


class Command(BaseCommand):
    help = "Load comprehensive sample courses with topics, subtopics, videos, notes, and questions from JSON file"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before loading new data",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing data...")
            Question.objects.all().delete()
            Video.objects.all().delete()
            SubUnit.objects.all().delete()
            Unit.objects.all().delete()
            Subject.objects.all().delete()
            SkillTest.objects.all().delete()
            Contest.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing data cleared."))

        # Load instructors from test users data
        self.load_instructors()

        # Load data from JSON file
        json_file_path = os.path.join(
            os.path.dirname(__file__), "../../fixtures/sample_courses_data.json"
        )

        try:
            with open(json_file_path, "r", encoding="utf-8") as file:
                data = json.load(file)
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f"JSON file not found at: {json_file_path}")
            )
            return
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f"Invalid JSON format: {e}"))
            return

        self.stdout.write("Loading sample courses from JSON...")

        # Load courses and their content
        self.load_courses_from_json(data)

        # Load assessments
        self.load_assessments_from_json(data)

        self.stdout.write(
            self.style.SUCCESS("Successfully loaded all sample courses from JSON!")
        )

    def load_instructors(self):
        """Load instructors from test users data"""
        users_json_path = os.path.join(
            os.path.dirname(__file__),
            "../../../authentication/fixtures/test_users_data.json",
        )

        try:
            with open(users_json_path, "r", encoding="utf-8") as file:
                users_data = json.load(file)
        except FileNotFoundError:
            self.stdout.write(
                self.style.WARNING(
                    f"Test users JSON file not found at: {users_json_path}"
                )
            )
            return
        except json.JSONDecodeError as e:
            self.stdout.write(
                self.style.ERROR(f"Invalid JSON format in users file: {e}")
            )
            return

        for user_data in users_data.get("users", []):
            if user_data.get("role") in ["instructor", "admin"]:
                user, created = User.objects.get_or_create(
                    email=user_data["email"],
                    defaults={
                        "username": user_data["username"],
                        "first_name": user_data["first_name"],
                        "last_name": user_data["last_name"],
                        "role": user_data["role"],
                        "is_staff": user_data.get("is_staff", False),
                        "is_superuser": user_data.get("is_superuser", False),
                    },
                )
                if created:
                    user.set_password(user_data["password"])
                    user.save()
                    self.stdout.write(f'✓ Created {user_data["role"]}: {user.email}')

    def load_courses_from_json(self, data):
        """Load courses, topics, subtopics, videos, and questions from JSON data"""

        for course_data in data.get("courses", []):
            self.stdout.write(f'Loading Subject: {course_data["name"]}')

            # Get the instructor for this Subject
            instructor_email = course_data.get("instructor_email")
            instructor = None
            if instructor_email:
                try:
                    instructor = User.objects.get(email=instructor_email)
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Instructor {instructor_email} not found, skipping Subject assignment"
                        )
                    )

            # Get or create Subject
            Subject, created = Subject.objects.get_or_create(
                short_code=course_data["short_code"],
                defaults={
                    "name": course_data["name"],
                    "category": course_data["category"],
                },
            )

            if created:
                self.stdout.write(f"✓ Created new Subject: {Subject.name}")
            else:
                self.stdout.write(f"→ Subject already exists: {Subject.name}")

            # Add instructor if found and not already assigned
            if instructor and instructor not in Subject.instructors.all():
                Subject.instructors.add(instructor)
                self.stdout.write(
                    f"✓ Added instructor {instructor.email} to Subject {Subject.short_code}"
                )

            # Create topics and subtopics
            topic_map = {}  # To store Unit references for questions
            subtopic_map = {}  # To store SubUnit references for questions

            for topic_data in course_data.get("topics", []):
                Unit, topic_created = Unit.objects.get_or_create(
                    Subject=Subject,
                    name=topic_data["name"],
                    defaults={"order_index": topic_data["order_index"]},
                )
                topic_map[topic_data["name"]] = Unit

                if topic_created:
                    self.stdout.write(f"  ✓ Created Unit: {Unit.name}")

                # Create subtopics
                for subtopic_data in topic_data.get("subtopics", []):
                    SubUnit, subtopic_created = SubUnit.objects.get_or_create(
                        Unit=Unit,
                        name=subtopic_data["name"],
                        defaults={
                            "content": subtopic_data["content"],
                            "order_index": subtopic_data["order_index"],
                        },
                    )

                    # Store SubUnit reference with Unit name for lookup
                    subtopic_key = f"{topic_data['name']}::{subtopic_data['name']}"
                    subtopic_map[subtopic_key] = SubUnit

                    if subtopic_created:
                        self.stdout.write(f"    ✓ Created SubUnit: {SubUnit.name}")

                    # Create videos for SubUnit
                    for video_data in subtopic_data.get("videos", []):
                        video, video_created = Video.objects.get_or_create(
                            sub_topic=SubUnit,
                            title=video_data["title"],
                            defaults={
                                "video_link": video_data["video_link"],
                                "ai_context": video_data.get("ai_context", ""),
                            },
                        )

                        if video_created:
                            self.stdout.write(f"      ✓ Created video: {video.title}")

            # Create questions for the Subject
            if instructor:  # Only create questions if instructor exists
                for question_data in course_data.get("questions", []):
                    self.create_question(
                        question_data, Subject, topic_map, subtopic_map, instructor
                    )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"No instructor found for Subject {Subject.short_code}, skipping questions"
                    )
                )

            self.stdout.write(f"✓ Loaded Subject: {Subject.name}")

    def create_question(
        self, question_data, Subject, topic_map, subtopic_map, instructor
    ):
        """Create a question with proper associations"""

        # Fallback to admin if instructor is None
        if not instructor:
            instructor = User.objects.filter(role="admin").first()

        if not instructor:
            self.stdout.write(
                self.style.WARNING(
                    "No instructor or admin found, skipping question creation"
                )
            )
            return

        # Determine question associations based on level
        question_kwargs = {
            "type": question_data["type"],
            "title": question_data["title"],
            "content": question_data["content"],
            "level": question_data["level"],
            "difficulty": question_data["difficulty"],
            "marks": question_data["marks"],
            "categories": question_data["categories"],
            "created_by": instructor,
        }

        # Set Subject/Unit/SubUnit associations
        if question_data["level"] == "Subject":
            question_kwargs["Subject"] = Subject
        elif question_data["level"] == "Unit":
            topic_name = question_data.get("topic_name")
            if topic_name and topic_name in topic_map:
                question_kwargs["Unit"] = topic_map[topic_name]
                question_kwargs["Subject"] = Subject
        elif question_data["level"] == "SubUnit":
            topic_name = question_data.get("topic_name")
            subtopic_name = question_data.get("subtopic_name")

            if topic_name and subtopic_name:
                # Find Unit first
                if topic_name in topic_map:
                    Unit = topic_map[topic_name]
                    # Find SubUnit within the Unit
                    SubUnit = SubUnit.objects.filter(
                        Unit=Unit, name=subtopic_name
                    ).first()

                    if SubUnit:
                        question_kwargs["SubUnit"] = SubUnit
                        question_kwargs["Unit"] = Unit
                        question_kwargs["Subject"] = Subject
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'SubUnit "{subtopic_name}" not found in Unit "{topic_name}" for question "{question_data["title"]}"'
                            )
                        )
                        # Fallback to Unit level if SubUnit not found, but keep level as SubUnit causing validation error?
                        # Better to just link what we can or fail.
                        # For now, let's link Unit and Subject so it doesn't crash, but it might fail model validation if SubUnit is required.
                        question_kwargs["Unit"] = Unit
                        question_kwargs["Subject"] = Subject
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Unit not found: {topic_name}, skipping question"
                        )
                    )
                    return
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Missing topic_name or subtopic_name for SubUnit-level question: {question_data["title"][:50]}...'
                    )
                )
                return

        # Add type-specific fields
        if question_data["type"] in ["mcq_single", "mcq_multiple"]:
            question_kwargs["mcq_options"] = question_data.get("mcq_options", [])
        elif question_data["type"] == "coding":
            question_kwargs["test_cases_basic"] = question_data.get(
                "test_cases_basic", []
            )
            question_kwargs["test_cases_advanced"] = question_data.get(
                "test_cases_advanced", []
            )

        # Check if question already exists to avoid duplicates
        existing_question = Question.objects.filter(
            title=question_kwargs["title"],
            Subject=question_kwargs.get("Subject"),
            Unit=question_kwargs.get("Unit"),
        ).first()

        if not existing_question:
            Question.objects.create(**question_kwargs)
            self.stdout.write(
                f'    ✓ Created question: {question_data["title"][:50]}...'
            )
        else:
            self.stdout.write(
                f'    → Question already exists: {question_data["title"][:50]}...'
            )

    def load_assessments_from_json(self, data):
        """Load skill tests and contests from JSON data"""

        assessments_data = data.get("assessments", {})

        # Create Subject mapping for quick lookup
        course_map = {Subject.short_code: Subject for Subject in Subject.objects.all()}

        # Load skill tests
        for skill_test_data in assessments_data.get("skill_tests", []):
            course_short_code = skill_test_data.get("course_short_code")
            Subject = course_map.get(course_short_code)

            if Subject:
                # Get the Subject instructor as creator
                course_instructor = Subject.instructors.first()
                if not course_instructor:
                    # Fallback to admin user if no instructor found
                    course_instructor = User.objects.filter(role="admin").first()

                if course_instructor:
                    # Get questions for this Subject
                    course_questions = list(
                        Question.objects.filter(Subject=Subject).values_list(
                            "id", flat=True
                        )[:5]
                    )

                    skill_test, skill_test_created = SkillTest.objects.get_or_create(
                        title=skill_test_data["title"],
                        Subject=Subject,
                        defaults={
                            "description": skill_test_data["description"],
                            "instructions": skill_test_data["instructions"],
                            "difficulty": skill_test_data["difficulty"],
                            "duration": skill_test_data["duration"],
                            "total_marks": skill_test_data["total_marks"],
                            "passing_marks": skill_test_data["passing_marks"],
                            "questions_config": {
                                "mcq_single": [
                                    str(qid) for qid in course_questions[:2]
                                ],
                                "mcq_multiple": [
                                    str(qid) for qid in course_questions[2:4]
                                ],
                                "coding": [str(qid) for qid in course_questions[4:6]],
                                "descriptive": [
                                    str(qid) for qid in course_questions[6:8]
                                ],
                            },
                            "publish_status": skill_test_data["publish_status"],
                            "created_by": course_instructor,
                        },
                    )

                    if skill_test_created:
                        self.stdout.write(
                            f'✓ Created skill test: {skill_test_data["title"]}'
                        )
                    else:
                        self.stdout.write(
                            f'→ Skill test already exists: {skill_test_data["title"]}'
                        )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"No instructor found for Subject {course_short_code}, skipping skill test"
                        )
                    )

        # Load contests
        for contest_data in assessments_data.get("contests", []):
            course_short_code = contest_data.get("course_short_code")
            Subject = course_map.get(course_short_code)

            if Subject:
                # Get the Subject instructor as creator
                course_instructor = Subject.instructors.first()
                if not course_instructor:
                    # Fallback to admin user if no instructor found
                    course_instructor = User.objects.filter(role="admin").first()

                if course_instructor:
                    # Get coding questions for this Subject
                    coding_questions = list(
                        Question.objects.filter(
                            Subject=Subject, type="coding"
                        ).values_list("id", flat=True)[:3]
                    )

                    start_days = contest_data.get("start_days_from_now", 7)
                    start_datetime = timezone.now() + timedelta(days=start_days)
                    end_datetime = start_datetime + timedelta(
                        minutes=contest_data["duration"]
                    )

                    contest, contest_created = Contest.objects.get_or_create(
                        title=contest_data["title"],
                        defaults={
                            "description": contest_data["description"],
                            "instructions": contest_data["instructions"],
                            "difficulty": contest_data["difficulty"],
                            "duration": contest_data["duration"],
                            "total_marks": contest_data["total_marks"],
                            "passing_marks": contest_data["passing_marks"],
                            "questions_config": {
                                "mcq_single": [
                                    str(qid) for qid in coding_questions[:1]
                                ],
                                "mcq_multiple": [
                                    str(qid) for qid in coding_questions[1:2]
                                ],
                                "coding": [str(qid) for qid in coding_questions[2:4]],
                                "descriptive": [
                                    str(qid) for qid in coding_questions[4:5]
                                ],
                            },
                            "organizer": contest_data["organizer"],
                            "type": contest_data["type"],
                            "start_datetime": start_datetime,
                            "end_datetime": end_datetime,
                            "prize": contest_data.get("prize", ""),
                            "publish_status": contest_data["publish_status"],
                            "created_by": course_instructor,
                        },
                    )

                    if contest_created:
                        self.stdout.write(f'✓ Created contest: {contest_data["title"]}')
                    else:
                        self.stdout.write(
                            f'→ Contest already exists: {contest_data["title"]}'
                        )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"No instructor found for Subject {course_short_code}, skipping contest"
                        )
                    )


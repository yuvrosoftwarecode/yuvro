import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from course.models import Course, Topic, Subtopic, Video, Question, QuestionSolution
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
        parser.add_argument(
            "--file",
            type=str,
            default="sample_courses_data.json",
            help="Name of the specific JSON file to load (defaults to sample_courses_data.json)",
        )
        parser.add_argument(
            "--fallback",
            type=str,
            help="Name of a fallback JSON file to load if the main file fails parsing or database insertion",
        )
        parser.add_argument(
            "--dir",
            type=str,
            help="Directory name within fixtures to load multiple JSON files from (e.g., dsa_parts)",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing data...")
            Question.objects.all().delete()
            Video.objects.all().delete()
            Subtopic.objects.all().delete()
            Topic.objects.all().delete()
            Course.objects.all().delete()
            SkillTest.objects.all().delete()
            Contest.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing data cleared."))

        # Load instructors from test users data
        self.load_instructors()

        # Define the base fixtures directory
        fixtures_dir = Path(os.path.dirname(__file__)) / "../../fixtures"

        # Load data from JSON file(s)
        has_errors = False
        
        if options.get("dir"):
            dir_name = options["dir"]
            scan_dir = fixtures_dir / dir_name
            if not scan_dir.exists() or not scan_dir.is_dir():
                self.stdout.write(self.style.ERROR(f"Directory not found: {scan_dir}"))
                return
            
            # Get all JSON files sorted alphabetically
            json_files = sorted(scan_dir.glob("*.json"))
            if not json_files:
                self.stdout.write(self.style.WARNING(f"No JSON files found in {scan_dir}"))
                return
                
            for filepath in json_files:
                self.stdout.write(f"\nProcessing file: {filepath.name}")
                data = self._try_load_json(filepath)
                if data:
                    self.load_courses_from_json(data)
                    self.load_assessments_from_json(data)
                else:
                    self.stdout.write(self.style.WARNING(f"Failed to load data from {filepath.name}"))
                    has_errors = True
                    
        else:
            # Single file logic
            fixture_filename = options["file"]
            primary_file = fixtures_dir / "dev" / fixture_filename
            
            self.stdout.write(f"\nAttempting to load JSON from {primary_file}...")
            data = self._try_load_json(primary_file)
            
            if data:
                try:
                    self.load_courses_from_json(data)
                    self.load_assessments_from_json(data)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"\nFailed while loading from JSON: {str(e)}"))
                    has_errors = True
            else:
                has_errors = True

        if not has_errors:
            self.stdout.write(
                self.style.SUCCESS(
                    "\nSuccessfully loaded courses and assessments from JSON!"
                )
            )

    def _try_load_json(self, filepath):
        """Helper to load JSON data from a given filepath, handling errors."""
        try:
            with open(filepath, "r", encoding="utf-8") as file:
                data = json.load(file)
            return data
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f"JSON file not found at: {filepath}")
            )
            return None
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f"Invalid JSON format in {filepath}: {e}"))
            return None
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error reading JSON from {filepath}: {e}"))
            return None

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
            self.stdout.write(f'Loading course: {course_data["name"]}')

            # Get the instructor for this course
            instructor_email = course_data.get("instructor_email")
            instructor = None
            if instructor_email:
                try:
                    instructor = User.objects.get(email=instructor_email)
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Instructor {instructor_email} not found, skipping course assignment"
                        )
                    )

            # Get or create course
            course, created = Course.objects.get_or_create(
                short_code=course_data["short_code"],
                defaults={
                    "name": course_data["name"],
                    "category": course_data["category"],
                },
            )

            if created:
                self.stdout.write(f"✓ Created new course: {course.name}")
            else:
                self.stdout.write(f"→ Course already exists: {course.name}")

            # Add instructor if found and not already assigned
            if instructor and instructor not in course.instructors.all():
                course.instructors.add(instructor)
                self.stdout.write(
                    f"✓ Added instructor {instructor.email} to course {course.short_code}"
                )

            # Create topics and subtopics
            topic_map = {}  # To store topic references for questions
            subtopic_map = {}  # To store subtopic references for questions

            for topic_data in course_data.get("topics", []):
                topic_defaults = {}
                if "order_index" in topic_data:
                    topic_defaults["order_index"] = topic_data["order_index"]

                topic, topic_created = Topic.objects.update_or_create(
                    course=course,
                    name=topic_data["name"],
                    defaults=topic_defaults,
                )

                # Force the correct order_index via QuerySet.update() to bypass
                # Topic.save()'s conflict-shifting logic which can scramble indexes
                if "order_index" in topic_data:
                    Topic.objects.filter(pk=topic.pk).update(
                        order_index=topic_data["order_index"]
                    )
                    topic.refresh_from_db()

                topic_map[topic_data["name"]] = topic

                if topic_created:
                    self.stdout.write(f"  ✓ Created topic: {topic.name}")
                else:
                    self.stdout.write(f"  → Topic exists (synced): {topic.name}")

                # Create subtopics
                for subtopic_data in topic_data.get("subtopics", []):
                    subtopic, subtopic_created = Subtopic.objects.update_or_create(
                        topic=topic,
                        name=subtopic_data["name"],
                        defaults={
                            "content": subtopic_data["content"],
                            "order_index": subtopic_data["order_index"],
                        },
                    )

                    # Force correct order_index via QuerySet.update() to bypass save() conflicts
                    Subtopic.objects.filter(pk=subtopic.pk).update(
                        order_index=subtopic_data["order_index"]
                    )

                    # Store subtopic reference with topic name for lookup
                    subtopic_key = f"{topic_data['name']}::{subtopic_data['name']}"
                    subtopic_map[subtopic_key] = subtopic

                    if subtopic_created:
                        self.stdout.write(f"    ✓ Created subtopic: {subtopic.name}")
                    else:
                        self.stdout.write(f"    → Subtopic exists (synced): {subtopic.name}")

                    # Create videos for subtopic
                    for video_data in subtopic_data.get("videos", []):
                        video, video_created = Video.objects.get_or_create(
                            sub_topic=subtopic,
                            title=video_data["title"],
                            defaults={
                                "video_link": video_data["video_link"],
                                "ai_context": video_data.get("ai_context", ""),
                            },
                        )

                        if video_created:
                            self.stdout.write(f"      ✓ Created video: {video.title}")

            # Create questions for the course
            if instructor:  # Only create questions if instructor exists
                for question_data in course_data.get("questions", []):
                    self.create_question(
                        question_data, course, topic_map, subtopic_map, instructor
                    )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"No instructor found for course {course.short_code}, skipping questions"
                    )
                )

            self.stdout.write(f"✓ Loaded course: {course.name}")

    def create_question(
        self, question_data, course, topic_map, subtopic_map, instructor
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
            "hints": question_data.get("hints", []),
            "marks": question_data["marks"],
            "categories": question_data["categories"],
            "created_by": instructor,
        }

        # Set course/topic/subtopic associations
        if question_data["level"] == "course":
            question_kwargs["course"] = course
        elif question_data["level"] == "topic":
            topic_name = question_data.get("topic_name")
            if topic_name and topic_name in topic_map:
                question_kwargs["topic"] = topic_map[topic_name]
                question_kwargs["course"] = course
        elif question_data["level"] == "subtopic":
            topic_name = question_data.get("topic_name")
            subtopic_name = question_data.get("subtopic_name")

            if topic_name and subtopic_name:
                # Find topic first
                if topic_name in topic_map:
                    topic = topic_map[topic_name]
                    # Find subtopic within the topic
                    subtopic = Subtopic.objects.filter(
                        topic=topic, name=subtopic_name
                    ).first()

                    if subtopic:
                        question_kwargs["subtopic"] = subtopic
                        question_kwargs["topic"] = topic
                        question_kwargs["course"] = course
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f'Subtopic "{subtopic_name}" not found in topic "{topic_name}" for question "{question_data["title"]}"'
                            )
                        )
                        # Fallback to topic level if subtopic not found, but keep level as subtopic causing validation error?
                        # Better to just link what we can or fail.
                        # For now, let's link topic and course so it doesn't crash, but it might fail model validation if subtopic is required.
                        question_kwargs["topic"] = topic
                        question_kwargs["course"] = course
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Topic not found: {topic_name}, skipping question"
                        )
                    )
                    return
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Missing topic_name or subtopic_name for subtopic-level question: {question_data["title"][:50]}...'
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

        # Sync question (update if exists, create if not)
        q_obj, q_created = Question.objects.update_or_create(
            title=question_kwargs["title"],
            course=question_kwargs.get("course"),
            topic=question_kwargs.get("topic"),
            defaults=question_kwargs,
        )

        if q_created:
            self.stdout.write(
                f'    ✓ Created question: {question_data["title"][:50]}...'
            )
        else:
            self.stdout.write(
                f'    → Question exists (synced): {question_data["title"][:50]}...'
            )

        # Sync solutions if they exist
        if "solutions" in question_data:
            for sol_data in question_data["solutions"]:
                sol_obj, sol_created = QuestionSolution.objects.update_or_create(
                    question=q_obj,
                    title=sol_data.get("title", ""),
                    defaults={
                        "language": sol_data.get("language", "python"),
                        "code": sol_data.get("code", ""),
                        "complexity_analysis": sol_data.get("complexity_analysis", ""),
                        "is_primary": sol_data.get("is_primary", False),
                    },
                )
                status = "✓ Created" if sol_created else "→ Synced"
                self.stdout.write(
                    f'      {status} solution: {sol_data.get("title", "Untitled")}'
                )

    def load_assessments_from_json(self, data):
        """Load skill tests and contests from JSON data"""

        assessments_data = data.get("assessments", {})

        # Create course mapping for quick lookup
        course_map = {course.short_code: course for course in Course.objects.all()}

        # Load skill tests
        for skill_test_data in assessments_data.get("skill_tests", []):
            course_short_code = skill_test_data.get("course_short_code")
            course = course_map.get(course_short_code)

            if course:
                # Get the course instructor as creator
                course_instructor = course.instructors.first()
                if not course_instructor:
                    # Fallback to admin user if no instructor found
                    course_instructor = User.objects.filter(role="admin").first()

                if course_instructor:
                    # Get questions for this course
                    course_questions = list(
                        Question.objects.filter(course=course).values_list(
                            "id", flat=True
                        )[:5]
                    )

                    skill_test, skill_test_created = SkillTest.objects.get_or_create(
                        title=skill_test_data["title"],
                        course=course,
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
                            f"No instructor found for course {course_short_code}, skipping skill test"
                        )
                    )

        # Load contests
        for contest_data in assessments_data.get("contests", []):
            course_short_code = contest_data.get("course_short_code")
            course = course_map.get(course_short_code)

            if course:
                # Get the course instructor as creator
                course_instructor = course.instructors.first()
                if not course_instructor:
                    # Fallback to admin user if no instructor found
                    course_instructor = User.objects.filter(role="admin").first()

                if course_instructor:
                    # Get coding questions for this course
                    coding_questions = list(
                        Question.objects.filter(
                            course=course, type="coding"
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
                            f"No instructor found for course {course_short_code}, skipping contest"
                        )
                    )

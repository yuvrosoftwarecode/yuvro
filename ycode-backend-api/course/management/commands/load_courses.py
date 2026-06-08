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
    help = (
        "Load courses from fixtures/<env>/*/course.json + topics/*.json. "
        "Both dev and prod use the same split-file format."
    )

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
            self.stdout.write("Clearing existing course data...")
            Question.objects.all().delete()
            Video.objects.all().delete()
            Subtopic.objects.all().delete()
            Topic.objects.all().delete()
            Course.objects.all().delete()
            SkillTest.objects.all().delete()
            Contest.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing data cleared."))

        # Seed instructors so course assignments work
        self._load_instructors(deploy_env)

        fixtures_root = Path(os.path.dirname(__file__)) / "../../fixtures" / deploy_env
        if not fixtures_root.exists():
            self.stdout.write(self.style.ERROR(f"Fixtures directory not found: {fixtures_root}"))
            return

        has_errors = False
        course_dirs = sorted(d for d in fixtures_root.iterdir() if d.is_dir())

        if not course_dirs:
            self.stdout.write(self.style.WARNING(f"No course directories found in {fixtures_root}"))
            return

        for course_dir in course_dirs:
            course_file = course_dir / "course.json"
            if not course_file.exists():
                continue

            self.stdout.write(f"\nProcessing: {course_dir.name}/course.json")

            data = self._load_json(course_file)
            if not data:
                has_errors = True
                continue

            # Stitch topic files from topics/ subdir into each course config
            topics_dir = course_dir / "topics"
            if topics_dir.exists():
                topic_files = sorted(topics_dir.glob("*.json"))
                raw_topics = [self._load_json(f) for f in topic_files]
                raw_topics = [t for t in raw_topics if t]

                for course_config in data.get("courses", []):
                    course_code = course_config.get("short_code")
                    topics_for_course = []
                    questions_for_course = []

                    for t in raw_topics:
                        # Match by course_short_code if present, otherwise attach to first course
                        target = t.get("course_short_code")
                        if target and target != course_code:
                            continue

                        t_copy = dict(t)
                        questions_for_course.extend(t_copy.pop("questions", []))
                        topics_for_course.append(t_copy)

                    course_config["topics"] = topics_for_course
                    course_config.setdefault("questions", [])
                    course_config["questions"].extend(questions_for_course)

            try:
                self._load_courses(data)
                self._load_assessments(data)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed loading {course_file}: {e}"))
                has_errors = True

        if not has_errors:
            self.stdout.write(self.style.SUCCESS("\n✅ All courses loaded successfully!"))
        else:
            self.stdout.write(self.style.WARNING("\n⚠ Finished with some errors (see above)."))

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _load_json(self, filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"File not found: {filepath}"))
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f"Invalid JSON in {filepath}: {e}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error reading {filepath}: {e}"))
        return None

    def _load_instructors(self, deploy_env):
        """Ensure instructor/admin users exist before loading course data."""
        users_path = (
            Path(os.path.dirname(__file__))
            / f"../../../../authentication/fixtures/{deploy_env}/test_users_data.json"
        )
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
                self.stdout.write(f"✓ Created {u['role']}: {user.email}")

    # ── Course / Topic / Subtopic loading ─────────────────────────────────────

    def _load_courses(self, data):
        for course_data in data.get("courses", []):
            self.stdout.write(f'Loading course: {course_data["name"]}')

            instructor = None
            email = course_data.get("instructor_email")
            if email:
                instructor = User.objects.filter(email=email).first()
                if not instructor:
                    self.stdout.write(self.style.WARNING(f"Instructor {email} not found"))

            course, created = Course.objects.get_or_create(
                short_code=course_data["short_code"],
                defaults={
                    "name": course_data["name"],
                    "category": course_data["category"],
                },
            )
            self.stdout.write(f"  {'✓ Created' if created else '→ Exists'}: {course.name}")

            if instructor and instructor not in course.instructors.all():
                course.instructors.add(instructor)

            topic_map = {}
            subtopic_map = {}

            for topic_data in course_data.get("topics", []):
                topic, _ = Topic.objects.update_or_create(
                    course=course,
                    name=topic_data["name"],
                    defaults={"order_index": topic_data.get("order_index", 0)},
                )
                Topic.objects.filter(pk=topic.pk).update(
                    order_index=topic_data.get("order_index", 0)
                )
                topic.refresh_from_db()
                topic_map[topic_data["name"]] = topic

                for st_data in topic_data.get("subtopics", []):
                    subtopic, _ = Subtopic.objects.update_or_create(
                        topic=topic,
                        name=st_data["name"],
                        defaults={
                            "content": st_data["content"],
                            "order_index": st_data["order_index"],
                        },
                    )
                    Subtopic.objects.filter(pk=subtopic.pk).update(
                        order_index=st_data["order_index"]
                    )
                    subtopic_map[f"{topic_data['name']}::{st_data['name']}"] = subtopic

                    for video_data in st_data.get("videos", []):
                        Video.objects.get_or_create(
                            sub_topic=subtopic,
                            title=video_data["title"],
                            defaults={
                                "video_link": video_data["video_link"],
                                "ai_context": video_data.get("ai_context", ""),
                            },
                        )

            # Load questions — fall back to admin if no instructor
            creator = instructor or User.objects.filter(role="admin").first()
            if creator:
                for q_data in course_data.get("questions", []):
                    self._create_question(q_data, course, topic_map, subtopic_map, creator)
            else:
                self.stdout.write(self.style.WARNING(
                    f"No instructor/admin for {course.short_code}, skipping questions"
                ))

    def _create_question(self, q_data, course, topic_map, subtopic_map, creator,
                         default_topic_name=None):
        """Create a question. If topic/subtopic refs are missing, falls back to
        default_topic_name (the topic file's own name) at topic level."""
        MARKS = {
            "mcq_single":  {"easy": 1, "medium": 2, "hard": 3},
            "mcq_multiple": {"easy": 1, "medium": 2, "hard": 3},
            "coding":       {"easy": 5, "medium": 10, "hard": 15},
            "descriptive":  {"easy": 5, "medium": 10, "hard": 15},
        }
        DURATION = {
            "mcq_single":  {"easy": 1, "medium": 2, "hard": 3},
            "mcq_multiple": {"easy": 1, "medium": 2, "hard": 3},
            "coding":       {"easy": 10, "medium": 20, "hard": 30},
            "descriptive":  {"easy": 10, "medium": 20, "hard": 30},
        }

        q_type = q_data["type"]
        difficulty = q_data.get("difficulty", "easy")
        marks = (MARKS.get(q_type) or {"easy": 2, "medium": 5, "hard": 8}).get(difficulty, 1)
        duration = (DURATION.get(q_type) or {"easy": 5, "medium": 10, "hard": 15}).get(difficulty, 1)

        kwargs = {
            "type": q_type,
            "title": q_data["title"],
            "content": q_data["content"],
            "level": q_data["level"],
            "difficulty": difficulty,
            "hints": q_data.get("hints", []),
            "marks": marks,
            "duration": duration,
            "categories": q_data["categories"],
            "created_by": creator,
        }

        level = q_data["level"]
        topic_name = q_data.get("topic_name")
        subtopic_name = q_data.get("subtopic_name")

        if level == "course":
            kwargs["course"] = course

        elif level == "topic":
            if topic_name and topic_name in topic_map:
                kwargs["topic"] = topic_map[topic_name]
                kwargs["course"] = course
            else:
                self.stdout.write(self.style.WARNING(
                    f'Topic "{topic_name}" not found for question "{q_data["title"][:60]}" — skipping'
                ))
                return

        elif level == "subtopic":
            if not topic_name or not subtopic_name:
                self.stdout.write(self.style.WARNING(
                    f'Missing topic_name/subtopic_name for "{q_data["title"][:60]}" — skipping'
                ))
                return
            if topic_name not in topic_map:
                self.stdout.write(self.style.WARNING(
                    f'Topic "{topic_name}" not found for "{q_data["title"][:60]}" — skipping'
                ))
                return
            key = f"{topic_name}::{subtopic_name}"
            if key not in subtopic_map:
                self.stdout.write(self.style.WARNING(
                    f'Subtopic "{subtopic_name}" not found in topic "{topic_name}" '
                    f'for question "{q_data["title"][:60]}" — skipping'
                ))
                return
            kwargs["subtopic"] = subtopic_map[key]
            kwargs["topic"] = topic_map[topic_name]
            kwargs["course"] = course

        # Type-specific fields
        if q_type in ("mcq_single", "mcq_multiple"):
            kwargs["mcq_options"] = q_data.get("mcq_options", [])
        elif q_type == "coding":
            kwargs["test_cases_basic"] = q_data.get("test_cases_basic", [])
            kwargs["test_cases_advanced"] = q_data.get("test_cases_advanced", [])

        q_obj, created = Question.objects.update_or_create(
            title=kwargs["title"],
            course=kwargs.get("course"),
            topic=kwargs.get("topic"),
            defaults=kwargs,
        )
        self.stdout.write(f'    {"✓" if created else "→"} {"Created" if created else "Synced"}: {q_data["title"][:60]}')

        for sol in q_data.get("solutions", []):
            QuestionSolution.objects.update_or_create(
                question=q_obj,
                title=sol.get("title", ""),
                defaults={
                    "language": sol.get("language", "python"),
                    "code": sol.get("code", ""),
                    "complexity_analysis": sol.get("complexity_analysis", ""),
                    "is_primary": sol.get("is_primary", False),
                },
            )

    # ── Assessments ───────────────────────────────────────────────────────────

    def _load_assessments(self, data):
        course_map = {c.short_code: c for c in Course.objects.all()}
        assessments = data.get("assessments", {})

        for st_data in assessments.get("skill_tests", []):
            course = course_map.get(st_data.get("course_short_code"))
            if not course:
                continue
            creator = course.instructors.first() or User.objects.filter(role="admin").first()
            if not creator:
                continue
            question_ids = [
                str(q) for q in
                Question.objects.filter(course=course).values_list("id", flat=True)[:8]
            ]
            SkillTest.objects.get_or_create(
                title=st_data["title"],
                course=course,
                defaults={
                    "description": st_data["description"],
                    "instructions": st_data["instructions"],
                    "difficulty": st_data["difficulty"],
                    "duration": st_data["duration"],
                    "total_marks": st_data["total_marks"],
                    "passing_marks": st_data["passing_marks"],
                    "questions_config": {
                        "mcq_single": question_ids[:2],
                        "mcq_multiple": question_ids[2:4],
                        "coding": question_ids[4:6],
                        "descriptive": question_ids[6:8],
                    },
                    "publish_status": st_data["publish_status"],
                    "created_by": creator,
                },
            )

        for contest_data in assessments.get("contests", []):
            course = course_map.get(contest_data.get("course_short_code"))
            if not course:
                continue
            creator = course.instructors.first() or User.objects.filter(role="admin").first()
            if not creator:
                continue
            coding_ids = [
                str(q) for q in
                Question.objects.filter(course=course, type="coding").values_list("id", flat=True)[:4]
            ]
            start = timezone.now() + timedelta(days=contest_data.get("start_days_from_now", 7))
            Contest.objects.get_or_create(
                title=contest_data["title"],
                defaults={
                    "description": contest_data["description"],
                    "instructions": contest_data["instructions"],
                    "difficulty": contest_data["difficulty"],
                    "duration": contest_data["duration"],
                    "total_marks": contest_data["total_marks"],
                    "passing_marks": contest_data["passing_marks"],
                    "questions_config": {
                        "mcq_single": coding_ids[:1],
                        "mcq_multiple": coding_ids[1:2],
                        "coding": coding_ids[2:4],
                        "descriptive": [],
                    },
                    "organizer": contest_data["organizer"],
                    "type": contest_data["type"],
                    "start_datetime": start,
                    "end_datetime": start + timedelta(minutes=contest_data["duration"]),
                    "prize": contest_data.get("prize", ""),
                    "publish_status": contest_data["publish_status"],
                    "created_by": creator,
                },
            )

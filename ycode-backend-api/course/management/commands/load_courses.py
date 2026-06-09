import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from course.models import Course, Topic, Subtopic, Video, Question, QuestionSolution
from assessment.models import SkillTest, Contest, CertificationExam

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
            / f"../../../authentication/fixtures/{deploy_env}/test_users_data.json"
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

            questions_to_create = []
            questions_to_update = []
            solutions_to_create = []
            solutions_to_update = []
            
            existing_questions = {
                (q.title, q.course_id, q.topic_id): q 
                for q in Question.objects.filter(course=course)
            }
            existing_solutions = {
                (s.question_id, s.title): s
                for s in QuestionSolution.objects.filter(question__course=course)
            }

            certs_created = 0
            certs_synced = 0
            # Auto-generate 3 Certification Exams per Course
            creator = instructor or User.objects.filter(role="admin").first()
            if creator:
                c_c, c_s = self._auto_generate_skill_tests(
                    course=course,
                    topic=None,
                    creator=creator,
                    title_template="{course} - {difficulty} Certification Exam",
                    is_certification=True
                )
                certs_created += c_c
                certs_synced += c_s

            topic_map = {}
            subtopic_map = {}
            skill_tests_created = 0
            skill_tests_synced = 0

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
                
                # Auto-generate 3 Skill Tests per Topic
                if creator:
                    st_c, st_s = self._auto_generate_skill_tests(
                        course=course,
                        topic=topic,
                        creator=creator,
                        title_template="{topic} - {difficulty} Skill Test"
                    )
                    skill_tests_created += st_c
                    skill_tests_synced += st_s

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
                    self._create_question(q_data, course, topic_map, subtopic_map, creator, questions_to_create, questions_to_update, solutions_to_create, solutions_to_update, existing_questions, existing_solutions)
            else:
                self.stdout.write(self.style.WARNING(
                    f"No instructor/admin for {course.short_code}, skipping questions"
                ))

            if questions_to_create:
                Question.objects.bulk_create(questions_to_create, batch_size=500)
            if questions_to_update:
                update_fields = ["type", "content", "level", "difficulty", "marks", "duration", "categories", "hints", "created_by", "subtopic", "mcq_options", "test_cases_basic", "test_cases_advanced"]
                Question.objects.bulk_update(questions_to_update, update_fields, batch_size=500)
                
            if solutions_to_create:
                QuestionSolution.objects.bulk_create(solutions_to_create, batch_size=500)
            if solutions_to_update:
                update_fields = ["language", "code", "complexity_analysis", "is_primary"]
                QuestionSolution.objects.bulk_update(solutions_to_update, update_fields, batch_size=500)

            self.stdout.write(f"✓ Loaded course fully: {course.name} ({len(questions_to_create)} created, {len(questions_to_update)} synced questions)")
            self.stdout.write(f"  → Certifications: {certs_created} created, {certs_synced} synced")
            self.stdout.write(f"  → Skill Tests: {skill_tests_created} created, {skill_tests_synced} synced")

    def _create_question(self, q_data, course, topic_map, subtopic_map, creator, q_create, q_update, sol_create, sol_update, existing_q, existing_sol,
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

        q_key = (kwargs["title"], kwargs.get("course").id if kwargs.get("course") else None, kwargs.get("topic").id if kwargs.get("topic") else None)
        q_obj = existing_q.get(q_key)

        if q_obj:
            for k, v in kwargs.items():
                setattr(q_obj, k, v)
            q_update.append(q_obj)
        else:
            import uuid
            q_obj = Question(id=uuid.uuid4(), **kwargs)
            existing_q[q_key] = q_obj
            q_create.append(q_obj)

        for sol in q_data.get("solutions", []):
            sol_title = sol.get("title", "")
            sol_key = (q_obj.id, sol_title)
            sol_kwargs = {
                "language": sol.get("language", "python"),
                "code": sol.get("code", ""),
                "complexity_analysis": sol.get("complexity_analysis", ""),
                "is_primary": sol.get("is_primary", False),
            }
            
            s_obj = existing_sol.get(sol_key)
            if s_obj:
                for k, v in sol_kwargs.items():
                    setattr(s_obj, k, v)
                sol_update.append(s_obj)
            else:
                import uuid
                s_obj = QuestionSolution(id=uuid.uuid4(), question=q_obj, title=sol_title, **sol_kwargs)
                existing_sol[sol_key] = s_obj
                sol_create.append(s_obj)

    # ── Assessments ───────────────────────────────────────────────────────────

    def _auto_generate_skill_tests(self, course, topic, creator, title_template, is_certification=False):
        """Auto-generates 3 levels of skill tests/certifications (Easy, Medium, Hard)."""
        configs = [
            {
                "difficulty": "easy",
                "duration": 30 if not topic else 20,
                "total_marks": 20 if not topic else 15,
                "questions_random_config": { "mcq_single": 10, "mcq_multiple": 5, "coding": 0, "descriptive": 0 }
            },
            {
                "difficulty": "medium",
                "duration": 45 if not topic else 30,
                "total_marks": 30 if not topic else 20,
                "questions_random_config": { "mcq_single": 15, "mcq_multiple": 5, "coding": 0, "descriptive": 0 }
            },
            {
                "difficulty": "hard",
                "duration": 60 if not topic else 45,
                "total_marks": 50 if not topic else 25,
                "questions_random_config": { "mcq_single": 15, "mcq_multiple": 10, "coding": 0, "descriptive": 0 }
            }
        ]

        created_count = 0
        synced_count = 0

        for config in configs:
            diff = config["difficulty"]
            name = title_template.format(
                course=course.name,
                topic=topic.name if topic else "",
                difficulty=diff.title()
            )
            
            model_class = CertificationExam if is_certification else SkillTest
            lookup_kwargs = { "title": name, "course": course }
            if not is_certification:
                lookup_kwargs["topic"] = topic

            _, created = model_class.objects.update_or_create(
                **lookup_kwargs,
                defaults={
                    "description": f"Automated {diff} assessment for {topic.name if topic else course.name}",
                    "instructions": "Please complete all questions within the time limit.",
                    "difficulty": diff,
                    "duration": config["duration"],
                    "total_marks": config["total_marks"],
                    "passing_marks": int(config["total_marks"] * 0.6), # 60% passing
                    "questions_random_config": config["questions_random_config"],
                    "publish_status": "active",
                    "created_by": creator,
                }
            )
            if created:
                created_count += 1
            else:
                synced_count += 1

        return created_count, synced_count

    def _load_assessments(self, data):
        course_map = {c.short_code: c for c in Course.objects.all()}
        assessments = data.get("assessments", {})

        # Skill tests are now auto-generated in _load_courses()

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

import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from course.models import Subject, Unit, SubUnit, Video, Question, QuestionSolution
from assessment.models import SkillTest, Contest

User = get_user_model()


class Command(BaseCommand):
    help = "Load sample subjects with units, subunits, videos, and questions from JSON file or directory"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before loading new data",
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
            default=None,
            help="Filename or directory within fixtures/<deploy_env>/ to load. Defaults to sample_courses_data.json in dev, or data_structures directory in prod.",
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

        deploy_env = options["deploy_env"]
        self.load_instructors(deploy_env)

        fixtures_dir = Path(os.path.dirname(__file__)) / "../../fixtures" / deploy_env
        
        # Default file logic
        filename = options["file"]
        if not filename:
            if deploy_env == "prod":
                filename = "data_structures"
            else:
                filename = "sample_courses_data.json"
        
        filepath = fixtures_dir / filename

        self.stdout.write(f"\nLoading from {filepath}...")
        
        data = {}
        if filepath.is_dir():
            # Modular structure
            course_file = filepath / "course.json"
            if not course_file.exists():
                self.stdout.write(self.style.ERROR(f"course.json not found in {filepath}"))
                return
            
            with open(course_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Use "subjects" or "courses"
            subjects = data.get("subjects", data.get("courses", []))
            if not subjects:
                self.stdout.write(self.style.ERROR("No subjects/courses found in course.json"))
                return
            
            # Assume only one subject per modular folder for now
            subject_data = subjects[0]
            
            # Load units (formerly topics)
            units_dir = filepath / "units"
            if not units_dir.exists():
                # Fallback to "topics"
                units_dir = filepath / "topics"
            
            if units_dir.exists() and units_dir.is_dir():
                subject_data["units"] = []
                for unit_file in sorted(units_dir.glob("*.json")):
                    with open(unit_file, "r", encoding="utf-8") as f:
                        unit_content = json.load(f)
                        subject_data["units"].append(unit_content)
            
            # Normalize keys to 'subjects'
            data = {"subjects": [subject_data], "assessments": data.get("assessments", {})}
        else:
            # Single file structure
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except FileNotFoundError:
                self.stdout.write(self.style.ERROR(f"File not found: {filepath}"))
                return
            except json.JSONDecodeError as e:
                self.stdout.write(self.style.ERROR(f"Invalid JSON: {e}"))
                return

        self.load_subjects_from_json(data)
        self.load_assessments_from_json(data)
        self.stdout.write(self.style.SUCCESS("\nSuccessfully loaded subjects and assessments!"))

    def load_instructors(self, deploy_env="dev"):
        """Load instructors/admins from test users fixture"""
        users_path = os.path.join(
            os.path.dirname(__file__),
            f"../../../authentication/fixtures/{deploy_env}/test_users_data.json",
        )
        try:
            with open(users_path, "r", encoding="utf-8") as f:
                users_data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(self.style.WARNING(f"Users fixture not found: {users_path}"))
            return
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f"Invalid JSON in users fixture: {e}"))
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

    def load_subjects_from_json(self, data):
        """Load subjects, units, subunits, videos, and questions"""
        # Support both old "courses" and new "subjects" keys
        subjects_data = data.get("subjects", data.get("courses", []))
        
        for subject_data in subjects_data:
            name = subject_data.get("subject_name", subject_data.get("name"))
            self.stdout.write(f'Loading subject: {name}')

            instructor_email = subject_data.get("instructor_email")
            instructor = None
            if instructor_email:
                try:
                    instructor = User.objects.get(email=instructor_email)
                except User.DoesNotExist:
                    self.stdout.write(self.style.WARNING(
                        f"Instructor {instructor_email} not found"
                    ))

            subject, created = Subject.objects.get_or_create(
                short_code=subject_data["short_code"],
                defaults={
                    "subject_name": name,
                    "product_type": subject_data.get("product_type", "campus"),
                },
            )
            if created:
                self.stdout.write(f"  ✓ Created subject: {subject.subject_name}")
            else:
                # Update name or product_type if it changed
                needs_save = False
                if subject.subject_name != name:
                    subject.subject_name = name
                    needs_save = True
                
                ptype = subject_data.get("product_type")
                if ptype and subject.product_type != ptype:
                    subject.product_type = ptype
                    needs_save = True
                
                if needs_save:
                    subject.save()
                self.stdout.write(f"  → Subject exists: {subject.subject_name}")

            unit_map = {}
            subunit_map = {}

            # Support both old "topics" and new "units" keys
            units_data = subject_data.get("units", subject_data.get("topics", []))

            for unit_data in units_data:
                unit, unit_created = Unit.objects.update_or_create(
                    subject=subject,
                    name=unit_data["name"],
                    defaults={"order_index": unit_data.get("order_index", 0)},
                )
                unit_map[unit_data["name"]] = unit

                if unit_created:
                    self.stdout.write(f"    ✓ Created unit: {unit.name}")

                # Support both old "subtopics" and new "sub_units" keys
                subunits_data = unit_data.get("sub_units", unit_data.get("subtopics", []))

                for subunit_data in subunits_data:
                    subunit, su_created = SubUnit.objects.update_or_create(
                        unit=unit,
                        name=subunit_data["name"],
                        defaults={
                            "content": subunit_data.get("content", ""),
                            "order_index": subunit_data.get("order_index", 0),
                        },
                    )
                    subunit_map[f"{unit_data['name']}::{subunit_data['name']}"] = subunit

                    if su_created:
                        self.stdout.write(f"      ✓ Created subunit: {subunit.name}")

                    for video_data in subunit_data.get("videos", []):
                        video, v_created = Video.objects.get_or_create(
                            sub_unit=subunit,
                            title=video_data["title"],
                            defaults={
                                "video_link": video_data["video_link"],
                                "ai_context": video_data.get("ai_context", ""),
                            },
                        )
                        if v_created:
                            self.stdout.write(f"        ✓ Created video: {video.title}")

                    # Load questions at subunit level
                    for question_data in subunit_data.get("questions", []):
                        self._create_question(question_data, subject, unit_map, subunit_map, instructor)

                # Load questions at unit level
                for question_data in unit_data.get("questions", []):
                    self._create_question(question_data, subject, unit_map, subunit_map, instructor)

            # Load questions associated with this subject
            questions_data = subject_data.get("questions", [])
            for question_data in questions_data:
                self._create_question(question_data, subject, unit_map, subunit_map, instructor)

            self.stdout.write(f"✓ Loaded subject: {subject.subject_name}")

    def _create_question(self, question_data, subject, unit_map, subunit_map, instructor):
        """Create or sync a question"""
        if not instructor:
            instructor = User.objects.filter(role="admin").first()
        if not instructor:
            return

        # Map old level names to new nomenclature
        level_map = {
            "course": "subject", 
            "topic": "unit", 
            "subtopic": "subunit",
            "subject": "subject",
            "unit": "unit",
            "subunit": "subunit"
        }
        raw_level = question_data.get("level", "subject")
        level = level_map.get(raw_level, raw_level)

        kwargs = {
            "type": question_data["type"],
            "title": question_data["title"],
            "content": question_data["content"],
            "level": level,
            "difficulty": question_data["difficulty"],
            "marks": question_data["marks"],
            "categories": question_data["categories"],
            "hints": question_data.get("hints", []),
            "created_by": instructor,
        }

        if level == "subject":
            kwargs["subject"] = subject
        elif level == "unit":
            # Support both topic_name and unit_name
            unit_name = question_data.get("unit_name", question_data.get("topic_name"))
            if unit_name and unit_name in unit_map:
                kwargs["unit"] = unit_map[unit_name]
                kwargs["subject"] = subject
        elif level == "subunit":
            # Support both unit_name/topic_name and subunit_name/subtopic_name
            unit_name = question_data.get("unit_name", question_data.get("topic_name"))
            subunit_name = question_data.get("subunit_name", question_data.get("subtopic_name"))
            if unit_name and subunit_name:
                key = f"{unit_name}::{subunit_name}"
                if key in subunit_map:
                    kwargs["sub_unit"] = subunit_map[key]
                    kwargs["unit"] = unit_map.get(unit_name)
                    kwargs["subject"] = subject
                elif unit_name in unit_map:
                    kwargs["unit"] = unit_map[unit_name]
                    kwargs["subject"] = subject

        if question_data["type"] in ["mcq_single", "mcq_multiple"]:
            kwargs["mcq_options"] = question_data.get("mcq_options", [])
        elif question_data["type"] == "coding":
            kwargs["test_cases_basic"] = question_data.get("test_cases_basic", [])
            kwargs["test_cases_advanced"] = question_data.get("test_cases_advanced", [])

        q_obj, q_created = Question.objects.update_or_create(
            title=kwargs["title"],
            subject=kwargs.get("subject"),
            unit=kwargs.get("unit"),
            defaults=kwargs,
        )
        status = "✓ Created" if q_created else "→ Synced"
        self.stdout.write(f'        {status} question: {question_data["title"][:50]}')

        for sol_data in question_data.get("solutions", []):
            QuestionSolution.objects.update_or_create(
                question=q_obj,
                title=sol_data.get("title", ""),
                defaults={
                    "language": sol_data.get("language", "python"),
                    "code": sol_data.get("code", ""),
                    "complexity_analysis": sol_data.get("complexity_analysis", ""),
                    "is_primary": sol_data.get("is_primary", False),
                },
            )

    def load_assessments_from_json(self, data):
        """Load skill tests and contests"""
        assessments_data = data.get("assessments", {})
        subject_map = {s.short_code: s for s in Subject.objects.all()}

        for st_data in assessments_data.get("skill_tests", []):
            # Support both course_short_code and subject_short_code
            short_code = st_data.get("subject_short_code", st_data.get("course_short_code"))
            subject = subject_map.get(short_code)
            if not subject:
                continue
            creator = User.objects.filter(role="admin").first()
            if not creator:
                continue
            SkillTest.objects.get_or_create(
                title=st_data["title"],
                defaults={
                    "description": st_data.get("description", ""),
                    "instructions": st_data.get("instructions", ""),
                    "difficulty": st_data.get("difficulty", "medium"),
                    "duration": st_data.get("duration", 60),
                    "total_marks": st_data.get("total_marks", 100),
                    "passing_marks": st_data.get("passing_marks", 60),
                    "questions_config": {"mcq_single": [], "mcq_multiple": [], "coding": [], "descriptive": []},
                    "publish_status": st_data.get("publish_status", "draft"),
                    "created_by": creator,
                },
            )
            self.stdout.write(f'✓ Skill test: {st_data["title"]}')

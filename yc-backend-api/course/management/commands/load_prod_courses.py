import os
from pathlib import Path
from course.management.commands.load_sample_courses import Command as LoadSampleCoursesCommand

class Command(LoadSampleCoursesCommand):
    help = "Load production courses from course/fixtures/prod/*/course.json"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before loading new data",
        )

    def handle(self, *args, **options):
        from course.models import Course, Topic, Subtopic, Video, Question
        from assessment.models import SkillTest, Contest

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

        self.load_instructors()

        fixtures_dir = Path(os.path.dirname(__file__)) / "../../fixtures/prod"
        
        if not fixtures_dir.exists():
            self.stdout.write(self.style.ERROR(f"Production fixtures directory not found: {fixtures_dir}"))
            return

        has_errors = False
        
        # Scan through all subdirectories in prod
        for entry in fixtures_dir.iterdir():
            if entry.is_dir():
                course_file = entry / "course.json"
                if course_file.exists():
                    self.stdout.write(f"\nProcessing production course from {entry.name}/course.json...")
                    data = self._try_load_json(course_file)
                    if data:
                        try:
                            self.load_courses_from_json(data)
                            self.load_assessments_from_json(data)
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f"Failed to load data from {course_file}: {e}"))
                            has_errors = True
                    else:
                        self.stdout.write(self.style.WARNING(f"Failed to parse JSON from {course_file}"))
                        has_errors = True

        if not has_errors:
            self.stdout.write(self.style.SUCCESS("\nSuccessfully loaded all production courses!"))

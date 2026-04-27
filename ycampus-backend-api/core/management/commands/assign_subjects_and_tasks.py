import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from core.models import College, FacultyProfile, Section, Task, Semester
from course.models import Subject, CollegeSubject, SemesterSubject, SectionSubjectFaculty

class Command(BaseCommand):
    help = "Assigns subjects and 5 tasks to active semesters, with randomized faculty assignments."

    def handle(self, *args, **options):
        self.stdout.write("📚 Shuffling subjects and faculty assignments...")

        # 1. Get Target Subjects
        subjects = list(Subject.objects.all())
        
        if not subjects:
            self.stdout.write(self.style.WARNING("No subjects found. Ensure sample_courses_data.json is loaded first."))
            return

        # 2. Assign to ALL Colleges (Generic catalog assignment)
        colleges = College.objects.all()
        for college in colleges:
            for subject in subjects:
                CollegeSubject.objects.get_or_create(
                    college=college,
                    subject=subject,
                    defaults={"subject_code": f"{college.short_form}-{subject.short_code}"}
                )

        # 3. Target ONLY Active Semesters
        active_semesters = Semester.objects.filter(is_current=True)
        
        task_titles = [
            "Implement a Linked List",
            "Reverse a String in Python",
            "Create a Simple HTML Page",
            "Analyze Time Complexity of Bubble Sort",
            "Basic List Comprehension Practice"
        ]

        for semester in active_semesters:
            college = semester.batch.college
            sections = semester.sections.all()
            if not sections.exists():
                continue
                
            # Get faculties in this college and shuffle for this semester
            faculties = list(FacultyProfile.objects.filter(college=college))
            if not faculties:
                continue
            
            random.shuffle(faculties)
            
            # For each of the 3 subjects
            # We shuffle subjects too for extra variety across semesters
            shuffled_subjects = subjects[:]
            random.shuffle(shuffled_subjects)

            for s_idx, subject in enumerate(shuffled_subjects):
                # Ensure SemesterSubject exists
                sem_sub, _ = SemesterSubject.objects.get_or_create(
                    semester=semester,
                    subject=subject
                )
                
                # Pick faculty from the shuffled list
                faculty = faculties[s_idx % len(faculties)]
                
                # Assign the faculty to BOTH sections (A and B) for this subject
                for section in sections:
                    SectionSubjectFaculty.objects.get_or_create(
                        semester_subject=sem_sub,
                        section=section,
                        faculty=faculty
                    )

            # 4. Create 5 Dummy Tasks per SEMESTER (Shared across sections)
            for t_idx in range(5):
                subject = shuffled_subjects[t_idx % len(shuffled_subjects)]
                # Randomize faculty for task as well from the pool
                faculty = random.choice(faculties)
                
                task = Task.objects.create(
                    faculty=faculty,
                    subject=subject,
                    title=f"{task_titles[t_idx]} - {semester.batch.name} Sem {semester.number}",
                    description=f"Automated task for {semester.batch.name} - {semester.number}. Project requirements included.",
                    is_sent=True,
                    due_date=timezone.now() + timedelta(days=7),
                    task_type="descriptive",
                    question_source="manual"
                )
                # Link all sections of this semester to this task
                for section in sections:
                    task.sections.add(section)

        self.stdout.write(self.style.SUCCESS("✓ Randomized assignments completed! Each faculty now has a mix of subjects."))
"""
Management command to seed JNTU college-specific data:

1. Assign ALL assessments-product subjects to the JNTU college
   (in addition to the campus subjects that are already assigned).

2. For every campus-product subject assigned to JNTU, create 3 SkillTest
   (test_type='assessment') per Unit so that students see internal tests.
   Also create 3 SkillTest (test_type='practice') per Unit for practice tests.

3. Create 10 college-level Announcements for JNTU.

4. Create 10 community Posts from different JNTU users.

5. Unlock the first 2 units (all their subunits) for every subject, for every section.

Run order: after load_courses, load_colleges, assign_subjects_and_tasks.
"""
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from assessment.models import SkillTest
from community.models import Post
from core.models import Announcement, College, Section, StudentProfile
from course.models import CollegeSubject, Subject, SubUnit, SubUnitSectionStatus, Unit
from course.models import Question

User = get_user_model()

# ── Content pools ──────────────────────────────────────────────────────────────

ANNOUNCEMENT_DATA = [
    {
        "title": "Annual Cultural Fest 2026 – Registrations Open",
        "content": (
            "We are thrilled to announce JNTU Hyderabad's Annual Cultural Fest, "
            "'Tarang 2026', scheduled for the last week of July. Students from all "
            "departments are invited to participate in dance, music, drama, and art "
            "competitions. Register through the college portal before 30th June 2026."
        ),
        "priority": "important",
    },
    {
        "title": "End-Semester Examination Schedule Released",
        "content": (
            "The timetable for the upcoming End-Semester Examinations (July 2026) has "
            "been published on the college website. Students are advised to download "
            "their hall tickets and verify their exam centre details at the earliest. "
            "Contact the exam branch for corrections before 15th June 2026."
        ),
        "priority": "urgent",
    },
    {
        "title": "Campus Placement Drive – Infosys Ltd.",
        "content": (
            "Infosys Ltd. will be conducting an on-campus placement drive for final-year "
            "B.Tech students on 5th July 2026. Eligible branches: CSE, ECE, IT, EEE. "
            "Minimum CGPA requirement: 7.0. Students must register via the Training & "
            "Placement cell portal by 25th June 2026. Bring two copies of your resume."
        ),
        "priority": "important",
    },
    {
        "title": "Library Timings Extended for Exam Season",
        "content": (
            "To support students preparing for end-semester examinations, the Central "
            "Library will remain open until 10:00 PM from 1st June to 31st July 2026. "
            "Students must carry their library ID cards. The digital resource centre on "
            "the 2nd floor will be accessible 24×7 with a valid smart card."
        ),
        "priority": "normal",
    },
    {
        "title": "Workshop on AI & Machine Learning – Registration Open",
        "content": (
            "The Department of Computer Science & Engineering, in association with "
            "Google Developer Student Clubs (GDSC), is organising a 3-day intensive "
            "workshop on 'Practical AI & Machine Learning' from 20–22 June 2026. "
            "Seats are limited to 60 students. Register on the GDSC portal. No fee."
        ),
        "priority": "normal",
    },
    {
        "title": "Anti-Ragging Awareness Programme – Mandatory Attendance",
        "content": (
            "As per UGC guidelines, JNTU Hyderabad will conduct its annual "
            "Anti-Ragging Awareness Programme on 10th June 2026 in the college "
            "auditorium at 10:00 AM. Attendance is mandatory for all first-year and "
            "second-year students. Absentees will be marked accordingly."
        ),
        "priority": "urgent",
    },
    {
        "title": "Sports Day 2026 – Inter-Department Championship",
        "content": (
            "JNTU Hyderabad's Inter-Department Sports Championship 2026 will be held "
            "from 8th to 12th July 2026 at the college sports complex. Events include "
            "cricket, football, volleyball, athletics, and chess. Teams of eight must "
            "register with the Physical Director's office by 28th June 2026."
        ),
        "priority": "normal",
    },
    {
        "title": "Fee Payment Deadline – Last Date 20th June 2026",
        "content": (
            "Students who have not yet paid their semester fees for July 2026 are "
            "reminded that the last date for fee payment without a late fine is "
            "20th June 2026. Payments can be made online through the college ERP or "
            "in person at the accounts office between 9:00 AM and 3:00 PM."
        ),
        "priority": "urgent",
    },
    {
        "title": "Entrepreneurship Cell – Startup Pitch Competition",
        "content": (
            "JNTU-E-Cell invites student teams to present their startup ideas at "
            "'Spark 2026' – the annual startup pitch competition – on 18th July 2026. "
            "Top three teams will receive seed funding of ₹50,000, ₹30,000, and "
            "₹20,000 respectively. Teams of 2–5 members; submit your executive "
            "summary to ecell@jntu.edu by 5th July 2026."
        ),
        "priority": "important",
    },
    {
        "title": "Digital Skills Certification Programme – NASSCOM Partnership",
        "content": (
            "JNTU Hyderabad has partnered with NASSCOM Foundation to offer free "
            "certification courses in Python, Data Analytics, and Cybersecurity to "
            "all enrolled students. The programme runs from 1st July to 30th August "
            "2026 (online mode). Enrol through the NASSCOM FutureSkills portal using "
            "your JNTU institutional email ID."
        ),
        "priority": "important",
    },
]

POST_CONTENTS = [
    (
        "Just finished my final project on distributed systems – it took three all-nighters "
        "but the demo went flawlessly! Huge shoutout to the JNTU labs for being open late. "
        "If anyone needs help with Docker and Kubernetes setups, hit me up! 🚀 #JNTU #CSE"
    ),
    (
        "Super proud to announce that our team won the Smart India Hackathon internal "
        "round 🏆! We built a crop disease detection app using YOLOv8. Can't wait to "
        "represent JNTU at the national level. Thank you, mentors! #SIH2026 #JNTU"
    ),
    (
        "Had a brilliant guest lecture by a senior engineer from Microsoft Azure today. "
        "Key takeaway: 'Your fundamentals are your moat.' Notes posted on the dept. "
        "WhatsApp group. Do check them out! #CloudComputing #JNTU"
    ),
    (
        "Friendly reminder to all 3rd-year students: the GATE 2027 notification is out. "
        "Start your prep early – two hours a day from now will make all the difference. "
        "Study group forming in the library every Saturday at 9 AM. Join us! #GATE2027"
    ),
    (
        "Lost my blue JNTU library card somewhere between the canteen and Block C. "
        "If found, please drop it at the security cabin or DM me. Your kindness will "
        "save me a lot of paperwork 🙏 #FoundIt? #JNTUHyd"
    ),
    (
        "The NSS JNTU team just wrapped up a two-day blood donation camp. We collected "
        "120+ units of blood! Incredibly moved by the response from students and staff. "
        "Together we make a real difference. ❤️ #NSS #JNTUHyd #BloodDonation"
    ),
    (
        "Pro tip for juniors: the best way to crack aptitude rounds is to solve 20 "
        "questions every single day – not 200 in one weekend. Consistency beats "
        "intensity every time. Resources in bio 👇 #Placement #JNTU #Aptitude"
    ),
    (
        "Our IoT club just installed a smart energy monitoring system in Block A as part "
        "of our green campus initiative. Real-time data is up on the department notice "
        "board. Phase 2 covers water usage monitoring next month! ⚡🌿 #SmartCampus"
    ),
    (
        "Does anyone else feel like the semester just teleported? It's already the last "
        "month and I still have three assignments pending 😅 Motivation check: what's "
        "keeping you going this semester? Drop it below! #JNTULife"
    ),
    (
        "Quick review: the new student canteen menu is a serious upgrade! The paneer "
        "wraps and cold coffee combo is 10/10. Finally, a reason to come to college "
        "early ☕🌯 #JNTUCanteen #FoodieLife #CampusLife"
    ),
]

INTERNAL_TEST_TEMPLATES = [
    {
        "label": "Unit Test 1",
        "description": "First internal assessment covering the foundational topics of this unit.",
        "difficulty": "easy",
        "duration": 45,
        "total_marks": 30,
        "passing_marks": 12,
    },
    {
        "label": "Unit Test 2",
        "description": "Second internal assessment with intermediate-level questions from this unit.",
        "difficulty": "medium",
        "duration": 60,
        "total_marks": 50,
        "passing_marks": 20,
    },
    {
        "label": "Unit Test 3",
        "description": "Third internal assessment – advanced application and problem-solving questions.",
        "difficulty": "hard",
        "duration": 75,
        "total_marks": 70,
        "passing_marks": 28,
    },
]

PRACTICE_TEST_TEMPLATES = [
    {
        "label": "Practice Set 1",
        "description": "Introductory practice set to build familiarity with the core concepts of this unit.",
        "difficulty": "easy",
        "duration": 30,
        "total_marks": 20,
        "passing_marks": 8,
    },
    {
        "label": "Practice Set 2",
        "description": "Intermediate practice set with a mix of conceptual and application-based questions.",
        "difficulty": "medium",
        "duration": 45,
        "total_marks": 30,
        "passing_marks": 12,
    },
    {
        "label": "Practice Set 3",
        "description": "Advanced practice set designed to challenge and sharpen problem-solving skills.",
        "difficulty": "hard",
        "duration": 60,
        "total_marks": 50,
        "passing_marks": 20,
    },
]


class Command(BaseCommand):
    help = "Seed JNTU college-specific data: assessment subjects, internal tests, announcements, and posts."

    JNTU_COLLEGE_SHORT_FORM = "JNTU"

    def handle(self, *args, **options):
        self.stdout.write("🏫 Seeding JNTU college-specific data...\n")

        jntu = College.objects.filter(short_form=self.JNTU_COLLEGE_SHORT_FORM).first()
        if not jntu:
            self.stdout.write(self.style.ERROR("❌ JNTU college not found. Run load_colleges first."))
            return

        admin_user = self._get_college_admin(jntu)

        self._assign_all_subjects(jntu)
        self._seed_internal_tests(jntu, admin_user)
        self._seed_practice_tests(jntu, admin_user)
        self._unlock_first_two_units(jntu)
        self._seed_announcements(jntu, admin_user)
        self._seed_posts(jntu)

        self.stdout.write(self.style.SUCCESS("\n✅ JNTU college data seeding complete!"))

    # ── 1. Assign assessments-product subjects to JNTU ────────────────────────

    def _assign_all_subjects(self, college: College):
        self.stdout.write("  📚 Assigning all product subjects to JNTU...")

        all_subjects = Subject.objects.all()
        created = 0
        for subject in all_subjects:
            _, was_created = CollegeSubject.objects.get_or_create(
                college=college,
                subject=subject,
                defaults={"subject_code": f"{college.short_form}-{subject.short_code}"},
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(f"  ✓ {created} new college-subject links created ({all_subjects.count()} total subjects).")
        )

    # ── 2. Seed internal tests for every unit of each campus subject ───────────

    def _seed_internal_tests(self, college: College, admin_user):
        self.stdout.write("  📝 Creating internal tests (3 per unit) for campus subjects...")

        campus_subjects = Subject.objects.filter(product_type="campus")
        if not campus_subjects.exists():
            self.stdout.write(self.style.WARNING("  ⚠ No campus subjects found. Skipping internal tests."))
            return

        total_created = 0

        # Gather available MCQ questions for a fallback question pool
        fallback_mcq_ids = list(
            Question.objects.filter(type="mcq_single").values_list("id", flat=True)[:50]
        )

        for subject in campus_subjects:
            units = Unit.objects.filter(subject=subject).order_by("order_index")
            if not units.exists():
                self.stdout.write(self.style.WARNING(f"  ⚠ No units for subject '{subject.subject_name}'. Skipping."))
                continue

            for unit in units:
                for template in INTERNAL_TEST_TEMPLATES:
                    title = f"{subject.subject_name} – {unit.name} – {template['label']}"

                    # Idempotent: skip if already exists
                    if SkillTest.objects.filter(title=title, subject=subject, unit=unit).exists():
                        continue

                    # Build a minimal questions_config (up to 10 MCQ questions from the subject/unit)
                    unit_mcq_ids = list(
                        Question.objects.filter(type="mcq_single", unit=unit).values_list("id", flat=True)[:10]
                    )
                    if len(unit_mcq_ids) < 5 and fallback_mcq_ids:
                        # Pad with global fallback questions
                        extra_needed = 5 - len(unit_mcq_ids)
                        extra = [qid for qid in fallback_mcq_ids if qid not in unit_mcq_ids][:extra_needed]
                        unit_mcq_ids.extend(extra)

                    questions_config = {
                        "mcq_single": [str(qid) for qid in unit_mcq_ids],
                        "mcq_multiple": [],
                        "coding": [],
                        "descriptive": [],
                    }

                    SkillTest.objects.create(
                        title=title,
                        description=template["description"],
                        instructions=(
                            f"Attempt all questions within the allotted time. "
                            f"This test covers: {unit.name}."
                        ),
                        difficulty=template["difficulty"],
                        duration=template["duration"],
                        total_marks=template["total_marks"],
                        passing_marks=template["passing_marks"],
                        test_type="assessment",
                        subject=subject,
                        unit=unit,
                        publish_status="active",
                        questions_config=questions_config,
                        questions_random_config={"mcq_single": min(len(unit_mcq_ids), 10)},
                        created_by=admin_user,
                    )
                    total_created += 1

        self.stdout.write(self.style.SUCCESS(f"  ✓ {total_created} internal tests created."))

    # ── 3. Seed practice tests for every unit of each campus subject ───────────

    def _seed_practice_tests(self, college: College, admin_user):
        self.stdout.write("  🧪 Creating practice tests (3 per unit) for campus subjects...")

        campus_subjects = Subject.objects.filter(product_type="campus")
        if not campus_subjects.exists():
            self.stdout.write(self.style.WARNING("  ⚠ No campus subjects found. Skipping practice tests."))
            return

        total_created = 0

        fallback_mcq_ids = list(
            Question.objects.filter(type="mcq_single").values_list("id", flat=True)[:50]
        )

        for subject in campus_subjects:
            units = Unit.objects.filter(subject=subject).order_by("order_index")
            if not units.exists():
                continue

            for unit in units:
                for template in PRACTICE_TEST_TEMPLATES:
                    title = f"{subject.subject_name} – {unit.name} – {template['label']}"

                    if SkillTest.objects.filter(title=title, subject=subject, unit=unit).exists():
                        continue

                    unit_mcq_ids = list(
                        Question.objects.filter(type="mcq_single", unit=unit).values_list("id", flat=True)[:10]
                    )
                    if len(unit_mcq_ids) < 5 and fallback_mcq_ids:
                        extra_needed = 5 - len(unit_mcq_ids)
                        extra = [qid for qid in fallback_mcq_ids if qid not in unit_mcq_ids][:extra_needed]
                        unit_mcq_ids.extend(extra)

                    questions_config = {
                        "mcq_single": [str(qid) for qid in unit_mcq_ids],
                        "mcq_multiple": [],
                        "coding": [],
                        "descriptive": [],
                    }

                    SkillTest.objects.create(
                        title=title,
                        description=template["description"],
                        instructions=(
                            f"Work through each question carefully. "
                            f"This practice set covers: {unit.name}."
                        ),
                        difficulty=template["difficulty"],
                        duration=template["duration"],
                        total_marks=template["total_marks"],
                        passing_marks=template["passing_marks"],
                        test_type="practice",
                        subject=subject,
                        unit=unit,
                        publish_status="active",
                        questions_config=questions_config,
                        questions_random_config={"mcq_single": min(len(unit_mcq_ids), 10)},
                        created_by=admin_user,
                    )
                    total_created += 1

        self.stdout.write(self.style.SUCCESS(f"  ✓ {total_created} practice tests created."))

    # ── 3. Seed announcements ─────────────────────────────────────────────────

    # ── 4. Unlock first 2 units for every subject, every section ─────────────

    def _unlock_first_two_units(self, college: College):
        self.stdout.write("  🔓 Unlocking first 2 units for all subjects across all sections...")

        # All sections that belong to this college (via semester → batch → college)
        sections = Section.objects.filter(semester__batch__college=college)
        if not sections.exists():
            self.stdout.write(self.style.WARNING("  ⚠ No sections found for JNTU. Skipping unit unlock."))
            return

        all_subjects = Subject.objects.all()
        total_unlocked = 0

        for subject in all_subjects:
            # Get the first 2 units ordered by order_index
            first_two_units = Unit.objects.filter(subject=subject).order_by("order_index")[:2]

            for unit in first_two_units:
                subunits = SubUnit.objects.filter(unit=unit)
                for subunit in subunits:
                    for section in sections:
                        status, created = SubUnitSectionStatus.objects.get_or_create(
                            section=section,
                            sub_unit=subunit,
                            defaults={
                                "is_unlocked": True,
                                "unlocked_at": timezone.now(),
                            },
                        )
                        if not created and not status.is_unlocked:
                            # Already exists but was locked — unlock it
                            status.is_unlocked = True
                            status.unlocked_at = timezone.now()
                            status.save(update_fields=["is_unlocked", "unlocked_at"])
                            created = True  # count as an update
                        if created:
                            total_unlocked += 1

        self.stdout.write(self.style.SUCCESS(f"  ✓ {total_unlocked} subunit-section unlock records created/updated."))

    # ── 5. Seed announcements ─────────────────────────────────────────────────

    def _seed_announcements(self, college: College, admin_user):

        self.stdout.write("  📢 Creating 10 announcements for JNTU...")

        created = 0
        for idx, ann in enumerate(ANNOUNCEMENT_DATA):
            # Idempotent: skip if title already exists for this college
            if Announcement.objects.filter(college=college, title=ann["title"]).exists():
                continue

            publish_date = timezone.now() - timedelta(days=random.randint(0, 30))
            expiry_date = publish_date + timedelta(days=random.randint(30, 90))

            Announcement.objects.create(
                college=college,
                title=ann["title"],
                content=ann["content"],
                priority=ann["priority"],
                level="college",
                is_active=True,
                publish_date=publish_date,
                expiry_date=expiry_date,
                created_by=admin_user,
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f"  ✓ {created} announcements created."))

    # ── 4. Seed community posts ───────────────────────────────────────────────

    def _seed_posts(self, college: College):
        self.stdout.write("  💬 Creating 10 community posts from JNTU users...")

        # Gather student users in JNTU college
        jntu_students = list(
            User.objects.filter(
                student_profile__batch__college=college
            ).distinct()
        )
        # Also include faculty and other staff
        jntu_faculty = list(
            User.objects.filter(
                faculty_profile__college=college
            ).distinct()
        )
        all_jntu_users = jntu_students + jntu_faculty
        # De-duplicate preserving order
        seen_ids = set()
        unique_users = []
        for u in all_jntu_users:
            if u.pk not in seen_ids:
                seen_ids.add(u.pk)
                unique_users.append(u)

        if not unique_users:
            self.stdout.write(self.style.WARNING("  ⚠ No JNTU users found. Skipping posts."))
            return

        created = 0
        for idx, content in enumerate(POST_CONTENTS):
            # Idempotent: skip if a post with the same content already exists for this college
            if Post.objects.filter(college=college, content=content).exists():
                continue

            # Cycle through available users so posts come from different people
            user = unique_users[idx % len(unique_users)]

            Post.objects.create(
                user=user,
                content=content,
                visibility="ENTIRE_COLLEGE",
                college=college,
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f"  ✓ {created} community posts created."))

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _get_college_admin(self, college: College):
        """Return the college admin user, falling back to any superuser."""
        admin = User.objects.filter(
            college_admin_profile__college=college
        ).first()
        if admin:
            return admin
        return User.objects.filter(is_superuser=True).first()

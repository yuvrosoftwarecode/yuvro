import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from core.models import StudentProfile
from assessment.models import SkillTest, SkillTestSubmission, MockInterview, MockInterviewSubmission
from course.models import Question, StudentCodePractice, SubUnit, UserSubjectProgress

class Command(BaseCommand):
    help = "Seed the database with sample submission data for placement analytics"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing placement submission data before seeding",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing placement submission data...")
            SkillTestSubmission.objects.all().delete()
            
            # Clear associated chat sessions, interview sessions, and reports to avoid dangling records
            from ai_assistant.models import ChatSession, InterviewSession, InterviewReport
            InterviewReport.objects.filter(interview_session__chat_session__mock_interview_submission__isnull=False).delete()
            InterviewSession.objects.filter(chat_session__mock_interview_submission__isnull=False).delete()
            ChatSession.objects.filter(mock_interview_submission__isnull=False).delete()
            
            MockInterviewSubmission.objects.all().delete()
            StudentCodePractice.objects.all().delete()
            UserSubjectProgress.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing submission data cleared."))

        # 1. Fetch source models
        students = StudentProfile.objects.all().select_related('user')
        student_count = students.count()
        if student_count == 0:
            self.stdout.write(self.style.WARNING("No student profiles found. Seeding cannot proceed."))
            return

        assessments = list(SkillTest.objects.filter(test_type='assessment'))
        practice_tests = list(SkillTest.objects.filter(test_type='practice'))
        mock_interviews = list(MockInterview.objects.all())
        questions = list(Question.objects.all())
        subunits = list(SubUnit.objects.all().select_related('unit__subject'))

        self.stdout.write(f"Found {student_count} students in database.")
        self.stdout.write(f"Source pools available: "
                          f"Assessments: {len(assessments)}, "
                          f"Practice Tests: {len(practice_tests)}, "
                          f"Mock Interviews: {len(mock_interviews)}, "
                          f"Questions: {len(questions)}, "
                          f"SubUnits: {len(subunits)}")

        # Check if we have source data to seed
        if not (assessments or practice_tests or mock_interviews or questions or subunits):
            self.stdout.write(self.style.ERROR("No source data (SkillTests, MockInterviews, Questions, or SubUnits) found. Please load sample tests first."))
            return

        seeded_assess = 0
        seeded_practice_tests = 0
        seeded_mocks = 0
        seeded_code_practice = 0
        seeded_progress = 0

        with transaction.atomic():
            for s in students:
                user = s.user
                # Use deterministic random generator based on student username or ID to make results reproducible
                # but varied across different students
                rnd = random.Random(user.username)

                # A. SkillTest Submissions (Assessments)
                # Pick ~3-5 distinct assessments if they exist
                if assessments:
                    num_to_pick = min(rnd.randint(3, 5), len(assessments))
                    picked = rnd.sample(assessments, num_to_pick)
                    for test in picked:
                        # Make marks range 50.0 - 95.0, or we can scale it to test.total_marks
                        scale = test.total_marks if test.total_marks else 100.0
                        score = rnd.uniform(50.0, 95.0) * (scale / 100.0)
                        
                        sub, created = SkillTestSubmission.objects.get_or_create(
                            user=user,
                            skill_test=test,
                            defaults={
                                'status': SkillTestSubmission.STATUS_COMPLETED,
                                'marks': round(score, 1),
                                'completed_at': timezone.now(),
                                'submitted_at': timezone.now(),
                            }
                        )
                        if created:
                            seeded_assess += 1

                # B. SkillTest Submissions (Practice Tests)
                # Pick ~3-5 distinct practice tests if they exist
                if practice_tests:
                    num_to_pick = min(rnd.randint(3, 5), len(practice_tests))
                    picked = rnd.sample(practice_tests, num_to_pick)
                    for test in picked:
                        scale = test.total_marks if test.total_marks else 100.0
                        score = rnd.uniform(50.0, 95.0) * (scale / 100.0)
                        
                        sub, created = SkillTestSubmission.objects.get_or_create(
                            user=user,
                            skill_test=test,
                            defaults={
                                'status': SkillTestSubmission.STATUS_COMPLETED,
                                'marks': round(score, 1),
                                'completed_at': timezone.now(),
                                'submitted_at': timezone.now(),
                            }
                        )
                        if created:
                            seeded_practice_tests += 1

                # C. Mock Interview Submissions
                # Pick ~1-2 distinct mock interviews if they exist
                if mock_interviews:
                    num_to_pick = min(rnd.randint(1, 2), len(mock_interviews))
                    picked = rnd.sample(mock_interviews, num_to_pick)
                    for mock in picked:
                        # MockInterview doesn't have total_marks usually, default 100.0
                        score = rnd.uniform(50.0, 95.0)
                        exp_level = rnd.choice([
                            MockInterviewSubmission.EXP_LEVEL_BEGINNER,
                            MockInterviewSubmission.EXP_LEVEL_INTERN,
                            MockInterviewSubmission.EXP_LEVEL_INTERMEDIATE
                        ])
                        
                        sub, created = MockInterviewSubmission.objects.get_or_create(
                            user=user,
                            mock_interview=mock,
                            defaults={
                                'status': MockInterviewSubmission.STATUS_COMPLETED,
                                'marks': round(score, 1),
                                'experience_level': exp_level,
                                'completed_at': timezone.now(),
                                'submitted_at': timezone.now(),
                            }
                        )
                        if created:
                            seeded_mocks += 1
                            
                        # Seed Mock Interview chat session, interview session and AI report
                        from ai_assistant.models import ChatSession, InterviewSession, InterviewReport, AIAgent
                        
                        agent = AIAgent.objects.filter(name="Mock Interview").first()
                        if not agent:
                            agent = AIAgent.objects.first()
                        if not agent:
                            agent = AIAgent.objects.create(
                                name="Mock Interview",
                                provider="gemini",
                                model_name="gemini-flash-latest",
                                is_active=True
                            )
                            
                        if not sub.chat_session:
                            # Create a realistic chat session
                            chat_session = ChatSession.objects.create(
                                user=user,
                                ai_agent=agent,
                                title=f"Mock Interview: {mock.title}",
                                is_active=False
                            )
                            
                            # Create an interview session
                            interview_session = InterviewSession.objects.create(
                                user=user,
                                chat_session=chat_session,
                                role_title=mock.title,
                                status="completed",
                                completed_at=timezone.now()
                            )
                            
                            # Create an interview report with dynamic communication and technical metrics
                            comm_score = rnd.uniform(max(30.0, score - 8.0), min(100.0, score + 8.0))
                            tech_score = rnd.uniform(max(30.0, score - 6.0), min(100.0, score + 6.0))
                            prob_score = rnd.uniform(max(30.0, score - 10.0), min(100.0, score + 10.0))
                            adapt_score = rnd.uniform(max(30.0, score - 5.0), min(100.0, score + 5.0))
                            
                            perf_metrics = {
                                "Communication": round(comm_score, 1),
                                "Technical Proficiency": round(tech_score, 1),
                                "Problem Solving": round(prob_score, 1),
                                "Adaptability": round(adapt_score, 1)
                            }
                            
                            strengths_pool = []
                            improvements_pool = []
                            
                            if comm_score >= 75:
                                strengths_pool.extend(["Strong verbal clarity", "Confident articulation", "Good explanation structure"])
                            else:
                                improvements_pool.extend(["Needs better communication structure", "Work on speaking confidence under pressure"])
                                
                            if tech_score >= 75:
                                strengths_pool.extend(["Good conceptual understanding", "Solid core technology logic", "Accurate technical definitions"])
                            else:
                                improvements_pool.extend(["Improve conceptual clarity in core topics", "Focus on boundary/edge case explanation"])
                                
                            if prob_score >= 75:
                                strengths_pool.extend(["Strong analytical reasoning", "Accurate dry-run explanation", "Structured problem-solving"])
                            else:
                                improvements_pool.extend(["Improve explanation of brute-force vs optimized logic", "Needs practice with complex data patterns"])
                                
                            if adapt_score >= 75:
                                strengths_pool.extend(["Highly receptive to hints", "Adaptable to alternative approaches"])
                            else:
                                improvements_pool.extend(["Work on structured storytelling", "Struggles with unfamiliar problem scenarios"])
                                
                            # Fallback if pools are empty
                            if not strengths_pool:
                                strengths_pool = ["Receptive to feedback", "Basic logic definition"]
                            if not improvements_pool:
                                improvements_pool = ["Work on runtime complexity optimization", "Improve pacing during explanations"]
                                
                            strengths = rnd.sample(strengths_pool, min(len(strengths_pool), rnd.randint(2, 3)))
                            improvements = rnd.sample(improvements_pool, min(len(improvements_pool), rnd.randint(2, 3)))
                            
                            InterviewReport.objects.create(
                                interview_session=interview_session,
                                overall_score=round(score, 1),
                                feedback_summary=f"Automated evaluation report for {mock.title}.",
                                performance_metrics=perf_metrics,
                                skill_analysis={},
                                question_analysis=[],
                                key_takeaways={
                                    "strengths": strengths,
                                    "improvements": improvements
                                }
                            )
                            
                            sub.chat_session = chat_session
                            sub.save()

                # D. Student Code Practice
                # Pick ~5-10 distinct questions if they exist
                if questions:
                    num_to_pick = min(rnd.randint(5, 10), len(questions))
                    picked = rnd.sample(questions, num_to_pick)
                    for q in picked:
                        # Coding practice score default (marks_obtained)
                        max_marks = q.marks if q.marks else 10
                        score = rnd.uniform(5.0, 10.0) * (max_marks / 10.0)
                        
                        sub, created = StudentCodePractice.objects.get_or_create(
                            user=user,
                            question=q,
                            defaults={
                                'subject': q.subject,
                                'unit': q.unit,
                                'status': StudentCodePractice.STATUS_COMPLETED,
                                'marks_obtained': round(score, 1),
                                'created_at': timezone.now(),
                            }
                        )
                        if created:
                            seeded_code_practice += 1

                # E. User Subject Progress (Active Learners / progress percent)
                # Pick ~3-5 distinct subunits if they exist
                if subunits:
                    num_to_pick = min(rnd.randint(3, 5), len(subunits))
                    picked = rnd.sample(subunits, num_to_pick)
                    for sub_unit in picked:
                        # Quiz score between 60.0 and 100.0
                        score = rnd.uniform(60.0, 100.0)
                        prog_percent = rnd.uniform(70.0, 100.0)
                        
                        sub, created = UserSubjectProgress.objects.get_or_create(
                            user=user,
                            sub_unit=sub_unit,
                            defaults={
                                'subject': sub_unit.unit.subject if sub_unit.unit else None,
                                'unit': sub_unit.unit,
                                'quiz_score': round(score, 1),
                                'is_quiz_completed': True,
                                'progress_percent': round(prog_percent, 1),
                                'is_completed': prog_percent >= 90.0,
                            }
                        )
                        if created:
                            seeded_progress += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded placement sample data:\n"
            f"  - SkillTest (Assessment) Submissions: {seeded_assess}\n"
            f"  - SkillTest (Practice) Submissions: {seeded_practice_tests}\n"
            f"  - Mock Interview Submissions: {seeded_mocks}\n"
            f"  - Student Code Practices: {seeded_code_practice}\n"
            f"  - User Subject Progress: {seeded_progress}"
        ))

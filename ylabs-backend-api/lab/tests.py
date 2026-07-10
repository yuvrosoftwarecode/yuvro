from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Lab, LabSprint, LabSprintTicket, UserLabEnrollment, UserLabSprintTicketSubmission

User = get_user_model()


class LabModelsTest(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="lab-admin",
            email="lab-admin@example.com",
            password="testpass123",
            role="admin",
        )
        self.student_user = User.objects.create_user(
            username="lab-student",
            email="lab-student@example.com",
            password="testpass123",
            role="student",
        )

    def test_lab_models_can_be_created(self):
        lab = Lab.objects.create(
            title="Python Basics",
            type="Backend",
            description="Learn backend fundamentals",
            icon="python",
            prerequisites="Python syntax",
            skills="[\"problem-solving\"]",
            git_repo_starter_url="https://github.com/example/lab",
            difficulty="EASY",
            created_by=self.admin_user,
        )
        sprint = LabSprint.objects.create(
            title="Sprint 1",
            description="First sprint",
            order_index=1,
            lab=lab,
            created_by=self.admin_user,
        )
        ticket = LabSprintTicket.objects.create(
            sprint=sprint,
            ticket_slug="intro",
            title="Intro Ticket",
            description="A sample ticket",
            difficulty="EASY",
            learning_objectives=["Understand basics"],
            tasks=["Write a function"],
            common_mistakes=["Missing return"],
            hints=["Check the examples"],
            scoring_rules={"points": 3},
            solution={"answer": "done"},
            accepted_programming_languages=["PYTHON"],
            created_by=self.admin_user,
        )
        enrollment = UserLabEnrollment.objects.create(user=self.student_user, lab=lab)
        submission = UserLabSprintTicketSubmission.objects.create(
            user=self.student_user,
            lab_sprint_ticket=ticket,
            ticket_status="backlog",
            solution="print('hi')",
            yuvro_points=5,
            minutes_solved=10,
        )

        self.assertEqual(lab.title, "Python Basics")
        self.assertEqual(sprint.lab, lab)
        self.assertEqual(ticket.sprint, sprint)
        self.assertEqual(enrollment.lab, lab)
        self.assertEqual(submission.lab_sprint_ticket, ticket)

    def test_submission_scoring(self):
        lab = Lab.objects.create(
            title="SQL Basics",
            type="Backend",
            difficulty="EASY",
            created_by=self.admin_user,
        )
        sprint = LabSprint.objects.create(
            title="Sprint 1",
            lab=lab,
            created_by=self.admin_user,
        )
        ticket = LabSprintTicket.objects.create(
            sprint=sprint,
            title="Select All",
            scoring_rules={"logic_score": 100},
            solution={
                "query.sql": "SELECT * FROM users;",
                "expected_output": "id,name"
            },
            yuvro_points=50,
            created_by=self.admin_user,
        )
        
        # Exact match (normalized)
        submission1 = UserLabSprintTicketSubmission.objects.create(
            user=self.student_user,
            lab_sprint_ticket=ticket,
            solution="select * from users;  ",
            solution_output="id,name\n1,Alice"
        )
        submission1.score_submission()
        self.assertEqual(submission1.yuvro_points, 50)
        self.assertEqual(submission1.ticket_status, "done")
        
        # Only query matches
        submission2 = UserLabSprintTicketSubmission.objects.create(
            user=self.student_user,
            lab_sprint_ticket=ticket,
            solution="select * from users;",
            solution_output="error"
        )
        submission2.score_submission()
        self.assertEqual(submission2.yuvro_points, 25)
        self.assertEqual(submission2.ticket_status, "in_review")
        
        # Completely wrong
        submission3 = UserLabSprintTicketSubmission.objects.create(
            user=self.student_user,
            lab_sprint_ticket=ticket,
            solution="SELECT 1;",
            solution_output="error"
        )
        submission3.score_submission()
        self.assertEqual(submission3.yuvro_points, 0)
        # Status remains what it was (or backlog if not changed by score)

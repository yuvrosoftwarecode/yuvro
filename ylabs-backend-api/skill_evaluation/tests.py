import os
import shutil
import tempfile
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from skill_evaluation.models import LabType, LabQuestionBank, LabQuestionBankTask
from skill_evaluation.utils import is_database_lab
from lab.workspace_manager import provision_evaluation_user_repo

User = get_user_model()


class DatabaseLabDetectionTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin-user",
            email="admin@example.com",
            password="password123",
            role="admin",
        )

    def test_backend_lab_with_databases_not_treated_as_database_lab(self):
        # Django backend lab that connects to PostgreSQL / SQLite
        lab = LabQuestionBank.objects.create(
            title="Django Performance N+1 Lab",
            type=LabType.BACKEND,
            programming_languages=["PYTHON"],
            databases=["SQLITE", "POSTGRESQL"],
            backend_frameworks=["DJANGO"],
            created_by=self.admin,
        )
        task = LabQuestionBankTask.objects.create(
            lab_question_bank=lab,
            title="Optimize ORM queries",
            solution={"views.py": "def get_orders(): ..."},
            scoring_rules={},
            created_by=self.admin,
        )
        self.assertFalse(is_database_lab(lab, [task]))

    def test_frontend_lab_not_treated_as_database_lab(self):
        lab = LabQuestionBank.objects.create(
            title="React Todo App",
            type=LabType.FRONTEND,
            programming_languages=["JAVASCRIPT"],
            frontend_frameworks=["REACT"],
            created_by=self.admin,
        )
        task = LabQuestionBankTask.objects.create(
            lab_question_bank=lab,
            title="Build Todo List",
            solution={"src/App.tsx": "function App() {}"},
            scoring_rules={},
            created_by=self.admin,
        )
        self.assertFalse(is_database_lab(lab, [task]))

    def test_database_lab_treated_as_database_lab(self):
        lab = LabQuestionBank.objects.create(
            title="SQL Queries Lab",
            type=LabType.DATABASE,
            programming_languages=["SQL"],
            databases=["POSTGRESQL"],
            created_by=self.admin,
        )
        task = LabQuestionBankTask.objects.create(
            lab_question_bank=lab,
            title="Write SELECT query",
            solution={"query.sql": "SELECT * FROM users;"},
            scoring_rules={"system_query": "SELECT * FROM users;"},
            created_by=self.admin,
        )
        self.assertTrue(is_database_lab(lab, [task]))

    def test_provision_evaluation_user_repo_creates_task_sql_only_for_database_labs(self):
        temp_workspaces = tempfile.mkdtemp()
        try:
            with override_settings(WORKSPACES_ROOT=temp_workspaces):
                # 1. Non-database lab
                backend_lab = LabQuestionBank.objects.create(
                    title="Django API Lab",
                    type=LabType.BACKEND,
                    programming_languages=["PYTHON"],
                    databases=["SQLITE"],
                    backend_frameworks=["DJANGO"],
                    created_by=self.admin,
                )
                LabQuestionBankTask.objects.create(
                    lab_question_bank=backend_lab,
                    title="Fix API",
                    solution={"views.py": "def view(): pass"},
                    created_by=self.admin,
                    order_index=1,
                )

                user_dir_backend = provision_evaluation_user_repo(
                    evaluation_uuid="eval-1",
                    lab_uuid=backend_lab.id,
                    user_uuid=self.admin.id,
                    starter_repo_path=None,
                )
                self.assertFalse(os.path.exists(os.path.join(user_dir_backend, "task1.sql")))

                # 2. Database lab
                db_lab = LabQuestionBank.objects.create(
                    title="SQL Lab",
                    type=LabType.DATABASE,
                    programming_languages=["SQL"],
                    databases=["SQLITE"],
                    created_by=self.admin,
                )
                LabQuestionBankTask.objects.create(
                    lab_question_bank=db_lab,
                    title="Write query",
                    solution={"query.sql": "SELECT * FROM test;"},
                    created_by=self.admin,
                    order_index=1,
                )

                user_dir_db = provision_evaluation_user_repo(
                    evaluation_uuid="eval-2",
                    lab_uuid=db_lab.id,
                    user_uuid=self.admin.id,
                    starter_repo_path=None,
                )
                self.assertTrue(os.path.exists(os.path.join(user_dir_db, "task1.sql")))
        finally:
            shutil.rmtree(temp_workspaces, ignore_errors=True)

    def test_lab_with_test_command(self):
        lab = LabQuestionBank.objects.create(
            title="Django Performance N+1 Lab",
            type=LabType.BACKEND,
            test_command="python yuvro_scoring_rules/main_test.py",
            created_by=self.admin,
        )
        self.assertEqual(lab.test_command, "python yuvro_scoring_rules/main_test.py")


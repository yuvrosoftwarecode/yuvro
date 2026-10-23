import os
import shutil
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.conf import settings
from .workspace_manager import provision_evaluation_lab_starter_repo
from skill_evaluation.models import LabQuestionBank, RepoSourceType
from recruiter.models import GithubAppInstallation, GithubAppInstallationGrant
from django.contrib.auth import get_user_model

User = get_user_model()

class WorkspaceManagerGithubIntegrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="test_admin")
        
        self.admin_lab = LabQuestionBank.objects.create(
            title="Admin Lab",
            repo_source_type=RepoSourceType.ADMIN_SYSTEM,
            git_repo_starter_url="https://github.com/yuvro/admin-repo.git",
        )
        
        self.installation = GithubAppInstallation.objects.create(
            installation_id="12345",
            account_id="54321",
            account_login="test-recruiter-org",
            account_type="Organization"
        )
        
        GithubAppInstallationGrant.objects.create(
            recruiter=self.user,
            installation=self.installation
        )
        
        self.recruiter_lab = LabQuestionBank.objects.create(
            title="Recruiter Lab",
            repo_source_type=RepoSourceType.RECRUITER_GITHUB_APP,
            github_app_installation=self.installation,
            git_repo_starter_url="https://github.com/test-recruiter-org/private-repo.git",
        )
        
        self.recruiter_lab_no_install = LabQuestionBank.objects.create(
            title="Recruiter Lab No Install",
            repo_source_type=RepoSourceType.RECRUITER_GITHUB_APP,
            git_repo_starter_url="https://github.com/test-recruiter-org/private-repo2.git",
        )
        
        self.evaluation_uuid = "test-eval-uuid"

    @patch('subprocess.run')
    def test_admin_provisioning_uses_system_pat(self, mock_subprocess):
        settings.GITHUB_SYSTEM_PAT = "fake_system_pat"
        mock_subprocess.return_value = MagicMock(returncode=0)
        
        target_path = provision_evaluation_lab_starter_repo(
            self.evaluation_uuid, 
            self.admin_lab.id, 
            self.admin_lab.git_repo_starter_url
        )
        
        mock_subprocess.assert_called_once()
        cmd = mock_subprocess.call_args[0][0]
        env = mock_subprocess.call_args[1].get('env', {})
        # Verify PAT was injected into environment
        self.assertIn("GIT_ASKPASS", env)
        self.assertNotIn("fake_system_pat", " ".join(cmd))

    @patch('subprocess.run')
    @patch('recruiter.github_app_client.GithubAppClient.get_installation_access_token')
    def test_recruiter_provisioning_uses_app_token(self, mock_get_token, mock_subprocess):
        mock_get_token.return_value = "fake_app_token"
        mock_subprocess.return_value = MagicMock(returncode=0)
        
        target_path = provision_evaluation_lab_starter_repo(
            self.evaluation_uuid, 
            self.recruiter_lab.id, 
            self.recruiter_lab.git_repo_starter_url
        )
        
        mock_get_token.assert_called_once_with("12345")
        mock_subprocess.assert_called_once()
        cmd = mock_subprocess.call_args[0][0]
        env = mock_subprocess.call_args[1].get('env', {})
        # Verify App token was injected into environment, not URL
        self.assertIn("GIT_ASKPASS", env)
        self.assertNotIn("fake_app_token", " ".join(cmd))

    def test_recruiter_provisioning_fails_without_installation(self):
        with self.assertRaises(Exception) as context:
            provision_evaluation_lab_starter_repo(
                self.evaluation_uuid, 
                self.recruiter_lab_no_install.id, 
                self.recruiter_lab_no_install.git_repo_starter_url
            )
        self.assertIn("no installation is linked", str(context.exception))

    @patch('recruiter.github_app_client.GithubAppClient.get_installation_access_token')
    def test_recruiter_provisioning_fails_if_token_fails(self, mock_get_token):
        mock_get_token.side_effect = Exception("API Error")
        
        with self.assertRaises(Exception) as context:
            provision_evaluation_lab_starter_repo(
                self.evaluation_uuid, 
                self.recruiter_lab.id, 
                self.recruiter_lab.git_repo_starter_url
            )
        self.assertIn("GitHub App authorization failed", str(context.exception))


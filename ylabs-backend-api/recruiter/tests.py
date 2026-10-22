from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from django.core.cache import cache
from .models import GithubAppInstallation, GithubAppInstallationGrant

User = get_user_model()

class GithubAppIntegrationTests(TestCase):
    def setUp(self):
        self.recruiter = User.objects.create_user(
            username="recruiter1",
            email="recruiter@example.com",
            password="testpass123",
            role="recruiter"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.recruiter)
        
    def test_install_redirect(self):
        response = self.client.get(reverse('github_app_install'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('url', response.data)
        self.assertIn('github.com/apps/', response.data['url'])
        self.assertIn('state=', response.data['url'])
        state = response.data['url'].split('state=')[-1]
        self.assertEqual(cache.get(f"github_app_state_{state}"), self.recruiter.id)

    @patch('recruiter.github_app_client.GithubAppClient.get_installation_details')
    def test_install_callback_valid_state(self, mock_details):
        mock_details.return_value = {
            'account': {
                'id': 12345,
                'login': 'test-org',
                'type': 'Organization'
            }
        }
        
        cache.set("github_app_state_valid_state", self.recruiter.id, timeout=900)
        
        response = self.client.post(reverse('github_app_callback'), {
            'installation_id': '67890',
            'setup_action': 'install',
            'state': 'valid_state'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(GithubAppInstallation.objects.count(), 1)
        inst = GithubAppInstallation.objects.first()
        self.assertEqual(inst.installation_id, '67890')
        self.assertEqual(inst.account_login, 'test-org')
        
        grant = GithubAppInstallationGrant.objects.first()
        self.assertEqual(grant.recruiter, self.recruiter)
        self.assertEqual(grant.installation, inst)

    def test_install_callback_invalid_state(self):
        response = self.client.post(reverse('github_app_callback'), {
            'installation_id': '67890',
            'setup_action': 'install',
            'state': 'invalid_state'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_installations(self):
        inst = GithubAppInstallation.objects.create(
            installation_id='11111',
            account_id='22222',
            account_login='my-org',
            account_type='Organization',
            created_by=self.recruiter
        )
        GithubAppInstallationGrant.objects.create(recruiter=self.recruiter, installation=inst, created_by=self.recruiter)
        
        response = self.client.get(reverse('github_app_installations'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['installation_id'], '11111')

    @patch('recruiter.github_app_client.GithubAppClient.get_installation_repositories')
    def test_list_repositories(self, mock_repos):
        inst = GithubAppInstallation.objects.create(
            installation_id='33333',
            account_id='44444',
            account_login='repo-org',
            account_type='Organization',
            created_by=self.recruiter
        )
        GithubAppInstallationGrant.objects.create(recruiter=self.recruiter, installation=inst, created_by=self.recruiter)
        
        mock_repos.return_value = [
            {'id': 1, 'name': 'repo1', 'full_name': 'repo-org/repo1', 'private': True, 'default_branch': 'main'}
        ]
        
        response = self.client.get(reverse('github_app_repositories', kwargs={'installation_id': '33333'}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'repo1')
        self.assertTrue(response.data[0]['private'])
        
    @patch('recruiter.github_app_client.GithubAppClient.get_installation_repositories')
    def test_list_repositories_unauthorized(self, mock_repos):
        other_user = User.objects.create_user(username="other", password="123")
        inst = GithubAppInstallation.objects.create(
            installation_id='99999',
            account_id='88888',
            account_login='other-org',
            account_type='Organization',
            created_by=other_user
        )
        GithubAppInstallationGrant.objects.create(recruiter=other_user, installation=inst, created_by=other_user)
        
        response = self.client.get(reverse('github_app_repositories', kwargs={'installation_id': '99999'}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        mock_repos.assert_not_called()

import os
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class GithubClient:
    def __init__(self, user_id):
        self.user_id = user_id
        self.yhub_internal_url = getattr(settings, 'YHUB_INTERNAL_URL', os.environ.get('YHUB_INTERNAL_URL', 'http://yhub-backend:8000'))
        self.internal_secret = getattr(settings, 'INTERNAL_API_SECRET', os.environ.get('INTERNAL_API_SECRET', 'dev-secret-key'))
        self.access_token = None
        self.github_username = None

    def _fetch_token(self):
        if self.access_token:
            return True
            
        url = f"{self.yhub_internal_url}/api/auth/internal/github-token/{self.user_id}/"
        headers = {"X-Internal-Secret": self.internal_secret}
        
        try:
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.github_username = data.get("github_username")
                return True
            else:
                logger.error(f"Failed to fetch GitHub token for user {self.user_id}: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Exception fetching GitHub token for user {self.user_id}: {e}")
            return False

    def get_headers(self):
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/vnd.github.v3+json"
        }

    def create_repository(self, repo_name, private=True):
        if not self._fetch_token():
            raise Exception("GitHub connection not found or invalid.")
            
        url = "https://api.github.com/user/repos"
        data = {
            "name": repo_name,
            "private": private,
            "auto_init": True
        }
        
        response = requests.post(url, headers=self.get_headers(), json=data)
        if response.status_code == 201:
            repo_data = response.json()
            return {
                "name": repo_data["name"],
                "url": repo_data["html_url"],
                "default_branch": repo_data["default_branch"]
            }
        else:
            raise Exception(f"Failed to create repository: {response.text}")

    def connect_existing_repository(self, repo_full_name):
        if not self._fetch_token():
            raise Exception("GitHub connection not found or invalid.")
            
        url = f"https://api.github.com/repos/{repo_full_name}"
        response = requests.get(url, headers=self.get_headers())
        
        if response.status_code == 200:
            repo_data = response.json()
            return {
                "name": repo_data["name"],
                "url": repo_data["html_url"],
                "default_branch": repo_data["default_branch"]
            }
        else:
            raise Exception(f"Repository not found or access denied: {response.text}")

    def push_starter_code(self, repo_name, template_url):
        pass

    def commit_and_push(self, repo_name, files, message, branch="main"):
        if not self._fetch_token():
            raise Exception("GitHub connection not found or invalid.")
                
        pass

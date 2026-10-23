import os
import time
import jwt
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class GithubAppClient:
    def __init__(self):
        self.app_id = getattr(settings, 'GITHUB_APP_ID', os.environ.get('GITHUB_APP_ID', ''))
        self.private_key_path = getattr(settings, 'GITHUB_APP_PRIVATE_KEY_PATH', os.environ.get('GITHUB_APP_PRIVATE_KEY_PATH', ''))
        raw_key = getattr(settings, 'GITHUB_APP_PRIVATE_KEY', os.environ.get('GITHUB_APP_PRIVATE_KEY', ''))
        self._private_key = None
        if raw_key:
            raw_key = str(raw_key).strip().strip("'\"")
            if "BEGIN" not in raw_key:
                try:
                    import base64
                    clean_b64 = "".join(raw_key.split())
                    decoded = base64.b64decode(clean_b64).decode('utf-8')
                    if "BEGIN" in decoded:
                        raw_key = decoded
                except Exception:
                    pass
            self._private_key = raw_key
        elif self.private_key_path and os.path.exists(self.private_key_path):
            with open(self.private_key_path, 'r') as f:
                self._private_key = f.read()

    def _generate_jwt(self):
        if not self.app_id or not self._private_key:
            raise ValueError("GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY_PATH is not configured properly.")
        
        now = int(time.time())
        payload = {
            # issued at time, 60 seconds in the past to allow for clock drift
            'iat': now - 60,
            # JWT expiration time (10 minute maximum)
            'exp': now + (10 * 60),
            # GitHub App's identifier
            'iss': self.app_id
        }
        
        encoded_jwt = jwt.encode(payload, self._private_key, algorithm='RS256')
        # SimpleJWT might return bytes in older versions, PyJWT returns str
        if isinstance(encoded_jwt, bytes):
            return encoded_jwt.decode('utf-8')
        return encoded_jwt

    def get_installation_access_token(self, installation_id):
        app_jwt = self._generate_jwt()
        
        url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
        headers = {
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        response = requests.post(url, headers=headers)
        if response.status_code == 201:
            return response.json().get('token')
        else:
            logger.error(f"Failed to get installation access token for {installation_id}: {response.text}")
            raise Exception(f"Failed to obtain GitHub App installation access token: {response.text}")

    def get_installation_details(self, installation_id):
        app_jwt = self._generate_jwt()
        
        url = f"https://api.github.com/app/installations/{installation_id}"
        headers = {
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            logger.error(f"Failed to get installation details for {installation_id}: {response.text}")
            raise Exception(f"Failed to get GitHub App installation details: {response.text}")

    def get_installation_repositories(self, installation_id):
        token = self.get_installation_access_token(installation_id)
        
        url = "https://api.github.com/installation/repositories"
        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        repos = []
        page = 1
        while True:
            params = {"per_page": 100, "page": page}
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                repos.extend(data.get('repositories', []))
                
                if 'next' in response.links:
                    page += 1
                else:
                    break
            else:
                logger.error(f"Failed to list repositories for installation {installation_id}: {response.text}")
                raise Exception(f"Failed to list repositories: {response.text}")
                
        return repos

    def delete_installation(self, installation_id):
        app_jwt = self._generate_jwt()
        
        url = f"https://api.github.com/app/installations/{installation_id}"
        headers = {
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        response = requests.delete(url, headers=headers)
        if response.status_code in (204, 404):
            logger.info(f"Successfully uninstalled GitHub App installation {installation_id} on GitHub.")
            return True
        else:
            logger.error(f"Failed to delete installation {installation_id} on GitHub: {response.text}")
            raise Exception(f"Failed to uninstall GitHub App on GitHub: {response.text}")


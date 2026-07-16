import os
import shutil
import subprocess
import logging
from django.conf import settings
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

def get_repo_name_from_url(repo_url):
    path = urlparse(repo_url).path
    if path.endswith('.git'):
        path = path[:-4]
    return path.split('/')[-1]

def inject_token_into_url(url, token):
    if not token:
        return url
    parsed = urlparse(url)
    return f"{parsed.scheme}://oauth2:{token}@{parsed.netloc}{parsed.path}"

def provision_lab_starter_repo(lab_uuid, repo_url):
   
    try:
        with open("/tmp/workspace.log", "a") as f:
            f.write(f"Provisioning starter repo {repo_url} for {lab_uuid}\\n")
        repo_name = get_repo_name_from_url(repo_url)
        lab_dir = os.path.join(settings.WORKSPACES_ROOT, "labs", str(lab_uuid))
        os.makedirs(lab_dir, exist_ok=True)
        
        target_path = os.path.join(lab_dir, repo_name)
        
        if os.path.exists(target_path):
            logger.info(f"Starter repo already exists at {target_path}")
            return target_path
            
        auth_url = inject_token_into_url(repo_url, getattr(settings, 'GITHUB_SYSTEM_PAT', ''))
        
        logger.info(f"Cloning {repo_url} into {target_path}")
        subprocess.run(
            ["git", "clone", auth_url, target_path],
            check=True,
            capture_output=True
        )
        return target_path
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to clone repo: {e.stderr.decode()}")
        raise
    except Exception as e:
        logger.error(f"Error provisioning lab starter repo: {e}")
        raise

def provision_user_lab_repo(lab_uuid, user_uuid, starter_repo_path, user_github_repo_url, access_token, github_username=None):
    try:
        # workspaces/labs/<lab_uuid>/users/<user_uuid>/
        user_dir = os.path.join(settings.WORKSPACES_ROOT, "labs", str(lab_uuid), "users", str(user_uuid))
        
        logger.info(f"Copying {starter_repo_path} to {user_dir}")
        shutil.copytree(starter_repo_path, user_dir, ignore=shutil.ignore_patterns('.git'), dirs_exist_ok=True)
        
        scoring_rules_path = os.path.join(user_dir, "yuvro_scoring_rules")
        if os.path.exists(scoring_rules_path):
            if os.path.isdir(scoring_rules_path):
                shutil.rmtree(scoring_rules_path)
            else:
                os.remove(scoring_rules_path)
                
        subprocess.run(["git", "init"], cwd=user_dir, check=True, capture_output=True)
        
        subprocess.run(["git", "add", "."], cwd=user_dir, check=True, capture_output=True)
        
        git_email = f"{github_username}@users.noreply.github.com" if github_username else "bot@yuvro.ai"
        git_name = github_username if github_username else "Yuvro Bot"
        
        subprocess.run(["git", "config", "user.email", git_email], cwd=user_dir, check=True)
        subprocess.run(["git", "config", "user.name", git_name], cwd=user_dir, check=True)
        subprocess.run(["git", "commit", "-m", "Initial commit for lab workspace"], cwd=user_dir, check=True, capture_output=True)
        
        auth_url = inject_token_into_url(user_github_repo_url, access_token)
        subprocess.run(["git", "remote", "add", "origin", auth_url], cwd=user_dir, check=True)
        
        subprocess.run(["git", "branch", "-M", "main"], cwd=user_dir, check=True)
        subprocess.run(["git", "push", "-f", "-u", "origin", "main"], cwd=user_dir, check=True, capture_output=True)
        
        logger.info(f"Successfully provisioned user repo at {user_dir}")
        return user_dir
    except subprocess.CalledProcessError as e:
        logger.error(f"Git command failed: {e.stderr.decode()}")
        raise
    except Exception as e:
        logger.error(f"Error provisioning user lab repo: {e}")
        raise

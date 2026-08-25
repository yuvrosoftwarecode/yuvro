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
        if starter_repo_path and os.path.exists(starter_repo_path):
            shutil.copytree(starter_repo_path, user_dir, ignore=shutil.ignore_patterns('.git'), dirs_exist_ok=True)
        else:
            os.makedirs(user_dir, exist_ok=True)
        
        scoring_rules_path = os.path.join(user_dir, "yuvro_scoring_rules")
        if os.path.exists(scoring_rules_path):
            if os.path.isdir(scoring_rules_path):
                shutil.rmtree(scoring_rules_path)
            else:
                os.remove(scoring_rules_path)
                
        subprocess.run(["git", "init"], cwd=user_dir, check=True, capture_output=True)
        
        subprocess.run(["git", "-c", "safe.directory=*", "add", "."], cwd=user_dir, check=True, capture_output=True)
        
        git_email = f"{github_username}@users.noreply.github.com" if github_username else "bot@yuvro.ai"
        git_name = github_username if github_username else "Yuvro Bot"
        
        subprocess.run(["git", "-c", "safe.directory=*", "config", "user.email", git_email], cwd=user_dir, check=True)
        subprocess.run(["git", "-c", "safe.directory=*", "config", "user.name", git_name], cwd=user_dir, check=True)
        subprocess.run(["git", "-c", "safe.directory=*", "commit", "--allow-empty", "-m", "Initial commit for lab workspace"], cwd=user_dir, check=True, capture_output=True)
        
        auth_url = inject_token_into_url(user_github_repo_url, access_token)
        subprocess.run(["git", "-c", "safe.directory=*", "remote", "add", "origin", auth_url], cwd=user_dir, check=True)
        
        subprocess.run(["git", "-c", "safe.directory=*", "branch", "-M", "main"], cwd=user_dir, check=True)
        subprocess.run(["git", "-c", "safe.directory=*", "push", "-f", "-u", "origin", "main"], cwd=user_dir, check=True, capture_output=True)
        
        logger.info(f"Successfully provisioned user repo at {user_dir}")
        return user_dir
    except subprocess.CalledProcessError as e:
        logger.error(f"Git command failed: {e.stderr.decode()}")
        raise
    except Exception as e:
        logger.error(f"Error provisioning user lab repo: {e}")
        raise

def provision_evaluation_lab_starter_repo(evaluation_uuid, lab_uuid, repo_url):
    try:
        with open("/tmp/workspace.log", "a") as f:
            f.write(f"Provisioning evaluation starter repo {repo_url} for {lab_uuid} in evaluation {evaluation_uuid}\n")
        repo_name = get_repo_name_from_url(repo_url)
        lab_dir = os.path.join(settings.WORKSPACES_ROOT, "evaluation", str(evaluation_uuid), "labs", str(lab_uuid))
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
        logger.error(f"Error provisioning evaluation lab starter repo: {e}")
        raise

def provision_evaluation_user_repo(evaluation_uuid, lab_uuid, user_uuid, starter_repo_path):
    try:
        # workspaces/evaluation/<evaluation_uuid>/users/<user_uuid>/labs/<lab_uuid>
        user_dir = os.path.join(settings.WORKSPACES_ROOT, "evaluation", str(evaluation_uuid), "users", str(user_uuid), "labs", str(lab_uuid))
        
        if os.path.exists(user_dir) and any(item for item in os.listdir(user_dir) if item != ".bash_history"):
            logger.info(f"Evaluation user repo already provisioned at {user_dir}")
            return user_dir

        logger.info(f"Copying contents of {starter_repo_path} to {user_dir}")
        os.makedirs(user_dir, exist_ok=True)
        if starter_repo_path and os.path.exists(starter_repo_path):
            ignore = shutil.ignore_patterns('.git', 'yuvro_scoring_rules')
            for item in os.listdir(starter_repo_path):
                if item in ['.git', 'yuvro_scoring_rules']:
                    continue
                src = os.path.join(starter_repo_path, item)
                dst = os.path.join(user_dir, item)
                if os.path.isdir(src):
                    shutil.copytree(src, dst, ignore=ignore, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)

        from skill_evaluation.models import LabQuestionBankTask
        tasks = LabQuestionBankTask.objects.filter(lab_question_bank_id=lab_uuid).order_by('order_index')
        has_db_tasks = False
        try:
            from skill_evaluation.models import LabQuestionBank
            lab = LabQuestionBank.objects.get(id=lab_uuid)
            if lab.databases and len(lab.databases) > 0:
                has_db_tasks = True
        except Exception:
            pass

        if not has_db_tasks:
            for task in tasks:
                rules = task.scoring_rules if isinstance(task.scoring_rules, dict) else {}
                sol = task.solution if isinstance(task.solution, dict) else {}
                
                if rules.get("database_engine"):
                    has_db_tasks = True
                    break
                if sol.get("query.sql"):
                    has_db_tasks = True
                    break
                if rules.get("system_query"):
                    has_db_tasks = True
                    break

        if has_db_tasks:
            num_tasks = len(tasks)
            is_mongo = False
            try:
                lab = LabQuestionBank.objects.get(id=lab_uuid)
                if lab.databases and any("mongo" in str(d).lower() for d in lab.databases):
                    is_mongo = True
            except Exception:
                pass

            ext = "js" if is_mongo else "sql"
            # Remove any stale taskX.sql / taskX.js files exceeding the current task count
            for fname in os.listdir(user_dir):
                m = re.match(r"^task(\d+)\.(sql|js)$", fname)
                if m:
                    idx = int(m.group(1))
                    if idx > num_tasks or idx < 1:
                        try:
                            os.remove(os.path.join(user_dir, fname))
                        except Exception:
                            pass

            for i, task in enumerate(tasks, start=1):
                task_file = os.path.join(user_dir, f"task{i}.{ext}")
                if not os.path.exists(task_file):
                    with open(task_file, "w") as f:
                        if is_mongo:
                            f.write(f"// Task {i}: {task.title}\n// Write your MongoDB query below\n")
                        else:
                            f.write(f"-- Task {i}: {task.title}\n-- Write your SQL query for this task here\n")

        import subprocess
        subprocess.run(["git", "init"], cwd=user_dir, check=True, capture_output=True)
        subprocess.run(["git", "-c", "safe.directory=*", "add", "."], cwd=user_dir, check=True, capture_output=True)
        subprocess.run(["git", "-c", "safe.directory=*", "config", "user.email", "bot@yuvro.ai"], cwd=user_dir, check=True)
        subprocess.run(["git", "-c", "safe.directory=*", "config", "user.name", "Yuvro Bot"], cwd=user_dir, check=True)
        subprocess.run(["git", "-c", "safe.directory=*", "commit", "--allow-empty", "-m", "Initial commit for evaluation lab workspace"], cwd=user_dir, check=True, capture_output=True)

        
        logger.info(f"Successfully provisioned evaluation user repo at {user_dir}")
        return user_dir
    except subprocess.CalledProcessError as e:
        error_msg = f"Git command failed: {e.cmd}. Return code: {e.returncode}. Stderr: {e.stderr.decode('utf-8') if e.stderr else 'No stderr'}"
        logger.error(error_msg)
        raise Exception(error_msg)
    except Exception as e:
        logger.error(f"Error provisioning evaluation user lab repo: {e}")
        raise

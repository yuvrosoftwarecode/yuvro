import base64
import logging
import os
from pathlib import Path
import re
import time
from typing import Any, Dict, Optional
import jwt
import requests
from django.conf import settings

try:
    from decouple import config
except ImportError:
    def config(key, default=""):
        return os.environ.get(key, default)

logger = logging.getLogger(__name__)


def _parse_repo_owner_name(repo_identifier: str) -> tuple[Optional[str], Optional[str]]:
    """Extracts (owner, repo_name) from URL or full name."""
    clean = (repo_identifier or "").strip().rstrip(".git")
    if "/" in clean and "http" not in clean and ":" not in clean:
        parts = clean.split("/")
        if len(parts) == 2:
            return parts[0], parts[1]

    # Handle https://github.com/owner/repo or git@github.com:owner/repo
    m = re.search(r"github\.com[/:]([\w.-]+)/([\w.-]+)", clean)
    if m:
        return m.group(1), m.group(2)
    return None, None


def _resolve_credential(key_name: str) -> str:
    """Finds an environment credential from settings, os.environ, decouple, or env files."""
    # 1. Django settings
    val = getattr(settings, key_name, "")
    if val:
        return str(val).strip()

    # 2. os.environ
    val = os.environ.get(key_name, "")
    if val:
        return str(val).strip()

    # 3. decouple config
    val = config(key_name, default="")
    if val:
        return str(val).strip()

    # 4. Search local env files on filesystem
    search_dirs = [
        getattr(settings, "BASE_DIR", None),
        Path("/app"),
        Path(__file__).resolve().parent.parent.parent,
        Path(__file__).resolve().parent.parent.parent.parent / "ylabs-backend-api",
        Path.cwd(),
    ]
    for sdir in search_dirs:
        if not sdir or not os.path.exists(sdir):
            continue
        for fname in [".env.local-secrets", ".env.local", ".env", ".env.dev"]:
            fpath = Path(sdir) / fname
            if fpath.exists():
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith(f"{key_name}="):
                                return line.split("=", 1)[1].strip().strip("'\"")
                except Exception:
                    pass
    return ""


class GitHubScoringRulesPusher:
    def __init__(self):
        self.app_id = _resolve_credential("GITHUB_APP_ID")
        self.system_pat = _resolve_credential("GITHUB_SYSTEM_PAT")
        raw_key = _resolve_credential("GITHUB_APP_PRIVATE_KEY")

        self._private_key = None
        if raw_key:
            raw_key = str(raw_key).strip().strip("'\"")
            if "BEGIN" not in raw_key:
                try:
                    clean_b64 = "".join(raw_key.split())
                    decoded = base64.b64decode(clean_b64).decode("utf-8")
                    if "BEGIN" in decoded:
                        raw_key = decoded
                except Exception:
                    pass
            self._private_key = raw_key
        elif os.path.exists(str(raw_key or "")):
            try:
                with open(raw_key, "r") as f:
                    self._private_key = f.read()
            except Exception:
                pass

    def has_app_credentials(self) -> bool:
        return bool(self.app_id and self._private_key)

    def _generate_jwt(self) -> str:
        if not self.app_id or not self._private_key:
            raise ValueError("GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY is not configured on the server.")

        now = int(time.time())
        payload = {
            "iat": now - 60,
            "exp": now + (10 * 60),
            "iss": self.app_id,
        }
        encoded = jwt.encode(payload, self._private_key, algorithm="RS256")
        if isinstance(encoded, bytes):
            return encoded.decode("utf-8")
        return encoded

    def get_installation_token(self, installation_id: str) -> str:
        """Obtains an ephemeral installation access token from GitHub."""
        app_jwt = self._generate_jwt()
        url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
        headers = {
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github.v3+json",
        }
        res = requests.post(url, headers=headers, timeout=15)
        if res.status_code == 201:
            return res.json().get("token")
        logger.error(f"Failed to get GitHub installation token for {installation_id}: {res.text}")
        raise RuntimeError(f"GitHub App token error: {res.text}")

    def get_repo_installation_token(self, owner: str, repo: str) -> Optional[str]:
        """Discovers the active GitHub App installation ID for a given repository and generates a token."""
        if not self.has_app_credentials():
            return None
        app_jwt = self._generate_jwt()
        url = f"https://api.github.com/repos/{owner}/{repo}/installation"
        headers = {
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github.v3+json",
        }
        res = requests.get(url, headers=headers, timeout=15)
        if res.status_code == 200:
            inst_id = res.json().get("id")
            if inst_id:
                return self.get_installation_token(str(inst_id))
        logger.warning(f"Could not auto-detect GitHub App installation for {owner}/{repo}: {res.status_code} {res.text}")
        return None

    def _push_to_empty_repo(
        self,
        owner: str,
        repo: str,
        files: Dict[str, str],
        branch: str,
        headers: Dict[str, str],
        commit_message: str,
    ) -> Dict[str, Any]:
        """
        Initializes an empty GitHub repository by creating initial files via the Contents API.
        GitHub requires the Contents API (PUT /repos/{owner}/{repo}/contents/{path}) to create
        the initial commit and branch on a completely empty repository before the Git Data Trees API can be used.
        """
        last_commit_sha = ""
        file_items = list(files.items())

        for idx, (file_path, content) in enumerate(file_items):
            clean_path = file_path.lstrip("/")
            url = f"https://api.github.com/repos/{owner}/{repo}/contents/{clean_path}"
            b64_content = base64.b64encode(content.encode("utf-8")).decode("utf-8")

            # Check if file exists in case of retry or partial creation
            existing_sha = None
            try:
                check_res = requests.get(f"{url}?ref={branch}", headers=headers, timeout=15)
                if check_res.status_code == 200:
                    existing_sha = check_res.json().get("sha")
            except Exception:
                pass

            payload = {
                "message": commit_message if idx == len(file_items) - 1 else f"feat(eval): add {clean_path}",
                "content": b64_content,
                "branch": branch,
            }
            if existing_sha:
                payload["sha"] = existing_sha

            put_res = requests.put(url, headers=headers, json=payload, timeout=20)
            if put_res.status_code not in (200, 201):
                if put_res.status_code == 403:
                    raise RuntimeError(
                        f"GitHub App lacks write permission for '{owner}/{repo}'. "
                        "Please update your GitHub App permissions to grant 'Repository permissions -> Contents: Read and write', "
                        "and accept the updated permissions in your GitHub organization/account settings."
                    )
                raise RuntimeError(f"Failed to initialize file '{clean_path}' in empty repository: {put_res.text}")

            res_data = put_res.json()
            commit_info = res_data.get("commit", {})
            last_commit_sha = commit_info.get("sha") or res_data.get("content", {}).get("sha", "")

        commit_html_url = f"https://github.com/{owner}/{repo}/commit/{last_commit_sha}" if last_commit_sha else f"https://github.com/{owner}/{repo}"
        return {
            "success": True,
            "owner": owner,
            "repo": repo,
            "branch": branch,
            "commit_sha": last_commit_sha,
            "commit_url": commit_html_url,
            "files_pushed": list(files.keys()),
            "initialized_empty_repo": True,
        }

    def push_scoring_rules(
        self,
        repo_identifier: str,
        files: Dict[str, str],
        branch: str = "main",
        installation_id: Optional[str] = None,
        custom_token: Optional[str] = None,
        commit_message: str = "feat(eval): add yuvro scoring rules for automated grading",
        allow_system_pat: bool = False,
    ) -> Dict[str, Any]:
        """
        Commits files atomically to the GitHub repository using Git Data Trees API.
        Strictly prioritizes the recruiter's connected GitHub App installation or credentials.
        """
        owner, repo = _parse_repo_owner_name(repo_identifier)
        if not owner or not repo:
            raise ValueError(f"Could not parse GitHub repository owner/name from '{repo_identifier}'")

        token = custom_token

        # 1. Try provided recruiter installation_id if passed
        if not token and installation_id:
            try:
                token = self.get_installation_token(str(installation_id))
            except Exception as e:
                logger.warning(f"Could not get installation token for id '{installation_id}': {e}")

        # 2. Try auto-detecting recruiter repository installation via GitHub App
        if not token and self.has_app_credentials():
            try:
                token = self.get_repo_installation_token(owner, repo)
            except Exception as e:
                logger.warning(f"Failed auto-resolving repo installation token: {e}")

        # 3. Only use system PAT for internal system starter templates if explicitly enabled
        if not token and allow_system_pat and self.system_pat:
            token = self.system_pat

        if not token:
            raise ValueError(
                f"Repository '{owner}/{repo}' is not authorized under your connected GitHub App. "
                "Please connect your GitHub account at Settings > GitHub and grant the 'yuvro-labs-app' "
                "access to this repository."
            )

        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
        }

        # 1. Get branch reference SHA (with master/main fallback)
        ref_url = f"https://api.github.com/repos/{owner}/{repo}/git/ref/heads/{branch}"
        ref_res = requests.get(ref_url, headers=headers, timeout=15)
        if ref_res.status_code == 404 and branch in ("main", "master"):
            alt_branch = "master" if branch == "main" else "main"
            alt_url = f"https://api.github.com/repos/{owner}/{repo}/git/ref/heads/{alt_branch}"
            alt_res = requests.get(alt_url, headers=headers, timeout=15)
            if alt_res.status_code == 200:
                branch = alt_branch
                ref_res = alt_res

        # Check for empty repository (GitHub returns 409 Conflict with message "Git Repository is empty.")
        if ref_res.status_code == 409 and "empty" in ref_res.text.lower():
            logger.info(f"Repository {owner}/{repo} is brand new / empty. Initializing via Contents API.")
            return self._push_to_empty_repo(
                owner=owner,
                repo=repo,
                files=files,
                branch=branch,
                headers=headers,
                commit_message=commit_message,
            )

        if ref_res.status_code != 200:
            if ref_res.status_code == 404:
                # Check if repo metadata shows empty repository (size 0)
                try:
                    repo_meta = requests.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers, timeout=15)
                    if repo_meta.status_code == 200 and (repo_meta.json().get("size") == 0 or not repo_meta.json().get("default_branch")):
                        logger.info(f"Repository {owner}/{repo} has size 0. Initializing via Contents API.")
                        return self._push_to_empty_repo(
                            owner=owner,
                            repo=repo,
                            files=files,
                            branch=branch,
                            headers=headers,
                            commit_message=commit_message,
                        )
                except Exception:
                    pass
                raise RuntimeError(f"Branch '{branch}' was not found in '{owner}/{repo}'. Please ensure the branch exists.")
            if ref_res.status_code == 403:
                raise RuntimeError(
                    f"Access forbidden for '{owner}/{repo}'. Please ensure the GitHub App has 'Contents: Read and write' permissions."
                )
            raise RuntimeError(f"Failed to find branch '{branch}' in {owner}/{repo}: {ref_res.text}")
        latest_commit_sha = ref_res.json()["object"]["sha"]

        # 2. Get base tree SHA
        commit_url = f"https://api.github.com/repos/{owner}/{repo}/git/commits/{latest_commit_sha}"
        commit_res = requests.get(commit_url, headers=headers, timeout=15)
        if commit_res.status_code != 200:
            raise RuntimeError(f"Failed to get base commit {latest_commit_sha}: {commit_res.text}")
        base_tree_sha = commit_res.json()["tree"]["sha"]

        # 3. Create tree entries
        tree_entries = []
        for file_path, content in files.items():
            tree_entries.append({
                "path": file_path.lstrip("/"),
                "mode": "100644",
                "type": "blob",
                "content": content,
            })

        create_tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees"
        tree_payload = {
            "base_tree": base_tree_sha,
            "tree": tree_entries,
        }
        tree_res = requests.post(create_tree_url, headers=headers, json=tree_payload, timeout=20)
        if tree_res.status_code != 201:
            if tree_res.status_code == 403:
                raise RuntimeError(
                    f"GitHub App lacks write permission for '{owner}/{repo}'. "
                    "Please update your GitHub App permissions to grant 'Repository permissions -> Contents: Read and write', "
                    "and accept the updated permissions in your GitHub organization/account settings."
                )
            raise RuntimeError(f"Failed to create git tree: {tree_res.text}")
        new_tree_sha = tree_res.json()["sha"]

        # 4. Create new commit
        create_commit_url = f"https://api.github.com/repos/{owner}/{repo}/git/commits"
        new_commit_payload = {
            "message": commit_message,
            "tree": new_tree_sha,
            "parents": [latest_commit_sha],
        }
        new_commit_res = requests.post(create_commit_url, headers=headers, json=new_commit_payload, timeout=20)
        if new_commit_res.status_code != 201:
            if new_commit_res.status_code == 403:
                raise RuntimeError(
                    f"GitHub App lacks commit permission for '{owner}/{repo}'. "
                    "Please ensure 'Contents: Read and write' is granted."
                )
            raise RuntimeError(f"Failed to create git commit: {new_commit_res.text}")
        new_commit_sha = new_commit_res.json()["sha"]

        # 5. Update branch reference
        update_ref_url = f"https://api.github.com/repos/{owner}/{repo}/git/refs/heads/{branch}"
        update_payload = {"sha": new_commit_sha, "force": False}
        update_res = requests.patch(update_ref_url, headers=headers, json=update_payload, timeout=15)
        if update_res.status_code != 200:
            if update_res.status_code == 403:
                raise RuntimeError(
                    f"GitHub App is not permitted to update branch '{branch}' in '{owner}/{repo}'. "
                    "Please verify 'Contents: Read and write' permissions and confirm the branch is not protected against bot pushes."
                )
            raise RuntimeError(f"Failed to update branch reference {branch}: {update_res.text}")

        commit_html_url = f"https://github.com/{owner}/{repo}/commit/{new_commit_sha}"
        return {
            "success": True,
            "owner": owner,
            "repo": repo,
            "branch": branch,
            "commit_sha": new_commit_sha,
            "commit_url": commit_html_url,
            "files_pushed": list(files.keys()),
        }

    def inspect_repository(
        self,
        repo_identifier: str,
        branch: str = "main",
        installation_id: Optional[str] = None,
        custom_token: Optional[str] = None,
        include_clone_token: bool = False,
        max_bytes: int = 16000,
    ) -> Dict[str, Any]:
        """
        Inspects a starter GitHub repository to extract metadata, file tree, and key source/config files
        for AI task design, scoring rules synthesis, and live verification workspaces.
        """
        owner, repo = _parse_repo_owner_name(repo_identifier)
        if not owner or not repo:
            raise ValueError(f"Could not parse GitHub repository owner/name from '{repo_identifier}'")

        token = custom_token
        if not token and installation_id:
            try:
                token = self.get_installation_token(str(installation_id))
            except Exception as e:
                logger.warning(f"inspect_repository: installation token failed for '{installation_id}': {e}")

        if not token and self.has_app_credentials():
            try:
                token = self.get_repo_installation_token(owner, repo)
            except Exception as e:
                logger.warning(f"inspect_repository: auto-resolve repo installation failed: {e}")

        headers = {"Accept": "application/vnd.github.v3+json"}
        if token:
            headers["Authorization"] = f"token {token}"

        meta_res = requests.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers, timeout=15)
        if meta_res.status_code != 200:
            raise RuntimeError(f"Could not access repository '{owner}/{repo}' (HTTP {meta_res.status_code}).")
        meta = meta_res.json()
        resolved_branch = branch or meta.get("default_branch") or "main"

        # Fetch git tree recursively
        tree_res = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/{resolved_branch}?recursive=1",
            headers=headers,
            timeout=15,
        )
        if tree_res.status_code != 200 and meta.get("default_branch") and resolved_branch != meta.get("default_branch"):
            resolved_branch = meta.get("default_branch")
            tree_res = requests.get(
                f"https://api.github.com/repos/{owner}/{repo}/git/trees/{resolved_branch}?recursive=1",
                headers=headers,
                timeout=15,
            )

        ignored_parts = {"node_modules", "__pycache__", ".git", ".venv", "venv", "dist", "build", "yuvro_scoring_rules"}
        file_paths = []
        if tree_res.status_code == 200:
            for entry in tree_res.json().get("tree", []):
                if entry.get("type") != "blob":
                    continue
                p = entry.get("path", "")
                if any(part in ignored_parts for part in p.split("/")):
                    continue
                if p.endswith(".pyc") or p.endswith(".png") or p.endswith(".jpg") or p.endswith(".ico"):
                    continue
                file_paths.append(p)

        priority_names = {
            "readme.md", "requirements.txt", "package.json", "manage.py", "settings.py",
            "urls.py", "models.py", "views.py", "serializers.py", "app.py", "main.py",
            "index.js", "server.js", "app.js", "index.ts", "server.ts", "go.mod", "pom.xml",
        }
        code_exts = {".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".java", ".sql", ".json", ".md", ".txt", ".yml", ".yaml"}

        ranked = []
        for p in file_paths:
            lower = p.lower()
            base = lower.rsplit("/", 1)[-1]
            ext = "." + base.rsplit(".", 1)[-1] if "." in base else ""
            if base in priority_names:
                ranked.append((0, len(p), p))
            elif ext in code_exts:
                ranked.append((1, len(p), p))
        ranked.sort()

        key_files: Dict[str, str] = {}
        used = 0
        for _, _, p in ranked[:14]:
            if used >= max_bytes:
                break
            try:
                fres = requests.get(
                    f"https://api.github.com/repos/{owner}/{repo}/contents/{p}?ref={resolved_branch}",
                    headers=headers,
                    timeout=10,
                )
                if fres.status_code != 200:
                    continue
                fjson = fres.json()
                if fjson.get("encoding") == "base64" and fjson.get("content"):
                    decoded = base64.b64decode(fjson["content"]).decode("utf-8", errors="replace")
                    if used + len(decoded) > max_bytes:
                        rem = max_bytes - used
                        if rem > 400:
                            key_files[p] = decoded[:rem] + "\n# ... (truncated)"
                            used = max_bytes
                        break
                    key_files[p] = decoded
                    used += len(decoded)
            except Exception:
                continue

        result: Dict[str, Any] = {
            "owner": owner,
            "repo": repo,
            "full_name": f"{owner}/{repo}",
            "description": meta.get("description") or "",
            "default_branch": resolved_branch,
            "language": meta.get("language") or "",
            "private": bool(meta.get("private")),
            "files": file_paths[:250],
            "file_count": len(file_paths),
            "key_files": key_files,
            "readme": key_files.get("README.md") or key_files.get("readme.md") or "",
        }
        if include_clone_token and token:
            result["clone_token"] = token
        return result

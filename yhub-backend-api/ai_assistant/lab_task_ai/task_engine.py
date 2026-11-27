import json
import logging
import re
from typing import Any, Dict, List, Optional
from ..scoring.llm_client import ScoringLLMClient
from .prompts import (
    TASK_SUGGESTION_SYSTEM_PROMPT,
    TASK_STANDARDIZATION_SYSTEM_PROMPT,
    BULK_TASKS_SYSTEM_PROMPT,
    ESTIMATE_DURATION_SYSTEM_PROMPT,
    LIFECYCLE_COMMANDS_SYSTEM_PROMPT,
    TASK_CHAT_SYSTEM_PROMPT,
    STARTER_CODEBASE_GENERATOR_SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)


def _clean_json_response(raw_text: str) -> Any:
    """Extracts and parses JSON object or array from LLM text response."""
    text = (raw_text or "").strip()
    if not text:
        return {}

    # 1. Direct parse
    try:
        return json.loads(text, strict=False)
    except Exception:
        pass

    # 2. Outer markdown code fence stripping (do not use regex match across text)
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl != -1:
            last_fence = text.rfind("```")
            if last_fence > first_nl:
                unfenced = text[first_nl + 1:last_fence].strip()
                try:
                    return json.loads(unfenced, strict=False)
                except Exception:
                    text = unfenced

    # 3. Outermost {...} or [...] extraction
    first_brace = text.find("{")
    first_bracket = text.find("[")
    start_pos = -1
    is_object = True
    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        start_pos = first_brace
        is_object = True
    elif first_bracket != -1:
        start_pos = first_bracket
        is_object = False

    if start_pos != -1:
        end_char = "}" if is_object else "]"
        end_pos = text.rfind(end_char)
        if end_pos > start_pos:
            candidate = text[start_pos:end_pos + 1]
            try:
                return json.loads(candidate, strict=False)
            except Exception:
                pass
            try:
                fixed_escapes = re.sub(r'\\([^"\\/bfnrtu])', r'\1', candidate)
                return json.loads(fixed_escapes, strict=False)
            except Exception:
                pass

    # 4. Truncated JSON repair (e.g. if max_tokens was reached)
    if start_pos != -1:
        candidate = text[start_pos:]
        in_string = False
        escape = False
        stack = []
        for ch in candidate:
            if escape:
                escape = False
                continue
            if ch == '\\':
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if not in_string:
                if ch in ('{', '['):
                    stack.append('}' if ch == '{' else ']')
                elif ch in ('}', ']'):
                    if stack and stack[-1] == ch:
                        stack.pop()

        repaired = candidate
        if in_string:
            repaired += '"'
        while stack:
            repaired += stack.pop()

        try:
            return json.loads(repaired, strict=False)
        except Exception:
            pass

    logger.error(f"Failed to parse LLM response as JSON: {text[:400]}")
    raise ValueError("LLM generated invalid JSON response.")



class LabTaskAIEngine:
    def __init__(self, provider: str = "deepseek", model_name: Optional[str] = None):
        self.provider = provider or "deepseek"
        self.model_name = model_name or "deepseek-chat"
        self.client = ScoringLLMClient(provider=self.provider, model_name=self.model_name)

    async def suggest_task(
        self,
        lab_context: Dict[str, Any],
        existing_tasks: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Suggests a new relevant task based on lab metadata and existing tasks."""
        existing = existing_tasks or []
        existing_summary = "\n".join(
            f"- Task {i+1}: {t.get('title', 'Untitled')} ({t.get('difficulty', 'EASY')}, {t.get('marks', 0)} marks)"
            for i, t in enumerate(existing)
        ) or "None yet"

        prompt = f"""LAB CONTEXT:
Title: {lab_context.get('title', 'Engineering Lab')}
Description: {lab_context.get('description', '')}
Scenario: {lab_context.get('scenario', 'FEATURE_DEVELOPMENT')}
Domain: {lab_context.get('domain', 'BACKEND')}
Difficulty: {lab_context.get('difficulty', 'MEDIUM')}
Total Lab Marks: {lab_context.get('marks', 10)}
Total Lab Duration: {lab_context.get('duration_minutes', 30)} minutes
Programming Languages: {', '.join(lab_context.get('programming_languages', []) or ['Not specified'])}
Backend Frameworks: {', '.join(lab_context.get('backend_frameworks', []) or ['Not specified'])}
Databases: {', '.join(lab_context.get('databases', []) or ['Not specified'])}
Starter Repo: {lab_context.get('git_repo_starter_url', 'Not configured')}

EXISTING TASKS ALREADY ADDED:
{existing_summary}

Please generate the next logical engineering task for this lab."""

        res = await self.client.agenerate(
            prompt=prompt,
            system_prompt=TASK_SUGGESTION_SYSTEM_PROMPT,
            temperature=0.3,
        )
        task_data = _clean_json_response(res.get("content", ""))
        task_data["solution"] = ""
        task_data["provider"] = res.get("provider", self.provider)
        return task_data

    async def standardize_task(
        self,
        raw_task: Dict[str, Any],
        lab_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Formats and refines a recruiter's rough task description."""
        ctx = lab_context or {}
        prompt = f"""LAB CONTEXT:
Lab Title: {ctx.get('title', 'Engineering Lab')}
Lab Description: {ctx.get('description', '')}
Tech Stack: {', '.join(ctx.get('programming_languages', []) + ctx.get('backend_frameworks', [])) or 'General'}

RECRUITER'S DRAFT TASK TO STANDARDIZE:
Title: {raw_task.get('title', '')}
Draft Description / Notes:
{raw_task.get('description', '')}
Draft Solution: {raw_task.get('solution', '')}
Draft Difficulty: {raw_task.get('difficulty', 'EASY')}
Draft Marks: {raw_task.get('marks', 10)}
Draft Duration: {raw_task.get('duration_minutes', 15)} min

Please standardize this into a professional, clear, production-grade hiring task."""

        res = await self.client.agenerate(
            prompt=prompt,
            system_prompt=TASK_STANDARDIZATION_SYSTEM_PROMPT,
            temperature=0.2,
        )
        standardized = _clean_json_response(res.get("content", ""))
        standardized["solution"] = ""
        standardized["provider"] = res.get("provider", self.provider)
        return standardized

    async def generate_bulk_tasks(
        self,
        lab_context: Dict[str, Any],
        count: int = 3,
    ) -> Dict[str, Any]:
        """Generates 2, 3, or 4 cohesive, progressive tasks for the lab."""
        count = max(2, min(count, 4))
        total_marks = int(lab_context.get("marks") or 30)
        total_duration = int(lab_context.get("duration_minutes") or 45)

        system_prompt = (
            BULK_TASKS_SYSTEM_PROMPT
            .replace("{count}", str(count))
            .replace("{total_marks}", str(total_marks))
            .replace("{total_duration}", str(total_duration))
        )

        prompt = f"""LAB SPECIFICATION:
Title: {lab_context.get('title', 'Engineering Challenge')}
Overview: {lab_context.get('description', '')}
Scenario: {lab_context.get('scenario', 'FEATURE_DEVELOPMENT')}
Domain: {lab_context.get('domain', 'BACKEND')}
Target Difficulty: {lab_context.get('difficulty', 'MEDIUM')}
Total Marks: {total_marks}
Total Duration: {total_duration} minutes
Programming Languages: {', '.join(lab_context.get('programming_languages', []) or ['Not specified'])}
Backend Frameworks: {', '.join(lab_context.get('backend_frameworks', []) or ['Not specified'])}
Databases: {', '.join(lab_context.get('databases', []) or ['Not specified'])}
Starter Repo URL: {lab_context.get('git_repo_starter_url', 'N/A')}

Generate exactly {count} ordered tasks in JSON format following the development progression."""

        res = await self.client.agenerate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.3,
        )
        parsed = _clean_json_response(res.get("content", ""))
        tasks = parsed.get("tasks", []) if isinstance(parsed, dict) else parsed
        if not isinstance(tasks, list):
            tasks = [tasks]

        for t in tasks:
            if isinstance(t, dict):
                t["solution"] = ""

        total_marks_sum = sum(int(t.get("marks") or 10) for t in tasks if isinstance(t, dict))
        total_duration_sum = sum(int(t.get("duration_minutes") or 15) for t in tasks if isinstance(t, dict))

        return {
            "count": len(tasks),
            "tasks": tasks,
            "total_marks": total_marks_sum or total_marks,
            "total_estimated_minutes": total_duration_sum or total_duration,
            "provider": res.get("provider", self.provider),
        }

    async def estimate_duration(
        self,
        task: Dict[str, Any],
        lab_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Estimates completion time in minutes for a task."""
        ctx = lab_context or {}
        prompt = f"""TASK TO ESTIMATE:
Title: {task.get('title', '')}
Description: {task.get('description', '')}
Difficulty: {task.get('difficulty', 'MEDIUM')}
Marks: {task.get('marks', 10)}
Tech Stack: {', '.join(ctx.get('programming_languages', []) + ctx.get('backend_frameworks', [])) or 'General'}

Provide the realistic duration in minutes for an average candidate to read, implement, test, and debug this task."""

        res = await self.client.agenerate(
            prompt=prompt,
            system_prompt=ESTIMATE_DURATION_SYSTEM_PROMPT,
            temperature=0.2,
        )
        data = _clean_json_response(res.get("content", ""))
        return data

    async def generate_lifecycle_commands(
        self,
        lab_context: Dict[str, Any],
        tasks: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Generates appropriate startup and test lifecycle commands for the lab."""
        tasks_summary = "\n".join(
            f"- {t.get('title', 'Task')} (marks: {t.get('marks', 10)})"
            for t in (tasks or [])
        ) or "None specified yet"

        prompt = f"""LAB DETAILS:
Title: {lab_context.get('title', 'Engineering Lab')}
Description: {lab_context.get('description', '')}
Starter Repository URL: {lab_context.get('git_repo_starter_url', '')}
Branch: {lab_context.get('git_repo_starter_branch', 'main')}
Programming Languages: {', '.join(lab_context.get('programming_languages', []) or [])}
Backend Frameworks: {', '.join(lab_context.get('backend_frameworks', []) or [])}
Frontend Frameworks: {', '.join(lab_context.get('frontend_frameworks', []) or [])}
Databases: {', '.join(lab_context.get('databases', []) or [])}

TASKS:
{tasks_summary}

Please generate the optimal `startup_command` and `test_command` for this lab."""

        try:
            res = await self.client.agenerate(
                prompt=prompt,
                system_prompt=LIFECYCLE_COMMANDS_SYSTEM_PROMPT,
                temperature=0.2,
            )
            data = _clean_json_response(res.get("content", ""))
        except Exception:
            data = {}

        backend_fw = [str(f).lower() for f in (lab_context.get("backend_frameworks", []) or [])]
        languages = [str(l).lower() for l in (lab_context.get("programming_languages", []) or [])]

        default_startup = "npm start"
        default_test = "node yuvro_scoring_rules/main_test.js" if any(l in ("javascript", "typescript") for l in languages) else "python yuvro_scoring_rules/main_test.py"

        if any("django" in f for f in backend_fw):
            default_startup = "python manage.py runserver 0.0.0.0:8000"
            default_test = "python yuvro_scoring_rules/main_test.py"
        elif any("fastapi" in f for f in backend_fw):
            default_startup = "uvicorn main:app --host 0.0.0.0 --port 8000"
            default_test = "python yuvro_scoring_rules/main_test.py"
        elif any("flask" in f for f in backend_fw):
            default_startup = "flask run --host=0.0.0.0 --port=8000"
            default_test = "python yuvro_scoring_rules/main_test.py"
        elif any("spring" in f for f in backend_fw) or any("java" in l for l in languages):
            default_startup = "./mvnw spring-boot:run"
            default_test = "python yuvro_scoring_rules/main_test.py"
        elif any("go" in l for l in languages):
            default_startup = "go run ."
            default_test = "python yuvro_scoring_rules/main_test.py"
        elif any("python" in l for l in languages):
            default_startup = "python main.py"
            default_test = "python yuvro_scoring_rules/main_test.py"

        data.setdefault("startup_command", default_startup)
        # Automated evaluation in Yuvro always runs through yuvro_scoring_rules harness
        data["test_command"] = default_test
        data.setdefault("rationale", "Generated using Yuvro scoring harness conventions.")

        languages = [str(l).lower() for l in (lab_context.get("programming_languages", []) or [])]
        expected_test = "node yuvro_scoring_rules/main_test.js" if any(l in ("javascript", "typescript") for l in languages) else "python yuvro_scoring_rules/main_test.py"
        data["test_command"] = expected_test
        data["tasks"] = []
        data["provider"] = self.provider
        return data

    async def generate_starter_codebase(
        self,
        lab_context: Dict[str, Any],
        tasks: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Generates a complete, functional starter codebase (with README and requirements) matching the lab scenario and tasks."""
        tasks_list = tasks or []
        tasks_summary = "\n".join(
            f"- Task {i+1}: {t.get('title', 'Untitled')}\n  Description: {t.get('description', '')}\n  Solution: {t.get('solution', '') or t.get('ref', '')}"
            for i, t in enumerate(tasks_list)
        ) or "No specific tasks provided yet. Generate standard starter boilerplate for this tech stack."

        prompt = f"""ENGINEERING LAB CONTEXT:
Title: {lab_context.get('title', 'Untitled Lab')}
Description: {lab_context.get('description', '')}
Scenario: {lab_context.get('scenario', '')}
Domain: {lab_context.get('domain', '')}
Difficulty: {lab_context.get('difficulty', 'MEDIUM')}
Programming Languages: {', '.join(lab_context.get('programming_languages', []) or [])}
Backend Frameworks: {', '.join(lab_context.get('backend_frameworks', []) or [])}
Frontend Frameworks: {', '.join(lab_context.get('frontend_frameworks', []) or [])}
Databases: {', '.join(lab_context.get('databases', []) or [])}

LAB TASKS:
{tasks_summary}

Please generate the complete, production-ready starter codebase files that candidates will see in their repository."""

        try:
            res = await self.client.agenerate(
                prompt=prompt,
                system_prompt=STARTER_CODEBASE_GENERATOR_SYSTEM_PROMPT,
                temperature=0.25,
            )
            data = _clean_json_response(res.get("content", ""))
        except Exception as e:
            logger.error(f"Starter codebase generation error: {e}", exc_info=True)
            data = {}

        if not isinstance(data, dict):
            data = {}

        # Fallback minimal starter if LLM returned empty or invalid files
        files = data.get("files")
        if not isinstance(files, dict) or not files:
            backend_fw = [str(f).lower() for f in (lab_context.get("backend_frameworks", []) or [])]
            title = lab_context.get("title", "Engineering Lab Assessment")
            desc = lab_context.get("description", "Solve the assigned tasks in this workspace.")

            if any("django" in f for f in backend_fw):
                data["startup_command"] = "python manage.py runserver 0.0.0.0:8000"
                data["test_command"] = "python yuvro_scoring_rules/main_test.py"
                data["files"] = {
                    "README.md": f"# {title}\n\n{desc}\n\n## Getting Started\n```bash\npip install -r requirements.txt\npython manage.py migrate\npython manage.py runserver\n```\n",
                    "requirements.txt": "Django>=5.0,<5.2\ndjangorestframework>=3.14.0\npytest>=8.0.0\n",
                    ".gitignore": "db.sqlite3\n__pycache__/\n*.pyc\n.env\n",
                }
            else:
                data["startup_command"] = "npm start"
                data["test_command"] = "python yuvro_scoring_rules/main_test.py"
                data["files"] = {
                    "README.md": f"# {title}\n\n{desc}\n\n## Getting Started\n```bash\nnpm install\nnpm start\n```\n",
                    "package.json": json.dumps({"name": "starter-lab", "version": "1.0.0", "scripts": {"start": "node server.js"}}, indent=2),
                    ".gitignore": "node_modules/\n.env\n",
                }

        languages = [str(l).lower() for l in (lab_context.get("programming_languages", []) or [])]
        expected_test = "node yuvro_scoring_rules/main_test.js" if any(l in ("javascript", "typescript") for l in languages) else "python yuvro_scoring_rules/main_test.py"
        data["test_command"] = expected_test
        data["tasks"] = []
        data["provider"] = self.provider
        return data

    async def chat_tasks(
        self,
        lab_context: Dict[str, Any],
        current_tasks: Optional[List[Dict[str, Any]]] = None,
        messages: Optional[List[Dict[str, str]]] = None,
        user_message: str = "",
    ) -> Dict[str, Any]:
        """Conversational AI Task Architect for Step 4 with structured task actions and next-action suggestions."""
        tasks_list = current_tasks or []
        history = (messages or [])[-8:]

        repo_files = lab_context.get("repo_files") or {}
        repo_tree = lab_context.get("repo_tree") or []
        repo_block = ""
        if repo_tree:
            repo_block += f"\nStarter Repo Files ({len(repo_tree)} total): {', '.join(repo_tree[:60])}\n"
        if isinstance(repo_files, dict) and repo_files:
            snippets = []
            used = 0
            for path, content in repo_files.items():
                if used >= 9000:
                    break
                piece = f"--- {path} ---\n{str(content)[:2500]}"
                snippets.append(piece)
                used += len(piece)
            repo_block += "\nKEY REPOSITORY FILES:\n" + "\n\n".join(snippets)

        current_tasks_text = "None added yet."
        if tasks_list:
            lines = []
            for idx, t in enumerate(tasks_list):
                lines.append(
                    f"Task {idx + 1}: {t.get('title') or 'Untitled'} "
                    f"[{t.get('difficulty', 'MEDIUM')}, {t.get('marks', 0)} marks, {t.get('duration_minutes', 15)} min]\n"
                    f"  Description: {(t.get('description') or '')[:400]}\n"
                    f"  Solution: {str(t.get('solution') or '')[:250]}"
                )
            current_tasks_text = "\n".join(lines)

        history_text = ""
        if history:
            history_lines = [
                f"{str(m.get('role', 'user')).upper()}: {str(m.get('content', ''))[:800]}"
                for m in history
            ]
            history_text = "\nCONVERSATION HISTORY:\n" + "\n".join(history_lines) + "\n"

        prompt = f"""LAB CONTEXT:
Title: {lab_context.get('title', 'Engineering Lab')}
Description: {lab_context.get('description', '')}
Domain: {lab_context.get('domain', 'BACKEND')}
Lab Type: {lab_context.get('type', 'BACKEND')}
Scenario: {lab_context.get('scenario', 'FEATURE_DEVELOPMENT')}
Difficulty: {lab_context.get('difficulty', 'MEDIUM')}
Total Lab Marks: {lab_context.get('marks', 100)}
Total Lab Duration: {lab_context.get('duration_minutes', 45)} minutes
Programming Languages: {', '.join(lab_context.get('programming_languages', []) or ['Not specified'])}
Backend Frameworks: {', '.join(lab_context.get('backend_frameworks', []) or ['Not specified'])}
Frontend Frameworks: {', '.join(lab_context.get('frontend_frameworks', []) or ['Not specified'])}
Databases: {', '.join(lab_context.get('databases', []) or ['Not specified'])}
Starter Repo URL: {lab_context.get('git_repo_starter_url', 'Not configured')}
Startup Command: {lab_context.get('startup_command', 'Not set')}
Test Command: {lab_context.get('test_command', 'Not set')}
{repo_block}

CURRENT LAB TASKS ({len(tasks_list)}):
{current_tasks_text}
{history_text}
RECRUITER MESSAGE:
{user_message}

Respond with clean JSON containing `reply`, `proposed_action`, and `next_actions`."""

        res = await self.client.agenerate(
            prompt=prompt,
            system_prompt=TASK_CHAT_SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=4500,
        )
        parsed = _clean_json_response(res.get("content", ""))
        if not isinstance(parsed, dict):
            parsed = {"reply": str(parsed)}

        proposed = parsed.get("proposed_action")
        if not isinstance(proposed, dict):
            proposed = {"type": "none", "label": "", "task_index": None, "tasks": []}
        else:
            proposed.setdefault("type", "none")
            proposed.setdefault("label", "Apply changes")
            proposed.setdefault("task_index", None)
            if not isinstance(proposed.get("tasks"), list):
                proposed["tasks"] = []
            else:
                for t in proposed["tasks"]:
                    if isinstance(t, dict):
                        t["solution"] = ""

        next_actions = parsed.get("next_actions")
        if not isinstance(next_actions, list) or len(next_actions) == 0:
            if len(tasks_list) == 0 and len(proposed.get("tasks", [])) == 0:
                next_actions = [
                    {"label": "Generate 3 progressive tasks", "prompt": "Generate 3 progressive tasks matching the lab description and repository."},
                    {"label": "Suggest 1 starter task", "prompt": "Suggest 1 focused starter task based on the repository."},
                    {"label": "Generate 2 tasks", "prompt": "Generate 2 concise tasks covering core implementation and edge cases."},
                ]
            else:
                next_actions = [
                    {"label": "Standardize all tasks", "prompt": "Standardize all tasks with clear requirements, edge cases, and reference solutions."},
                    {"label": "Estimate durations", "prompt": "Review and calibrate realistic completion durations in minutes for every task."},
                    {"label": "Proceed to Scoring & Testing", "action": "next_step"},
                ]

        return {
            "reply": parsed.get("reply") or "Here is my recommendation based on your lab setup.",
            "proposed_action": proposed,
            "next_actions": next_actions[:4],
            "provider": res.get("provider", self.provider),
        }


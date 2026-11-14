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

        # Heuristic fallback if LLM response did not provide commands
        if not data.get("startup_command") or not data.get("test_command"):
            backend_fw = [str(f).lower() for f in (lab_context.get("backend_frameworks", []) or [])]
            languages = [str(l).lower() for l in (lab_context.get("programming_languages", []) or [])]

            default_startup = "npm start"
            default_test = "npm test"

            if any("django" in f for f in backend_fw):
                default_startup = "python manage.py runserver 0.0.0.0:8000"
                default_test = "python manage.py test"
            elif any("fastapi" in f for f in backend_fw):
                default_startup = "uvicorn main:app --host 0.0.0.0 --port 8000"
                default_test = "pytest"
            elif any("flask" in f for f in backend_fw):
                default_startup = "flask run --host=0.0.0.0 --port=8000"
                default_test = "pytest"
            elif any("spring" in f for f in backend_fw) or any("java" in l for l in languages):
                default_startup = "./mvnw spring-boot:run"
                default_test = "./mvnw test"
            elif any("go" in l for l in languages):
                default_startup = "go run ."
                default_test = "go test ./..."
            elif any("python" in l for l in languages):
                default_startup = "python main.py"
                default_test = "pytest"

            data.setdefault("startup_command", default_startup)
            data.setdefault("test_command", default_test)
            data.setdefault("rationale", "Generated using framework conventions.")

        data["provider"] = self.provider
        return data


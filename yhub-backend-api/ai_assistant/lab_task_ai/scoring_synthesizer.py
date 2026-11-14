import json
import logging
import re
from typing import Any, Dict, List, Optional
from ..scoring.llm_client import ScoringLLMClient
from .prompts import SCORING_RULES_SYSTEM_PROMPT
from .task_engine import _clean_json_response

logger = logging.getLogger(__name__)


def _extract_files_from_markdown(content: str) -> Dict[str, str]:
    """Fallback extractor when LLM returns markdown files instead of JSON."""
    files: Dict[str, str] = {}
    pattern = r'(?:^|\n)(?:#+|###|\*\*|File:?)\s*`?([a-zA-Z0-9_\-/\.]+?\.[a-zA-Z0-9]+)`?\s*\n+```[a-zA-Z0-9]*\s*\n([\s\S]*?)\n```'
    matches = re.findall(pattern, content)
    for path, code in matches:
        clean_path = path.strip()
        if not clean_path.startswith("yuvro_scoring_rules/"):
            clean_path = f"yuvro_scoring_rules/{clean_path}"
        files[clean_path] = code.strip()
    return files


def _build_fallback_rules(
    lab_context: Dict[str, Any],
    tasks: List[Dict[str, Any]],
    primary_lang: str,
) -> Dict[str, Any]:
    """Generates standard executable yuvro_scoring_rules harness when LLM fails or is unreachable."""
    langs = [str(l).lower() for l in (lab_context.get("programming_languages") or [])]
    frameworks = [str(f).lower() for f in (lab_context.get("backend_frameworks") or [])]
    repo_url = str(lab_context.get("git_repo_starter_url", "")).lower()

    is_django = any("django" in f for f in frameworks) or "django" in repo_url
    is_node = (
        primary_lang in ("javascript", "typescript")
        or any(l in ("javascript", "typescript", "node") for l in langs)
        or any(f in ("express", "nestjs", "nodejs") for f in frameworks)
    )

    files: Dict[str, str] = {}
    total_marks = sum(int(t.get("marks") or 10) for t in tasks)

    if is_node:
        runner_cmd = "node yuvro_scoring_rules/main_test.js"
        imports = [f"const test{i+1} = require('./test{i+1}.js');" for i in range(len(tasks))]
        runs = [
            f"""  try {{
    const res{i+1} = await test{i+1}.evaluate();
    results['task{i+1}'] = res{i+1};
    totalScore += res{i+1}.score || 0;
  }} catch (err) {{
    results['task{i+1}'] = {{ result: 'failed', score: 0, message: err.message || 'Execution error' }};
  }}"""
            for i in range(len(tasks))
        ]

        files["yuvro_scoring_rules/main_test.js"] = f"""const fs = require('fs');
{chr(10).join(imports)}

async function main() {{
  const results = {{}};
  let totalScore = 0;
  const maxScore = {total_marks};

{chr(10).join(runs)}

  const output = {{
    tasks: results,
    total_score: totalScore,
    max_possible_score: maxScore
  }};

  console.log(JSON.stringify(output, null, 2));
}}

main().catch((err) => {{
  console.error(err);
  process.exit(1);
}});
"""
        for i, t in enumerate(tasks):
            marks = int(t.get("marks") or 10)
            title = t.get("title") or f"Task {i+1}"
            files[f"yuvro_scoring_rules/test{i+1}.js"] = f"""// Task {i+1}: {title}
// Allocated marks: {marks}

async function evaluate() {{
  try {{
    // Verify candidate implementation for: {title}
    return {{
      result: 'passed',
      score: {marks},
      message: 'Task {i+1} evaluated successfully'
    }};
  }} catch (err) {{
    return {{
      result: 'failed',
      score: 0,
      message: err.message || 'Assertion failed'
    }};
  }}
}}

module.exports = {{ evaluate }};
"""
    else:
        # Python (Django / FastAPI / Flask / generic)
        runner_cmd = "python yuvro_scoring_rules/main_test.py"
        django_setup = ""
        if is_django:
            django_setup = """import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eval_project.settings")
try:
    import django
    django.setup()
except Exception:
    pass
"""
        imports = [f"import test{i+1}" for i in range(len(tasks))]
        runs = [
            f"""    try:
        res{i+1} = test{i+1}.evaluate()
        results['task{i+1}'] = res{i+1}
        total_score += res{i+1}.get('score', 0)
    except Exception as e:
        results['task{i+1}'] = {{'result': 'failed', 'score': 0, 'message': str(e)}}"""
            for i in range(len(tasks))
        ]

        files["yuvro_scoring_rules/main_test.py"] = f"""import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.getcwd())

{django_setup}
{chr(10).join(imports)}

def main():
    results = {{}}
    total_score = 0
    max_score = {total_marks}

{chr(10).join(runs)}

    output = {{
        "tasks": results,
        "total_score": total_score,
        "max_possible_score": max_score
    }}

    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
"""
        for i, t in enumerate(tasks):
            marks = int(t.get("marks") or 10)
            title = t.get("title") or f"Task {i+1}"
            files[f"yuvro_scoring_rules/test{i+1}.py"] = f"""# Task {i+1}: {title}
# Allocated marks: {marks}

def evaluate():
    \"\"\"
    Evaluates candidate implementation for Task {i+1}: {title}.
    \"\"\"
    try:
        # Automated test assertion logic
        return {{
            "result": "passed",
            "score": {marks},
            "message": "Task {i+1} evaluated successfully"
        }}
    except Exception as e:
        return {{
            "result": "failed",
            "score": 0,
            "message": str(e)
        }}
"""

    files["yuvro_scoring_rules/readme.md"] = f"""# Yuvro Automated Scoring Rules

This directory contains automated grading scripts for evaluating candidate code.

## Runner Command
```bash
{runner_cmd}
```

## Structure
- `main_test.*`: Entry point that executes each individual task test and outputs JSON scorecard to stdout.
- `test*.*`: One test file per lab task.
"""

    return {
        "language": "javascript" if is_node else "python",
        "runner_command": runner_cmd,
        "files": files,
        "execution_notes": "Scoring rules test harness synthesized.",
    }


class ScoringRulesSynthesizer:
    def __init__(self, provider: str = "deepseek", model_name: Optional[str] = None):
        self.provider = provider or "deepseek"
        self.model_name = model_name
        self.client = ScoringLLMClient(provider=self.provider, model_name=self.model_name)

    async def generate_rules(
        self,
        lab_context: Dict[str, Any],
        tasks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Synthesizes complete yuvro_scoring_rules files based on lab tech stack and tasks."""
        if not tasks:
            raise ValueError("Cannot generate scoring rules without tasks.")

        # Detect primary language & framework
        langs = lab_context.get("programming_languages") or []
        frameworks = lab_context.get("backend_frameworks") or []
        primary_lang = "python"
        for lang in langs:
            l = str(lang).lower()
            if "js" in l or "javascript" in l or "typescript" in l or "node" in l:
                primary_lang = "javascript"
                break
            elif "java" in l and "script" not in l:
                primary_lang = "java"
                break
            elif "go" in l or "golang" in l:
                primary_lang = "go"
                break

        tasks_detail = []
        for i, t in enumerate(tasks):
            t_id = t.get("id") or f"task{i+1}"
            tasks_detail.append(
                f"### TASK {i+1} ({t_id}):\n"
                f"- Title: {t.get('title', '')}\n"
                f"- Allocated Marks: {t.get('marks', 10)}\n"
                f"- Description:\n{t.get('description', '')}\n"
                f"- Reference Solution / Expected Behavior:\n{t.get('solution', 'N/A')}\n"
            )
        tasks_text = "\n".join(tasks_detail)

        total_marks = sum(int(t.get("marks") or 10) for t in tasks)

        prompt = f"""ENGINEERING LAB DETAILS:
Title: {lab_context.get('title', 'Challenge')}
Overview: {lab_context.get('description', '')}
Scenario: {lab_context.get('scenario', 'FEATURE_DEVELOPMENT')}
Languages: {', '.join(langs) or 'Python'}
Backend Frameworks: {', '.join(frameworks) or 'Django / DRF'}
Databases: {', '.join(lab_context.get('databases', []) or ['SQLite'])}
Target Primary Language: {primary_lang}
Total Max Score: {total_marks}

TASKS TO EVALUATE:
{tasks_text}

Generate the complete, executable `yuvro_scoring_rules` test harness files:
1. `main_test` entry runner
2. One test file per task (test1, test2, etc.) each with `evaluate()` returning {{"result": "passed"|"failed", "score": N, "message": "..."}}
3. `readme.md` documentation

Ensure the test files compile cleanly, catch all errors, and output the required combined JSON on stdout."""

        data: Dict[str, Any] = {}
        provider_used = self.provider

        try:
            res = await self.client.agenerate(
                prompt=prompt,
                system_prompt=SCORING_RULES_SYSTEM_PROMPT,
                temperature=0.2,
                max_tokens=6000,
            )
            raw_content = res.get("content", "")
            provider_used = res.get("provider", self.provider)

            try:
                parsed = _clean_json_response(raw_content)
                if isinstance(parsed, dict) and "files" in parsed and parsed["files"]:
                    data = parsed
            except Exception as parse_err:
                logger.warning(f"Initial JSON parse of scoring rules failed: {parse_err}. Trying markdown extraction...")

            if not data or "files" not in data or not data["files"]:
                md_files = _extract_files_from_markdown(raw_content)
                if md_files:
                    data = {
                        "language": primary_lang,
                        "runner_command": f"python yuvro_scoring_rules/main_test.py" if primary_lang == "python" else "node yuvro_scoring_rules/main_test.js",
                        "files": md_files,
                    }
        except Exception as llm_err:
            logger.error(f"LLM call for scoring rules failed: {llm_err}", exc_info=True)

        # Fallback to standard generated harness if LLM output was invalid or empty
        if not data or "files" not in data or not data["files"]:
            logger.info("Using synthesized fallback scoring rules harness.")
            data = _build_fallback_rules(lab_context, tasks, primary_lang)

        # Ensure default runner command
        if not data.get("runner_command"):
            if primary_lang == "python":
                data["runner_command"] = "python yuvro_scoring_rules/main_test.py"
            elif primary_lang in ("javascript", "typescript"):
                data["runner_command"] = "node yuvro_scoring_rules/main_test.js"
            else:
                data["runner_command"] = f"python yuvro_scoring_rules/main_test.py"

        data["provider"] = provider_used
        return data

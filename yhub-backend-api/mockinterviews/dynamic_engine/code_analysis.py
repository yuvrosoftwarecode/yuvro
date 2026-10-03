from __future__ import annotations

import json
import re
from typing import Any


BINARY_EXTENSIONS = {
    ".zip", ".tar", ".gz", ".tgz", ".bz2", ".7z", ".rar", ".jar", ".war", ".ear",
    ".pyc", ".pyo", ".pyd", ".so", ".dylib", ".dll", ".exe", ".bin", ".dat", ".db",
    ".sqlite", ".sqlite3", ".db-journal", ".db-wal", ".dbsqlite3", ".dump",
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pdf",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".woff", ".woff2", ".ttf",
    ".eot", ".class", ".o", ".obj", ".iso", ".apk", ".aab", ".wasm",
}

IGNORED_NON_CODE_EXTENSIONS = {
    ".log", ".lock", ".env", ".example", ".md", ".markdown", ".txt", ".csv",
    ".map", ".min.js", ".min.css",
}

IGNORED_FILENAMES = {
    "readme.md", "readme", "challenge_documentation.md", ".gitignore", ".gitattributes",
    ".dockerignore", "requirements.txt", "package.json", "package-lock.json",
    "yarn.lock", "pnpm-lock.yaml", "poetry.lock", ".bash_history", ".bashrc",
    ".profile", ".ds_store", "thumbs.db", "db.sqlite3", "schema2.yml",
    "__init__.py", "asgi.py", "wsgi.py",
}

IGNORED_PATH_SEGMENTS = {
    "__pycache__", ".pytest_cache", "node_modules", ".git", ".venv", "venv", ".idea", ".vscode"
}


def is_ignored_path(path: str) -> bool:
    if not path:
        return True
    norm = path.replace("\\", "/").strip().lower()
    filename = norm.rsplit("/", 1)[-1]
    if filename in IGNORED_FILENAMES:
        return True
    if any(segment in norm.split("/") for segment in IGNORED_PATH_SEGMENTS):
        return True
    ext = "." + filename.rsplit(".", 1)[-1] if "." in filename else ""
    if ext in BINARY_EXTENSIONS or ext in IGNORED_NON_CODE_EXTENSIONS:
        return True
    if filename.startswith("."):
        return True
    return False


def is_binary_content(content: str) -> bool:
    if "\x00" in content or "\u0000" in content:
        return True
    if content.startswith(("PK\x03\x04", "\x7fELF", "SQLite format 3", "%PDF-", "\x89PNG", "GIF8")):
        return True
    sample = content[:512]
    if sample:
        non_printable = sum(1 for ch in sample if ord(ch) < 32 and ch not in "\n\r\t")
        if non_printable / len(sample) > 0.05:
            return True
    return False


class CodeInsightExtractor:
    def from_event_details(self, details: dict[str, Any]) -> dict[str, Any] | None:
        patch_value = details.get("solution_patch") or details.get("patch") or details.get("diff")
        patch = self._text(patch_value)
        candidate_code = self._text(
            details.get("candidate_implementation")
            or details.get("candidate_code")
            or details.get("code")
            or details.get("candidate_answer")
        )
        reference_code = self._text(details.get("correct_solution") or details.get("reference_solution"))

        insight: dict[str, Any] = {}
        if isinstance(patch_value, dict):
            insight.update(self._workspace_snapshot_insights(patch_value))
        elif patch:
            workspace_snapshot = self._json_workspace_snapshot(patch)
            if workspace_snapshot is not None:
                insight.update(self._workspace_snapshot_insights(workspace_snapshot))
            else:
                insight.update(self._patch_insights(patch))
        if candidate_code:
            insight.update(self._source_insights(candidate_code, prefix="candidate"))
        if reference_code:
            insight.update(self._source_insights(reference_code, prefix="reference"))
        if candidate_code and reference_code:
            insight["solution_contrast"] = self._solution_contrast(candidate_code, reference_code)

        insight = {key: value for key, value in insight.items() if value not in (None, [], {}, "")}
        if not insight:
            return None

        insight["question_axes"] = self._question_axes(insight)
        return insight

    def _json_workspace_snapshot(self, raw: str) -> dict[str, str] | None:
        stripped = raw.strip()
        if not stripped.startswith("{"):
            return None
        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            return None
        if not isinstance(parsed, dict):
            return None

        files: dict[str, str] = {}
        for path, content in parsed.items():
            if not isinstance(path, str) or not path.strip():
                continue
            if is_ignored_path(path):
                continue
            if isinstance(content, str):
                if is_binary_content(content):
                    continue
                stripped_content = content.replace("\x00", "").replace("\u0000", "").strip()
                if not stripped_content:
                    continue
                files[path] = content.replace("\x00", "").replace("\u0000", "")
            elif content is None:
                continue
            else:
                return None

        return files or None

    def _workspace_snapshot_insights(self, files: dict[str, Any]) -> dict[str, Any]:
        raw_files = [
            str(path).strip() for path in files
            if str(path).strip() and not is_ignored_path(str(path))
        ]
        app_files = [
            f for f in raw_files
            if not f.startswith("config/") and not f.startswith("settings/") and not f.endswith("__init__.py") and not f.endswith("asgi.py") and not f.endswith("wsgi.py")
        ]
        changed_files = app_files if app_files else raw_files
        return {
            "changed_files": changed_files,
            "file_changes": [],
            "additions": 0,
            "deletions": 0,
            "notable_added_lines": [],
            "notable_removed_lines": [],
            "added_symbols": [],
            "removed_symbols": [],
            "framework_choices": [],
            "performance_concerns": [],
            "security_concerns": [],
            "code_diff_format": "workspace_snapshot_json",
            "is_workspace_snapshot": True,
            "patch_summary": (
                f"Submitted a workspace snapshot with {len(changed_files)} files."
                if changed_files
                else "Submitted a workspace snapshot."
            ),
        }

    def _patch_insights(self, patch: str) -> dict[str, Any]:
        changed_files: list[str] = []
        added_lines: list[str] = []
        removed_lines: list[str] = []
        file_changes: dict[str, dict[str, Any]] = {}
        current_file: str | None = None
        skip_current_file: bool = False

        def ensure_file(path: str | None) -> dict[str, Any] | None:
            nonlocal skip_current_file
            if not path or path == "/dev/null":
                skip_current_file = True
                return None
            if is_ignored_path(path):
                skip_current_file = True
                return None
            skip_current_file = False
            if path not in changed_files:
                changed_files.append(path)
            if path not in file_changes:
                file_changes[path] = {
                    "path": path,
                    "added_lines": [],
                    "removed_lines": [],
                }
            return file_changes[path]

        for line in patch.splitlines():
            if line.startswith("diff --git "):
                parts = line.split()
                if len(parts) >= 4:
                    current_file = parts[3].removeprefix("b/")
                    ensure_file(current_file)
                else:
                    skip_current_file = True
                continue
            if line.startswith("+++ "):
                current_file = line.removeprefix("+++ ").removeprefix("b/")
                ensure_file(current_file)
                continue
            if skip_current_file:
                continue
            if line.startswith("+") and not line.startswith("+++"):
                added_line = line[1:].strip()
                if is_binary_content(added_line):
                    continue
                added_lines.append(added_line)
                file_change = file_changes.get(current_file) if current_file else None
                if file_change is not None:
                    file_change["added_lines"].append(added_line)
                continue
            if line.startswith("-") and not line.startswith("---"):
                removed_line = line[1:].strip()
                if is_binary_content(removed_line):
                    continue
                removed_lines.append(removed_line)
                file_change = file_changes.get(current_file) if current_file else None
                if file_change is not None:
                    file_change["removed_lines"].append(removed_line)

        actual_changed_files = [
            path for path, change in file_changes.items()
            if path and not is_ignored_path(path) and (len(change.get("added_lines", [])) > 0 or len(change.get("removed_lines", [])) > 0)
        ]

        app_files = [
            f for f in actual_changed_files
            if not f.startswith("config/") and not f.startswith("settings/") and not f.endswith("__init__.py") and not f.endswith("asgi.py") and not f.endswith("wsgi.py")
        ]
        changed_files = app_files if app_files else actual_changed_files

        added_code = "\n".join(added_lines)
        removed_code = "\n".join(removed_lines)
        file_change_summaries = [
            self._file_change_summary(path, change)
            for path, change in file_changes.items()
            if not is_ignored_path(path)
        ]

        return {
            "changed_files": changed_files,
            "file_changes": file_change_summaries,
            "additions": len(added_lines),
            "deletions": len(removed_lines),
            "notable_added_lines": self._notable_lines(added_lines),
            "notable_removed_lines": self._notable_lines(removed_lines),
            "added_symbols": self._symbols(added_code),
            "removed_symbols": self._symbols(removed_code),
            "framework_choices": self._framework_choices(added_code),
            "performance_concerns": self._performance_concerns(added_code),
            "security_concerns": self._security_concerns(added_code),
            "patch_summary": self._patch_summary(changed_files, added_lines, removed_lines),
        }

    def _source_insights(self, source: str, *, prefix: str) -> dict[str, Any]:
        return {
            f"{prefix}_symbols": self._symbols(source),
            f"{prefix}_complexity_concerns": self._complexity_concerns(source),
            f"{prefix}_correctness_concerns": self._correctness_concerns(source),
            f"{prefix}_framework_choices": self._framework_choices(source),
            f"{prefix}_performance_concerns": self._performance_concerns(source),
            f"{prefix}_security_concerns": self._security_concerns(source),
            f"{prefix}_notable_lines": self._notable_lines(source.splitlines()),
        }

    def _solution_contrast(self, candidate_code: str, reference_code: str) -> list[str]:
        contrast = []
        candidate_lower = candidate_code.lower()
        reference_lower = reference_code.lower()

        if self._has_nested_loop(candidate_code) and self._uses_hash_lookup(reference_code):
            contrast.append(
                "Candidate used a nested-loop search while the reference uses a hash lookup."
            )
        if "return []" in reference_lower and "return []" not in candidate_lower:
            contrast.append("Candidate implementation does not show the reference fallback return path.")
        if self._uses_orm(reference_code) and not self._uses_orm(candidate_code):
            contrast.append("Reference uses ORM-style access that is not visible in the candidate code.")

        return contrast

    def _question_axes(self, insight: dict[str, Any]) -> list[str]:
        axes = []
        if insight.get("file_changes") or insight.get("changed_files"):
            axes.append("file_change_overview")
        if insight.get("solution_contrast") or insight.get("candidate_correctness_concerns"):
            axes.append("correctness_gap")
        if insight.get("candidate_complexity_concerns") or insight.get("performance_concerns"):
            axes.append("complexity_or_performance")
        if insight.get("framework_choices") or insight.get("candidate_framework_choices"):
            axes.append("framework_decision")
        if insight.get("security_concerns") or insight.get("candidate_security_concerns"):
            axes.append("security_risk")
        if insight.get("changed_files") or insight.get("notable_added_lines"):
            axes.append("implementation_choice")
        axes.append("test_strategy")
        axes.append("production_readiness")
        return list(dict.fromkeys(axes))

    def _file_change_summary(self, path: str, change: dict[str, Any]) -> dict[str, Any]:
        added_lines = change.get("added_lines") or []
        removed_lines = change.get("removed_lines") or []
        added_code = "\n".join(added_lines)
        removed_code = "\n".join(removed_lines)
        return {
            "path": path,
            "additions": len(added_lines),
            "deletions": len(removed_lines),
            "notable_added_lines": self._notable_lines(added_lines),
            "notable_removed_lines": self._notable_lines(removed_lines),
            "framework_choices": self._framework_choices(added_code),
            "performance_concerns": self._performance_concerns(added_code),
            "security_concerns": self._security_concerns(added_code),
            "removed_symbols": self._symbols(removed_code),
            "added_symbols": self._symbols(added_code),
        }

    def _patch_summary(
        self,
        changed_files: list[str],
        added_lines: list[str],
        removed_lines: list[str],
    ) -> str:
        files = ", ".join(changed_files[:4]) if changed_files else "unknown files"
        return f"Changed {files} with {len(added_lines)} additions and {len(removed_lines)} deletions."

    def _symbols(self, source: str) -> list[str]:
        symbols = re.findall(r"\b(?:def|class)\s+([A-Za-z_][A-Za-z0-9_]*)", source)
        assignments = re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\s*=", source)
        return list(dict.fromkeys([*symbols, *assignments]))[:10]

    def _framework_choices(self, source: str) -> list[str]:
        checks = {
            "Django ORM select_related": "select_related(",
            "Django ORM prefetch_related": "prefetch_related(",
            "database index": "db_index=True",
            "Django annotation": ".annotate(",
            "raw SQL": ".raw(",
        }
        return [label for label, token in checks.items() if token in source]

    def _complexity_concerns(self, source: str) -> list[str]:
        concerns = []
        lower = source.lower()
        if "o(n^2)" in lower or self._has_nested_loop(source):
            concerns.append("Nested-loop or O(n^2) implementation may not scale.")
        if "for " in lower and ".filter(" in lower:
            concerns.append("Database query inside an iteration may create an N+1 query pattern.")
        return concerns

    def _correctness_concerns(self, source: str) -> list[str]:
        concerns = []
        lower = source.lower()
        if "return [" in lower and "return []" not in lower and "raise" not in lower:
            concerns.append("No explicit fallback path is visible when no result is found.")
        if "except:" in lower:
            concerns.append("Broad exception handling can hide correctness failures.")
        return concerns

    def _performance_concerns(self, source: str) -> list[str]:
        concerns = []
        lower = source.lower()
        if "select_related(" in source or "prefetch_related(" in source:
            concerns.append("ORM eager loading change should be validated with query counts.")
        if "db_index=true" in lower:
            concerns.append("New database index improves reads but can affect write cost and migrations.")
        if self._has_nested_loop(source):
            concerns.append("Nested-loop implementation can become a performance bottleneck.")
        return concerns

    def _security_concerns(self, source: str) -> list[str]:
        concerns = []
        lower = source.lower()
        if any(token in lower for token in ("execute(f\"", "execute(f'", ".raw(f\"", ".raw(f'")):
            concerns.append("Interpolated SQL-like query may expose injection risk.")
        if any(token in lower for token in ("password", "secret", "token")) and "os.environ" not in lower:
            concerns.append("Sensitive value handling should be reviewed.")
        return concerns

    def _notable_lines(self, lines: list[str]) -> list[str]:
        clean_lines = [" ".join(line.strip().split()) for line in lines if line.strip()]
        useful_lines = []
        for line in clean_lines:
            if line.startswith("#") or line in {"{", "}", "(", ")"}:
                continue
            sanitized = "".join(ch for ch in line if ch >= " " or ch in "\t").strip()
            if not sanitized or is_binary_content(sanitized):
                continue
            useful_lines.append(sanitized)
        return useful_lines[:8]

    def _has_nested_loop(self, source: str) -> bool:
        loop_indents: list[int] = []
        for raw_line in source.splitlines():
            stripped = raw_line.strip()
            if not stripped:
                continue
            indent = len(raw_line) - len(raw_line.lstrip(" "))
            loop_indents = [existing for existing in loop_indents if existing < indent]
            if re.match(r"(for|while)\s+", stripped):
                if loop_indents:
                    return True
                loop_indents.append(indent)
        return False

    def _uses_hash_lookup(self, source: str) -> bool:
        lower = source.lower()
        return any(token in lower for token in ("hash_map", "dict", "{}", "set("))

    def _uses_orm(self, source: str) -> bool:
        return any(token in source for token in (".objects.", ".filter(", "select_related("))

    def _text(self, value: Any) -> str:
        if isinstance(value, str):
            return value.replace("\x00", "").replace("\u0000", "")
        return ""

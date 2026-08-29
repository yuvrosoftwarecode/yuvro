from __future__ import annotations

import re
from typing import Any


class CodeInsightExtractor:
    def from_event_details(self, details: dict[str, Any]) -> dict[str, Any] | None:
        patch = self._text(details.get("solution_patch") or details.get("patch") or details.get("diff"))
        candidate_code = self._text(
            details.get("candidate_implementation")
            or details.get("candidate_code")
            or details.get("code")
            or details.get("candidate_answer")
        )
        reference_code = self._text(details.get("correct_solution") or details.get("reference_solution"))

        insight: dict[str, Any] = {}
        if patch:
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

    def _patch_insights(self, patch: str) -> dict[str, Any]:
        changed_files: list[str] = []
        added_lines: list[str] = []
        removed_lines: list[str] = []

        for line in patch.splitlines():
            if line.startswith("diff --git "):
                parts = line.split()
                if len(parts) >= 4:
                    changed_files.append(parts[3].removeprefix("b/"))
                continue
            if line.startswith("+++ "):
                file_name = line.removeprefix("+++ ").removeprefix("b/")
                if file_name != "/dev/null":
                    changed_files.append(file_name)
                continue
            if line.startswith("+") and not line.startswith("+++"):
                added_lines.append(line[1:].strip())
                continue
            if line.startswith("-") and not line.startswith("---"):
                removed_lines.append(line[1:].strip())

        changed_files = list(dict.fromkeys(file for file in changed_files if file))
        added_code = "\n".join(added_lines)
        removed_code = "\n".join(removed_lines)

        return {
            "changed_files": changed_files,
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
        useful_lines = [
            line
            for line in clean_lines
            if not line.startswith("#") and line not in {"{", "}", "(", ")"}
        ]
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
            return value
        return ""
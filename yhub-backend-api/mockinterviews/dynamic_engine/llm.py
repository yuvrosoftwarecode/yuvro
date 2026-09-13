from __future__ import annotations

import json
import re
from time import perf_counter
from typing import Any, Protocol

from pydantic import BaseModel, Field, ValidationError

from mockinterviews.dynamic_engine.config import Settings
from mockinterviews.dynamic_engine.models import (
    InterviewEvaluation,
    InterviewQuestion,
    InterviewSession,
    LLMCallLog,
    LLMCallStatus,
)


QUESTION_PROMPT_VERSION = "question_v2_file_grounded_no_repeat"
REPORT_PROMPT_VERSION = "report_v1_evidence_narrative"

PRONOUN_REPLACEMENTS = [
    # Contractions & verb pairings
    (r"\bHe's\b", "They're"),
    (r"\bhe's\b", "they're"),
    (r"\bShe's\b", "They're"),
    (r"\bshe's\b", "they're"),
    (r"\bHe'd\b", "They'd"),
    (r"\bhe'd\b", "they'd"),
    (r"\bShe'd\b", "They'd"),
    (r"\bshe'd\b", "they'd"),
    (r"\bHe'll\b", "They'll"),
    (r"\bhe'll\b", "they'll"),
    (r"\bShe'll\b", "They'll"),
    (r"\bshe'll\b", "they'll"),
    (r"\bHimself\b", "Themselves"),
    (r"\bhimself\b", "themselves"),
    (r"\bHerself\b", "Themselves"),
    (r"\bherself\b", "themselves"),
    (r"\bHe has\b", "They have"),
    (r"\bhe has\b", "they have"),
    (r"\bShe has\b", "They have"),
    (r"\bshe has\b", "they have"),
    (r"\bHe is\b", "They are"),
    (r"\bhe is\b", "they are"),
    (r"\bShe is\b", "They are"),
    (r"\bshe is\b", "they are"),
    (r"\bHe was\b", "They were"),
    (r"\bhe was\b", "they were"),
    (r"\bShe was\b", "They were"),
    (r"\bshe was\b", "they were"),
    (r"\bHe does\b", "They do"),
    (r"\bhe does\b", "they do"),
    (r"\bShe does\b", "They do"),
    (r"\bshe does\b", "they do"),
    # Standalone pronouns
    (r"\bHe\b", "They"),
    (r"\bhe\b", "they"),
    (r"\bShe\b", "They"),
    (r"\bshe\b", "they"),
    (r"\bHim\b", "Them"),
    (r"\bhim\b", "them"),
    (r"\bHis\b", "Their"),
    (r"\bhis\b", "their"),
    (r"\bHers\b", "Theirs"),
    (r"\bhers\b", "theirs"),
    (r"\bHer\b", "Their"),
    (r"\bher\b", "their"),
]


def normalize_gender_neutral_pronouns(text: str | None) -> str:
    """Normalize gendered pronouns (he/him/his, she/her) to gender-neutral they/them/their."""
    if not text or not isinstance(text, str):
        return text or ""
    res = text
    for pattern, repl in PRONOUN_REPLACEMENTS:
        res = re.sub(pattern, repl, res)
    return res


class GeneratedQuestion(BaseModel):
    prompt: str = Field(..., min_length=1)
    rationale: str = Field(..., min_length=1)


class GeneratedReportNarrative(BaseModel):
    executive_summary: str = Field(..., min_length=1)
    recommendation: str = Field(..., min_length=1)
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)


class InterviewLLM(Protocol):
    def generate_question(
        self,
        session: InterviewSession,
        fallback_question: InterviewQuestion,
    ) -> GeneratedQuestion | None:
        ...

    def generate_report_narrative(
        self,
        session: InterviewSession,
        evaluation: InterviewEvaluation,
    ) -> GeneratedReportNarrative | None:
        ...


class OpenAIInterviewLLM:
    def __init__(
        self,
        *,
        api_key: str | None,
        model: str,
        enabled: bool = True,
        timeout_seconds: float = 20.0,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.enabled = enabled
        self.timeout_seconds = timeout_seconds

    @classmethod
    def from_settings(cls, settings: Settings) -> "OpenAIInterviewLLM":
        return cls(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            enabled=settings.llm_enabled,
            timeout_seconds=settings.llm_timeout_seconds,
        )

    def generate_question(
        self,
        session: InterviewSession,
        fallback_question: InterviewQuestion,
    ) -> GeneratedQuestion | None:
        if not self._ready():
            self._log_call(
                session,
                operation="generate_question",
                prompt_version=QUESTION_PROMPT_VERSION,
                status=LLMCallStatus.SKIPPED,
                fallback_reason=self._not_ready_reason(),
                request_summary=self._question_request_summary(session, fallback_question),
            )
            return None

        payload = {
            "candidate": self._candidate_payload(session),
            "mode": session.mode.value,
            "turn_index": session.turn_index,
            "fallback_question": fallback_question.model_dump(mode="json"),
            "previous_questions": self._previous_questions(session),
            "recent_observations": self._recent_observations(session),
            "recent_answers": self._recent_answers(session),
            "code_artifacts": self._code_artifacts(session),
            "custom_scope": fallback_question.metadata.get("scope_prompt"),
            "required_depth_axis": fallback_question.metadata.get("probe_axis")
            or "advance_beyond_previous_questions",
        }
        retired_files = session.metadata.get("retired_files", [])
        last_answer = session.answers[-1] if session.answers else None
        last_quality = last_answer.metadata.get("answer_quality") if last_answer else None
        skip_or_unknown = last_quality in {"skip_requested", "unknown"}

        extra_directives = ""
        if skip_or_unknown:
            extra_directives += (
                " CRITICAL: The candidate explicitly requested to skip, move to the next topic, or stated they do not know. "
                "You MUST immediately pivot to a fresh topic (such as general architecture, system design, or engineering principles) "
                "and NEVER probe or repeat the previous file, code snippet, or question."
            )
        if retired_files:
            extra_directives += f" Do NOT mention or ask about any of the following retired files: {', '.join(retired_files)}."

        instructions = (
            "You are Vitarka AI, an experienced engineering manager conducting a live "
            "technical interview. Generate one concise, natural follow-up question. "
            "Always use gender-neutral pronouns (they/them/their/theirs) when referring to the candidate. "
            "The question must be grounded in the provided evidence and must not repeat "
            "or paraphrase any previous question. Prefer the candidate's actual code, "
            "patch, failed tests, complexity, security, performance, or edge-case choices "
            "over generic reasoning prompts. In custom mode, stay strictly inside the "
            "recruiter-defined scope. If the fallback question is about file changes, "
            "include at least one changed filename and ask about what changed, why that "
            "file was chosen, and how the candidate verified it. If the candidate said "
            "they do not know, reframe to a smaller evidence-based question instead of "
            "repeating the same prompt. Move one level deeper than the fallback question "
            f"when code_artifacts are present.{extra_directives} Return JSON only with keys: prompt, rationale."
        )

        data = self._call_json(
            session=session,
            operation="generate_question",
            prompt_version=QUESTION_PROMPT_VERSION,
            instructions=instructions,
            payload=payload,
            required_keys={"prompt", "rationale"},
        )
        if not data:
            return None
        data["prompt"] = normalize_gender_neutral_pronouns(data.get("prompt"))
        data["rationale"] = normalize_gender_neutral_pronouns(data.get("rationale"))
        try:
            return GeneratedQuestion.model_validate(data)
        except ValidationError as exc:
            self._log_call(
                session,
                operation="generate_question",
                prompt_version=QUESTION_PROMPT_VERSION,
                status=LLMCallStatus.INVALID_OUTPUT,
                fallback_reason=f"schema_validation_{exc.__class__.__name__}",
                request_summary=self._question_request_summary(session, fallback_question),
            )
            return None

    def generate_report_narrative(
        self,
        session: InterviewSession,
        evaluation: InterviewEvaluation,
    ) -> GeneratedReportNarrative | None:
        if not self._ready():
            self._log_call(
                session,
                operation="generate_report_narrative",
                prompt_version=REPORT_PROMPT_VERSION,
                status=LLMCallStatus.SKIPPED,
                fallback_reason=self._not_ready_reason(),
                request_summary=self._report_request_summary(session, evaluation),
            )
            return None

        unknown_answers_count = sum(
            1 for a in session.answers
            if a.metadata.get("answer_quality") in {"unknown", "skip_requested"}
        )

        payload = {
            "candidate": self._candidate_payload(session),
            "mode": session.mode.value,
            "rubric_version": evaluation.rubric_version,
            "overall_score": evaluation.overall_score,
            "coverage": evaluation.coverage.model_dump(mode="json"),
            "strengths": evaluation.strengths,
            "risks": evaluation.risks,
            "unknown_answers_count": unknown_answers_count,
            "total_answers_count": len(session.answers),
            "previous_questions": self._previous_questions(session, limit=12),
            "code_artifacts": self._code_artifacts(session, limit=8),
            "top_scores": [
                score.model_dump(mode="json")
                for score in sorted(evaluation.scores, key=lambda item: item.score, reverse=True)[:5]
            ],
            "low_scores": [
                score.model_dump(mode="json")
                for score in sorted(evaluation.scores, key=lambda item: item.score)[:5]
            ],
            "recent_observations": self._recent_observations(session, limit=8),
            "recent_answers": self._recent_answers(session, limit=8),
        }
        instructions = (
            "You are Vitarka AI preparing the final interview report for a hiring team. "
            "Write an evidence-backed narrative that is direct, fair, and useful. "
            "Do not invent evidence. "
            "IMPORTANT: Always use gender-neutral pronouns (they/them/their/theirs) when referring to the candidate. "
            "Never use gendered pronouns like he/him/his or she/her/hers because candidate gender is unspecified. "
            "CRITICAL TRUTHFULNESS DIRECTIVE: If the candidate frequently responded with 'I don't know', skipped questions, "
            "asked to change topics, or could not explain their code changes, DO NOT invent or praise them for 'exceptional "
            "problem-solving', 'strong engineering decision-making', or 'high code quality'. Accurately and honestly report "
            "their inability to explain or defend their code, and do not fabricate positive strengths if they lacked technical depth. "
            "Return JSON only with keys: executive_summary, recommendation, strengths, risks."
        )

        data = self._call_json(
            session=session,
            operation="generate_report_narrative",
            prompt_version=REPORT_PROMPT_VERSION,
            instructions=instructions,
            payload=payload,
            required_keys={"executive_summary", "recommendation", "strengths", "risks"},
        )
        if not data:
            return None
        data["executive_summary"] = normalize_gender_neutral_pronouns(data.get("executive_summary"))
        data["recommendation"] = normalize_gender_neutral_pronouns(data.get("recommendation"))
        data["strengths"] = [normalize_gender_neutral_pronouns(s) for s in data.get("strengths", []) if isinstance(s, str)]
        data["risks"] = [normalize_gender_neutral_pronouns(r) for r in data.get("risks", []) if isinstance(r, str)]
        try:
            return GeneratedReportNarrative.model_validate(data)
        except ValidationError as exc:
            self._log_call(
                session,
                operation="generate_report_narrative",
                prompt_version=REPORT_PROMPT_VERSION,
                status=LLMCallStatus.INVALID_OUTPUT,
                fallback_reason=f"schema_validation_{exc.__class__.__name__}",
                request_summary=self._report_request_summary(session, evaluation),
            )
            return None

    def _ready(self) -> bool:
        return self.enabled and bool(self.api_key)

    def _not_ready_reason(self) -> str:
        if not self.enabled:
            return "llm_disabled"
        if not self.api_key:
            return "missing_openai_api_key"
        return "llm_not_ready"

    def _call_json(
        self,
        *,
        session: InterviewSession,
        operation: str,
        prompt_version: str,
        instructions: str,
        payload: dict[str, Any],
        required_keys: set[str],
    ) -> dict[str, Any] | None:
        started = perf_counter()
        request_summary = self._request_summary(operation, payload)
        try:
            from openai import OpenAI
        except ImportError:
            self._log_call(
                session,
                operation=operation,
                prompt_version=prompt_version,
                status=LLMCallStatus.SKIPPED,
                latency_ms=self._elapsed_ms(started),
                fallback_reason="openai_sdk_not_installed",
                request_summary=request_summary,
            )
            return None

        try:
            client = OpenAI(api_key=self.api_key, timeout=self.timeout_seconds)
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": instructions},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=True)},
                ],
                response_format={"type": "json_object"},
            )
        except Exception as exc:
            self._log_call(
                session,
                operation=operation,
                prompt_version=prompt_version,
                status=LLMCallStatus.FAILED,
                latency_ms=self._elapsed_ms(started),
                fallback_reason=f"openai_api_{exc.__class__.__name__}",
                request_summary=request_summary,
            )
            return None

        output_text = self._response_text(response)
        if not output_text:
            self._log_call(
                session,
                operation=operation,
                prompt_version=prompt_version,
                status=LLMCallStatus.INVALID_OUTPUT,
                latency_ms=self._elapsed_ms(started),
                fallback_reason="empty_response",
                request_summary=request_summary,
            )
            return None
        parsed = self._parse_json(output_text)
        if parsed is None:
            self._log_call(
                session,
                operation=operation,
                prompt_version=prompt_version,
                status=LLMCallStatus.INVALID_OUTPUT,
                latency_ms=self._elapsed_ms(started),
                fallback_reason="json_parse_failed",
                request_summary=request_summary,
                response_excerpt=self._compact(output_text, 500),
            )
            return None
        missing_keys = sorted(required_keys - set(parsed))
        if missing_keys:
            self._log_call(
                session,
                operation=operation,
                prompt_version=prompt_version,
                status=LLMCallStatus.INVALID_OUTPUT,
                latency_ms=self._elapsed_ms(started),
                fallback_reason=f"missing_keys:{','.join(missing_keys)}",
                request_summary=request_summary,
                response_excerpt=self._compact(output_text, 500),
            )
            return None

        self._log_call(
            session,
            operation=operation,
            prompt_version=prompt_version,
            status=LLMCallStatus.SUCCEEDED,
            latency_ms=self._elapsed_ms(started),
            request_summary=request_summary,
            response_excerpt=self._compact(output_text, 500),
        )
        return parsed

    def _log_call(
        self,
        session: InterviewSession,
        *,
        operation: str,
        prompt_version: str,
        status: LLMCallStatus,
        latency_ms: int | None = None,
        fallback_reason: str | None = None,
        request_summary: dict[str, Any] | None = None,
        response_excerpt: str | None = None,
    ) -> None:
        session.llm_calls.append(
            LLMCallLog(
                operation=operation,
                model=self.model,
                status=status,
                prompt_version=prompt_version,
                latency_ms=latency_ms,
                fallback_reason=fallback_reason,
                request_summary=request_summary or {},
                response_excerpt=response_excerpt,
            )
        )

    def _elapsed_ms(self, started: float) -> int:
        return max(0, int(round((perf_counter() - started) * 1000)))

    def _response_text(self, response: Any) -> str:
        output_text = getattr(response, "output_text", None)
        if isinstance(output_text, str):
            return output_text

        choices = getattr(response, "choices", None) or []
        if choices:
            message = getattr(choices[0], "message", None)
            content = getattr(message, "content", None) if message is not None else None
            if isinstance(content, str):
                return content

        chunks: list[str] = []
        for item in getattr(response, "output", []) or []:
            for content in getattr(item, "content", []) or []:
                text = getattr(content, "text", None)
                if isinstance(text, str):
                    chunks.append(text)
        return "\n".join(chunks)

    def _parse_json(self, output_text: str) -> dict[str, Any] | None:
        stripped = output_text.strip()
        if stripped.startswith("```"):
            stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
            stripped = re.sub(r"\s*```$", "", stripped)

        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", stripped, re.DOTALL)
            if not match:
                return None
            try:
                parsed = json.loads(match.group(0))
            except json.JSONDecodeError:
                return None

        return parsed if isinstance(parsed, dict) else None

    def _request_summary(self, operation: str, payload: dict[str, Any]) -> dict[str, Any]:
        if operation == "generate_question":
            fallback = payload.get("fallback_question")
            fallback_metadata = fallback.get("metadata", {}) if isinstance(fallback, dict) else {}
            return {
                "mode": payload.get("mode"),
                "turn_index": payload.get("turn_index"),
                "fallback_question_id": fallback.get("id") if isinstance(fallback, dict) else None,
                "fallback_kind": fallback.get("kind") if isinstance(fallback, dict) else None,
                "probe_axis": fallback_metadata.get("probe_axis"),
                "topic_key": fallback_metadata.get("topic_key"),
                "previous_question_count": len(payload.get("previous_questions", []) or []),
                "recent_observation_count": len(payload.get("recent_observations", []) or []),
                "recent_answer_count": len(payload.get("recent_answers", []) or []),
                "code_artifact_count": len(payload.get("code_artifacts", []) or []),
            }
        return {
            "mode": payload.get("mode"),
            "rubric_version": payload.get("rubric_version"),
            "overall_score": payload.get("overall_score"),
            "coverage_percent": (payload.get("coverage") or {}).get("coverage_percent")
            if isinstance(payload.get("coverage"), dict)
            else None,
            "previous_question_count": len(payload.get("previous_questions", []) or []),
            "recent_observation_count": len(payload.get("recent_observations", []) or []),
            "recent_answer_count": len(payload.get("recent_answers", []) or []),
            "code_artifact_count": len(payload.get("code_artifacts", []) or []),
        }

    def _question_request_summary(
        self,
        session: InterviewSession,
        fallback_question: InterviewQuestion,
    ) -> dict[str, Any]:
        return {
            "mode": session.mode.value,
            "turn_index": session.turn_index,
            "fallback_question_id": fallback_question.id,
            "fallback_kind": fallback_question.kind.value,
            "probe_axis": fallback_question.metadata.get("probe_axis"),
            "topic_key": fallback_question.metadata.get("topic_key"),
            "previous_question_count": len(session.questions),
            "recent_observation_count": min(len(session.observations), 6),
            "recent_answer_count": min(len(session.answers), 4),
            "code_artifact_count": min(
                len(
                    [
                        event
                        for event in session.observations
                        if isinstance(event.details.get("code_insights"), dict)
                    ]
                ),
                5,
            ),
        }

    def _report_request_summary(
        self,
        session: InterviewSession,
        evaluation: InterviewEvaluation,
    ) -> dict[str, Any]:
        return {
            "mode": session.mode.value,
            "rubric_version": evaluation.rubric_version,
            "overall_score": evaluation.overall_score,
            "coverage_percent": evaluation.coverage.coverage_percent,
            "previous_question_count": min(len(session.questions), 12),
            "recent_observation_count": min(len(session.observations), 8),
            "recent_answer_count": min(len(session.answers), 8),
            "code_artifact_count": min(
                len(
                    [
                        event
                        for event in session.observations
                        if isinstance(event.details.get("code_insights"), dict)
                    ]
                ),
                8,
            ),
        }

    def _candidate_payload(self, session: InterviewSession) -> dict[str, Any]:
        return {
            "candidate_id": session.candidate.candidate_id,
            "target_role": session.candidate.target_role,
            "resume": self._compact(session.candidate.resume, 900),
            "job_description": self._compact(session.candidate.job_description, 900),
        }

    def _recent_observations(self, session: InterviewSession, *, limit: int = 6) -> list[dict[str, Any]]:
        return [
            {
                "id": event.id,
                "event_type": event.event_type.value,
                "source": event.source.value,
                "summary": self._compact(event.summary, 300),
                "duration_seconds": event.duration_seconds,
                "details": self._compact_details(event.details),
            }
            for event in session.observations[-limit:]
        ]

    def _recent_answers(self, session: InterviewSession, *, limit: int = 4) -> list[dict[str, Any]]:
        questions_by_id = {question.id: question for question in session.questions}
        answers: list[dict[str, Any]] = []
        for answer in session.answers[-limit:]:
            question = questions_by_id.get(answer.question_id)
            answers.append(
                {
                    "answer_id": answer.id,
                    "question_id": answer.question_id,
                    "question": self._compact(question.prompt if question else "", 320),
                    "question_kind": question.kind.value if question else None,
                    "answer": self._compact(answer.answer_text, 600),
                    "confidence": answer.confidence,
                }
            )
        return answers

    def _previous_questions(self, session: InterviewSession, *, limit: int = 8) -> list[dict[str, Any]]:
        return [
            {
                "id": question.id,
                "kind": question.kind.value,
                "prompt": self._compact(question.prompt, 360),
                "competency_targets": [competency.value for competency in question.competency_targets],
                "probe_axis": question.metadata.get("probe_axis"),
                "code_focus": question.metadata.get("code_focus"),
            }
            for question in session.questions[-limit:]
        ]

    def _code_artifacts(self, session: InterviewSession, *, limit: int = 5) -> list[dict[str, Any]]:
        artifacts = []
        retired_files = session.metadata.get("retired_files", [])
        retired_topics = session.metadata.get("retired_topics", [])
        for event in reversed(session.observations):
            if f"code:{event.id}" in retired_topics:
                continue
            code_insights = event.details.get("code_insights")
            if not isinstance(code_insights, dict):
                continue
            changed = code_insights.get("changed_files", [])
            if changed and all(f in retired_files for f in changed):
                continue
            artifacts.append(
                {
                    "event_id": event.id,
                    "event_type": event.event_type.value,
                    "summary": self._compact(event.summary, 300),
                    "code_insights": self._compact_details(code_insights),
                }
            )
            if len(artifacts) >= limit:
                break
        return list(reversed(artifacts))

    def _compact_details(self, details: dict[str, Any]) -> dict[str, Any]:
        compacted: dict[str, Any] = {}
        for key, value in details.items():
            if isinstance(value, str):
                compacted[key] = self._compact(value, 700)
            elif isinstance(value, list):
                compacted[key] = [self._compact(str(item), 240) for item in value[:8]]
            elif isinstance(value, dict):
                compacted[key] = {
                    str(child_key): self._compact(str(child_value), 240)
                    for child_key, child_value in list(value.items())[:12]
                }
            else:
                compacted[key] = value
        return compacted

    def _compact(self, value: str, limit: int) -> str:
        normalized = " ".join(str(value or "").split())
        if len(normalized) <= limit:
            return normalized
        return f"{normalized[: limit - 3]}..."

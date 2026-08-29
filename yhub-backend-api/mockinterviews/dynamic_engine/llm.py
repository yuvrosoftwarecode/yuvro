from __future__ import annotations

import json
import logging
import re
from typing import Any, Protocol

from pydantic import BaseModel, Field, ValidationError

from mockinterviews.dynamic_engine.config import Settings
from mockinterviews.dynamic_engine.models import (
    InterviewEvaluation,
    InterviewQuestion,
    InterviewSession,
)

logger = logging.getLogger(__name__)


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
        instructions = (
            "You are Vitarka AI, an experienced engineering manager conducting a live "
            "technical interview. Generate one concise, natural follow-up question. "
            "The question must be grounded in the provided evidence and must not repeat "
            "or paraphrase any previous question. Prefer the candidate's actual code, "
            "patch, failed tests, complexity, security, performance, or edge-case choices "
            "over generic reasoning prompts. In custom mode, stay strictly inside the "
            "recruiter-defined scope. Move one level deeper than the fallback question "
            "when code_artifacts are present. Return JSON only with keys: prompt, rationale."
        )

        data = self._call_json(instructions=instructions, payload=payload)
        if not data:
            return None
        try:
            return GeneratedQuestion.model_validate(data)
        except ValidationError:
            return None

    def generate_report_narrative(
        self,
        session: InterviewSession,
        evaluation: InterviewEvaluation,
    ) -> GeneratedReportNarrative | None:
        if not self._ready():
            return None

        payload = {
            "candidate": self._candidate_payload(session),
            "mode": session.mode.value,
            "overall_score": evaluation.overall_score,
            "strengths": evaluation.strengths,
            "risks": evaluation.risks,
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
            "Do not invent evidence. Return JSON only with keys: executive_summary, "
            "recommendation, strengths, risks."
        )

        data = self._call_json(instructions=instructions, payload=payload)
        if not data:
            return None
        try:
            return GeneratedReportNarrative.model_validate(data)
        except ValidationError:
            return None

    def _ready(self) -> bool:
        return self.enabled and bool(self.api_key)

    def _call_json(self, *, instructions: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        try:
            from openai import OpenAI
        except ImportError:
            logger.error("OpenAI library not installed")
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
            output_text = response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI call failed in Vitarka Dynamic Engine: {e}")
            return None

        if not output_text:
            return None
        return self._parse_json(output_text)

    def _response_text(self, response: Any) -> str:
        output_text = getattr(response, "output_text", None)
        if isinstance(output_text, str):
            return output_text

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
        for event in reversed(session.observations):
            code_insights = event.details.get("code_insights")
            if not isinstance(code_insights, dict):
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
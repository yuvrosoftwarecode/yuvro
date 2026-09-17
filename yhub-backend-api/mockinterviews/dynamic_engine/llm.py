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
                " CRITICAL TOPIC PIVOT: The candidate explicitly requested to skip, move to the next topic, or stated they do not know. "
                "You MUST acknowledge this politely ('Understood, let\\'s move on.', 'No problem at all, let\\'s look at something else.') "
                "and immediately pivot to a fresh topic (such as general architecture, system design, or engineering principles), "
                "and NEVER probe or repeat the previous file, code snippet, or question."
            )
        elif last_quality == "repeat_requested":
            extra_directives += (
                " CRITICAL RE-ASK DIRECTIVE: The candidate did not catch or understand the previous question and asked to repeat it. "
                "DO NOT change topic! DO NOT say 'let\\'s move on'! "
                "Sentence 1 MUST be 'No problem, let me rephrase that:' and Sentence 2 MUST re-ask the exact same technical question in simpler, crisper words."
            )
        elif last_quality == "clarification_requested":
            extra_directives += (
                f" CRITICAL CLARIFICATION: The candidate asked a clarification question or asked for context ('{last_answer.answer_text if last_answer else ''}'). "
                "You MUST directly and helpfully answer their question first using common sense and the provided lab/code details, "
                "explaining what specific problem or file is being discussed, and then politely ask the technical question."
            )
        elif last_quality == "intro":
            cand_name = session.candidate.metadata.get("name") or ""
            greet_phrase = f"Hello {cand_name}!" if cand_name else "Hello!"
            extra_directives += (
                f" CRITICAL INTRO GREETING: The candidate just introduced themselves. "
                f"Sentence 1 MUST be a warm greeting by name: '{greet_phrase} Great to meet you.' "
                "Sentence 2 MUST introduce your first technical question about their lab work. Do NOT omit the greeting!"
            )

        cand_name = session.candidate.metadata.get("name") or ""
        cand_name_info = f" The candidate's name is {cand_name}." if cand_name else ""

        if last_quality == "intro":
            greet_phrase = f"Hello {cand_name}!" if cand_name else "Hello!"
            sentence_1_rule = f"- SENTENCE 1 (Warm Introduction Greeting): '{greet_phrase} Great to meet you.'"
        elif last_quality == "repeat_requested":
            sentence_1_rule = "- SENTENCE 1 (Rephrase Prefix): 'No problem, let me rephrase that:'"
        elif skip_or_unknown:
            sentence_1_rule = "- SENTENCE 1 (Polite Transition): 'Got it, let\\'s move on.' or 'Understood, let\\'s move on.'"
        else:
            sentence_1_rule = "- SENTENCE 1 (Conversational Acknowledgment): Brief positive acknowledgment like 'Understood!', 'Got it!', 'Makes sense!', or 'Good point!'. NEVER say 'Hello' or greet the candidate with 'Great to meet you' because the interview is already underway! Also do NOT say 'let\\'s move on' when the candidate answered."

        instructions = (
            "You are Vitarka AI, an experienced, empathetic, and sharp engineering manager conducting a live interactive technical interview."
            f"{cand_name_info} "
            "Converse naturally like a thoughtful human interviewer, not a rigid robot. "
            "CRITICAL RESPONSE STRUCTURE (MUST FOLLOW): "
            "Your output must consist of EXACTLY TWO SHORT SENTENCES (STRICT LIMIT: UNDER 35 WORDS TOTAL): "
            f"{sentence_1_rule} "
            "- SENTENCE 2 (Crisp Technical Question): Exactly ONE focused question. NEVER ask compound questions. "
            "ADDITIONAL RULES: "
            "1. NEVER REPEAT A QUESTION OR TOPIC: Inspect previous_questions and recent_answers. You must NEVER repeat, rephrase, or ask a question that covers the same topic, wording, or concept as any question in previous_questions (unless candidate explicitly asked to repeat with 'repeat_requested'). Always explore a fresh, new technical angle (e.g. system design, data validation, concurrency, scale, edge cases). "
            "2. NO TECHNICAL LECTURING: Do NOT explain or lecture theory back to the candidate (e.g. do NOT explain why HTTP 201 Created is important). Keep acknowledgment to 1 brief conversational sentence. "
            "3. ZERO BACKTICKS: NEVER use backticks (`) anywhere in your output. Write filenames, code, and status codes as plain text without quotes or backticks (e.g., write library/views.py, 201 Created) because backticks cause text-to-speech engines to read aloud 'back quote'. "
            "4. CANDIDATE CLARIFICATIONS: If the candidate asks a question or asks for context (e.g. 'May know which problem you are addressing'), answer their query directly in Sentence 1, then ask your question in Sentence 2. "
            "5. CANDIDATE ANSWER REACTIVITY & DRILL-DOWN: Actively analyze the candidate's latest answer in recent_answers. When the candidate mentions specific technical terms, status codes, error behaviors, design decisions, edge cases, or trade-offs (e.g. 500 vs 409 status code, duplicate resources, database locks, caching, try/except, validation), Sentence 2 MUST directly probe, challenge, or ask for the specific implementation/trade-off behind that point rather than asking a generic canned question. Never ignore what the candidate just said. "
            "6. GROUNDING & EVIDENCE: Focus on the candidate's actual code changes, diffs, answers, and verification without reciting raw diffs or line numbers. "
            "7. GENDER NEUTRALITY: Always use gender-neutral pronouns (they/them/their/theirs). "
            f"{extra_directives} "
            "Return JSON only with keys: prompt, rationale."
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
        raw_prompt = data.get("prompt", "")
        if isinstance(raw_prompt, str):
            raw_prompt = raw_prompt.replace("`", "")
        data["prompt"] = normalize_gender_neutral_pronouns(raw_prompt)
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
            "Write an evidence-backed, balanced, and constructive evaluation narrative. "
            "Do not invent evidence. "
            "IMPORTANT: Always use gender-neutral pronouns (they/them/their/theirs) when referring to the candidate. "
            "Never use gendered pronouns like he/him/his or she/her/hers because candidate gender is unspecified. "
            "BALANCED EVALUATION DIRECTIVE: Provide a fair and constructive assessment. Highlight the candidate's genuine technical strengths and practical problem-solving shown during the lab and discussion. If the candidate had gaps or areas of uncertainty, frame them constructively as growth areas rather than overly harsh disqualifications. "
            "CRITICAL ACCURACY DIRECTIVE: If the candidate gave zero answers or explicitly refused to participate, accurately report the unattempted state. When the candidate participated and answered questions, evaluate their reasoning fairly. "
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
            "candidate_name": session.candidate.metadata.get("name") or "",
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
            quality = answer.metadata.get("answer_quality")
            answers.append(
                {
                    "answer_id": answer.id,
                    "question_id": answer.question_id,
                    "question": self._compact(question.prompt if question else "", 320),
                    "question_kind": question.kind.value if question else None,
                    "is_intro": bool(question and question.metadata.get("is_intro")),
                    "answer": self._compact(answer.answer_text, 600),
                    "answer_quality": quality,
                    "confidence": answer.confidence,
                }
            )
        return answers

    def _previous_questions(self, session: InterviewSession, *, limit: int = 16) -> list[dict[str, Any]]:
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

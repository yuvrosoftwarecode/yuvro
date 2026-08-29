from __future__ import annotations

from datetime import datetime
from typing import Any

from mockinterviews.dynamic_engine.models import (
    AssessmentEvent,
    CandidateContext,
    EventSource,
    EventType,
    InterviewCreateRequest,
    InterviewMode,
    UnifiedAssessmentPayload,
)


QUESTION_KEYS = (
    "recruiter_questions",
    "custom_questions",
    "interviewer_questions",
    "drafted_questions",
    "interview_questions",
)


class UnifiedPayloadAdapter:
    def to_create_request(self, payload: UnifiedAssessmentPayload) -> InterviewCreateRequest:
        mode = self._mode(payload.discussion_mode)
        recruiter_questions = self._extract_recruiter_questions(payload)
        candidate = self._candidate_context(payload)

        return InterviewCreateRequest(
            mode=mode,
            candidate=candidate,
            recruiter_questions=recruiter_questions if mode != InterviewMode.AUTOMATIC else [],
            simulation_labs=self._lab_titles(payload),
            coding_assessments=self._coding_titles(payload),
            metadata={
                "source": "unified_payload",
                "event_type": payload.event_type,
                "evaluation_id": payload.evaluation_id,
                "knowledge_assessment": self._assessment_summary(payload.knowledge_assessment),
                **payload.metadata,
            },
        )

    def to_assessment_events(self, payload: UnifiedAssessmentPayload) -> list[AssessmentEvent]:
        events: list[AssessmentEvent] = []
        occurred_at = payload.timestamp

        events.extend(self._knowledge_events(payload.knowledge_assessment, occurred_at))
        events.extend(self._lab_events(payload.engineering_labs, occurred_at))

        if payload.event_type:
            events.append(
                AssessmentEvent(
                    event_type=EventType.OTHER,
                    source=EventSource.SYSTEM,
                    summary=f"Unified frontend payload received: {payload.event_type}",
                    details={
                        "evaluation_id": payload.evaluation_id,
                        "discussion_mode": payload.discussion_mode,
                    },
                    occurred_at=occurred_at or datetime.now().astimezone(),
                )
            )

        return events

    def _candidate_context(self, payload: UnifiedAssessmentPayload) -> CandidateContext:
        candidate = payload.candidate or {}
        job_description = payload.job_description
        key_skills = self._as_string_list(candidate.get("key_skills"))
        resume_parts = [
            str(candidate.get("resume_summary") or candidate.get("resume") or "").strip(),
            f"Key skills: {', '.join(key_skills)}" if key_skills else "",
            f"Experience level: {candidate.get('experience_level')}" if candidate.get("experience_level") else "",
        ]

        return CandidateContext(
            candidate_id=str(
                candidate.get("id")
                or candidate.get("candidate_id")
                or payload.evaluation_id
                or "unknown_candidate"
            ),
            target_role=self._role(job_description),
            resume=" ".join(part for part in resume_parts if part),
            job_description=self._job_description_text(job_description),
            metadata={
                "evaluation_id": payload.evaluation_id,
                "raw_candidate": candidate,
            },
        )

    def _knowledge_events(
        self,
        knowledge_assessment: dict[str, Any],
        occurred_at: datetime | None,
    ) -> list[AssessmentEvent]:
        events: list[AssessmentEvent] = []
        for question in knowledge_assessment.get("questions", []) or []:
            question_type = str(question.get("type") or "").lower()
            title = question.get("title") or question.get("id") or "Assessment question"
            summary = f"{title}: {question.get('content') or ''}".strip()
            details = {
                "question_id": question.get("id"),
                "question_type": question.get("type"),
                "difficulty": question.get("difficulty"),
                "marks_awarded": question.get("marks_awarded"),
                "max_marks": question.get("max_marks"),
                "candidate_answer": question.get("candidate_answer"),
                "correct_solution": question.get("correct_solution"),
                "is_correct": question.get("is_correct"),
                "time_spent_seconds": question.get("time_spent_seconds"),
            }

            if question_type.startswith("mcq"):
                events.append(
                    AssessmentEvent(
                        event_type=EventType.MCQ_ANSWERED,
                        source=EventSource.MCQ,
                        summary=summary,
                        details=details,
                        duration_seconds=self._as_int(question.get("time_spent_seconds")),
                        occurred_at=occurred_at or datetime.now().astimezone(),
                    )
                )
            elif question_type == "coding":
                events.append(
                    AssessmentEvent(
                        event_type=EventType.FINAL_IMPLEMENTATION,
                        source=EventSource.CODING_ASSESSMENT,
                        summary=summary,
                        details={
                            **details,
                            "candidate_implementation": question.get("candidate_answer"),
                        },
                        duration_seconds=self._as_int(question.get("time_spent_seconds")),
                        occurred_at=occurred_at or datetime.now().astimezone(),
                    )
                )

            if question.get("time_spent_seconds") is not None:
                events.append(
                    AssessmentEvent(
                        event_type=EventType.TIME_SPENT,
                        source=EventSource.CODING_ASSESSMENT
                        if question_type == "coding"
                        else EventSource.MCQ,
                        summary=f"Time spent on {title}",
                        details=details,
                        duration_seconds=self._as_int(question.get("time_spent_seconds")),
                        occurred_at=occurred_at or datetime.now().astimezone(),
                    )
                )

        return events

    def _lab_events(
        self,
        engineering_labs: list[dict[str, Any]],
        occurred_at: datetime | None,
    ) -> list[AssessmentEvent]:
        events: list[AssessmentEvent] = []
        for lab in engineering_labs:
            title = str(lab.get("title") or lab.get("lab_id") or "Engineering lab")
            performance = lab.get("performance") or {}
            patch = lab.get("solution_patch")
            common_details = {
                "lab_id": lab.get("lab_id"),
                "title": title,
                "scenario": lab.get("scenario"),
                "performance": performance,
            }

            if performance.get("tests_total") is not None:
                passed = performance.get("tests_passed")
                total = performance.get("tests_total")
                result = "passed" if passed == total else "partially_passed"
                events.append(
                    AssessmentEvent(
                        event_type=EventType.TEST_RUN,
                        source=EventSource.SIMULATION_LAB,
                        summary=f"{title}: {passed}/{total} tests passed",
                        details={**common_details, "result": result},
                        occurred_at=occurred_at or datetime.now().astimezone(),
                    )
                )

            if performance.get("errors_encountered"):
                events.append(
                    AssessmentEvent(
                        event_type=EventType.ERROR_ENCOUNTERED,
                        source=EventSource.SIMULATION_LAB,
                        summary=f"{title}: {performance.get('errors_encountered')} errors encountered",
                        details=common_details,
                        occurred_at=occurred_at or datetime.now().astimezone(),
                    )
                )

            if performance.get("terminal_commands_run"):
                events.append(
                    AssessmentEvent(
                        event_type=EventType.TERMINAL_COMMAND,
                        source=EventSource.SIMULATION_LAB,
                        summary=f"{title}: {performance.get('terminal_commands_run')} terminal commands run",
                        details=common_details,
                        occurred_at=occurred_at or datetime.now().astimezone(),
                    )
                )

            if performance.get("total_time_seconds") is not None:
                events.append(
                    AssessmentEvent(
                        event_type=EventType.TIME_SPENT,
                        source=EventSource.SIMULATION_LAB,
                        summary=f"Total lab time for {title}",
                        details=common_details,
                        duration_seconds=self._as_int(performance.get("total_time_seconds")),
                        occurred_at=occurred_at or datetime.now().astimezone(),
                    )
                )

            if patch:
                events.append(
                    AssessmentEvent(
                        event_type=EventType.CODE_CHANGED,
                        source=EventSource.SIMULATION_LAB,
                        summary=f"{title}: submitted solution patch",
                        details={**common_details, "solution_patch": patch},
                        occurred_at=occurred_at or datetime.now().astimezone(),
                    )
                )

            if self._looks_database_related(title, patch):
                events.append(
                    AssessmentEvent(
                        event_type=EventType.DATABASE_QUERY,
                        source=EventSource.SIMULATION_LAB,
                        summary=f"{title}: database or ORM performance work observed",
                        details={**common_details, "solution_patch": patch},
                        occurred_at=occurred_at or datetime.now().astimezone(),
                    )
                )

        return events

    def _extract_recruiter_questions(self, payload: UnifiedAssessmentPayload) -> list[str]:
        raw_payload = payload.model_dump(mode="python")
        values: list[Any] = []

        for key in QUESTION_KEYS:
            values.extend(self._as_list(raw_payload.get(key)))

        for container_key in ("custom_interview", "interview_config", "discussion_config"):
            container = raw_payload.get(container_key)
            if isinstance(container, dict):
                for key in QUESTION_KEYS:
                    values.extend(self._as_list(container.get(key)))

        return [question for question in (self._question_text(item) for item in values) if question]

    def _lab_titles(self, payload: UnifiedAssessmentPayload) -> list[str]:
        return [
            str(lab.get("title") or lab.get("lab_id"))
            for lab in payload.engineering_labs
            if lab.get("title") or lab.get("lab_id")
        ]

    def _coding_titles(self, payload: UnifiedAssessmentPayload) -> list[str]:
        titles = []
        for question in payload.knowledge_assessment.get("questions", []) or []:
            if str(question.get("type") or "").lower() == "coding":
                titles.append(str(question.get("title") or question.get("id")))
        return [title for title in titles if title]

    def _assessment_summary(self, assessment: dict[str, Any]) -> dict[str, Any]:
        return {
            "total_score": assessment.get("total_score"),
            "max_score": assessment.get("max_score"),
            "question_count": len(assessment.get("questions", []) or []),
        }

    def _mode(self, value: str) -> InterviewMode:
        normalized = str(value or "AUTOMATIC").strip().lower()
        aliases = {
            "automatic": InterviewMode.AUTOMATIC,
            "auto": InterviewMode.AUTOMATIC,
            "hybrid": InterviewMode.HYBRID,
            "custom": InterviewMode.CUSTOM,
        }
        if normalized not in aliases:
            raise ValueError(f"Unsupported discussion_mode: {value!r}")
        return aliases[normalized]

    def _role(self, job_description: dict[str, Any] | str) -> str | None:
        if isinstance(job_description, dict):
            role = job_description.get("role") or job_description.get("title")
            return str(role) if role else None
        return None

    def _job_description_text(self, job_description: dict[str, Any] | str) -> str:
        if isinstance(job_description, str):
            return job_description
        requirements = self._as_string_list(job_description.get("requirements"))
        parts = [
            str(job_description.get("role") or "").strip(),
            str(job_description.get("summary") or "").strip(),
            f"Requirements: {', '.join(requirements)}" if requirements else "",
        ]
        return " ".join(part for part in parts if part)

    def _question_text(self, value: Any) -> str | None:
        if isinstance(value, str):
            return value.strip() or None
        if isinstance(value, dict):
            for key in ("question", "prompt", "content", "text", "title"):
                if value.get(key):
                    return str(value[key]).strip()
        return None

    def _as_list(self, value: Any) -> list[Any]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]

    def _as_string_list(self, value: Any) -> list[str]:
        return [str(item) for item in self._as_list(value) if str(item).strip()]

    def _as_int(self, value: Any) -> int | None:
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _looks_database_related(self, title: str, patch: Any) -> bool:
        haystack = f"{title} {patch or ''}".lower()
        return any(token in haystack for token in ("database", "orm", "query", "index", "select_related"))


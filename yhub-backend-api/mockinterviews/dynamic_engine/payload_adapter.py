from __future__ import annotations

import json
import re
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
        report_sources = self._payload_report_sources(payload)

        return InterviewCreateRequest(
            mode=mode,
            candidate=candidate,
            recruiter_questions=recruiter_questions if mode != InterviewMode.AUTOMATIC else [],
            simulation_labs=self._lab_titles(report_sources["engineering_labs"]),
            coding_assessments=self._coding_titles(report_sources["knowledge_assessment"]),
            metadata={
                "source": "unified_payload",
                "event_type": payload.event_type or "ASSESSMENT_CONTEXT_RECEIVED",
                "evaluation_id": payload.evaluation_id,
                "force": payload.force,
                "sequential": payload.sequential,
                "candidate_context_excerpt": self._compact_text(payload.candidate_context, 1200),
                "knowledge_assessment": self._assessment_summary(report_sources["knowledge_assessment"]),
                "payload_report_sources": report_sources,
                **({
                    "discussion_max_score": report_sources["discussion_max_score"]
                } if report_sources.get("discussion_max_score") is not None else {}),
                **payload.metadata,
            },
        )

    def to_assessment_events(self, payload: UnifiedAssessmentPayload) -> list[AssessmentEvent]:
        events: list[AssessmentEvent] = []
        occurred_at = payload.timestamp
        report_sources = self._payload_report_sources(payload)

        events.extend(self._knowledge_events(report_sources["knowledge_assessment"], occurred_at))
        events.extend(self._lab_events(report_sources["engineering_labs"], occurred_at))

        if payload.event_type or payload.candidate_context:
            events.append(
                AssessmentEvent(
                    event_type=EventType.OTHER,
                    source=EventSource.SYSTEM,
                    summary=(
                        "Unified frontend payload received: "
                        f"{payload.event_type or 'ASSESSMENT_CONTEXT_RECEIVED'}"
                    ),
                    details={
                        "evaluation_id": payload.evaluation_id,
                        "discussion_mode": payload.discussion_mode,
                        "force": payload.force,
                        "sequential": payload.sequential,
                        "candidate_context_present": bool(payload.candidate_context),
                    },
                    occurred_at=occurred_at or datetime.now().astimezone(),
                )
            )

        return events

    def _candidate_context(self, payload: UnifiedAssessmentPayload) -> CandidateContext:
        candidate = payload.candidate or {}
        job_description = payload.job_description
        key_skills = self._as_string_list(candidate.get("key_skills"))
        candidate_context_excerpt = self._compact_text(payload.candidate_context, 900)
        resume_parts = [
            str(candidate.get("resume_summary") or candidate.get("resume") or "").strip(),
            f"Key skills: {', '.join(key_skills)}" if key_skills else "",
            f"Experience level: {candidate.get('experience_level')}" if candidate.get("experience_level") else "",
            f"Assessment context: {candidate_context_excerpt}" if candidate_context_excerpt else "",
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
                "candidate_context_present": bool(payload.candidate_context),
            },
        )

    def _payload_report_sources(self, payload: UnifiedAssessmentPayload) -> dict[str, Any]:
        parsed_context = self._parse_candidate_context(payload.candidate_context or "")
        structured_labs = [
            self._normalize_lab(lab, index)
            for index, lab in enumerate(payload.engineering_labs, start=1)
            if isinstance(lab, dict)
        ]
        parsed_labs = parsed_context.get("engineering_labs", [])
        labs = self._dedupe_labs([*structured_labs, *parsed_labs])

        structured_knowledge = self._normalize_knowledge_assessment(payload.knowledge_assessment)
        parsed_knowledge = parsed_context.get("knowledge_assessment", {})
        if structured_knowledge.get("questions"):
            knowledge = structured_knowledge
        elif parsed_knowledge.get("questions") or parsed_knowledge.get("max_score") is not None:
            knowledge = {
                **structured_knowledge,
                **parsed_knowledge,
                "total_score": structured_knowledge.get("total_score")
                if structured_knowledge.get("total_score") is not None
                else parsed_knowledge.get("total_score"),
                "max_score": structured_knowledge.get("max_score")
                if structured_knowledge.get("max_score") is not None
                else parsed_knowledge.get("max_score"),
            }
        else:
            knowledge = structured_knowledge
        if parsed_knowledge.get("questions") and structured_knowledge.get("questions"):
            knowledge = {
                **structured_knowledge,
                "candidate_context_score": {
                    "total_score": parsed_knowledge.get("total_score"),
                    "max_score": parsed_knowledge.get("max_score"),
                },
            }

        return {
            "engineering_labs": labs,
            "knowledge_assessment": knowledge or self._empty_knowledge_assessment(),
            "discussion_max_score": parsed_context.get("discussion_max_score"),
            "candidate_context": {
                "present": bool(payload.candidate_context),
                "engineering_lab_count": len(parsed_labs),
                "knowledge_question_count": len(parsed_knowledge.get("questions", []) or [])
                if isinstance(parsed_knowledge, dict)
                else 0,
            },
        }

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
            patch = lab.get("solution_patch") or lab.get("code_diff") or lab.get("submission_content")
            common_details = {
                "lab_id": lab.get("lab_id"),
                "title": title,
                "scenario": lab.get("scenario") or lab.get("description"),
                "description": lab.get("description"),
                "tasks": lab.get("tasks"),
                "performance": performance,
                "time_spent_seconds": lab.get("time_spent_seconds")
                or performance.get("total_time_seconds"),
                "code_diff_format": lab.get("code_diff_format"),
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

    def _lab_titles(self, engineering_labs: list[dict[str, Any]]) -> list[str]:
        return [
            str(lab.get("title") or lab.get("lab_id"))
            for lab in engineering_labs
            if lab.get("title") or lab.get("lab_id")
        ]

    def _coding_titles(self, knowledge_assessment: dict[str, Any]) -> list[str]:
        titles = []
        for question in knowledge_assessment.get("questions", []) or []:
            if str(question.get("type") or "").lower() == "coding":
                titles.append(str(question.get("title") or question.get("id")))
        return [title for title in titles if title]

    def _assessment_summary(self, assessment: dict[str, Any]) -> dict[str, Any]:
        return {
            "total_score": assessment.get("total_score"),
            "max_score": assessment.get("max_score"),
            "question_count": len(assessment.get("questions", []) or []),
        }

    def _parse_candidate_context(self, context: str) -> dict[str, Any]:
        sanitized_context = (context or "").replace("\x00", "").replace("\u0000", "")
        if not sanitized_context.strip():
            return {}
        disc_match = re.search(
            r"Vitarka\s+Discussion\s+Max\s+Score:\s*(?P<max>\d+(?:\.\d+)?)",
            sanitized_context,
            re.IGNORECASE,
        )
        discussion_max_score = self._as_float(disc_match.group("max")) if disc_match else None
        return {
            "engineering_labs": self._parse_context_labs(sanitized_context),
            "knowledge_assessment": self._parse_context_knowledge_assessment(sanitized_context),
            "discussion_max_score": discussion_max_score,
        }

    def _parse_context_labs(self, context: str) -> list[dict[str, Any]]:
        labs: list[dict[str, Any]] = []
        pattern = re.compile(
            r"---\s*Lab:\s*(?P<title>.*?)\s*---(?P<body>.*?)(?=\n---\s*Lab:|\n\s*(?:Knowledge\s+Assessment\s+Score|Total\s+score):|\Z)",
            re.IGNORECASE | re.DOTALL,
        )
        for index, match in enumerate(pattern.finditer(context), start=1):
            body = match.group("body")
            title = self._clean_text(match.group("title")) or f"Engineering Lab {index}"
            minutes = self._parse_minutes(body)
            code_diff = self._parse_code_diff(body)

            description = (
                self._extract_block_value(body, "Description", stop_labels=("Problem Statement", "Tasks", "Score", "Time spent", "Code Diff", "Submitted Code", "Status"))
                or self._extract_block_value(body, "Problem Statement", stop_labels=("Tasks", "Score", "Time spent", "Code Diff", "Submitted Code", "Status"))
            )
            tasks = self._extract_block_value(body, "Tasks", stop_labels=("Score", "Time spent", "Code Diff", "Submitted Code", "Status"))

            tests_match = re.search(r"Tests:\s*(?P<passed>\d+)\s*passed\s*out\s*of\s*(?P<total>\d+)", body, re.IGNORECASE)
            tests_passed = self._as_int(tests_match.group("passed")) if tests_match else None
            tests_total = self._as_int(tests_match.group("total")) if tests_match else None

            score_match = re.search(r"Score:\s*(?P<score>\d+(?:\.\d+)?)\s*(?:/\s*(?P<max>\d+(?:\.\d+)?)|%)?", body, re.IGNORECASE)
            if score_match and (tests_passed is None or tests_total is None):
                raw_score = self._as_float(score_match.group("score"))
                raw_max = self._as_float(score_match.group("max")) or 100.0
                if raw_score is not None:
                    pct = max(0.0, min(1.0, (raw_score / raw_max) if raw_max else 1.0))
                    tests_total = tests_total or 5
                    tests_passed = tests_passed if tests_passed is not None else int(round(pct * tests_total))

            errors_match = re.search(r"Errors(?:\s+encountered)?:\s*(?P<errors>\d+)", body, re.IGNORECASE)
            errors_encountered = self._as_int(errors_match.group("errors")) if errors_match else None

            commands_match = re.search(r"(?:Terminal\s+commands(?:\s+run)?|Commands):\s*(?P<cmds>\d+)", body, re.IGNORECASE)
            terminal_commands_run = self._as_int(commands_match.group("cmds")) if commands_match else None

            labs.append(
                {
                    "lab_id": f"context_lab_{index}",
                    "title": title,
                    "scenario": description or None,
                    "description": description or None,
                    "tasks": tasks or None,
                    "time_spent_seconds": minutes * 60 if minutes is not None else None,
                    "performance": {
                        "total_time_seconds": minutes * 60 if minutes is not None else None,
                        "tests_passed": tests_passed,
                        "tests_total": tests_total,
                        "terminal_commands_run": terminal_commands_run,
                        "errors_encountered": errors_encountered,
                    },
                    "solution_patch": code_diff,
                    "code_diff_format": self._code_payload_format(code_diff),
                    "source": "candidate_context",
                }
            )
        return labs

    def _parse_context_knowledge_assessment(self, context: str) -> dict[str, Any]:
        score_match = re.search(
            r"(?:Knowledge\s+Assessment\s+Score|Total\s+score):\s*(?P<score>\d+(?:\.\d+)?)\s*/\s*(?P<max>\d+(?:\.\d+)?)",
            context,
            re.IGNORECASE,
        )
        total_score = self._as_float(score_match.group("score")) if score_match else None
        max_score = self._as_float(score_match.group("max")) if score_match else None
        start = score_match.end() if score_match else 0
        knowledge_text = context[start:] if score_match else context

        questions = []
        question_pattern = re.compile(
            r"(?:^|\n)\s*-\s*Question:\s*(?P<prompt>.*?)(?=(?:\n\s*-\s*Question:)|\Z)",
            re.IGNORECASE | re.DOTALL,
        )
        for index, match in enumerate(question_pattern.finditer(knowledge_text), start=1):
            block = match.group("prompt")
            question_text = self._clean_text(re.split(r"\n\s*Selected Answer Option Index:", block, maxsplit=1)[0])
            selected_answer = self._extract_block_value(
                block,
                "Selected Answer Option Index",
                stop_labels=("Is Correct",),
            )
            is_correct_text = self._extract_block_value(block, "Is Correct")
            is_correct = self._parse_bool(is_correct_text)
            question_type = self._infer_question_type(selected_answer)
            questions.append(
                {
                    "id": f"context_question_{index}",
                    "type": question_type,
                    "title": question_text[:80] if question_text else f"Question {index}",
                    "content": question_text or f"Question {index}",
                    "difficulty": None,
                    "marks_awarded": 1 if is_correct else 0 if is_correct is False else None,
                    "max_marks": 1,
                    "candidate_answer": selected_answer,
                    "correct_solution": None,
                    "is_correct": is_correct,
                    "time_spent_seconds": None,
                    "source": "candidate_context",
                }
            )

        if total_score is None and questions:
            awarded = [question.get("marks_awarded") for question in questions]
            if all(isinstance(value, int | float) for value in awarded):
                total_score = float(sum(awarded))
        if max_score is None and questions:
            max_score = float(sum(question.get("max_marks") or 0 for question in questions))

        return {
            "total_score": total_score,
            "max_score": max_score,
            "questions": questions,
            "source": "candidate_context",
        }

    def _normalize_knowledge_assessment(self, assessment: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(assessment, dict):
            return self._empty_knowledge_assessment()
        questions = [
            self._normalize_knowledge_question(question, index)
            for index, question in enumerate(assessment.get("questions", []) or [], start=1)
            if isinstance(question, dict)
        ]
        total_score = self._as_float(assessment.get("total_score"))
        max_score = self._as_float(assessment.get("max_score"))
        if total_score is None and questions:
            scores = [question.get("marks_awarded") for question in questions]
            if all(isinstance(score, int | float) for score in scores):
                total_score = float(sum(scores))
        if max_score is None and questions:
            max_score = float(sum(question.get("max_marks") or 0 for question in questions))
        return {
            **assessment,
            "total_score": total_score,
            "max_score": max_score,
            "questions": questions,
        }

    def _normalize_knowledge_question(self, question: dict[str, Any], index: int) -> dict[str, Any]:
        prompt = question.get("content") or question.get("prompt") or question.get("question") or ""
        title = question.get("title") or question.get("id") or f"Question {index}"
        return {
            **question,
            "id": question.get("id") or f"knowledge_question_{index}",
            "type": question.get("type") or self._infer_question_type(question.get("candidate_answer")),
            "title": str(title),
            "content": str(prompt or title),
            "marks_awarded": self._as_float(question.get("marks_awarded")),
            "max_marks": self._as_float(question.get("max_marks")) or 1,
            "is_correct": self._parse_bool(question.get("is_correct")),
            "time_spent_seconds": self._as_int(question.get("time_spent_seconds")),
        }

    def _normalize_lab(self, lab: dict[str, Any], index: int) -> dict[str, Any]:
        performance = lab.get("performance") if isinstance(lab.get("performance"), dict) else {}
        time_spent_seconds = (
            self._as_int(lab.get("time_spent_seconds"))
            or self._as_int(performance.get("total_time_seconds"))
            or self._minutes_to_seconds(lab.get("time_spent_minutes"))
        )
        solution_patch = lab.get("solution_patch") or lab.get("code_diff") or lab.get("submission_content")
        return {
            **lab,
            "lab_id": lab.get("lab_id") or lab.get("id") or f"lab_{index}",
            "title": str(lab.get("title") or lab.get("name") or lab.get("lab_id") or f"Engineering Lab {index}"),
            "scenario": lab.get("scenario"),
            "time_spent_seconds": time_spent_seconds,
            "performance": {
                **performance,
                "total_time_seconds": time_spent_seconds,
                "tests_passed": self._as_int(performance.get("tests_passed")),
                "tests_total": self._as_int(performance.get("tests_total")),
                "terminal_commands_run": self._as_int(performance.get("terminal_commands_run")),
                "errors_encountered": self._as_int(performance.get("errors_encountered")),
            },
            "solution_patch": solution_patch,
            "code_diff_format": lab.get("code_diff_format") or self._code_payload_format(solution_patch),
            "source": lab.get("source") or "structured_payload",
        }

    def _dedupe_labs(self, labs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        deduped = []
        seen = set()
        for lab in labs:
            key = str(lab.get("lab_id") or lab.get("title") or "").lower()
            if not key or key in seen:
                continue
            seen.add(key)
            deduped.append(lab)
        return deduped

    def _empty_knowledge_assessment(self) -> dict[str, Any]:
        return {"total_score": None, "max_score": None, "questions": []}

    def _parse_minutes(self, text: str) -> int | None:
        match = re.search(r"Time spent:\s*(?P<minutes>\d+(?:\.\d+)?)\s*minutes?", text, re.IGNORECASE)
        if not match:
            return None
        value = self._as_float(match.group("minutes"))
        return int(round(value)) if value is not None else None

    def _parse_code_diff(self, text: str) -> str | None:
        match = re.search(
            r"(?:Code Diff|Submitted Code|Code Implementation|Solution):\s*```(?:[A-Za-z0-9_-]+)?\s*\n(?P<code>.*?)(?:\n```|$)",
            text,
            re.IGNORECASE | re.DOTALL,
        )
        if match:
            return match.group("code").strip()

        match2 = re.search(
            r"```(?:diff|python|javascript|typescript|json|bash|sh)?\s*\n(?P<code>.*?)(?:\n```|$)",
            text,
            re.IGNORECASE | re.DOTALL,
        )
        if match2:
            return match2.group("code").strip()

        marker = re.search(r"(?:Code Diff|Submitted Code):\s*(?P<code>.*)", text, re.IGNORECASE | re.DOTALL)
        if marker:
            return marker.group("code").strip()
        return None

    def _extract_block_value(
        self,
        block: str,
        label: str,
        *,
        stop_labels: tuple[str, ...] = (),
    ) -> str | None:
        lookahead_options = [rf"\n\s*{re.escape(stop)}:" for stop in stop_labels]
        lookahead_options.append(r"\Z")
        stop_pattern = "|".join(lookahead_options)
        pattern = re.compile(
            rf"{re.escape(label)}:\s*(?P<value>.*?)(?={stop_pattern})",
            re.IGNORECASE | re.DOTALL,
        )
        match = pattern.search(block)
        if not match:
            return None
        return self._clean_text(match.group("value")) or None

    def _infer_question_type(self, candidate_answer: Any) -> str:
        if isinstance(candidate_answer, list):
            return "mcq_multiple" if len(candidate_answer) > 1 else "mcq_single"
        answer = str(candidate_answer or "")
        if "\n" in answer or any(token in answer for token in ("def ", "class ", "import ", "print(")):
            return "coding"
        if "," in answer:
            return "mcq_multiple"
        return "mcq_single"

    def _code_payload_format(self, value: Any) -> str | None:
        if isinstance(value, dict):
            return "workspace_snapshot_json"
        text = self._text(value).strip()
        if not text:
            return None
        if text.startswith("{"):
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                return "raw"
            return "workspace_snapshot_json" if isinstance(parsed, dict) else "raw"
        if "diff --git " in text or text.startswith("--- "):
            return "unified_diff"
        return "raw"

    def _parse_bool(self, value: Any) -> bool | None:
        if isinstance(value, bool):
            return value
        normalized = str(value or "").strip().lower()
        if normalized in {"yes", "true", "1", "correct"}:
            return True
        if normalized in {"no", "false", "0", "incorrect"}:
            return False
        return None

    def _minutes_to_seconds(self, value: Any) -> int | None:
        minutes = self._as_float(value)
        return int(round(minutes * 60)) if minutes is not None else None

    def _as_float(self, value: Any) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _clean_text(self, value: Any) -> str:
        cleaned = str(value or "").replace("\x00", "").replace("\u0000", "").strip()
        return "\n".join(line.rstrip() for line in cleaned.splitlines()).strip()

    def _compact_text(self, value: Any, limit: int) -> str:
        text = " ".join(str(value or "").replace("\x00", "").replace("\u0000", "").split())
        if len(text) <= limit:
            return text
        return f"{text[: limit - 3]}..."

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
            return job_description.replace("\x00", "").replace("\u0000", "")
        requirements = self._as_string_list(job_description.get("requirements"))
        parts = [
            str(job_description.get("role") or "").strip(),
            str(job_description.get("summary") or "").strip(),
            f"Requirements: {', '.join(requirements)}" if requirements else "",
        ]
        return " ".join(part for part in parts if part).replace("\x00", "").replace("\u0000", "")

    def _question_text(self, value: Any) -> str | None:
        if isinstance(value, str):
            sanitized = value.replace("\x00", "").replace("\u0000", "").strip()
            return sanitized or None
        if isinstance(value, dict):
            for key in ("question", "prompt", "content", "text", "title"):
                if value.get(key):
                    sanitized = str(value[key]).replace("\x00", "").replace("\u0000", "").strip()
                    return sanitized or None
        return None

    def _as_list(self, value: Any) -> list[Any]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]

    def _as_string_list(self, value: Any) -> list[str]:
        return [str(item).replace("\x00", "").replace("\u0000", "") for item in self._as_list(value) if str(item).strip()]

    def _as_int(self, value: Any) -> int | None:
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _text(self, value: Any) -> str:
        return value.replace("\x00", "").replace("\u0000", "") if isinstance(value, str) else ""

    def _looks_database_related(self, title: str, patch: Any) -> bool:
        haystack = f"{title} {patch or ''}".lower()
        return any(token in haystack for token in ("database", "orm", "query", "index", "select_related"))

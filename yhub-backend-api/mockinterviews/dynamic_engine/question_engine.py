from __future__ import annotations

import re
from collections import Counter
from typing import Any

from mockinterviews.dynamic_engine.models import (
    AssessmentEvent,
    CandidateAnswer,
    Competency,
    EventIngestResponse,
    EventSource,
    EventType,
    InterviewMode,
    InterviewQuestion,
    InterviewSession,
    MCQAnswerRequest,
    MCQInterviewerAction,
    MCQInterviewResponse,
    ObservationSignal,
    QuestionKind,
    new_id,
)
from mockinterviews.dynamic_engine.code_analysis import CodeInsightExtractor
from mockinterviews.dynamic_engine  .llm import InterviewLLM


STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "have",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "with",
    "you",
    "your",
}


EVENT_SIGNAL_MAP: dict[EventType, tuple[Competency, str, int]] = {
    EventType.FILE_OPENED: (Competency.PROBLEM_SOLVING, "Exploration path", 1),
    EventType.FILE_MODIFIED: (Competency.CODE_QUALITY, "Code modification", 2),
    EventType.CODE_CHANGED: (Competency.CODE_QUALITY, "Implementation change", 3),
    EventType.DEBUG_STEP: (Competency.DEBUGGING_ABILITY, "Debugging step", 3),
    EventType.TERMINAL_COMMAND: (Competency.DEBUGGING_ABILITY, "Terminal usage", 2),
    EventType.TEST_RUN: (Competency.TESTING_MINDSET, "Test execution", 3),
    EventType.DATABASE_QUERY: (Competency.PERFORMANCE_AWARENESS, "Data investigation", 2),
    EventType.TIME_SPENT: (Competency.TIME_MANAGEMENT, "Time allocation", 2),
    EventType.MULTIPLE_EDITS: (Competency.ADAPTABILITY, "Repeated iteration", 2),
    EventType.SOLUTION_CHANGE: (Competency.ENGINEERING_DECISION_MAKING, "Solution change", 4),
    EventType.ERROR_ENCOUNTERED: (Competency.DEBUGGING_ABILITY, "Error encountered", 4),
    EventType.FINAL_IMPLEMENTATION: (Competency.OWNERSHIP_COLLABORATION, "Final delivery", 3),
    EventType.DECISION_TAKEN: (Competency.ENGINEERING_DECISION_MAKING, "Decision taken", 3),
    EventType.MCQ_ANSWERED: (Competency.TECHNICAL_KNOWLEDGE, "MCQ reasoning", 2),
    EventType.OTHER: (Competency.PROBLEM_SOLVING, "Observed behaviour", 1),
}


class DynamicQuestionEngine:
    def __init__(
        self,
        llm_client: InterviewLLM | None = None,
        code_analyzer: CodeInsightExtractor | None = None,
    ) -> None:
        self.llm_client = llm_client
        self.code_analyzer = code_analyzer or CodeInsightExtractor()

    def ingest_event(
        self,
        session: InterviewSession,
        event: AssessmentEvent,
    ) -> EventIngestResponse:
        event = self._event_with_code_insights(event)
        signals = self.extract_signals(event)
        session.observations.append(event)
        session.signals.extend(signals)
        session.touch()

        focus = []
        for signal in sorted(signals, key=lambda item: item.weight, reverse=True):
            if signal.competency not in focus:
                focus.append(signal.competency)

        return EventIngestResponse(
            session_id=session.id,
            event=event,
            extracted_signals=signals,
            suggested_focus=focus,
        )

    def extract_signals(self, event: AssessmentEvent) -> list[ObservationSignal]:
        competency, label, weight = EVENT_SIGNAL_MAP[event.event_type]
        signals = [
            ObservationSignal(
                competency=competency,
                label=label,
                evidence_event_id=event.id,
                weight=weight,
                reason=f"{event.event_type.value} from {event.source.value}: {event.summary}",
            )
        ]

        if event.event_type in {EventType.ERROR_ENCOUNTERED, EventType.DEBUG_STEP}:
            signals.append(
                ObservationSignal(
                    competency=Competency.PROBLEM_SOLVING,
                    label="Problem decomposition",
                    evidence_event_id=event.id,
                    weight=2,
                    reason="Debugging behaviour can show how the candidate breaks down uncertainty.",
                )
            )

        if event.event_type == EventType.DATABASE_QUERY:
            signals.append(
                ObservationSignal(
                    competency=Competency.SECURITY_AWARENESS,
                    label="Data access risk",
                    evidence_event_id=event.id,
                    weight=2,
                    reason="Database activity is useful evidence for data integrity and access-risk probing.",
                )
            )

        if event.event_type == EventType.TEST_RUN:
            signals.append(
                ObservationSignal(
                    competency=Competency.CODE_QUALITY,
                    label="Quality feedback loop",
                    evidence_event_id=event.id,
                    weight=2,
                    reason="Test execution provides evidence about implementation quality and validation habits.",
                )
            )

        code_insights = event.details.get("code_insights")
        if isinstance(code_insights, dict):
            signals.append(
                ObservationSignal(
                    competency=Competency.CODE_QUALITY,
                    label="Code implementation evidence",
                    evidence_event_id=event.id,
                    weight=4,
                    reason="Candidate code or patch is available for implementation-level probing.",
                )
            )
            if code_insights.get("solution_contrast") or code_insights.get(
                "candidate_correctness_concerns"
            ):
                signals.append(
                    ObservationSignal(
                        competency=Competency.PROBLEM_SOLVING,
                        label="Correctness gap",
                        evidence_event_id=event.id,
                        weight=4,
                        reason="Candidate implementation can be contrasted with expected behaviour.",
                    )
                )
            if code_insights.get("performance_concerns") or code_insights.get(
                "candidate_performance_concerns"
            ):
                signals.append(
                    ObservationSignal(
                        competency=Competency.PERFORMANCE_AWARENESS,
                        label="Performance-sensitive implementation",
                        evidence_event_id=event.id,
                        weight=3,
                        reason="Candidate code contains performance-sensitive choices to verify.",
                    )
                )
            if code_insights.get("security_concerns") or code_insights.get(
                "candidate_security_concerns"
            ):
                signals.append(
                    ObservationSignal(
                        competency=Competency.SECURITY_AWARENESS,
                        label="Security-sensitive implementation",
                        evidence_event_id=event.id,
                        weight=3,
                        reason="Candidate code contains a security-sensitive pattern to probe.",
                    )
                )

        return signals

    def next_question(self, session: InterviewSession, *, force_new: bool = False) -> InterviewQuestion:
        if not force_new:
            existing = self._current_unanswered_question(session)
            if existing is not None:
                return existing

        if session.mode == InterviewMode.CUSTOM:
            question = self._with_llm_question(session, self._next_custom_question(session))
        elif self._has_required_question(session):
            question = self._next_required_question(session)
        else:
            question = self._with_llm_question(session, self._dynamic_follow_up(session))

        if question.kind != QuestionKind.RECRUITER_REQUIRED:
            question = self._ensure_novel_question(session, question)
        session.questions.append(question)
        session.current_question_id = question.id
        session.turn_index += 1
        signature = question.metadata.get("signature")
        if isinstance(signature, str):
            session.asked_signatures.append(signature)
        session.touch()
        return question

    def _with_llm_question(
        self,
        session: InterviewSession,
        fallback_question: InterviewQuestion,
    ) -> InterviewQuestion:
        if self.llm_client is None:
            fallback_question.metadata["generation_provider"] = "deterministic"
            return fallback_question

        generated = self.llm_client.generate_question(session, fallback_question)
        if generated is None:
            fallback_question.metadata["generation_provider"] = "deterministic_fallback"
            return fallback_question

        if self._is_similar_to_previous(session, generated.prompt):
            fallback_question.metadata["generation_provider"] = "deterministic_fallback_duplicate_guard"
            fallback_question.metadata["llm_duplicate_rejected"] = True
            fallback_question.metadata["rejected_llm_prompt"] = self._compact(generated.prompt, 220)
            return fallback_question

        question = fallback_question.model_copy(
            update={
                "prompt": generated.prompt.strip(),
                "rationale": generated.rationale.strip(),
            },
            deep=True,
        )
        question.metadata["generation_provider"] = "openai"
        model = getattr(self.llm_client, "model", None)
        if isinstance(model, str):
            question.metadata["llm_model"] = model
        return question

    def _event_with_code_insights(self, event: AssessmentEvent) -> AssessmentEvent:
        if isinstance(event.details.get("code_insights"), dict):
            return event

        code_insights = self.code_analyzer.from_event_details(event.details)
        if not code_insights:
            return event

        details = {**event.details, "code_insights": code_insights}
        return event.model_copy(update={"details": details}, deep=True)

    def _ensure_novel_question(
        self,
        session: InterviewSession,
        question: InterviewQuestion,
    ) -> InterviewQuestion:
        if not self._is_similar_to_previous(session, question.prompt):
            return question

        excluded_signature = question.metadata.get("signature")
        excluded = {excluded_signature} if isinstance(excluded_signature, str) else set()
        alternate = self._next_code_probe(session, exclude_signatures=excluded)
        if alternate is not None and not self._is_similar_to_previous(session, alternate.prompt):
            alternate.metadata["duplicate_avoided"] = True
            alternate.metadata["duplicate_source_prompt"] = self._compact(question.prompt, 220)
            return alternate

        replacement_prompt = self._deeper_unique_prompt(session, question)
        return question.model_copy(
            update={
                "prompt": replacement_prompt,
                "rationale": (
                    "Regenerated because the previous candidate question was too similar to an "
                    "earlier prompt; this version moves to a deeper evidence axis."
                ),
                "metadata": {
                    **question.metadata,
                    "duplicate_avoided": True,
                    "duplicate_source_prompt": self._compact(question.prompt, 220),
                    "signature": f"anti-repeat:{session.turn_index}:{len(session.questions)}",
                },
            },
            deep=True,
        )

    def record_answer(
        self,
        session: InterviewSession,
        question_id: str,
        answer_text: str,
        confidence: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> CandidateAnswer:
        if not any(question.id == question_id for question in session.questions):
            raise ValueError(f"question_id {question_id!r} does not belong to session {session.id}")

        answer = CandidateAnswer(
            question_id=question_id,
            answer_text=answer_text,
            confidence=confidence,
            metadata=metadata or {},
        )
        session.answers.append(answer)
        if session.current_question_id == question_id:
            session.current_question_id = None
        session.touch()
        return answer

    def handle_mcq_answer(
        self,
        session: InterviewSession,
        mcq_id: str,
        request: MCQAnswerRequest,
    ) -> MCQInterviewResponse:
        mcq = next((item for item in session.mcqs if item.id == mcq_id), None)
        if mcq is None:
            raise ValueError(f"mcq_id {mcq_id!r} does not belong to session {session.id}")

        is_correct = (
            request.selected_option_id == mcq.correct_option_id
            if mcq.correct_option_id is not None and not request.skipped
            else None
        )

        if request.skipped:
            action = MCQInterviewerAction.OFFER_HINT_RETRY_SKIP
            prompt = "You skipped this one. Would you like a hint, a retry, or should we move on?"
            next_options = ["hint", "retry", "skip"]
            hint = mcq.hint
        elif request.used_hint:
            action = MCQInterviewerAction.ASSESS_AFTER_HINT
            prompt = (
                "Now that you used a hint, explain the reasoning path that gets you to your "
                "answer. I am looking for what changed after the guidance."
            )
            next_options = []
            hint = None
        elif is_correct is True:
            action = MCQInterviewerAction.ASK_REASONING
            prompt = "That answer is correct. Walk me through the reasoning that led you there."
            next_options = []
            hint = None
        elif is_correct is False:
            action = MCQInterviewerAction.ASK_SELECTION_RATIONALE
            prompt = "Why did you select that option, and what evidence would make you reconsider it?"
            next_options = []
            hint = None
        else:
            action = MCQInterviewerAction.ASK_REASONING
            prompt = "Walk me through why you selected that option."
            next_options = []
            hint = None

        event = AssessmentEvent(
            event_type=EventType.MCQ_ANSWERED,
            source=EventSource.MCQ,
            summary=f"Candidate responded to MCQ: {mcq.prompt}",
            details={
                "mcq_id": mcq.id,
                "selected_option_id": request.selected_option_id,
                "skipped": request.skipped,
                "used_hint": request.used_hint,
                "is_correct": is_correct,
                "topic": mcq.topic,
                "explanation": request.explanation,
            },
        )
        self.ingest_event(session, event)
        session.touch()

        return MCQInterviewResponse(
            mcq_id=mcq.id,
            action=action,
            prompt=prompt,
            is_correct=is_correct,
            hint=hint,
            next_options=next_options,
            evidence_event_id=event.id,
        )

    def _current_unanswered_question(self, session: InterviewSession) -> InterviewQuestion | None:
        if session.current_question_id is None:
            return None

        answered_question_ids = {answer.question_id for answer in session.answers}
        if session.current_question_id in answered_question_ids:
            return None

        return next(
            (question for question in session.questions if question.id == session.current_question_id),
            None,
        )

    def _has_required_question(self, session: InterviewSession) -> bool:
        return (
            session.mode in {InterviewMode.HYBRID, InterviewMode.CUSTOM}
            and session.required_question_cursor < len(session.recruiter_questions)
        )

    def _next_custom_question(self, session: InterviewSession) -> InterviewQuestion:
        pending_answer = self._pending_custom_follow_up_answer(session)
        if pending_answer is not None:
            return self._custom_scope_follow_up(session, pending_answer)
        if self._has_required_question(session):
            return self._next_required_question(session)
        return self._custom_scope_follow_up(session)

    def _pending_custom_follow_up_answer(self, session: InterviewSession) -> CandidateAnswer | None:
        for answer in reversed(session.answers):
            question = self._question_for_answer(session, answer)
            if question is None or question.kind != QuestionKind.RECRUITER_REQUIRED:
                continue
            if self._has_follow_up_for_answer(session, answer.id):
                continue
            return answer
        return None

    def _has_follow_up_for_answer(self, session: InterviewSession, answer_id: str) -> bool:
        return any(question.metadata.get("parent_answer_id") == answer_id for question in session.questions)

    def _next_required_question(self, session: InterviewSession) -> InterviewQuestion:
        question_text = session.recruiter_questions[session.required_question_cursor]
        session.required_question_cursor += 1
        return InterviewQuestion(
            prompt=question_text,
            kind=QuestionKind.RECRUITER_REQUIRED,
            competency_targets=[Competency.TECHNICAL_KNOWLEDGE, Competency.COMMUNICATION],
            rationale="Recruiter-provided question required by the selected interview mode.",
            metadata={
                "required_index": session.required_question_cursor - 1,
                "signature": f"required:{session.required_question_cursor - 1}",
            },
        )

    def _custom_scope_follow_up(
        self,
        session: InterviewSession,
        answer: CandidateAnswer | None = None,
    ) -> InterviewQuestion:
        latest_answer = answer or (session.answers[-1] if session.answers else None)
        latest_question = self._question_for_answer(session, latest_answer) if latest_answer else None
        scope = (
            str(latest_question.metadata.get("scope_prompt"))
            if latest_question and latest_question.metadata.get("scope_prompt")
            else latest_question.prompt
            if latest_question
            else session.recruiter_questions[-1]
        )
        scope_phrase = self._compact(scope, 96)
        answer_excerpt = self._compact(latest_answer.answer_text, 120) if latest_answer else ""

        if latest_answer is None or len(latest_answer.answer_text.split()) < 20:
            prompt = (
                f"Can you expand on your answer within the recruiter-defined topic, "
                f"especially the implementation details behind: {scope_phrase}"
            )
            kind = QuestionKind.CLARIFICATION
            rationale = "The answer was short or missing, so Vitarka asks for clarification in scope."
        else:
            prompt = (
                f"You said: \"{answer_excerpt}\". Staying within the recruiter-defined topic "
                f"of {scope_phrase}, what tradeoff, failure mode, or edge case would you probe next?"
            )
            kind = QuestionKind.CUSTOM_SCOPE_FOLLOW_UP
            rationale = "Custom mode allows probing the candidate's answer without adding unrelated topics."

        return InterviewQuestion(
            prompt=prompt,
            kind=kind,
            competency_targets=[
                Competency.ENGINEERING_DECISION_MAKING,
                Competency.COMMUNICATION,
            ],
            evidence_answer_ids=[latest_answer.id] if latest_answer else [],
            rationale=rationale,
            metadata={
                "signature": f"custom-follow-up:{latest_answer.id if latest_answer else 'start'}",
                "parent_answer_id": latest_answer.id if latest_answer else None,
                "scope_question_id": latest_question.id if latest_question else None,
                "scope_prompt": scope,
            },
        )

    def _dynamic_follow_up(self, session: InterviewSession) -> InterviewQuestion:
        pending_answer = self._pending_dynamic_deep_follow_up_answer(session)
        if pending_answer is not None:
            return self._answer_depth_follow_up(session, pending_answer)

        code_question = self._next_code_probe(session)
        if code_question is not None:
            return code_question

        event = self._best_unused_event(session)
        if event is not None:
            return self._question_from_event(event, session)
        return self._question_from_candidate_context(session)

    def _pending_dynamic_deep_follow_up_answer(
        self,
        session: InterviewSession,
    ) -> CandidateAnswer | None:
        if not session.answers:
            return None

        answer = session.answers[-1]
        question = self._question_for_answer(session, answer)
        if question is None or question.kind == QuestionKind.RECRUITER_REQUIRED:
            return None
        if question.metadata.get("parent_answer_id"):
            return None
        if self._has_follow_up_for_answer(session, answer.id):
            return None
        if question.evidence_event_ids or len(answer.answer_text.split()) < 18:
            return answer
        return None

    def _answer_depth_follow_up(
        self,
        session: InterviewSession,
        answer: CandidateAnswer,
    ) -> InterviewQuestion:
        question = self._question_for_answer(session, answer)
        event = self._event_for_question(session, question)
        code_insights = event.details.get("code_insights") if event else None
        answer_excerpt = self._compact(answer.answer_text, 130)

        if isinstance(code_insights, dict):
            focus = self._code_focus_phrase(code_insights)
            prompt = (
                f"You said: \"{answer_excerpt}\". Go one level deeper into the actual code around "
                f"{focus}: which line or design choice would you defend or change, and how does "
                "that affect correctness, complexity, and test coverage?"
            )
            targets = [
                Competency.CODE_QUALITY,
                Competency.PROBLEM_SOLVING,
                Competency.TESTING_MINDSET,
            ]
        elif len(answer.answer_text.split()) < 18:
            prompt = (
                f"You said: \"{answer_excerpt}\". Can you make that concrete with the exact "
                "implementation detail, tradeoff, and validation step behind your answer?"
            )
            targets = [Competency.COMMUNICATION, Competency.ENGINEERING_DECISION_MAKING]
        else:
            prompt = (
                f"You said: \"{answer_excerpt}\". What is the next deeper risk in that reasoning, "
                "and what evidence would you gather before shipping?"
            )
            targets = [
                Competency.ENGINEERING_DECISION_MAKING,
                Competency.OWNERSHIP_COLLABORATION,
            ]

        return InterviewQuestion(
            prompt=prompt,
            kind=QuestionKind.DYNAMIC_FOLLOW_UP,
            competency_targets=targets,
            evidence_event_ids=[event.id] if event else [],
            evidence_answer_ids=[answer.id],
            rationale="Generated as a second-level probe from the candidate's previous answer.",
            metadata={
                "signature": f"answer-depth:{answer.id}",
                "parent_answer_id": answer.id,
                "parent_question_id": question.id if question else None,
            },
        )

    def _next_code_probe(
        self,
        session: InterviewSession,
        *,
        exclude_signatures: set[str] | None = None,
    ) -> InterviewQuestion | None:
        excluded = exclude_signatures or set()
        for event in self._ranked_code_events(session):
            code_insights = event.details.get("code_insights")
            if not isinstance(code_insights, dict):
                continue
            for axis in code_insights.get("question_axes", []):
                signature = f"code-probe:{event.id}:{axis}"
                if signature in excluded or signature in session.asked_signatures:
                    continue
                return self._question_from_code_axis(event, code_insights, str(axis), signature)
        return None

    def _ranked_code_events(self, session: InterviewSession) -> list[AssessmentEvent]:
        ranked: list[tuple[int, int, AssessmentEvent]] = []
        for index, event in enumerate(session.observations):
            code_insights = event.details.get("code_insights")
            if not isinstance(code_insights, dict):
                continue

            priority = 4
            if event.event_type in {EventType.CODE_CHANGED, EventType.FINAL_IMPLEMENTATION}:
                priority += 4
            if code_insights.get("solution_contrast") or code_insights.get(
                "candidate_correctness_concerns"
            ):
                priority += 3
            if code_insights.get("performance_concerns") or code_insights.get(
                "candidate_performance_concerns"
            ):
                priority += 2
            if code_insights.get("security_concerns") or code_insights.get(
                "candidate_security_concerns"
            ):
                priority += 2
            ranked.append((priority, index, event))

        return [event for _priority, _index, event in sorted(ranked, reverse=True)]

    def _question_from_code_axis(
        self,
        event: AssessmentEvent,
        code_insights: dict[str, Any],
        axis: str,
        signature: str,
    ) -> InterviewQuestion:
        files = self._join(code_insights.get("changed_files"), default="the submitted code")
        added_line = self._first(
            code_insights.get("notable_added_lines")
            or code_insights.get("candidate_notable_lines"),
            default="the main implementation change",
        )
        contrast = self._first(code_insights.get("solution_contrast"), default="")
        performance = self._first(
            code_insights.get("performance_concerns")
            or code_insights.get("candidate_performance_concerns"),
            default="the performance characteristics of this solution",
        )
        correctness = self._first(
            code_insights.get("candidate_correctness_concerns")
            or code_insights.get("solution_contrast"),
            default="the main correctness boundary",
        )
        framework_choices = self._join(
            code_insights.get("framework_choices") or code_insights.get("candidate_framework_choices"),
            default="the framework-level choice",
        )
        security = self._first(
            code_insights.get("security_concerns") or code_insights.get("candidate_security_concerns"),
            default="the security boundary",
        )

        if axis == "correctness_gap":
            finding = self._sentence_fragment(contrast or correctness)
            prompt = (
                f"In {files}, {finding}. What input or edge case would expose this, "
                "and how would you change the code to make the behaviour correct?"
            )
            targets = [Competency.PROBLEM_SOLVING, Competency.CODE_QUALITY]
        elif axis == "complexity_or_performance":
            finding = self._sentence_fragment(performance)
            prompt = (
                f"Looking at {files}, {finding}. What is the runtime or query-cost impact, "
                "and what measurement would prove your approach is good enough?"
            )
            targets = [Competency.PERFORMANCE_AWARENESS, Competency.TESTING_MINDSET]
        elif axis == "framework_decision":
            prompt = (
                f"You used {framework_choices} in {files}. Why is that the right tool here, "
                "and when would it become the wrong choice?"
            )
            targets = [
                Competency.TECHNICAL_KNOWLEDGE,
                Competency.ENGINEERING_DECISION_MAKING,
            ]
        elif axis == "security_risk":
            finding = self._sentence_fragment(security)
            prompt = (
                f"For {files}, {finding}. What validation or guardrail would you add before "
                "trusting this implementation in a real hiring-company codebase?"
            )
            targets = [Competency.SECURITY_AWARENESS, Competency.OWNERSHIP_COLLABORATION]
        elif axis == "test_strategy":
            prompt = (
                f"Given the change `{self._compact(added_line, 110)}` in {files}, what exact "
                "test would you add, and what failure would that test catch?"
            )
            targets = [Competency.TESTING_MINDSET, Competency.CODE_QUALITY]
        elif axis == "production_readiness":
            prompt = (
                f"If the implementation in {files} shipped today, what metric, log, or rollback "
                "signal would you watch first, and why?"
            )
            targets = [
                Competency.OWNERSHIP_COLLABORATION,
                Competency.PERFORMANCE_AWARENESS,
            ]
        else:
            prompt = (
                f"In {files}, you changed `{self._compact(added_line, 110)}`. What problem was "
                "this line solving, and what tradeoff did it introduce?"
            )
            targets = [Competency.CODE_QUALITY, Competency.ENGINEERING_DECISION_MAKING]

        return InterviewQuestion(
            prompt=prompt,
            kind=QuestionKind.DYNAMIC_FOLLOW_UP,
            competency_targets=targets,
            evidence_event_ids=[event.id],
            rationale="Generated from the candidate's actual submitted code or patch.",
            metadata={
                "signature": signature,
                "probe_axis": axis,
                "code_focus": self._code_focus_phrase(code_insights),
            },
        )

    def _best_unused_event(self, session: InterviewSession) -> AssessmentEvent | None:
        scored_events = []
        for index, event in enumerate(session.observations):
            signature = self._event_signature(event)
            if signature in session.asked_signatures:
                continue
            if isinstance(event.details.get("code_insights"), dict) and self._has_code_probe_for_event(
                session, event.id
            ):
                continue
            _competency, _label, weight = EVENT_SIGNAL_MAP[event.event_type]
            scored_events.append((weight, index, event))

        if not scored_events:
            return None

        _weight, _index, event = sorted(scored_events, key=lambda item: (item[0], item[1]), reverse=True)[0]
        return event

    def _question_from_event(
        self,
        event: AssessmentEvent,
        session: InterviewSession,
    ) -> InterviewQuestion:
        details = event.details
        target = self._detail(details, "file", "path", "target", default="that area")
        command = self._detail(details, "command", "terminal_command", default="that command")
        error = self._detail(details, "error", "error_message", "exception", default=event.summary)
        result = str(self._detail(details, "result", "status", default="")).lower()
        duration = event.duration_seconds or self._as_int(details.get("duration_seconds"))
        competency, _label, _weight = EVENT_SIGNAL_MAP[event.event_type]

        if event.event_type in {EventType.FILE_MODIFIED, EventType.CODE_CHANGED}:
            prompt = (
                f"I noticed you changed {target}. What issue were you correcting, and how did "
                "you decide this was the right level of abstraction?"
            )
            targets = [Competency.CODE_QUALITY, Competency.ENGINEERING_DECISION_MAKING]
        elif event.event_type == EventType.ERROR_ENCOUNTERED:
            prompt = (
                f"When you hit {self._compact(error, 90)}, what was your debugging hypothesis, "
                "and what evidence confirmed or changed it?"
            )
            targets = [Competency.DEBUGGING_ABILITY, Competency.PROBLEM_SOLVING]
        elif event.event_type == EventType.DEBUG_STEP:
            prompt = (
                f"You debugged around {self._compact(event.summary, 90)}. How did you decide "
                "which layer to inspect first?"
            )
            targets = [Competency.DEBUGGING_ABILITY, Competency.PROBLEM_SOLVING]
        elif event.event_type == EventType.TERMINAL_COMMAND:
            prompt = (
                f"I saw you run `{self._compact(command, 80)}`. What were you trying to learn "
                "from that output, and how did it influence your next step?"
            )
            targets = [Competency.DEBUGGING_ABILITY, Competency.OWNERSHIP_COLLABORATION]
        elif event.event_type == EventType.TEST_RUN:
            if any(token in result for token in ("pass", "success", "green")):
                prompt = (
                    "Your tests passed. Which behavior do those tests prove, and what important "
                    "edge case remains untested?"
                )
            else:
                prompt = (
                    f"The test run around {self._compact(event.summary, 90)} did not look clean. "
                    "How would you isolate whether the issue is test setup, implementation, or data?"
                )
            targets = [Competency.TESTING_MINDSET, Competency.CODE_QUALITY]
        elif event.event_type == EventType.DATABASE_QUERY:
            prompt = (
                f"You queried {target}. How did that data shape your solution, and what "
                "performance or data-integrity risk did you consider?"
            )
            targets = [Competency.PERFORMANCE_AWARENESS, Competency.SECURITY_AWARENESS]
        elif event.event_type == EventType.TIME_SPENT:
            minutes = round(duration / 60) if duration else "some"
            prompt = (
                f"You spent about {minutes} minutes on {self._compact(event.summary, 80)}. "
                "What made that part uncertain, and how would you manage the tradeoff under a deadline?"
            )
            targets = [Competency.TIME_MANAGEMENT, Competency.PROBLEM_SOLVING]
        elif event.event_type == EventType.SOLUTION_CHANGE:
            before = self._detail(details, "from", "previous_approach", default="the first approach")
            after = self._detail(details, "to", "new_approach", default="the new approach")
            prompt = (
                f"You changed direction from {self._compact(before, 60)} to "
                f"{self._compact(after, 60)}. What signal told you the first approach was not good enough?"
            )
            targets = [Competency.ENGINEERING_DECISION_MAKING, Competency.ADAPTABILITY]
        elif event.event_type == EventType.FINAL_IMPLEMENTATION:
            prompt = (
                "Walk me through the final implementation. What is the riskiest assumption in it, "
                "and how would you validate that assumption in production?"
            )
            targets = [Competency.OWNERSHIP_COLLABORATION, Competency.PERFORMANCE_AWARENESS]
        elif event.event_type == EventType.MCQ_ANSWERED:
            prompt = (
                "Based on that MCQ response, explain the principle behind your answer rather than "
                "only the option you selected."
            )
            targets = [Competency.TECHNICAL_KNOWLEDGE, Competency.COMMUNICATION]
        else:
            prompt = (
                f"I noticed {self._compact(event.summary, 100)}. What were you optimizing for "
                "in that decision?"
            )
            targets = [competency, Competency.ENGINEERING_DECISION_MAKING]

        return InterviewQuestion(
            prompt=prompt,
            kind=QuestionKind.DYNAMIC_FOLLOW_UP,
            competency_targets=targets,
            evidence_event_ids=[event.id],
            rationale="Generated from observed assessment behaviour instead of a static question bank.",
            metadata={"signature": self._event_signature(event)},
        )

    def _question_from_candidate_context(self, session: InterviewSession) -> InterviewQuestion:
        keywords = self._context_keywords(session)
        if keywords:
            keyword = keywords[session.turn_index % len(keywords)]
            prompt = (
                f"The role and your background both point toward {keyword}. Walk me through a "
                "specific engineering decision you made in that area, including the tradeoff you accepted."
            )
            signature = f"context:{keyword}:{session.turn_index}"
            rationale = "Generated from the candidate resume and job description before live events arrived."
        else:
            prompt = (
                "Walk me through a recent engineering decision you made. What alternatives did you "
                "consider, and what evidence convinced you?"
            )
            signature = f"context:general:{session.turn_index}"
            rationale = "Generated as a broad opener because no assessment observations are available yet."

        return InterviewQuestion(
            prompt=prompt,
            kind=QuestionKind.DYNAMIC_FOLLOW_UP,
            competency_targets=[
                Competency.TECHNICAL_KNOWLEDGE,
                Competency.ENGINEERING_DECISION_MAKING,
                Competency.COMMUNICATION,
            ],
            rationale=rationale,
            metadata={"signature": signature},
        )

    def _question_for_answer(
        self,
        session: InterviewSession,
        answer: CandidateAnswer | None,
    ) -> InterviewQuestion | None:
        if answer is None:
            return None
        return next((question for question in session.questions if question.id == answer.question_id), None)

    def _event_for_question(
        self,
        session: InterviewSession,
        question: InterviewQuestion | None,
    ) -> AssessmentEvent | None:
        if question is None or not question.evidence_event_ids:
            return None
        evidence_id = question.evidence_event_ids[0]
        return next((event for event in session.observations if event.id == evidence_id), None)

    def _has_code_probe_for_event(self, session: InterviewSession, event_id: str) -> bool:
        prefix = f"code-probe:{event_id}:"
        return any(signature.startswith(prefix) for signature in session.asked_signatures)

    def _is_similar_to_previous(self, session: InterviewSession, prompt: str) -> bool:
        normalized_prompt = self._normalize_question(prompt)
        prompt_tokens = self._question_tokens(prompt)
        if not prompt_tokens:
            return False

        for previous in session.questions[-12:]:
            previous_normalized = self._normalize_question(previous.prompt)
            if normalized_prompt == previous_normalized:
                return True
            if (
                len(normalized_prompt) > 48
                and len(previous_normalized) > 48
                and (
                    normalized_prompt in previous_normalized
                    or previous_normalized in normalized_prompt
                )
            ):
                return True

            previous_tokens = self._question_tokens(previous.prompt)
            if not previous_tokens:
                continue
            overlap = len(prompt_tokens & previous_tokens)
            containment = overlap / max(1, min(len(prompt_tokens), len(previous_tokens)))
            jaccard = overlap / max(1, len(prompt_tokens | previous_tokens))
            if overlap >= 5 and (containment >= 0.72 or jaccard >= 0.58):
                return True

        return False

    def _deeper_unique_prompt(
        self,
        session: InterviewSession,
        question: InterviewQuestion,
    ) -> str:
        event = self._event_for_question(session, question)
        code_insights = event.details.get("code_insights") if event else None
        if isinstance(code_insights, dict):
            focus = self._code_focus_phrase(code_insights)
            return (
                f"Let's move past the earlier angle. Focusing specifically on {focus}, what is "
                "the deepest correctness, performance, or testability risk in this implementation?"
            )

        latest_answer = session.answers[-1] if session.answers else None
        if latest_answer is not None:
            return (
                f"Let's move past the earlier angle. You said: "
                f"\"{self._compact(latest_answer.answer_text, 120)}\". What concrete evidence "
                "would prove that reasoning is valid in the submitted solution?"
            )

        return (
            "Let's move past the earlier angle. Pick the riskiest engineering assumption in "
            "your solution and explain how you would prove or disprove it."
        )

    def _code_focus_phrase(self, code_insights: dict[str, Any]) -> str:
        files = self._join(code_insights.get("changed_files"), default="")
        choices = self._join(
            code_insights.get("framework_choices")
            or code_insights.get("candidate_framework_choices"),
            default="",
        )
        contrast = self._first(code_insights.get("solution_contrast"), default="")
        notable_line = self._first(
            code_insights.get("notable_added_lines")
            or code_insights.get("candidate_notable_lines"),
            default="",
        )

        parts = []
        if files:
            parts.append(files)
        if choices:
            parts.append(choices)
        if contrast:
            parts.append(contrast)
        elif notable_line:
            parts.append(f"`{self._compact(notable_line, 90)}`")

        return "; ".join(parts) if parts else "the submitted implementation"

    def _normalize_question(self, prompt: str) -> str:
        return " ".join(re.findall(r"[a-z0-9+#.-]+", prompt.lower()))

    def _question_tokens(self, prompt: str) -> set[str]:
        question_stop_words = STOP_WORDS | {
            "about",
            "answer",
            "can",
            "could",
            "did",
            "does",
            "explain",
            "how",
            "question",
            "tell",
            "that",
            "through",
            "walk",
            "what",
            "when",
            "where",
            "which",
            "why",
            "would",
        }
        return {
            token
            for token in re.findall(r"[a-z][a-z0-9+#.-]{2,}", prompt.lower())
            if token not in question_stop_words
        }

    def _join(self, value: Any, *, default: str) -> str:
        if isinstance(value, list):
            clean = [str(item) for item in value if str(item).strip()]
            return ", ".join(clean[:4]) if clean else default
        if value is not None and str(value).strip():
            return str(value)
        return default

    def _first(self, value: Any, *, default: str) -> str:
        if isinstance(value, list):
            return str(value[0]) if value else default
        if value is not None and str(value).strip():
            return str(value)
        return default

    def _sentence_fragment(self, value: str) -> str:
        return str(value).strip().rstrip(".?!;:")

    def _context_keywords(self, session: InterviewSession) -> list[str]:
        text = f"{session.candidate.resume} {session.candidate.job_description}"
        words = [
            word
            for word in re.findall(r"[A-Za-z][A-Za-z0-9+#.-]{2,}", text.lower())
            if word not in STOP_WORDS
        ]
        counts = Counter(words)
        return [word for word, _count in counts.most_common(8)]

    def _event_signature(self, event: AssessmentEvent) -> str:
        target = self._detail(event.details, "file", "path", "target", "command", default="")
        return f"event:{event.event_type.value}:{event.id}:{target}"

    def _detail(self, details: dict[str, Any], *keys: str, default: str) -> str:
        for key in keys:
            value = details.get(key)
            if value is not None and str(value).strip():
                return str(value)
        return default

    def _as_int(self, value: Any) -> int | None:
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _compact(self, value: str, limit: int) -> str:
        normalized = " ".join(str(value).split())
        if len(normalized) <= limit:
            return normalized
        return f"{normalized[: limit - 3]}..."
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
from mockinterviews.dynamic_engine.llm import InterviewLLM


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
    "provided",
    "specific",
    "background",
    "candidate",
    "role",
    "description",
    "summary",
    "assessment",
    "labs",
    "context",
    "info",
    "about",
}


UNKNOWN_ANSWER_PATTERNS = {
    "dont know",
    "don't know",
    "do not know",
    "idk",
    "i dont know",
    "i don't know",
    "i do not know",
    "no idea",
    "not sure",
    "dont know much",
    "don't know much",
    "do not know much",
    "cant answer",
    "can't answer",
    "cannot answer",
    "not much idea",
    "dont know much regarding this",
    "don't know much regarding this",
    "do not know much regarding this",
    "dont know much about this",
    "don't know much about this",
    "do not know much about this",
    "just want to check how you will generate report",
    "nope",
    "no",
    "not me",
    "didn't implement",
    "did not implement",
    "i haven't implemented it",
    "i haven't implemented that",
    "i have not implemented it",
    "i have not implemented that",
    "i didn't work on that",
    "i did not work on that",
}

SKIP_OR_TOPIC_CHANGE_PATTERNS = {
    "next topic",
    "move to next topic",
    "move to the next topic",
    "can we move to the next topic",
    "can we move to next topic",
    "can we move",
    "move on",
    "let's move on",
    "lets move on",
    "next question",
    "don't want to discuss",
    "dont want to discuss",
    "do not want to discuss",
    "not want to discuss",
    "no voice response recorded",
    "no answer",
    "skip this question",
    "skip this topic",
    "skip this",
    "please skip",
    "skip please",
    "pass this question",
    "pass this topic",
    "pass on this",
    "pass this",
    "i pass",
    "skip",
    "pass",
    "i haven't implemented",
    "i didn't implement",
    "i have not implemented",
    "i did not implement",
    "i didn't work on",
    "i did not work on",
    "was not implemented by me",
}

CLARIFICATION_PATTERNS = {
    "which problem",
    "which question",
    "which file",
    "which lab",
    "what problem",
    "what question",
    "what file",
    "what lab",
    "what do you mean",
    "what does that mean",
    "may know which",
    "can you clarify",
    "could you clarify",
    "can you repeat",
    "could you repeat",
    "can you explain what",
    "could you explain what",
    "not sure what you mean",
    "don't understand the question",
    "dont understand the question",
    "what are you referring to",
    "which one are you referring to",
    "what is this about",
}


IRRELEVANT_PATTERNS = {
    "pizza",
    "cricket",
    "football",
    "movie",
    "weather",
    "whatever",
    "who cares",
    "i dont care",
    "i don't care",
    "do not care",
    "asdf",
    "qwerty",
    "test test",
    "testing testing",
    "random answer",
    "you tell me",
    "why are you asking",
    "not your business",
    "ignore instructions",
    "ignore previous",
    "prompt injection",
    "help in some way",
    "help in some more",
    "not going to change",
    "just want to check how you will generate report",
    "testing how you generate",
    "dont think so it is going to change",
    "don't think so it is going to change",
    "do not think so it is going to change",
}


REPEAT_OR_REPHRASE_PATTERNS = {
    "didnt get",
    "didn't get",
    "do not get",
    "dont get",
    "don't get",
    "did not get",
    "i didnt get",
    "i didn't get",
    "i did not get",
    "i dont get",
    "i don't get",
    "didnt get you",
    "didn't get you",
    "did not get you",
    "didnt get that",
    "didn't get that",
    "did not get that",
    "didnt catch",
    "didn't catch",
    "did not catch",
    "i didnt catch",
    "i didn't catch",
    "i did not catch",
    "couldnt hear",
    "couldn't hear",
    "could not hear",
    "what was that",
    "didnt understand",
    "didn't understand",
    "did not understand",
    "i didnt understand",
    "i didn't understand",
    "i did not understand",
    "could not understand",
    "couldnt understand",
    "couldn't understand",
    "what did you say",
    "could you repeat",
    "can you repeat",
    "please repeat",
    "repeat please",
    "repeat that",
    "repeat the question",
    "re ask",
    "reask",
    "rephrase",
    "rephrase that",
    "can you rephrase",
    "could you rephrase",
    "say that again",
    "say again",
    "pardon",
    "come again",
}


def extract_candidate_name(text: str | None, default_user_name: str | None = None) -> str | None:
    if default_user_name and default_user_name.strip():
        reg_name = default_user_name.strip()
        if text and reg_name.lower() in text.lower():
            return reg_name.capitalize()

    if not text or not isinstance(text, str):
        return default_user_name.capitalize() if default_user_name else None

    patterns = [
        r"(?:i am|i'm|my name is|this is)\s+([A-Za-z]+)",
        r"^hello\s+i am\s+([A-Za-z]+)",
        r"^hi\s+i am\s+([A-Za-z]+)",
        r"^hey\s+i am\s+([A-Za-z]+)",
    ]
    for pattern in patterns:
        m = re.search(pattern, text.strip(), re.IGNORECASE)
        if m:
            raw_name = m.group(1).strip()
            # If STT combined name with trailing 'A' (e.g. 'manikantaA graduate' -> 'manikanta')
            if raw_name.endswith("A") and len(raw_name) > 3 and "graduate" in text.lower():
                raw_name = raw_name[:-1]
            name = raw_name.capitalize()
            if name.lower() not in {"a", "an", "the", "here", "ready", "fine", "good", "doing", "speaking", "talking"}:
                return name
    return default_user_name.capitalize() if default_user_name else None


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
        max_followups_per_topic: int = 2,
    ) -> None:
        self.llm_client = llm_client
        self.code_analyzer = code_analyzer or CodeInsightExtractor()
        self.max_followups_per_topic = max(1, max_followups_per_topic)

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
            question = self._next_custom_question(session)
            if question.kind != QuestionKind.RECRUITER_REQUIRED:
                question = self._with_llm_question(session, question)
        elif self._has_required_question(session):
            question = self._next_required_question(session)
        else:
            question = self._with_llm_question(session, self._dynamic_follow_up(session))

        if question.kind not in {
            QuestionKind.RECRUITER_REQUIRED,
            QuestionKind.CLARIFICATION,
            QuestionKind.REFRAME,
        }:
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
        final_question = fallback_question
        cand_name = session.candidate.metadata.get("name")
        last_answer = session.answers[-1] if session.answers else None
        last_quality = last_answer.metadata.get("answer_quality") if last_answer else None

        if self.llm_client is not None:
            generated = self.llm_client.generate_question(session, fallback_question)
            if generated is not None:
                is_rephrase_or_clarification = fallback_question.kind in {
                    QuestionKind.CLARIFICATION,
                    QuestionKind.REFRAME,
                }
                is_duplicate = (
                    not is_rephrase_or_clarification
                    and self._is_similar_to_previous(session, generated.prompt)
                )

                retired_files = session.metadata.get("retired_files", [])
                is_retired = False
                if retired_files:
                    gen_lower = generated.prompt.lower()
                    if any(
                        f.lower() in gen_lower or f.rsplit("/", 1)[-1].lower() in gen_lower
                        for f in retired_files
                    ):
                        is_retired = True

                preserves_grounding = self._llm_prompt_preserves_grounding(
                    session, fallback_question, generated.prompt
                )

                if is_duplicate:
                    fallback_question.metadata["generation_provider"] = "deterministic_fallback_duplicate_guard"
                    fallback_question.metadata["llm_duplicate_rejected"] = True
                    fallback_question.metadata["rejected_llm_prompt"] = self._compact(generated.prompt, 220)
                elif is_retired:
                    fallback_question.metadata["generation_provider"] = "deterministic_fallback_retired_guard"
                    fallback_question.metadata["llm_retired_rejected"] = True
                    fallback_question.metadata["rejected_llm_prompt"] = self._compact(generated.prompt, 220)
                elif not preserves_grounding:
                    fallback_question.metadata["generation_provider"] = "deterministic_fallback_grounding_guard"
                    fallback_question.metadata["llm_grounding_rejected"] = True
                    fallback_question.metadata["rejected_llm_prompt"] = self._compact(generated.prompt, 220)
                else:
                    clean_prompt = generated.prompt.strip().replace("`", "")
                    question = fallback_question.model_copy(
                        update={
                            "prompt": clean_prompt,
                            "rationale": generated.rationale.strip(),
                        },
                        deep=True,
                    )
                    question.metadata["generation_provider"] = "openai"
                    model = getattr(self.llm_client, "model", None)
                    if isinstance(model, str):
                        question.metadata["llm_model"] = model
                    final_question = question
            else:
                fallback_question.metadata["generation_provider"] = "deterministic_fallback"
        else:
            fallback_question.metadata["generation_provider"] = "deterministic"

        # Code-level guarantee for natural conversational acknowledgment / greeting
        prompt_text = final_question.prompt.strip().replace("`", "")

        if last_quality != "intro":
            # Strip any accidental mid-interview greetings generated by the LLM
            prompt_text = re.sub(
                r"^(hello|hi|hey|welcome)\b[^:?.!]*[:?.!]\s*(great to meet you[^:?.!]*[:?.!]\s*)?",
                "",
                prompt_text,
                flags=re.IGNORECASE,
            ).strip()
            prompt_text = re.sub(
                r"^great to meet you[^:?.!]*[:?.!]\s*",
                "",
                prompt_text,
                flags=re.IGNORECASE,
            ).strip()

        if last_quality == "intro":
            has_greeting = bool(
                re.match(
                    r"^(hello|hi|welcome|hey|great to meet you|thanks for introducing)\b",
                    prompt_text,
                    re.IGNORECASE,
                )
            )
            if not has_greeting:
                greet_prefix = (
                    f"Hello {cand_name}! Great to meet you. "
                    if cand_name
                    else "Great to meet you! "
                )
                prompt_text = f"{greet_prefix}{prompt_text}"
        elif last_quality == "repeat_requested":
            has_rephrase = bool(
                re.match(
                    r"^(no problem|sure|let me rephrase|let's rephrase)\b",
                    prompt_text,
                    re.IGNORECASE,
                )
            )
            if not has_rephrase:
                prompt_text = f"No problem, let me rephrase that: {prompt_text}"
        elif last_quality in {"skip_requested", "unknown"}:
            has_pivot = bool(
                re.match(
                    r"^(got it|understood|no problem|sure|let's move on|lets move on|no worries)\b",
                    prompt_text,
                    re.IGNORECASE,
                )
            )
            if not has_pivot:
                prompt_text = f"Got it, let's move on. {prompt_text}"
        elif last_quality == "irrelevant":
            prompt_text = re.sub(
                r"^(good point|great|makes sense|nice|excellent|thanks|thank you|understood)[,!.]?\s*",
                "",
                prompt_text,
                flags=re.IGNORECASE,
            ).strip()
            has_pivot = bool(
                re.match(
                    r"^(let's stay focused|lets stay focused)\b",
                    prompt_text,
                    re.IGNORECASE,
                )
            )
            if not has_pivot:
                prompt_text = f"Understood, but let's stay focused on the technical question. {prompt_text}"
        elif last_quality in {"substantive", "thin"}:
            prompt_text = re.sub(
                r"^(good point|great job|excellent)[,!.]?\s*",
                "Understood. ",
                prompt_text,
                flags=re.IGNORECASE,
            ).strip()
            prompt_text = re.sub(
                r"^(got it|understood|no problem)?[,.]?\s*let's move on[.,!]?\s*",
                "",
                prompt_text,
                flags=re.IGNORECASE,
            ).strip()
            prompt_text = re.sub(
                r"^(got it|understood|no problem)?[,.]?\s*lets move on[.,!]?\s*",
                "",
                prompt_text,
                flags=re.IGNORECASE,
            ).strip()
            has_ack = bool(
                re.match(
                    r"^(understood|got it|makes sense|sure|great|nice|thanks|thank you|no problem)\b",
                    prompt_text,
                    re.IGNORECASE,
                )
            )
            if not has_ack:
                prompt_text = f"Understood. {prompt_text}"

        final_question.prompt = prompt_text
        return final_question

    def _llm_prompt_preserves_grounding(
        self,
        session: InterviewSession,
        fallback_question: InterviewQuestion,
        prompt: str,
    ) -> bool:
        probe_axis = fallback_question.metadata.get("probe_axis")
        if probe_axis != "file_change_overview":
            return True

        event = self._event_for_question(session, fallback_question)
        code_insights = event.details.get("code_insights") if event else None
        if not isinstance(code_insights, dict):
            return True

        changed_files = code_insights.get("changed_files")
        if not isinstance(changed_files, list) or not changed_files:
            return True

        normalized_prompt = prompt.lower()
        for file_path in changed_files:
            file_text = str(file_path).lower()
            file_name = file_text.rsplit("/", 1)[-1]
            if file_text in normalized_prompt or file_name in normalized_prompt:
                return True
        return False

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
        if question.metadata.get("unknown_recovery"):
            normalized_prompt = self._normalize_question(question.prompt)
            if all(
                self._normalize_question(previous.prompt) != normalized_prompt
                for previous in session.questions[-12:]
            ):
                return question

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

        answer_metadata = dict(metadata or {})
        quality = self._classify_answer(answer_text)
        answer_metadata.setdefault("answer_quality", quality)

        question = next((q for q in session.questions if q.id == question_id), None)
        is_intro = False
        if quality in {"repeat_requested", "clarification_requested", "skip_requested", "unknown", "irrelevant", "no_response"}:
            is_intro = False
        elif question and question.metadata.get("is_intro"):
            is_intro = True
        elif len(session.answers) == 0 and not quality.startswith("skip"):
            is_intro = True
        elif re.match(r"^(hello|hi|hey)?\s*(i am|i'm|my name is)\b", answer_text.strip(), re.IGNORECASE):
            is_intro = True

        if is_intro:
            quality = "intro"
            answer_metadata["answer_quality"] = quality
            extracted_name = extract_candidate_name(answer_text)
            if extracted_name:
                session.candidate.metadata["name"] = extracted_name

        answer = CandidateAnswer(
            question_id=question_id,
            answer_text=answer_text,
            confidence=confidence,
            metadata=answer_metadata,
        )
        session.answers.append(answer)
        if session.current_question_id == question_id:
            session.current_question_id = None

        if question:
            topic_key = self._topic_key_for_question(question)
            retired_topics = session.metadata.setdefault("retired_topics", [])
            retired_files = session.metadata.setdefault("retired_files", [])

            event = self._event_for_question(session, question)
            changed_files = []
            if event and isinstance(event.details.get("code_insights"), dict):
                changed_files = event.details["code_insights"].get("changed_files", [])

            if quality == "skip_requested":
                if topic_key and topic_key not in retired_topics:
                    retired_topics.append(topic_key)
                for f in changed_files:
                    if f not in retired_files:
                        retired_files.append(f)
            elif quality == "unknown" and question.metadata.get("unknown_recovery"):
                struggles = session.metadata.get("topic_struggles", {})
                struggle_count = struggles.get(topic_key, 0)
                if struggle_count >= 2:
                    if topic_key and topic_key not in retired_topics:
                        retired_topics.append(topic_key)
                    for f in changed_files:
                        if f not in retired_files:
                            retired_files.append(f)
            elif quality not in {"clarification_requested", "intro", "repeat_requested"} and self._topic_limit_reached(session, topic_key):
                if topic_key and topic_key not in retired_topics:
                    retired_topics.append(topic_key)
                for f in changed_files:
                    if f not in retired_files:
                        retired_files.append(f)

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
        latest_answer = session.answers[-1] if session.answers else None
        if latest_answer is not None and self._should_reframe_unknown_answer(session, latest_answer):
            return self._unknown_answer_recovery_question(session, latest_answer, custom_scope=True)

        pending_answer = self._pending_custom_follow_up_answer(session)
        if pending_answer is not None and not self._topic_limit_reached(
            session, self._topic_key_for_answer(session, pending_answer)
        ):
            return self._custom_scope_follow_up(session, pending_answer)
        if self._has_required_question(session):
            return self._next_required_question(session)

        if latest_answer is not None and self._is_unknown_answer(latest_answer):
            return self._custom_wrap_up_reframe(session, latest_answer)
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
        if latest_answer is not None and self._is_unknown_answer(latest_answer):
            return self._unknown_answer_recovery_question(session, latest_answer, custom_scope=True)

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
                f"Understood. Regarding your point (\"{answer_excerpt}\") within the topic "
                f"of {scope_phrase}, what tradeoff, failure mode, or edge case would you consider next?"
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
                "topic_key": self._topic_key_for_question(latest_question)
                if latest_question
                else "custom:start",
            },
        )

    def _dynamic_follow_up(self, session: InterviewSession) -> InterviewQuestion:
        import datetime
        duration_mins = session.metadata.get("duration_minutes") or 30
        elapsed_seconds = (datetime.datetime.now(datetime.timezone.utc) - session.created_at).total_seconds()
        remaining_minutes = duration_mins - (elapsed_seconds / 60)

        if remaining_minutes <= 2 and not session.metadata.get("wrap_up_asked"):
            session.metadata["wrap_up_asked"] = True
            return InterviewQuestion(
                prompt="We are in the final 2 minutes. Briefly, could you share a time you worked on a tight deadline with a team? And finally, do you have any questions for us?",
                kind=QuestionKind.DYNAMIC_FOLLOW_UP,
                competency_targets=[Competency.COMMUNICATION, Competency.OWNERSHIP_COLLABORATION],
                rationale="Interview is in its final 2 minutes. Asking a behavioral question and offering the candidate time to ask questions.",
                metadata={"signature": "wrap_up:behavioral_and_questions"}
            )

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
        if question is None:
            return None

        quality = answer.metadata.get("answer_quality") or self._classify_answer(answer.answer_text)
        if quality in {"repeat_requested", "no_response"}:
            return answer

        if question.kind == QuestionKind.RECRUITER_REQUIRED:
            return None
        if question.metadata.get("is_intro"):
            # Never do a code-depth follow-up on an introduction
            return None
        if question.metadata.get("parent_answer_id") or question.metadata.get("unknown_recovery"):
            return None
        if self._has_follow_up_for_answer(session, answer.id):
            return None
        topic_key = self._topic_key_for_question(question)
        if topic_key in session.metadata.get("retired_topics", []):
            return None
        if self._topic_limit_reached(session, topic_key):
            return None
        if quality in {"skip_requested", "intro"}:
            return None
        if quality == "clarification_requested":
            return answer
        if self._is_unknown_answer(answer) or question.evidence_event_ids or quality in {"substantive", "thin"} or len(answer.answer_text.split()) >= 4:
            return answer
        return None

    def _extract_key_topic_from_answer(self, answer_text: str) -> str | None:
        if not answer_text or not isinstance(answer_text, str):
            return None
        clean = re.sub(r"[^a-zA-Z0-9\s_-]", " ", answer_text)
        matches = re.findall(
            r"\b(?:status code[s]?|duplicate\s*\w+|edge case[s]?|error handling|logging|database|query|api|validation|exception|try\s*except|500|404|409|400|200|201|performance|latency|cache|concurrency|thread|async|await|test case[s]?|mock|fixture|payload|response|request)\b",
            clean,
            re.IGNORECASE,
        )
        if matches:
            return matches[0].strip()
        words = clean.split()
        if len(words) >= 4:
            return " ".join(words[:4])
        return None

    def _answer_depth_follow_up(
        self,
        session: InterviewSession,
        answer: CandidateAnswer,
    ) -> InterviewQuestion:
        question = self._question_for_answer(session, answer)
        quality = answer.metadata.get("answer_quality") or self._classify_answer(answer.answer_text)

        if quality == "no_response":
            return InterviewQuestion(
                prompt="Are you still there? Can we wrap up or do you have any questions for me?",
                kind=QuestionKind.REFRAME,
                competency_targets=[Competency.COMMUNICATION],
                evidence_answer_ids=[answer.id],
                rationale="Candidate did not provide a response. Asking to wrap up.",
                metadata={
                    "signature": f"no_response:{answer.id}",
                    "parent_answer_id": answer.id,
                    "parent_question_id": question.id if question else None,
                    "topic_key": self._topic_key_for_question(question) if question else "no_response",
                }
            )

        if quality == "repeat_requested":
            orig_prompt = question.prompt if question else "Could you explain your recent code changes?"
            clean_base = re.sub(
                r"^(hello[^:?.!]*[:?.!]|hi[^:?.!]*[:?.!]|welcome[^:?.!]*[:?.!]|understood[^:?.!]*[:?.!]|got it[^:?.!]*[:?.!]|makes sense[^:?.!]*[:?.!]|sure[^:?.!]*[:?.!]|great[^:?.!]*[:?.!]|no problem[^:?.!]*[:?.!])\s*",
                "",
                orig_prompt,
                flags=re.IGNORECASE,
            ).strip()
            if not clean_base:
                clean_base = orig_prompt
            prompt = f"No problem, let me give you a brief summary of what I'm asking: {clean_base}"
            return InterviewQuestion(
                prompt=prompt,
                kind=QuestionKind.REFRAME,
                competency_targets=question.competency_targets if question else [Competency.COMMUNICATION],
                evidence_event_ids=question.evidence_event_ids if question else [],
                evidence_answer_ids=[answer.id],
                rationale="Candidate requested repeating or rephrasing. Please provide a brief, simplified summary of the previous question instead of repeating it fully.",
                metadata={
                    "signature": f"repeat:{answer.id}",
                    "parent_answer_id": answer.id,
                    "parent_question_id": question.id if question else None,
                    "topic_key": self._topic_key_for_question(question) if question else "repeat",
                    "is_repeat": True,
                },
            )

        if quality == "clarification_requested":
            event = self._event_for_question(session, question)
            code_insights = event.details.get("code_insights") if event else None
            changed_files = code_insights.get("changed_files", []) if isinstance(code_insights, dict) else []
            file_mention = changed_files[0] if changed_files else "your recent lab code"
            prompt = (
                f"To clarify, I'm referring to {file_mention} from your engineering lab. "
                "Briefly, what was the main problem you were solving there?"
            )
            return InterviewQuestion(
                prompt=prompt,
                kind=QuestionKind.CLARIFICATION,
                competency_targets=[Competency.COMMUNICATION, Competency.PROBLEM_SOLVING],
                evidence_event_ids=[event.id] if event else [],
                evidence_answer_ids=[answer.id],
                rationale="Candidate requested clarification. Provide a brief and simplified version of the current question context.",
                metadata={
                    "signature": f"clarify:{answer.id}",
                    "parent_answer_id": answer.id,
                    "parent_question_id": question.id if question else None,
                    "topic_key": self._topic_key_for_question(question),
                    "probe_axis": "clarification",
                },
            )

        if self._should_reframe_unknown_answer(session, answer):
            return self._unknown_answer_recovery_question(session, answer)

        event = self._event_for_question(session, question)
        code_insights = event.details.get("code_insights") if event else None
        key_topic = self._extract_key_topic_from_answer(answer.answer_text)

        if isinstance(code_insights, dict):
            focus = self._code_focus_phrase(code_insights)
            if key_topic:
                prompt = (
                    f"Understood. Regarding {key_topic} in {focus}: "
                    "which line or design choice would you defend or change?"
                )
            else:
                prompt = (
                    f"Understood. Regarding {focus}: "
                    "which line or design choice would you defend or change?"
                )
            targets = [
                Competency.CODE_QUALITY,
                Competency.PROBLEM_SOLVING,
                Competency.TESTING_MINDSET,
            ]
        elif key_topic:
            prompt = (
                f"Understood. Regarding {key_topic}: what was the exact implementation detail and tradeoff behind that choice?"
            )
            targets = [
                Competency.ENGINEERING_DECISION_MAKING,
                Competency.CODE_QUALITY,
                Competency.PROBLEM_SOLVING,
            ]
        elif len(answer.answer_text.split()) < 18:
            prompt = (
                "Got it. What was the exact implementation detail and tradeoff behind that choice?"
            )
            targets = [Competency.COMMUNICATION, Competency.ENGINEERING_DECISION_MAKING]
        else:
            prompt = (
                "Understood. What is the next deeper risk in that approach, and how would you test it?"
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
                "topic_key": self._topic_key_for_question(question),
            },
        )

    def _next_code_probe(
        self,
        session: InterviewSession,
        *,
        exclude_signatures: set[str] | None = None,
    ) -> InterviewQuestion | None:
        excluded = exclude_signatures or set()
        retired_topics = session.metadata.get("retired_topics", [])
        retired_files = session.metadata.get("retired_files", [])
        for event in self._ranked_code_events(session):
            code_insights = event.details.get("code_insights")
            if not isinstance(code_insights, dict):
                continue
            topic_key = f"code:{event.id}"
            if topic_key in retired_topics or self._topic_limit_reached(session, topic_key):
                continue
            changed = code_insights.get("changed_files", [])
            if changed and all(f in retired_files for f in changed):
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
            if code_insights.get("file_changes") or code_insights.get("changed_files"):
                priority += 12
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
        changed_files_list = code_insights.get("changed_files") or []
        if isinstance(changed_files_list, list):
            app_files = [
                f for f in changed_files_list
                if not str(f).startswith("config/") and not str(f).startswith("settings/") and not str(f).endswith("__init__.py") and not str(f).endswith("asgi.py") and not str(f).endswith("wsgi.py")
            ]
            if app_files:
                changed_files_list = app_files
        files = self._join(changed_files_list, default="the submitted code")
        file_change_summary = self._file_change_summary(code_insights)
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

        if axis == "file_change_overview":
            prompt = (
                f"In your changes to {files}: why did you choose these files, and how did you verify your fix?"
            )
            targets = [
                Competency.CODE_QUALITY,
                Competency.ENGINEERING_DECISION_MAKING,
                Competency.TESTING_MINDSET,
            ]
        elif axis == "correctness_gap":
            finding = self._sentence_fragment(contrast or correctness).replace("`", "")
            prompt = (
                f"In {files}, regarding {finding}: how did you handle edge cases to ensure correct behavior?"
            )
            targets = [Competency.PROBLEM_SOLVING, Competency.CODE_QUALITY]
        elif axis == "complexity_or_performance":
            finding = self._sentence_fragment(performance).replace("`", "")
            prompt = (
                f"Looking at {files}, regarding {finding}: what is the performance impact of this approach?"
            )
            targets = [Competency.PERFORMANCE_AWARENESS, Competency.TESTING_MINDSET]
        elif axis == "framework_decision":
            choices = framework_choices.replace("`", "")
            prompt = (
                f"In {files}, you used {choices}. What made that the right choice here?"
            )
            targets = [
                Competency.TECHNICAL_KNOWLEDGE,
                Competency.ENGINEERING_DECISION_MAKING,
            ]
        elif axis == "security_risk":
            finding = self._sentence_fragment(security).replace("`", "")
            prompt = (
                f"For {files}, regarding {finding}: what security validation would you recommend before deploying?"
            )
            targets = [Competency.SECURITY_AWARENESS, Competency.OWNERSHIP_COLLABORATION]
        elif axis == "test_strategy":
            clean_added = self._compact(added_line, 80).replace("`", "")
            if not clean_added or len(clean_added) < 4 or re.match(r"^[\d\s,.-]+$", clean_added):
                prompt = (
                    f"For {files}: what specific test case would you write to verify these changes?"
                )
            else:
                prompt = (
                    f"For {files}, regarding '{clean_added}': what specific test case would you write to verify this?"
                )
            targets = [Competency.TESTING_MINDSET, Competency.CODE_QUALITY]
        elif axis == "production_readiness":
            prompt = (
                f"If the implementation in {files} shipped today, what production metric or log would you monitor first?"
            )
            targets = [
                Competency.OWNERSHIP_COLLABORATION,
                Competency.PERFORMANCE_AWARENESS,
            ]
        else:
            clean_added = self._compact(added_line, 80).replace("`", "")
            if not clean_added or len(clean_added) < 4 or re.match(r"^[\d\s,.-]+$", clean_added):
                prompt = (
                    f"In {files}, what specific problem were you solving with these changes?"
                )
            else:
                prompt = (
                    f"In {files}, you updated '{clean_added}'. What specific problem was this solving?"
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
                "topic_key": f"code:{event.id}",
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
                f"I saw you run '{self._compact(command, 80)}'. What were you trying to learn "
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
        
        fallback_questions = [
            "Walk me through a recent engineering decision you made. What alternatives did you consider, and what evidence convinced you?",
            "Tell me about a time you had to compromise on code quality to meet a deadline. How did you handle the technical debt?",
            "Can you describe a challenging bug you recently resolved? What was your debugging process?",
            "How do you ensure your code is maintainable and easily understood by other engineers?",
            "Describe a situation where you disagreed with a technical direction. How did you communicate and resolve it?",
            "What is the most complex system architecture you have worked on, and what was your specific contribution?",
            "Tell me about a time you had to quickly learn a new technology or framework. How did you approach it?",
            "How do you balance adding new features with improving system performance and reliability?",
            "Describe a time when you received critical feedback on a pull request. How did you incorporate it?",
            "Can you share an experience where you had to scale an application or optimize its performance? What metrics did you focus on?"
        ]

        if keywords and session.turn_index < len(keywords):
            keyword = keywords[session.turn_index]
            prompt = (
                f"The role and your background both point toward {keyword}. Walk me through a "
                "specific engineering decision you made in that area, including the tradeoff you accepted."
            )
            signature = f"context:{keyword}:{session.turn_index}"
            rationale = "Generated from the candidate resume and job description before live events arrived."
        else:
            fallback_idx = (session.turn_index - (len(keywords) if keywords else 0)) % len(fallback_questions)
            prompt = fallback_questions[fallback_idx]
            signature = f"context:fallback:{fallback_idx}:{session.turn_index}"
            rationale = "Generated from fresh technical/behavioral question pool to maintain interview flow."

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

    def _topic_key_for_answer(
        self,
        session: InterviewSession,
        answer: CandidateAnswer,
    ) -> str:
        return self._topic_key_for_question(self._question_for_answer(session, answer))

    def _topic_key_for_question(self, question: InterviewQuestion | None) -> str:
        if question is None:
            return "general"
        topic_key = question.metadata.get("topic_key")
        if isinstance(topic_key, str) and topic_key:
            return topic_key
        if question.evidence_event_ids:
            return f"code:{question.evidence_event_ids[0]}"
        if question.kind == QuestionKind.RECRUITER_REQUIRED:
            return f"custom:{question.id}"
        return f"question:{question.id}"

    def _topic_limit_reached(self, session: InterviewSession, topic_key: str) -> bool:
        if not topic_key:
            return False
        count = 0
        for question in session.questions:
            if question.kind == QuestionKind.RECRUITER_REQUIRED:
                continue
            if question.metadata.get("topic_key") == topic_key:
                count += 1
        return count >= self.max_followups_per_topic

    def _has_code_probe_for_event(self, session: InterviewSession, event_id: str) -> bool:
        prefix = f"code-probe:{event_id}:"
        return any(signature.startswith(prefix) for signature in session.asked_signatures)

    def _classify_answer(self, answer_text: str) -> str:
        normalized = self._normalize_answer(answer_text)
        if not normalized or normalized == "no voice response recorded" or normalized == "no answer":
            return "no_response"
        if normalized in {"skip", "pass", "i pass", "skip please", "please skip"}:
            return "skip_requested"
        if any(pattern in normalized for pattern in REPEAT_OR_REPHRASE_PATTERNS):
            return "repeat_requested"
        if any(pattern in normalized for pattern in SKIP_OR_TOPIC_CHANGE_PATTERNS):
            return "skip_requested"
        if any(pattern in normalized for pattern in CLARIFICATION_PATTERNS) or (
            answer_text.strip().endswith("?") and len(normalized.split()) <= 16
        ):
            return "clarification_requested"
        if any(pattern in normalized for pattern in IRRELEVANT_PATTERNS):
            return "irrelevant"
        if normalized in UNKNOWN_ANSWER_PATTERNS:
            return "unknown"
        if any(pattern in normalized for pattern in UNKNOWN_ANSWER_PATTERNS) and len(
            normalized.split()
        ) <= 18:
            return "unknown"
        if len(normalized.split()) < 8:
            return "thin"
        return "substantive"

    def _is_unknown_answer(self, answer: CandidateAnswer) -> bool:
        quality = answer.metadata.get("answer_quality") or self._classify_answer(answer.answer_text)
        return quality in {"unknown", "skip_requested", "irrelevant", "no_response"}

    def _should_reframe_unknown_answer(
        self,
        session: InterviewSession,
        answer: CandidateAnswer,
    ) -> bool:
        quality = answer.metadata.get("answer_quality") or self._classify_answer(answer.answer_text)
        if quality in {"skip_requested", "no_response"}:
            return False
        if quality != "unknown":
            return False
        if self._has_follow_up_for_answer(session, answer.id):
            return False
        question = self._question_for_answer(session, answer)
        if question is None:
            return True
        topic_key = self._topic_key_for_question(question)
        if topic_key in session.metadata.get("retired_topics", []):
            return False
            
        struggles = session.metadata.get("topic_struggles", {})
        struggle_count = struggles.get(topic_key, 0)
        
        # Reframe once for practical (struggle_count 0 -> 1), once for theoretical (1 -> 2)
        if struggle_count >= 2:
            return False
            
        return True

    def _unknown_answer_recovery_question(
        self,
        session: InterviewSession,
        answer: CandidateAnswer,
        *,
        custom_scope: bool = False,
    ) -> InterviewQuestion:
        question = self._question_for_answer(session, answer)
        event = self._event_for_question(session, question)
        code_insights = event.details.get("code_insights") if event else None
        topic_key = self._topic_key_for_question(question)

        struggles = session.metadata.setdefault("topic_struggles", {})
        struggle_count = struggles.get(topic_key, 0)
        struggles[topic_key] = struggle_count + 1
        session.metadata["topic_struggles"] = struggles

        is_theoretical = struggle_count >= 1

        if is_theoretical:
            if isinstance(code_insights, dict):
                prompt = (
                    f"Let's step away from the specific code implementation. "
                    f"In general theoretical terms, what is the core concept behind this approach and when would you choose to use it?"
                )
            else:
                prompt = (
                    "Let's look at this theoretically. Conceptually speaking, what is the main principle behind this pattern?"
                )
            targets = [Competency.TECHNICAL_KNOWLEDGE, Competency.COMMUNICATION]
            rationale = "Candidate struggled with practical implementation. Falling back to theoretical question."
            probe_axis = "theoretical_fallback"
        elif isinstance(code_insights, dict):
            focus = self._code_focus_phrase(code_insights)
            prompt = (
                f"Let's reframe it through the code instead of repeating the same question. "
                f"Look at {focus}. What did you change first, why was that the entry point, "
                "and what small check would confirm whether it helped?"
            )
            targets = [
                Competency.CODE_QUALITY,
                Competency.DEBUGGING_ABILITY,
                Competency.TESTING_MINDSET,
            ]
            rationale = "Candidate gave an unknown answer, so Vitarka reframed instead of repeating."
            probe_axis = "practical_reframe"
        elif custom_scope and question is not None:
            scope = question.metadata.get("scope_prompt") or question.prompt
            prompt = (
                f"Let's make this smaller and stay inside the drafted topic. For "
                f"{self._compact(str(scope), 110)}, name one assumption you would check first "
                "and what evidence would help you answer it."
            )
            targets = [Competency.COMMUNICATION, Competency.LEARNING_ABILITY]
            rationale = "Candidate gave an unknown answer, so Vitarka reframed instead of repeating."
            probe_axis = "practical_reframe"
        else:
            prompt = (
                "Let's approach it from a smaller angle. What is one fact from the assessment "
                "or code you would inspect first, and what would that fact tell you?"
            )
            targets = [
                Competency.LEARNING_ABILITY,
                Competency.PROBLEM_SOLVING,
                Competency.COMMUNICATION,
            ]
            rationale = "Candidate gave an unknown answer, so Vitarka reframed instead of repeating."
            probe_axis = "practical_reframe"

        return InterviewQuestion(
            prompt=prompt,
            kind=QuestionKind.REFRAME,
            competency_targets=targets,
            evidence_event_ids=[event.id] if event else [],
            evidence_answer_ids=[answer.id],
            rationale=rationale,
            metadata={
                "signature": f"unknown-reframe:{answer.id}:{probe_axis}",
                "parent_answer_id": answer.id,
                "parent_question_id": question.id if question else None,
                "unknown_recovery": True,
                "is_theoretical": is_theoretical,
                "topic_key": topic_key,
            },
        )

    def _custom_wrap_up_reframe(
        self,
        session: InterviewSession,
        answer: CandidateAnswer,
    ) -> InterviewQuestion:
        scope = session.recruiter_questions[-1] if session.recruiter_questions else "the drafted topic"
        return InterviewQuestion(
            prompt=(
                f"We will not repeat that. Staying inside {self._compact(scope, 110)}, "
                "what would be the safest next step if you were blocked: ask for a hint, inspect "
                "a failing case, or validate one assumption?"
            ),
            kind=QuestionKind.REFRAME,
            competency_targets=[Competency.LEARNING_ABILITY, Competency.COMMUNICATION],
            evidence_answer_ids=[answer.id],
            rationale="Candidate remained unsure, so Vitarka moved to a recovery-oriented prompt.",
            metadata={
                "signature": f"custom-wrap-reframe:{answer.id}",
                "parent_answer_id": answer.id,
                "unknown_recovery": True,
                "topic_key": "custom:wrap",
            },
        )

    def _normalize_answer(self, answer_text: str) -> str:
        normalized = re.sub(r"[^a-z0-9\s']", " ", answer_text.lower())
        normalized = (
            normalized.replace("dont", "don't")
            .replace("didnt", "didn't")
            .replace("couldnt", "couldn't")
        )
        return " ".join(normalized.split())

    def _is_similar_to_previous(self, session: InterviewSession, prompt: str) -> bool:
        normalized_prompt = self._normalize_question(prompt)
        prompt_tokens = self._question_tokens(prompt)
        if not prompt_tokens:
            return False

        for previous in session.questions[-15:]:
            previous_normalized = self._normalize_question(previous.prompt)
            if normalized_prompt == previous_normalized:
                return True
            if (
                len(normalized_prompt) > 36
                and len(previous_normalized) > 36
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
            if overlap >= 4 and (containment >= 0.65 or jaccard >= 0.45):
                return True

        return False

    def _deeper_unique_prompt(
        self,
        session: InterviewSession,
        question: InterviewQuestion,
    ) -> str:
        event = self._event_for_question(session, question)
        code_insights = event.details.get("code_insights") if event else None
        focus = (
            self._code_focus_phrase(code_insights)
            if isinstance(code_insights, dict)
            else "your implementation in the submitted code"
        )
        if not focus or focus in {"'0'", "0", "0,", "the submitted implementation"}:
            focus = "your implementation in the submitted code"

        candidates = [
            f"Understood. Stepping back to system design: what was the most critical architectural tradeoff you made in {focus}?",
            f"Got it. Looking at {focus}: what specific edge case or failure scenario would break this implementation in production?",
            f"Understood. If this service needed to handle 10x traffic, what scalability or performance bottleneck would emerge first in {focus}?",
            f"Got it. Regarding {focus}: what automated integration test would you write to prevent regressions in this behavior?",
            f"Understood. Looking at {focus}: what security considerations or validation checks are essential before shipping to production?",
            f"Got it. Stepping back to observability: how would you structure the logging and metrics for this feature to diagnose production issues?",
            f"Understood. If you had to refactor {focus} from scratch today, what design pattern or data structure would you choose differently?",
        ]

        for candidate in candidates:
            if not self._is_similar_to_previous(session, candidate):
                return candidate

        return f"Understood. Regarding {focus}: what was the key engineering lesson you learned from solving this problem?"

    def _file_change_summary(self, code_insights: dict[str, Any]) -> str:
        file_changes = code_insights.get("file_changes")
        if not isinstance(file_changes, list) or not file_changes:
            patch_summary = code_insights.get("patch_summary")
            return str(patch_summary) if patch_summary else "The patch contains implementation changes."

        summaries = []
        for change in file_changes[:3]:
            if not isinstance(change, dict):
                continue
            path = change.get("path") or "unknown file"
            additions = change.get("additions", 0)
            deletions = change.get("deletions", 0)
            added = self._first(change.get("notable_added_lines"), default="")
            removed = self._first(change.get("notable_removed_lines"), default="")
            summary = f"{path}: {additions} additions and {deletions} deletions"
            if removed and added:
                summary += (
                    f", including replacing '{self._compact(removed, 80)}' with "
                    f"'{self._compact(added, 80)}'"
                )
            elif added:
                summary += f", including '{self._compact(added, 90)}'"
            summaries.append(summary)

        return " ".join(summaries) if summaries else "The patch contains file-level changes."

    def _code_focus_phrase(self, code_insights: dict[str, Any]) -> str:
        files = self._join(code_insights.get("changed_files"), default="")
        file_summary = self._file_change_summary(code_insights) if files else ""
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
        if file_summary:
            parts.append(file_summary)
        if choices:
            parts.append(choices)
        if contrast:
            parts.append(contrast)
        elif notable_line:
            cleaned_line = self._compact(notable_line, 90).replace("`", "").strip()
            if cleaned_line and len(cleaned_line) >= 4 and not re.match(r"^[\d\s,.'\"()-]+$", cleaned_line):
                parts.append(f"'{cleaned_line}'")

        return "; ".join(parts) if parts else "your implementation in the submitted code"

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
            "hello",
            "hi",
            "hey",
            "welcome",
            "great",
            "meet",
            "understood",
            "got",
            "makes",
            "sense",
            "sure",
            "nice",
            "thanks",
            "thank",
            "problem",
            "let",
            "lets",
            "move",
            "moving",
            "forward",
            "discuss",
            "explore",
            "area",
            "new",
            "past",
            "earlier",
            "angle",
            "point",
            "said",
            "say",
            "terms",
            "regarding",
            "focusing",
            "specifically",
            "fresh",
            "next",
            "describe",
            "looking",
            "like",
        }
        return {
            token
            for token in re.findall(r"[a-z0-9+#]{2,}", prompt.lower())
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
            clean_w
            for word in re.findall(r"[A-Za-z][A-Za-z0-9+#.-]{2,}", text.lower())
            if (clean_w := word.rstrip(".?!;:,").lower()) not in STOP_WORDS and len(clean_w) >= 3
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

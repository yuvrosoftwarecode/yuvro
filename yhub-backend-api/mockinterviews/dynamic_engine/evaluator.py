from __future__ import annotations

import re
from collections import defaultdict

from mockinterviews.dynamic_engine.models import (
    AssessmentEvent,
    Competency,
    CompetencyScore,
    EvaluationEvidence,
    EventType,
    InterviewEvaluation,
    InterviewSession,
)


EVENT_COMPETENCY_EVIDENCE: dict[EventType, list[Competency]] = {
    EventType.FILE_OPENED: [Competency.PROBLEM_SOLVING],
    EventType.FILE_MODIFIED: [Competency.CODE_QUALITY, Competency.ENGINEERING_DECISION_MAKING],
    EventType.CODE_CHANGED: [Competency.CODE_QUALITY, Competency.PROBLEM_SOLVING],
    EventType.DEBUG_STEP: [Competency.DEBUGGING_ABILITY, Competency.PROBLEM_SOLVING],
    EventType.TERMINAL_COMMAND: [Competency.DEBUGGING_ABILITY, Competency.OWNERSHIP_COLLABORATION],
    EventType.TEST_RUN: [Competency.TESTING_MINDSET, Competency.CODE_QUALITY],
    EventType.DATABASE_QUERY: [
        Competency.PERFORMANCE_AWARENESS,
        Competency.SECURITY_AWARENESS,
    ],
    EventType.TIME_SPENT: [Competency.TIME_MANAGEMENT],
    EventType.MULTIPLE_EDITS: [Competency.ADAPTABILITY, Competency.LEARNING_ABILITY],
    EventType.SOLUTION_CHANGE: [
        Competency.ENGINEERING_DECISION_MAKING,
        Competency.ADAPTABILITY,
    ],
    EventType.ERROR_ENCOUNTERED: [Competency.DEBUGGING_ABILITY, Competency.LEARNING_ABILITY],
    EventType.FINAL_IMPLEMENTATION: [
        Competency.OWNERSHIP_COLLABORATION,
        Competency.CODE_QUALITY,
    ],
    EventType.DECISION_TAKEN: [Competency.ENGINEERING_DECISION_MAKING],
    EventType.MCQ_ANSWERED: [Competency.TECHNICAL_KNOWLEDGE],
    EventType.OTHER: [Competency.PROBLEM_SOLVING],
}


ANSWER_KEYWORDS: dict[Competency, set[str]] = {
    Competency.TECHNICAL_KNOWLEDGE: {"algorithm", "architecture", "api", "database", "thread", "memory"},
    Competency.PROBLEM_SOLVING: {"because", "hypothesis", "root", "cause", "isolate", "breakdown"},
    Competency.DEBUGGING_ABILITY: {"debug", "trace", "log", "reproduce", "stack", "inspect"},
    Competency.ENGINEERING_DECISION_MAKING: {
        "tradeoff",
        "constraint",
        "alternative",
        "decision",
        "because",
    },
    Competency.CODE_QUALITY: {"refactor", "readable", "maintain", "abstraction", "testable"},
    Competency.COMMUNICATION: {"because", "for example", "specifically", "first", "then"},
    Competency.LEARNING_ABILITY: {"learn", "feedback", "iterate", "adjust", "changed"},
    Competency.ADAPTABILITY: {"adapt", "changed", "switch", "iterate", "alternative"},
    Competency.TIME_MANAGEMENT: {"deadline", "prioritize", "time", "scope", "tradeoff"},
    Competency.TESTING_MINDSET: {"test", "edge", "case", "coverage", "assert"},
    Competency.PERFORMANCE_AWARENESS: {"latency", "scale", "cache", "index", "throughput", "performance"},
    Competency.SECURITY_AWARENESS: {
        "security",
        "auth",
        "permission",
        "validate",
        "injection",
        "secret",
    },
    Competency.OWNERSHIP_COLLABORATION: {"owner", "collaborate", "handoff", "document", "monitor"},
}


class InterviewEvaluator:
    def evaluate(self, session: InterviewSession) -> InterviewEvaluation:
        evidence_by_competency: dict[Competency, list[EvaluationEvidence]] = defaultdict(list)
        adjustments: dict[Competency, int] = defaultdict(int)

        for event in session.observations:
            self._apply_event(event, evidence_by_competency, adjustments)

        for answer in session.answers:
            normalized = answer.answer_text.lower()
            answer_length = len(answer.answer_text.split())
            for competency, keywords in ANSWER_KEYWORDS.items():
                if any(keyword in normalized for keyword in keywords):
                    evidence_by_competency[competency].append(
                        EvaluationEvidence(
                            source="answer",
                            reference_id=answer.id,
                            note=self._answer_note(answer.answer_text),
                        )
                    )
                    adjustments[competency] += 1

            if answer_length >= 40:
                adjustments[Competency.COMMUNICATION] += 1
                evidence_by_competency[Competency.COMMUNICATION].append(
                    EvaluationEvidence(
                        source="answer",
                        reference_id=answer.id,
                        note="Candidate provided a detailed verbal explanation.",
                    )
                )
            elif answer_length < 12:
                adjustments[Competency.COMMUNICATION] -= 1
                evidence_by_competency[Competency.COMMUNICATION].append(
                    EvaluationEvidence(
                        source="answer",
                        reference_id=answer.id,
                        note="Candidate response was brief and may need clarification.",
                    )
                )

        scores = [
            self._score_competency(competency, evidence_by_competency, adjustments)
            for competency in Competency
        ]
        overall = round(sum(score.score for score in scores) / len(scores), 1)
        strengths = [
            self._label(score.competency)
            for score in sorted(scores, key=lambda item: item.score, reverse=True)
            if score.score >= 7
        ][:3]
        risks = [
            self._label(score.competency)
            for score in sorted(scores, key=lambda item: item.score)
            if score.score <= 4
        ][:3]

        summary = (
            f"Evaluation is based on {len(session.observations)} assessment events and "
            f"{len(session.answers)} interview answers. Overall score: {overall}/10."
        )

        return InterviewEvaluation(
            session_id=session.id,
            overall_score=overall,
            scores=scores,
            summary=summary,
            strengths=strengths,
            risks=risks,
        )

    def _apply_event(
        self,
        event: AssessmentEvent,
        evidence_by_competency: dict[Competency, list[EvaluationEvidence]],
        adjustments: dict[Competency, int],
    ) -> None:
        competencies = EVENT_COMPETENCY_EVIDENCE[event.event_type]
        for competency in competencies:
            evidence_by_competency[competency].append(
                EvaluationEvidence(
                    source="event",
                    reference_id=event.id,
                    note=f"{event.event_type.value}: {event.summary}",
                )
            )
            adjustments[competency] += 1

        if event.event_type == EventType.TEST_RUN:
            result = str(event.details.get("result") or event.details.get("status") or "").lower()
            if any(token in result for token in ("pass", "success", "green")):
                adjustments[Competency.TESTING_MINDSET] += 2
                adjustments[Competency.CODE_QUALITY] += 1
            elif any(token in result for token in ("fail", "error", "red")):
                adjustments[Competency.TESTING_MINDSET] += 1

        if event.event_type == EventType.MCQ_ANSWERED:
            is_correct = event.details.get("is_correct")
            skipped = event.details.get("skipped")
            used_hint = event.details.get("used_hint")
            if is_correct is True:
                adjustments[Competency.TECHNICAL_KNOWLEDGE] += 2
            elif is_correct is False:
                adjustments[Competency.TECHNICAL_KNOWLEDGE] -= 1
            if skipped:
                adjustments[Competency.TIME_MANAGEMENT] -= 1
            if used_hint:
                adjustments[Competency.LEARNING_ABILITY] += 1

        if event.event_type == EventType.TIME_SPENT:
            duration = event.duration_seconds or event.details.get("duration_seconds") or 0
            if isinstance(duration, int | float) and duration > 900:
                adjustments[Competency.TIME_MANAGEMENT] -= 1

        code_insights = event.details.get("code_insights")
        if isinstance(code_insights, dict):
            self._apply_code_insights(event, code_insights, evidence_by_competency, adjustments)

    def _score_competency(
        self,
        competency: Competency,
        evidence_by_competency: dict[Competency, list[EvaluationEvidence]],
        adjustments: dict[Competency, int],
    ) -> CompetencyScore:
        evidence = evidence_by_competency.get(competency, [])
        if evidence:
            raw_score = 5 + min(3, len(evidence)) + adjustments[competency]
            guidance = "Supported by observed assessment behaviour and interview answers."
        else:
            raw_score = 3
            evidence = [
                EvaluationEvidence(
                    source="system",
                    reference_id="not_observed",
                    note="No direct evidence captured for this competency yet.",
                )
            ]
            guidance = "Collect targeted follow-up evidence before making a strong hiring signal."

        return CompetencyScore(
            competency=competency,
            score=max(0, min(10, raw_score)),
            evidence=evidence[:4],
            guidance=guidance,
        )

    def _apply_code_insights(
        self,
        event: AssessmentEvent,
        code_insights: dict,
        evidence_by_competency: dict[Competency, list[EvaluationEvidence]],
        adjustments: dict[Competency, int],
    ) -> None:
        self._add_code_evidence(
            evidence_by_competency,
            Competency.CODE_QUALITY,
            event.id,
            code_insights.get("patch_summary") or "Candidate implementation was available for review.",
        )
        adjustments[Competency.CODE_QUALITY] += 1

        correctness_concerns = self._as_list(
            code_insights.get("candidate_correctness_concerns")
            or code_insights.get("solution_contrast")
        )
        if correctness_concerns:
            self._add_code_evidence(
                evidence_by_competency,
                Competency.PROBLEM_SOLVING,
                event.id,
                "; ".join(correctness_concerns[:2]),
            )
            adjustments[Competency.PROBLEM_SOLVING] -= 1
            adjustments[Competency.CODE_QUALITY] -= 1

        performance_concerns = self._as_list(
            code_insights.get("performance_concerns")
            or code_insights.get("candidate_performance_concerns")
            or code_insights.get("candidate_complexity_concerns")
        )
        if performance_concerns:
            self._add_code_evidence(
                evidence_by_competency,
                Competency.PERFORMANCE_AWARENESS,
                event.id,
                "; ".join(performance_concerns[:2]),
            )
            adjustments[Competency.PERFORMANCE_AWARENESS] -= 1

        security_concerns = self._as_list(
            code_insights.get("security_concerns") or code_insights.get("candidate_security_concerns")
        )
        if security_concerns:
            self._add_code_evidence(
                evidence_by_competency,
                Competency.SECURITY_AWARENESS,
                event.id,
                "; ".join(security_concerns[:2]),
            )
            adjustments[Competency.SECURITY_AWARENESS] -= 1

        if code_insights.get("framework_choices") or code_insights.get("candidate_framework_choices"):
            self._add_code_evidence(
                evidence_by_competency,
                Competency.TECHNICAL_KNOWLEDGE,
                event.id,
                "Candidate used framework-specific implementation choices in submitted code.",
            )
            adjustments[Competency.TECHNICAL_KNOWLEDGE] += 1

    def _add_code_evidence(
        self,
        evidence_by_competency: dict[Competency, list[EvaluationEvidence]],
        competency: Competency,
        reference_id: str,
        note: str,
    ) -> None:
        evidence_by_competency[competency].append(
            EvaluationEvidence(
                source="code",
                reference_id=reference_id,
                note=f"Code evidence: {note}",
            )
        )

    def _as_list(self, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item) for item in value if str(item).strip()]
        return [str(value)]

    def _answer_note(self, answer_text: str) -> str:
        normalized = re.sub(r"\s+", " ", answer_text.strip())
        if len(normalized) <= 140:
            return f"Answer evidence: {normalized}"
        return f"Answer evidence: {normalized[:137]}..."

    def _label(self, competency: Competency) -> str:
        return competency.value.replace("_", " ").title()
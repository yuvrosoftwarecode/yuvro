from __future__ import annotations

import re
from collections import defaultdict

from mockinterviews.dynamic_engine.models import (
    AssessmentEvent,
    Competency,
    CompetencyCoverage,
    CompetencyScore,
    EvaluationCoverage,
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
    Competency.TECHNICAL_KNOWLEDGE: {"algorithm", "architecture", "asynchronous", "concurrency", "distributed", "serialization", "idempotent", "orm"},
    Competency.PROBLEM_SOLVING: {"hypothesis", "root cause", "isolate", "breakdown", "reproduce", "diagnose", "binary search"},
    Competency.DEBUGGING_ABILITY: {"stack trace", "breakpoint", "profiler", "inspect logs", "reproduce the bug"},
    Competency.ENGINEERING_DECISION_MAKING: {
        "tradeoff",
        "trade-off",
        "architectural decision",
        "benchmark",
        "alternative approach",
        "pros and cons",
    },
    Competency.CODE_QUALITY: {"refactoring", "maintainability", "single responsibility", "abstraction", "modular", "clean code"},
    Competency.COMMUNICATION: {"for example", "specifically", "in contrast", "firstly", "secondly", "to summarize"},
    Competency.LEARNING_ABILITY: {"retrospective", "post-mortem", "learned from", "incorporated feedback"},
    Competency.ADAPTABILITY: {"pivoted", "adapted to", "revised approach", "switched implementation"},
    Competency.TIME_MANAGEMENT: {"deadline", "prioritization", "scoping", "time constraint", "phased rollout"},
    Competency.TESTING_MINDSET: {"unit test", "integration test", "edge case", "regression", "mocking", "assertion", "test coverage"},
    Competency.PERFORMANCE_AWARENESS: {"latency", "scalability", "caching", "query optimization", "throughput", "bottleneck", "o(n)", "o(log n)", "select_related"},
    Competency.SECURITY_AWARENESS: {
        "authentication",
        "authorization",
        "input validation",
        "sql injection",
        "sanitization",
        "least privilege",
    },
    Competency.OWNERSHIP_COLLABORATION: {"code review", "monitoring", "alerting", "documentation", "runbook", "on-call"},
}


CoverageEvidence = dict[Competency, list[EvaluationEvidence]]
ScoreAdjustments = dict[Competency, int]


COVERAGE_PROBES: dict[Competency, str] = {
    Competency.TECHNICAL_KNOWLEDGE: "Ask the candidate to explain the framework or algorithm choice behind their implementation.",
    Competency.PROBLEM_SOLVING: "Ask for the edge case or failure mode that shaped their approach.",
    Competency.DEBUGGING_ABILITY: "Ask how they reproduced, isolated, and verified the issue.",
    Competency.ENGINEERING_DECISION_MAKING: "Ask why they chose this path over one concrete alternative.",
    Competency.CODE_QUALITY: "Ask them to defend one changed file, line, or abstraction from their solution.",
    Competency.COMMUNICATION: "Ask for a concise walkthrough with assumptions, tradeoffs, and outcome.",
    Competency.LEARNING_ABILITY: "Ask what they would inspect or learn first if blocked.",
    Competency.ADAPTABILITY: "Ask what they changed after feedback, errors, or failing tests.",
    Competency.TIME_MANAGEMENT: "Ask how they scoped the work and chose where to spend time.",
    Competency.TESTING_MINDSET: "Ask for the exact test that proves the risky path now works.",
    Competency.PERFORMANCE_AWARENESS: "Ask how they measured runtime, query count, latency, or scale impact.",
    Competency.SECURITY_AWARENESS: "Ask what input, data, or access boundary could be abused and how they guarded it.",
    Competency.OWNERSHIP_COLLABORATION: "Ask what they would monitor, document, or hand off after shipping.",
}


TECHNICAL_SUBSTANCE_TERMS = {
    "algorithm", "architecture", "asynchronous", "concurrency", "distributed", "serialization", "idempotent", "orm",
    "hypothesis", "root cause", "isolate", "breakdown", "reproduce", "diagnose", "binary search",
    "stack trace", "breakpoint", "profiler", "inspect logs", "reproduce",
    "tradeoff", "trade-off", "benchmark", "pros and cons",
    "refactoring", "maintainability", "single responsibility", "abstraction", "modular", "clean code",
    "unit test", "integration test", "edge case", "regression", "mocking", "assertion", "test coverage",
    "latency", "scalability", "caching", "query optimization", "throughput", "bottleneck", "select_related",
    "authentication", "authorization", "input validation", "sql injection", "sanitization", "least privilege",
    "code review", "monitoring", "alerting", "documentation", "runbook", "on-call",
    "django", "python", "http", "api", "rest", "endpoint", "status code", "200", "201", "400", "404", "409", "422", "500",
    "database", "model", "view", "serializer", "query", "request", "response", "payload", "json", "header",
    "exception", "try", "except", "raise", "catch", "error", "handler", "validation", "conflict", "duplicate",
    "field", "table", "column", "primary key", "foreign key", "index", "filter", "get", "post", "put", "patch", "delete",
    "function", "method", "class", "variable", "parameter", "return", "import", "module", "file", "code", "diff",
    "bug", "fix", "issue", "logic", "route", "url", "schema", "lock", "transaction", "commit", "rollback",
}


class InterviewEvaluator:
    DEFAULT_RUBRIC_VERSION = "engineering_manager_v1.2"

    def __init__(self, rubric_version: str | None = None) -> None:
        self.rubric_version = rubric_version or self.DEFAULT_RUBRIC_VERSION

    def _has_technical_substance(self, normalized: str) -> bool:
        if any(term in normalized for term in TECHNICAL_SUBSTANCE_TERMS):
            return True
        if re.search(r"\b(200|201|204|400|401|403|404|409|422|500|502|503)\b", normalized):
            return True
        if re.search(r"\b[a-zA-Z0-9_-]+\.(py|js|ts|json|sql|html|css|txt)\b", normalized):
            return True
        return False

    def _is_intro_answer(self, session: InterviewSession, answer: CandidateAnswer) -> bool:
        quality = answer.metadata.get("answer_quality")
        if quality == "intro" or answer.metadata.get("is_intro"):
            return True
        question = next((q for q in session.questions if q.id == answer.question_id), None)
        if question and question.metadata.get("is_intro"):
            return True
        if re.match(r"^(hello|hi|hey)?\s*(i am|i'm|my name is)\b", answer.answer_text.strip(), re.IGNORECASE):
            return True
        return False

    def _substantive_answers(self, session: InterviewSession) -> list[CandidateAnswer]:
        substantive = []
        for ans in session.answers:
            if self._is_intro_answer(session, ans):
                continue
            text = ans.answer_text.strip().lower()
            if text in {"no voice response recorded.", "no voice response recorded", ""}:
                continue
            substantive.append(ans)
        return substantive

    def evaluate(self, session: InterviewSession) -> InterviewEvaluation:
        substantive_answers = self._substantive_answers(session)
        # Zero-gating: If candidate answered no substantive technical questions, entire interview is unattempted
        if len(substantive_answers) == 0:
            scores = [
                CompetencyScore(
                    competency=comp,
                    score=0,
                    evidence=[
                        EvaluationEvidence(
                            source="system",
                            reference_id="unattempted",
                            note="Candidate did not provide any responses during the interview." if len(session.answers) == 0 else "Candidate only provided self-introduction or no voice response recorded.",
                        )
                    ],
                    guidance="No technical interview answers were provided to evaluate this competency.",
                )
                for comp in Competency
            ]
            competency_coverages = [
                CompetencyCoverage(
                    competency=comp,
                    evidence_count=0,
                    status="missing",
                    score=0,
                    suggested_probe=COVERAGE_PROBES[comp],
                )
                for comp in Competency
            ]
            coverage = EvaluationCoverage(
                session_id=session.id,
                rubric_version=self.rubric_version,
                covered_competencies=0,
                total_competencies=len(Competency),
                coverage_percent=0.0,
                competencies=competency_coverages,
            )
            return InterviewEvaluation(
                session_id=session.id,
                rubric_version=self.rubric_version,
                overall_score=0.0,
                scores=scores,
                coverage=coverage,
                summary="The candidate did not answer any technical questions during the Vitarka interview session. Evidence coverage is 0/13 competencies (0.0%). Overall score: 0.0/10.",
                strengths=[],
                risks=["Candidate did not provide any technical responses during the interview."],
            )

        evidence_by_competency, adjustments, positive_counts, negative_counts = self._collect_evidence(session)
        scores = self._scores_from_evidence(evidence_by_competency, adjustments, positive_counts, negative_counts)
        coverage = self._coverage_from_scores(session.id, scores)
        
        evaluated_scores = [
            score for score in scores
            if positive_counts.get(score.competency, 0) > 0 or negative_counts.get(score.competency, 0) > 0
        ]
        if evaluated_scores:
            overall = round(sum(score.score for score in evaluated_scores) / len(evaluated_scores), 1)
        else:
            overall = round(sum(score.score for score in scores) / len(scores), 1)

        strengths = [
            self._label(score.competency)
            for score in sorted(scores, key=lambda item: item.score, reverse=True)
            if score.score >= 6 and positive_counts.get(score.competency, 0) >= negative_counts.get(score.competency, 0)
        ][:4]
        risks = [
            self._label(score.competency)
            for score in sorted(scores, key=lambda item: item.score)
            if score.score <= 4 and negative_counts.get(score.competency, 0) > positive_counts.get(score.competency, 0)
        ][:3]

        summary = (
            f"Evaluation is based on {len(session.observations)} assessment events and "
            f"{len(session.answers)} interview answers using rubric {self.rubric_version}. "
            f"Evidence coverage is {coverage.covered_competencies}/{coverage.total_competencies} "
            f"competencies ({coverage.coverage_percent}%). Overall score: {overall}/10."
        )

        return InterviewEvaluation(
            session_id=session.id,
            rubric_version=self.rubric_version,
            overall_score=overall,
            scores=scores,
            coverage=coverage,
            summary=summary,
            strengths=strengths,
            risks=risks,
        )

    def coverage(self, session: InterviewSession) -> EvaluationCoverage:
        evidence_by_competency, adjustments, positive_counts, negative_counts = self._collect_evidence(session)
        scores = self._scores_from_evidence(evidence_by_competency, adjustments, positive_counts, negative_counts)
        return self._coverage_from_scores(session.id, scores)

    def _collect_evidence(
        self, session: InterviewSession
    ) -> tuple[CoverageEvidence, ScoreAdjustments, dict[Competency, int], dict[Competency, int]]:
        evidence_by_competency: CoverageEvidence = defaultdict(list)
        adjustments: ScoreAdjustments = defaultdict(int)
        positive_counts: dict[Competency, int] = defaultdict(int)
        negative_counts: dict[Competency, int] = defaultdict(int)

        for event in session.observations:
            self._apply_event(event, evidence_by_competency, adjustments, positive_counts, negative_counts)

        for answer in session.answers:
            self._apply_answer(session, answer, evidence_by_competency, adjustments, positive_counts, negative_counts)

        return evidence_by_competency, adjustments, positive_counts, negative_counts

    def _scores_from_evidence(
        self,
        evidence_by_competency: CoverageEvidence,
        adjustments: ScoreAdjustments,
        positive_counts: dict[Competency, int],
        negative_counts: dict[Competency, int],
    ) -> list[CompetencyScore]:
        return [
            self._score_competency(competency, evidence_by_competency, adjustments, positive_counts, negative_counts)
            for competency in Competency
        ]

    def _coverage_from_scores(
        self,
        session_id: str,
        scores: list[CompetencyScore],
    ) -> EvaluationCoverage:
        competencies: list[CompetencyCoverage] = []
        for score in scores:
            evidence_count = len(
                [
                    evidence
                    for evidence in score.evidence
                    if evidence.reference_id != "not_observed"
                ]
            )
            if evidence_count >= 3 and score.score >= 7:
                status = "strong"
            elif evidence_count > 0:
                status = "partial"
            else:
                status = "missing"
            competencies.append(
                CompetencyCoverage(
                    competency=score.competency,
                    evidence_count=evidence_count,
                    status=status,
                    score=score.score,
                    suggested_probe=COVERAGE_PROBES[score.competency],
                )
            )

        covered = sum(1 for item in competencies if item.evidence_count > 0)
        total = len(competencies)
        return EvaluationCoverage(
            session_id=session_id,
            rubric_version=self.rubric_version,
            covered_competencies=covered,
            total_competencies=total,
            coverage_percent=round((covered / total) * 100, 1),
            competencies=competencies,
        )

    def _apply_answer(
        self,
        session: InterviewSession,
        answer: CandidateAnswer,
        evidence_by_competency: CoverageEvidence,
        adjustments: ScoreAdjustments,
        positive_counts: dict[Competency, int],
        negative_counts: dict[Competency, int],
    ) -> None:
        if self._is_intro_answer(session, answer):
            return

        normalized = answer.answer_text.lower()
        words = answer.answer_text.split()
        answer_length = len(words)

        question = next((q for q in session.questions if q.id == answer.question_id), None)
        targets = question.competency_targets if question else []
        if not targets:
            targets = [Competency.PROBLEM_SOLVING, Competency.COMMUNICATION]

        quality = answer.metadata.get("answer_quality")
        is_unknown_or_skip_or_irrelevant = (
            quality in {"unknown", "skip_requested", "irrelevant"}
            or self._looks_unknown(normalized)
            or self._looks_evasive(normalized)
        )

        if is_unknown_or_skip_or_irrelevant:
            for competency in targets:
                negative_counts[competency] += 1
                adjustments[competency] -= 2
                evidence_by_competency[competency].append(
                    EvaluationEvidence(
                        source="interview",
                        reference_id=answer.id,
                        note=f"Candidate provided an irrelevant, evasive, or insufficient answer when probed on {self._label(competency)}.",
                    )
                )
            adjustments[Competency.COMMUNICATION] -= 1
            adjustments[Competency.LEARNING_ABILITY] -= 1
            negative_counts[Competency.COMMUNICATION] += 1
            evidence_by_competency[Competency.COMMUNICATION].append(
                EvaluationEvidence(
                    source="answer",
                    reference_id=answer.id,
                    note="Candidate responded with 'I don't know', off-topic deflection, or requested to skip topic.",
                )
            )
            return

        if answer_length < 5:
            for competency in targets:
                negative_counts[competency] += 1
                adjustments[competency] -= 1
                evidence_by_competency[competency].append(
                    EvaluationEvidence(
                        source="interview",
                        reference_id=answer.id,
                        note="Candidate response was brief and lacked technical depth.",
                    )
                )
            adjustments[Competency.COMMUNICATION] -= 1
            return

        has_substance = self._has_technical_substance(normalized)

        if not has_substance:
            for competency in targets:
                negative_counts[competency] += 1
                adjustments[competency] -= 1
                evidence_by_competency[competency].append(
                    EvaluationEvidence(
                        source="interview",
                        reference_id=answer.id,
                        note="Candidate explanation lacked specific technical terms, status codes, or implementation evidence.",
                    )
                )
            adjustments[Competency.COMMUNICATION] -= 1
            return

        for competency in targets:
            positive_counts[competency] += 1
            adjustments[competency] += 1
            evidence_by_competency[competency].append(
                EvaluationEvidence(
                    source="interview",
                    reference_id=answer.id,
                    note=self._answer_note(answer.answer_text),
                )
            )

        for competency, keywords in ANSWER_KEYWORDS.items():
            for keyword in keywords:
                if keyword in normalized and not self._is_negated(normalized, keyword):
                    if competency not in targets and answer_length >= 25:
                        positive_counts[competency] += 1
                        adjustments[competency] += 1
                        evidence_by_competency[competency].append(
                            EvaluationEvidence(
                                source="answer",
                                reference_id=answer.id,
                                note=self._answer_note(answer.answer_text),
                            )
                        )
                    break

        if answer_length >= 35 and has_substance:
            adjustments[Competency.COMMUNICATION] += 1
            positive_counts[Competency.COMMUNICATION] += 1
            evidence_by_competency[Competency.COMMUNICATION].append(
                EvaluationEvidence(
                    source="answer",
                    reference_id=answer.id,
                    note="Candidate provided a detailed technical explanation.",
                )
            )

    def _apply_event(
        self,
        event: AssessmentEvent,
        evidence_by_competency: CoverageEvidence,
        adjustments: ScoreAdjustments,
        positive_counts: dict[Competency, int],
        negative_counts: dict[Competency, int],
    ) -> None:
        competencies = EVENT_COMPETENCY_EVIDENCE.get(event.event_type, [])
        for competency in competencies:
            evidence_by_competency[competency].append(
                EvaluationEvidence(
                    source="event",
                    reference_id=event.id,
                    note=f"{event.event_type.value}: {event.summary}",
                )
            )

        if event.event_type == EventType.TEST_RUN:
            result = str(event.details.get("result") or event.details.get("status") or "").lower()
            tests_passed = event.details.get("tests_passed") or 0
            if any(token in result for token in ("pass", "success", "green")) or (isinstance(tests_passed, int) and tests_passed > 0):
                adjustments[Competency.TESTING_MINDSET] += 2
                adjustments[Competency.CODE_QUALITY] += 1
                positive_counts[Competency.TESTING_MINDSET] += 1
            elif any(token in result for token in ("fail", "error", "red")):
                adjustments[Competency.TESTING_MINDSET] += 1

        if event.event_type == EventType.MCQ_ANSWERED:
            is_correct = event.details.get("is_correct")
            skipped = event.details.get("skipped")
            used_hint = event.details.get("used_hint")
            if is_correct is True:
                adjustments[Competency.TECHNICAL_KNOWLEDGE] += 2
                positive_counts[Competency.TECHNICAL_KNOWLEDGE] += 1
            elif is_correct is False:
                adjustments[Competency.TECHNICAL_KNOWLEDGE] -= 1
                negative_counts[Competency.TECHNICAL_KNOWLEDGE] += 1
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
            self._apply_code_insights(event, code_insights, evidence_by_competency, adjustments, positive_counts, negative_counts)

    def _score_competency(
        self,
        competency: Competency,
        evidence_by_competency: CoverageEvidence,
        adjustments: ScoreAdjustments,
        positive_counts: dict[Competency, int],
        negative_counts: dict[Competency, int],
    ) -> CompetencyScore:
        pos = positive_counts.get(competency, 0)
        neg = negative_counts.get(competency, 0)
        adj = adjustments.get(competency, 0)
        evidence = evidence_by_competency.get(competency, [])

        if pos > 0 or neg > 0:
            if neg > 0 and pos == 0:
                raw_score = max(1, 3 - neg)
                guidance = "Candidate was probed on this competency but provided irrelevant, evasive, or insufficient technical answers."
            elif pos > 0 and neg == 0:
                raw_score = min(10, 5 + pos + max(0, adj))
                guidance = "Demonstrated through clear, substantive technical responses during the interview."
            else:
                if neg >= pos:
                    raw_score = max(1, min(4, 3 + pos - neg))
                    guidance = "Candidate struggled or provided off-topic/evasive responses on probes for this competency."
                else:
                    raw_score = max(4, min(8, 4 + pos - neg + adj))
                    guidance = "Demonstrated capability with some mixed areas observed during discussion."
        elif evidence:
            raw_score = 5
            guidance = "Observed in background activity and lab work."
        else:
            raw_score = 5
            evidence = [
                EvaluationEvidence(
                    source="system",
                    reference_id="not_observed",
                    note="Not directly probed during this interview session.",
                )
            ]
            guidance = "Neutral evaluation (not directly probed during session)."

        return CompetencyScore(
            competency=competency,
            score=max(0, min(10, raw_score)),
            evidence=evidence[:4],
            guidance=guidance,
        )

    def _looks_evasive(self, normalized: str) -> bool:
        return any(
            phrase in normalized
            for phrase in (
                "help in some way",
                "help in some more",
                "not going to change",
                "don't think so it is going to change",
                "dont think so it is going to change",
                "just want to check how you will generate report",
                "check how you will generate report",
                "test the system",
                "testing how you generate",
                "not want to discuss",
                "don't want to discuss",
                "dont want to discuss",
                "do not want to discuss",
                "whatever",
                "who cares",
                "i dont care",
                "i don't care",
                "do not care",
                "you tell me",
                "why are you asking",
                "not your business",
                "random answer",
                "pizza",
                "cricket",
                "football",
                "movie",
                "weather",
            )
        )

    def _apply_code_insights(
        self,
        event: AssessmentEvent,
        code_insights: dict,
        evidence_by_competency: CoverageEvidence,
        adjustments: ScoreAdjustments,
        positive_counts: dict[Competency, int],
        negative_counts: dict[Competency, int],
    ) -> None:
        changed_files = self._as_list(code_insights.get("changed_files"))
        if changed_files:
            file_note = f"Candidate changed files: {', '.join(changed_files[:5])}."
            self._add_code_evidence(
                evidence_by_competency,
                Competency.ENGINEERING_DECISION_MAKING,
                event.id,
                file_note,
            )

        self._add_code_evidence(
            evidence_by_competency,
            Competency.CODE_QUALITY,
            event.id,
            code_insights.get("patch_summary") or "Candidate implementation was available for review.",
        )

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
            negative_counts[Competency.PROBLEM_SOLVING] += 1

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
            code_insights.get("security_concerns")
            or code_insights.get("candidate_security_concerns")
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
        evidence_by_competency: CoverageEvidence,
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

    def _looks_unknown(self, normalized_answer: str) -> bool:
        normalized = re.sub(r"[^a-z0-9\s']", " ", normalized_answer.replace("dont", "don't"))
        normalized = " ".join(normalized.split())
        if not normalized or normalized == "no voice response recorded":
            return True
        return any(
            p in normalized
            for p in (
                "don't know",
                "do not know",
                "idk",
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
                "dont know much about this",
                "don't know much about this",
                "dont want to discuss",
                "don't want to discuss",
                "do not want to discuss",
                "not want to discuss",
                "next topic",
                "move to next",
                "move to the next",
                "can we move",
                "move on",
                "next question",
                "pass",
                "skip",
                "just want to check how you will generate report",
            )
        )

    def _is_negated(self, text: str, keyword: str) -> bool:
        pattern = re.compile(rf"\b(no|not|don't|didn't|doesn't|wouldn't|shouldn't|can't|cannot|never|without|instead of|against)\s+(?:\w+\s+){{0,3}}{re.escape(keyword)}\b", re.IGNORECASE)
        return bool(pattern.search(text))

    def _label(self, competency: Competency) -> str:
        return competency.value.replace("_", " ").title()

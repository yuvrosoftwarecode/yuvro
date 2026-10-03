from __future__ import annotations

import re
from typing import Any

from mockinterviews.dynamic_engine.models import (
    EngineeringLabReportItem,
    EngineeringLabsReport,
    EvaluationEvidence,
    InterviewEvaluation,
    InterviewReport,
    InterviewReportBundle,
    InterviewSession,
    InterviewTranscriptItem,
    KnowledgeAssessmentReport,
    KnowledgeQuestionReport,
    OverallInterviewReport,
    OverallReportSectionScore,
    ReportCompetencySummary,
)
from mockinterviews.dynamic_engine.code_analysis import CodeInsightExtractor
from mockinterviews.dynamic_engine.evaluator import InterviewEvaluator
from mockinterviews.dynamic_engine.llm import InterviewLLM

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


class InterviewReportService:
    def __init__(
        self,
        *,
        evaluator: InterviewEvaluator | None = None,
        llm_client: InterviewLLM | None = None,
        code_analyzer: CodeInsightExtractor | None = None,
    ) -> None:
        self.evaluator = evaluator or InterviewEvaluator()
        self.llm_client = llm_client
        self.code_analyzer = code_analyzer or CodeInsightExtractor()

    def _fix_lab_percentage_hallucinations(self, text: str, lab_stats: dict[str, Any] | None) -> str:
        if not text or not isinstance(text, str) or not lab_stats:
            return text or ""
        tests_passed = lab_stats.get("tests_passed") or 0
        tests_total = lab_stats.get("tests_total") or 0
        if tests_total > 0:
            actual_pct = round((tests_passed / tests_total) * 100)
            if actual_pct == 20:
                text = re.sub(r"\b2\s*%\s*(in the lab|pass rate|in lab|score)\b", f"20% \\1", text, flags=re.IGNORECASE)
                text = re.sub(r"\bscore of 2\s*%\b", "score of 20%", text, flags=re.IGNORECASE)
                text = re.sub(r"\bscore of 2%\b", "score of 20%", text, flags=re.IGNORECASE)
        return text

    def create_report(self, session: InterviewSession) -> InterviewReport:
        evaluation = self.evaluator.evaluate(session)
        lab_stats = self._get_engineering_stats(session)
        if len(session.answers) == 0:
            recommendation = "Do not proceed"
            name = self._display_name(session)
            executive_summary = (
                f"{name} completed an interview session without submitting any answers. "
                "No technical, problem-solving, or communication signals were observed."
            )
            strengths = []
            risks = ["Candidate did not provide any responses during the interview."]
        else:
            narrative = (
                self.llm_client.generate_report_narrative(session, evaluation, lab_stats=lab_stats)
                if self.llm_client is not None
                else None
            )
            recommendation = (
                narrative.recommendation if narrative is not None else self._recommendation(evaluation)
            )
            executive_summary = (
                narrative.executive_summary if narrative is not None else self._executive_summary(session, evaluation)
            )
            executive_summary = self._fix_lab_percentage_hallucinations(executive_summary, lab_stats)
            strengths = narrative.strengths[:5] if narrative is not None else evaluation.strengths
            risks = narrative.risks[:5] if narrative is not None else evaluation.risks
        competency_summaries = [
            ReportCompetencySummary(
                competency=score.competency,
                score=score.score,
                guidance=score.guidance,
                evidence=score.evidence,
            )
            for score in evaluation.scores
        ]
        evidence_highlights = self._evidence_highlights(evaluation)
        transcript = self._transcript(session)

        recommendation = normalize_gender_neutral_pronouns(recommendation)
        executive_summary = normalize_gender_neutral_pronouns(executive_summary)
        strengths = [normalize_gender_neutral_pronouns(s) for s in strengths]
        risks = [normalize_gender_neutral_pronouns(r) for r in risks]

        markdown = self._markdown(
            session=session,
            evaluation=evaluation,
            recommendation=recommendation,
            executive_summary=executive_summary,
            strengths=strengths,
            risks=risks,
            competency_summaries=competency_summaries,
            evidence_highlights=evidence_highlights,
            transcript=transcript,
        )
        markdown = normalize_gender_neutral_pronouns(markdown)

        disc_max = session.metadata.get("discussion_max_score") or session.metadata.get("max_score")
        if disc_max is not None:
            try:
                disc_max = float(disc_max)
            except (ValueError, TypeError):
                disc_max = 25.0
        else:
            disc_max = 25.0
        scaled_score = round((evaluation.overall_score / 10.0) * disc_max, 1) if evaluation.overall_score is not None else 0.0

        return InterviewReport(
            session_id=session.id,
            candidate_id=session.candidate.candidate_id,
            target_role=session.candidate.target_role,
            mode=session.mode,
            status=session.status,
            rubric_version=evaluation.rubric_version,
            overall_score=evaluation.overall_score,
            scaled_score=scaled_score,
            max_score=disc_max,
            coverage=evaluation.coverage,
            recommendation=recommendation,
            executive_summary=executive_summary,
            strengths=strengths,
            risks=risks,
            competency_summaries=competency_summaries,
            evidence_highlights=evidence_highlights,
            transcript=transcript,
            markdown=markdown,
        )

    def create_report_bundle(self, session: InterviewSession) -> InterviewReportBundle:
        vitarka_report = self.create_report(session)
        lab_stats = self._get_engineering_stats(session)
        knowledge_stats = self._get_knowledge_stats(session)
        overall_report = self._overall_report(
            session=session,
            vitarka_report=vitarka_report,
            lab_stats=lab_stats,
            knowledge_stats=knowledge_stats,
        )

        return InterviewReportBundle(
            session_id=session.id,
            candidate_id=session.candidate.candidate_id,
            target_role=session.candidate.target_role,
            engineering_labs_report=self._engineering_labs_report(session),
            knowledge_assessment_report=self._knowledge_assessment_report(session),
            vitarka_report=vitarka_report,
            overall_report=overall_report,
        )

    def _recommendation(self, evaluation: InterviewEvaluation) -> str:
        if evaluation.overall_score >= 7.0:
            return "Strong proceed"
        if evaluation.overall_score >= 5.0:
            return "Proceed"
        if evaluation.overall_score >= 3.5:
            return "Needs review"
        return "Do not proceed"

    def _display_name(self, session: InterviewSession) -> str:
        if session.candidate.metadata and session.candidate.metadata.get("name"):
            return session.candidate.metadata["name"]
        return "The candidate"

    def _executive_summary(
        self,
        session: InterviewSession,
        evaluation: InterviewEvaluation,
    ) -> str:
        role = session.candidate.target_role or "the target role"
        strengths = ", ".join(evaluation.strengths) if evaluation.strengths else "no dominant strengths yet"
        risks = ", ".join(evaluation.risks) if evaluation.risks else "no major evidence gaps"
        name = self._display_name(session)
        return (
            f"{name} completed a {session.mode.value} "
            f"engineering interview for {role}. The evidence-backed overall score is "
            f"{evaluation.overall_score}/10. Main strengths: {strengths}. Main risks or "
            f"evidence gaps: {risks}."
        )

    def _evidence_highlights(self, evaluation: InterviewEvaluation) -> list[EvaluationEvidence]:
        highlights: list[EvaluationEvidence] = []
        for score in sorted(evaluation.scores, key=lambda item: item.score, reverse=True):
            for evidence in score.evidence:
                if evidence.reference_id == "not_observed":
                    continue
                highlights.append(evidence)
                if len(highlights) >= 8:
                    return highlights
        return highlights

    def _transcript(self, session: InterviewSession) -> list[InterviewTranscriptItem]:
        answers_by_question_id = {answer.question_id: answer for answer in session.answers}
        transcript = []
        for question in session.questions:
            answer = answers_by_question_id.get(question.id)
            transcript.append(
                InterviewTranscriptItem(
                    question_id=question.id,
                    question=question.prompt,
                    question_kind=question.kind,
                    answer_id=answer.id if answer else None,
                    answer=answer.answer_text if answer else None,
                    competency_targets=question.competency_targets,
                )
            )
        return transcript

    def _engineering_labs_report(self, session: InterviewSession) -> EngineeringLabsReport:
        lab_sources = self._engineering_lab_sources(session)
        lab_items = [self._engineering_lab_item(session, source) for source in lab_sources]
        scored_items = [item.score for item in lab_items if item.score is not None]
        overall_score = round(sum(scored_items) / len(scored_items), 1) if scored_items else None
        total_time_seconds = sum(item.time_spent_seconds or 0 for item in lab_items)
        tests_passed = sum(item.tests_passed or 0 for item in lab_items)
        tests_total = sum(item.tests_total or 0 for item in lab_items)
        if not tests_passed or tests_passed == 0:
            # If candidate passed 0 tests across all labs, section score must be strictly 0.0
            if any(item.score == 0.0 for item in lab_items) or not any(item.score and item.score > 0 for item in lab_items):
                overall_score = 0.0
        strengths = self._unique(
            strength
            for item in lab_items
            for strength in item.strengths
        )
        if not tests_passed or tests_passed == 0 or overall_score == 0.0:
            strengths = [s for s in strengths if not s.startswith("Submitted verified code")]
        strengths = strengths[:5]
        risks = self._unique(risk for item in lab_items for risk in item.risks)[:5]
        if not lab_items:
            risks.append("No engineering lab payload was available for section-level scoring.")

        markdown = self._engineering_labs_markdown(
            session=session,
            report_title="Engineering Labs Report",
            overall_score=overall_score,
            lab_items=lab_items,
            strengths=strengths,
            risks=risks,
            total_time_seconds=total_time_seconds,
            tests_passed=tests_passed,
            tests_total=tests_total,
        )
        strengths = [normalize_gender_neutral_pronouns(s) for s in strengths]
        risks = [normalize_gender_neutral_pronouns(r) for r in risks]
        markdown = normalize_gender_neutral_pronouns(markdown)

        return EngineeringLabsReport(
            session_id=session.id,
            candidate_id=session.candidate.candidate_id,
            lab_count=len(lab_items),
            total_time_seconds=total_time_seconds,
            tests_passed=tests_passed,
            tests_total=tests_total,
            overall_score=overall_score,
            labs=lab_items,
            strengths=strengths,
            risks=risks,
            markdown=markdown,
        )

    def _extract_lab_metrics(
        self,
        source: dict[str, Any],
        events: list | None = None,
    ) -> dict[str, Any]:
        performance = source.get("performance") if isinstance(source.get("performance"), dict) else {}

        def pick_max_int(keys, *dicts):
            vals = []
            for d in dicts:
                if isinstance(d, dict):
                    for k in keys:
                        v = self._as_int(d.get(k))
                        if v is not None:
                            vals.append(v)
            return max(vals) if vals else None

        test_passed_keys = ("tests_passed", "testsPassed", "passed_tests", "passed")
        test_total_keys = ("tests_total", "testsTotal", "total_tests", "total")
        error_keys = ("errors_encountered", "errorsEncountered", "errors")
        command_keys = ("terminal_commands_run", "terminalCommandsRun", "commands_run")
        time_keys = ("time_spent_seconds", "total_time_seconds", "duration_seconds")

        dicts_to_check = [performance, source]
        if events:
            for ev in events:
                details = ev.details if isinstance(ev.details, dict) else {}
                ev_perf = details.get("performance") if isinstance(details.get("performance"), dict) else {}
                dicts_to_check.extend([ev_perf, details])

        tests_passed = pick_max_int(test_passed_keys, *dicts_to_check)
        tests_total = pick_max_int(test_total_keys, *dicts_to_check)
        errors_encountered = pick_max_int(error_keys, *dicts_to_check)
        terminal_commands_run = pick_max_int(command_keys, *dicts_to_check)
        time_spent_seconds = pick_max_int(time_keys, *dicts_to_check)

        return {
            "tests_passed": tests_passed,
            "tests_total": tests_total,
            "errors_encountered": errors_encountered,
            "terminal_commands_run": terminal_commands_run,
            "time_spent_seconds": time_spent_seconds,
        }

    def _engineering_lab_item(
        self,
        session: InterviewSession,
        source: dict[str, Any],
    ) -> EngineeringLabReportItem:
        events = self._events_for_lab(session, source)
        metrics = self._extract_lab_metrics(source, events)
        code_insights = self._combined_code_insights(source, events)
        changed_files = self._unique(self._as_list(code_insights.get("changed_files"))) if code_insights else []
        tests_passed = metrics["tests_passed"]
        tests_total = metrics["tests_total"]
        errors_encountered = metrics["errors_encountered"]
        terminal_commands_run = metrics["terminal_commands_run"]
        time_spent_seconds = metrics["time_spent_seconds"]
        score = self._engineering_lab_score(
            tests_passed=tests_passed,
            tests_total=tests_total,
            errors_encountered=errors_encountered,
            changed_files=changed_files,
            code_insights=code_insights,
        )
        strengths = []
        risks = []
        if tests_total and tests_passed == tests_total:
            strengths.append(f"Passed all {tests_total} lab tests.")
        elif tests_total and tests_passed and tests_passed > 0:
            strengths.append(f"Passed {tests_passed}/{tests_total} lab tests.")
        elif tests_total:
            risks.append(f"Passed 0/{tests_total} lab tests.")
        else:
            risks.append("No lab tests were executed.")

        is_snapshot = (
            (code_insights or {}).get("code_diff_format") == "workspace_snapshot_json"
            or bool((code_insights or {}).get("is_workspace_snapshot"))
            or source.get("code_diff_format") == "workspace_snapshot_json"
        )
        if score and score > 0 and tests_passed and tests_passed > 0 and changed_files and not is_snapshot:
            strengths.append(f"Submitted verified code across {len(changed_files)} file(s).")
        else:
            risks.append("No verified implementation code was submitted.")

        if terminal_commands_run and terminal_commands_run > 0:
            strengths.append(f"Used {terminal_commands_run} terminal commands during the lab.")
        if errors_encountered and errors_encountered > 0:
            risks.append(f"Encountered {errors_encountered} errors during the lab.")
        if code_insights and score and score > 0:
            risks.extend(self._as_list(code_insights.get("performance_concerns"))[:2])
            risks.extend(self._as_list(code_insights.get("security_concerns"))[:2])
            risks.extend(self._as_list(code_insights.get("candidate_correctness_concerns"))[:2])

        title = str(source.get("title") or source.get("lab_id") or "Engineering Lab")
        file_summary = ", ".join(changed_files[:5]) if changed_files else "no changed files detected"
        if score and score > 0:
            summary = f"{title} captured {file_summary}. Score: {score}/10."
        elif changed_files:
            summary = f"{title} had unverified code changes across {len(changed_files)} file(s) with 0 passing tests. Score: 0/10."
        else:
            summary = f"{title} had no passing tests or candidate code submissions. Score: 0/10."

        summary = normalize_gender_neutral_pronouns(summary)
        lab_strengths = [normalize_gender_neutral_pronouns(s) for s in self._unique(strengths)[:5]]
        lab_risks = [normalize_gender_neutral_pronouns(r) for r in self._unique(risks)[:5]]

        return EngineeringLabReportItem(
            lab_id=str(source.get("lab_id")) if source.get("lab_id") else None,
            title=title,
            scenario=str(source.get("scenario")) if source.get("scenario") else None,
            time_spent_seconds=time_spent_seconds,
            tests_passed=tests_passed,
            tests_total=tests_total,
            terminal_commands_run=terminal_commands_run,
            errors_encountered=errors_encountered,
            changed_files=changed_files,
            code_diff_format=source.get("code_diff_format") or (code_insights or {}).get("code_diff_format"),
            score=score,
            summary=summary,
            strengths=lab_strengths,
            risks=lab_risks,
            evidence_event_ids=[event.id for event in events],
        )

    def _knowledge_assessment_report(self, session: InterviewSession) -> KnowledgeAssessmentReport:
        source = self._knowledge_assessment_source(session)
        question_items = [
            self._knowledge_question_item(question, index)
            for index, question in enumerate(source.get("questions", []) or [], start=1)
            if isinstance(question, dict)
        ]
        total_score = self._as_float(source.get("total_score"))
        max_score = self._as_float(source.get("max_score"))
        if total_score is None and question_items:
            scores = [item.marks_awarded for item in question_items]
            if all(score is not None for score in scores):
                total_score = float(sum(score or 0 for score in scores))
        if max_score is None and question_items:
            max_score = float(sum(item.max_marks or 0 for item in question_items))
        score_percent = round((total_score / max_score) * 100, 1) if total_score is not None and max_score else None
        correct_count = sum(1 for item in question_items if item.is_correct is True)
        strengths = []
        risks = []
        if score_percent is not None and score_percent >= 80:
            strengths.append("Strong knowledge assessment performance.")
        elif score_percent is not None and score_percent < 60:
            risks.append("Knowledge assessment score is below the expected threshold.")
        if correct_count and correct_count > 0:
            strengths.append(f"Answered {correct_count} question(s) correctly.")
        else:
            risks.append("Candidate answered 0 knowledge questions correctly.")
        missed = len(question_items) - correct_count
        if missed > 0 and correct_count and correct_count > 0:
            risks.append(f"Missed or partially missed {missed} knowledge question(s).")
        if not question_items:
            risks.append("No knowledge assessment questions were available for section-level scoring.")

        markdown = self._knowledge_markdown(
            session=session,
            total_score=total_score,
            max_score=max_score,
            score_percent=score_percent,
            question_items=question_items,
            strengths=strengths,
            risks=risks,
        )
        strengths = [normalize_gender_neutral_pronouns(s) for s in strengths]
        risks = [normalize_gender_neutral_pronouns(r) for r in risks]
        markdown = normalize_gender_neutral_pronouns(markdown)

        return KnowledgeAssessmentReport(
            session_id=session.id,
            candidate_id=session.candidate.candidate_id,
            total_score=total_score,
            max_score=max_score,
            score_percent=score_percent,
            correct_count=correct_count,
            question_count=len(question_items),
            questions=question_items,
            strengths=strengths,
            risks=risks,
            markdown=markdown,
        )

    def _knowledge_question_item(
        self,
        question: dict[str, Any],
        index: int,
    ) -> KnowledgeQuestionReport:
        marks_awarded = self._as_float(question.get("marks_awarded"))
        max_marks = self._as_float(question.get("max_marks"))
        score_percent = round((marks_awarded / max_marks) * 100, 1) if marks_awarded is not None and max_marks else None
        is_correct = self._as_bool(question.get("is_correct"))
        prompt = str(
            question.get("content")
            or question.get("prompt")
            or question.get("question")
            or question.get("title")
            or f"Question {index}"
        )
        feedback = self._knowledge_feedback(
            is_correct=is_correct,
            score_percent=score_percent,
            correct_solution=question.get("correct_solution"),
        )
        feedback = normalize_gender_neutral_pronouns(feedback)

        return KnowledgeQuestionReport(
            question_id=str(question.get("id")) if question.get("id") else None,
            question_type=str(question.get("type")) if question.get("type") else None,
            title=str(question.get("title")) if question.get("title") else None,
            prompt=prompt,
            difficulty=str(question.get("difficulty")) if question.get("difficulty") else None,
            marks_awarded=marks_awarded,
            max_marks=max_marks,
            is_correct=is_correct,
            time_spent_seconds=self._as_int(question.get("time_spent_seconds")),
            candidate_answer=question.get("candidate_answer"),
            correct_solution=question.get("correct_solution"),
            score_percent=score_percent,
            feedback=feedback,
        )

    def _get_engineering_stats(self, session: InterviewSession) -> dict[str, Any]:
        lab_sources = self._engineering_lab_sources(session)
        if not lab_sources:
            return {
                "lab_count": 0,
                "tests_passed": 0,
                "tests_total": 0,
                "score": None,
                "total_time_seconds": 0,
            }

        lab_scores = []
        total_passed = 0
        total_tests = 0
        total_time = 0
        for source in lab_sources:
            events = self._events_for_lab(session, source)
            metrics = self._extract_lab_metrics(source, events)
            code_insights = self._combined_code_insights(source, events)
            changed_files = self._unique(self._as_list(code_insights.get("changed_files"))) if code_insights else []
            tests_passed = metrics["tests_passed"] or 0
            tests_total = metrics["tests_total"] or 0
            errors_encountered = metrics["errors_encountered"] or 0
            time_spent = metrics["time_spent_seconds"] or 0

            score = self._engineering_lab_score(
                tests_passed=tests_passed,
                tests_total=tests_total,
                errors_encountered=errors_encountered,
                changed_files=changed_files,
                code_insights=code_insights,
            )
            if score is not None:
                lab_scores.append(score)
            total_passed += tests_passed
            total_tests += tests_total
            total_time += time_spent

        avg_score = round(sum(lab_scores) / len(lab_scores), 1) if lab_scores else None
        if total_tests > 0 and total_passed == 0:
            avg_score = 0.0

        return {
            "lab_count": len(lab_sources),
            "tests_passed": total_passed,
            "tests_total": total_tests,
            "score": avg_score,
            "total_time_seconds": total_time,
        }

    def _get_knowledge_stats(self, session: InterviewSession) -> dict[str, Any]:
        source = self._knowledge_assessment_source(session)
        questions = source.get("questions", []) or []
        total_score = self._as_float(source.get("total_score"))
        max_score = self._as_float(source.get("max_score"))
        if total_score is None and questions:
            scores = [self._as_float(q.get("marks_awarded")) for q in questions if isinstance(q, dict)]
            if any(s is not None for s in scores):
                total_score = float(sum(s or 0 for s in scores if s is not None))
        if max_score is None and questions:
            max_scores = [self._as_float(q.get("max_marks")) for q in questions if isinstance(q, dict)]
            if any(m is not None for m in max_scores):
                max_score = float(sum(m or 0 for m in max_scores if m is not None))

        score_percent = round((total_score / max_score) * 100, 1) if total_score is not None and max_score else None
        correct_count = sum(1 for q in questions if isinstance(q, dict) and self._as_bool(q.get("is_correct")) is True)
        score_out_of_ten = round(score_percent / 10.0, 1) if score_percent is not None else None

        return {
            "question_count": len(questions),
            "correct_count": correct_count,
            "total_score": total_score,
            "max_score": max_score,
            "score_percent": score_percent,
            "score": score_out_of_ten,
        }

    def _overall_report(
        self,
        *,
        session: InterviewSession,
        vitarka_report: InterviewReport,
        lab_stats: dict[str, Any],
        knowledge_stats: dict[str, Any],
    ) -> OverallInterviewReport:
        section_scores = [
            OverallReportSectionScore(
                section="engineering_labs",
                score=lab_stats.get("score"),
                weight=0.35 if lab_stats.get("score") is not None else 0,
                summary=(
                    f"{lab_stats.get('lab_count', 0)} lab(s), "
                    f"{lab_stats.get('tests_passed', 0)}/{lab_stats.get('tests_total', 0)} tests passed."
                ),
            ),
            OverallReportSectionScore(
                section="knowledge_assessment",
                score=knowledge_stats.get("score"),
                weight=0.25 if knowledge_stats.get("score") is not None else 0,
                summary=(
                    f"{knowledge_stats.get('total_score')}/"
                    f"{knowledge_stats.get('max_score')} ({knowledge_stats.get('score_percent')}%) across "
                    f"{knowledge_stats.get('question_count', 0)} question(s)."
                ),
            ),
            OverallReportSectionScore(
                section="vitarka_interview",
                score=vitarka_report.overall_score,
                weight=0.40,
                summary=vitarka_report.executive_summary,
            ),
        ]
        weighted_sections = [section for section in section_scores if section.score is not None and section.weight > 0]
        total_weight = sum(section.weight for section in weighted_sections)
        if total_weight:
            overall_score = round(
                sum((section.score or 0) * section.weight for section in weighted_sections) / total_weight,
                1,
            )
        else:
            overall_score = 0.0
        recommendation = self._recommendation_from_score(overall_score)

        # Build strengths: Vitarka AI + factual lab tests passing + assessment performance
        strengths = []
        tests_total = lab_stats.get("tests_total", 0) or 0
        tests_passed = lab_stats.get("tests_passed", 0) or 0
        if tests_total > 0 and tests_passed == tests_total:
            strengths.append(f"Passed all {tests_total} automated tests across engineering labs.")
        elif tests_passed > 0:
            strengths.append(f"Passed {tests_passed}/{tests_total} automated tests across engineering labs.")

        k_pct = knowledge_stats.get("score_percent")
        k_correct = knowledge_stats.get("correct_count", 0) or 0
        k_total = knowledge_stats.get("question_count", 0) or 0
        if k_pct is not None and k_pct >= 80:
            strengths.append(f"Strong performance in knowledge assessment ({k_pct}%).")
        elif k_correct > 0:
            strengths.append(f"Answered {k_correct}/{k_total} knowledge assessment questions correctly.")

        strengths.extend(vitarka_report.strengths[:4])
        strengths = self._unique(strengths)
        if (lab_stats.get("score") == 0.0 or tests_passed == 0) and tests_total > 0:
            strengths = [
                s for s in strengths
                if not any(token in s.lower() for token in (
                    "coding assessment", "implementation", "code quality", "problem-solving skills", "problem solving", "verified code"
                ))
            ]
        strengths = strengths[:6]

        # Build risks: Vitarka AI + factual test failures + assessment gaps
        risks = []
        if tests_total > 0 and tests_passed == 0:
            risks.append(f"Passed 0/{tests_total} test cases in engineering labs.")
        elif tests_total > 0 and tests_passed < tests_total:
            risks.append(f"Failed {tests_total - tests_passed} test case(s) in engineering labs.")

        if k_pct is not None and k_pct < 60:
            risks.append(f"Knowledge assessment score is below threshold ({k_pct}%).")

        risks.extend(vitarka_report.risks[:4])
        risks = self._unique(risks)[:6]

        name = self._display_name(session)
        evidence_parts = []
        if tests_total > 0:
            evidence_parts.append(f"{tests_passed}/{tests_total} tests passed across {lab_stats.get('lab_count', 0)} engineering lab(s)")
        if k_total > 0:
            evidence_parts.append(f"{k_correct}/{k_total} questions correct ({k_pct}%) in knowledge assessment")
        if vitarka_report.overall_score is not None:
            evidence_parts.append(f"{vitarka_report.overall_score}/10 in Vitarka AI discussion")

        evidence_str = "; ".join(evidence_parts) if evidence_parts else "completed sections"
        if overall_score == 0.0:
            executive_summary = (
                f"Overall evaluation for {name} recorded 0 passing tests, no submitted code, "
                f"and no interview responses. Aggregate score: 0.0/10. Recommendation: Do not proceed."
            )
        else:
            executive_summary = (
                f"Overall evaluation for {name} synthesizes Vitarka AI interview results with practical performance: "
                f"{evidence_str}. Aggregate score: {overall_score}/10. Recommendation: {recommendation}."
            )

        executive_summary = normalize_gender_neutral_pronouns(executive_summary)
        recommendation = normalize_gender_neutral_pronouns(recommendation)
        strengths = [normalize_gender_neutral_pronouns(s) for s in strengths]
        risks = [normalize_gender_neutral_pronouns(r) for r in risks]

        markdown = self._overall_markdown(
            session=session,
            overall_score=overall_score,
            recommendation=recommendation,
            executive_summary=executive_summary,
            section_scores=section_scores,
            strengths=strengths,
            risks=risks,
        )
        markdown = normalize_gender_neutral_pronouns(markdown)

        return OverallInterviewReport(
            session_id=session.id,
            candidate_id=session.candidate.candidate_id,
            target_role=session.candidate.target_role,
            overall_score=overall_score,
            recommendation=recommendation,
            executive_summary=executive_summary,
            section_scores=section_scores,
            strengths=strengths,
            risks=risks,
            markdown=markdown,
        )

    def _engineering_lab_sources(self, session: InterviewSession) -> list[dict[str, Any]]:
        payload_sources = self._payload_report_sources(session)
        labs = payload_sources.get("engineering_labs")
        if isinstance(labs, list) and labs:
            return [lab for lab in labs if isinstance(lab, dict)]

        grouped: dict[str, dict[str, Any]] = {}
        for event in session.observations:
            details = event.details if isinstance(event.details, dict) else {}
            if event.source.value != "simulation_lab" and not details.get("lab_id") and not details.get("title"):
                continue
            key = str(details.get("lab_id") or details.get("title") or event.id)
            source = grouped.setdefault(
                key,
                {
                    "lab_id": details.get("lab_id"),
                    "title": details.get("title") or event.summary,
                    "scenario": details.get("scenario"),
                    "performance": {},
                    "solution_patch": details.get("solution_patch"),
                    "code_diff_format": details.get("code_diff_format"),
                },
            )
            performance = details.get("performance") if isinstance(details.get("performance"), dict) else {}
            source["performance"].update({key: value for key, value in performance.items() if value is not None})
            if event.duration_seconds is not None:
                source["performance"]["total_time_seconds"] = event.duration_seconds
                source["time_spent_seconds"] = event.duration_seconds
            if details.get("time_spent_seconds") is not None:
                source["time_spent_seconds"] = details.get("time_spent_seconds")
                source["performance"]["total_time_seconds"] = details.get("time_spent_seconds")
            if details.get("solution_patch"):
                source["solution_patch"] = details.get("solution_patch")
            if details.get("code_diff_format"):
                source["code_diff_format"] = details.get("code_diff_format")

        return list(grouped.values())

    def _knowledge_assessment_source(self, session: InterviewSession) -> dict[str, Any]:
        payload_sources = self._payload_report_sources(session)
        knowledge = payload_sources.get("knowledge_assessment")
        if isinstance(knowledge, dict) and (knowledge.get("questions") or knowledge.get("max_score") is not None):
            return knowledge

        questions = []
        for event in session.observations:
            if event.event_type.value != "mcq_answered":
                continue
            details = event.details if isinstance(event.details, dict) else {}
            questions.append(
                {
                    "id": details.get("question_id") or event.id,
                    "type": details.get("question_type") or "mcq",
                    "title": details.get("title") or event.summary,
                    "content": event.summary,
                    "marks_awarded": details.get("marks_awarded"),
                    "max_marks": details.get("max_marks") or 1,
                    "candidate_answer": details.get("candidate_answer"),
                    "correct_solution": details.get("correct_solution"),
                    "is_correct": details.get("is_correct"),
                    "time_spent_seconds": details.get("time_spent_seconds"),
                }
            )

        total_score = sum(self._as_float(question.get("marks_awarded")) or 0 for question in questions)
        max_score = sum(self._as_float(question.get("max_marks")) or 0 for question in questions)
        return {
            "total_score": total_score if questions else None,
            "max_score": max_score if questions else None,
            "questions": questions,
        }

    def _payload_report_sources(self, session: InterviewSession) -> dict[str, Any]:
        sources = session.metadata.get("payload_report_sources")
        return sources if isinstance(sources, dict) else {}

    def _events_for_lab(
        self,
        session: InterviewSession,
        source: dict[str, Any],
    ) -> list:
        lab_id = str(source.get("lab_id") or "")
        title = str(source.get("title") or "")
        events = []
        for event in session.observations:
            details = event.details if isinstance(event.details, dict) else {}
            details_lab_id = str(details.get("lab_id") or "")
            details_title = str(details.get("title") or "")
            if lab_id and details_lab_id == lab_id:
                events.append(event)
            elif title and details_title == title:
                events.append(event)
        return events

    def _combined_code_insights(
        self,
        source: dict[str, Any],
        events: list,
    ) -> dict[str, Any] | None:
        insights = [
            event.details.get("code_insights")
            for event in events
            if isinstance(event.details.get("code_insights"), dict)
        ]
        if source.get("solution_patch"):
            source_insight = self.code_analyzer.from_event_details(
                {
                    "solution_patch": source.get("solution_patch"),
                    "code_diff_format": source.get("code_diff_format"),
                }
            )
            if source_insight:
                insights.append(source_insight)
        if not insights:
            return None

        combined: dict[str, Any] = {}
        list_keys = {
            "changed_files",
            "file_changes",
            "notable_added_lines",
            "notable_removed_lines",
            "added_symbols",
            "removed_symbols",
            "framework_choices",
            "performance_concerns",
            "security_concerns",
            "candidate_correctness_concerns",
            "candidate_performance_concerns",
            "solution_contrast",
        }
        for insight in insights:
            for key, value in insight.items():
                if key in list_keys:
                    combined[key] = self._unique([*self._as_list(combined.get(key)), *self._as_list(value)])
                elif key in {"additions", "deletions"}:
                    combined[key] = (self._as_int(combined.get(key)) or 0) + (self._as_int(value) or 0)
                elif key not in combined or combined[key] in (None, "", [], {}):
                    combined[key] = value
        return combined

    def _engineering_lab_score(
        self,
        *,
        tests_passed: int | None,
        tests_total: int | None,
        errors_encountered: int | None,
        changed_files: list[str],
        code_insights: dict[str, Any] | None,
    ) -> float | None:
        additions = self._as_int((code_insights or {}).get("additions")) or 0
        deletions = self._as_int((code_insights or {}).get("deletions")) or 0
        notable_lines = (code_insights or {}).get("notable_added_lines") or []
        is_snapshot = (
            (code_insights or {}).get("code_diff_format") == "workspace_snapshot_json"
            or bool((code_insights or {}).get("is_workspace_snapshot"))
        )
        has_actual_code_changes = not is_snapshot and ((additions + deletions > 0) or bool(notable_lines))

        if tests_total and tests_total > 0:
            if not tests_passed or tests_passed == 0:
                return 0.0
            base = (tests_passed / tests_total) * 10
        elif tests_passed and tests_passed > 0:
            base = min(10.0, tests_passed * 3.3)
        elif has_actual_code_changes:
            base = 5.0
        elif changed_files or code_insights:
            # Files existed in workspace snapshot, but candidate made zero additions/deletions/submissions
            return 0.0
        else:
            return None

        if code_insights and code_insights.get("framework_choices"):
            base += 0.4
        if code_insights and code_insights.get("performance_concerns"):
            base -= 0.6
        if code_insights and code_insights.get("security_concerns"):
            base -= 0.6
        if code_insights and code_insights.get("candidate_correctness_concerns"):
            base -= 0.8
        if errors_encountered:
            base -= min(2.0, errors_encountered * 0.35)
        return round(max(0.0, min(10.0, base)), 1)

    def _knowledge_feedback(
        self,
        *,
        is_correct: bool | None,
        score_percent: float | None,
        correct_solution: Any,
    ) -> str:
        if is_correct is True:
            return "Answered correctly."
        if is_correct is False:
            if correct_solution:
                return "Incorrect or incomplete answer; compare the response with the expected solution."
            return "Incorrect or incomplete answer."
        if score_percent is not None and score_percent >= 70:
            return "Partial or rubric-based credit suggests acceptable knowledge evidence."
        if score_percent is not None:
            return "Partial or rubric-based credit suggests this topic needs follow-up."
        return "No scoring signal was available for this question."

    def _knowledge_score_to_ten(self, report: KnowledgeAssessmentReport) -> float | None:
        if report.score_percent is None:
            return None
        return round(report.score_percent / 10, 1)

    def _recommendation_from_score(self, score: float) -> str:
        if score >= 8:
            return "Strong proceed"
        if score >= 6:
            return "Proceed"
        if score >= 4:
            return "Needs review"
        return "Do not proceed"

    def _engineering_labs_markdown(
        self,
        *,
        session: InterviewSession,
        report_title: str,
        overall_score: float | None,
        lab_items: list[EngineeringLabReportItem],
        strengths: list[str],
        risks: list[str],
        total_time_seconds: int,
        tests_passed: int,
        tests_total: int,
    ) -> str:
        lines = [
            f"# {report_title}",
            "",
            f"Candidate: {session.candidate.candidate_id}",
            f"Role: {session.candidate.target_role or 'Not specified'}",
            f"Overall lab score: {overall_score if overall_score is not None else 'Insufficient evidence'}/10",
            f"Total lab time: {self._duration_minutes(total_time_seconds)} minutes",
            f"Tests passed: {tests_passed}/{tests_total}",
            "",
            "## Lab Results",
        ]
        if lab_items:
            for item in lab_items:
                lines.append(f"- {item.title}: {item.score if item.score is not None else 'N/A'}/10")
                lines.append(f"  Summary: {item.summary}")
                lines.append(f"  Files: {', '.join(item.changed_files[:8]) if item.changed_files else 'None detected'}")
        else:
            lines.append("- No engineering labs found in the payload.")
        lines.extend(["", "## Strengths"])
        lines.extend(self._list_lines(strengths))
        lines.extend(["", "## Risks"])
        lines.extend(self._list_lines(risks))
        return "\n".join(lines)

    def _knowledge_markdown(
        self,
        *,
        session: InterviewSession,
        total_score: float | None,
        max_score: float | None,
        score_percent: float | None,
        question_items: list[KnowledgeQuestionReport],
        strengths: list[str],
        risks: list[str],
    ) -> str:
        lines = [
            "# Knowledge Assessment Report",
            "",
            f"Candidate: {session.candidate.candidate_id}",
            f"Role: {session.candidate.target_role or 'Not specified'}",
            f"Score: {total_score if total_score is not None else 'N/A'}/{max_score if max_score is not None else 'N/A'}",
            f"Score percent: {score_percent if score_percent is not None else 'N/A'}%",
            "",
            "## Question Results",
        ]
        if question_items:
            for item in question_items:
                correctness = "correct" if item.is_correct is True else "incorrect" if item.is_correct is False else "unscored"
                lines.append(f"- {item.prompt}: {correctness}")
                lines.append(f"  Candidate answer: {self._display_value(item.candidate_answer, 180)}")
                if item.correct_solution is not None:
                    lines.append(f"  Expected: {self._display_value(item.correct_solution, 180)}")
                lines.append(f"  Feedback: {item.feedback}")
        else:
            lines.append("- No knowledge questions found in the payload.")
        lines.extend(["", "## Strengths"])
        lines.extend(self._list_lines(strengths))
        lines.extend(["", "## Risks"])
        lines.extend(self._list_lines(risks))
        return "\n".join(lines)

    def _overall_markdown(
        self,
        *,
        session: InterviewSession,
        overall_score: float,
        recommendation: str,
        executive_summary: str,
        section_scores: list[OverallReportSectionScore],
        strengths: list[str],
        risks: list[str],
    ) -> str:
        lines = [
            "# Overall Interview Report",
            "",
            f"Candidate: {session.candidate.candidate_id}",
            f"Role: {session.candidate.target_role or 'Not specified'}",
            f"Overall score: {overall_score}/10",
            f"Recommendation: {recommendation}",
            "",
            "## Executive Summary",
            executive_summary,
            "",
            "## Section Scores",
        ]
        for section in section_scores:
            score = f"{section.score}/10" if section.score is not None else "N/A"
            lines.append(f"- {section.section}: {score} (weight {round(section.weight * 100)}%) - {section.summary}")
        lines.extend(["", "## Strengths"])
        lines.extend(self._list_lines(strengths))
        lines.extend(["", "## Risks"])
        lines.extend(self._list_lines(risks))
        return "\n".join(lines)

    def _markdown(
        self,
        *,
        session: InterviewSession,
        evaluation: InterviewEvaluation,
        recommendation: str,
        executive_summary: str,
        strengths: list[str],
        risks: list[str],
        competency_summaries: list[ReportCompetencySummary],
        evidence_highlights: list[EvaluationEvidence],
        transcript: list[InterviewTranscriptItem],
    ) -> str:
        lines = [
            "# Vitarka Interview Report",
            "",
            f"Candidate: {session.candidate.candidate_id}",
            f"Role: {session.candidate.target_role or 'Not specified'}",
            f"Mode: {session.mode.value}",
            f"Rubric: {evaluation.rubric_version}",
            f"Overall score: {evaluation.overall_score}/10",
            (
                "Evidence coverage: "
                f"{evaluation.coverage.covered_competencies}/"
                f"{evaluation.coverage.total_competencies} "
                f"({evaluation.coverage.coverage_percent}%)"
            ),
            f"Recommendation: {recommendation}",
            "",
            "## Executive Summary",
            executive_summary,
            "",
            "## Strengths",
        ]
        lines.extend(self._list_lines(strengths))
        lines.extend(["", "## Risks And Evidence Gaps"])
        lines.extend(self._list_lines(risks))
        lines.extend(["", "## Competency Scores"])
        for summary in competency_summaries:
            label = summary.competency.value.replace("_", " ").title()
            lines.append(f"- {label}: {summary.score}/10 - {summary.guidance}")

        lines.extend(["", "## Evidence Coverage"])
        for item in evaluation.coverage.competencies:
            label = item.competency.value.replace("_", " ").title()
            lines.append(
                f"- {label}: {item.status} ({item.evidence_count} evidence items) - "
                f"{item.suggested_probe}"
            )

        lines.extend(["", "## Evidence Highlights"])
        if evidence_highlights:
            for evidence in evidence_highlights:
                lines.append(f"- [{evidence.source}:{evidence.reference_id}] {evidence.note}")
        else:
            lines.append("- No high-confidence evidence highlights captured yet.")

        lines.extend(["", "## Interview Transcript"])
        if transcript:
            for item in transcript:
                lines.append(f"- Q: {item.question}")
                lines.append(f"  A: {item.answer or 'No answer recorded.'}")
        else:
            lines.append("- No interview questions were recorded.")

        return "\n".join(lines)

    def _list_lines(self, values: list[str]) -> list[str]:
        if not values:
            return ["- None captured yet."]
        return [f"- {value}" for value in values]

    def _unique(self, values) -> list:
        unique_values = []
        seen = set()
        for value in values:
            if value in (None, "", [], {}):
                continue
            key = str(value)
            if key in seen:
                continue
            seen.add(key)
            unique_values.append(value)
        return unique_values

    def _as_list(self, value: Any) -> list:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return [value]

    def _as_int(self, value: Any) -> int | None:
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _as_float(self, value: Any) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _as_bool(self, value: Any) -> bool | None:
        if isinstance(value, bool):
            return value
        normalized = str(value or "").strip().lower()
        if normalized in {"true", "yes", "1", "correct"}:
            return True
        if normalized in {"false", "no", "0", "incorrect"}:
            return False
        return None

    def _duration_minutes(self, seconds: int | None) -> float:
        if not seconds:
            return 0
        return round(seconds / 60, 1)

    def _display_value(self, value: Any, limit: int) -> str:
        if value is None:
            return "None"
        if isinstance(value, list):
            text = ", ".join(str(item) for item in value)
        elif isinstance(value, dict):
            text = ", ".join(f"{key}: {item}" for key, item in value.items())
        else:
            text = str(value)
        return self._compact(text, limit)

    def _compact(self, value: Any, limit: int) -> str:
        text = " ".join(str(value or "").split())
        if len(text) <= limit:
            return text
        return f"{text[: limit - 3]}..."

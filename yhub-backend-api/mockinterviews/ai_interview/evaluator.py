import ast
import logging
import re
from typing import Any

from mockinterviews.ai_interview.config import settings
from mockinterviews.ai_interview.llm_client import get_llm_client
from mockinterviews.ai_interview.prompts import EVALUATION_PROMPT
from mockinterviews.ai_interview.json_parser import parse_json_response

logger = logging.getLogger(__name__)


async def evaluate_answer(
    question: str,
    expected_points: list[str],
    answer: str,
    question_type: str = "technical",
) -> dict:
    """Evaluate a candidate's answer using all applicable strategies.

    Args:
        question: The interview question text.
        expected_points: Key points the candidate should cover.
        answer: The candidate's response.
        question_type: technical | behavioral | coding | system_design.

    Returns:
        Combined evaluation dict with score, feedback, sub-scores.
    """
    answer_for_llm, answer_note, answer_truncated = _prepare_answer_for_llm(answer)

    llm_result = await _llm_evaluate(
        question,
        expected_points,
        answer_for_llm,
        question_type,
        answer_note,
    )

    rule_result = _rule_based_evaluate(answer, expected_points)

    code_result = None
    if question_type == "coding":
        code_result = _code_analysis(answer)

    combined = _combine_scores(llm_result, rule_result, code_result, question_type)
    combined["answer_word_count"] = len(answer.split())
    combined["answer_truncated"] = answer_truncated
    combined["should_offer_hint"] = _should_offer_hint(combined)
    combined["hint_prompt"] = (
        "You're close. Do you need any hint before we move ahead?"
        if combined["should_offer_hint"]
        else None
    )

    logger.info(
        "Evaluation complete: combined=%d, llm=%d, rule=%d, code=%s",
        combined["score"],
        combined.get("llm_score", 0),
        combined.get("rule_based_score", 0),
        combined.get("code_analysis_score", "N/A"),
    )

    return combined


async def _llm_evaluate(
    question: str,
    expected_points: list[str],
    answer: str,
    question_type: str,
    answer_note: str,
) -> dict:
    """Semantic evaluation via LLM."""
    client = get_llm_client()

    prompt = EVALUATION_PROMPT.format(
        question=question,
        question_type=question_type,
        expected_points=", ".join(expected_points),
        answer_note=answer_note,
        answer=answer,
    )

    response = await client.generate(
        prompt=prompt,
        system_prompt="You are an interview evaluator. Return only valid JSON.",
        max_tokens=settings.MAX_OUTPUT_TOKENS_EVAL,
    )

    return parse_json_response(response)


def _rule_based_evaluate(answer: str, expected_points: list[str]) -> dict:
    """Deterministic keyword/rubric matching.

    Scores based on:
    - Coverage of expected points (keyword matching)
    - Answer length adequacy
    - Structure (paragraphs, lists)
    """
    answer_lower = answer.lower()

    covered = []
    missed = []
    for point in expected_points:
        keywords = [w.lower().strip() for w in re.split(r"[,;/]", point)]
        if any(kw in answer_lower for kw in keywords if len(kw) > 2):
            covered.append(point)
        else:
            missed.append(point)

    coverage_ratio = len(covered) / max(len(expected_points), 1)

    word_count = len(answer.split())
    length_score = min(word_count / 50, 1.0)

    structure_bonus = 0.0
    if "\n\n" in answer or "\n-" in answer or "\n*" in answer:
        structure_bonus = 0.1
    if "```" in answer:
        structure_bonus += 0.1

    raw_score = (coverage_ratio * 0.7 + length_score * 0.2 + structure_bonus) * 10
    score = max(1, min(10, round(raw_score)))

    return {
        "score": score,
        "covered_points": covered,
        "missed_points": missed,
        "coverage_ratio": coverage_ratio,
    }


def _code_analysis(answer: str) -> dict:
    """Analyze code in the answer using Python's ast module.

    Checks:
    - Syntax validity
    - Basic complexity metrics (function count, class count, depth)
    - Code patterns
    """
    code = _extract_code_block(answer) or answer

    result: dict[str, Any] = {
        "syntax_valid": False,
        "num_functions": 0,
        "num_classes": 0,
        "num_lines": len(code.strip().split("\n")),
        "has_error_handling": "try" in code or "except" in code,
        "has_docstrings": '"""' in code or "'''" in code,
        "complexity_estimate": "low",
    }

    try:
        tree = ast.parse(code)
        result["syntax_valid"] = True
        result["num_functions"] = sum(1 for n in ast.walk(tree) if isinstance(n, ast.FunctionDef))
        result["num_classes"] = sum(1 for n in ast.walk(tree) if isinstance(n, ast.ClassDef))

        max_depth = _max_nesting_depth(tree)
        if max_depth > 4:
            result["complexity_estimate"] = "high"
        elif max_depth > 2:
            result["complexity_estimate"] = "medium"

    except SyntaxError as exc:
        result["syntax_error"] = str(exc)
        logger.debug("Code has syntax error: %s", exc)

    score = 3
    if result["syntax_valid"]:
        score += 3
    if result["num_functions"] > 0:
        score += 1
    if result["has_error_handling"]:
        score += 1
    if result["has_docstrings"]:
        score += 1
    if result["num_lines"] > 5:
        score += 1

    result["score"] = min(10, score)
    return result


def _extract_code_block(text: str) -> str | None:
    """Extract code from markdown fences."""
    if "```" in text:
        parts = text.split("```")
        for part in parts[1::2]:
            cleaned = part.strip()
            if cleaned.startswith(("python", "py")):
                cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else ""
            if cleaned.strip():
                return cleaned.strip()
    return None


def _max_nesting_depth(node: ast.AST, depth: int = 0) -> int:
    """Calculate maximum nesting depth in an AST."""
    max_d = depth
    for child in ast.iter_child_nodes(node):
        if isinstance(child, (ast.If, ast.For, ast.While, ast.With, ast.Try)):
            max_d = max(max_d, _max_nesting_depth(child, depth + 1))
        else:
            max_d = max(max_d, _max_nesting_depth(child, depth))
    return max_d


def _combine_scores(
    llm_result: dict,
    rule_result: dict,
    code_result: dict | None,
    question_type: str,
) -> dict:
    """Combine all evaluation scores into a final result.

    Weights:
      technical/behavioral: 60% LLM + 40% rules
      coding: 40% LLM + 25% rules + 35% code analysis
      system_design: 70% LLM + 30% rules
    """
    llm_score = _coerce_score(llm_result.get("score", 5))
    rule_score = _coerce_score(rule_result.get("score", 5))

    if question_type == "coding" and code_result:
        code_score = _coerce_score(code_result.get("score", 5))
        final = llm_score * 0.40 + rule_score * 0.25 + code_score * 0.35
    elif question_type == "system_design":
        final = llm_score * 0.70 + rule_score * 0.30
    else:
        final = llm_score * 0.60 + rule_score * 0.40

    combined = {
        "score": max(1, min(10, round(final))),
        "score_percentage": round(final * 10, 1),
        "feedback": llm_result.get("feedback", ""),
        "covered_points": llm_result.get("covered_points", []),
        "missed_points": llm_result.get("missed_points", []),
        "follow_up_suggestion": llm_result.get("follow_up_suggestion"),
        "llm_score": round(llm_score),
        "rule_based_score": round(rule_score),
        "coverage_ratio": rule_result.get("coverage_ratio", 0.0),
    }

    if code_result:
        combined["code_analysis_score"] = round(_coerce_score(code_result.get("score", 5)))
        combined["syntax_valid"] = code_result.get("syntax_valid")
        combined["complexity"] = code_result.get("complexity_estimate")

    return combined


def _prepare_answer_for_llm(answer: str) -> tuple[str, str, bool]:
    """Keep long answers usable without blindly dropping the conclusion."""
    clean_answer = answer.strip()
    max_chars = settings.MAX_ANSWER_CHARS
    if len(clean_answer) <= max_chars:
        return clean_answer, "Full candidate answer included.", False

    head_chars = int(max_chars * 0.7)
    tail_chars = max_chars - head_chars
    condensed = (
        clean_answer[:head_chars].rstrip()
        + "\n\n[Middle of a long answer omitted to fit the evaluator context. "
        "Evaluate using the visible beginning and conclusion plus rule-based coverage on the full answer.]\n\n"
        + clean_answer[-tail_chars:].lstrip()
    )
    note = (
        f"Candidate answer was {len(clean_answer)} characters; the evaluator prompt "
        "includes the beginning and ending instead of only truncating from the end."
    )
    return condensed, note, True


def _coerce_score(value: object, default: float = 5.0) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return default
    return max(1.0, min(10.0, score))


def _should_offer_hint(evaluation: dict) -> bool:
    """Offer a hint when the answer is roughly 60% correct."""
    score_percentage = float(evaluation.get("score_percentage", 0.0))
    return (
        settings.HINT_OFFER_MIN_PERCENT
        <= score_percentage
        <= settings.HINT_OFFER_MAX_PERCENT
    )

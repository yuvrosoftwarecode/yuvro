import asyncio
import io
import json
import logging

from assessment.ai_interview.config import settings
from assessment.ai_interview.llm_client import get_llm_client
from assessment.ai_interview.prompts import RESUME_EXTRACTION_PROMPT
from assessment.ai_interview.jd_parser import parse_jd
from assessment.ai_interview.skill_extractor import extract_skills
from assessment.ai_interview.json_parser import parse_json_response

logger = logging.getLogger(__name__)


async def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract plain text from a PDF file.

    Falls back to pdfplumber if pypdf yields too little text.
    """
    text = _extract_with_pypdf(pdf_bytes)

    if len(text.strip()) < 50:
        logger.info("pypdf extracted only %d chars; trying pdfplumber", len(text.strip()))
        text = _extract_with_pdfplumber(pdf_bytes)

    logger.info("PDF extraction complete: %d chars", len(text.strip()))
    return text.strip()


def _extract_with_pypdf(pdf_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages)
    except Exception as exc:
        logger.warning("pypdf extraction failed: %s", exc)
        return ""


def _extract_with_pdfplumber(pdf_bytes: bytes) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        return "\n".join(pages)
    except ImportError:
        logger.info("pdfplumber not installed -- skipping fallback")
        return ""
    except Exception as exc:
        logger.warning("pdfplumber extraction failed: %s", exc)
        return ""


MAX_LLM_RETRIES = 2


async def analyze_resume(resume_text: str, jd_text: str) -> dict:
    """Full pipeline: extract skills -> parse JD -> combined analysis.

    Steps:
        1. Standalone skill extraction from resume
        2. Standalone JD parsing
        3. Combined LLM analysis using both structured outputs

    Returns:
        Dict matching the ResumeAnalysis schema.
    """
    logger.info("Steps 1-2/3: Extracting resume skills and parsing JD in parallel")
    skill_profile, jd_requirements = await asyncio.gather(
        extract_skills(resume_text),
        parse_jd(jd_text),
    )
    resume_skills_summary = json.dumps(
        [s.model_dump() for s in skill_profile.skills], indent=2
    )

    jd_summary = json.dumps(jd_requirements.model_dump(), indent=2)

    logger.info("Step 3/3: Running combined resume-JD analysis")
    client = get_llm_client()

    prompt = RESUME_EXTRACTION_PROMPT.format(
        resume_text=resume_text[: settings.MAX_RESUME_CHARS],
        jd_text=jd_text[: settings.MAX_JD_CHARS],
        resume_skills=resume_skills_summary,
        jd_requirements=jd_summary,
    )

    last_error: Exception | None = None

    for attempt in range(1, MAX_LLM_RETRIES + 1):
        try:
            response = await client.generate(
                prompt=prompt,
                system_prompt="You are a technical recruiter AI. Return only valid JSON.",
                max_tokens=settings.MAX_OUTPUT_TOKENS_RESUME,
            )
            result = parse_json_response(response)

            result["_skill_profile"] = skill_profile.model_dump()
            result["_jd_requirements"] = jd_requirements.model_dump()

            logger.info(
                "Resume analysis succeeded: match_score=%s",
                result.get("match_score", "N/A"),
            )
            return result

        except (ValueError, json.JSONDecodeError) as exc:
            logger.warning("Analysis attempt %d failed: %s", attempt, exc)
            last_error = exc
        except Exception as exc:
            logger.error("LLM call attempt %d failed: %s", attempt, exc)
            last_error = exc

    raise ValueError(
        f"Resume analysis failed after {MAX_LLM_RETRIES} attempts: {last_error}"
    )

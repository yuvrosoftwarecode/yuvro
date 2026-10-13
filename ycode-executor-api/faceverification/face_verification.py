"""Face Verification Service.

Handles webcam-based face verification during interviews
to ensure the candidate is present and attentive.

Uses DeepFace for detection when available, gracefully
degrades to a stub when not installed.

Dependencies (install when deploying):
    pip install deepface opencv-python-headless
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import tempfile
from typing import Any

class Settings:
    FACE_VERIFY_MODEL_NAME = os.getenv("FACE_VERIFY_MODEL_NAME", "VGG-Face")
    FACE_VERIFY_DISTANCE_METRIC = os.getenv("FACE_VERIFY_DISTANCE_METRIC", "cosine")
    FACE_CONFIDENCE_THRESHOLD = float(os.getenv("FACE_CONFIDENCE_THRESHOLD", "0.80"))
    FACE_MAX_ALLOWED_FACES = int(os.getenv("FACE_MAX_ALLOWED_FACES", "1"))

settings = Settings()

logger = logging.getLogger(__name__)

_DEEPFACE_AVAILABLE = False

try:
    from deepface import DeepFace
    _DEEPFACE_AVAILABLE = True
    logger.info("DeepFace loaded successfully")
except ImportError:
    logger.warning("DeepFace not installed -- face verification will use stub mode")


async def enroll_face(image_bytes: bytes) -> dict[str, Any]:
    """Validate a candidate's pre-assessment reference selfie."""
    analysis = await analyze_face(image_bytes)
    enrolled = _is_single_confident_face(analysis) or analysis.get("stub_mode", False)
    risk_flags = list(analysis.get("risk_flags", []))

    if not enrolled and "enrollment_not_accepted" not in risk_flags:
        risk_flags.append("enrollment_not_accepted")

    return {
        **analysis,
        "enrolled": enrolled,
        "reference_id": build_reference_id(image_bytes) if enrolled else None,
        "status": "stub" if analysis.get("stub_mode") else ("passed" if enrolled else "failed"),
        "risk_flags": risk_flags,
        "message": (
            "Reference selfie enrolled successfully."
            if enrolled and not analysis.get("stub_mode")
            else analysis.get("message", "Reference selfie could not be enrolled.")
        ),
    }


async def verify_candidate_face(
    reference_image_bytes: bytes,
    probe_image_bytes: bytes,
) -> dict[str, Any]:
    """Compare a live webcam frame against the enrolled reference selfie."""
    probe_analysis = await analyze_face(probe_image_bytes)
    risk_flags = list(probe_analysis.get("risk_flags", []))

    if probe_analysis.get("stub_mode"):
        return {
            **probe_analysis,
            "identity_verified": None,
            "verified": False,
            "status": "stub",
            "distance": None,
            "threshold": None,
            "model": None,
            "similarity_metric": None,
            "message": "Face verification running in stub mode; identity was not compared.",
        }

    if not _is_single_confident_face(probe_analysis):
        return {
            **probe_analysis,
            "identity_verified": False,
            "verified": False,
            "status": "failed" if _has_hard_failure(probe_analysis) else "warning",
            "distance": None,
            "threshold": None,
            "model": settings.FACE_VERIFY_MODEL_NAME,
            "similarity_metric": settings.FACE_VERIFY_DISTANCE_METRIC,
            "risk_flags": risk_flags,
            "message": _build_presence_failure_message(probe_analysis),
        }

    if not reference_image_bytes:
        return {
            **probe_analysis,
            "identity_verified": None,
            "verified": False,
            "status": "warning",
            "distance": None,
            "threshold": None,
            "model": None,
            "similarity_metric": None,
            "risk_flags": risk_flags,
            "message": "No reference image provided; identity was not compared.",
        }

    identity = await _deepface_compare(reference_image_bytes, probe_image_bytes)
    identity_flags = list(identity.get("risk_flags", []))
    risk_flags.extend(identity_flags)
    identity_verified = bool(identity.get("identity_verified"))
    if not identity_verified and "identity_comparison_error" not in identity_flags:
        risk_flags.append("face_mismatch")

    verified = identity_verified and not risk_flags
    status = "passed" if verified else "failed"

    return {
        **probe_analysis,
        **identity,
        "identity_verified": identity_verified,
        "verified": verified,
        "status": status,
        "risk_flags": risk_flags,
        "message": (
            "Candidate face verified against the enrolled reference."
            if verified
            else _build_identity_failure_message(risk_flags)
        ),
    }


async def analyze_face(image_bytes: bytes) -> dict[str, Any]:
    """Analyze whether a single usable face is present in an image.

    Args:
        image_bytes: Raw image bytes (JPEG/PNG from webcam capture).

    Returns:
        Dict with:
          - face_detected (bool)
          - num_faces (int)
          - confidence (float 0-1)
          - dominant_emotion (str, if available)
          - message (str)
    """
    if not _DEEPFACE_AVAILABLE:
        return _stub_result()

    return await asyncio.to_thread(_deepface_analyze_sync, image_bytes)


async def verify_face(image_bytes: bytes) -> dict[str, Any]:
    """Backward-compatible alias for presence-only verification."""
    return await analyze_face(image_bytes)


def build_reference_id(image_bytes: bytes) -> str:
    """Return a short stable ID for a reference image without exposing the image."""
    return hashlib.sha256(image_bytes).hexdigest()[:16]


def _deepface_analyze_sync(image_bytes: bytes) -> dict[str, Any]:
    """Run face detection/analysis using DeepFace."""
    tmp_path = None
    try:
        tmp_path = _write_temp_image(image_bytes)

        results = DeepFace.analyze(
            img_path=tmp_path,
            actions=["emotion"],
            enforce_detection=False,
            silent=True,
        )

        faces = _normalize_deepface_results(results)
        if not faces:
            return _presence_result(
                face_detected=False,
                num_faces=0,
                confidence=0.0,
                dominant_emotion=None,
                risk_flags=["no_face_detected"],
                message="No face detected in the image.",
            )

        primary = faces[0]
        confidence = _coerce_float(primary.get("face_confidence", 0.0))
        emotion = primary.get("dominant_emotion", "unknown")
        risk_flags = _presence_risk_flags(len(faces), confidence)

        return _presence_result(
            face_detected=confidence >= settings.FACE_CONFIDENCE_THRESHOLD,
            num_faces=len(faces),
            confidence=round(confidence, 3),
            dominant_emotion=emotion,
            risk_flags=risk_flags,
            message=_build_presence_message(len(faces), emotion, risk_flags),
        )

    except Exception as exc:
        logger.error("DeepFace analysis failed: %s", exc)
        return _presence_result(
            face_detected=False,
            num_faces=0,
            confidence=0.0,
            dominant_emotion=None,
            risk_flags=["face_analysis_error"],
            message=f"Face verification error: {exc}",
        )
    finally:
        _safe_unlink(tmp_path)


async def _deepface_compare(
    reference_image_bytes: bytes,
    probe_image_bytes: bytes,
) -> dict[str, Any]:
    """Run identity verification in a worker thread."""
    return await asyncio.to_thread(
        _deepface_compare_sync,
        reference_image_bytes,
        probe_image_bytes,
    )


def _deepface_compare_sync(
    reference_image_bytes: bytes,
    probe_image_bytes: bytes,
) -> dict[str, Any]:
    reference_path = None
    probe_path = None
    try:
        reference_path = _write_temp_image(reference_image_bytes)
        probe_path = _write_temp_image(probe_image_bytes)

        result = DeepFace.verify(
            img1_path=reference_path,
            img2_path=probe_path,
            model_name=settings.FACE_VERIFY_MODEL_NAME,
            distance_metric=settings.FACE_VERIFY_DISTANCE_METRIC,
            enforce_detection=False,
            silent=True,
        )

        return {
            "identity_verified": bool(result.get("verified")),
            "distance": _round_optional(result.get("distance")),
            "threshold": _round_optional(result.get("threshold")),
            "model": result.get("model") or settings.FACE_VERIFY_MODEL_NAME,
            "similarity_metric": (
                result.get("similarity_metric")
                or settings.FACE_VERIFY_DISTANCE_METRIC
            ),
        }

    except Exception as exc:
        logger.error("DeepFace identity comparison failed: %s", exc)
        return {
            "identity_verified": False,
            "distance": None,
            "threshold": None,
            "model": settings.FACE_VERIFY_MODEL_NAME,
            "similarity_metric": settings.FACE_VERIFY_DISTANCE_METRIC,
            "risk_flags": ["identity_comparison_error"],
        }
    finally:
        _safe_unlink(reference_path)
        _safe_unlink(probe_path)


def _write_temp_image(image_bytes: bytes) -> str:
    """DeepFace works with file paths, so bridge bytes through a temp file."""
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as file:
        file.write(image_bytes)
        return file.name


def _normalize_deepface_results(results: Any) -> list[dict[str, Any]]:
    if not results:
        return []
    if isinstance(results, list):
        return [item for item in results if isinstance(item, dict)]
    if isinstance(results, dict):
        return [results]
    return []


def _presence_result(
    face_detected: bool,
    num_faces: int,
    confidence: float,
    dominant_emotion: str | None,
    risk_flags: list[str],
    message: str,
) -> dict[str, Any]:
    return {
        "face_detected": face_detected,
        "num_faces": num_faces,
        "multiple_faces_detected": num_faces > settings.FACE_MAX_ALLOWED_FACES,
        "confidence": confidence,
        "dominant_emotion": dominant_emotion,
        "risk_flags": risk_flags,
        "message": message,
        "stub_mode": False,
    }


def _presence_risk_flags(num_faces: int, confidence: float) -> list[str]:
    flags = []
    if num_faces == 0 or confidence <= 0:
        flags.append("no_face_detected")
    if num_faces > settings.FACE_MAX_ALLOWED_FACES:
        flags.append("multiple_faces_detected")
    if confidence < settings.FACE_CONFIDENCE_THRESHOLD:
        flags.append("low_face_confidence")
    return flags


def _is_single_confident_face(analysis: dict[str, Any]) -> bool:
    return (
        bool(analysis.get("face_detected"))
        and analysis.get("num_faces") == 1
        and _coerce_float(analysis.get("confidence")) >= settings.FACE_CONFIDENCE_THRESHOLD
    )


def _has_hard_failure(analysis: dict[str, Any]) -> bool:
    flags = set(analysis.get("risk_flags", []))
    return bool({"no_face_detected", "multiple_faces_detected"} & flags)


def _build_presence_message(
    num_faces: int,
    emotion: str | None,
    risk_flags: list[str],
) -> str:
    if "no_face_detected" in risk_flags:
        return "No face detected in the image."
    if "multiple_faces_detected" in risk_flags:
        return f"Detected {num_faces} faces. Only the enrolled candidate should be visible."
    if "low_face_confidence" in risk_flags:
        return "Face detected, but confidence is low. Please improve lighting and camera position."
    return f"Detected 1 face. Primary emotion: {emotion or 'unknown'}."


def _build_presence_failure_message(analysis: dict[str, Any]) -> str:
    flags = set(analysis.get("risk_flags", []))
    if "no_face_detected" in flags:
        return "No face detected. Please keep your face visible to continue the interview."
    if "multiple_faces_detected" in flags:
        return "Multiple faces detected. Only the enrolled candidate should be visible."
    if "low_face_confidence" in flags:
        return "Face confidence is low. Please adjust lighting or camera position."
    return analysis.get("message", "Face verification failed.")


def _build_identity_failure_message(risk_flags: list[str]) -> str:
    if "identity_comparison_error" in risk_flags:
        return "Face comparison could not be completed. Please retry with a clear webcam frame."
    return "Live face does not match the enrolled reference selfie."


def _coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _round_optional(value: Any) -> float | None:
    if value is None:
        return None
    return round(_coerce_float(value), 5)


def _safe_unlink(path: str | None) -> None:
    if path and os.path.exists(path):
        os.unlink(path)


def _stub_result() -> dict[str, Any]:
    """Fallback when DeepFace is not installed."""
    return {
        "face_detected": True,
        "num_faces": 1,
        "multiple_faces_detected": False,
        "confidence": 0.0,
        "dominant_emotion": None,
        "risk_flags": ["deepface_unavailable"],
        "stub_mode": True,
        "message": "Face verification running in stub mode (DeepFace not installed).",
    }

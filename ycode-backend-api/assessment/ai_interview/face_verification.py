import logging
import httpx
from typing import Any
import hashlib
import os

from assessment.ai_interview.config import settings

logger = logging.getLogger(__name__)

# URL of the yuvro-code-executer microservice running in the docker network
CODE_EXECUTER_URL = os.getenv("CODE_EXECUTOR_URL", "http://yuvro-code-executor:8009")

def _get_stub_result(operation: str) -> dict[str, Any]:
    """Fallback when code-executer is unavailable."""
    return {
        "face_detected": True,
        "num_faces": 1,
        "multiple_faces_detected": False,
        "confidence": 0.0,
        "dominant_emotion": None,
        "risk_flags": ["deepface_unavailable"],
        "stub_mode": True,
        "message": f"Face verification running in stub mode (Executer unavailable during {operation}).",
        "enrolled": True if operation == "enroll" else None,
        "verified": False if operation == "verify" else None,
        "status": "stub",
    }

async def enroll_face(image_bytes: bytes) -> dict[str, Any]:
    """Validate a candidate's pre-assessment reference selfie using the code executer."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {"image": ("enroll.jpg", image_bytes, "image/jpeg")}
            response = await client.post(f"{CODE_EXECUTER_URL}/api/v1/proctoring/enroll", files=files)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error calling code-executer for enroll_face: {e}")
        return _get_stub_result("enroll")

async def verify_candidate_face(
    reference_image_bytes: bytes,
    probe_image_bytes: bytes,
) -> dict[str, Any]:
    """Compare a live webcam frame against the enrolled reference selfie using code executer."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {
                "probe_image": ("probe.jpg", probe_image_bytes, "image/jpeg"),
                "reference_image": ("reference.jpg", reference_image_bytes, "image/jpeg")
            }
            response = await client.post(f"{CODE_EXECUTER_URL}/api/v1/proctoring/verify", files=files)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error calling code-executer for verify_candidate_face: {e}")
        return _get_stub_result("verify")

async def analyze_face(image_bytes: bytes) -> dict[str, Any]:
    """Analyze a single face image for presence, confidence, and emotion."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            files = {"image": ("analyze.jpg", image_bytes, "image/jpeg")}
            response = await client.post(f"{CODE_EXECUTER_URL}/api/v1/proctoring/analyze", files=files)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error calling code-executer for analyze_face: {e}")
        return _get_stub_result("analyze")

def build_reference_id(image_bytes: bytes) -> str:
    """Generate a consistent identifier for a reference image."""
    return hashlib.sha256(image_bytes).hexdigest()

# Alias verify_face to analyze_face for now
verify_face = analyze_face

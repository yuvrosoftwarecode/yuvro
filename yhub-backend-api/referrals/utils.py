import re
import secrets
import string
from django.conf import settings


DEFAULT_INVITE_MESSAGE = (
    "Hey! Join YLabs using my referral link and create your account. Looking forward to learning together!"
)


def sanitize_username_for_code(username: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]", "", username or "")
    if not cleaned:
        cleaned = "STUDENT"
    return cleaned[:6].upper()


def generate_unique_referral_code(user) -> str:
    from .models import ReferralCode

    prefix = sanitize_username_for_code(getattr(user, "username", None) or "STUDENT")
    charset = string.ascii_uppercase + string.digits

    # Try up to 10 attempts to generate unique readable code
    for _ in range(10):
        random_suffix = "".join(secrets.choice(charset) for _ in range(4))
        code = f"REF-{prefix}-{random_suffix}"
        if not ReferralCode.objects.filter(code__iexact=code).exists():
            return code

    # Fallback to longer random token if collision occurs
    fallback_suffix = "".join(secrets.choice(charset) for _ in range(8))
    return f"REF-{prefix}-{fallback_suffix}"


def get_referral_share_url(code: str) -> str:
    # Use frontend URL from settings if available or standard default
    frontend_url = getattr(settings, "YLABS_FRONTEND_URL", None) or getattr(
        settings, "FRONTEND_URL", "https://ylabs.yuvro.ai"
    )
    frontend_url = frontend_url.rstrip("/")
    return f"{frontend_url}/register?ref={code}"

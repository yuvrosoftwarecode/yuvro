from __future__ import annotations

from urllib.parse import quote, urljoin

from django.conf import settings


def build_public_url(object_name):
    if not object_name:
        return None

    obj = str(object_name).strip()
    if obj.startswith(("http://", "https://")):
        return obj

    public_endpoint = (
        getattr(settings, "AWS_S3_PUBLIC_ENDPOINT_URL", "")
        or getattr(settings, "AWS_S3_ENDPOINT_URL", "")
        or ""
    )
    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "") or ""
    if not public_endpoint or not bucket:
        return None

    base = public_endpoint.rstrip("/") + "/"
    return urljoin(base, f"{bucket}/{quote(obj, safe='/')}")

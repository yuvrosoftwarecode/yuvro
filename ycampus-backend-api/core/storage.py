"""
Helpers for building public URLs to objects stored in S3 / MinIO.

The DB stores only the *object name* (the part after the bucket) on
`Profile.<image_field>`. The full URL is built on the fly by combining:
  - AWS_S3_PUBLIC_ENDPOINT_URL   (the host the *browser* reaches)
  - AWS_STORAGE_BUCKET_NAME       (the bucket name)
  - <object name stored in DB>

This keeps the stored value short (well under URLField max_length=200) and
decouples it from any change in the public host or bucket name.
"""
from __future__ import annotations

from urllib.parse import quote, urljoin

from django.conf import settings


def build_public_url(object_name: str | None) -> str | None:
    """
    Return the browser-reachable URL for an object, or None if `object_name`
    is empty.

    - If `object_name` already looks like a full URL (http:// or https://),
      return it unchanged — this keeps backward compatibility with rows that
      were saved with the absolute URL (pre-refactor data).
    - Otherwise, build: {PUBLIC_ENDPOINT}/{BUCKET}/{object_name}
    """
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

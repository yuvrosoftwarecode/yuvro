from __future__ import annotations

import logging
from urllib.parse import quote, urljoin

from django.conf import settings
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


def _build_unsigned_url(obj, bucket):
    public_endpoint = (
        getattr(settings, "AWS_S3_PUBLIC_ENDPOINT_URL", "")
        or getattr(settings, "AWS_S3_ENDPOINT_URL", "")
        or ""
    )
    if public_endpoint:
        base = public_endpoint.rstrip("/") + "/"
        return urljoin(base, f"{bucket}/{quote(obj, safe='/')}")

    region = (
        getattr(settings, "AWS_S3_REGION_NAME", "")
        or getattr(settings, "AWS_REGION", "")
        or "us-east-1"
    )
    addressing = (
        getattr(settings, "AWS_S3_ADDRESSING_STYLE", "") or "virtual"
    ).strip().lower()
    key = quote(obj, safe="/")
    if addressing == "path":
        return f"https://s3.{region}.amazonaws.com/{bucket}/{key}"
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


def _build_signed_url(obj, bucket):
    try:
        import boto3
    except ImportError:
        return None

    region = (
        getattr(settings, "AWS_S3_REGION_NAME", "")
        or getattr(settings, "AWS_REGION", "")
        or "us-east-1"
    )
    custom_endpoint = getattr(settings, "AWS_S3_ENDPOINT_URL", "") or None
    addressing = (
        getattr(settings, "AWS_S3_ADDRESSING_STYLE", "") or "virtual"
    ).strip().lower()
    try:
        from botocore.config import Config
        boto_config = Config(
            signature_version="s3v4",
            s3={"addressing_style": addressing},
        )
    except ImportError:
        boto_config = None
    client = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", "") or None,
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", "") or None,
        endpoint_url=custom_endpoint or f"https://s3.{region}.amazonaws.com",
        config=boto_config,
    )
    try:
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": obj},
            ExpiresIn=600,
        )
    except Exception:
        return None


def build_public_url(object_name):
    if not object_name:
        return None

    obj = str(object_name).strip()
    if obj.startswith(("http://", "https://")):
        return obj

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "") or ""
    if not bucket:
        return None

    if getattr(settings, "AWS_QUERYSTRING_AUTH", True):
        signed = _build_signed_url(obj, bucket)
        if signed:
            return signed
    return _build_unsigned_url(obj, bucket)


def upload_file(*, key, file_obj, replace_extensions=()):
    """
    Save a file via Django's default storage backend.

    The key is relative to the bucket root; the per-app folder (from
    APP_NAME) is auto-prepended so callers can use the same key shape
    across local / dev / staging / prod.

      local  : yuvro-local/<APP_NAME>/<key>
      dev    : yuvro-dev/<APP_NAME>/<key>
      prod   : yuvro-prod/<APP_NAME>/<key>

    If `replace_extensions` is provided, prior objects with the same
    base name but each of those extensions are deleted first — useful
    for "single image per (key)" semantics (e.g. profile_image.jpg
    replaces profile_image.png).

    Returns the storage key (not a URL); pass it to build_public_url when
    serializing for clients.
    """
    app_name = (getattr(settings, "APP_NAME", "") or "").strip().strip("/")
    full_key = (f"{app_name}/" if app_name else "") + key.lstrip("/")

    try:
        if replace_extensions and "." in full_key:
            base, _ = full_key.rsplit(".", 1)
            for prior_ext in replace_extensions:
                try:
                    default_storage.delete(f"{base}.{prior_ext}")
                except Exception:
                    pass

        return default_storage.save(full_key, file_obj)
    except Exception:
        logger.exception("upload_file failed (key=%s)", full_key)
        raise

# Alias for backwards compatibility
upload_image = upload_file

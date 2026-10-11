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


def _ensure_minio_bucket_public(bucket: str):
    if not bucket:
        return
    endpoint = getattr(settings, "AWS_S3_ENDPOINT_URL", "")
    if not endpoint:
        return
    try:
        import boto3
        import json
        client = boto3.client(
            "s3",
            region_name=getattr(settings, "AWS_S3_REGION_NAME", "ap-south-1") or "ap-south-1",
            aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", "minioadmin") or "minioadmin",
            aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", "minioadmin") or "minioadmin",
            endpoint_url=endpoint,
        )
        try:
            client.head_bucket(Bucket=bucket)
        except Exception:
            try:
                client.create_bucket(Bucket=bucket)
                logger.info("Auto-created MinIO bucket: %s", bucket)
            except Exception as create_err:
                try:
                    region = getattr(settings, "AWS_S3_REGION_NAME", "") or "ap-south-1"
                    client.create_bucket(
                        Bucket=bucket,
                        CreateBucketConfiguration={"LocationConstraint": region}
                    )
                    logger.info("Auto-created MinIO bucket with region %s: %s", region, bucket)
                except Exception as retry_err:
                    logger.warning("Could not auto-create MinIO bucket %s: %s (retry: %s)", bucket, create_err, retry_err)

        if not getattr(settings, "AWS_QUERYSTRING_AUTH", True):
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket}/*"]
                    }
                ]
            }
            client.put_bucket_policy(Bucket=bucket, Policy=json.dumps(policy))
    except Exception as err:
        logger.debug("Failed to set MinIO bucket public policy: %s", err)


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
        clean_key = str(obj).strip().lstrip("/")
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": clean_key},
            ExpiresIn=getattr(settings, "AWS_QUERYSTRING_EXPIRE", 86400),
        )
        public_endpoint = getattr(settings, "AWS_S3_PUBLIC_ENDPOINT_URL", "")
        internal_endpoint = getattr(settings, "AWS_S3_ENDPOINT_URL", "")
        if public_endpoint and internal_endpoint and internal_endpoint in url:
            url = url.replace(internal_endpoint, public_endpoint, 1)
        return url
    except Exception as err:
        logger.error(f"Failed to generate presigned URL: {err}")
        return None


def build_public_url(object_name):
    if not object_name:
        return None

    obj = str(object_name).strip()
    if obj.startswith(("http://", "https://")):
        return obj

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "") or ""
    if not bucket:
        # Fallback to local media URL
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        if not media_url.endswith("/"):
            media_url += "/"
        return f"{media_url}{obj.lstrip('/')}"

    if getattr(settings, "AWS_QUERYSTRING_AUTH", True):
        signed = _build_signed_url(obj, bucket)
        if signed:
            return signed
    return _build_unsigned_url(obj, bucket)


def upload_image(*, key, file_obj, replace_extensions=()):
    """
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
        bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "") or ""
        if bucket:
            _ensure_minio_bucket_public(bucket)

        if replace_extensions and "." in full_key:
            base, _ = full_key.rsplit(".", 1)
            for prior_ext in replace_extensions:
                try:
                    default_storage.delete(f"{base}.{prior_ext}")
                except Exception:
                    pass

        return default_storage.save(full_key, file_obj)
    except Exception:
        logger.exception("upload_image failed (key=%s)", full_key)
        raise

from __future__ import annotations

from urllib.parse import quote, urljoin

from django.conf import settings


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
    endpoint_url = getattr(settings, "AWS_S3_ENDPOINT_URL", "") or None
    client = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=getattr(settings, "AWS_ACCESS_KEY_ID", "") or None,
        aws_secret_access_key=getattr(settings, "AWS_SECRET_ACCESS_KEY", "") or None,
        endpoint_url=endpoint_url,
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

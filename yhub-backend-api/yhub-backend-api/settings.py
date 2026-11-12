from pathlib import Path
from decouple import config
from datetime import timedelta
import dj_database_url
import os


BASE_DIR = Path(__file__).resolve().parent.parent

# Pre-populate os.environ from local env files so decouple.config & os.environ have full access
def _load_env_files():
    search_dirs = [
        BASE_DIR,
        Path("/app"),
        BASE_DIR.parent,
        BASE_DIR.parent / "ylabs-backend-api",
    ]
    for sdir in search_dirs:
        if not sdir or not os.path.exists(sdir):
            continue
        for fname in [".env.local-secrets", ".env.local", ".env", ".env.dev"]:
            fpath = Path(sdir) / fname
            if fpath.exists():
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                k, v = line.split("=", 1)
                                k = k.strip()
                                v = v.strip().strip("'\"")
                                if k not in os.environ or not os.environ[k]:
                                    os.environ[k] = v
                except Exception:
                    pass

_load_env_files()

SECRET_KEY = config("SECRET_KEY", default="change-me-in-production-use-env-dev-secrets")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    # Local — auth only
    "core",
    "authentication",
    "ai_assistant",
    "mockinterviews",
    "payment",
    "ai_credits",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "yhub-backend-api.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "yhub-backend-api.wsgi.application"

DATABASES = {"default": dj_database_url.parse(config("DATABASE_URL"))}

AUTH_USER_MODEL = "authentication.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "uploads"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME", default=180, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": config("JWT_SECRET_KEY", default=SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_OBTAIN_SERIALIZER": "authentication.serializers.CustomTokenObtainPairSerializer",
}

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-session-id",
]

CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="https://labs-dev.yuvro.ai,http://localhost:8002",
).split(",")

SITE_ID = 1
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = "none"
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_UNIQUE_EMAIL = True

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
        "OAUTH_PKCE_ENABLED": True,
        "APP": {
            "client_id": config("GOOGLE_OAUTH2_CLIENT_ID", default=""),
            "secret": config("GOOGLE_OAUTH2_CLIENT_SECRET", default=""),
        },
    }
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend"
)

EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", cast=int, default=465)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", cast=bool, default=False)
EMAIL_USE_SSL = config("EMAIL_USE_SSL", cast=bool, default=True)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = config(
    "DEFAULT_FROM_EMAIL",
    default=EMAIL_HOST_USER
)

APP_DOMAIN = config("APP_DOMAIN", default=config("DOMAIN", default=os.getenv("DOMAIN", ""))).strip()
APPLICATION_NAME = config("APPLICATION_NAME", default="Yuvro Labs")
SUPPORT_EMAIL = config("SUPPORT_EMAIL", default=f"support@{APP_DOMAIN}" if APP_DOMAIN else "support@yuvrolabs.com")
EMAIL_LOGO_URL = config("EMAIL_LOGO_URL", default=f"https://{APP_DOMAIN}/knowledge-tree.png" if APP_DOMAIN else "https://marketplace.yuvro.ai/knowledge-tree.png")

STRIPE_API_KEY = config("STRIPE_API_KEY", default="")
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET", default="")

def _resolve_razorpay_credentials():
    revoked_keys = {"rzp_test_T56EPoR3Lpa9xz"}
    raw_key = config("RAZORPAY_KEY_ID", default="").strip()
    raw_secret = config("RAZORPAY_KEY_SECRET", default="").strip()
    raw_webhook = config("RAZORPAY_WEBHOOK_SECRET", default="staging_rzp_webhook_secret_test").strip()

    if not raw_key or raw_key in revoked_keys:
        for fname in [".env.dev", ".env.local", ".env"]:
            fpath = BASE_DIR / fname
            if fpath.exists():
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                k, v = line.split("=", 1)
                                k = k.strip()
                                v = v.strip().strip("'\"")
                                if k == "RAZORPAY_KEY_ID" and v not in revoked_keys:
                                    raw_key = v
                                elif k == "RAZORPAY_KEY_SECRET" and raw_key not in revoked_keys:
                                    raw_secret = v
                                elif k == "RAZORPAY_WEBHOOK_SECRET":
                                    raw_webhook = v
                    if raw_key and raw_key not in revoked_keys:
                        break
                except Exception:
                    pass

    if not raw_key or raw_key in revoked_keys:
        raw_key = "rzp_live_Tv1bKX52in9Kmf"
        raw_secret = "ZG7DiBLkljv5vktLiScBXtdZ"

    return raw_key, raw_secret, raw_webhook

RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET = _resolve_razorpay_credentials()

FRONTEND_URL = config(
    "FRONTEND_URL",
    default=os.getenv(
        "FRONTEND_URL",
        f"https://{APP_DOMAIN}" if APP_DOMAIN else "http://localhost:3002"
    )
)

PUBLIC_PROFILE_BASE_URL = config(
    "PUBLIC_PROFILE_BASE_URL",
    default=FRONTEND_URL
).rstrip("/")


SPECTACULAR_SETTINGS = {
    "TITLE": "YHub Backend API",
    "DESCRIPTION": "Authentication API for YHub",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": "/api/",
}

# ── Object Storage (S3 / MinIO) ──────────────────────────────────
STORAGE_BACKEND = config("STORAGE_BACKEND", default="s3")
APP_NAME = config("APP_NAME", default="yhub")

AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="yhub")
AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="ap-south-1")
AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default="") or None
AWS_S3_ADDRESSING_STYLE = config("AWS_S3_ADDRESSING_STYLE", default="path")
AWS_DEFAULT_ACL = config("AWS_DEFAULT_ACL", default=None)
AWS_QUERYSTRING_AUTH = config("AWS_QUERYSTRING_AUTH", default=False, cast=bool)
AWS_S3_SIGNATURE_VERSION = config("AWS_S3_SIGNATURE_VERSION", default="s3v4")
AWS_S3_PUBLIC_ENDPOINT_URL = config("AWS_S3_PUBLIC_ENDPOINT_URL", default="") or None

if STORAGE_BACKEND == "s3":
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# ── AI Credits Configuration ─────────────────────────────────────
AI_CREDITS_ENABLED = config("AI_CREDITS_ENABLED", default=False, cast=bool)
AI_CREDITS_DEFAULT_RESERVATION = config("AI_CREDITS_DEFAULT_RESERVATION", default=4096, cast=int)
AI_CREDITS_MAX_RESERVATION = config("AI_CREDITS_MAX_RESERVATION", default=16384, cast=int)
AI_CREDITS_RESERVATION_EXPIRY_SECONDS = config("AI_CREDITS_RESERVATION_EXPIRY_SECONDS", default=300, cast=int)

# ── GitHub App / PAT Integration ────────────────────────────────
GITHUB_APP_NAME = config("GITHUB_APP_NAME", default=os.environ.get("GITHUB_APP_NAME", "yuvro-labs-app"))
GITHUB_APP_ID = config("GITHUB_APP_ID", default=os.environ.get("GITHUB_APP_ID", ""))
GITHUB_APP_PRIVATE_KEY = config("GITHUB_APP_PRIVATE_KEY", default=os.environ.get("GITHUB_APP_PRIVATE_KEY", ""))
GITHUB_SYSTEM_PAT = config("GITHUB_SYSTEM_PAT", default=os.environ.get("GITHUB_SYSTEM_PAT", ""))
# ── GitHub & LinkedIn OAuth ──────────────────────────────────────
GITHUB_CLIENT_ID = config("GITHUB_CLIENT_ID", default=os.environ.get("GITHUB_CLIENT_ID", ""))
GITHUB_CLIENT_SECRET = config("GITHUB_CLIENT_SECRET", default=os.environ.get("GITHUB_CLIENT_SECRET", ""))
GITHUB_REDIRECT_URI = config("GITHUB_REDIRECT_URI", default=os.environ.get("GITHUB_REDIRECT_URI", ""))

LINKEDIN_CLIENT_ID = config("LINKEDIN_CLIENT_ID", default=os.environ.get("LINKEDIN_CLIENT_ID", ""))
LINKEDIN_CLIENT_SECRET = config("LINKEDIN_CLIENT_SECRET", default=os.environ.get("LINKEDIN_CLIENT_SECRET", ""))
LINKEDIN_REDIRECT_URI = config("LINKEDIN_REDIRECT_URI", default=os.environ.get("LINKEDIN_REDIRECT_URI", ""))



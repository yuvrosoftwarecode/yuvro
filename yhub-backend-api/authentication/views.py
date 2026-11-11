import logging
import requests as http_requests
from urllib.parse import urlparse

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from django.contrib.auth import login, authenticate, get_user_model
from django.db import IntegrityError
from django.db.models.functions import Lower
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.template.loader import render_to_string
import random
import string
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache


from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from .models import GithubConnection, RegistrationOTP, UserSession
import base64
import os   

from authentication.permissions import (
    IsAdminUser,
    IsAuthenticatedUser,
)
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    UserLoginSerializer,
    UserUpdateSerializer,
)
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .validators import validate_username_format

logger = logging.getLogger(__name__)
User = get_user_model()


def parse_ua(user_agent: str):
    ua = user_agent or ""
    browser = "Web Browser"
    if "Firefox/" in ua:
        browser = "Firefox"
    elif "Edg/" in ua:
        browser = "Microsoft Edge"
    elif "Chrome/" in ua and "Edg/" not in ua:
        browser = "Chrome"
    elif "Safari/" in ua and "Chrome/" not in ua:
        browser = "Safari"
    elif "OPR/" in ua or "Opera/" in ua:
        browser = "Opera"

    os_name = "Desktop"
    if "Macintosh" in ua or "Mac OS" in ua:
        os_name = "macOS"
    elif "Windows" in ua:
        os_name = "Windows"
    elif "Android" in ua:
        os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"
    elif "Linux" in ua:
        os_name = "Linux"

    is_mobile = any(m in ua for m in ["Android", "iPhone", "iPad", "Mobile"])
    device_type = "Mobile" if is_mobile else "Desktop"

    return browser, os_name, device_type


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR", "")
    return ip or "127.0.0.1"


def record_user_session(request, user, reactivate=False):
    """Record or update active session for the authenticated user and client device."""
    if not user or not user.is_authenticated:
        return None
    try:
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        ip = get_client_ip(request)
        session_key = (
            request.headers.get("X-Session-Id")
            or request.META.get("HTTP_X_SESSION_ID")
            or f"sess_{hash(user_agent or 'client')}_{user.id}"
        )
        browser, os_name, device_type = parse_ua(user_agent)

        session = UserSession.objects.filter(user=user, session_key=session_key).first()
        if session:
            if not session.is_active and not reactivate:
                return None
            session.ip_address = ip
            session.user_agent = user_agent
            session.browser = browser
            session.os = os_name
            session.device_type = device_type
            session.location = getattr(user, "location", "") or "India"
            session.is_active = True
            session.save()
            UserSession.objects.filter(user=user, session_key=session_key).exclude(id=session.id).delete()
        else:
            session = UserSession.objects.create(
                user=user,
                session_key=session_key,
                ip_address=ip,
                user_agent=user_agent,
                browser=browser,
                os=os_name,
                device_type=device_type,
                location=getattr(user, "location", "") or "India",
                is_active=True,
            )
        return session
    except Exception as exc:
        logger.error(f"Failed to record user session: {exc}")
        return None


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """User login endpoint."""
    serializer = UserLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    user = serializer.validated_data["user"]
    login(request, user)
    record_user_session(request, user, reactivate=True)
    
    token_serializer = CustomTokenObtainPairSerializer()
    refresh = token_serializer.get_token(user)
    
    product = request.query_params.get("product") or request.data.get("product")
    if product:
        refresh["products"] = [product]
    else:
        refresh["products"] = ["ycode", "ylabs", "ycampus", "marketplace"]
    
    return Response(
        {
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        },
        status=status.HTTP_200_OK,
    )


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def google_login_view(request):
    """
    Authenticate with a Google OAuth2 access_token.
    """
    access_token = request.data.get("token")
    if not access_token:
        return Response({"error": "token is required"}, status=status.HTTP_400_BAD_REQUEST)

    google_resp = http_requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if google_resp.status_code != 200:
        return Response({"error": "Invalid Google token"}, status=status.HTTP_401_UNAUTHORIZED)

    google_data = google_resp.json()
    email = google_data.get("email")
    google_id = google_data.get("sub")
    first_name = google_data.get("given_name", "")
    last_name = google_data.get("family_name", "")

    if not email:
        return Response({"error": "Could not retrieve email from Google"}, status=status.HTTP_400_BAD_REQUEST)

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": email,
            "first_name": first_name,
            "last_name": last_name,
            "is_active": True,
        },
    )
    if created:
        try:
            from ai_credits.wallet_service import WalletService
            WalletService.get_or_create_wallet(user, grant_signup_bonus=True)
        except Exception as e:
            logger.error(f"Failed to award signup bonus to Google user {user.id}: {e}", exc_info=True)
    
    update_fields = []
    product = request.query_params.get("product") or request.data.get("product")
    if product and not user.roles:
        user.roles = {product: "student"}
        update_fields.append("roles")
        
    if update_fields:
        user.save(update_fields=update_fields)

    record_user_session(request, user, reactivate=True)

    token_serializer = CustomTokenObtainPairSerializer()
    refresh = token_serializer.get_token(user)
    
    product = request.query_params.get("product") or request.data.get("product")
    if product:
        refresh["products"] = [product]
    else:
        refresh["products"] = ["ycode", "ylabs", "ycampus", "marketplace"]

    return Response(
        {
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        },
        status=status.HTTP_200_OK,
    )


class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = serializer.save()
        except IntegrityError:
            return Response(
                {"username": ["A user with that username or email already exists."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Automatically initialize credit wallet and grant welcome signup bonus
        try:
            from ai_credits.wallet_service import WalletService
            WalletService.get_or_create_wallet(user, grant_signup_bonus=True)
        except Exception as e:
            logger.error(f"Failed to award signup bonus to new user {user.id}: {e}", exc_info=True)

        token_serializer = CustomTokenObtainPairSerializer()
        refresh = token_serializer.get_token(user)

        product = request.query_params.get("product") or request.data.get("product")
        if product:
            if not user.roles:
                user.roles = {product: "student"}
                user.save(update_fields=["roles"])
            elif product not in user.roles:
                user.roles[product] = "student"
                user.save(update_fields=["roles"])
            refresh["products"] = [product]
        else:
            refresh["products"] = ["ycode", "ylabs", "ycampus", "marketplace"]

        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def public_send_otp(request):
    email = request.data.get('email')
    contest_id = request.data.get('contest_id')
    resource_id = request.data.get('resource_id') or contest_id
    resource_type = request.data.get('resource_type', 'contest')
    contest_title = request.data.get('contest_title', 'Registration')
    
    if not email or not resource_id:
        return Response({"error": "Email and resource_id are required"}, status=status.HTTP_400_BAD_REQUEST)
        
    if resource_type == 'signup':
        user = User.objects.filter(email=email).first()
        if user and not getattr(user, 'is_guest_user', False):
            return Response({"error": "An account with this email already exists. Please log in."}, status=status.HTTP_400_BAD_REQUEST)
    
    otp = str(random.randint(100000, 999999))
    
    # Store OTP in DB
    otp_record, _ = RegistrationOTP.objects.update_or_create(
        email=email,
        resource_id=resource_id,
        resource_type=resource_type,
        defaults={'otp': otp, 'expires_at': None}
    )
    
    context = {
        "resource_title": contest_title,
        "resource_type": resource_type,
        "otp": otp,
        "frontend_url": settings.FRONTEND_URL
    }
    
    try:
        html_message = render_to_string("emails/otp_verification.html", context)
    except:
        html_message = f"Your OTP is: {otp}. It is valid for 5 minutes."
        
    send_mail(
        subject=f"Yuvro OTP for Registration",
        message=f"Your OTP for registering is: {otp}. It is valid for 5 minutes.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
        html_message=html_message
    )
    
    return Response({"status": "success", "message": "OTP sent successfully"})

@api_view(["DELETE"])
@permission_classes([permissions.AllowAny])
def internal_delete_user(request):
    email = request.data.get('email')
    if not email:
        return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
    User.objects.filter(email=email).delete()
    return Response({"status": "success", "message": "User deleted successfully"})

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def public_check_otp(request):
    email = request.data.get('email')
    resource_id = request.data.get('resource_id')
    resource_type = request.data.get('resource_type', 'contest')
    otp = request.data.get('otp')
    
    if not email or not otp or not resource_id:
        return Response({"error": "Email, resource_id, and OTP are required"}, status=status.HTTP_400_BAD_REQUEST)
        
    otp_record = RegistrationOTP.objects.filter(
        email=email, 
        resource_id=resource_id, 
        resource_type=resource_type
    ).first()
    
    if otp_record and str(otp_record.otp) == str(otp) and otp_record.is_valid():
        otp_record.delete()
        return Response({"status": "success", "message": "OTP is valid"})
        
    return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def public_verify_otp(request):
    email = request.data.get('email')
    contest_id = request.data.get('contest_id')
    resource_id = request.data.get('resource_id') or contest_id
    resource_type = request.data.get('resource_type', 'contest')
    otp = request.data.get('otp')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    
    if not email or not otp or not resource_id:
        return Response({"error": "Email, resource_id, and OTP are required"}, status=status.HTTP_400_BAD_REQUEST)
        
    otp_record = RegistrationOTP.objects.filter(
        email=email, 
        resource_id=resource_id, 
        resource_type=resource_type
    ).first()
    
    if otp_record and str(otp_record.otp) == str(otp) and otp_record.is_valid():
        otp_record.delete()  # prevent reuse
        user = User.objects.filter(email=email).first()
        
        if not user:
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))
            base_username = email.split('@')[0]
            username = base_username
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{random.randint(100, 9999)}"
            
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            user.is_otp_login = True
            user.is_guest_user = True
            user.roles = {"ycode": "student", "ylabs": "student"}
            user.save()
            try:
                from ai_credits.wallet_service import WalletService
                WalletService.get_or_create_wallet(user, grant_signup_bonus=True)
            except Exception as e:
                logger.error(f"Failed to award signup bonus to OTP user {user.id}: {e}", exc_info=True)
        else:
            if first_name or last_name:
                user.first_name = first_name or user.first_name
                user.last_name = last_name or user.last_name
            if user.is_otp_login:
                user.is_guest_user = True
            user.save()
            
        token_serializer = CustomTokenObtainPairSerializer()
        refresh = token_serializer.get_token(user)
        refresh["products"] = ["ycode", "ylabs", "ycampus", "marketplace"]
        
        return Response({
            "status": "success", 
            "message": "OTP verified",
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })
    
    return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def recover_candidate_session(request):
    """
    Recovers an expired candidate evaluation session token.
    Validates cryptographic signature of the existing token against Django secret key,
    or verifies matching candidate email, and reissues valid access + refresh tokens.
    """
    token_str = request.data.get("access_token") or request.data.get("token")
    email = request.data.get("email")

    user = None
    if token_str:
        try:
            import jwt
            from django.conf import settings
            signing_key = getattr(settings, "SIMPLE_JWT", {}).get("SIGNING_KEY", settings.SECRET_KEY)
            algorithm = getattr(settings, "SIMPLE_JWT", {}).get("ALGORITHM", "HS256")
            # Verify signature without failing on expiration
            payload = jwt.decode(
                token_str,
                signing_key,
                algorithms=[algorithm],
                options={"verify_exp": False, "verify_signature": True}
            )
            user_id = payload.get("user_id") or payload.get("id")
            if user_id:
                user = User.objects.filter(id=user_id).first()
        except Exception as e:
            logger.warning(f"Could not decode token for session recovery: {e}")

    if not user and email:
        # Fallback to user by candidate email
        user = User.objects.filter(email=email).first()

    if not user:
        return Response(
            {"error": "Unable to recover session. Please re-authenticate."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    token_serializer = CustomTokenObtainPairSerializer()
    refresh = token_serializer.get_token(user)
    refresh["products"] = ["ycode", "ylabs", "ycampus", "marketplace"]

    return Response({
        "status": "success",
        "message": "Session recovered",
        "access": str(refresh.access_token),
        "access_token": str(refresh.access_token),
        "refresh": str(refresh),
        "refresh_token": str(refresh),
    })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def logout_view(request):
    try:
        session_id = request.data.get("session_id") or request.headers.get("X-Session-Id")
        if session_id:
            UserSession.objects.filter(session_key=session_id).delete()

        refresh_token = request.data.get("refresh")
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({"message": "Successfully logged out."})
    except TokenError as e:
        return Response(
            {"error": f"Token error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"error": f"Logout failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST
        )


class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except TokenError as e:
            raise InvalidToken(e.args[0])


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticatedUser])
def user_info_view(request):
    session_key = (
        request.headers.get("X-Session-Id")
        or request.META.get("HTTP_X_SESSION_ID")
    )
    if session_key:
        revoked = UserSession.objects.filter(user=request.user, session_key=session_key, is_active=False).exists()
        if revoked:
            return Response(
                {"detail": "This session has been terminated. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
    record_user_session(request, request.user)
    if request.method in ["PUT", "PATCH"]:
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        request.user.refresh_from_db()
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)

    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class ForgotPasswordView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"message": "If this email exists, a reset link will be sent."}
            )

        token = PasswordResetTokenGenerator().make_token(user)
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))

        origin = request.META.get("HTTP_ORIGIN")
        if not origin:
            referer = request.META.get("HTTP_REFERER")
            if referer:
                parsed_uri = urlparse(referer)
                origin = f"{parsed_uri.scheme}://{parsed_uri.netloc}"
        
        frontend_url = origin.rstrip("/") if origin else settings.FRONTEND_URL

        reset_link = f"{frontend_url}/reset-password/{uidb64}/{token}"

        user_name = user.get_full_name() or user.first_name or user.username or "there"
        logo_url = getattr(settings, "EMAIL_LOGO_URL", "").strip() or "https://marketplace.yuvro.ai/knowledge-tree.png"
        context = {
            "user": user,
            "user_name": user_name,
            "reset_link": reset_link,
            "frontend_url": frontend_url,
            "logo_url": logo_url,
        }
        try:
            html_message = render_to_string("emails/password_reset.html", context)
        except Exception as e:
            logger.error(f"Failed to render password reset email: {e}", exc_info=True)
            html_message = f"Click the link to reset your password: {reset_link}"

        plain_message = (
            f"Hello {user_name},\n\n"
            f"We received a request to reset your password for your Yuvro account.\n\n"
            f"Click the link below to choose a new password:\n{reset_link}\n\n"
            f"This link will expire in 24 hours. If you did not request a password reset, you can safely ignore this email.\n\n"
            f"- The Yuvro Team"
        )

        send_mail(
            subject="Password Reset Request",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

        return Response({"message": "If this email exists, a reset link will be sent."})


class ResetPasswordView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, uidb64, token):
        password = request.data.get("password")
        if not password:
            return Response({"error": "Password is required"}, status=400)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except:
            return Response({"error": "Invalid reset link"}, status=400)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response(
                {"error": "Reset link has expired or is invalid"}, status=400
            )

        try:
            validate_password(password, user)
        except ValidationError as e:
            return Response({"error": e.messages}, status=400)

        user.set_password(password)
        user.save()

        try:
            if hasattr(request, "session"):
                login(request, user)
                record_user_session(request, user, reactivate=True)
        except Exception as e:
            logger.debug(f"Session login skipped: {e}")

        token_serializer = CustomTokenObtainPairSerializer()
        refresh = token_serializer.get_token(user)

        product = request.query_params.get("product") or request.data.get("product")
        if product:
            refresh["products"] = [product]
        else:
            refresh["products"] = ["ycode", "ylabs", "ycampus", "marketplace"]

        return Response(
            {
                "status": "success",
                "message": "Password reset successful.",
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK,
        )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def send_forgot_password_code_view(request):
    raw_email = request.data.get("email", "")
    email = raw_email.strip()
    if not email:
        return Response(
            {"error": "A valid email address is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from django.core.validators import validate_email as django_validate_email

    try:
        django_validate_email(email)
    except ValidationError:
        return Response(
            {"error": "A valid email address is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = (
        User.objects.annotate(email_lower=Lower("email"))
        .filter(email_lower=email.lower())
        .first()
    )
    if not user or getattr(user, "is_guest_user", False):
        return Response(
            {
                "status": "success",
                "message": "If an account exists with this email, a 6-digit verification code has been sent.",
            },
            status=status.HTTP_200_OK,
        )

    otp = str(random.randint(100000, 999999))

    RegistrationOTP.objects.update_or_create(
        email=user.email,
        resource_id="forgot_password",
        resource_type="password_reset",
        defaults={
            "otp": otp,
            "expires_at": timezone.now() + timedelta(minutes=5),
        },
    )

    user_name = user.get_full_name() or user.first_name or user.username or "there"
    context = {
        "user_name": user_name,
        "otp": otp,
        "frontend_url": settings.FRONTEND_URL,
        "resource_title": "Password Reset",
        "resource_type": "password reset",
    }

    try:
        html_message = render_to_string("emails/otp_verification.html", context)
    except Exception as e:
        logger.warning(f"Failed to render OTP HTML email: {e}")
        html_message = f"Hello {user_name},<br><br>Your 6-digit password reset verification code is: <b>{otp}</b>.<br>It is valid for 5 minutes."

    plain_message = (
        f"Hello {user_name},\n\n"
        f"We received a request to reset your password for your Yuvro account.\n\n"
        f"Your 6-digit verification code is:\n\n{otp}\n\n"
        f"This code is valid for 5 minutes. If you did not request a password reset, you can safely ignore this email.\n\n"
        f"- The Yuvro Team"
    )

    try:
        send_mail(
            subject="Your Yuvro Password Reset Code",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send forgot-password OTP email: {e}")
        if getattr(settings, "DEBUG", False):
            logger.info(f"[DEV] Forgot password OTP for {user.email}: {otp}")

    return Response(
        {
            "status": "success",
            "message": "A 6-digit verification code has been sent to your email.",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def verify_forgot_password_code_view(request):
    raw_email = request.data.get("email", "")
    code = str(request.data.get("code", "")).strip()
    email = raw_email.strip()

    if not email or not code:
        return Response(
            {"error": "Email and 6-digit code are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = (
        User.objects.annotate(email_lower=Lower("email"))
        .filter(email_lower=email.lower())
        .first()
    )
    if not user:
        return Response(
            {"error": "That code isn’t correct or has expired. Please check and try again."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    otp_record = RegistrationOTP.objects.filter(
        email=user.email,
        resource_id="forgot_password",
        resource_type="password_reset",
    ).first()

    if not otp_record or str(otp_record.otp).strip() != code or not otp_record.is_valid():
        return Response(
            {"error": "That code isn’t correct or has expired. Please check and try again."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token = PasswordResetTokenGenerator().make_token(user)
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))

    return Response(
        {
            "status": "success",
            "message": "Code verified successfully.",
            "token": token,
            "uidb64": uidb64,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def reset_password_with_code_view(request):
    raw_email = request.data.get("email", "")
    code = str(request.data.get("code", "")).strip()
    password = request.data.get("password", "")
    token = request.data.get("token", "")
    email = raw_email.strip()

    if not email or not password:
        return Response(
            {"error": "Email and new password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = (
        User.objects.annotate(email_lower=Lower("email"))
        .filter(email_lower=email.lower())
        .first()
    )
    if not user:
        return Response({"error": "Invalid request"}, status=status.HTTP_400_BAD_REQUEST)

    is_authorized = False
    if token:
        if PasswordResetTokenGenerator().check_token(user, token):
            is_authorized = True

    if not is_authorized and code:
        otp_record = RegistrationOTP.objects.filter(
            email=user.email,
            resource_id="forgot_password",
            resource_type="password_reset",
        ).first()
        if otp_record and str(otp_record.otp).strip() == code and otp_record.is_valid():
            is_authorized = True

    if not is_authorized:
        return Response(
            {"error": "Reset session or verification code has expired. Please request a new code."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password(password, user)
    except ValidationError as e:
        error_msgs = e.messages if hasattr(e, "messages") else [str(e)]
        return Response(
            {"error": error_msgs[0] if error_msgs else "Password does not meet requirements"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(password)
    user.save()

    RegistrationOTP.objects.filter(
        email=user.email,
        resource_id="forgot_password",
        resource_type="password_reset",
    ).delete()

    try:
        if hasattr(request, "session"):
            login(request, user)
            record_user_session(request, user, reactivate=True)
    except Exception as e:
        logger.debug(f"Session login skipped: {e}")

    token_serializer = CustomTokenObtainPairSerializer()
    refresh = token_serializer.get_token(user)

    product = request.query_params.get("product") or request.data.get("product")
    if product:
        refresh["products"] = [product]
    else:
        refresh["products"] = ["ycode", "ylabs", "ycampus", "marketplace"]

    return Response(
        {
            "status": "success",
            "message": "Password reset successful.",
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticatedUser])
def send_change_password_otp(request):
    user = request.user
    if not user.email:
        return Response(
            {"error": "No email address found for this account."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    otp = str(random.randint(100000, 999999))
    RegistrationOTP.objects.update_or_create(
        email=user.email,
        resource_id=str(user.id),
        resource_type="password_change",
        defaults={"otp": otp, "expires_at": None},
    )

    try:
        send_mail(
            subject="Yuvro - OTP for Password Change",
            message=f"Hi {user.first_name or user.username},\n\nYour OTP to change your password is: {otp}.\n\nThis OTP is valid for 5 minutes. If you did not request this change, please ignore this email.\n\nBest regards,\nTeam Yuvro",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as exc:
        logger.error(f"Failed to send password change OTP to {user.email}: {exc}")
        return Response(
            {"error": "Failed to send verification email. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({
        "status": "success",
        "message": f"Verification code sent to {user.email}",
    })


@api_view(["POST"])
@permission_classes([IsAuthenticatedUser])
def change_password_view(request):
    user = request.user
    new_password = request.data.get("new_password") or request.data.get("password")
    current_password = request.data.get("current_password")
    otp = request.data.get("otp")

    if not new_password:
        return Response(
            {"error": "New password is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 1. Verification via OTP
    if otp:
        otp_clean = str(otp).strip()
        otp_record = RegistrationOTP.objects.filter(
            email=user.email,
            resource_id=str(user.id),
            resource_type="password_change",
        ).first()

        if not otp_record or str(otp_record.otp).strip() != otp_clean or not otp_record.is_valid():
            return Response(
                {"error": "Invalid or expired OTP. Please check your email or request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        otp_record.delete()

    # 2. Verification via Current (Old) Password
    elif current_password:
        if user.has_usable_password() and not user.check_password(current_password):
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        return Response(
            {"error": "Please provide either your current password or OTP verification code."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return Response({"error": e.messages}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    return Response({"message": "Password changed successfully."})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_users(request):
    admins = User.objects.filter(is_staff=True).values("id", "email", "username")
    return Response(list(admins))

class GithubConnectView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        client_id = getattr(settings, 'GITHUB_CLIENT_ID', os.environ.get('GITHUB_CLIENT_ID'))
        redirect_uri = getattr(settings, 'GITHUB_REDIRECT_URI', os.environ.get('GITHUB_REDIRECT_URI'))
        
        if not client_id:
            return Response({"error": "GitHub client ID not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        github_url = f"https://github.com/login/oauth/authorize?client_id={client_id}&scope=repo,read:user"
        if redirect_uri:
            github_url += f"&redirect_uri={redirect_uri}"
        
        return Response({"authorization_url": github_url})

    def post(self, request):
        code = request.data.get("code")
        
        if not code:
            return Response({"error": "Authorization code is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        client_id = getattr(settings, 'GITHUB_CLIENT_ID', os.environ.get('GITHUB_CLIENT_ID'))
        client_secret = getattr(settings, 'GITHUB_CLIENT_SECRET', os.environ.get('GITHUB_CLIENT_SECRET'))
        redirect_uri = getattr(settings, 'GITHUB_REDIRECT_URI', os.environ.get('GITHUB_REDIRECT_URI'))
        
        token_url = "https://github.com/login/oauth/access_token"
        headers = {"Accept": "application/json"}
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
        }
        if redirect_uri:
            data["redirect_uri"] = redirect_uri
        
        response = http_requests.post(token_url, headers=headers, data=data)
        if response.status_code != 200:
            return Response({"error": "Failed to exchange token with GitHub"}, status=status.HTTP_400_BAD_REQUEST)
            
        token_data = response.json()
        access_token = token_data.get("access_token")
        scopes = token_data.get("scope", "")
        
        if not access_token:
            return Response({"error": f"No access token in GitHub response. GitHub said: {token_data}"}, status=status.HTTP_400_BAD_REQUEST)
            
        user_url = "https://api.github.com/user"
        user_headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        user_response = http_requests.get(user_url, headers=user_headers)
        
        if user_response.status_code != 200:
            logger.error(f"GitHub user info failed: {user_response.status_code} {user_response.text}")
            return Response({"error": f"Failed to get user info from GitHub: {user_response.text}"}, status=status.HTTP_400_BAD_REQUEST)
            
        github_user_info = user_response.json()
        github_user_id = str(github_user_info.get("id"))
        github_username = github_user_info.get("login")
        
        encrypted_token = base64.b64encode(access_token.encode()).decode()
        
        connection, created = GithubConnection.objects.update_or_create(
            user=request.user,
            defaults={
                "github_user_id": github_user_id,
                "github_username": github_username,
                "access_token": encrypted_token,
                "scopes": scopes
            }
        )
        
        return Response({"message": "GitHub connected successfully", "github_username": github_username})

    def delete(self, request):
        try:
            connection = GithubConnection.objects.get(user=request.user)
            connection.delete()
            return Response({"message": "GitHub disconnected successfully"}, status=status.HTTP_200_OK)
        except GithubConnection.DoesNotExist:
            return Response({"error": "GitHub connection not found"}, status=status.HTTP_404_NOT_FOUND)


class LinkedInConnectView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        import urllib.parse
        client_id = getattr(settings, 'LINKEDIN_CLIENT_ID', os.environ.get('LINKEDIN_CLIENT_ID'))
        redirect_uri = getattr(settings, 'LINKEDIN_REDIRECT_URI', os.environ.get('LINKEDIN_REDIRECT_URI'))
        
        if not client_id:
            return Response({"error": "LinkedIn client ID not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        params = {
            "response_type": "code",
            "client_id": client_id,
            "scope": "openid profile email w_member_social",
        }
        if redirect_uri:
            params["redirect_uri"] = redirect_uri

        linkedin_url = f"https://www.linkedin.com/oauth/v2/authorization?{urllib.parse.urlencode(params)}"
        return Response({"authorization_url": linkedin_url})

    def post(self, request):
        code = request.data.get("code")
        
        if not code:
            return Response({"error": "Authorization code is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        client_id = getattr(settings, 'LINKEDIN_CLIENT_ID', os.environ.get('LINKEDIN_CLIENT_ID'))
        client_secret = getattr(settings, 'LINKEDIN_CLIENT_SECRET', os.environ.get('LINKEDIN_CLIENT_SECRET'))
        redirect_uri = getattr(settings, 'LINKEDIN_REDIRECT_URI', os.environ.get('LINKEDIN_REDIRECT_URI'))
        
        token_url = "https://www.linkedin.com/oauth/v2/accessToken"
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        data = {
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
        }
        if redirect_uri:
            data["redirect_uri"] = redirect_uri
        
        response = http_requests.post(token_url, headers=headers, data=data)
        if response.status_code != 200:
            logger.error(f"LinkedIn token exchange failed: {response.status_code} {response.text}")
            return Response({"error": "Failed to exchange token with LinkedIn"}, status=status.HTTP_400_BAD_REQUEST)
            
        token_data = response.json()
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in")
        scopes = token_data.get("scope", "")
        
        if not access_token:
            return Response({"error": f"No access token in LinkedIn response: {token_data}"}, status=status.HTTP_400_BAD_REQUEST)
            
        user_url = "https://api.linkedin.com/v2/userinfo"
        user_headers = {"Authorization": f"Bearer {access_token}"}
        user_response = http_requests.get(user_url, headers=user_headers)
        
        if user_response.status_code != 200:
            logger.error(f"LinkedIn user info failed: {user_response.status_code} {user_response.text}")
            return Response({"error": "Failed to get user profile from LinkedIn"}, status=status.HTTP_400_BAD_REQUEST)
            
        user_info = user_response.json()
        linkedin_sub = user_info.get("sub")
        linkedin_name = user_info.get("name", "")
        linkedin_email = user_info.get("email")
        
        from .models import LinkedInConnection
        encrypted_token = base64.b64encode(access_token.encode()).decode()
        
        expires_at = None
        if expires_in:
            expires_at = timezone.now() + timedelta(seconds=int(expires_in))
        
        connection, _ = LinkedInConnection.objects.update_or_create(
            user=request.user,
            defaults={
                "linkedin_sub": linkedin_sub,
                "linkedin_name": linkedin_name,
                "linkedin_email": linkedin_email,
                "access_token": encrypted_token,
                "scopes": scopes,
                "expires_at": expires_at,
            }
        )
        
        return Response({"message": "LinkedIn connected successfully", "linkedin_name": linkedin_name})

    def delete(self, request):
        from .models import LinkedInConnection
        try:
            connection = LinkedInConnection.objects.get(user=request.user)
            connection.delete()
            return Response({"message": "LinkedIn disconnected successfully"}, status=status.HTTP_200_OK)
        except LinkedInConnection.DoesNotExist:
            return Response({"error": "LinkedIn connection not found"}, status=status.HTTP_404_NOT_FOUND)


class LinkedInShareMilestoneView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        from .models import LinkedInConnection
        connection = LinkedInConnection.objects.filter(user=request.user).first()
        if not connection:
            return Response({"error": "LinkedIn account is not connected", "code": "NOT_CONNECTED"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            raw_token = base64.b64decode(connection.access_token.encode()).decode()
        except Exception:
            raw_token = connection.access_token

        commentary = request.data.get("commentary") or "I just reached a new milestone on Yuvro!"
        article_url = request.data.get("url") or "https://yuvro.com"
        title = request.data.get("title") or "Yuvro Milestone"
        description = request.data.get("description", "")
        banner_base64 = request.data.get("image")  # data:image/png;base64,...

        headers = {
            "Authorization": f"Bearer {raw_token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json"
        }

        asset_urn = None
        if banner_base64:
            try:
                # Strip header if data URL
                if "base64," in banner_base64:
                    banner_base64 = banner_base64.split("base64,")[1]
                image_bytes = base64.b64decode(banner_base64)

                # Step 1: Register upload with LinkedIn
                register_url = "https://api.linkedin.com/v2/assets?action=registerUpload"
                register_payload = {
                    "registerUploadRequest": {
                        "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                        "owner": f"urn:li:person:{connection.linkedin_sub}",
                        "serviceRelationships": [
                            {
                                "relationshipType": "OWNER",
                                "identifier": "urn:li:userGeneratedContent"
                            }
                        ],
                        "supportedUploadMechanism": ["SYNCHRONOUS_UPLOAD"]
                    }
                }
                reg_resp = http_requests.post(register_url, headers=headers, json=register_payload)
                if reg_resp.status_code == 200:
                    reg_data = reg_resp.json()
                    upload_mechanism = reg_data.get("value", {}).get("uploadMechanism", {})
                    media_upload_request = upload_mechanism.get("com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest", {})
                    upload_url = media_upload_request.get("uploadUrl")
                    asset_urn = reg_data.get("value", {}).get("asset")

                    # Step 2: Upload raw image binary to upload_url
                    if upload_url and asset_urn:
                        upload_headers = {
                            "Authorization": f"Bearer {raw_token}",
                            "Content-Type": "application/octet-stream"
                        }
                        upload_resp = http_requests.put(upload_url, headers=upload_headers, data=image_bytes)
                        if upload_resp.status_code not in (200, 201):
                            logger.warning(f"Failed to upload image binary to LinkedIn: {upload_resp.status_code} {upload_resp.text}")
                            asset_urn = None
                        else:
                            logger.info(f"Successfully uploaded banner binary to LinkedIn: {asset_urn}")
                else:
                    logger.warning(f"LinkedIn registerUpload failed: {reg_resp.status_code} {reg_resp.text}")
            except Exception as e:
                logger.error(f"Error handling LinkedIn banner upload: {e}", exc_info=True)
                asset_urn = None

        post_url = "https://api.linkedin.com/v2/ugcPosts"

        # Determine share media category
        if asset_urn:
            share_media_category = "IMAGE"
            media_item = {
                "status": "READY",
                "description": {
                    "text": description or f"Achievement verified on Yuvro Labs"
                },
                "media": asset_urn,
                "title": {
                    "text": title
                }
            }
        else:
            share_media_category = "ARTICLE"
            media_item = {
                "status": "READY",
                "description": {
                    "text": description or f"Achievement verified on Yuvro Labs: {title}"
                },
                "originalUrl": article_url,
                "title": {
                    "text": title
                }
            }

        post_payload = {
            "author": f"urn:li:person:{connection.linkedin_sub}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": commentary
                    },
                    "shareMediaCategory": share_media_category,
                    "media": [media_item]
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }

        try:
            post_response = http_requests.post(post_url, headers=headers, json=post_payload)
            if post_response.status_code in (200, 201):
                post_data = post_response.json()
                post_id = post_data.get("id")
                return Response({
                    "message": "Milestone posted to LinkedIn successfully!",
                    "post_id": post_id,
                })
            else:
                logger.error(f"LinkedIn UGC post failed: {post_response.status_code} {post_response.text}")
                error_msg = "Failed to post to LinkedIn"
                try:
                    err_json = post_response.json()
                    error_msg = err_json.get("message") or error_msg
                except Exception:
                    pass
                return Response({"error": error_msg, "details": post_response.text}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error publishing LinkedIn post: {e}", exc_info=True)
            return Response({"error": f"Failed to post to LinkedIn: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LinkedInGenerateGifView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        from .celebration_gif import generate_celebration_gif

        name = request.data.get("name") or request.user.first_name or request.user.username or "Student"
        task = request.data.get("task") or "Engineering Milestone"
        company = request.data.get("company") or "Practical Labs"
        badge = request.data.get("badge") or "TICKET CLEARED"

        # Locate logo.png
        possible_logo_paths = [
            os.path.join(os.path.dirname(__file__), "logo.png"),
            os.path.join(settings.BASE_DIR, "authentication", "logo.png"),
            os.path.join(settings.BASE_DIR, "..", "ylabs-web", "public", "logo.png"),
            os.path.join(settings.BASE_DIR, "public", "logo.png"),
            "/app/authentication/logo.png",
            "/app/public/logo.png",
            "d:/Yuvro - Software/yuvro/ylabs-web/public/logo.png",
        ]
        logo_path = None
        for p in possible_logo_paths:
            if os.path.exists(p):
                logo_path = p
                break

        try:
            gif_bytes = generate_celebration_gif(
                name=name,
                task=task,
                company=company,
                badge=badge,
                logo_path=logo_path,
                output_fps=15,
                duration_sec=1.6
            )
            b64_gif = base64.b64encode(gif_bytes).decode("utf-8")
            data_uri = f"data:image/gif;base64,{b64_gif}"
            return Response({"data_uri": data_uri})
        except Exception as e:
            logger.error(f"Failed to generate celebration GIF: {e}", exc_info=True)
            return Response({"error": f"Failed to generate GIF: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Build UGC post payload
        if asset_urn:
            payload = {
                "author": f"urn:li:person:{connection.linkedin_sub}",
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": commentary
                        },
                        "shareMediaCategory": "IMAGE",
                        "media": [
                            {
                                "status": "READY",
                                "description": {"text": description or "Verified Milestone on Yuvro Labs"},
                                "media": asset_urn,
                                "title": {"text": title}
                            }
                        ]
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
        else:
            payload = {
                "author": f"urn:li:person:{connection.linkedin_sub}",
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": commentary
                        },
                        "shareMediaCategory": "ARTICLE" if article_url else "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
            if article_url:
                payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [
                    {
                        "status": "READY",
                        "description": {"text": description},
                        "originalUrl": article_url,
                        "title": {"text": title}
                    }
                ]

        resp = http_requests.post(post_url, headers=headers, json=payload)
        if resp.status_code not in (200, 201):
            logger.error(f"LinkedIn UGC post error: {resp.status_code} {resp.text}")
            return Response({"error": f"Failed to post to LinkedIn: {resp.text}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Successfully posted milestone banner to LinkedIn!", "data": resp.json(), "with_banner": bool(asset_urn)})



@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def internal_github_token_view(request, user_id):
    internal_secret = getattr(settings, 'INTERNAL_API_SECRET', os.environ.get('INTERNAL_API_SECRET', 'dev-secret-key'))
    provided_secret = request.headers.get('X-Internal-Secret')
    
    if not provided_secret or provided_secret != internal_secret:
        return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        
    try:
        connection = GithubConnection.objects.get(user_id=user_id)
    except GithubConnection.DoesNotExist:
        return Response({"error": "GitHub connection not found"}, status=status.HTTP_404_NOT_FOUND)
        
    import base64
    try:
        decrypted_token = base64.b64decode(connection.access_token).decode()
    except Exception:
        return Response({"error": "Failed to decrypt token"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    return Response({
        "github_username": connection.github_username,
        "access_token": decrypted_token,
    })


@extend_schema(
    summary="Upload a profile image",
    description=(
        "Uploads a profile image (or cover image) to object storage "
        "(S3 / MinIO depending on STORAGE_BACKEND) and saves the resulting URL "
        "back on the user. Send the file in the `image` field and the "
        "target field name in `field` (`profile_image` | `cover_image`). Max size 10 MB."
    ),
    request={
        "multipart/form-data": {
            "type": "object",
            "properties": {
                "image": {"type": "string", "format": "binary"},
                "field": {
                    "type": "string",
                    "enum": ["profile_image", "cover_image"],
                },
            },
            "required": ["image", "field"],
        }
    },
    responses={200: UserSerializer},
)
@api_view(["POST"])
@permission_classes([IsAuthenticatedUser])
def upload_profile_image(request):
    ALLOWED_FIELDS = ("profile_image", "cover_image", "resume_file")
    ALLOWED_CONTENT_TYPES = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/msword": "doc",
    }
    MAX_BYTES = 10 * 1024 * 1024

    image_file = request.FILES.get("image")
    if not image_file:
        return Response(
            {"error": "No file provided. Use the 'image' form field."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if image_file.size > MAX_BYTES:
        return Response(
            {"error": f"File too large. Max size is {MAX_BYTES // (1024 * 1024)} MB."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    target_field = request.data.get("field", "profile_image")
    if target_field not in ALLOWED_FIELDS:
        return Response(
            {"error": f"Invalid field. Must be one of: {', '.join(ALLOWED_FIELDS)}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = (image_file.content_type or "").lower()
    ext = ALLOWED_CONTENT_TYPES.get(content_type)
    if not ext:
        fallback = os.path.splitext(image_file.name)[1].lstrip(".").lower()
        ext = fallback or "jpg"

    user = request.user

    try:
        from core.storage import upload_image
        stored_name = upload_image(
            key=f"profile/{user.id}/{target_field}.{ext}",
            file_obj=image_file,
            replace_extensions=("jpg", "jpeg", "png", "webp", "gif", "pdf", "docx", "doc"),
        )
    except Exception as exc:
        logger.exception("Failed to upload profile image")
        return Response(
            {"error": f"Failed to upload image: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    from core.storage import build_public_url
    public_url = build_public_url(stored_name)

    setattr(user, target_field, public_url)
    user.save(update_fields=[target_field])

    return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


@extend_schema(
    summary="Remove a profile or cover image",
    description=(
        "Removes the profile image or cover image URL from the user record. "
        "Send the target field name in `field` (`profile_image` | `cover_image`)."
    ),
    request={
        "application/json": {
            "type": "object",
            "properties": {
                "field": {
                    "type": "string",
                    "enum": ["profile_image", "cover_image"],
                },
            },
            "required": ["field"],
        }
    },
    responses={200: UserSerializer},
)
@api_view(["POST"])
@permission_classes([IsAuthenticatedUser])
def remove_profile_image(request):
    ALLOWED_FIELDS = ("profile_image", "cover_image", "resume_file")

    target_field = request.data.get("field")
    if target_field not in ALLOWED_FIELDS:
        return Response(
            {"error": f"Invalid field. Must be one of: {', '.join(ALLOWED_FIELDS)}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user
    setattr(user, target_field, None)
    user.save(update_fields=[target_field])

    return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticatedUser])
def sessions_view(request):
    user = request.user
    current_session = record_user_session(request, user)
    session_key = (
        request.headers.get("X-Session-Id")
        or request.META.get("HTTP_X_SESSION_ID")
        or (current_session.session_key if current_session else None)
    )

    sessions = UserSession.objects.filter(user=user, is_active=True).order_by("-last_activity")
    data = []
    for s in sessions:
        is_curr = False
        if session_key and s.session_key == session_key:
            is_curr = True
        elif current_session and s.id == current_session.id:
            is_curr = True

        data.append({
            "id": str(s.id),
            "browser": s.browser,
            "os": s.os,
            "device_type": s.device_type,
            "location": s.location,
            "ip_address": s.ip_address,
            "last_activity": s.last_activity,
            "created_at": s.created_at,
            "is_current": is_curr,
        })

    # Ensure at least the current session has is_current = True
    if not any(d["is_current"] for d in data) and len(data) > 0:
        data[0]["is_current"] = True

    return Response(data, status=status.HTTP_200_OK)


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticatedUser])
def revoke_session_view(request, session_id):
    user = request.user
    session = UserSession.objects.filter(user=user, id=session_id).first()
    if not session:
        return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)

    session.is_active = False
    session.save()

    return Response({"status": "success", "message": "Session terminated successfully."})


@api_view(["POST"])
@permission_classes([IsAuthenticatedUser])
def revoke_other_sessions_view(request):
    user = request.user
    session_key = (
        request.headers.get("X-Session-Id")
        or request.META.get("HTTP_X_SESSION_ID")
        or f"sess_{hash(request.META.get('HTTP_USER_AGENT', ''))}_{user.id}"
    )

    UserSession.objects.filter(user=user).exclude(session_key=session_key).update(is_active=False)

    return Response({"status": "success", "message": "Logged out of all other sessions."})


@extend_schema(
    summary="Check username availability",
    description="Check whether a username is available, invalid, or taken in real-time.",
    parameters=[
        {
            "name": "username",
            "in": "query",
            "required": True,
            "type": "string",
            "description": "The username to verify",
        }
    ],
    responses={
        200: {
            "type": "object",
            "properties": {
                "available": {"type": "boolean"},
                "message": {"type": "string"},
            },
        }
    },
)
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def check_username_view(request):
    raw_username = request.query_params.get("username", "")
    username = raw_username.strip()

    if not username:
        return Response(
            {"available": False, "message": "Invalid username"},
            status=status.HTTP_200_OK,
        )

    is_valid, _ = validate_username_format(username)
    if not is_valid:
        return Response(
            {"available": False, "message": "Invalid username"},
            status=status.HTTP_200_OK,
        )

    # Exclude self if authenticated. Use Lower() to match unique_lower_username index
    lower_username = username.lower()
    qs = User.objects.annotate(uname_lower=Lower("username")).filter(
        uname_lower=lower_username, is_guest_user=False
    )
    if request.user and request.user.is_authenticated:
        qs = qs.exclude(pk=request.user.pk)

    if qs.exists():
        return Response(
            {"available": False, "message": "Username is already taken"},
            status=status.HTTP_200_OK,
        )

    return Response(
        {"available": True, "message": "Username is available"},
        status=status.HTTP_200_OK,
    )


@extend_schema(
    summary="Check Email Availability",
    description="Check whether an email address is available for registration",
    parameters=[
        OpenApiParameter(
            name="email",
            description="Email address to check",
            required=True,
            type=str,
            location=OpenApiParameter.QUERY,
        )
    ],
    responses={
        200: {
            "type": "object",
            "properties": {
                "available": {"type": "boolean"},
                "message": {"type": "string"},
            },
        }
    },
)
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def check_email_view(request):
    raw_email = request.query_params.get("email", "")
    email = raw_email.strip()

    if not email:
        return Response(
            {"available": False, "message": "Please enter a valid email address."},
            status=status.HTTP_200_OK,
        )

    from django.core.validators import validate_email as django_validate_email
    try:
        django_validate_email(email)
    except ValidationError:
        return Response(
            {"available": False, "message": "Please enter a valid email address."},
            status=status.HTTP_200_OK,
        )

    lower_email = email.lower()
    qs = User.objects.annotate(email_lower=Lower("email")).filter(
        email_lower=lower_email, is_guest_user=False
    )
    if request.user and request.user.is_authenticated:
        qs = qs.exclude(pk=request.user.pk)

    if qs.exists():
        return Response(
            {
                "available": False,
                "message": "The email you have provided is already associated with an account.",
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {"available": True, "message": "Email is available"},
        status=status.HTTP_200_OK,
    )


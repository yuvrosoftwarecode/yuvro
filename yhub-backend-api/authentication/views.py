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
from drf_spectacular.utils import extend_schema

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
        user = serializer.save()

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

        return Response({"message": "Password reset successful. You may now login."})


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

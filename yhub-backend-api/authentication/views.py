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

from authentication.permissions import (
    IsAdminUser,
    IsAuthenticatedUser,
)
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    UserLoginSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """User login endpoint."""
    serializer = UserLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    user = serializer.validated_data["user"]
    login(request, user)
    
    token_serializer = CustomTokenObtainPairSerializer()
    refresh = token_serializer.get_token(user)
    
    product = request.query_params.get("product") or request.data.get("product")
    if product:
        refresh["products"] = [product]
    else:
        refresh["products"] = ["ycode", "ylabs", "ycampus"]
    
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
            "google_id": google_id,
        },
    )
    
    if not user.google_id:
        user.google_id = google_id
        update_fields = ["google_id"]
        product = request.query_params.get("product") or request.data.get("product")
        if product and not user.roles:
            user.roles = {product: "student"}
            update_fields.append("roles")
        user.save(update_fields=update_fields)

    token_serializer = CustomTokenObtainPairSerializer()
    refresh = token_serializer.get_token(user)
    
    product = request.query_params.get("product") or request.data.get("product")
    if product:
        refresh["products"] = [product]
    else:
        refresh["products"] = ["ycode", "ylabs", "ycampus"]

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

        token_serializer = CustomTokenObtainPairSerializer()
        refresh = token_serializer.get_token(user)

        product = request.query_params.get("product") or request.data.get("product")
        if product:
            user.roles = {product: "student"}
            user.save(update_fields=["roles"])
            refresh["products"] = [product]
        else:
            refresh["products"] = ["ycode", "ylabs", "ycampus"]

        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticatedUser])
def logout_view(request):
    try:
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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


@api_view(["GET"])
@permission_classes([IsAuthenticatedUser])
def user_info_view(request):
    """Get current user information."""
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

        from django.template.loader import render_to_string
        context = {
            "user": user,
            "reset_link": reset_link,
            "frontend_url": frontend_url,
        }
        try:
            html_message = render_to_string("emails/password_reset.html", context)
        except:
            html_message = f"Click the link to reset your password: {reset_link}"

        plain_message = f"Click the link to reset your password: {reset_link}"

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
def change_password_view(request):
    """Allow logged-in users to change their password."""
    password = request.data.get("password")
    if not password:
        return Response({"error": "Password is required"}, status=status.HTTP_400_BAD_REQUEST)

    first_name = request.data.get("first_name")
    last_name = request.data.get("last_name")

    user = request.user

    try:
        validate_password(password, user)
    except ValidationError as e:
        return Response({"error": e.messages}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(password)
    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name

    user.save()

    return Response({"message": "Password changed successfully."})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_users(request):
    admins = User.objects.filter(is_staff=True).values("id", "email", "username")
    return Response(list(admins))

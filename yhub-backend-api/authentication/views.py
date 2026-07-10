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
        },
    )
    
    update_fields = []
    product = request.query_params.get("product") or request.data.get("product")
    if product and not user.roles:
        user.roles = {product: "student"}
        update_fields.append("roles")
        
    if update_fields:
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


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticatedUser])
def user_info_view(request):
    if request.method == "GET":
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    else:
        from .serializers import UserUpdateSerializer
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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

import os
from drf_spectacular.utils import extend_schema

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
    """
    POST /api/auth/profile/upload-image/

    multipart/form-data:
        image:    file (required, ≤10 MB)
        field:    "profile_image" | "cover_image" (default: profile_image)
    """
    ALLOWED_FIELDS = ("profile_image", "cover_image")
    ALLOWED_CONTENT_TYPES = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
    }
    MAX_BYTES = 10 * 1024 * 1024  # 10 MB

    image_file = request.FILES.get("image")
    if not image_file:
        return Response(
            {"error": "No image file provided. Use the 'image' form field."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if image_file.size > MAX_BYTES:
        return Response(
            {"error": f"Image too large. Max size is {MAX_BYTES // (1024 * 1024)} MB."},
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
            replace_extensions=("jpg", "jpeg", "png", "webp", "gif"),
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
    """
    POST /api/auth/profile/remove-image/

    JSON body:
        field:    "profile_image" | "cover_image" (required)
    """
    ALLOWED_FIELDS = ("profile_image", "cover_image")

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

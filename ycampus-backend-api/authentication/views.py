from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import login
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.openapi import OpenApiTypes
import requests as http_requests
from .models import (
    User,
    Profile,
)
from job.models import (
    SocialLinks,
    Skill,
    Experience,
    Project,
    Education,
    Certification,
)
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    UserUpdateSerializer,
    UserLoginSerializer,
)
from job.serializers import (
    ProfileSerializer,
    SocialLinksSerializer,
    SkillSerializer,
    ExperienceSerializer,
    ProjectSerializer,
    EducationSerializer,
    CertificationSerializer,
)

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
    IsContentManagerOrAdmin,
    CanManageUsers,
)
from django.contrib.auth import get_user_model
from urllib.parse import urlparse


User = get_user_model()


@extend_schema(
    summary="User Login",
    description="Login with email and password to get JWT tokens.",
    request=UserLoginSerializer,
    examples=[
        OpenApiExample(
            "Login Example",
            value={"email": "user@example.com", "password": "your_password"},
        )
    ],
)
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

    return Response(
        {
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }
    )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def google_login_view(request):
    """
    Authenticate with a Google OAuth2 access_token obtained from the frontend.
    Fetches the user's profile from Google, creates or retrieves the local user,
    and returns JWT tokens.
    """
    access_token = request.data.get("token")
    if not access_token:
        return Response({"error": "token is required"}, status=status.HTTP_400_BAD_REQUEST)

    # Fetch user info from Google
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

    # Get or create user by email
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": email,
            "first_name": first_name,
            "last_name": last_name,
            "is_active": True,
        },
    )

    # Never touch an existing password — user may have registered with email/password
    # and is now signing in with Google on the same account.

    # Store google_id on Profile (that's where the field lives)
    profile, _ = Profile.objects.get_or_create(user=user)
    if not profile.google_id:
        profile.google_id = google_id
        profile.save(update_fields=["google_id"])

    # Generate JWT tokens
    token_serializer = CustomTokenObtainPairSerializer()
    refresh = token_serializer.get_token(user)

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

    @extend_schema(
        summary="Register New User",
        description="Create a new user account and receive JWT tokens.",
        examples=[
            OpenApiExample(
                "Registration Example",
                value={
                    "username": "newuser",
                    "email": "newuser@example.com",
                    "password": "secure_password123",
                    "first_name": "John",
                    "last_name": "Doe",
                },
            )
        ],
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token_serializer = CustomTokenObtainPairSerializer()
        refresh = token_serializer.get_token(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    summary="User Logout",
    description="Logout user by blacklisting the refresh token.",
    request={
        "type": "object",
        "properties": {
            "refresh": {"type": "string", "description": "Refresh token to blacklist"}
        },
        "required": ["refresh"],
    },
    examples=[
        OpenApiExample(
            "Logout Example",
            value={"refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."},
        )
    ],
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


@extend_schema(
    summary="Get Current User Info",
    description="Get information about the currently authenticated user.",
    responses=UserSerializer,
)
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

        # Get dynamic frontend URL from request origin/referer to support HTTP and HTTPS
        origin = request.META.get("HTTP_ORIGIN")
        if not origin:
            referer = request.META.get("HTTP_REFERER")
            if referer:
                parsed_uri = urlparse(referer)
                origin = f"{parsed_uri.scheme}://{parsed_uri.netloc}"
        
        frontend_url = origin.rstrip("/") if origin else settings.FRONTEND_URL

        reset_link = f"{frontend_url}/reset-password/{uidb64}/{token}"

        send_mail(
            subject="Password Reset Request",
            message=f"Click the link to reset your password: {reset_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
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


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_users(request):
    admins = User.objects.filter(is_staff=True).values("id", "email", "username")
    return Response(list(admins))


from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, filters
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q

try:
    from django_filters.rest_framework import DjangoFilterBackend
except ImportError:
    DjangoFilterBackend = None

User = get_user_model()


class UsersPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class UsersListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    pagination_class = UsersPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter] + (
        [DjangoFilterBackend] if DjangoFilterBackend else []
    )
    filterset_fields = ["role", "is_active"]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["date_joined", "last_login", "username", "email"]
    ordering = ["-date_joined"]

    def get_permissions(self):
        return [CanManageUsers()]

    def get_queryset(self):
        queryset = super().get_queryset()

        role = self.request.query_params.get("role", None)
        if role:
            queryset = queryset.filter(role=role)

        is_active = self.request.query_params.get("is_active", None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        user = self.request.user
        college_id = self.request.query_params.get("college_id", None)

        # Enforce college filtering for non-platform admins
        if not user.is_admin():
            user_college = user.college
            if user_college:
                college_id = str(user_college.id)

        if college_id:
            queryset = queryset.filter(
                Q(student_profile__college_id=college_id) |
                Q(faculty_profile__college_id=college_id) |
                Q(hod_profile__college_id=college_id) |
                Q(principal_profile__college_id=college_id) |
                Q(college_admin_profile__college_id=college_id) |
                Q(placement_officer_profile__college_id=college_id)
            )

        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        return queryset.distinct()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [CanManageUsers]


class UserToggleStatusView(APIView):
    permission_classes = [CanManageUsers]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_active = not user.is_active
            user.save()
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )


class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_object(self):
        return self.request.user


class ProfileDetailView(generics.RetrieveUpdateAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)

        if not hasattr(profile, "links"):
            SocialLinks.objects.create(profile=profile)

        return profile

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_profile = serializer.save()

        return Response(ProfileSerializer(updated_profile).data)


import os
import logging

logger = logging.getLogger(__name__)


@extend_schema(
    summary="Upload a profile image",
    description=(
        "Uploads a profile image (or cover image / id card image) to object storage "
        "(S3 / MinIO depending on STORAGE_BACKEND) and saves the resulting URL "
        "back on the user's profile. Send the file in the `image` field and the "
        "target field name in `field` (`profile_image` | `cover_image` | "
        "`id_card_image`). Max size 10 MB."
    ),
    request={
        "multipart/form-data": {
            "type": "object",
            "properties": {
                "image": {"type": "string", "format": "binary"},
                "field": {
                    "type": "string",
                    "enum": ["profile_image", "cover_image", "id_card_image"],
                },
            },
            "required": ["image", "field"],
        }
    },
    responses={200: ProfileSerializer},
)
@api_view(["POST"])
@permission_classes([IsAuthenticatedUser])
def upload_profile_image(request):
    """
    POST /api/auth/profile/upload-image/

    multipart/form-data:
        image:    file (required, ≤10 MB)
        field:    "profile_image" | "cover_image" | "id_card_image" (default: profile_image)
    """
    ALLOWED_FIELDS = ("profile_image", "cover_image", "id_card_image")
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

    profile, _ = Profile.objects.get_or_create(user=request.user)

    try:
        from core.storage import upload_image

        stored_name = upload_image(
            key=f"profile/{request.user.id}/{target_field}.{ext}",
            file_obj=image_file,
            replace_extensions=("jpg", "jpeg", "png", "webp", "gif"),
        )
    except Exception as exc:
        logger.exception("Failed to upload profile image")
        return Response(
            {"error": f"Failed to upload image: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    setattr(profile, target_field, stored_name)
    profile.save(update_fields=[target_field, "updated_at"])

    return Response(ProfileSerializer(profile).data, status=status.HTTP_200_OK)

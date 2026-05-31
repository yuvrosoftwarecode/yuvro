import requests as http_requests
from rest_framework import status, generics, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import login, get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from .models import Profile
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    UserUpdateSerializer,
    UserLoginSerializer,
    ProfileSerializer,
)
from .permissions import IsAdminUser, IsAuthenticatedUser, IsOwnerOrAdmin

User = get_user_model()

try:
    from django_filters.rest_framework import DjangoFilterBackend
except ImportError:
    DjangoFilterBackend = None


# ── Login ──────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """Email + password login."""
    serializer = UserLoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = serializer.validated_data["user"]
    login(request, user)

    refresh = CustomTokenObtainPairSerializer.get_token(user)
    return Response({
        "user": UserSerializer(user).data,
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    })


# ── Google OAuth ───────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def google_login_view(request):
    """Google OAuth2 login — accepts access_token from frontend."""
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

    data = google_resp.json()
    email = data.get("email")
    google_id = data.get("sub")
    first_name = data.get("given_name", "")
    last_name = data.get("family_name", "")

    if not email:
        return Response({"error": "Could not retrieve email from Google"}, status=status.HTTP_400_BAD_REQUEST)

    user, _ = User.objects.get_or_create(
        email=email,
        defaults={
            "username": email,
            "first_name": first_name,
            "last_name": last_name,
            "is_active": True,
        },
    )

    # Store google_id on Profile — never overwrite existing password
    profile, _ = Profile.objects.get_or_create(user=user)
    if not profile.google_id:
        profile.google_id = google_id
        profile.save(update_fields=["google_id"])

    refresh = CustomTokenObtainPairSerializer.get_token(user)
    return Response({
        "user": UserSerializer(user).data,
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }, status=status.HTTP_200_OK)


# ── Register ───────────────────────────────────────────────────────────────

class UserRegistrationView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = CustomTokenObtainPairSerializer.get_token(user)
        return Response({
            "user": UserSerializer(user).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


# ── Logout ─────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticatedUser])
def logout_view(request):
    try:
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        RefreshToken(refresh_token).blacklist()
        return Response({"message": "Successfully logged out."})
    except TokenError as e:
        return Response({"error": f"Token error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": f"Logout failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


# ── Token refresh ──────────────────────────────────────────────────────────

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except TokenError as e:
            raise InvalidToken(e.args[0])


# ── Current user ───────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticatedUser])
def user_info_view(request):
    return Response(UserSerializer(request.user).data)


# ── Profile ────────────────────────────────────────────────────────────────

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_object(self):
        return self.request.user


class ProfileDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(ProfileSerializer(serializer.save()).data)


# ── Password reset ─────────────────────────────────────────────────────────

class ForgotPasswordView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "If this email exists, a reset link will be sent."})

        token = PasswordResetTokenGenerator().make_token(user)
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{uidb64}/{token}"

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
        except Exception:
            return Response({"error": "Invalid reset link"}, status=400)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({"error": "Reset link has expired or is invalid"}, status=400)

        try:
            validate_password(password, user)
        except ValidationError as e:
            return Response({"error": e.messages}, status=400)

        user.set_password(password)
        user.save()
        return Response({"message": "Password reset successful. You may now login."})


# ── Admin: user management ─────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_users(request):
    admins = User.objects.filter(is_staff=True).values("id", "email", "username")
    return Response(list(admins))


class UsersPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class UsersListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    pagination_class = UsersPagination
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["date_joined", "last_login", "username", "email"]
    ordering = ["-date_joined"]

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) | Q(email__icontains=search) |
                Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )
        return queryset


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]


class UserToggleStatusView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_active = not user.is_active
            user.save()
            return Response(UserSerializer(user).data)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

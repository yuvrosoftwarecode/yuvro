from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import login
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.openapi import OpenApiTypes
from rest_framework.permissions import AllowAny
import logging

logger = logging.getLogger(__name__)
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
from django.contrib.auth import authenticate
from authentication.permissions import (
    IsAdminUser,
    IsAuthenticatedUser,
    IsInstructorOrAdmin,
)
from django.contrib.auth import get_user_model

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
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticatedUser])
def generate_resume_pdf(request):
    try:
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response({
                'error': 'Profile not found. Please complete your profile first.'
            }, status=status.HTTP_404_NOT_FOUND)

        profile_serializer = ProfileSerializer(profile)
        profile_data = profile_serializer.data

        resume_settings = request.data.get('settings', {})
        if not resume_settings and profile.resume_config:
            resume_settings = profile.resume_config

        template_id = resume_settings.get('template', 'classic')
        font_family = resume_settings.get('font', 'Inter')
        color_scheme = resume_settings.get('color', 'default')

        if request.data.get('settings') and request.data.get('save_config', False):
            profile.resume_config = resume_settings
            profile.save()

        color_schemes = {
            'default': {'primary': '#374151', 'accent': '#6b7280'},
            'blue': {'primary': '#1e40af', 'accent': '#3b82f6'},
            'green': {'primary': '#166534', 'accent': '#22c55e'},
            'purple': {'primary': '#7c3aed', 'accent': '#a78bfa'},
            'red': {'primary': '#dc2626', 'accent': '#ef4444'},
            'teal': {'primary': '#0d9488', 'accent': '#14b8a6'},
        }

        colors = color_schemes.get(color_scheme, color_schemes['default'])

        context = {
            'profile': profile_data,
            'user': request.user,
            'template_id': template_id,
            'colors': colors,
            'font_family': font_family,
            'generated_date': datetime.now().strftime('%B %d, %Y'),
        }


        if not WEASYPRINT_AVAILABLE:
            html_content = render_to_string('resume/resume_template.html', context)
            return Response({
                'html_content': html_content,
                'message': 'HTML content generated. Convert to PDF on frontend.',
                'fallback': True
            }, status=status.HTTP_200_OK)

        html_content = render_to_string('resume/resume_template.html', context)

        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            HTML(string=html_content).write_pdf(tmp_file.name)

            with open(tmp_file.name, 'rb') as pdf_file:
                pdf_content = pdf_file.read()

            os.unlink(tmp_file.name)

        user_name = profile_data.get('full_name', 'Resume').replace(' ', '_')
        filename = f"{user_name}_Resume_{datetime.now().strftime('%Y%m%d')}.pdf"

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(pdf_content)

        logger.info(f"Resume PDF generated successfully for user {request.user.username}")
        return response

    except Exception as e:
        logger.error(f"Error generating resume PDF: {str(e)}")

        return Response(
            {
                "error": "Failed to generate resume PDF",
                "details": str(e) if settings.DEBUG else "Internal server error",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


      


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticatedUser])
def resume_config_view(request):
    """Get or update user's resume configuration."""
    try:
        profile = Profile.objects.get(user=request.user)
    except Profile.DoesNotExist:
        return Response({
            'error': 'Profile not found. Please complete your profile first.'
        }, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response({
            'resume_config': profile.resume_config or {}
        })

    elif request.method == 'PUT':
        resume_config = request.data.get('resume_config', {})
        profile.resume_config = resume_config
        profile.save()

        return Response({
            'message': 'Resume configuration updated successfully',
            'resume_config': profile.resume_config
        })


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
@api_view(['GET'])
@permission_classes([IsAuthenticatedUser])
def get_current_user(request):
    """Get the current authenticated user's information."""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticatedUser])
def get_resume_templates(request):
    """Get available resume templates, color schemes, and fonts."""
    templates = [
        {
            'id': 'classic',
            'name': 'Classic Professional',
            'description': 'Clean and traditional layout perfect for corporate roles',
            'category': 'free',
            'popular': True,
        },
        {
            'id': 'modern',
            'name': 'Modern Minimal',
            'description': 'Sleek design with focus on content and readability',
            'category': 'free',
        },
        {
            'id': 'developer',
            'name': 'Developer Focused',
            'description': 'Highlighting technical skills and projects',
            'category': 'free',
            'new': True,
        },
        {
            'id': 'compact',
            'name': 'Compact Single Page',
            'description': 'All information in one page efficiently',
            'category': 'free',
        },
    ]

    return Response({
        'templates': templates,
        'color_schemes': [
            {'id': 'default', 'name': 'Default', 'primary': '#374151', 'accent': '#6b7280'},
            {'id': 'blue', 'name': 'Professional Blue', 'primary': '#1e40af', 'accent': '#3b82f6'},
            {'id': 'green', 'name': 'Nature Green', 'primary': '#166534', 'accent': '#22c55e'},
            {'id': 'purple', 'name': 'Creative Purple', 'primary': '#7c3aed', 'accent': '#a78bfa'},
            {'id': 'red', 'name': 'Bold Red', 'primary': '#dc2626', 'accent': '#ef4444'},
            {'id': 'teal', 'name': 'Modern Teal', 'primary': '#0d9488', 'accent': '#14b8a6'},
        ],
        'fonts': [
            {'id': 'inter', 'name': 'Inter', 'family': 'Inter, sans-serif'},
            {'id': 'roboto', 'name': 'Roboto', 'family': 'Roboto, sans-serif'},
            {'id': 'opensans', 'name': 'Open Sans', 'family': 'Open Sans, sans-serif'},
            {'id': 'lato', 'name': 'Lato', 'family': 'Lato, sans-serif'},
        ]
    })


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
from django.http import HttpResponse
from django.template.loader import render_to_string
import logging
import os
import tempfile
from datetime import datetime

try:
    from django_filters.rest_framework import DjangoFilterBackend
except ImportError:
    DjangoFilterBackend = None

try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False

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
        if self.request.method == "GET":
            role_filter = self.request.query_params.get("role", None)
            if (
                role_filter == "instructor"
                and self.request.user.is_authenticated
                and self.request.user.is_instructor()
            ):
                return [IsInstructorOrAdmin()]
            else:
                return [IsAdminUser()]
        else:
            return [IsAdminUser()]

    def get_queryset(self):
        queryset = super().get_queryset()

        role = self.request.query_params.get("role", None)
        if role:
            queryset = queryset.filter(role=role)

        is_active = self.request.query_params.get("is_active", None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        search = self.request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
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
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )


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

        if not hasattr(profile, "links"):
            SocialLinks.objects.create(profile=profile)

        return profile

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_profile = serializer.save()

        return Response(ProfileSerializer(updated_profile).data)

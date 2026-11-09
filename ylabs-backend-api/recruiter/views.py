from rest_framework import viewsets, mixins, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from .models import Company, CompanyRecruiter, RecruiterPackage, RecruiterUserQuota
from .serializers import (
    CompanySerializer,
    CompanyRecruiterSerializer,
    CompanyRecruiterCreateSerializer,
    CompanyRecruiterUpdateSerializer,
    RecruiterSelfRegistrationSerializer,
    RecruiterPackageSerializer,
    RecruiterUserQuotaSerializer,
)
from .services import delete_user_in_yhub


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all().order_by("-created_at")
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)


class RecruiterSelfRegistrationAPIView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RecruiterSelfRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Create company/recruiter and return the YHub response directly (with tokens)
        response_data = serializer.save()
        return Response(response_data, status=status.HTTP_201_CREATED)


from rest_framework.pagination import PageNumberPagination

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class CompanyRecruiterViewSet(viewsets.ModelViewSet):
    queryset = CompanyRecruiter.objects.all().select_related("user", "company").order_by("-created_at")
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination

    def get_serializer_class(self):
        if self.action == "create":
            return CompanyRecruiterCreateSerializer
        if self.action in ["update", "partial_update"]:
            return CompanyRecruiterUpdateSerializer
        return CompanyRecruiterSerializer

    def create(self, request, *args, **kwargs):
        # Enforce recruiter logins / seat quota check
        from rest_framework.exceptions import ValidationError
        quota = RecruiterUserQuota.objects.filter(user=request.user).first()
        if not quota:
            company_id = request.data.get("company") or request.data.get("company_id")
            if company_id:
                owner_cr = CompanyRecruiter.objects.filter(company_id=company_id).select_related("user").order_by("created_at").first()
                if owner_cr and owner_cr.user:
                    quota = RecruiterUserQuota.objects.filter(user=owner_cr.user).first()

        if quota and quota.total_recruiter_logins >= 0 and quota.used_recruiter_logins >= quota.total_recruiter_logins:
            raise ValidationError({
                "detail": f"Recruiter logins limit reached ({quota.used_recruiter_logins}/{quota.total_recruiter_logins}). Upgrade plan to add more team members."
            })

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company_recruiter = serializer.save(created_by=request.user)
        if quota:
            quota.increment_usage("recruiter_logins")

        # Return the standard serialized format of the new object
        response_serializer = CompanyRecruiterSerializer(company_recruiter)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        company_recruiter = serializer.save()
        
        response_serializer = CompanyRecruiterSerializer(company_recruiter)
        return Response(response_serializer.data)

    def perform_destroy(self, instance):
        user = instance.user
        email = user.email if user else None
        super().perform_destroy(instance)
        if user:
            user.delete()
        if email:
            delete_user_in_yhub(email)

from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import RecruiterTeam, RecruiterTeamMember, RecruiterTeamMemberRole
from .serializers import (
    RecruiterTeamSerializer,
    RecruiterTeamMemberSerializer,
    RecruiterTeamMemberAddSerializer
)
from django.contrib.auth import get_user_model

User = get_user_model()

class RecruiterTeamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RecruiterTeamSerializer

    def get_queryset(self):
        user = self.request.user
        # Get teams where the user is a member
        team_ids = RecruiterTeamMember.objects.filter(user=user).values_list("team_id", flat=True)
        return RecruiterTeam.objects.filter(id__in=team_ids).prefetch_related(
            "members__user", "quota", "subscription", "owner"
        )

    @action(detail=False, methods=["get"])
    def me(self, request):
        team = self.get_queryset().first()
        if not team:
            return Response({"detail": "No team found for this user."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(team)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def members(self, request, pk=None):
        team = self.get_object()
        
        # Only owner or admin can add members
        member_obj = RecruiterTeamMember.objects.filter(team=team, user=request.user).first()
        if not member_obj or member_obj.role not in [RecruiterTeamMemberRole.OWNER, RecruiterTeamMemberRole.ADMIN]:
            return Response({"detail": "You do not have permission to add members to this team."}, status=status.HTTP_403_FORBIDDEN)

        quota = team.quota
        if not quota.has_available_quota("recruiter_logins"):
            return Response({"detail": "Team has reached its maximum recruiter logins quota."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RecruiterTeamMemberAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        role = serializer.validated_data["role"]

        user_to_add = User.objects.filter(email=email).first()
        if not user_to_add:
            return Response({"detail": "User with this email not found."}, status=status.HTTP_404_NOT_FOUND)

        if RecruiterTeamMember.objects.filter(team=team, user=user_to_add).exists():
            return Response({"detail": "User is already a member of this team."}, status=status.HTTP_400_BAD_REQUEST)

        # Add member and increment quota
        RecruiterTeamMember.objects.create(team=team, user=user_to_add, role=role)
        quota.increment_usage("recruiter_logins")

        return Response({"detail": "Member added successfully."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="members/(?P<member_id>[^/.]+)")
    def remove_member(self, request, pk=None, member_id=None):
        team = self.get_object()

        # Only owner or admin can remove members
        requester = RecruiterTeamMember.objects.filter(team=team, user=request.user).first()
        if not requester or requester.role not in [RecruiterTeamMemberRole.OWNER, RecruiterTeamMemberRole.ADMIN]:
            return Response({"detail": "You do not have permission to remove members from this team."}, status=status.HTTP_403_FORBIDDEN)

        member_to_remove = get_object_or_404(RecruiterTeamMember, id=member_id, team=team)
        
        if member_to_remove.role == RecruiterTeamMemberRole.OWNER:
            return Response({"detail": "Cannot remove the team owner."}, status=status.HTTP_400_BAD_REQUEST)

        member_to_remove.delete()
        
        # Decrement usage if needed, assuming the quota decrements when a member leaves.
        team.quota.used_recruiter_logins = max(0, team.quota.used_recruiter_logins - 1)
        team.quota.save(update_fields=["used_recruiter_logins"])

        return Response(status=status.HTTP_204_NO_CONTENT)

import os
import uuid
import urllib.parse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings
from django.shortcuts import redirect
from django.core.cache import cache
from .github_app_client import GithubAppClient
from .models import GithubAppInstallation, GithubAppInstallationGrant

class GithubAppInstallRedirectView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        github_app_name = getattr(settings, 'GITHUB_APP_NAME', os.environ.get('GITHUB_APP_NAME', 'yuvro-labs-app'))
        
        # Generate cryptographically secure state
        state = str(uuid.uuid4())
        
        # Store state in cache for 15 minutes mapped to the user ID
        cache_key = f"github_app_state_{state}"
        cache.set(cache_key, request.user.id, timeout=900)
        
        url = f"https://github.com/apps/{github_app_name}/installations/new?state={state}"
        return Response({"url": url})

from .models import GithubAppInstallation, GithubAppInstallationGrant

class GithubAppInstallCallbackView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        installation_id = request.data.get('installation_id')
        setup_action = request.data.get('setup_action')
        state = request.data.get('state')
        
        if not installation_id:
            return Response({"error": "installation_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not state:
            return Response({"error": "state is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        cache_key = f"github_app_state_{state}"
        cached_user_id = cache.get(cache_key)
        
        if not cached_user_id or cached_user_id != request.user.id:
            return Response({"error": "Invalid, expired, or mismatched state."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Clear the state to make it single-use
        cache.delete(cache_key)
            
        try:
            client = GithubAppClient()
            details = client.get_installation_details(installation_id)
            
            account = details.get('account', {})
            account_id = str(account.get('id', ''))
            account_login = account.get('login', '')
            account_type = account.get('type', '')
            
            installation = GithubAppInstallation.objects.filter(installation_id=str(installation_id)).first()
            if not installation:
                installation = GithubAppInstallation.objects.create(
                    installation_id=str(installation_id),
                    account_id=account_id,
                    account_login=account_login,
                    account_type=account_type,
                    is_active=True,
                    created_by=request.user,
                )
            else:
                installation.account_id = account_id
                installation.account_login = account_login
                installation.account_type = account_type
                installation.is_active = True
                installation.save()
            
            GithubAppInstallationGrant.objects.get_or_create(
                installation=installation,
                recruiter=request.user,
                defaults={'created_by': request.user}
            )
            
            return Response({
                "message": "GitHub App installed successfully",
                "installation_id": installation.installation_id,
                "account_login": installation.account_login
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class GithubAppInstallationsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        grants = GithubAppInstallationGrant.objects.filter(recruiter=request.user, installation__is_active=True).select_related('installation')
        data = []
        for grant in grants:
            inst = grant.installation
            if inst.account_type == "Organization":
                manage_url = f"https://github.com/organizations/{inst.account_login}/settings/installations/{inst.installation_id}"
            else:
                manage_url = f"https://github.com/settings/installations/{inst.installation_id}"
            avatar_url = f"https://avatars.githubusercontent.com/u/{inst.account_id}?v=4" if inst.account_id else f"https://github.com/{inst.account_login}.png"
            data.append({
                "id": inst.id,
                "installation_id": inst.installation_id,
                "account_id": inst.account_id,
                "account_login": inst.account_login,
                "account_type": inst.account_type,
                "avatar_url": avatar_url,
                "manage_url": manage_url,
                "connected_at": grant.created_at,
            })
        return Response(data)
        
    def delete(self, request, installation_id):
        try:
            grant = GithubAppInstallationGrant.objects.get(recruiter=request.user, installation__installation_id=installation_id)
            inst = grant.installation
            grant.delete()
            # If no more grants exist, mark the installation inactive
            if not GithubAppInstallationGrant.objects.filter(installation=inst).exists():
                inst.is_active = False
                inst.save()
            
            # Uninstall the app directly from user's GitHub account via GitHub App API
            try:
                client = GithubAppClient()
                client.delete_installation(installation_id)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not uninstall app {installation_id} on GitHub: {e}")

            return Response(status=status.HTTP_204_NO_CONTENT)
        except GithubAppInstallationGrant.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

class GithubAppRepositoriesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, installation_id):
        try:
            # Verify ownership via grant
            grant = GithubAppInstallationGrant.objects.get(recruiter=request.user, installation__installation_id=installation_id, installation__is_active=True)
            inst = grant.installation
            
            client = GithubAppClient()
            repos = client.get_installation_repositories(inst.installation_id)
            
            # Format output
            result = []
            for r in repos:
                result.append({
                    "id": r.get("id"),
                    "name": r.get("name"),
                    "full_name": r.get("full_name"),
                    "private": r.get("private"),
                    "default_branch": r.get("default_branch"),
                    "html_url": r.get("html_url"),
                    "description": r.get("description"),
                    "language": r.get("language"),
                    "updated_at": r.get("updated_at"),
                })
                
            return Response(result)
        except GithubAppInstallationGrant.DoesNotExist:
            return Response({"error": "Installation not found or not authorized"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


DEFAULT_RECRUITER_PACKAGES = [
    {
        "code": "free",
        "name": "Free Trial",
        "badge": None,
        "monthly_price_usd": 0,
        "yearly_price_usd": 0,
        "trial_days": 14,
        "total_submissions": 10,
        "total_codebase_repos": 1,
        "total_recruiter_logins": 1,
        "features": [
            {"text": "10 candidate submissions"},
            {"text": "1 codebase repository setup"},
            {"text": "1 recruiter login"},
            {"text": "14-day validity"},
        ],
        "display_order": 0,
    },
    {
        "code": "startup",
        "name": "Startup",
        "badge": None,
        "monthly_price_usd": 99,
        "yearly_price_usd": 990,
        "trial_days": 0,
        "total_submissions": 20,
        "total_codebase_repos": 2,
        "total_recruiter_logins": 1,
        "features": [
            {"text": "20 submissions per month"},
            {
                "text": "Company can use these across:",
                "subItems": ["Simulation Labs", "AI Mock Interviews", "Coding Assessments"],
            },
            {"text": "2 codebase repository setups"},
            {"text": "1 recruiter login"},
            {"text": "Candidate reports"},
            {"text": "AI follow-up questions"},
        ],
        "display_order": 1,
    },
    {
        "code": "growth",
        "name": "Growth",
        "badge": "MOST POPULAR",
        "monthly_price_usd": 449,
        "yearly_price_usd": 4490,
        "trial_days": 0,
        "total_submissions": 100,
        "total_codebase_repos": 5,
        "total_recruiter_logins": 3,
        "features": [
            {"text": "100 submissions per month"},
            {
                "text": "Company can use these across:",
                "subItems": ["Simulation Labs", "AI Mock Interviews", "Coding Assessments"],
            },
            {"text": "5 codebase repository setups"},
            {"text": "3 recruiter logins"},
            {"text": "Advanced candidate reports"},
            {"text": "Custom assessments"},
            {"text": "Priority support"},
        ],
        "display_order": 2,
    },
    {
        "code": "enterprise",
        "name": "Enterprise",
        "badge": None,
        "monthly_price_usd": 0,
        "yearly_price_usd": 0,
        "trial_days": 0,
        "total_submissions": -1,
        "total_codebase_repos": -1,
        "total_recruiter_logins": -1,
        "features": [
            {"text": "Everything in Growth"},
            {"text": "Custom submission volumes"},
            {"text": "Custom repository setups and recruiter access"},
            {"text": "API, MCP and ATS integrations"},
            {"text": "2,500+ library questions"},
            {"text": "Dedicated account manager and support"},
        ],
        "display_order": 3,
    },
]


def ensure_default_recruiter_packages(user=None):
    """
    Ensures default packages exist in DB so that subscriptions and quotas always resolve
    proper package limits, pricing, and features.
    """
    for pkg_data in DEFAULT_RECRUITER_PACKAGES:
        code = pkg_data["code"]
        RecruiterPackage.objects.get_or_create(
            code=code,
            defaults={
                "name": pkg_data["name"],
                "badge": pkg_data["badge"],
                "monthly_price_usd": pkg_data["monthly_price_usd"],
                "yearly_price_usd": pkg_data["yearly_price_usd"],
                "trial_days": pkg_data["trial_days"],
                "total_submissions": pkg_data["total_submissions"],
                "total_codebase_repos": pkg_data["total_codebase_repos"],
                "total_recruiter_logins": pkg_data["total_recruiter_logins"],
                "features": pkg_data["features"],
                "display_order": pkg_data["display_order"],
                "is_active": True,
                "created_by": user,
            },
        )


class RecruiterPackageListView(generics.ListAPIView):
    """
    Public/Authenticated list of active Recruiter Packages configured in Django Admin.
    """
    permission_classes = [AllowAny]
    serializer_class = RecruiterPackageSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        ensure_default_recruiter_packages(user)
        return RecruiterPackage.objects.filter(is_active=True).order_by("display_order", "created_at")


class RecruiterMyQuotaView(APIView):
    """
    Retrieves the current recruiter's active package and usage quotas.
    Creates a default Free Trial quota if not yet established.
    Computes accurate live counts for candidate submissions and codebase repositories.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        ensure_default_recruiter_packages(user)
        quota = RecruiterUserQuota.objects.filter(user=user).select_related("package").first()
        
        if not quota:
            from datetime import timedelta
            from django.utils import timezone
            free_pkg = RecruiterPackage.objects.filter(code="free").first()
            quota = RecruiterUserQuota.objects.create(
                user=user,
                created_by=user,
                package=free_pkg,
                plan_tier=free_pkg.code if free_pkg else "free",
                billing_cycle="trial",
                valid_from=timezone.now(),
                valid_until=timezone.now() + timedelta(days=free_pkg.trial_days if free_pkg else 14),
                total_submissions=free_pkg.total_submissions if free_pkg else 10,
                used_submissions=0,
                total_codebase_repos=free_pkg.total_codebase_repos if free_pkg else 1,
                used_codebase_repos=0,
                total_recruiter_logins=free_pkg.total_recruiter_logins if free_pkg else 1,
                used_recruiter_logins=1,
            )
        elif not quota.package:
            # Associate package if missing
            matching_pkg = RecruiterPackage.objects.filter(code=quota.plan_tier).first()
            if matching_pkg:
                quota.package = matching_pkg
                quota.save(update_fields=["package"])
        
        # Calculate live candidate submissions across evaluations created by this recruiter
        try:
            from skill_evaluation.models import UserEvaluationSubmission, Evaluation, LabQuestionBank
            eval_ids = Evaluation.objects.filter(created_by=user).values_list("id", flat=True)
            live_submissions = UserEvaluationSubmission.objects.filter(
                evaluation_id__in=eval_ids,
                completed_at__isnull=False,
            ).count()
            if live_submissions == 0:
                # If completed_at is not set on older submissions, count all submissions under user's evaluations
                live_submissions = UserEvaluationSubmission.objects.filter(evaluation_id__in=eval_ids).count()
            
            # Calculate live codebase repository setups:
            # Count distinct custom repositories configured on questions by this user
            custom_repos_count = (
                LabQuestionBank.objects.filter(created_by=user)
                .exclude(git_repo_starter_url="")
                .values("git_repo_starter_url")
                .distinct()
                .count()
            )
            live_repos = custom_repos_count

            # Update cached usage counts if they differ
            quota_updated = False
            if quota.used_submissions != live_submissions:
                quota.used_submissions = live_submissions
                quota_updated = True
            if quota.used_codebase_repos != live_repos:
                quota.used_codebase_repos = live_repos
                quota_updated = True
            if quota_updated:
                quota.save(update_fields=["used_submissions", "used_codebase_repos"])
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Error calculating live quota usage: {e}")

        serializer = RecruiterUserQuotaSerializer(quota)
        return Response(serializer.data)

    def post(self, request):
        """
        Activate or update plan subscription for recruiter.
        Accepts plan_code (e.g. 'startup', 'growth', 'recruiter_starter_monthly') and billing_cycle.
        """
        from datetime import timedelta
        from django.utils import timezone
        
        raw_code = request.data.get("plan_code") or request.data.get("item_id") or ""
        billing_cycle = request.data.get("billing_cycle", "monthly")

        # Normalize plan code (handle both 'startup' and 'recruiter_starter_monthly' etc.)
        norm = str(raw_code).lower().strip()
        if "growth" in norm:
            plan_code = "growth"
        elif "start" in norm: # startup, starter
            plan_code = "startup"
        elif "enterprise" in norm or "scale" in norm:
            plan_code = "enterprise"
        elif "free" in norm or "trial" in norm:
            plan_code = "free"
        else:
            plan_code = norm

        ensure_default_recruiter_packages(request.user)
        pkg = RecruiterPackage.objects.filter(code=plan_code).first()
        if not pkg:
            pkg = RecruiterPackage.objects.filter(code="startup").first()
            
        if not pkg:
            return Response({"error": "Invalid plan package specified."}, status=status.HTTP_400_BAD_REQUEST)
            
        days = 365 if billing_cycle == "yearly" else (pkg.trial_days if pkg.code == "free" else 30)
        
        quota, _ = RecruiterUserQuota.objects.update_or_create(
            user=request.user,
            defaults={
                "created_by": request.user,
                "package": pkg,
                "plan_tier": pkg.code,
                "billing_cycle": billing_cycle,
                "valid_from": timezone.now(),
                "valid_until": timezone.now() + timedelta(days=days),
                "is_active": True,
                "total_submissions": pkg.total_submissions,
                "total_codebase_repos": pkg.total_codebase_repos,
                "total_recruiter_logins": pkg.total_recruiter_logins,
            }
        )
        
        return Response(RecruiterUserQuotaSerializer(quota).data, status=status.HTTP_200_OK)




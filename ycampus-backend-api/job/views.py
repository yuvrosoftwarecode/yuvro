from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from datetime import timedelta
from .models import (
    Job,
    Company,
    JobApplication,
    SocialLinks,
    Skill,
    Experience,
    Project,
    Education,
    Certification,
    JobProfile,
    JobSkill,
    CandidateSearchLog,
)
from authentication.models import Profile
from .serializers import (
    JobSerializer,
    CompanySerializer,
    JobApplicationSerializer,
    JobApplicationListSerializer,
    JobWithApplicationsSerializer,
    JobProfileSerializer,
    CandidateSearchSerializer,
    CandidateSearchResultSerializer,
    FilterOptionsSerializer,
    CandidateStatsSerializer,
    SocialLinksSerializer,
    SkillSerializer,
    ExperienceSerializer,
    ProjectSerializer,
    EducationSerializer,
    CertificationSerializer,
)
from authentication.permissions import IsAuthenticatedUser
import logging


logger = logging.getLogger(__name__)


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer

    def get_queryset(self):
        queryset = Company.objects.all()
        search = self.request.query_params.get("search", None)

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(domain__icontains=search)
                | Q(website__icontains=search)
            )

        return queryset.order_by("name")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        logger.info(f"Creating company with data: {request.data}")
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        logger.info(f"Updating company {kwargs.get('pk')} with data: {request.data}")
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        logger.info(
            f"Partially updating company {kwargs.get('pk')} with data: {request.data}"
        )
        return super().partial_update(request, *args, **kwargs)


class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.all()
    serializer_class = JobSerializer

    def get_queryset(self):
        queryset = Job.objects.all()
        search = self.request.query_params.get("search", None)

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(company__icontains=search)
                | Q(location__icontains=search)
                | Q(description__icontains=search)
            )

        return queryset.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        logger.info(f"Creating job with data: {request.data}")
        response = super().create(request, *args, **kwargs)
        logger.info(f"Job creation response: {response.data}")
        return response

    def list(self, request, *args, **kwargs):
        logger.info("Fetching jobs list")
        response = super().list(request, *args, **kwargs)
        logger.info(f"Returning {len(response.data)} jobs")
        return response

    def update(self, request, *args, **kwargs):
        logger.info(f"Updating job {kwargs.get('pk')} with data: {request.data}")

        instance = self.get_object()
        original_status = instance.status

        if original_status == "active" and "status" not in request.data:
            content_fields = [
                "title",
                "description",
                "employment_type",
                "experience_min_years",
                "experience_max_years",
                "locations",
                "is_remote",
                "min_salary",
                "max_salary",
                "currency",
                "skills",
                "notice_period",
                "education_level",
                "screening_questions_config",
                "screening_questions_random_config",
            ]

            is_content_update = any(field in request.data for field in content_fields)

            if is_content_update:
                if hasattr(request.data, "_mutable"):
                    request.data._mutable = True
                request.data["status"] = "draft"
                if hasattr(request.data, "_mutable"):
                    request.data._mutable = False
                logger.info(
                    f"Job {instance.id} status changed from 'active' to 'draft' due to content update - requires re-approval"
                )

        response = super().update(request, *args, **kwargs)

        updated_instance = self.get_object()
        if original_status == "active" and updated_instance.status == "draft":
            logger.info(
                f"Job {updated_instance.id} moved to Jobs Approval queue after edit"
            )

        return response

    def partial_update(self, request, *args, **kwargs):
        logger.info(
            f"Partially updating job {kwargs.get('pk')} with data: {request.data}"
        )

        instance = self.get_object()
        original_status = instance.status

        if original_status == "active" and "status" not in request.data:
            content_fields = [
                "title",
                "description",
                "employment_type",
                "experience_min_years",
                "experience_max_years",
                "locations",
                "is_remote",
                "min_salary",
                "max_salary",
                "currency",
                "skills",
                "notice_period",
                "education_level",
                "screening_questions_config",
                "screening_questions_random_config",
            ]

            is_content_update = any(field in request.data for field in content_fields)

            if is_content_update:
                if hasattr(request.data, "_mutable"):
                    request.data._mutable = True
                request.data["status"] = "draft"
                if hasattr(request.data, "_mutable"):
                    request.data._mutable = False
                logger.info(
                    f"Job {instance.id} status changed from 'active' to 'draft' due to content update - requires re-approval"
                )

        response = super().partial_update(request, *args, **kwargs)

        updated_instance = self.get_object()
        if original_status == "active" and updated_instance.status == "draft":
            logger.info(
                f"Job {updated_instance.id} moved to Jobs Approval queue after edit"
            )

        return response

    @action(detail=False, methods=["post"])
    def filter(self, request):
        """Filter jobs based on provided criteria"""
        logger.info(f"Filtering jobs with criteria: {request.data}")

        queryset = self.get_queryset()
        filters = request.data

        if filters.get("title"):
            queryset = queryset.filter(title__icontains=filters["title"])
        if filters.get("company"):
            queryset = queryset.filter(company__icontains=filters["company"])
        if filters.get("location"):
            queryset = queryset.filter(location__icontains=filters["location"])
        if filters.get("work_type"):
            queryset = queryset.filter(work_type=filters["work_type"])
        if filters.get("job_type"):
            queryset = queryset.filter(job_type=filters["job_type"])
        if filters.get("experience_level"):
            queryset = queryset.filter(experience_level=filters["experience_level"])

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        job = self.get_object()
        user = request.user

        logger.info(f"User {user.username} applying to job: {job.title}")

        if JobApplication.objects.filter(
            job=job, applicant=user, is_applied=True
        ).exists():
            return Response(
                {"error": "You have already applied to this job"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application_data = {
            "job_id": job.id,
            "cover_letter": request.data.get("cover_letter", ""),
            "portfolio_url": request.data.get("portfolio_url", ""),
            "expected_salary": request.data.get("expected_salary"),
            "expected_currency": request.data.get("expected_currency", "USD"),
            "available_from": request.data.get("available_from"),
            "notice_period_days": request.data.get("notice_period_days"),
            "screening_responses": request.data.get("screening_responses", {}),
        }

        serializer = JobApplicationSerializer(
            data=application_data, context={"request": request}
        )
        if serializer.is_valid():
            application = serializer.save()
            logger.info(
                f"Job application created successfully with ID: {application.id}"
            )
            return Response(
                {
                    "message": f"Successfully applied to {job.title}",
                    "application_id": application.id,
                    "job_id": job.id,
                    "job_title": job.title,
                },
                status=status.HTTP_201_CREATED,
            )
        else:
            logger.error(f"Job application validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def applications(self, request, pk=None):
        job = self.get_object()

        if not request.user.role in ["recruiter", "admin", "instructor"]:
            return Response(
                {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
            )

        applications = JobApplication.objects.filter(job=job, is_applied=True).order_by(
            "-applied_at"
        )
        serializer = JobApplicationListSerializer(applications, many=True)

        return Response(
            {
                "job_title": job.title,
                "company_name": job.company.name,
                "applications_count": applications.count(),
                "applications": serializer.data,
            }
        )

    @action(detail=False, methods=["get"])
    def with_applications(self, request):
        if not request.user.role in ["recruiter", "admin", "instructor"]:
            return Response(
                {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
            )

        queryset = self.get_queryset()
        serializer = JobWithApplicationsSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def pending_approval(self, request):
        allowed_emails = [
            "recruiter@yuvro.com",
            "recruiter_admin@yuvro.com",
            "admin@yuvro.com",
        ]
        if request.user.email not in allowed_emails:
            return Response(
                {
                    "error": "Access denied. Jobs Approval is restricted to authorized users only."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        logger.info("Fetching jobs pending approval")

        queryset = self.get_queryset().filter(status__in=["draft", "paused"])

        search = request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(company__name__icontains=search)
                | Q(description__icontains=search)
            )

        serializer = self.get_serializer(queryset, many=True)
        logger.info(f"Returning {len(serializer.data)} jobs pending approval")
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        allowed_emails = [
            "recruiter@yuvro.com",
            "recruiter_admin@yuvro.com",
            "admin@yuvro.com",
        ]
        if request.user.email not in allowed_emails:
            return Response(
                {
                    "error": "Access denied. Jobs Approval is restricted to authorized users only."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        job = self.get_object()

        if job.status not in ["draft", "paused"]:
            return Response(
                {
                    "error": f"Cannot approve job with status: {job.status}. Only draft or paused jobs can be approved."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(f"Approving job {job.id}: {job.title}")

        job.status = "active"
        if not job.posted_at:
            job.posted_at = timezone.now()
        job.save()

        logger.info(f"Job {job.id} approved and published successfully")

        serializer = self.get_serializer(job)
        return Response(
            {
                "message": f'Job "{job.title}" approved and published successfully',
                "job": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        allowed_emails = [
            "recruiter@yuvro.com",
            "recruiter_admin@yuvro.com",
            "admin@yuvro.com",
        ]
        if request.user.email not in allowed_emails:
            return Response(
                {
                    "error": "Access denied. Jobs Approval is restricted to authorized users only."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        job = self.get_object()

        if job.status not in ["draft", "paused"]:
            return Response(
                {
                    "error": f"Cannot reject job with status: {job.status}. Only draft or paused jobs can be rejected."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(f"Rejecting job {job.id}: {job.title}")

        job.status = "rejected"
        job.save()

        logger.info(f"Job {job.id} rejected successfully")

        serializer = self.get_serializer(job)
        return Response(
            {
                "message": f'Job "{job.title}" rejected successfully',
                "job": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class JobApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ["recruiter", "admin", "instructor"]:
            return JobApplication.objects.all()
        else:
            return JobApplication.objects.filter(applicant=user)

    def perform_create(self, serializer):
        serializer.save(applicant=self.request.user)

    @action(detail=False, methods=["get"])
    def my_applications(self, request):
        applications = JobApplication.objects.filter(
            applicant=request.user, is_applied=True
        ).order_by("-applied_at")
        serializer = JobApplicationListSerializer(applications, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def bookmarked(self, request):
        bookmarked_apps = JobApplication.objects.filter(
            applicant=request.user, is_bookmarked=True
        ).order_by("-created_at")
        serializer = JobApplicationListSerializer(bookmarked_apps, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def bookmark(self, request):
        job_id = request.data.get("job_id")
        if not job_id:
            return Response(
                {"error": "job_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response(
                {"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND
            )

        existing_app = JobApplication.objects.filter(
            job=job, applicant=request.user
        ).first()
        if existing_app:
            if existing_app.is_bookmarked:
                return Response(
                    {"message": "Job already bookmarked"}, status=status.HTTP_200_OK
                )
            else:
                existing_app.is_bookmarked = True
                existing_app.save()
                return Response(
                    {
                        "message": "Job bookmarked successfully",
                        "application_id": existing_app.id,
                    },
                    status=status.HTTP_200_OK,
                )

        application = JobApplication.objects.create(
            job=job, applicant=request.user, is_bookmarked=True
        )

        return Response(
            {
                "message": "Job bookmarked successfully",
                "application_id": application.id,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"])
    def remove_bookmark(self, request):
        job_id = request.data.get("job_id")
        if not job_id:
            return Response(
                {"error": "job_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            application = JobApplication.objects.get(
                job_id=job_id, applicant=request.user, is_bookmarked=True
            )
            if application.is_applied:
                application.is_bookmarked = False
                application.save()
            else:
                application.delete()
            return Response(
                {"message": "Bookmark removed successfully"}, status=status.HTTP_200_OK
            )
        except JobApplication.DoesNotExist:
            return Response(
                {"error": "Bookmark not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=["get"])
    def user_job_status(self, request):
        applications = JobApplication.objects.filter(applicant=request.user)

        job_status = {}
        for app in applications:
            job_status[str(app.job.id)] = {
                "is_bookmarked": app.is_bookmarked,
                "is_applied": app.is_applied,
                "status": app.status,
                "applied_at": app.applied_at,
            }

        return Response(job_status)

    @action(detail=True, methods=["patch"])
    def update_status(self, request, pk=None):
        if not request.user.role in ["recruiter", "admin", "instructor"]:
            return Response(
                {"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN
            )

        application = self.get_object()
        new_status = request.data.get("status")

        if new_status and new_status not in dict(
            JobApplication.APPLICATION_STATUS_CHOICES
        ):
            return Response(
                {"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST
            )

        if new_status:
            application.status = new_status
        application.recruiter_notes = request.data.get(
            "recruiter_notes", application.recruiter_notes
        )
        application.feedback = request.data.get("feedback", application.feedback)
        application.save()

        serializer = JobApplicationSerializer(application)
        return Response(serializer.data)


class SocialLinksUpdateView(generics.UpdateAPIView):
    serializer_class = SocialLinksSerializer
    permission_classes = [IsAuthenticatedUser]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        links, _ = SocialLinks.objects.get_or_create(profile=profile)
        return links


class SkillCreateView(generics.CreateAPIView):
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticatedUser]

    def perform_create(self, serializer):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        serializer.save(profile=profile)


class SkillUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [IsAuthenticatedUser]


class ExperienceCreateView(generics.CreateAPIView):
    serializer_class = ExperienceSerializer
    permission_classes = [IsAuthenticatedUser]

    def perform_create(self, serializer):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        serializer.save(profile=profile)


class ExperienceUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Experience.objects.all()
    serializer_class = ExperienceSerializer
    permission_classes = [IsAuthenticatedUser]


class ProjectCreateView(generics.CreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticatedUser]

    def perform_create(self, serializer):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        serializer.save(profile=profile)


class ProjectUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticatedUser]


class EducationCreateView(generics.CreateAPIView):
    serializer_class = EducationSerializer
    permission_classes = [IsAuthenticatedUser]

    def perform_create(self, serializer):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        serializer.save(profile=profile)


class EducationUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Education.objects.all()
    serializer_class = EducationSerializer
    permission_classes = [IsAuthenticatedUser]


class CertificationCreateView(generics.CreateAPIView):
    serializer_class = CertificationSerializer
    permission_classes = [IsAuthenticatedUser]

    def perform_create(self, serializer):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        serializer.save(profile=profile)


class CertificationUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer
    permission_classes = [IsAuthenticatedUser]


class CandidateSearchViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["get"])
    def health(self, request):
        return Response(
            {
                "status": "healthy",
                "service": "candidate-search",
                "timestamp": timezone.now().isoformat(),
            }
        )

    @action(detail=False, methods=["post"])
    def search(self, request):
        search_serializer = CandidateSearchSerializer(data=request.data)
        if not search_serializer.is_valid():
            return Response(
                search_serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        filters = search_serializer.validated_data

        queryset = (
            JobProfile.objects.select_related("profile__user")
            .prefetch_related("job_skills", "profile__skills", "profile__experiences")
            .all()
        )

        if filters.get("skills"):
            skills_query = filters["skills"].strip()
            if skills_query:
                skills_list = [
                    skill.strip() for skill in skills_query.split(",") if skill.strip()
                ]
                if skills_list:
                    skills_q = Q()
                    for skill in skills_list:
                        skills_q |= Q(job_skills__skill_name__icontains=skill) | Q(
                            profile__skills__name__icontains=skill
                        )
                    queryset = queryset.filter(skills_q).distinct()

        if filters.get("keywords"):
            keywords = filters["keywords"].strip()
            if keywords:
                queryset = queryset.filter(
                    Q(profile__about__icontains=keywords)
                    | Q(profile__title__icontains=keywords)
                ).distinct()

        if (
            filters.get("experience_from") is not None
            and filters["experience_from"] > 0
        ):
            queryset = queryset.filter(
                total_experience_years__gte=filters["experience_from"]
            )

        if filters.get("experience_to") is not None and filters["experience_to"] >= 0:
            queryset = queryset.filter(
                total_experience_years__lte=filters["experience_to"]
            )

        if filters.get("location"):
            location = filters["location"].strip()
            if location:
                queryset = queryset.filter(
                    Q(profile__location__icontains=location)
                    | Q(preferred_locations__icontains=location)
                ).distinct()

        if filters.get("ctc_from") is not None and filters["ctc_from"] > 0:
            ctc_from_rupees = filters["ctc_from"] * 100000
            queryset = queryset.filter(
                Q(expected_ctc__gte=ctc_from_rupees) & Q(expected_ctc__isnull=False)
            )

        if filters.get("ctc_to") is not None and filters["ctc_to"] >= 0:
            ctc_to_rupees = filters["ctc_to"] * 100000
            queryset = queryset.filter(
                Q(expected_ctc__lte=ctc_to_rupees) & Q(expected_ctc__isnull=False)
            )

        if filters.get("notice_period") and isinstance(filters["notice_period"], list):
            valid_periods = [
                period.strip()
                for period in filters["notice_period"]
                if period and period.strip()
            ]
            if valid_periods:
                queryset = queryset.filter(notice_period__in=valid_periods)

        if filters.get("education"):
            education = filters["education"].strip()
            if education:
                queryset = queryset.filter(highest_education=education)

        if filters.get("domain"):
            domain = filters["domain"].strip()
            if domain:
                queryset = queryset.filter(domain__icontains=domain)

        if filters.get("employment_type") and isinstance(
            filters["employment_type"], list
        ):
            valid_emp_types = [
                emp_type.strip()
                for emp_type in filters["employment_type"]
                if emp_type and emp_type.strip()
            ]
            if valid_emp_types:
                emp_q = Q()
                for emp_type in valid_emp_types:
                    emp_q |= Q(preferred_employment_types__contains=emp_type)
                queryset = queryset.filter(emp_q)

        if filters.get("company_type"):
            company_type = filters["company_type"].strip()
            if company_type and company_type.lower() != "any":
                queryset = queryset.filter(
                    preferred_company_types__contains=company_type
                )

        if filters.get("active_in_days") and filters["active_in_days"] > 0:
            days = filters["active_in_days"]
            cutoff_date = timezone.now() - timedelta(days=days)
            queryset = queryset.filter(last_active__gte=cutoff_date)

        total_count = queryset.count()

        page = max(1, filters.get("page", 1))
        page_size = max(1, min(100, filters.get("page_size", 20)))

        paginator = Paginator(queryset, page_size)
        total_pages = paginator.num_pages

        try:
            candidates_page = paginator.page(page)
        except (EmptyPage, PageNotAnInteger):
            if page > total_pages and total_pages > 0:
                candidates_page = paginator.page(total_pages)
                page = total_pages
            else:
                candidates_page = paginator.page(1) if total_pages > 0 else None
                page = 1
        except Exception:
            candidates_page = paginator.page(1) if total_pages > 0 else None
            page = 1

        candidates_data = []
        if candidates_page:
            candidates_serializer = JobProfileSerializer(
                candidates_page.object_list, many=True
            )
            candidates_data = candidates_serializer.data

        if hasattr(request.user, "role") and request.user.role in [
            "recruiter",
            "admin",
            "instructor",
        ]:
            try:
                CandidateSearchLog.objects.create(
                    recruiter=request.user,
                    search_filters=filters,
                    results_count=total_count,
                )
            except Exception as e:
                import logging

                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to log candidate search: {str(e)}")

        result = {
            "candidates": candidates_data,
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": candidates_page.has_next() if candidates_page else False,
            "has_previous": candidates_page.has_previous()
            if candidates_page
            else False,
            "applied_filters": {
                key: value
                for key, value in filters.items()
                if value is not None
                and value != ""
                and value != []
                and not (
                    key == "company_type"
                    and isinstance(value, str)
                    and value.lower() == "any"
                )
                and not (key in ["experience_from", "ctc_from"] and value == 0)
            },
        }

        return Response(result)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        total_candidates = JobProfile.objects.count()

        seven_days_ago = timezone.now() - timedelta(days=7)
        active_7_days = JobProfile.objects.filter(
            last_active__gte=seven_days_ago
        ).count()

        thirty_days_ago = timezone.now() - timedelta(days=30)
        active_30_days = JobProfile.objects.filter(
            last_active__gte=thirty_days_ago
        ).count()

        recent_searches = 0
        if request.user.role in ["recruiter", "admin", "instructor"]:
            recent_searches = CandidateSearchLog.objects.filter(
                recruiter=request.user, created_at__gte=thirty_days_ago
            ).count()

        stats = {
            "total_candidates": total_candidates,
            "active_candidates_7_days": active_7_days,
            "active_candidates_30_days": active_30_days,
            "recent_searches": recent_searches,
        }

        return Response(stats)

    @action(detail=False, methods=["get"])
    def filter_options(self, request):
        options = {
            "notice_periods": [
                {"value": choice[0], "label": choice[1]}
                for choice in JobProfile.NOTICE_PERIOD_CHOICES
            ],
            "education_levels": [
                {"value": choice[0], "label": choice[1]}
                for choice in JobProfile.EDUCATION_LEVEL_CHOICES
            ],
            "employment_types": [
                {"value": choice[0], "label": choice[1]}
                for choice in JobProfile.EMPLOYMENT_TYPE_CHOICES
            ],
            "company_types": [
                {"value": choice[0], "label": choice[1]}
                for choice in JobProfile.COMPANY_TYPE_CHOICES
            ],
            "popular_skills": list(
                JobSkill.objects.values_list("skill_name", flat=True).distinct()[:20]
            ),
            "popular_locations": list(
                JobProfile.objects.exclude(profile__location__isnull=True)
                .exclude(profile__location="")
                .values_list("profile__location", flat=True)
                .distinct()[:20]
            ),
            "popular_domains": list(
                JobProfile.objects.exclude(domain__isnull=True)
                .exclude(domain="")
                .values_list("domain", flat=True)
                .distinct()[:20]
            ),
        }

        return Response(options)

    def retrieve(self, request, pk=None):
        try:
            job_profile = (
                JobProfile.objects.select_related("profile__user")
                .prefetch_related(
                    "job_skills",
                    "profile__skills",
                    "profile__experiences",
                    "profile__projects",
                    "profile__education",
                    "profile__certifications",
                )
                .get(pk=pk)
            )

            serializer = JobProfileSerializer(job_profile)
            return Response(serializer.data)
        except JobProfile.DoesNotExist:
            return Response(
                {"error": "Candidate not found"}, status=status.HTTP_404_NOT_FOUND
            )

    def list(self, request):
        queryset = (
            JobProfile.objects.select_related("profile__user")
            .prefetch_related("job_skills", "profile__skills", "profile__experiences")
            .all()
        )

        serializer = JobProfileSerializer(queryset, many=True)
        return Response(serializer.data)

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from .models import (
    Job,
    Company,
    JobApplication,
    JobProfile,
    JobSkill,
    CandidateSearchLog,
    SocialLinks,
    Skill,
    Experience,
    Project,
    Education,
    Certification,
)
from authentication.models import Profile
from authentication.serializers import UserSerializer
import logging

User = get_user_model()

logger = logging.getLogger(__name__)


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "domain",
            "website",
            "size",
            "description",
            "benefits",
            "location",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class JobSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    company_id = serializers.UUIDField(write_only=True)
    screening_questions_config = serializers.JSONField(required=False)
    screening_questions_random_config = serializers.JSONField(required=False)

    class Meta:
        model = Job
        fields = [
            "id",
            "company",
            "company_id",
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
            "status",
            "posted_at",
            "expires_at",
            "created_at",
            "updated_at",
            "screening_questions_config",
            "screening_questions_random_config",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def create(self, validated_data):
        logger.info(f"Creating job with data: {validated_data}")
        try:
            job = Job.objects.create(**validated_data)
            logger.info(f"Job created successfully with ID: {job.id}")
            return job
        except Exception as e:
            logger.error(f"Error creating job: {str(e)}")
            raise

    def update(self, instance, validated_data):
        logger.info(f"Updating job {instance.id} with data: {validated_data}")
        try:
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
            logger.info(f"Job {instance.id} updated successfully")
            return instance
        except Exception as e:
            logger.error(f"Error updating job {instance.id}: {str(e)}")
            raise


class JobApplicationSerializer(serializers.ModelSerializer):
    job = JobSerializer(read_only=True)
    job_id = serializers.UUIDField(write_only=True)
    applicant = serializers.StringRelatedField(read_only=True)
    applicant_name = serializers.SerializerMethodField()
    applicant_email = serializers.SerializerMethodField()
    portfolio_url = serializers.URLField(
        required=False, allow_blank=True, allow_null=True
    )
    expected_salary = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    available_from = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "job",
            "job_id",
            "applicant",
            "applicant_name",
            "applicant_email",
            "is_bookmarked",
            "is_applied",
            "cover_letter",
            "resume_file",
            "portfolio_url",
            "status",
            "applied_at",
            "screening_responses",
            "recruiter_notes",
            "feedback",
            "interview_scheduled_at",
            "interview_feedback",
            "expected_salary",
            "expected_currency",
            "available_from",
            "notice_period_days",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "applied_at", "applicant"]

    def get_applicant_name(self, obj):
        if obj.applicant.first_name and obj.applicant.last_name:
            return f"{obj.applicant.first_name} {obj.applicant.last_name}"
        return obj.applicant.username

    def get_applicant_email(self, obj):
        return obj.applicant.email

    def validate(self, data):
        if "portfolio_url" in data and data["portfolio_url"] == "":
            data["portfolio_url"] = None
        if "expected_salary" in data and not data["expected_salary"]:
            data["expected_salary"] = None
        if "available_from" in data and data["available_from"] == "":
            data["available_from"] = None
        if "notice_period_days" in data and data["notice_period_days"] == "":
            data["notice_period_days"] = None

        logger.info(f"Validated application data: {data}")
        return data

    def create(self, validated_data):
        validated_data["applicant"] = self.context["request"].user

        logger.info(
            f"Creating application for user {validated_data['applicant'].username} to job {validated_data['job_id']}"
        )

        existing_app = JobApplication.objects.filter(
            job_id=validated_data["job_id"], applicant=validated_data["applicant"]
        ).first()

        if existing_app:
            logger.info(
                f"Found existing application: is_applied={existing_app.is_applied}, is_bookmarked={existing_app.is_bookmarked}"
            )
            if not existing_app.is_applied:
                for key, value in validated_data.items():
                    if key != "applicant":
                        setattr(existing_app, key, value)
                existing_app.is_applied = True
                existing_app.applied_at = timezone.now()
                if existing_app.status == "bookmarked" or existing_app.status is None:
                    existing_app.status = "under_review"
                existing_app.save()

                cache_key = f"job_applications_count_{validated_data['job_id']}"
                cache.delete(cache_key)

                logger.info(
                    f"Updated existing record to application with ID: {existing_app.id}, status: {existing_app.status}"
                )
                return existing_app
            else:
                raise serializers.ValidationError(
                    "You have already applied to this job"
                )

        validated_data["is_applied"] = True
        validated_data["applied_at"] = timezone.now()

        if "status" not in validated_data or validated_data["status"] is None:
            validated_data["status"] = "under_review"

        logger.info(f"Creating job application with data: {validated_data}")
        try:
            application = JobApplication.objects.create(**validated_data)

            cache_key = f"job_applications_count_{validated_data['job_id']}"
            cache.delete(cache_key)

            logger.info(
                f"Job application created successfully with ID: {application.id}, status: {application.status}"
            )
            return application
        except Exception as e:
            logger.error(f"Error creating job application: {str(e)}")
            raise


class JobApplicationListSerializer(serializers.ModelSerializer):
    applicant_name = serializers.SerializerMethodField()
    applicant_email = serializers.SerializerMethodField()
    job = JobSerializer(read_only=True)

    class Meta:
        model = JobApplication
        fields = [
            "id",
            "applicant_name",
            "applicant_email",
            "job",
            "status",
            "applied_at",
            "expected_salary",
            "expected_currency",
            "cover_letter",
            "portfolio_url",
            "available_from",
            "notice_period_days",
            "created_at",
            "updated_at",
        ]

    def get_applicant_name(self, obj):
        if obj.applicant.first_name and obj.applicant.last_name:
            return f"{obj.applicant.first_name} {obj.applicant.last_name}"
        return obj.applicant.username

    def get_applicant_email(self, obj):
        return obj.applicant.email


class JobWithApplicationsSerializer(JobSerializer):
    applications_count = serializers.SerializerMethodField()
    recent_applications = serializers.SerializerMethodField()

    class Meta(JobSerializer.Meta):
        fields = JobSerializer.Meta.fields + [
            "applications_count",
            "recent_applications",
        ]

    def get_applications_count(self, obj):
        cache_key = f"job_applications_count_{obj.id}"
        count = cache.get(cache_key)

        if count is None:
            count = obj.applications.filter(is_applied=True).count()
            cache.set(cache_key, count, timeout=300)  # Cache for 5 minutes

        return count

    def get_recent_applications(self, obj):
        recent_apps = obj.applications.filter(is_applied=True).order_by("-applied_at")[
            :5
        ]
        return JobApplicationListSerializer(recent_apps, many=True).data


class JobSkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobSkill
        fields = ["skill_name", "proficiency", "years_of_experience"]


class JobProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="profile.full_name", read_only=True)
    title = serializers.CharField(source="profile.title", read_only=True)
    location = serializers.CharField(source="profile.location", read_only=True)
    about = serializers.CharField(source="profile.about", read_only=True)

    user = serializers.SerializerMethodField()

    skills_list = serializers.ReadOnlyField()
    experience_companies = serializers.ReadOnlyField()
    total_experience_in_years = serializers.ReadOnlyField()

    job_skills = JobSkillSerializer(many=True, read_only=True)

    profile = serializers.SerializerMethodField()

    class Meta:
        model = JobProfile
        fields = [
            "id",
            "full_name",
            "title",
            "location",
            "about",
            "user",
            "profile",
            "current_ctc",
            "expected_ctc",
            "currency",
            "total_experience_years",
            "total_experience_months",
            "total_experience_in_years",
            "notice_period",
            "available_from",
            "preferred_employment_types",
            "preferred_locations",
            "open_to_remote",
            "highest_education",
            "domain",
            "preferred_company_types",
            "is_actively_looking",
            "last_active",
            "resume_file",
            "skills_list",
            "experience_companies",
            "job_skills",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "last_active"]

    def get_user(self, obj):
        return {
            "id": str(obj.profile.user.id),
            "email": obj.profile.user.email,
            "first_name": obj.profile.user.first_name,
            "last_name": obj.profile.user.last_name,
            "username": obj.profile.user.username,
        }

    def get_profile(self, obj):
        profile = obj.profile
        profile_data = {
            "full_name": profile.full_name,
            "title": profile.title,
            "location": profile.location,
            "about": profile.about,
            "experiences": ExperienceSerializer(
                profile.experiences.all(), many=True
            ).data,
            "projects": ProjectSerializer(profile.projects.all(), many=True).data,
            "education": EducationSerializer(profile.education.all(), many=True).data,
            "certifications": CertificationSerializer(
                profile.certifications.all(), many=True
            ).data,
        }

        try:
            social_links = profile.links
            profile_data["links"] = SocialLinksSerializer(social_links).data
        except:
            profile_data["links"] = None

        return profile_data


class CandidateSearchSerializer(serializers.Serializer):
    skills = serializers.CharField(required=False, allow_blank=True)
    keywords = serializers.CharField(required=False, allow_blank=True)

    experience_from = serializers.IntegerField(
        required=False, min_value=0, allow_null=True
    )
    experience_to = serializers.IntegerField(
        required=False, min_value=0, allow_null=True
    )

    location = serializers.CharField(required=False, allow_blank=True)

    ctc_from = serializers.DecimalField(
        required=False, max_digits=10, decimal_places=2, min_value=0, allow_null=True
    )
    ctc_to = serializers.DecimalField(
        required=False, max_digits=10, decimal_places=2, min_value=0, allow_null=True
    )

    notice_period = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True, allow_null=True
    )
    education = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    domain = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    employment_type = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True, allow_null=True
    )
    company_type = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )

    active_in_days = serializers.IntegerField(
        required=False, min_value=1, allow_null=True
    )

    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(
        required=False, min_value=1, max_value=100, default=20
    )

    def to_internal_value(self, data):
        numeric_fields = [
            "experience_from",
            "experience_to",
            "ctc_from",
            "ctc_to",
            "active_in_days",
        ]

        for field in numeric_fields:
            if field in data and data[field] == "":
                data[field] = None

        return super().to_internal_value(data)


class CandidateSearchResultSerializer(serializers.Serializer):
    candidates = JobProfileSerializer(many=True)
    total_count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    has_next = serializers.BooleanField()
    has_previous = serializers.BooleanField()


class FilterOptionsSerializer(serializers.Serializer):
    notice_periods = serializers.ListField(child=serializers.DictField())
    education_levels = serializers.ListField(child=serializers.DictField())
    employment_types = serializers.ListField(child=serializers.DictField())
    company_types = serializers.ListField(child=serializers.DictField())
    popular_skills = serializers.ListField(child=serializers.CharField())
    popular_locations = serializers.ListField(child=serializers.CharField())
    popular_domains = serializers.ListField(child=serializers.CharField())


class CandidateStatsSerializer(serializers.Serializer):
    total_candidates = serializers.IntegerField()
    active_candidates_7_days = serializers.IntegerField()
    active_candidates_30_days = serializers.IntegerField()
    recent_searches = serializers.IntegerField()


class SocialLinksSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialLinks
        fields = [
            "id",
            "github",
            "linkedin",
            "portfolio",
            "email",
            "website",
        ]
        read_only_fields = ["id"]


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = [
            "id",
            "name",
            "level",
            "percentage",
        ]
        read_only_fields = ["id"]


class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = [
            "id",
            "company",
            "role",
            "duration",
            "description_list",
            "technologies",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "description",
            "role",
            "tech_stack",
            "github_link",
            "live_link",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = [
            "id",
            "institution",
            "degree",
            "field",
            "duration",
            "cgpa",
            "start_year",
            "end_year",
        ]
        read_only_fields = ["id"]


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = [
            "id",
            "name",
            "issuer",
            "completion_date",
            "certificate_file",
        ]
        read_only_fields = ["id"]


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)

    links = SocialLinksSerializer(read_only=True)
    skills = SkillSerializer(many=True, read_only=True)
    experiences = ExperienceSerializer(many=True, read_only=True)
    projects = ProjectSerializer(many=True, read_only=True)
    education = EducationSerializer(many=True, read_only=True)
    certifications = CertificationSerializer(many=True, read_only=True)

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "first_name",
            "last_name",
            "full_name",
            "title",
            "location",
            "about",
            "gender",
            "profile_image",
            "cover_image",
            "google_id",
            "created_at",
            "updated_at",
            "links",
            "skills",
            "experiences",
            "projects",
            "education",
            "certifications",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "full_name"]

    def update(self, instance, validated_data):
        user = instance.user
        first_name = validated_data.pop("first_name", None)
        last_name = validated_data.pop("last_name", None)

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        user.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.full_name = f"{user.first_name} {user.last_name}".strip()

        instance.save()

        return instance

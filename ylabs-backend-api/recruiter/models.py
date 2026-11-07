from django.conf import settings
from django.db import models

from core.models import BaseTimestampedAdminModel

User = settings.AUTH_USER_MODEL


class Company(BaseTimestampedAdminModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    benefits = models.TextField(blank=True, null=True)
    domain = models.CharField(max_length=255, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    size = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        verbose_name_plural = "Companies"

    def __str__(self):
        return self.name


class CompanyRecruiter(BaseTimestampedAdminModel):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="recruiter_profiles",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="recruiters",
    )
    notification_config = models.JSONField(default=dict, blank=True)
    is_self_signup = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "company")

    def __str__(self):
        return f"{self.user} @ {self.company.name}"

class RecruiterTeamMemberRole(models.TextChoices):
    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    MEMBER = "member", "Member"


class RecruiterTeam(BaseTimestampedAdminModel):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_recruiter_teams")

    def __str__(self):
        return self.name


class RecruiterTeamMember(BaseTimestampedAdminModel):
    team = models.ForeignKey(RecruiterTeam, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="recruiter_team_memberships")
    role = models.CharField(max_length=20, choices=RecruiterTeamMemberRole.choices, default=RecruiterTeamMemberRole.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("team", "user")

    def __str__(self):
        return f"{self.user} - {self.team.name} ({self.role})"


class RecruiterTeamSubscription(BaseTimestampedAdminModel):
    team = models.OneToOneField(RecruiterTeam, on_delete=models.CASCADE, related_name="subscription")
    latest_payment_id = models.CharField(max_length=255, blank=True, null=True)
    plan_tier = models.CharField(max_length=100, blank=True, null=True)
    billing_cycle = models.CharField(max_length=50, blank=True, null=True)
    valid_from = models.DateTimeField(blank=True, null=True)
    valid_until = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.team.name} - {self.plan_tier}"


class RecruiterTeamQuota(BaseTimestampedAdminModel):
    team = models.OneToOneField(RecruiterTeam, on_delete=models.CASCADE, related_name="quota")
    
    total_candidate_attempts = models.IntegerField(default=0)
    used_candidate_attempts = models.IntegerField(default=0)
    
    total_simulation_runs = models.IntegerField(default=0)
    used_simulation_runs = models.IntegerField(default=0)
    
    total_ai_minutes = models.IntegerField(default=0)
    used_ai_minutes = models.IntegerField(default=0)
    
    total_recruiter_logins = models.IntegerField(default=1)
    used_recruiter_logins = models.IntegerField(default=0)

    # Repository setups quota
    total_codebase_repos = models.IntegerField(default=1)
    used_codebase_repos = models.IntegerField(default=0)

    def __str__(self):
        return f"Quota for {self.team.name}"

    def has_available_quota(self, quota_type: str) -> bool:
        total = getattr(self, f"total_{quota_type}", 0)
        used = getattr(self, f"used_{quota_type}", 0)
        return used < total

    def increment_usage(self, quota_type: str, amount: int = 1):
        field_name = f"used_{quota_type}"
        setattr(self, field_name, models.F(field_name) + amount)
        self.save(update_fields=[field_name])


class RecruiterPackage(BaseTimestampedAdminModel):
    PLAN_CODE_CHOICES = [
        ("free", "Free Trial"),
        ("startup", "Startup"),
        ("growth", "Growth"),
        ("enterprise", "Enterprise"),
    ]

    code = models.CharField(max_length=50, choices=PLAN_CODE_CHOICES, unique=True)
    name = models.CharField(max_length=100)
    badge = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. MOST POPULAR")
    description = models.TextField(blank=True, null=True)
    monthly_price_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    yearly_price_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    trial_days = models.PositiveIntegerField(default=0, help_text="Duration in days, e.g. 14 for free trial")

    # Quota Limits
    total_submissions = models.IntegerField(default=0, help_text="Submissions limit per month/trial")
    total_codebase_repos = models.IntegerField(default=1, help_text="Codebase repository setups allowed")
    total_recruiter_logins = models.IntegerField(default=1, help_text="Recruiter logins allowed")

    # Feature List for Frontend
    features = models.JSONField(default=list, blank=True, help_text="List of feature bullet points or objects")
    
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["display_order", "created_at"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class RecruiterUserQuota(BaseTimestampedAdminModel):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="recruiter_quota",
        help_text="Quota assigned directly to an individual recruiter",
    )
    package = models.ForeignKey(
        RecruiterPackage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_quotas",
    )
    plan_tier = models.CharField(max_length=50, default="free")
    billing_cycle = models.CharField(max_length=20, default="monthly")
    valid_from = models.DateTimeField(blank=True, null=True)
    valid_until = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    # Submissions
    total_submissions = models.IntegerField(default=10)
    used_submissions = models.IntegerField(default=0)

    # Codebase Repositories
    total_codebase_repos = models.IntegerField(default=1)
    used_codebase_repos = models.IntegerField(default=0)

    # Recruiter Logins
    total_recruiter_logins = models.IntegerField(default=1)
    used_recruiter_logins = models.IntegerField(default=1)

    def __str__(self):
        return f"Quota for recruiter {self.user.email} [{self.plan_tier}]"

    def has_available_quota(self, quota_type: str) -> bool:
        total = getattr(self, f"total_{quota_type}", 0)
        used = getattr(self, f"used_{quota_type}", 0)
        return used < total

    def increment_usage(self, quota_type: str, amount: int = 1):
        field_name = f"used_{quota_type}"
        setattr(self, field_name, models.F(field_name) + amount)
        self.save(update_fields=[field_name])

class GithubAppInstallation(BaseTimestampedAdminModel):
    installation_id = models.CharField(max_length=255, unique=True)
    account_id = models.CharField(max_length=255)
    account_login = models.CharField(max_length=255)
    account_type = models.CharField(max_length=50) # 'User' or 'Organization'
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.account_login} ({self.installation_id})"

class GithubAppInstallationGrant(BaseTimestampedAdminModel):
    installation = models.ForeignKey(GithubAppInstallation, on_delete=models.CASCADE, related_name="grants")
    recruiter = models.ForeignKey(User, on_delete=models.CASCADE, related_name="github_app_grants")
    
    class Meta:
        unique_together = ("installation", "recruiter")

    def __str__(self):
        return f"{self.recruiter} -> {self.installation.account_login}"

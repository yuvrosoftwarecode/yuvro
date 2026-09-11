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

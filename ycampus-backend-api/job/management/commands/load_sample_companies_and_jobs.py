import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from job.models import Company, Job

User = get_user_model()


class Command(BaseCommand):
    help = "Load comprehensive sample companies and jobs from JSON file"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before loading new data",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing job data...")
            Job.objects.all().delete()
            Company.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing job data cleared."))

        # Load data from JSON file
        json_file_path = os.path.join(
            os.path.dirname(__file__), "../../fixtures/sample_jobs_data.json"
        )

        try:
            with open(json_file_path, "r", encoding="utf-8") as file:
                data = json.load(file)
        except FileNotFoundError:
            self.stdout.write(
                self.style.ERROR(f"JSON file not found at: {json_file_path}")
            )
            return
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f"Invalid JSON format: {e}"))
            return

        self.stdout.write("Loading sample companies and jobs from JSON...")

        # Load companies
        self.load_companies_from_json(data)

        # Load jobs
        self.load_jobs_from_json(data)

        self.stdout.write(
            self.style.SUCCESS(
                "Successfully loaded all sample companies and jobs from JSON!"
            )
        )

    def get_or_create_default_user(self):
        """Get or create a default user for creating companies and jobs"""
        # Try to get an admin user first
        admin_user = User.objects.filter(role="admin").first()
        if admin_user:
            return admin_user

        # Try to get any superuser
        superuser = User.objects.filter(is_superuser=True).first()
        if superuser:
            return superuser

        # Try to get any staff user
        staff_user = User.objects.filter(is_staff=True).first()
        if staff_user:
            return staff_user

        # Create a default admin user if none exists
        default_user, created = User.objects.get_or_create(
            email="admin@yuvro.com",
            defaults={
                "username": "admin",
                "first_name": "System",
                "last_name": "Admin",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )

        if created:
            default_user.set_password("admin123")
            default_user.save()
            self.stdout.write(f"✓ Created default admin user: {default_user.email}")

        return default_user

    def load_companies_from_json(self, data):
        """Load companies from JSON data"""

        # Get or create a default user for creating companies
        default_user = self.get_or_create_default_user()

        for company_data in data.get("companies", []):
            self.stdout.write(f'Loading company: {company_data["name"]}')

            company, created = Company.objects.get_or_create(
                name=company_data["name"],
                defaults={
                    "description": company_data.get("description", ""),
                    "benefits": company_data.get("benefits", ""),
                    "domain": company_data.get("domain", ""),
                    "website": company_data.get("website", ""),
                    "size": company_data.get("size", ""),
                    "location": company_data.get("location", ""),
                    "created_by": default_user,
                },
            )

            if created:
                self.stdout.write(f"✓ Created new company: {company.name}")
            else:
                self.stdout.write(f"→ Company already exists: {company.name}")

    def load_jobs_from_json(self, data):
        """Load jobs from JSON data"""

        # Get or create a default user for creating jobs
        default_user = self.get_or_create_default_user()

        # Create company mapping for quick lookup
        company_map = {company.name: company for company in Company.objects.all()}

        for job_data in data.get("jobs", []):
            self.stdout.write(
                f'Loading job: {job_data["title"]} at {job_data["company_name"]}'
            )

            company_name = job_data.get("company_name")
            company = company_map.get(company_name)

            if not company:
                self.stdout.write(
                    self.style.WARNING(
                        f"Company {company_name} not found, skipping job"
                    )
                )
                continue

            # Calculate posted_at based on days_ago
            days_ago = job_data.get("days_ago", 1)
            posted_at = timezone.now() - timedelta(days=days_ago)

            # Calculate expires_at (30 days from posted date)
            expires_at = posted_at + timedelta(days=30)

            job_kwargs = {
                "company": company,
                "title": job_data["title"],
                "description": job_data["description"],
                "employment_type": job_data["employment_type"],
                "experience_min_years": job_data["experience_min_years"],
                "experience_max_years": job_data.get("experience_max_years"),
                "locations": job_data.get("locations", []),
                "is_remote": job_data.get("is_remote", False),
                "min_salary": job_data.get("min_salary"),
                "max_salary": job_data.get("max_salary"),
                "currency": job_data.get("currency", "INR"),
                "skills": job_data.get("skills", []),
                "notice_period": job_data.get("notice_period"),
                "education_level": job_data.get("education_level", "any"),
                "status": job_data.get("status", "active"),
                "posted_at": posted_at,
                "expires_at": expires_at,
                "created_by": default_user,
            }

            # Check if job already exists to avoid duplicates
            existing_job = Job.objects.filter(
                title=job_kwargs["title"], company=job_kwargs["company"]
            ).first()

            if not existing_job:
                Job.objects.create(**job_kwargs)
                self.stdout.write(
                    f'✓ Created job: {job_data["title"]} at {company_name}'
                )
            else:
                self.stdout.write(
                    f'→ Job already exists: {job_data["title"]} at {company_name}'
                )

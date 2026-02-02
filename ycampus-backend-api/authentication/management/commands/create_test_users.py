import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import models
from authentication.models import Profile
from job.models import SocialLinks, Skill, Experience, Project, Education, Certification

User = get_user_model()


class Command(BaseCommand):
    help = "Create test users with different roles and comprehensive profile data for development and testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing test users before creating new ones",
        )
        parser.add_argument(
            "--file",
            type=str,
            default="fixtures/test_users_data.json",
            help="Path to JSON file with user data (relative to authentication app)",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing existing test users..."))
            User.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing test users cleared."))

        self.stdout.write("Creating test users with comprehensive profile data...")

        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            auth_app_dir = os.path.dirname(os.path.dirname(current_dir))
            json_file_path = os.path.join(auth_app_dir, options["file"])

            if not os.path.exists(json_file_path):
                self.stdout.write(
                    self.style.ERROR(f"JSON file not found: {json_file_path}")
                )
                return

            with open(json_file_path, "r", encoding="utf-8") as file:
                data = json.load(file)

            for user_data in data["users"]:
                existing_user = User.objects.filter(
                    models.Q(email=user_data["email"])
                    | models.Q(username=user_data["username"])
                ).first()

                if existing_user:
                    if existing_user.email == user_data["email"]:
                        self.stdout.write(
                            f'- {user_data["role"].title()} user already exists (email): {user_data["email"]}'
                        )
                    else:
                        self.stdout.write(
                            f'- Username "{user_data["username"]}" already exists for user: {existing_user.email}'
                        )
                    user = existing_user
                    created = False
                else:
                    user = User.objects.create(
                        email=user_data["email"],
                        username=user_data["username"],
                        first_name=user_data["first_name"],
                        last_name=user_data["last_name"],
                        role=user_data["role"],
                        is_staff=user_data.get("is_staff", False),
                        is_superuser=user_data.get("is_superuser", False),
                    )
                    user.set_password(user_data["password"])
                    user.save()
                    created = True

                if created:
                    user.set_password(user_data["password"])
                    user.save()
                    self.stdout.write(
                        f'✓ Created {user_data["role"]} user: {user.email}'
                    )
                else:
                    self.stdout.write(
                        f'- {user_data["role"].title()} user already exists: {user.email}'
                    )

                profile_data = user_data.get("profile", {})

                skills_data = profile_data.pop("skills", [])
                experiences_data = profile_data.pop("experiences", [])
                projects_data = profile_data.pop("projects", [])
                education_data = profile_data.pop("education", [])
                certifications_data = profile_data.pop("certifications", [])
                social_links_data = profile_data.pop("social_links", {})

                profile, profile_created = Profile.objects.get_or_create(
                    user=user, defaults=profile_data
                )

                if profile_created and profile_data:
                    self.stdout.write(f"  ✓ Created profile for: {user.email}")
                elif not profile_created and profile_data:
                    for key, value in profile_data.items():
                        setattr(profile, key, value)
                    profile.save()
                    self.stdout.write(f"  ✓ Updated profile for: {user.email}")

                if social_links_data:
                    social_links, _ = SocialLinks.objects.get_or_create(
                        profile=profile, defaults=social_links_data
                    )
                    self.stdout.write(f"    ✓ Created social links for: {user.email}")

                if skills_data:
                    Skill.objects.filter(profile=profile).delete()
                    for skill_data in skills_data:
                        Skill.objects.create(profile=profile, **skill_data)
                    self.stdout.write(
                        f"    ✓ Created {len(skills_data)} skills for: {user.email}"
                    )

                if experiences_data:
                    Experience.objects.filter(profile=profile).delete()
                    for exp_data in experiences_data:
                        Experience.objects.create(profile=profile, **exp_data)
                    self.stdout.write(
                        f"    ✓ Created {len(experiences_data)} experiences for: {user.email}"
                    )

                if projects_data:
                    Project.objects.filter(profile=profile).delete()
                    for project_data in projects_data:
                        Project.objects.create(profile=profile, **project_data)
                    self.stdout.write(
                        f"    ✓ Created {len(projects_data)} projects for: {user.email}"
                    )

                if education_data:
                    Education.objects.filter(profile=profile).delete()
                    for edu_data in education_data:
                        Education.objects.create(profile=profile, **edu_data)
                    self.stdout.write(
                        f"    ✓ Created {len(education_data)} education records for: {user.email}"
                    )

                if certifications_data:
                    Certification.objects.filter(profile=profile).delete()
                    for cert_data in certifications_data:
                        Certification.objects.create(profile=profile, **cert_data)
                    self.stdout.write(
                        f"    ✓ Created {len(certifications_data)} certifications for: {user.email}"
                    )

            self.stdout.write(
                self.style.SUCCESS(
                    "\nSuccessfully created test users with comprehensive profiles!"
                )
            )

            admin_count = User.objects.filter(role="admin").count()
            instructor_count = User.objects.filter(role="instructor").count()
            recruiter_count = User.objects.filter(role="recruiter").count()
            student_count = User.objects.filter(role="student").count()

            self.stdout.write(f"\nUser Summary:")
            self.stdout.write(f"- Admins: {admin_count}")
            self.stdout.write(f"- Instructors: {instructor_count}")
            self.stdout.write(f"- Recruiters: {recruiter_count}")
            self.stdout.write(f"- Students: {student_count}")
            self.stdout.write(f"- Total Users: {User.objects.count()}")

            self.stdout.write(f"\nProfile Data Summary:")
            self.stdout.write(f"- Profiles: {Profile.objects.count()}")
            self.stdout.write(f"- Social Links: {SocialLinks.objects.count()}")
            self.stdout.write(f"- Skills: {Skill.objects.count()}")
            self.stdout.write(f"- Experiences: {Experience.objects.count()}")
            self.stdout.write(f"- Projects: {Project.objects.count()}")
            self.stdout.write(f"- Education Records: {Education.objects.count()}")
            self.stdout.write(f"- Certifications: {Certification.objects.count()}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error creating test users: {str(e)}"))
            import traceback

            self.stdout.write(self.style.ERROR(traceback.format_exc()))

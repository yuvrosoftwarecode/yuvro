import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import models
from authentication.models import Profile, College, Department

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
            "--deploy_env",
            type=str,
            default="dev",
            choices=["local", "dev", "prod"],
            help="Environment to load fixtures from: local, dev or prod",
        )
        parser.add_argument(
            "--file",
            type=str,
            default="test_users_data.json",
            help="Filename within fixtures/<deploy_env>/ to load",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing existing test users..."))
            User.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing test users cleared."))

        self.stdout.write("Creating test users with comprehensive profile data...")

        try:
            env_dir = options["deploy_env"]
            if env_dir == "local":
                env_dir = "dev"
            
            json_file_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                "fixtures",
                env_dir,
                options["file"],
            )

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

                # Remove non-existent profile relations
                profile_data.pop("skills", [])
                profile_data.pop("experiences", [])
                profile_data.pop("projects", [])
                education_data = profile_data.pop("education", [])
                profile_data.pop("certifications", [])
                profile_data.pop("social_links", {})

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

                # Auto-create college and department from first education record if present
                if education_data:
                    first_edu = education_data[0]
                    first_institution = first_edu.get("institution", "")
                    first_department = first_edu.get("department", "")

                    if first_institution and not profile.college:
                        college, col_created = College.objects.get_or_create(
                            name__iexact=first_institution,
                            defaults={"name": first_institution, "verification_status": "approved"}
                        )
                        profile.college = college
                        profile.save(update_fields=["college"])
                        if col_created:
                            self.stdout.write(
                                f"    ✓ Created college '{college.name}' and linked to: {user.email}"
                            )
                        else:
                            self.stdout.write(
                                f"    ✓ Linked existing college '{college.name}' to: {user.email}"
                            )
                        
                        # Now handle department if present
                        if first_department and not profile.department:
                            department, dept_created = Department.objects.get_or_create(
                                name__iexact=first_department,
                                defaults={"name": first_department}
                            )
                            profile.department = department
                            profile.save(update_fields=["department"])
                            if dept_created:
                                self.stdout.write(
                                    f"    ✓ Created department '{department.name}' and linked to: {user.email}"
                                )
                            else:
                                self.stdout.write(
                                    f"    ✓ Linked existing department '{department.name}' to: {user.email}"
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

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error creating test users: {str(e)}"))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))

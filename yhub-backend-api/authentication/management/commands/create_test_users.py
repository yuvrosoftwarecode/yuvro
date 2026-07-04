import json
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import models
import requests
from authentication.serializers import CustomTokenObtainPairSerializer
from decouple import config

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
        parser.add_argument('--ycode-url', type=str, default=config('YCODE_BACKEND_URL', default='http://localhost:8001'), help='Base URL of YCode API.')
        parser.add_argument('--ylabs-url', type=str, default=config('YLABS_BACKEND_URL', default='http://localhost:8002'), help='Base URL of YLabs API.')

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing existing test users..."))
            User.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing test users cleared."))

        self.stdout.write("Creating test users with comprehensive profile data...")
        
        ycode_url = options['ycode_url'].rstrip('/')
        ylabs_url = options['ylabs_url'].rstrip('/')

        # 1. Ensure a local superuser exists to generate a valid admin JWT
        admin_user, admin_created = User.objects.get_or_create(
            email='admin_sync@yhub.internal',
            defaults={
                'username': 'admin_sync',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
                'roles': {'ycode': 'admin', 'ylabs': 'admin'}
            }
        )
        if admin_created:
            admin_user.set_unusable_password()
            admin_user.save()

        # Generate JWT for sync
        token_serializer = CustomTokenObtainPairSerializer()
        token_data = token_serializer.get_token(admin_user)
        token_data["products"] = ["ycode", "ylabs"]
        access_token = str(token_data.access_token)
        headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}

        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            auth_app_dir = os.path.dirname(os.path.dirname(current_dir))
            deploy_env = "dev" if options["deploy_env"] == "local" else options["deploy_env"]
            json_file_path = os.path.join(auth_app_dir, "fixtures", deploy_env, options["file"])

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
                    user = existing_user
                    created = False
                else:
                    user = User.objects.create(
                        email=user_data["email"],
                        username=user_data["username"],
                        first_name=user_data["first_name"],
                        last_name=user_data["last_name"],
                        roles=user_data.get("roles", {}),
                        is_staff=user_data.get("is_staff", False),
                        is_superuser=user_data.get("is_superuser", False),
                    )
                    user.set_password(user_data["password"])
                    user.save()
                    created = True

                if created:
                    user.set_password(user_data["password"])
                    user.save()
                    msg = f"{user.username} created"
                else:
                    msg = f"{user.username} already exists"
                
                # Sync logic for this user
                if user.email != 'admin_sync@yhub.internal':
                    payload = {
                        "id": str(user.id),
                        "email": user.email,
                        "username": user.username,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "roles": user.roles,
                        "password_hash": user.password,
                        "is_active": user.is_active
                    }
                    
                    try:
                        resp = requests.post(f"{ycode_url}/api/auth/sync-shadow-user/", json=payload, headers=headers)
                        if resp.status_code in (200, 201):
                            msg += f", {user.username} synced to ycode"
                        else:
                            msg += f", failed to sync {user.username} to ycode"
                    except requests.RequestException as e:
                        msg += f", failed to sync {user.username} to ycode"

                    try:
                        resp = requests.post(f"{ylabs_url}/api/auth/sync-shadow-user/", json=payload, headers=headers)
                        if resp.status_code in (200, 201):
                            msg += f", {user.username} synced to ylab"
                        else:
                            msg += f", failed to sync {user.username} to ylab (status: {resp.status_code}, error: {resp.text})"
                    except requests.RequestException as e:
                        msg += f", failed to sync {user.username} to ylab (exception: {str(e)})"

                self.stdout.write(self.style.SUCCESS(msg))



            self.stdout.write(
                self.style.SUCCESS(
                    "\nSuccessfully created test users with comprehensive profiles!"
                )
            )

            self.stdout.write(f"\nUser Summary:")
            self.stdout.write(f"- Total Users: {User.objects.count()}")



        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error creating test users: {str(e)}"))
            import traceback

            self.stdout.write(self.style.ERROR(traceback.format_exc()))

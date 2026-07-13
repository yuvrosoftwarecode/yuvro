from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Company, CompanyRecruiter
from .services import register_user_in_yhub, delete_user_in_yhub
from authentication.models import Profile

User = get_user_model()


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = "__all__"
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def validate_name(self, value):
        qs = Company.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("A company with this name already exists.")
        return value


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "is_active")


class CompanyRecruiterSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    company = CompanySerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), source="company", write_only=True
    )

    class Meta:
        model = CompanyRecruiter
        fields = ("id", "user", "company", "company_id", "notification_config", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class CompanyRecruiterCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company_id = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        first_name = attrs.get("first_name", "")
        last_name = attrs.get("last_name", "")
        company = attrs.get("company_id")
        
        if CompanyRecruiter.objects.filter(
            company=company,
            user__first_name__iexact=first_name,
            user__last_name__iexact=last_name
        ).exists():
            raise serializers.ValidationError({"non_field_errors": "A recruiter with this name already exists for the selected company."})
            
        return attrs

    def create(self, validated_data):
        email = validated_data["email"]
        first_name = validated_data["first_name"]
        last_name = validated_data.get("last_name", "")
        password = validated_data.get("password")
        company = validated_data["company_id"]

        # 1. Generate username from email
        username = email.split("@")[0]
        original_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{original_username}{counter}"
            counter += 1

        # 2. Generate password if blank
        import random
        import string
        if not password:
            password = ''.join(random.choices(string.ascii_letters + string.digits, k=16))

        # 3. Register user in YHub
        try:
            register_user_in_yhub(email, username, password, first_name, last_name, roles={"ylabs": "recruiter"})
        except ValueError as e:
            raise serializers.ValidationError({"yhub_error": str(e)})
        except Exception as e:
            raise serializers.ValidationError({"yhub_error": "YHub integration failed. Please try again."})

        # 4. Create local transaction
        try:
            with transaction.atomic():
                user = User(
                    email=email,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    role="recruiter"
                )
                user.set_password(password)
                user.save()

                # Update the auto-created Profile
                profile = user.profile
                profile.full_name = f"{first_name} {last_name}".strip()
                profile.title = "Recruiter"
                profile.save()

                company_recruiter = CompanyRecruiter.objects.create(
                    user=user,
                    company=company,
                    created_by=validated_data.get("created_by")
                )

                return company_recruiter
        except Exception as e:
            # If the local transaction failed but YHub registration succeeded, rollback YHub.
            delete_user_in_yhub(email)
            raise e


class CompanyRecruiterUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField()
    company_id = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all())

    def validate_email(self, value):
        company_recruiter = self.instance
        if User.objects.filter(email=value).exclude(id=company_recruiter.user.id).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        first_name = attrs.get("first_name")
        last_name = attrs.get("last_name", "")
        company = attrs.get("company_id")
        
        if first_name and company:
            qs = CompanyRecruiter.objects.filter(
                company=company,
                user__first_name__iexact=first_name,
                user__last_name__iexact=last_name
            ).exclude(id=self.instance.id)
            
            if qs.exists():
                raise serializers.ValidationError({"non_field_errors": "A recruiter with this name already exists for the selected company."})
                
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        user = instance.user
        user.first_name = validated_data.get("first_name", user.first_name)
        user.last_name = validated_data.get("last_name", user.last_name)
        user.email = validated_data.get("email", user.email)
        user.save()

        profile = getattr(user, "profile", None)
        if profile:
            profile.full_name = f"{user.first_name} {user.last_name}".strip()
            profile.save()

        instance.company = validated_data.get("company_id", instance.company)
        instance.save()
        return instance

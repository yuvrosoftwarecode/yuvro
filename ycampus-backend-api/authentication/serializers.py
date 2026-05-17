from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    User,
    Profile,
)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token["role"] = user.role
        token["username"] = user.username
        token["email"] = user.email
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name

        return token


class ProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(source="profile_image", read_only=True)

    class Meta:
        model = Profile
        fields = ["avatar", "cover_image", "full_name", "title", "location", "about", "gender"]


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    college_name = serializers.CharField(source="college.name", read_only=True)
    college_id = serializers.UUIDField(source="college.id", read_only=True)
    college_product_type = serializers.CharField(source="college.product_type", read_only=True)
    department_id = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    batch_id = serializers.SerializerMethodField()
    semester_id = serializers.SerializerMethodField()
    section_id = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    linked_departments = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "is_active",
            "date_joined",
            "last_login",
            "college_name",
            "college_id",
            "college_product_type",
            "department_id",
            "department_name",
            "batch_id",
            "semester_id",
            "section_id",
            "linked_departments",
            "profile",
        ]
        read_only_fields = [
            "id",
            "date_joined",
            "last_login",
            "college_name",
            "college_id",
            "college_product_type",
            "department_id",
            "department_name",
            "batch_id",
            "semester_id",
            "section_id",
            "linked_departments",
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_linked_departments(self, obj):
        departments = []
        if obj.role == "principal" and hasattr(obj, "principal_profile"):
            departments = obj.principal_profile.linked_departments.all()
        elif obj.role == "hod" and hasattr(obj, "hod_profile"):
            departments = obj.hod_profile.linked_departments.all()
        elif obj.role == "faculty" and hasattr(obj, "faculty_profile"):
            departments = obj.faculty_profile.linked_departments.all()
        
        return [
            {"id": d.id, "name": d.name, "code": d.short_form}
            for d in departments
        ]

    def _get_profile_attr(self, obj, attr):
        if not hasattr(obj, "role") or not obj.role:
            return None
        
        try:
            if obj.role == "student" and hasattr(obj, "student_profile"):
                return getattr(obj.student_profile, attr)
            elif obj.role == "faculty" and hasattr(obj, "faculty_profile"):
                # Faculty usually only have department_id
                if attr == "department_id":
                    return getattr(obj.faculty_profile, attr)
            elif obj.role == "hod" and hasattr(obj, "hod_profile"):
                if attr == "department_id":
                    return getattr(obj.hod_profile, attr)
        except Exception:
            return None
        return None

    def get_department_name(self, obj):
        if not hasattr(obj, "role") or not obj.role:
            return None

        try:
            if obj.role == "student" and hasattr(obj, "student_profile"):
                return obj.student_profile.department.name if obj.student_profile.department else None
            elif obj.role == "faculty" and hasattr(obj, "faculty_profile"):
                return obj.faculty_profile.department.name if obj.faculty_profile.department else None
            elif obj.role == "hod" and hasattr(obj, "hod_profile"):
                return obj.hod_profile.department.name if obj.hod_profile.department else None
        except Exception:
            return None
        return None
    def get_department_id(self, obj):
        return self._get_profile_attr(obj, "department_id")

    def get_batch_id(self, obj):
        return self._get_profile_attr(obj, "batch_id")

    def get_semester_id(self, obj):
        return self._get_profile_attr(obj, "semester_id")

    def get_section_id(self, obj):
        return self._get_profile_attr(obj, "section_id")


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        from django.contrib.auth import authenticate

        email = attrs.get("email")
        password = attrs.get("password")

        if email and password:
            user = authenticate(username=email, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError("User account is disabled.")
                attrs["user"] = user
                return attrs
            else:
                raise serializers.ValidationError("Invalid email or password.")
        else:
            raise serializers.ValidationError("Must include email and password.")


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "role",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs

    def validate_role(self, value):
        allowed_roles = ["student"]
        if value not in allowed_roles:
            raise serializers.ValidationError(
                f"Invalid role. Allowed roles for registration: {', '.join(allowed_roles)}"
            )
        return value

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "role"]

    def validate_role(self, value):
        request = self.context.get("request")
        if request and request.user:
            if not request.user.can_manage_users():
                if self.instance and self.instance.role != value:
                    raise serializers.ValidationError(
                        "You don't have permission to change user roles."
                    )
        return value

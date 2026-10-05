from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token["username"] = user.username
        token["email"] = user.email
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name
        token["roles"] = user.roles
        token["resume_file"] = user.resume_file
        token["is_guest_user"] = getattr(user, 'is_guest_user', False)

        return token


class UserSerializer(serializers.ModelSerializer):
    github_connected = serializers.SerializerMethodField()
    github_username = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "profile_image",
            "cover_image",
            "resume_file",
            "roles",
            "is_guest_user",
            "is_active",
            "date_joined",
            "last_login",
            "github_connected",
            "github_username",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "github_connected", "github_username"]

    def get_github_connected(self, obj):
        from .models import GithubConnection
        return GithubConnection.objects.filter(user=obj).exists()
        
    def get_github_username(self, obj):
        from .models import GithubConnection
        conn = GithubConnection.objects.filter(user=obj).first()
        return conn.github_username if conn else None


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
    email = serializers.EmailField()
    username = serializers.CharField()

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "roles",
        ]

    def validate_email(self, value):
        user = User.objects.filter(email=value).first()
        if user and not getattr(user, 'is_guest_user', False):
            raise serializers.ValidationError("User with this email already exists.")
        return value

    def validate_username(self, value):
        user = User.objects.filter(username=value).first()
        if user and not getattr(user, 'is_guest_user', False):
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        email = validated_data.get("email")
        
        user = User.objects.filter(email=email).first()
        if user and getattr(user, 'is_guest_user', False):
            for attr, val in validated_data.items():
                setattr(user, attr, val)
            user.set_password(password)
            user.is_guest_user = False
            user.save()
            return user
            
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name"]


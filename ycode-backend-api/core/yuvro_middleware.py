from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.settings import api_settings
from authentication.models import Profile

User = get_user_model()

class ProductJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)

        products = validated_token.get("products", [])
        if "ycode" not in products:
            raise AuthenticationFailed("Token is not valid for this product.")

        user = self.get_user(validated_token)
        return user, validated_token

    def get_user(self, validated_token):
        """
        Attempts to find and return a user using the given validated token.
        If the user does not exist, it creates a shadow user.
        """
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification")

        email = validated_token.get("email", "")
        user = None
        
        if email:
            user = User.objects.filter(email=email).first()
            
        if not user:
            try:
                user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
            except User.DoesNotExist:
                pass

        if not user:
            username = validated_token.get("username", str(user_id))
            
            roles = validated_token.get("roles", {})
            local_role = roles.get("ycode", "student")

            user = User(
                **{api_settings.USER_ID_FIELD: user_id},
                username=username,
                email=email,
                first_name=validated_token.get("first_name", ""),
                last_name=validated_token.get("last_name", ""),
                role=local_role,
                is_active=True,
                is_staff=(local_role == "admin"),
                is_superuser=(local_role == "admin"),
            )
            user.set_unusable_password()
            
            # Do not persist the internal sync user to the database
            if email != "admin_sync@yhub.internal":
                user.save()
                Profile.objects.get_or_create(user=user)

        if not user.is_active:
            raise AuthenticationFailed("User is inactive", code="user_inactive")

        return user

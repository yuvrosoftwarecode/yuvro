from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class DynamicJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        if not user_id:
            return None

        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            email = validated_token.get("email", f"{user_id}@placeholder.com")
            username = validated_token.get("username", email)
            first_name = validated_token.get("first_name", "")
            last_name = validated_token.get("last_name", "")
            role = validated_token.get("role", "student") # default role matching YCode

            logger.info(f"Dynamically creating user {email} (ID: {user_id}) from JWT claims")
            
            user = User.objects.create(
                id=user_id,
                email=email,
                username=username,
                first_name=first_name,
                last_name=last_name,
                role=role,
                is_active=True,
            )
            return user

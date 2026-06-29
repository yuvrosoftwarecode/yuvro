from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminUser
from django.contrib.auth import get_user_model

User = get_user_model()


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def sync_shadow_user(request):
    """
    Sync a shadow user from YHub. Requires Admin access (via ProductJWTAuthentication).
    """
    data = request.data
    user_id = data.get("id")
    if not user_id:
        return Response({"error": "User ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    email = data.get("email", "")
    username = data.get("username", email or str(user_id))
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    roles = data.get("roles", {})
    password_hash = data.get("password_hash")
    is_active = data.get("is_active", True)
    
    local_role = roles.get("ylabs", "student")

    defaults = {
        "username": username,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "role": local_role,
        "is_active": is_active,
        "is_staff": (local_role == "admin"),
        "is_superuser": (local_role == "admin"),
    }

    existing_user = User.objects.filter(email=email).first()
    if existing_user and str(existing_user.id) != str(user_id):
        # Since YHub is the IdP, if we find a local user with the same email 
        # but a different UUID (e.g., from an old fixture), we remove the old 
        # local user so the new YHub user can be created seamlessly.
        existing_user.delete()

    user, created = User.objects.update_or_create(
        id=user_id,
        defaults=defaults
    )

    if password_hash:
        # Save the hashed password directly so they can login to Django admin if they are admin
        user.password = password_hash
        user.save(update_fields=["password"])
    else:
        user.set_unusable_password()

    return Response({"status": "success", "created": created})

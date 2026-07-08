from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminUser
from django.contrib.auth import get_user_model
from .serializers import UserSerializer

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def sync_shadow_user(request):
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
        existing_user.delete()

    user, created = User.objects.update_or_create(
        id=user_id,
        defaults=defaults
    )

    if password_hash:
        user.password = password_hash
        user.save(update_fields=["password"])
    else:
        user.set_unusable_password()

    return Response({"status": "success", "created": created})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_all_users(request):
    users = User.objects.select_related("profile", "profile__college").all()
    result = []
    for u in users:
        college_name = None
        if hasattr(u, "profile"):
            college_name = (
                u.profile.college.name if u.profile.college else u.profile.college_other
            )
        result.append({
            "id": str(u.id),
            "username": u.username,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "role": u.role,
            "is_active": u.is_active,
            "date_joined": u.date_joined,
            "last_login": u.last_login,
            "college": college_name,
        })
    return Response(result)

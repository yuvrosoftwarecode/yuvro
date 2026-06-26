from rest_framework import serializers

class UserSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    first_name = serializers.CharField(read_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(read_only=True, required=False, allow_blank=True)
    role = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True, default=True)


class CollegeSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    verification_status = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class DepartmentSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    verification_status = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

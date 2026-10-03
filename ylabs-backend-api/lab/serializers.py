from rest_framework import serializers
from .models import Lab, LabSprint, LabSprintTicket, UserLabEnrollment, UserLabSprintTicketSubmission

class LabSerializer(serializers.ModelSerializer):
    total_tickets = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Lab
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

class LabSprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSprint
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

class LabSprintTicketSerializer(serializers.ModelSerializer):
    sprint_order = serializers.IntegerField(source='sprint.order_index', read_only=True)

    class Meta:
        model = LabSprintTicket
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at')

class UserLabEnrollmentSerializer(serializers.ModelSerializer):
    lab_details = serializers.SerializerMethodField()
    user_details = serializers.SerializerMethodField()

    class Meta:
        model = UserLabEnrollment
        fields = '__all__'
        read_only_fields = ('user',)

    def get_lab_details(self, obj):
        lab = obj.lab
        if lab:
            return {
                'id': str(lab.id),
                'title': lab.title,
                'type': lab.type
            }
        return None

    def get_user_details(self, obj):
        user = obj.user
        if user:
            first = getattr(user, 'first_name', '')
            last = getattr(user, 'last_name', '')
            name = f"{first} {last}".strip()
            return {
                'id': user.id,
                'name': name if name else user.username,
                'email': user.email,
                'status': 'active' if user.is_active else 'suspended'
            }
        return None

class UserLabSprintTicketSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLabSprintTicketSubmission
        fields = '__all__'
        read_only_fields = ('user',)

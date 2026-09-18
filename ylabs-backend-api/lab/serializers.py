from rest_framework import serializers
from .models import Lab, LabSprint, LabSprintTicket, UserLabEnrollment, UserLabSprintTicketSubmission

class LabSerializer(serializers.ModelSerializer):
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
    class Meta:
        model = UserLabEnrollment
        fields = '__all__'
        read_only_fields = ('user',)

class UserLabSprintTicketSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserLabSprintTicketSubmission
        fields = '__all__'
        read_only_fields = ('user',)

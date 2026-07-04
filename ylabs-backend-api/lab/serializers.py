from rest_framework import serializers
from .models import Lab, LabSprint, LabSprintTicket, UserLabEnrollment, UserLabSprintTicketSubmission

class LabSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lab
        fields = '__all__'

class LabSprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSprint
        fields = '__all__'

class LabSprintTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabSprintTicket
        fields = '__all__'

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

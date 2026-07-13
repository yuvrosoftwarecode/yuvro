from rest_framework import viewsets, mixins, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Company, CompanyRecruiter
from .serializers import (
    CompanySerializer,
    CompanyRecruiterSerializer,
    CompanyRecruiterCreateSerializer,
    CompanyRecruiterUpdateSerializer,
)


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all().order_by("-created_at")
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CompanyRecruiterViewSet(viewsets.ModelViewSet):
    queryset = CompanyRecruiter.objects.all().select_related("user", "company").order_by("-created_at")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return CompanyRecruiterCreateSerializer
        if self.action in ["update", "partial_update"]:
            return CompanyRecruiterUpdateSerializer
        return CompanyRecruiterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company_recruiter = serializer.save(created_by=request.user)

        # Return the standard serialized format of the new object
        response_serializer = CompanyRecruiterSerializer(company_recruiter)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        company_recruiter = serializer.save()
        
        response_serializer = CompanyRecruiterSerializer(company_recruiter)
        return Response(response_serializer.data)

    def perform_destroy(self, instance):
        user = instance.user
        super().perform_destroy(instance)
        if user:
            user.delete()

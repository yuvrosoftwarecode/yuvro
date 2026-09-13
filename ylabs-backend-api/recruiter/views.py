from rest_framework import viewsets, mixins, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from .models import Company, CompanyRecruiter
from .serializers import (
    CompanySerializer,
    CompanyRecruiterSerializer,
    CompanyRecruiterCreateSerializer,
    CompanyRecruiterUpdateSerializer,
    RecruiterSelfRegistrationSerializer
)
from .services import delete_user_in_yhub


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all().order_by("-created_at")
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)


class RecruiterSelfRegistrationAPIView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RecruiterSelfRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Create company/recruiter and return the YHub response directly (with tokens)
        response_data = serializer.save()
        return Response(response_data, status=status.HTTP_201_CREATED)


from rest_framework.pagination import PageNumberPagination

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class CompanyRecruiterViewSet(viewsets.ModelViewSet):
    queryset = CompanyRecruiter.objects.all().select_related("user", "company").order_by("-created_at")
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPageNumberPagination

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
        email = user.email if user else None
        super().perform_destroy(instance)
        if user:
            user.delete()
        if email:
            delete_user_in_yhub(email)

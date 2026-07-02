from django.http import Http404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Payment, Refund, PaymentStatus
from .payment_service import PaymentService
from .serializers import PaymentCreateSerializer, PaymentSerializer, RefundSerializer


class PaymentViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Payment.objects.select_related("user").all()
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment_service = PaymentService()
        payment = payment_service.create_payment(
            user=request.user,
            amount=serializer.validated_data["amount"],
            currency=serializer.validated_data.get("currency", "INR"),
            purpose=serializer.validated_data["purpose"],
            description=serializer.validated_data.get("description", ""),
            metadata=serializer.validated_data.get("metadata") or {},
            gateway_name=serializer.validated_data.get("gateway", "razorpay"),
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        payment = self.get_object()
        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=["post"], url_path="capture")
    def capture(self, request, pk=None):
        payment = self.get_object()
        service = PaymentService()
        response = service.capture_payment(payment)
        return Response(response, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        payment = self.get_object()
        service = PaymentService()
        response = service.cancel_payment(payment)
        return Response(response, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="refund")
    def refund(self, request, pk=None):
        payment = self.get_object()
        amount = request.data.get("amount", payment.amount)
        service = PaymentService()
        refund = service.create_refund(payment, float(amount))
        return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)

    def get_object(self):
        try:
            return self.get_queryset().get(pk=self.kwargs["pk"])
        except Payment.DoesNotExist as exc:
            raise Http404 from exc

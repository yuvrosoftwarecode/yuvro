from django.http import Http404
from rest_framework import status, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Payment, Refund, PaymentStatus, PurchasableItem, UserEntitlement
from .payment_service import PaymentService
from .serializers import PaymentCreateSerializer, PaymentSerializer, RefundSerializer
from django.utils import timezone


class PaymentViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Payment.objects.select_related("user").all()
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Link to PurchasableItem if provided
        item_type = serializer.validated_data.get("item_type")
        item_id = serializer.validated_data.get("item_id")
        purchasable_item = None
        purpose = serializer.validated_data.get("purpose", "")
        
        if item_type and item_id:
            purchasable_item, _ = PurchasableItem.objects.get_or_create(
                item_type=item_type, 
                item_id=item_id,
                defaults={"name": f"{item_type} {item_id}"}
            )
            purpose = f"Payment for {item_type} {item_id}"

        payment_service = PaymentService()
        payment = payment_service.create_payment(
            user=request.user,
            amount=serializer.validated_data["amount"],
            currency=serializer.validated_data.get("currency", "INR"),
            purpose=purpose,
            description=serializer.validated_data.get("description", ""),
            metadata=serializer.validated_data.get("metadata") or {},
            gateway_name=serializer.validated_data.get("gateway", "razorpay"),
        )
        
        if purchasable_item:
            payment.purchasable_item = purchasable_item
            payment.save(update_fields=["purchasable_item"])
            
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="verify")
    def verify(self, request):
        gateway_order_id = request.data.get("gateway_order_id")
        gateway_payment_id = request.data.get("gateway_payment_id")
        signature = request.data.get("signature")

        if not all([gateway_order_id, gateway_payment_id, signature]):
            return Response({"message": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(gateway_order_or_intent_id=gateway_order_id, user=request.user)
        except Payment.DoesNotExist:
            return Response({"message": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)

        service = PaymentService()
        gateway = service.gateway_factory.get_gateway(payment.gateway)
        
        # Verify signature
        if hasattr(gateway, 'verify_signature'):
            is_valid = gateway.verify_signature(gateway_order_id, gateway_payment_id, signature)
            if not is_valid:
                return Response({"message": "Invalid signature", "status": "FAILED"}, status=status.HTTP_400_BAD_REQUEST)

        payment.gateway_payment_or_charge_id = gateway_payment_id
        payment.status = PaymentStatus.SUCCESS
        payment.completed_at = timezone.now()
        payment.save(update_fields=["gateway_payment_or_charge_id", "status", "completed_at"])

        if payment.purchasable_item:
            UserEntitlement.objects.create(
                user=request.user,
                payment_transaction=payment,
                purchasable_item=payment.purchasable_item
            )

        return Response({"status": "SUCCESS", "message": "Payment verified successfully"})

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

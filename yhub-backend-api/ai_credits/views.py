import logging
from django.conf import settings
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response

from .exceptions import InvalidPackError, PaymentVerificationError
from .models import CreditLedgerEntry, CreditPack, CreditUsageRecord
from .pagination import CreditHistoryPagination
from .payment_service import CreditPaymentService
from .serializers import (
    AdminReconcileRequestSerializer,
    CreateOrderRequestSerializer,
    CreditDeficitResolutionSerializer,
    CreditLedgerEntrySerializer,
    CreditPackSerializer,
    CreditUsageRecordSerializer,
    CreditWalletSerializer,
    VerifyPaymentRequestSerializer,
)
from .throttles import (
    CreditCheckoutVerificationRateThrottle,
    CreditOrderCreationRateThrottle,
)
from .wallet_service import WalletService

logger = logging.getLogger(__name__)


class UserWalletView(views.APIView):
    """
    Returns the current authenticated user's credit wallet balance breakdown,
    spendable totals, and reconciliation/deficit status.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet, _ = WalletService.get_or_create_wallet(request.user)
        serializer = CreditWalletSerializer(wallet)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CreditPackListView(generics.ListAPIView):
    """
    Lists all active purchasable credit packs from the server-side catalog.
    The free signup bonus is strictly excluded from purchasable options.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CreditPackSerializer
    pagination_class = None

    def get_queryset(self):
        return CreditPack.objects.filter(is_active=True, is_signup_bonus=False).order_by(
            "sort_order", "price_inr"
        )


class CreateCreditOrderView(views.APIView):
    """
    Creates a validated server-side Razorpay order for purchasing a credit pack.
    Price and credit amounts are strictly enforced from the server catalog.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [CreditOrderCreationRateThrottle]

    def post(self, request):
        serializer = CreateOrderRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pack_id = serializer.validated_data["pack_id"]
        client_request_id = serializer.validated_data.get("client_request_id")

        try:
            payment, snapshot, checkout_data = CreditPaymentService.create_credit_pack_order(
                user=request.user,
                pack_id=pack_id,
                client_request_id=client_request_id,
            )
            return Response(checkout_data, status=status.HTTP_201_CREATED)
        except InvalidPackError as e:
            return Response(
                {"error": "invalid_pack", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Error creating credit order for user {request.user.id}: {e}", exc_info=True)
            return Response(
                {"error": "order_creation_failed", "message": "Failed to create payment order"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class VerifyCheckoutPaymentView(views.APIView):
    """
    Verifies the cryptographic Razorpay signature returned by checkout,
    confirms ownership, and atomically fulfills purchased credits.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [CreditCheckoutVerificationRateThrottle]

    def post(self, request):
        serializer = VerifyPaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        gateway_order_id = serializer.validated_data["gateway_order_id"]
        gateway_payment_id = serializer.validated_data["gateway_payment_id"]
        signature = serializer.validated_data["signature"]

        try:
            result = CreditPaymentService.verify_and_fulfill_checkout(
                user=request.user,
                gateway_order_id=gateway_order_id,
                gateway_payment_id=gateway_payment_id,
                signature=signature,
            )
            return Response(result, status=status.HTTP_200_OK)
        except PaymentVerificationError as e:
            return Response(
                {"error": "verification_failed", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Error during payment fulfillment for user {request.user.id}: {e}", exc_info=True)
            return Response(
                {"error": "fulfillment_error", "message": "An error occurred while fulfilling credits"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CreditLedgerHistoryView(generics.ListAPIView):
    """
    Returns a paginated, user-scoped stream of append-only credit ledger transactions.
    Users can only view their own history; all entries are immutable.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CreditLedgerEntrySerializer
    pagination_class = CreditHistoryPagination

    def get_queryset(self):
        return CreditLedgerEntry.objects.filter(user=self.request.user).order_by("-created_at")


class CreditUsageHistoryView(generics.ListAPIView):
    """
    Returns a paginated, user-scoped stream of detailed token usage records.
    Users can only view their own usage records; no sensitive prompt data is exposed.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CreditUsageRecordSerializer
    pagination_class = CreditHistoryPagination

    def get_queryset(self):
        return CreditUsageRecord.objects.filter(user=self.request.user).order_by("-created_at")


class RazorpayWebhookView(views.APIView):
    """
    Public webhook receiver for incoming Razorpay payment events.
    Authenticates requests cryptographically using the configured Razorpay webhook secret.
    Guarantees event deduplication and idempotent credit fulfillment.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        raw_body = getattr(request, "_body", None) or request.body
        signature = request.headers.get("X-Razorpay-Signature") or request.META.get("HTTP_X_RAZORPAY_SIGNATURE")
        event_id = request.headers.get("X-Razorpay-Event-Id") or request.META.get("HTTP_X_RAZORPAY_EVENT_ID")

        if not signature:
            return Response(
                {"error": "missing_signature", "message": "X-Razorpay-Signature header is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = CreditPaymentService.process_webhook(
                raw_body_bytes=raw_body,
                signature=signature,
                event_id_header=event_id,
            )
            return Response({"status": "ok", "result": result}, status=status.HTTP_200_OK)
        except PaymentVerificationError as e:
            return Response(
                {"error": "invalid_webhook", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Error processing webhook event: {e}", exc_info=True)
            return Response(
                {"error": "processing_error", "message": "Webhook processing encountered an error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AdminDeficitListView(views.APIView):
    """
    Staff-only endpoint to inspect unresolved credit deficits.
    Supports querying a specific wallet or user, or listing all active deficits.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        wallet_id = request.query_params.get("wallet_id")
        user_id = request.query_params.get("user_id")

        if wallet_id:
            try:
                data = WalletService.get_unresolved_deficits(wallet_id)
                return Response(data, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"error": "not_found", "message": str(e)}, status=status.HTTP_404_NOT_FOUND)

        if user_id:
            try:
                wallet = WalletService.get_wallet(user_id)
                data = WalletService.get_unresolved_deficits(wallet.id)
                return Response(data, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"error": "not_found", "message": str(e)}, status=status.HTTP_404_NOT_FOUND)

        # General list of wallets with deficits
        from .models import CreditWallet
        wallets = [
            w for w in CreditWallet.objects.select_related("user").all()
            if w.uncollected_deficit > 0
        ]
        results = [
            {
                "wallet_id": str(w.id),
                "user_id": str(w.user_id),
                "user_email": getattr(w.user, "email", ""),
                "uncollected_deficit": w.uncollected_deficit,
                "reconciliation_status": w.reconciliation_status,
                "total_available": w.total_available,
                "updated_at": w.updated_at.isoformat(),
            }
            for w in wallets
        ]
        return Response({"count": len(results), "results": results}, status=status.HTTP_200_OK)


class AdminDeficitReconcileView(views.APIView):
    """
    Staff-only endpoint to execute transactional, auditable administrative deficit reconciliation.
    Requires a non-empty explanation reason.
    Cannot be executed by standard authenticated users.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        serializer = AdminReconcileRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            resolution, wallet = WalletService.reconcile_deficit(
                wallet_id=data["wallet_id"],
                admin_user=request.user,
                amount_to_resolve=data.get("amount"),
                usage_record_id=data.get("usage_record_id"),
                ledger_entry_id=data.get("ledger_entry_id"),
                reason=data["reason"],
                resolution_method=data.get("resolution_method", "admin_waiver"),
                idempotency_key=data.get("idempotency_key"),
                notes=data.get("notes", ""),
            )
            return Response(
                {
                    "status": "success",
                    "resolution": CreditDeficitResolutionSerializer(resolution).data,
                    "wallet": {
                        "id": str(wallet.id),
                        "total_available": wallet.total_available,
                        "uncollected_deficit": wallet.uncollected_deficit,
                        "reconciliation_status": wallet.reconciliation_status,
                    },
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.warning(f"Administrative deficit reconciliation rejected: {e}")
            return Response(
                {"error": "reconciliation_failed", "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


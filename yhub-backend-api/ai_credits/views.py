import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response

from .exceptions import (
    InvalidPackError,
    PaymentVerificationError,
    InsufficientCreditsError,
)
from .models import CreditLedgerEntry, CreditPack, CreditUsageRecord
from .pagination import CreditHistoryPagination
from .payment_service import CreditPaymentService
from .serializers import (
    AdminAddCreditsRequestSerializer,
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
    CreditDeductionRateThrottle,
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
                {"error": "order_creation_failed", "message": f"Failed to create payment order: {str(e)}"},
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


class DeductCreditsView(views.APIView):
    """
    Atomically deducts a specified amount of credits from the authenticated user's wallet.
    Used for instant one-off AI operations such as AI Research Paper summarization.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [CreditDeductionRateThrottle]

    def post(self, request):
        amount = request.data.get("amount", 1)
        try:
            amount = int(amount)
        except (ValueError, TypeError):
            return Response({"error": "amount must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        description = request.data.get("description", "AI Research Paper Summary")
        idempotency_key = request.data.get("idempotency_key")
        metadata = request.data.get("metadata", {})

        try:
            wallet, entry = WalletService.deduct_credits(
                user=request.user,
                amount=amount,
                description=description,
                idempotency_key=idempotency_key,
                metadata=metadata,
            )
            return Response({
                "success": True,
                "credits_deducted": amount,
                "total_available": wallet.total_available,
                "wallet": CreditWalletSerializer(wallet).data,
            }, status=status.HTTP_200_OK)
        except InsufficientCreditsError as e:
            return Response({
                "error": str(e),
                "available": e.available,
                "required": e.required,
            }, status=status.HTTP_402_PAYMENT_REQUIRED)
        except Exception as e:
            logger.error(f"Error deducting credits: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


User = get_user_model()


def is_admin_or_staff(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return True
    if hasattr(user, "is_admin") and callable(user.is_admin) and user.is_admin():
        return True
    if getattr(user, "role", None) == "admin":
        return True
    roles = getattr(user, "roles", None)
    if isinstance(roles, dict) and any(r == "admin" for r in roles.values()):
        return True
    return False


class AdminAddCreditsView(views.APIView):
    """
    Administrative endpoint to grant bonus or purchased AI credits to a student/user account.
    Records an auditable ledger entry.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not is_admin_or_staff(request.user):
            return Response(
                {"error": "forbidden", "message": "Administrative privileges required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AdminAddCreditsRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"]
        amount = serializer.validated_data["amount"]
        bucket = serializer.validated_data.get("bucket", "bonus")
        description = serializer.validated_data.get("description", "Admin credit top-up")
        idempotency_key = serializer.validated_data.get("idempotency_key")

        try:
            wallet, entry = WalletService.add_admin_credits(
                email=email,
                amount=amount,
                bucket=bucket,
                description=description,
                admin_user=request.user,
                idempotency_key=idempotency_key,
            )
            return Response(
                {
                    "status": "success",
                    "message": f"Successfully added {amount:,} {bucket} credits to {email}.",
                    "wallet": CreditWalletSerializer(wallet).data,
                    "ledger_entry": {
                        "id": str(entry.id),
                        "entry_type": entry.entry_type,
                        "bucket": entry.bucket,
                        "delta": entry.delta,
                        "balance_after_bonus": entry.balance_after_bonus,
                        "balance_after_purchased": entry.balance_after_purchased,
                        "description": entry.description,
                        "created_at": entry.created_at.isoformat() if hasattr(entry, "created_at") else None,
                    },
                },
                status=status.HTTP_200_OK,
            )
        except ValueError as e:
            return Response({"error": "invalid_request", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Failed to add admin credits for {email}: {e}", exc_info=True)
            return Response({"error": "server_error", "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserWalletView(views.APIView):
    """
    Administrative endpoint to inspect a specific user's wallet breakdown by email.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_admin_or_staff(request.user):
            return Response(
                {"error": "forbidden", "message": "Administrative privileges required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        email = request.query_params.get("email")
        if not email:
            return Response(
                {"error": "missing_email", "message": "Email query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = email.strip()
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            # If user hasn't accessed YHub yet, return default empty wallet
            return Response(
                {
                    "bonus_balance": 0,
                    "purchased_balance": 0,
                    "reserved_bonus": 0,
                    "reserved_purchased": 0,
                    "total_available": 0,
                    "total_reserved": 0,
                    "total_balance": 0,
                    "signup_bonus_granted": False,
                    "uncollected_deficit": 0,
                    "reconciliation_status": "settled",
                },
                status=status.HTTP_200_OK,
            )

        wallet, _ = WalletService.get_or_create_wallet(user=user)
        return Response(CreditWalletSerializer(wallet).data, status=status.HTTP_200_OK)



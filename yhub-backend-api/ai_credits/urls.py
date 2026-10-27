from django.urls import path

from .views import (
    AdminDeficitListView,
    AdminDeficitReconcileView,
    CreateCreditOrderView,
    CreditLedgerHistoryView,
    CreditPackListView,
    CreditUsageHistoryView,
    RazorpayWebhookView,
    UserWalletView,
    VerifyCheckoutPaymentView,
)

app_name = "ai_credits"

urlpatterns = [
    path("wallet/", UserWalletView.as_view(), name="wallet"),
    path("packs/", CreditPackListView.as_view(), name="packs"),
    path("orders/", CreateCreditOrderView.as_view(), name="create_order"),
    path("verify/", VerifyCheckoutPaymentView.as_view(), name="verify_payment"),
    path("history/", CreditLedgerHistoryView.as_view(), name="ledger_history"),
    path("usage/", CreditUsageHistoryView.as_view(), name="usage_history"),
    path("webhook/", RazorpayWebhookView.as_view(), name="webhook"),
    path("webhooks/razorpay/", RazorpayWebhookView.as_view(), name="razorpay_webhook"),
    path("admin/deficits/", AdminDeficitListView.as_view(), name="admin_deficits"),
    path("admin/reconcile/", AdminDeficitReconcileView.as_view(), name="admin_reconcile"),
]

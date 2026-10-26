from rest_framework.throttling import UserRateThrottle


class CreditOrderCreationRateThrottle(UserRateThrottle):
    """Limits credit order creation to 30 requests per minute per user."""
    scope = "credit_order_creation"
    rate = "30/minute"


class CreditCheckoutVerificationRateThrottle(UserRateThrottle):
    """Limits checkout verification to 60 requests per minute per user."""
    scope = "credit_checkout_verification"
    rate = "60/minute"

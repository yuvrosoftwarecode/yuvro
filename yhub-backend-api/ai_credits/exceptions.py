class CreditError(Exception):
    """Base exception for all AI credit wallet and payment operations."""
    pass


class InsufficientCreditsError(CreditError):
    """Raised when spendable credits are insufficient to satisfy a reservation or charge."""
    def __init__(self, message: str = "Insufficient credits balance", available: int = 0, required: int = 0):
        super().__init__(message)
        self.available = available
        self.required = required


class ReservationNotFoundError(CreditError):
    """Raised when a specified credit reservation does not exist."""
    pass


class ReservationStateError(CreditError):
    """Raised when an operation is invalid for the reservation's current lifecycle state."""
    pass


class ReservationLimitExceededError(CreditError):
    """Raised when an estimated reservation exceeds the configured maximum."""
    pass


class InvalidPackError(CreditError):
    """Raised when a selected credit pack does not exist, is inactive, or is not purchasable."""
    pass


class PaymentVerificationError(CreditError):
    """Raised when checkout or webhook payment verification fails."""
    pass


class PaymentAlreadyFulfilledError(CreditError):
    """Raised when a payment has already been credited to a user wallet."""
    pass


class DuplicateWebhookEventError(CreditError):
    """Raised when a webhook event has already been recorded and processed."""
    pass

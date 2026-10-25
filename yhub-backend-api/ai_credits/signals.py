import logging
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def initialize_user_credit_wallet(sender, instance, created, **kwargs):
    """
    Automatically creates a CreditWallet and awards the 50,000 welcome bonus credits
    whenever a new User is registered across any flow (Password, OTP, Google OAuth),
    when the AI_CREDITS_ENABLED feature flag is active.
    """
    if created and getattr(settings, "AI_CREDITS_ENABLED", False):
        try:
            from .wallet_service import WalletService
            WalletService.get_or_create_wallet(instance, grant_signup_bonus=True)
        except Exception as e:
            logger.error(f"Failed to auto-initialize credit wallet for new user {instance.id}: {e}", exc_info=True)

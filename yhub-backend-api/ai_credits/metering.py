import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings

from .exceptions import InsufficientCreditsError, ReservationLimitExceededError
from .models import CreditReservation, CreditUsageRecord, CreditWallet, ReservationStatus
from .wallet_service import WalletService

logger = logging.getLogger(__name__)


class CreditMeteringManager:
    """
    Central coordinator for AI token metering, pre-dispatch reservations,
    normalized provider usage extraction, and atomic settlement.
    """

    @classmethod
    def is_enabled(cls) -> bool:
        """Determines whether credit enforcement and metering is active."""
        return getattr(settings, "AI_CREDITS_ENABLED", False)

    @classmethod
    def reserve_for_chat(
        cls,
        user,
        session_id: Optional[str] = None,
        message_id: Optional[str] = None,
        max_tokens: Optional[int] = None,
        call_type: str = "chat",
        idempotency_key: Optional[str] = None,
    ) -> Optional[CreditReservation]:
        """
        Reserves credits before invoking an AI LLM provider.
        Returns None when AI_CREDITS_ENABLED is False, preserving standard chat flows.
        """
        if not cls.is_enabled():
            return None

        # Check reconciliation status on wallet
        wallet, _ = WalletService.get_or_create_wallet(user)
        if wallet.reconciliation_status == "deficit_pending_reconciliation":
            raise InsufficientCreditsError(
                f"Account has an uncollected deficit of {wallet.uncollected_deficit:,} credits. Please purchase credits to resolve.",
                available=wallet.total_available,
                required=wallet.uncollected_deficit,
            )

        default_res = getattr(settings, "AI_CREDITS_DEFAULT_RESERVATION", 4096)
        max_res = getattr(settings, "AI_CREDITS_MAX_RESERVATION", 16384)

        if max_tokens and int(max_tokens) > 0:
            # Estimate reservation amount based on requested max output tokens
            requested_tokens = int(max_tokens)
            # Add reasonable buffer for input context
            estimated = min(max(requested_tokens + 512, default_res), max_res)
        else:
            estimated = default_res

        idem_key = idempotency_key or f"call:{user.id}:{session_id or 'quick'}:{message_id or uuid.uuid4().hex}"

        reservation = WalletService.reserve_credits(
            user=user,
            amount=estimated,
            session_id=str(session_id) if session_id else None,
            message_id=str(message_id) if message_id else None,
            idempotency_key=idem_key,
            metadata={"call_type": call_type, "estimated_tokens": estimated},
        )
        return reservation

    @classmethod
    def extract_token_usage(
        cls,
        provider: str,
        model_name: str,
        response_data: Optional[Dict[str, Any]] = None,
        full_response_text: str = "",
        messages: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Normalizes token metrics across Anthropic, Gemini, OpenAI, Cohere, etc.
        Enforces rule: credits_charged = input_tokens + output_tokens.
        Cached and reasoning tokens are recorded in informational fields without double-counting.
        """
        response_data = response_data or {}
        metadata = response_data.get("metadata", {}) or {}

        input_tokens = 0
        output_tokens = 0
        cached_tokens = 0
        reasoning_tokens = 0
        is_estimated = False
        usage_source = "provider_response"
        provider_request_id = None

        provider_lower = (provider or "").lower()

        # ── Anthropic Extraction ──────────────────────────────────────────
        if provider_lower == "anthropic":
            provider_request_id = metadata.get("id") or metadata.get("request_id")
            input_tokens = metadata.get("input_tokens") or 0
            output_tokens = metadata.get("output_tokens") or 0
            cached_tokens = metadata.get("cache_read_input_tokens") or 0

            # If streaming, check final metadata on stream object
            stream = response_data.get("stream")
            if stream and hasattr(stream, "get_final_metadata"):
                try:
                    meta = stream.get_final_metadata()
                    if meta and hasattr(meta, "usage") and meta.usage:
                        input_tokens = getattr(meta.usage, "input_tokens", input_tokens) or 0
                        output_tokens = getattr(meta.usage, "output_tokens", output_tokens) or 0
                        cached_tokens = getattr(meta.usage, "cache_read_input_tokens", cached_tokens) or 0
                        provider_request_id = getattr(meta, "id", provider_request_id)
                        usage_source = "stream_metadata"
                except Exception as e:
                    logger.debug(f"Failed to read Anthropic stream metadata: {e}")

        # ── Gemini Extraction ─────────────────────────────────────────────
        elif provider_lower == "gemini":
            input_tokens = metadata.get("prompt_tokens") or 0
            output_tokens = metadata.get("completion_tokens") or 0

            stream = response_data.get("stream")
            if stream and hasattr(stream, "usage_metadata") and stream.usage_metadata:
                try:
                    um = stream.usage_metadata
                    input_tokens = getattr(um, "prompt_token_count", input_tokens) or 0
                    output_tokens = getattr(um, "candidates_token_count", output_tokens) or 0
                    cached_tokens = getattr(um, "cached_content_token_count", cached_tokens) or 0
                    usage_source = "stream_metadata"
                except Exception as e:
                    logger.debug(f"Failed to read Gemini stream usage_metadata: {e}")

        # ── OpenAI Extraction ─────────────────────────────────────────────
        elif provider_lower in ["openai", "azure"]:
            provider_request_id = metadata.get("id")
            input_tokens = metadata.get("prompt_tokens") or 0
            output_tokens = metadata.get("completion_tokens") or 0
            cached_tokens = metadata.get("cached_tokens") or 0
            reasoning_tokens = metadata.get("reasoning_tokens") or 0

            stream = response_data.get("stream")
            if stream and hasattr(stream, "usage") and stream.usage:
                u = stream.usage
                input_tokens = getattr(u, "prompt_tokens", input_tokens) or 0
                output_tokens = getattr(u, "completion_tokens", output_tokens) or 0
                usage_source = "stream_metadata"

        # ── Cohere Extraction ─────────────────────────────────────────────
        elif provider_lower == "cohere":
            tokens_used = response_data.get("tokens_used") or 0
            if tokens_used > 0:
                output_tokens = len(full_response_text) // 4
                input_tokens = max(0, tokens_used - output_tokens)
            provider_request_id = metadata.get("generation_id")

        # ── Fallback Estimator ────────────────────────────────────────────
        # If authoritative tokens are completely missing, estimate reliably and flag explicitly
        if input_tokens == 0 and output_tokens == 0:
            tokens_used = response_data.get("tokens_used") or 0
            if tokens_used > 0:
                output_tokens = max(1, len(full_response_text) // 4)
                input_tokens = max(0, tokens_used - output_tokens)
                is_estimated = False
            else:
                # Estimate: ~4 characters per token
                est_in = sum(len(str(m.get("content", ""))) for m in (messages or [])) // 4
                est_out = len(full_response_text) // 4
                input_tokens = max(1, est_in)
                output_tokens = max(1, est_out)
                is_estimated = True
                usage_source = "fallback_estimator"

        credits_charged = input_tokens + output_tokens

        return {
            "provider": provider,
            "model": model_name,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cached_tokens": cached_tokens,
            "reasoning_tokens": reasoning_tokens,
            "credits_charged": credits_charged,
            "provider_request_id": provider_request_id,
            "is_estimated": is_estimated,
            "usage_source": usage_source,
        }

    @classmethod
    def settle_for_chat(
        cls,
        reservation: Optional[CreditReservation],
        provider: str,
        model_name: str,
        usage_dict: Dict[str, Any],
        call_type: str = "chat",
        status: str = "completed",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[CreditUsageRecord]:
        """
        Settles a credit reservation with authoritative token metrics,
        logging a CreditUsageRecord and returning unused credits to available balance.
        """
        if not reservation or not cls.is_enabled():
            return None

        credits_charged = usage_dict.get("credits_charged", 0)

        usage_kwargs = {
            "provider": provider,
            "model": model_name,
            "input_tokens": usage_dict.get("input_tokens", 0),
            "output_tokens": usage_dict.get("output_tokens", 0),
            "cached_tokens": usage_dict.get("cached_tokens", 0),
            "reasoning_tokens": usage_dict.get("reasoning_tokens", 0),
            "provider_request_id": usage_dict.get("provider_request_id"),
            "is_estimated": usage_dict.get("is_estimated", False),
            "usage_source": usage_dict.get("usage_source", "provider_response"),
            "call_type": call_type,
            "status": status,
            "metadata": metadata or {},
        }

        settlement_idempotency = f"settle:{reservation.id}"

        res, usage_record = WalletService.settle_reservation(
            reservation_id=reservation.id,
            actual_usage_credits=credits_charged,
            usage_record_kwargs=usage_kwargs,
            idempotency_key=settlement_idempotency,
        )
        return usage_record

    @classmethod
    def release_for_chat(
        cls,
        reservation: Optional[CreditReservation],
        reason: str = "request_cancelled",
    ) -> Optional[CreditReservation]:
        """
        Safely restores reserved credits to the user's available pools
        in case of provider error, request abort, or client disconnection.
        """
        if not reservation or not cls.is_enabled():
            return None

        try:
            return WalletService.release_reservation(reservation.id, reason=reason)
        except Exception as e:
            logger.error(f"Failed to release reservation {reservation.id}: {e}", exc_info=True)
            return reservation

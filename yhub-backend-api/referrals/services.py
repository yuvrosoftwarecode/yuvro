import logging
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from .models import Referral, ReferralCode
from .utils import generate_unique_referral_code, get_referral_share_url, DEFAULT_INVITE_MESSAGE

logger = logging.getLogger(__name__)
User = get_user_model()


class ReferralService:
    @classmethod
    def get_or_create_code(cls, user):
        """
        Retrieves or generates a unique ReferralCode for the specified user.
        """
        referral_code, created = ReferralCode.objects.get_or_create(
            user=user,
            defaults={"code": generate_unique_referral_code(user)},
        )
        return referral_code

    @classmethod
    def generate_code(cls, user, force_new=False):
        """
        Retrieves or generates a unique ReferralCode for the specified user.
        If force_new=True, generates a fresh unique code.
        """
        if force_new:
            new_code = generate_unique_referral_code(user)
            ref_obj, _ = ReferralCode.objects.update_or_create(
                user=user,
                defaults={"code": new_code, "is_active": True},
            )
            return ref_obj
        return cls.get_or_create_code(user)

    @classmethod
    def validate_code(cls, code: str, prospective_user=None):
        """
        Validates if a referral code exists, is active, and doesn't belong to the prospective user.
        """
        if not code or not isinstance(code, str):
            return False, None, "Referral code is required."

        cleaned_code = code.strip().upper()
        ref_obj = ReferralCode.objects.filter(code__iexact=cleaned_code, is_active=True).select_related("user").first()
        if not ref_obj:
            return False, None, "Invalid or expired referral code."

        if prospective_user and prospective_user.is_authenticated:
            if ref_obj.user_id == prospective_user.id:
                return False, None, "You cannot refer yourself."

        return True, ref_obj, "Valid referral code."

    @classmethod
    def process_registration(cls, referred_user, code: str):
        """
        Called when a new user registers with a referral code.
        Records attribution in YHub.
        """
        if not code or not referred_user:
            return None

        cleaned_code = code.strip().upper()
        is_valid, ref_obj, msg = cls.validate_code(cleaned_code, prospective_user=referred_user)
        if not is_valid or not ref_obj:
            logger.warning(f"Registration referral code validation failed for user {referred_user.id}: {msg}")
            return None

        referrer = ref_obj.user
        if referrer.id == referred_user.id:
            logger.warning(f"Self-referral blocked for user {referred_user.id}")
            return None

        # Check if this user was already referred
        if Referral.objects.filter(referred_user=referred_user).exists():
            logger.warning(f"User {referred_user.id} already has a referral record.")
            return None

        try:
            with transaction.atomic():
                referral = Referral.objects.create(
                    referrer=referrer,
                    referred_user=referred_user,
                    referral_code=ref_obj.code,
                    status="accepted",
                    referred_email=referred_user.email,
                    accepted_at=timezone.now(),
                    metadata={
                        "registration_product": "ylabs",
                        "username": referred_user.username,
                    },
                )
                logger.info(
                    f"Referral successfully recorded: {referrer.email} referred {referred_user.email} (code: {ref_obj.code})"
                )
                return referral
        except Exception as e:
            logger.error(f"Error saving referral record for user {referred_user.id}: {e}", exc_info=True)
            return None

    @classmethod
    def get_student_stats(cls, user):
        """
        Returns stats for the student dashboard.
        """
        qs = Referral.objects.filter(referrer=user)
        total = qs.filter(status="accepted").count()
        accepted = total
        pending = qs.filter(status="pending").count()
        return {
            "total_referrals": total,
            "accepted_referrals": accepted,
            "pending_referrals": pending,
        }

    @classmethod
    def get_student_history(cls, user):
        """
        Returns referral history for the logged-in student.
        """
        return Referral.objects.filter(referrer=user).select_related("referred_user").order_by("-created_at")

    @classmethod
    def get_admin_summary(cls):
        """
        Returns global referral stats for admin dashboard.
        """
        total = Referral.objects.filter(status="accepted").count()
        accepted = total
        pending = Referral.objects.filter(status="pending").count()
        referring_students = (
            Referral.objects.filter(status="accepted")
            .values("referrer_id")
            .distinct()
            .count()
        )
        return {
            "total_referrals": total,
            "total_accepted": accepted,
            "total_pending": pending,
            "total_referring_students": referring_students,
        }

    @classmethod
    def get_admin_referrers(cls, search=None, status_filter=None):
        """
        Returns a aggregated list of students who have made referrals or generated codes.
        """
        # Query users who have referral codes or made referrals
        qs = User.objects.filter(
            Q(referral_code_record__isnull=False) | Q(referrals_made__isnull=False)
        ).distinct()

        if search:
            search_str = search.strip()
            qs = qs.filter(
                Q(first_name__icontains=search_str)
                | Q(last_name__icontains=search_str)
                | Q(email__icontains=search_str)
                | Q(username__icontains=search_str)
                | Q(referral_code_record__code__icontains=search_str)
            )

        users_list = []
        for u in qs:
            ref_code_obj = getattr(u, "referral_code_record", None)
            ref_code = ref_code_obj.code if ref_code_obj else ""
            if not ref_code:
                # generate code on the fly if needed
                ref_code = cls.get_or_create_code(u).code

            referrals = Referral.objects.filter(referrer=u)
            total = referrals.filter(status="accepted").count()
            accepted = total
            pending = referrals.filter(status="pending").count()

            if status_filter:
                sf = status_filter.lower().strip()
                if sf == "accepted" and accepted == 0:
                    continue
                if sf == "pending" and pending == 0:
                    continue

            name = (
                f"{u.first_name or ''} {u.last_name or ''}".strip()
                or u.username
                or u.email
            )
            users_list.append({
                "id": str(u.id),
                "name": name,
                "email": u.email,
                "referral_code": ref_code,
                "total_referred": total + pending,
                "accepted": accepted,
                "pending": pending,
            })

        return sorted(users_list, key=lambda x: (x["accepted"], x["total_referred"]), reverse=True)

    @classmethod
    def get_admin_referrer_details(cls, user_id):
        """
        Returns detailed list of referred students for a specific referrer.
        """
        referrer = User.objects.filter(id=user_id).first()
        if not referrer:
            return None

        ref_code_obj = getattr(referrer, "referral_code_record", None)
        ref_code = ref_code_obj.code if ref_code_obj else ""
        if not ref_code:
            ref_code = cls.get_or_create_code(referrer).code

        referrals = Referral.objects.filter(referrer=referrer).select_related("referred_user").order_by("-created_at")

        referred_list = []
        for r in referrals:
            name = "Unknown"
            email = r.referred_email or ""
            if r.referred_user:
                name = (
                    f"{r.referred_user.first_name or ''} {r.referred_user.last_name or ''}".strip()
                    or r.referred_user.username
                    or r.referred_user.email
                )
                email = r.referred_user.email or email

            referred_list.append({
                "id": str(r.id),
                "referred_name": name,
                "referred_email": email,
                "registration_date": r.accepted_at or r.created_at,
                "status": r.status.capitalize(),
                "referral_code": r.referral_code,
            })

        referrer_name = (
            f"{referrer.first_name or ''} {referrer.last_name or ''}".strip()
            or referrer.username
            or referrer.email
        )

        return {
            "referrer_id": str(referrer.id),
            "referrer_name": referrer_name,
            "referrer_email": referrer.email,
            "referral_code": ref_code,
            "referrals": referred_list,
        }

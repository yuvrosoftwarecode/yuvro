from rest_framework import serializers
from .models import Referral, ReferralCode
from .utils import get_referral_share_url, DEFAULT_INVITE_MESSAGE


class ReferralCodeSerializer(serializers.ModelSerializer):
    link = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()

    class Meta:
        model = ReferralCode
        fields = ["code", "link", "message", "created_at"]

    def get_link(self, obj):
        return get_referral_share_url(obj.code)

    def get_message(self, obj):
        return DEFAULT_INVITE_MESSAGE


class ReferralHistoryItemSerializer(serializers.ModelSerializer):
    referred_name = serializers.SerializerMethodField()
    registration_date = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Referral
        fields = ["id", "referred_name", "registration_date", "status"]

    def get_referred_name(self, obj):
        if obj.referred_user:
            name = f"{obj.referred_user.first_name or ''} {obj.referred_user.last_name or ''}".strip()
            return name or obj.referred_user.username or "Student"
        return obj.referred_email or "Student"

    def get_registration_date(self, obj):
        dt = obj.accepted_at or obj.created_at
        return dt.strftime("%Y-%m-%d") if dt else "-"

    def get_status(self, obj):
        return obj.status.capitalize()


class StudentReferralStatsSerializer(serializers.Serializer):
    total_referrals = serializers.IntegerField()
    accepted_referrals = serializers.IntegerField()
    pending_referrals = serializers.IntegerField()


class AdminReferralSummarySerializer(serializers.Serializer):
    total_referrals = serializers.IntegerField()
    total_accepted = serializers.IntegerField()
    total_pending = serializers.IntegerField()
    total_referring_students = serializers.IntegerField()


class AdminReferrerItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    email = serializers.EmailField()
    referral_code = serializers.CharField()
    total_referred = serializers.IntegerField()
    accepted = serializers.IntegerField()
    pending = serializers.IntegerField()


class AdminReferralDetailItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    referred_name = serializers.CharField()
    referred_email = serializers.CharField()
    registration_date = serializers.DateTimeField()
    status = serializers.CharField()
    referral_code = serializers.CharField()


class AdminReferrerDetailSerializer(serializers.Serializer):
    referrer_id = serializers.CharField()
    referrer_name = serializers.CharField()
    referrer_email = serializers.EmailField()
    referral_code = serializers.CharField()
    referrals = AdminReferralDetailItemSerializer(many=True)

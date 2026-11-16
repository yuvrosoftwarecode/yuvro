"""
Centralized Email Service for Yuvro Labs.

Provides standardized, reusable transactional email sending across the entire application.
Ensures unified visual identity, typography, buttons, and footers aligned with Yuvro Labs design system.
"""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class EmailService:
    """Centralized email service for Yuvro Labs transactional emails."""

    APPLICATION_NAME = "Yuvro Labs"
    DEFAULT_LOGO_URL = "https://marketplace.yuvro.ai/knowledge-tree.png"
    DEFAULT_SUPPORT_EMAIL = "support@yuvrolabs.com"
    DEFAULT_FRONTEND_URL = "https://ylabs.yuvro.ai"

    @classmethod
    def get_application_name(cls) -> str:
        name = os.getenv("APPLICATION_NAME") or os.getenv("APP_NAME") or getattr(settings, "APPLICATION_NAME", None) or getattr(settings, "APP_NAME", None)
        if name and str(name).strip():
            return str(name).strip()
        return cls.APPLICATION_NAME

    @classmethod
    def get_support_email(cls) -> str:
        email = os.getenv("SUPPORT_EMAIL") or getattr(settings, "SUPPORT_EMAIL", None)
        if email and str(email).strip():
            return str(email).strip()
        return cls.DEFAULT_SUPPORT_EMAIL

    @classmethod
    def get_default_from_email(cls) -> str:
        from_email = os.getenv("DEFAULT_FROM_EMAIL") or getattr(settings, "DEFAULT_FROM_EMAIL", None)
        if from_email and str(from_email).strip():
            return str(from_email).strip()
        host_user = os.getenv("EMAIL_HOST_USER") or getattr(settings, "EMAIL_HOST_USER", None)
        if host_user and str(host_user).strip():
            return str(host_user).strip()
        return "contact@yuvro.ai"

    @classmethod
    def get_frontend_url(cls) -> str:
        url = os.getenv("FRONTEND_URL") or getattr(settings, "FRONTEND_URL", None)
        if url and str(url).strip():
            clean = str(url).strip().rstrip("/")
            if not clean.startswith(("http://", "https://")):
                clean = f"https://{clean}"
            return clean
        return cls.DEFAULT_FRONTEND_URL

    @classmethod
    def get_logo_url(cls) -> str:
        custom_logo = os.getenv("EMAIL_LOGO_URL") or getattr(settings, "EMAIL_LOGO_URL", None)
        if custom_logo and str(custom_logo).strip():
            return str(custom_logo).strip()
        return cls.DEFAULT_LOGO_URL

    @classmethod
    def build_base_context(cls, extra_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Build standard base context required by base.html and components."""
        frontend_url = cls.get_frontend_url()
        support_email = cls.get_support_email()
        app_name = cls.get_application_name()
        logo_url = cls.get_logo_url()

        context: Dict[str, Any] = {
            "application_name": app_name,
            "support_email": support_email,
            "logo_url": logo_url,
            "frontend_url": frontend_url,
            "current_year": datetime.utcnow().year,
            "category_label": "",
            "header_badge": "",
            "user_name": "",
            "user_email": "",
            "otp": "",
            "resource_title": "",
            "resource_type": "",
            "expiry_minutes": 5,
            "expiry_hours": 24,
            "reset_link": "",
            "reset_url": "",
            "dashboard_url": f"{frontend_url}/dashboard",
            "security_url": f"{frontend_url}/settings/security",
            "settings_url": f"{frontend_url}/settings",
            "invite_url": f"{frontend_url}/invitations",
            "preheader": "",
        }
        if extra_context:
            context.update(extra_context)
        return context

    @classmethod
    def send_templated_email(
        cls,
        *,
        to_email: str,
        subject: str,
        template_name: str,
        context: Optional[Dict[str, Any]] = None,
        plain_message: Optional[str] = None,
        from_email: Optional[str] = None,
        fail_silently: bool = False,
    ) -> bool:
        """
        Renders an HTML template with unified context and sends it via Django's email backend.
        Generates a clean plain-text fallback automatically if not supplied.
        """
        if not to_email:
            logger.warning("EmailService.send_templated_email called without to_email")
            return False

        full_context = cls.build_base_context(context)
        full_context["subject"] = subject

        try:
            html_message = render_to_string(template_name, full_context)
            if not plain_message:
                plain_message = strip_tags(html_message)
                plain_message = re.sub(r"\n\s*\n+", "\n\n", plain_message).strip()

            sender = from_email or cls.get_default_from_email()

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=sender,
                recipient_list=[to_email],
                html_message=html_message,
                fail_silently=fail_silently,
            )
            logger.info("Successfully sent email '%s' to %s using template %s", subject, to_email, template_name)
            return True
        except Exception as exc:
            logger.error("Failed to send templated email '%s' to %s: %s", subject, to_email, exc, exc_info=True)
            if not fail_silently:
                raise
            return False

    # -------------------------------------------------------------------------
    # Standardized Transactional Methods
    # -------------------------------------------------------------------------

    @classmethod
    def send_registration_otp(
        cls,
        to_email: str,
        otp: str,
        user_name: str = "",
        resource_title: str = "",
        resource_type: str = "registration",
        expiry_minutes: int = 5,
    ) -> bool:
        """Send standardized registration / signup OTP email."""
        app_name = cls.get_application_name()
        subject = f"Verify your email address | {app_name}"

        context = {
            "otp": otp,
            "user_name": user_name,
            "user_email": to_email,
            "resource_title": resource_title,
            "resource_type": resource_type,
            "expiry_minutes": expiry_minutes,
            "category_label": "EMAIL VERIFICATION",
            "footer_reason": f"You are receiving this email to verify your email address for your {app_name} account.",
        }

        return cls.send_templated_email(
            to_email=to_email,
            subject=subject,
            template_name="emails/transactional/registration_otp.html",
            context=context,
        )

    @classmethod
    def send_password_reset(
        cls,
        to_email: str,
        reset_link: str,
        user_name: str = "",
        expiry_hours: int = 24,
    ) -> bool:
        """Send standardized password reset email with secure action button."""
        app_name = cls.get_application_name()
        subject = f"Reset your {app_name} password"

        context = {
            "reset_link": reset_link,
            "reset_url": reset_link,
            "user_name": user_name,
            "user_email": to_email,
            "expiry_hours": expiry_hours,
            "category_label": "ACCOUNT SECURITY",
            "footer_reason": f"You are receiving this security transaction email for your {app_name} account.",
        }

        return cls.send_templated_email(
            to_email=to_email,
            subject=subject,
            template_name="emails/transactional/password_reset.html",
            context=context,
        )

    @classmethod
    def send_password_reset_code(
        cls,
        to_email: str,
        code: str,
        user_name: str = "",
        expiry_minutes: int = 5,
    ) -> bool:
        """Send 6-digit verification code for password reset."""
        app_name = cls.get_application_name()
        subject = f"Reset your {app_name} password"

        context = {
            "otp": code,
            "user_name": user_name,
            "user_email": to_email,
            "resource_title": "Password Reset",
            "resource_type": "password reset",
            "expiry_minutes": expiry_minutes,
            "category_label": "ACCOUNT SECURITY",
            "footer_reason": f"You are receiving this security transaction email for your {app_name} account.",
        }

        return cls.send_templated_email(
            to_email=to_email,
            subject=subject,
            template_name="emails/otp_verification.html",
            context=context,
        )

    @classmethod
    def send_password_change_otp(
        cls,
        to_email: str,
        otp: str,
        user_name: str = "",
        expiry_minutes: int = 5,
    ) -> bool:
        """Send verification code for in-app password change."""
        app_name = cls.get_application_name()
        subject = f"Verify your password change | {app_name}"

        context = {
            "otp": otp,
            "user_name": user_name,
            "user_email": to_email,
            "resource_title": "Password Change",
            "resource_type": "password_change",
            "expiry_minutes": expiry_minutes,
            "category_label": "ACCOUNT SECURITY",
            "footer_reason": f"You are receiving this security transaction email for your {app_name} account.",
        }

        return cls.send_templated_email(
            to_email=to_email,
            subject=subject,
            template_name="emails/otp_verification.html",
            context=context,
        )

    @classmethod
    def send_welcome_email(
        cls,
        to_email: str,
        user_name: str = "",
        dashboard_url: Optional[str] = None,
        role: str = "Student",
    ) -> bool:
        """Send welcome onboarding email to new user."""
        app_name = cls.get_application_name()
        subject = f"Welcome to {app_name}!"

        context = {
            "user_name": user_name,
            "user_email": to_email,
            "dashboard_url": dashboard_url or cls.get_frontend_url(),
            "role": role,
            "category_label": "WELCOME",
            "footer_reason": f"You are receiving this welcome email because you created an account with {app_name}.",
        }

        return cls.send_templated_email(
            to_email=to_email,
            subject=subject,
            template_name="emails/transactional/welcome.html",
            context=context,
        )

    @classmethod
    def send_password_changed_notification(
        cls,
        to_email: str,
        user_name: str = "",
        timestamp: Optional[str] = None,
        device_info: str = "Web Browser",
    ) -> bool:
        """Send notification confirming that account password was changed."""
        app_name = cls.get_application_name()
        subject = f"Your {app_name} password was changed"

        formatted_time = timestamp or datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")

        context = {
            "user_name": user_name,
            "user_email": to_email,
            "timestamp": formatted_time,
            "device_info": device_info,
            "category_label": "ACCOUNT SECURITY",
            "security_url": f"{cls.get_frontend_url()}/settings",
            "footer_reason": f"You are receiving this security alert because the password for your {app_name} account was changed.",
        }

        return cls.send_templated_email(
            to_email=to_email,
            subject=subject,
            template_name="emails/transactional/password_changed.html",
            context=context,
        )

    @classmethod
    def send_email_change_notification(
        cls,
        to_email: str,
        old_email: str,
        new_email: str,
        user_name: str = "",
        timestamp: Optional[str] = None,
    ) -> bool:
        """Send security notification regarding account email change."""
        app_name = cls.get_application_name()
        subject = f"Your {app_name} email address was updated"

        formatted_time = timestamp or datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")

        context = {
            "user_name": user_name,
            "old_email": old_email,
            "new_email": new_email,
            "timestamp": formatted_time,
            "category_label": "ACCOUNT SECURITY",
            "footer_reason": f"You are receiving this security notification regarding changes to your {app_name} account credentials.",
        }

        return cls.send_templated_email(
            to_email=to_email,
            subject=subject,
            template_name="emails/transactional/email_change.html",
            context=context,
        )

    @classmethod
    def send_security_alert(
        cls,
        to_email: str,
        user_name: str = "",
        event_type: str = "New Device Sign-in",
        location: str = "Unknown",
        ip_address: Optional[str] = None,
        timestamp: Optional[str] = None,
    ) -> bool:
        """Send alert for unrecognized login or critical security event."""
        app_name = cls.get_application_name()
        subject = f"Security alert for your {app_name} account"

        formatted_time = timestamp or datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")

        context = {
            "user_name": user_name,
            "event_type": event_type,
            "location": location,
            "ip_address": ip_address,
            "timestamp": formatted_time,
            "category_label": "SECURITY ALERT",
            "settings_url": f"{cls.get_frontend_url()}/settings",
            "footer_reason": f"You are receiving this critical security alert regarding activity on your {app_name} account.",
        }

        return cls.send_templated_email(
            to_email=to_email,
            subject=subject,
            template_name="emails/transactional/account_security_alert.html",
            context=context,
        )

    @classmethod
    def send_invitation(
        cls,
        to_email: str,
        organization_name: str = "Yuvro Labs",
        inviter_name: str = "",
        invite_url: str = "",
        role: str = "Member",
        user_name: str = "",
        expiry_days: int = 7,
    ) -> bool:
        """Send team or organization invitation."""
        app_name = cls.get_application_name()
        subject = f"Invitation to join {organization_name} on {app_name}"

        context = {
            "user_name": user_name,
            "organization_name": organization_name,
            "inviter_name": inviter_name,
            "invite_url": invite_url or cls.get_frontend_url(),
            "role": role,
            "expiry_days": expiry_days,
            "category_label": "INVITATION",
            "footer_reason": f"You are receiving this invitation to collaborate on {app_name}.",
        }

        return cls.send_templated_email(
            to_email=to_email,
            subject=subject,
            template_name="emails/transactional/invitation.html",
            context=context,
        )

    @classmethod
    def send_evaluation_invitation(
        cls,
        to_email: str,
        evaluation_title: str,
        eval_link: str,
        candidate_name: str = "Candidate",
        is_reminder: bool = False,
        custom_body: Optional[str] = None,
        custom_subject: Optional[str] = None,
        duration_minutes: Optional[int] = None,
    ) -> bool:
        """Send skill evaluation invitation or reminder to candidates."""
        app_name = cls.get_application_name()

        if custom_subject:
            subject = custom_subject
        elif is_reminder:
            subject = f"Reminder: Complete your evaluation — {evaluation_title} | {app_name}"
        else:
            subject = f"Invitation: Skill Evaluation — {evaluation_title} | {app_name}"

        context = {
            "name": candidate_name,
            "user_name": candidate_name,
            "evaluation": {
                "title": evaluation_title,
                "duration_minutes": duration_minutes,
            },
            "eval_link": eval_link,
            "is_reminder": is_reminder,
            "custom_body": custom_body,
            "category_label": "EVALUATION REMINDER" if is_reminder else "EVALUATION INVITATION",
            "footer_reason": f"You are receiving this invitation because you were registered for a {app_name} skill evaluation.",
        }

        return cls.send_templated_email(
            to_email=to_email,
            subject=subject,
            template_name="emails/transactional/evaluation_invitation.html",
            context=context,
        )

    @classmethod
    def send_support_feedback(
        cls,
        subject: str,
        description: str,
        sender_email: Optional[str] = None,
        sender_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Send user improvement suggestion / support feedback email to support@yuvrolabs.com."""
        to_email = cls.get_support_email()
        app_name = cls.get_application_name()
        email_subject = f"[{app_name} Feedback] {subject.strip()}"

        sender_display = sender_name or "Anonymous / Platform User"
        sender_email_display = sender_email or "Not provided"

        plain_lines = [
            f"=== {app_name} User Feedback & Improvement Suggestion ===",
            "",
            f"Subject: {subject.strip()}",
            f"From: {sender_display} <{sender_email_display}>",
        ]
        if metadata:
            for k, v in metadata.items():
                if v:
                    plain_lines.append(f"{k.replace('_', ' ').capitalize()}: {v}")

        plain_lines.extend([
            "",
            "--- Feedback / Description ---",
            description.strip(),
            "",
            "-----------------------------",
            f"Sent automatically from {app_name} feedback widget.",
        ])
        plain_message = "\n".join(plain_lines)

        meta_rows_html = ""
        if metadata:
            for k, v in metadata.items():
                if v:
                    label = k.replace("_", " ").title()
                    meta_rows_html += f"""
                    <tr>
                        <td style="padding: 6px 12px; font-weight: 600; color: #4b5563; width: 140px; font-size: 13px;">{label}:</td>
                        <td style="padding: 6px 12px; color: #111827; font-size: 13px;">{v}</td>
                    </tr>
                    """

        html_message = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{email_subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <tr>
            <td style="background-color: #f97316; padding: 20px 24px;">
                <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.02em;">{app_name} — Improvement Suggestion</h1>
                <p style="margin: 4px 0 0; color: #ffedd5; font-size: 13px;">New user feedback received</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 24px;">
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 12px; font-weight: 600; color: #4b5563; width: 140px; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Subject:</td>
                            <td style="padding: 10px 12px; color: #111827; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f3f4f6;">{subject.strip()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; font-weight: 600; color: #4b5563; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Submitted By:</td>
                            <td style="padding: 8px 12px; color: #111827; font-size: 13px; border-bottom: 1px solid #f3f4f6;">{sender_display} &lt;{sender_email_display}&gt;</td>
                        </tr>
                        {meta_rows_html}
                    </table>
                </div>

                <div style="margin-bottom: 24px;">
                    <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0 0 10px;">Improvement Suggestion / Description</h2>
                    <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-left: 4px solid #f97316; border-radius: 6px; padding: 16px; font-size: 14px; line-height: 1.6; color: #1f2937; white-space: pre-wrap;">{description.strip()}</div>
                </div>

                <div style="border-top: 1px solid #f3f4f6; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;">
                    Delivered to <strong>support@yuvrolabs.com</strong> via {app_name} support system.
                </div>
            </td>
        </tr>
    </table>
</body>
</html>"""

        sender = cls.get_default_from_email()
        try:
            send_mail(
                subject=email_subject,
                message=plain_message,
                from_email=sender,
                recipient_list=[to_email],
                html_message=html_message,
                fail_silently=False,
            )
            logger.info("Successfully dispatched support feedback email to %s", to_email)
            return True
        except Exception as exc:
            logger.error("Failed to send support feedback email: %s", exc, exc_info=True)
            return False

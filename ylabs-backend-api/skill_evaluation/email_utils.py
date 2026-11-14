import logging
from django.conf import settings
from core.email_service import EmailService

logger = logging.getLogger(__name__)


def send_evaluation_email(evaluation, emails, is_reminder=False, custom_body=None, custom_subject=None):
    """
    Sends standardized evaluation invitation or reminder emails using Yuvro Labs email design system.
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3002').rstrip('/')
    eval_link = f"{frontend_url}/evaluation?e={evaluation.id}"
    app_name = getattr(settings, 'APPLICATION_NAME', 'Yuvro Labs')

    for email_entry in emails:
        # Resolve email string and name
        if isinstance(email_entry, dict):
            email = email_entry.get("email")
            name = email_entry.get("name") or ""
        else:
            email = email_entry
            name = ""

        if not name and "@" in str(email):
            name_part = str(email).split("@")[0]
            name = " ".join(part.capitalize() for part in name_part.split("."))

        if not name:
            name = "Candidate"

        eval_title = getattr(evaluation, "title", str(evaluation))

        if is_reminder:
            default_subject = f"Reminder: Complete your evaluation — {eval_title} | {app_name}"
            body_text = f"You are receiving a reminder to complete your skill evaluation: <strong>{eval_title}</strong> on <strong>{app_name}</strong>."
        else:
            default_subject = f"Invitation: Skill Evaluation — {eval_title} | {app_name}"
            body_text = f"You have been invited to complete a skill evaluation: <strong>{eval_title}</strong> on <strong>{app_name}</strong>."

        subject = custom_subject or default_subject

        if custom_body:
            formatted_body = custom_body.replace("{{evaluation}}", f"<strong>{eval_title}</strong>")
            formatted_body = formatted_body.replace("{{company}}", app_name)
            formatted_body = formatted_body.replace("{{link}}", f'<a href="{eval_link}" style="color: #F7931E; text-decoration: underline;">Start Evaluation</a>')
            formatted_body = formatted_body.replace("{{name}}", name)
            formatted_body = formatted_body.replace('\\n', '<br>').replace('\n', '<br>')
        else:
            formatted_body = body_text

        duration_minutes = getattr(evaluation, "duration_minutes", None)

        try:
            EmailService.send_evaluation_invitation(
                to_email=email,
                evaluation_title=eval_title,
                eval_link=eval_link,
                candidate_name=name,
                is_reminder=is_reminder,
                custom_body=formatted_body,
                custom_subject=subject,
                duration_minutes=duration_minutes,
            )
            logger.info("Successfully sent %s email to %s", "reminder" if is_reminder else "invite", email)
        except Exception as exc:
            logger.error("Failed to send %s email to %s: %s", "reminder" if is_reminder else "invite", email, exc, exc_info=True)

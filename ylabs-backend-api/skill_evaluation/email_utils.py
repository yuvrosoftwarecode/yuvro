import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

def send_evaluation_email(evaluation, emails, is_reminder=False, custom_body=None, custom_subject=None):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3002')
    eval_link = f"{frontend_url}/evaluation?e={evaluation.id}"
    
    for email_entry in emails:
        # Resolve email string and name
        if isinstance(email_entry, dict):
            email = email_entry.get("email")
            name = email_entry.get("name") or ""
        else:
            email = email_entry
            name = ""
            
        if not name and "@" in email:
            name_part = email.split("@")[0]
            name = " ".join(part.capitalize() for part in name_part.split("."))
            
        if not name:
            name = "Candidate"
    
        if is_reminder:
            subject = custom_subject or f"Reminder: Yuvro Evaluation Test — {evaluation.title}"
            title = "Evaluation Reminder"
            body_text = f"You are receiving a reminder to complete your Yuvro Evaluation: <strong>{evaluation.title}</strong>."
        else:
            subject = custom_subject or f"Yuvro Evaluation Test — {evaluation.title}"
            title = "Evaluation Invitation"
            body_text = f"You have been invited to complete a Yuvro Evaluation: <strong>{evaluation.title}</strong>."
            
        if custom_body:
            final_body = custom_body.replace("{{evaluation}}", f"<strong>{evaluation.title}</strong>")
            final_body = final_body.replace("{{company}}", "Yuvro")
            final_body = final_body.replace("{{link}}", f'<a href="{eval_link}">Start Evaluation</a>')
            final_body = final_body.replace("{{name}}", name)
            final_body = final_body.replace('\\n', '<br>').replace('\n', '<br>')
        else:
            final_body = body_text
            
        plain_body = final_body.replace('<strong>', '').replace('</strong>', '').replace('<br>', '\n')
        link_tag = f'<a href="{eval_link}">Start Evaluation</a>'
        plain_body = plain_body.replace(link_tag, eval_link)
        
        message = f"Hello {name},\n\n{plain_body}\n\nBest,\nYuvro Team"
        html_message = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #F5A623;">Yuvro {title}</h2>
            <p>{final_body}</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{eval_link}" style="background-color: #F5A623; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Evaluation</a>
            </p>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="{eval_link}">{eval_link}</a></p>
            <p>Best regards,<br>Yuvro Team</p>
        </div>
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
                html_message=html_message
            )
            logger.info(f"Successfully sent {'reminder' if is_reminder else 'invite'} email to {email}")
        except Exception as e:
            logger.error(f"Failed to send {'reminder' if is_reminder else 'invite'} email to {email}: {e}")

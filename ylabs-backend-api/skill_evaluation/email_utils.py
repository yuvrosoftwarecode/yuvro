import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

def send_evaluation_email(evaluation, emails, is_reminder=False, custom_body=None, custom_subject=None):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3002')
    eval_link = f"{frontend_url}/evaluation?e={evaluation.id}"
    
    if is_reminder:
        subject = f"Reminder: Yuvro Evaluation Test – {evaluation.title}"
        title = "Evaluation Reminder"
        body_text = f"You are receiving a reminder to complete your Yuvro Evaluation: <strong>{evaluation.title}</strong>."
    else:
        subject = f"Yuvro Evaluation Test – {evaluation.title}"
        title = "Evaluation Invitation"
        body_text = f"You have been invited to complete a Yuvro Evaluation: <strong>{evaluation.title}</strong>."
        
    if custom_body:
        # replace placeholders if any
        # {{name}} is tricky if we don't have individual names, we'll replace with "Candidate" for now if not processed per-email
        # but in views we might not have it either. We'll just pass the string.
        body_text = custom_body.replace("{{evaluation}}", f"<strong>{evaluation.title}</strong>")
        body_text = body_text.replace("{{company}}", "Yuvro")
        body_text = body_text.replace("{{link}}", f'<a href="{eval_link}">Start Evaluation</a>')
        body_text = body_text.replace('\n', '<br>')
    
    for email in emails:
        # if custom body has {{name}}, replace it here with email prefix
        final_body = body_text.replace("{{name}}", email.split("@")[0])
        
        plain_body = final_body.replace('<strong>', '').replace('</strong>', '').replace('<br>', '\n')
        link_tag = f'<a href="{eval_link}">Start Evaluation</a>'
        plain_body = plain_body.replace(link_tag, eval_link)
        
        message = f"Hello,\n\n{plain_body}\n\nBest,\nYuvro Team"
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

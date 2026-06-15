from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import JobApplication, Job
from assessment.models import JobTest
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=JobApplication)
def invalidate_job_application_cache_on_save(sender, instance, **kwargs):
    """Invalidate cache when a job application is saved"""
    if instance.job_id:
        cache_key = f"job_applications_count_{instance.job_id}"
        cache.delete(cache_key)
        logger.info(
            f"Invalidated cache for job {instance.job_id} after application save"
        )


@receiver(post_delete, sender=JobApplication)
def invalidate_job_application_cache_on_delete(sender, instance, **kwargs):
    """Invalidate cache when a job application is deleted"""
    if instance.job_id:
        cache_key = f"job_applications_count_{instance.job_id}"
        cache.delete(cache_key)
        logger.info(
            f"Invalidated cache for job {instance.job_id} after application delete"
        )

@receiver(post_save, sender=Job)
def create_or_update_job_test(sender, instance, created, **kwargs):
    """Automatically create or update JobTest when a Job is saved"""
    job_test, _ = JobTest.objects.get_or_create(job=instance, defaults={"created_by": instance.created_by})
    
    # Sync relevant fields
    job_test.title = f"Assessment for {instance.title}"
    job_test.company_name = instance.company.name if instance.company else ""
    job_test.position_title = instance.title
    job_test.description = f"Job assessment for {instance.title} at {job_test.company_name}"
    job_test.publish_status = "active"
    
    # Proctoring and rules
    job_test.enable_proctoring = instance.enable_proctoring
    job_test.tab_switch_threshold = instance.tab_switch_threshold
    job_test.violation_threshold = instance.violation_threshold
    
    # Questions config
    if instance.screening_questions_config:
        job_test.questions_config = instance.screening_questions_config
    if instance.screening_questions_random_config:
        job_test.questions_random_config = instance.screening_questions_random_config
        
    job_test.save()
    logger.info(f"Synced JobTest for Job {instance.id}")


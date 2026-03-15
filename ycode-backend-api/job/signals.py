from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import JobApplication
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

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from course.models import Subject
from .models import CertificationExam, SkillTest, Contest, JobTest

# Auto-creation logic removed as per new requirements (Manual Creation only)

def sync_questions_active_status():
    from course.models import Question
    from .models import SkillTest, Contest, JobTest, CertificationExam
    
    active_ids = set()
    
    # Helper to extract IDs from JSON config
    def extract_ids_from_config(config):
        if not config or not isinstance(config, dict):
            return
        for q_list in config.values():
            if isinstance(q_list, list):
                for qid in q_list:
                    if qid:
                        active_ids.add(str(qid))

    # Extract from all tests/assessments
    for config in SkillTest.objects.values_list('questions_config', flat=True):
        extract_ids_from_config(config)
        
    for config in Contest.objects.values_list('questions_config', flat=True):
        extract_ids_from_config(config)
        
    for config in JobTest.objects.values_list('questions_config', flat=True):
        extract_ids_from_config(config)
        
    for config in CertificationExam.objects.values_list('questions_config', flat=True):
        extract_ids_from_config(config)

    # Bulk update in database
    # 1. Update questions that are active
    Question.objects.filter(id__in=active_ids).update(is_active=True)
    # 2. Update questions that are not active
    Question.objects.exclude(id__in=active_ids).update(is_active=False)


@receiver(post_save, sender=SkillTest)
@receiver(post_delete, sender=SkillTest)
@receiver(post_save, sender=Contest)
@receiver(post_delete, sender=Contest)
@receiver(post_save, sender=JobTest)
@receiver(post_delete, sender=JobTest)
@receiver(post_save, sender=CertificationExam)
@receiver(post_delete, sender=CertificationExam)
def update_questions_active_status_on_test_change(sender, instance, **kwargs):
    sync_questions_active_status()


@receiver(post_save, sender='assessment.SkillTestSubmission')
def update_user_progress_on_submission(sender, instance, **kwargs):
    from course.models import UserSubjectProgress
    skill_test = instance.skill_test
    if skill_test and skill_test.subject:
        if instance.status in ["completed", "submitted", "evaluated"]:
            if skill_test.unit:
                progress_qs = UserSubjectProgress.objects.filter(
                    user=instance.user,
                    unit=skill_test.unit
                )
            else:
                progress_qs = UserSubjectProgress.objects.filter(
                    user=instance.user,
                    subject=skill_test.subject
                )
            
            for progress in progress_qs:
                progress.calculate_progress()
                progress.save()

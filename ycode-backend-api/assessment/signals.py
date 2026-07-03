from django.db.models.signals import post_delete
from django.dispatch import receiver
from course.models import Question
from .models import (
    SkillTest,
    Contest,
    JobTest,
    CertificationExam,
)


@receiver(post_delete, sender=Question)
def handle_question_deletion(sender, instance, **kwargs):
    """
    Safely purges the deleted Question's ID from all Assessment configs.
    Since Assessment Models store Question references within JSON dictionaries
    (questions_config -> {'mcq_single': ['uuid1', ...]}) instead of hard foreign keys,
    standard database cascading doesn't reach them. We catch the deletion here
    and dynamically purge the dead UUID to prevent 'Ghost Questions'.
    """
    deleted_id_str = str(instance.id)

    # All assessment models that inherit `questions_config` from BaseAssessmentModel
    assessment_models = [
        SkillTest,
        Contest,
        JobTest,
        CertificationExam,
    ]

    for model_class in assessment_models:
        # We only need to check models that actually have configurations
        # Could optimize this slightly by checking JSON paths if using Postgres exclusively,
        # but since questions_config is usually small per assessment, a simple Python-side loop works on all DBs.
        affected_instances = []

        # Find any instances that aren't empty (avoids loading thousands of empty assessments)
        assessments_with_config = model_class.objects.exclude(questions_config={}).exclude(questions_config__isnull=True)

        for assessment in assessments_with_config:
            config = assessment.questions_config
            needs_save = False

            if isinstance(config, dict):
                for category, uuids in config.items():
                    if isinstance(uuids, list) and deleted_id_str in uuids:
                        uuids.remove(deleted_id_str)
                        needs_save = True

            if needs_save:
                assessment.questions_config = config
                affected_instances.append(assessment)

        if affected_instances:
            # Update all affected records within this model cluster
            model_class.objects.bulk_update(affected_instances, ["questions_config"])

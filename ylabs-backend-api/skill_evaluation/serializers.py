from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import RecruiterActivityLog
from .models import LabQuestionBankTask
from django.contrib.auth import get_user_model
from core.storage import build_public_url
from .models import (
    Evaluation,
    EvaluationSection,
    LabQuestionBank,
    KnowledgeQuestionBank,
    QuestionDomain,
    ExperienceLevel,
    Difficulty,
    UserEvaluationSubmission,
    EvaluationSectionType,
    FollowUpConfig,
    FollowUpCandidate
)
import logging
from lab.workspace_manager import provision_evaluation_lab_starter_repo

logger = logging.getLogger(__name__)

import re

def provision_evaluation_labs(evaluation):
    for section in evaluation.sections.all():
        if section.type == EvaluationSectionType.LAB:
            for question_data in section.questions:
                q_id = None
                if isinstance(question_data, dict):
                    q_id = question_data.get('id')
                elif isinstance(question_data, str):
                    match = re.search(r'[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', question_data)
                    if match:
                        q_id = match.group(0)
                    else:
                        q_id = question_data
                else:
                    q_id = str(question_data)
                    
                if not q_id:
                    continue
                    
                try:
                    lab = LabQuestionBank.objects.get(id=q_id)
                    if lab.git_repo_starter_url:
                        provision_evaluation_lab_starter_repo(
                            evaluation.id, 
                            lab.id, 
                            lab.git_repo_starter_url, 
                            branch=lab.git_repo_starter_branch
                        )
                except LabQuestionBank.DoesNotExist:
                    logger.warning(f"LabQuestionBank with id {q_id} not found.")
                except Exception as e:
                    logger.error(f"Error provisioning lab for evaluation {evaluation.id}: {e}")


class SubmissionUserSerializer(serializers.ModelSerializer):
    resume_url = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    
    class Meta:
        model = get_user_model()
        fields = ['id', 'email', 'first_name', 'last_name', 'resume_url', 'phone']

    def get_resume_url(self, obj):
        if hasattr(obj, 'profile') and obj.profile.resume_file:
            return obj.profile.resume_file
        return None

    def get_phone(self, obj):
        if hasattr(obj, 'profile') and hasattr(obj.profile, 'phone'):
            return obj.profile.phone
        return None

class UserEvaluationSubmissionSerializer(serializers.ModelSerializer):
    user = SubmissionUserSerializer(read_only=True)

    lab_submissions = serializers.SerializerMethodField()
    knowledge_submissions = serializers.SerializerMethodField()

    class Meta:
        model = UserEvaluationSubmission
        fields = '__all__'

    def get_lab_submissions(self, obj):
        from .models import UserLabQuestionBankSubmission
        from .serializers import UserLabQuestionBankSubmissionSerializer
        subs = UserLabQuestionBankSubmission.objects.filter(evaluation=obj.evaluation, user=obj.user)
        return UserLabQuestionBankSubmissionSerializer(subs, many=True).data

    def get_knowledge_submissions(self, obj):
        from .models import UserKnowledgeAssessmentSubmission
        from .serializers import UserKnowledgeAssessmentSubmissionSerializer
        subs = UserKnowledgeAssessmentSubmission.objects.filter(evaluation=obj.evaluation, user=obj.user)
        return UserKnowledgeAssessmentSubmissionSerializer(subs, many=True).data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        
        def process_events(events):
            if not isinstance(events, list):
                return events
            for event in events:
                if isinstance(event, dict):
                    if event.get("image_path"):
                        event["image_path"] = build_public_url(event["image_path"])
                    if event.get("screen_path"):
                        event["screen_path"] = build_public_url(event["screen_path"])
            return events

        if ret.get("proctoring_events"):
            ret["proctoring_events"] = process_events(ret["proctoring_events"])
        if ret.get("general_events"):
            ret["general_events"] = process_events(ret["general_events"])

        # Ensure passport_photo_captured and initial_screenshot_captured are included
        # even if an earlier concurrent request race omitted them from general_events
        all_evts = (ret.get("general_events") or []) + (ret.get("proctoring_events") or [])
        has_passport = any(
            isinstance(e, dict) and (e.get("activity_type") == "passport_photo_captured" or "passport_" in str(e.get("image_path") or ""))
            for e in all_evts
        )
        has_screenshot = any(
            isinstance(e, dict) and (e.get("activity_type") == "initial_screenshot_captured" or "screenshot_" in str(e.get("screen_path") or ""))
            for e in all_evts
        )
        if (not has_passport or not has_screenshot) and instance.user and instance.evaluation:
            try:
                from django.core.files.storage import default_storage
                from django.conf import settings
                from django.utils import timezone
                app_name = (getattr(settings, "APP_NAME", "") or "").strip().strip("/")
                prefix = f"{app_name}/" if app_name else ""
                dir_path = f"{prefix}{instance.user.id}/skill_evaluation/{instance.evaluation.id}/attempt-1"
                _, files = default_storage.listdir(dir_path)
                if not has_passport:
                    passport_file = next((f for f in sorted(files) if f.startswith("passport_")), None)
                    if passport_file:
                        p_path = f"{dir_path}/{passport_file}"
                        passport_event = {
                            "timestamp": instance.created_at.isoformat() if instance.created_at else timezone.now().isoformat(),
                            "activity_type": "passport_photo_captured",
                            "meta_data": {"source": "proctoring_gate"},
                            "image_path": build_public_url(p_path) or p_path
                        }
                        if not isinstance(ret.get("general_events"), list):
                            ret["general_events"] = []
                        ret["general_events"].insert(0, passport_event)
                if not has_screenshot:
                    screenshot_file = next((f for f in sorted(files) if f.startswith("screenshot_")), None)
                    if screenshot_file:
                        s_path = f"{dir_path}/{screenshot_file}"
                        screenshot_event = {
                            "timestamp": instance.created_at.isoformat() if instance.created_at else timezone.now().isoformat(),
                            "activity_type": "initial_screenshot_captured",
                            "meta_data": {"source": "proctoring_gate"},
                            "screen_path": build_public_url(s_path) or s_path
                        }
                        if not isinstance(ret.get("general_events"), list):
                            ret["general_events"] = []
                        ret["general_events"].insert(0, screenshot_event)
            except Exception as e:
                logger.debug(f"Error checking storage for identity snapshots: {e}")
            
        return ret

class EvaluationSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationSection
        fields = ['id', 'title', 'description', 'order_index', 'type', 'questions', 'proctoring_config']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.type == EvaluationSectionType.LAB and isinstance(ret.get('questions'), list):
            enriched = []
            for q in ret['questions']:
                if isinstance(q, dict) and q.get('id'):
                    lab = LabQuestionBank.objects.filter(id=q['id']).first()
                    if lab and lab.solution:
                        q_copy = dict(q)
                        if not q_copy.get('solution'):
                            q_copy['solution'] = lab.solution
                        if not q_copy.get('solution_files') and isinstance(lab.solution, dict):
                            q_copy['solution_files'] = [{'path': k, 'code': v} for k, v in lab.solution.items()]
                        enriched.append(q_copy)
                        continue
                enriched.append(q)
            ret['questions'] = enriched
        return ret

class EvaluationSerializer(serializers.ModelSerializer):
    sections = EvaluationSectionSerializer(many=True, required=False)
    created_by = serializers.SerializerMethodField()
    completed_candidates_count = serializers.SerializerMethodField()
    candidates_invited_count = serializers.SerializerMethodField()
    total_candidates_count = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation
        fields = [
            'id', 'title', 'description', 'is_public', 'domain', 
            'candidate_invited_emails', 'experience_level', 
            'maximum_attempts', 'start_datetime', 'expiry_datetime', 'is_published', 
            'settings', 'sections', 'created_at', 'updated_at', 'created_by',
            'completed_candidates_count', 'candidates_invited_count', 'total_candidates_count'
        ]

    def validate_domain(self, value):
        if not value:
            return QuestionDomain.OTHER
        normalized = str(value).strip().upper().replace(" ", "_")
        valid_choices = [c[0] for c in QuestionDomain.choices]
        if normalized in valid_choices:
            return normalized
        return QuestionDomain.OTHER

    def get_created_by(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return name or obj.created_by.email or obj.created_by.username
        return None

    def get_completed_candidates_count(self, obj):
        return obj.submissions.count()

    def get_candidates_invited_count(self, obj):
        followup_emails = set(obj.followup_candidates.values_list('email', flat=True))
        invited_emails = set(obj.candidate_invited_emails or [])
        return len(followup_emails.union(invited_emails))

    def get_total_candidates_count(self, obj):
        followup_emails = set(obj.followup_candidates.values_list('email', flat=True))
        invited_emails = set(obj.candidate_invited_emails or [])
        submission_emails = set(obj.submissions.values_list('user__email', flat=True))
        return len(followup_emails.union(invited_emails).union(submission_emails))

    def create(self, validated_data):
        sections_data = validated_data.pop('sections', [])
        evaluation = Evaluation.objects.create(**validated_data)
        for section_data in sections_data:
            EvaluationSection.objects.create(evaluation=evaluation, created_by=evaluation.created_by, **section_data)
        
        provision_evaluation_labs(evaluation)
        return evaluation

    def update(self, instance, validated_data):
        sections_data = validated_data.pop('sections', None)
        instance = super().update(instance, validated_data)
        
        if sections_data is not None:
            # Simple replace strategy for sections: delete old, create new
            instance.sections.all().delete()
            for section_data in sections_data:
                EvaluationSection.objects.create(evaluation=instance, created_by=instance.created_by, **section_data)
                
        provision_evaluation_labs(instance)
        return instance


class LabQuestionBankTaskSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False, allow_null=True)
    parent_task_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    parent_task = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = LabQuestionBankTask
        fields = '__all__'
        read_only_fields = ['lab_question_bank', 'created_by', 'updated_by']

    def to_representation(self, obj):
        ret = super().to_representation(obj)
        parent_id = None
        if hasattr(obj, 'parent_task_id') and obj.parent_task_id:
            parent_id = str(obj.parent_task_id)
        elif hasattr(obj, 'parent_task') and obj.parent_task:
            parent_id = str(obj.parent_task.id)
        elif isinstance(obj.scoring_rules, dict):
            parent_id = obj.scoring_rules.get('parent_task_id') or obj.scoring_rules.get('parent_task')

        ret['parent_task_id'] = str(parent_id) if parent_id else None
        ret['parent_task'] = str(parent_id) if parent_id else None
        return ret

class LabQuestionBankSerializer(serializers.ModelSerializer):
    tasks = LabQuestionBankTaskSerializer(many=True, required=False)
    
    class Meta:
        model = LabQuestionBank
        fields = '__all__'
        read_only_fields = ['created_by', 'updated_by']

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if "backend_frameworks" in data and isinstance(data["backend_frameworks"], list):
                data["backend_frameworks"] = [
                    "DJANGO_REST_FRAMEWORK" if f == "DJANGO_REST_FRAMEWOR" else f
                    for f in data["backend_frameworks"]
                ]
            if "domain" in data and isinstance(data["domain"], str):
                d = data["domain"].strip().upper().replace(" ", "_")
                if d in ("PAYMENTS", "PAYMENT_GATEWAY"):
                    d = "PAYMENT"
                elif d in ("SUPPLYCHAIN", "LOGISTICS"):
                    d = "SUPPLY_CHAIN"
            if "solution_files" in data and isinstance(data["solution_files"], list):
                sol_dict = {}
                for item in data["solution_files"]:
                    if isinstance(item, dict) and item.get("path") and item.get("code"):
                        sol_dict[item["path"].strip()] = item["code"]
                if sol_dict and "solution" not in data:
                    data["solution"] = sol_dict
        return super().to_internal_value(data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if isinstance(ret.get("backend_frameworks"), list):
            ret["backend_frameworks"] = [
                "DJANGO_REST_FRAMEWORK" if f == "DJANGO_REST_FRAMEWOR" else f
                for f in ret["backend_frameworks"]
            ]
        sol = ret.get("solution")
        if isinstance(sol, dict):
            ret["solution_files"] = [{"path": k, "code": v} for k, v in sol.items()]
        return ret

    def create(self, validated_data):
        tasks_data = validated_data.pop('tasks', [])
        question_bank = LabQuestionBank.objects.create(**validated_data)
        self._save_tasks_with_dependencies(question_bank, tasks_data)
        return question_bank

    def update(self, instance, validated_data):
        tasks_data = validated_data.pop('tasks', None)
        
        # Update normal fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tasks_data is not None:
            # Simple approach: delete existing and recreate
            # In production, you might want to match by ID to preserve existing objects
            instance.tasks.all().delete()
            self._save_tasks_with_dependencies(instance, tasks_data)
                
        return instance

    def _save_tasks_with_dependencies(self, question_bank, tasks_data):
        import uuid as uuid_lib
        created_tasks = []
        id_map = {}
        index_map = {}
        for idx, raw_task_data in enumerate(tasks_data):
            task_data = dict(raw_task_data)
            raw_id = task_data.pop('id', None)
            parent_ref = task_data.pop('parent_task', None)
            if parent_ref is None:
                parent_ref = task_data.pop('parent_task_id', None)

            # Ensure parent_task fields are not passed to model create directly
            task_data.pop('parent_task', None)
            task_data.pop('parent_task_id', None)

            scoring_rules = task_data.get('scoring_rules') or {}
            if not isinstance(scoring_rules, dict):
                scoring_rules = {}
            if parent_ref:
                scoring_rules['parent_task_id'] = str(parent_ref)
            task_data['scoring_rules'] = scoring_rules

            create_kwargs = dict(task_data)
            if raw_id:
                try:
                    uuid_lib.UUID(str(raw_id))
                    create_kwargs['id'] = raw_id
                except Exception:
                    pass

            task_obj = LabQuestionBankTask.objects.create(
                lab_question_bank=question_bank,
                created_by=question_bank.created_by,
                **create_kwargs
            )
            created_tasks.append((task_obj, parent_ref))
            if raw_id:
                id_map[str(raw_id)] = task_obj
            id_map[str(task_obj.id)] = task_obj
            index_map[idx] = task_obj
            index_map[str(idx)] = task_obj
            index_map[task_obj.order_index] = task_obj
            index_map[str(task_obj.order_index)] = task_obj
            if task_obj.title:
                index_map[task_obj.title.strip().lower()] = task_obj

        for task_obj, parent_ref in created_tasks:
            if not parent_ref:
                continue
            parent_instance = None
            str_ref = str(parent_ref).strip()
            if str_ref in id_map:
                parent_instance = id_map[str_ref]
            elif str_ref.startswith("task_idx_") and str_ref.replace("task_idx_", "") in index_map:
                parent_instance = index_map[str_ref.replace("task_idx_", "")]
            elif str_ref.startswith("task_") and str_ref.replace("task_", "") in index_map:
                parent_instance = index_map[str_ref.replace("task_", "")]
            elif str_ref in index_map:
                parent_instance = index_map[str_ref]
            elif str_ref.lower() in index_map:
                parent_instance = index_map[str_ref.lower()]
            else:
                try:
                    parent_instance = LabQuestionBankTask.objects.filter(id=parent_ref, lab_question_bank=question_bank).first()
                except Exception:
                    parent_instance = None

            if parent_instance and parent_instance.id != task_obj.id:
                task_obj.parent_task = parent_instance
                rules = dict(task_obj.scoring_rules or {})
                rules['parent_task_id'] = str(parent_instance.id)
                task_obj.scoring_rules = rules
                task_obj.save(update_fields=['parent_task', 'scoring_rules'])

from .models import UserLabQuestionBankSubmission, UserKnowledgeAssessmentSubmission

class UserLabQuestionBankSubmissionSerializer(serializers.ModelSerializer):
    time_taken = serializers.CharField(read_only=True)

    class Meta:
        model = UserLabQuestionBankSubmission
        fields = '__all__'
        read_only_fields = ('user',)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        sol = (data.get('solution') or '').strip()
        if not sol or sol.startswith('{') or "@@ -1," not in sol:
            try:
                import os, subprocess
                from django.conf import settings
                user_dir = os.path.join(
                    settings.WORKSPACES_ROOT,
                    "evaluation",
                    str(instance.evaluation_id),
                    "users",
                    str(instance.user_id),
                    "labs",
                    str(instance.lab_question_id)
                )
                if os.path.exists(user_dir):
                    subprocess.run(["git", "add", "-A", "-N"], cwd=user_dir, check=True, capture_output=True)
                    diff_output = subprocess.check_output(
                        [
                            "git", "diff", "-U99999", "HEAD", "--", ".",
                            ":(exclude)*.sqlite3", ":(exclude)*.db", ":(exclude)*.sqlite",
                            ":(exclude)*.db-journal", ":(exclude)*.db-wal", ":(exclude)*.dbsqlite3",
                            ":(exclude)*.zip", ":(exclude)*.tar", ":(exclude)*.gz",
                            ":(exclude)*.pyc", ":(exclude)*__pycache__*",
                            ":(exclude)*.log", ":(exclude)*bash_history*",
                            ":(exclude)README.md", ":(exclude).gitignore", ":(exclude)requirements.txt"
                        ],
                        cwd=user_dir,
                        stderr=subprocess.DEVNULL
                    ).decode()
                    if diff_output and diff_output.strip():
                        data['solution'] = diff_output
                        instance.solution = diff_output
                        instance.save(update_fields=['solution'])
            except Exception:
                pass

        # Calculate minutes and seconds on the fly as a single result
        data['time_taken'] = instance.time_taken
        return data

class UserKnowledgeAssessmentSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserKnowledgeAssessmentSubmission
        fields = '__all__'
        read_only_fields = ('user',)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        answers = data.get('answers') or []
        if answers and all(not a.get('seconds_spent') and not a.get('seconds') for a in answers):
            from .models import CandidateTimelineEvent, CandidateTimelineEventType
            candidate_email = instance.user.email if instance.user else None
            per_q = 0
            if candidate_email:
                prev_event = CandidateTimelineEvent.objects.filter(
                    evaluation=instance.evaluation,
                    candidate_email=candidate_email,
                    title__in=[CandidateTimelineEventType.STARTED, CandidateTimelineEventType.LABS_SUBMITTED]
                ).order_by('-occurred_at').first()
                curr_event = CandidateTimelineEvent.objects.filter(
                    evaluation=instance.evaluation,
                    candidate_email=candidate_email,
                    title=CandidateTimelineEventType.ASSESSMENT_SUBMITTED
                ).order_by('-occurred_at').first()
                end_time = curr_event.occurred_at if curr_event else instance.created_at
                if prev_event and end_time and end_time > prev_event.occurred_at:
                    total_secs = max(1, round((end_time - prev_event.occurred_at).total_seconds()))
                    per_q = max(1, round(total_secs / len(answers)))
            if per_q == 0 and instance.created_at and instance.user:
                eval_sub = instance.user.evaluation_submissions.filter(evaluation=instance.evaluation).first()
                if eval_sub and eval_sub.created_at and instance.created_at > eval_sub.created_at:
                    total_secs = max(1, round((instance.created_at - eval_sub.created_at).total_seconds()))
                    per_q = max(1, round(total_secs / len(answers)))
            if per_q > 0:
                for a in answers:
                    if not a.get('seconds_spent'):
                        a['seconds_spent'] = per_q
                data['answers'] = answers
                try:
                    instance.answers = answers
                    instance.save(update_fields=['answers'])
                except Exception:
                    pass
        return data

class FollowUpConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpConfig
        fields = '__all__'

class FollowUpCandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowUpCandidate
        fields = '__all__'

from .models import CandidateNote, CandidateTimelineEvent

class CandidateNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = CandidateNote
        fields = '__all__'
        read_only_fields = ('author', 'created_by')

    def get_author_name(self, obj):
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.email
        return None

class CandidateTimelineEventSerializer(serializers.ModelSerializer):
    candidate_email = serializers.EmailField(required=False, allow_blank=True)
    
    class Meta:
        model = CandidateTimelineEvent
        fields = '__all__'
        read_only_fields = ('created_by', 'updated_by')


class RecruiterActivityLogSerializer(serializers.ModelSerializer):
    recruiter_name = serializers.SerializerMethodField()

    class Meta:
        model = RecruiterActivityLog
        fields = '__all__'
        read_only_fields = ('recruiter', 'created_by', 'updated_by')

    def get_recruiter_name(self, obj):
        if obj.recruiter:
            return f"{obj.recruiter.first_name} {obj.recruiter.last_name}".strip() or obj.recruiter.email
        return None


class KnowledgeQuestionBankSerializer(serializers.ModelSerializer):
    created_by_email = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeQuestionBank
        fields = '__all__'
        read_only_fields = ('created_by', 'company')

    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else None

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            if "backend_frameworks" in data and isinstance(data["backend_frameworks"], list):
                data["backend_frameworks"] = [
                    "DJANGO_REST_FRAMEWORK" if f == "DJANGO_REST_FRAMEWOR" else f
                    for f in data["backend_frameworks"]
                ]
        return super().to_internal_value(data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if isinstance(ret.get("backend_frameworks"), list):
            ret["backend_frameworks"] = [
                "DJANGO_REST_FRAMEWORK" if f == "DJANGO_REST_FRAMEWOR" else f
                for f in ret["backend_frameworks"]
            ]
        return ret


from .models import CandidateEvaluationFeedback

class CandidateEvaluationFeedbackSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(source='candidate.get_full_name', read_only=True)
    candidate_email = serializers.CharField(source='candidate.email', read_only=True)

    class Meta:
        model = CandidateEvaluationFeedback
        fields = ['id', 'evaluation', 'candidate', 'candidate_name', 'candidate_email', 'rating', 'description', 'created_at']
        read_only_fields = ['id', 'candidate', 'created_at']


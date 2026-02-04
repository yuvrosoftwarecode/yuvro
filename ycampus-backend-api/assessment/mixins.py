import os
import time
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import BaseQuestionActivity
from rest_framework import permissions
from rest_framework.decorators import action
import requests
import json


class ProctoringMixin:
    """
    Mixin to handle proctoring, navigation, and other activity events generic to all assessments.
    Requires the ViewSet to define:
    - submission_model: The model class for the submission (e.g., SkillTestSubmission)
    - question_activity_model: The model class for question activity (e.g., SkillTestQuestionActivity)
    - submission_lookup_field: The field name in the submission model linking to the parent assessment (e.g., 'skill_test').
      Defaults to 'skill_test' if not provided, but can be dynamic.
    """

    submission_model = None
    question_activity_model = None
    submission_lookup_field = "skill_test"  # Default, override in ViewSet
    submission_related_field = (
        None  # Field name in QuestionActivity model linking to Submission
    )

    @action(
        detail=True,
        methods=["post"],
        url_path="log-activity",
        permission_classes=[permissions.IsAuthenticated],
    )
    def log_activity(self, request, pk=None):
        assessment_object = self.get_object()
        user = request.user

        # 1. Get Payload Data
        activity_type = request.data.get("activity_type")
        meta_data = request.data.get("meta_data", {})
        question_id = request.data.get("question_id")
        timestamp = request.data.get("timestamp") or timezone.now().isoformat()

        if not activity_type:
            return Response(
                {"error": "activity_type is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Resolve Submission
        # Look up submission where user=user and assessment=assessment_object
        lookup_kwargs = {"user": user, self.submission_lookup_field: assessment_object}

        # Order by created_at desc to get the latest (current) attempt
        submission = (
            self.submission_model.objects.filter(**lookup_kwargs)
            .order_by("-created_at")
            .first()
        )

        if not submission:
            return Response(
                {"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # 3. Handle Question-Specific Activity
        if question_id:
            return self._handle_question_activity(
                submission, request, activity_type, meta_data, question_id, timestamp
            )

        # 4. Handle Global Submission Activity
        return self._handle_submission_activity(
            submission, request, activity_type, meta_data, timestamp
        )

    def _handle_question_activity(
        self, submission, request, activity_type, meta_data, question_id, timestamp
    ):
        submission_field_name = self._get_submission_field_name()

        qa_lookup = {submission_field_name: submission, "question_id": question_id}

        try:
            qa_record, created = self.question_activity_model.objects.get_or_create(
                defaults={"user": request.user}, **qa_lookup
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        qa_record_updated = False

        event = {
            "timestamp": timestamp,
            "activity_type": activity_type,
            "meta_data": meta_data,
        }

        # --- Logic for Specific Activity Types ---

        # 1. Answer Logic
        if activity_type in ["answer_changed", "answer_started"]:
            new_answer = request.data.get("answer") or meta_data.get("answer")
            if new_answer is not None:
                qa_record.answer_data = new_answer
                qa_record.answer_history.append(
                    {
                        "timestamp": timestamp,
                        "answer_data": new_answer,
                        "is_auto_save": meta_data.get("is_auto_save", False),
                    }
                )
                qa_record.answer_attempt_count += 1
                qa_record_updated = True

        elif activity_type == "answer_submitted":
            qa_record.is_final_answer = True
            qa_record_updated = True

            # Trigger plagiarism check for coding questions
            if qa_record.question.type == "coding":
                self._check_plagiarism(qa_record, request)

        # 2. Violation Logic
        # Explicit violation types from requirements
        violation_types = [
            "copy_detected",
            "paste_detected",
            "right_click_detected",
            "keyboard_shortcut",
            "face_not_detected",
            "multiple_faces_detected",
            "face_recognition_failed",
            "suspicious_movement",
            "audio_anomaly",
            "suspicious_activity",
            "device_change",
            "external_monitor",
        ]

        if activity_type in violation_types:
            qa_record.violation_count += 1
            qa_record.has_violations = True
            qa_record_updated = True

        # 3. Alert Logic
        if activity_type == "violation_critical":
            qa_record.alert_priority = "critical"
            qa_record_updated = True
        elif activity_type == "violation_warning":
            if qa_record.alert_priority not in ["critical", "high"]:
                qa_record.alert_priority = "high"
                qa_record_updated = True

        # --- Logging Logic ---
        proctoring_types = dict(BaseQuestionActivity.PROCTORING_ACTIVITY_TYPES).keys()
        navigation_types = dict(BaseQuestionActivity.NAVIGATION_ACTIVITY_TYPES).keys()
        question_types = dict(BaseQuestionActivity.QUESTION_ACTIVITY_TYPES).keys()

        if activity_type in proctoring_types:
            qa_record.proctoring_activities.append(event)
            qa_record_updated = True

        elif activity_type in navigation_types:
            qa_record.navigation_activities.append(event)
            qa_record_updated = True

        elif activity_type in question_types:
            qa_record.question_activities.append(event)
            qa_record_updated = True

        # Handle Camera Snapshot
        image_file = request.FILES.get("snapshot")
        if image_file:
            image_path = self._save_snapshot(
                image_file, request.user, submission, question_id
            )
            if image_path:
                snap_event = {
                    "timestamp": timestamp,
                    "image_path": image_path,
                    "meta_data": meta_data,
                }
                qa_record.camera_snapshots.append(snap_event)
                qa_record_updated = True

        if qa_record_updated:
            qa_record.save()

        return Response(
            {"status": "logged", "scope": "question"}, status=status.HTTP_200_OK
        )

    def _check_plagiarism(self, qa_record, request):
        """
        Check for plagiarism against other submissions for the same question.
        """
        try:
            # 1. Extract Code and Language
            answer_data = qa_record.answer_data
            if not isinstance(answer_data, dict):
                return

            code = answer_data.get("code") or answer_data.get("source_code")
            language = answer_data.get("language")

            if not code or not language:
                return

            # 2. Fetch Reference Submissions
            # Find all other finalized answers for this question
            # Using the same model class (e.g. SkillTestQuestionActivity)
            model_class = qa_record.__class__

            # Limit to recent 100 or reasonable number to avoid huge payloads
            # Exclude current user's submissions
            refs = (
                model_class.objects.filter(
                    question=qa_record.question, is_final_answer=True
                )
                .exclude(user=request.user)
                .values("id", "user__id", "answer_data")
                .order_by("-updated_at")[:50]
            )

            reference_submissions = []
            for ref in refs:
                reference_submissions.append(
                    {
                        "submission_id": str(ref["id"]),
                        "user_id": str(ref["user__id"]),
                        "answer_data": ref["answer_data"],
                    }
                )

            if not reference_submissions:
                return

            # 3. Call Plagiarism Service
            service_url = os.environ.get(
                "CODE_EXECUTOR_URL", "http://code-executor:8002"
            )
            payload = {
                "target_code": code,
                "language": language,
                "reference_submissions": reference_submissions,
            }

            response = requests.post(
                f"{service_url}/plagiarism-check", json=payload, timeout=5
            )

            if response.status_code == 200:
                result = response.json()
                qa_record.plagiarism_data = result
                qa_record.save(update_fields=["plagiarism_data"])

        except Exception as e:
            print(f"Plagiarism check failed: {e}")

    def _handle_submission_activity(
        self, submission, request, activity_type, meta_data, timestamp
    ):
        event = {
            "timestamp": timestamp,
            "activity_type": activity_type,
            "meta_data": meta_data,
        }

        # Handle Camera Snapshot for Submission Level
        image_file = request.FILES.get("snapshot")
        if image_file:
            image_path = self._save_snapshot(image_file, request.user, submission)
            if image_path:
                event["image_path"] = image_path

        # Define non-violation events that shouldn't be counted as proctoring violations
        proctoring_types = dict(BaseQuestionActivity.PROCTORING_ACTIVITY_TYPES).keys()
        non_violation_types = ["snapshot", "camera_enabled", "camera_disabled"]

        is_proctoring = (
            activity_type in proctoring_types
            or activity_type == "snapshot"
            or image_file
        )
        is_violation = is_proctoring and (activity_type not in non_violation_types)

        if is_violation:
            submission.proctoring_events.append(event)
        else:
            # Snapshots and Camera Status are logged but kept in general events
            submission.general_events.append(event)

        submission.save()
        return Response(
            {"status": "logged", "scope": "submission"}, status=status.HTTP_200_OK
        )

    def _get_submission_field_name(self):
        """
        Derive the field name on the QuestionActivity model that points to the Submission model.
        e.g. SkillTestQuestionActivity -> 'skill_test_submission'
        """
        if self.submission_related_field:
            return self.submission_related_field

        # Fallback to naive lower case (might fail for CamelCase)
        return (
            self.submission_model.__name__.replace("Submission", "").lower()
            + "_submission"
        )

    def _save_snapshot(self, file_obj, user, submission, question_id=None):
        """
        Save camera snapshot to local uploads folder as requested:
        uploads/{assessment_type}/{assessment_name}/{attempt_no}/{filename}
        """
        try:
            from django.utils.text import slugify

            # 2. Assessment Type & Hierarchy
            # Determine type and hierarchical names (Course/Topic)
            assessment_type = self.submission_model.__name__.replace("Submission", "").lower()
            
            assessment = getattr(submission, self.submission_lookup_field)
            
            # Default values
            parent_folder = "" # e.g. Course Name or Topic Name
            exam_folder = "assessment"
            
            if assessment_type == "certification": # cleaned type
                 assessment_type = "certification"
                 # Hierarchy: certification / course_name / exam_title
                 if hasattr(assessment, 'course') and assessment.course:
                      parent_folder = slugify(assessment.course.name)
                 else:
                      parent_folder = "general"
                 exam_folder = slugify(assessment.title)
                 
            elif assessment_type == "skilltest": # cleaned type
                 assessment_type = "skill_test"
                 # Hierarchy: skill_test / topic_name / test_title
                 if hasattr(assessment, 'topic') and assessment.topic:
                      parent_folder = slugify(assessment.topic.name)
                 elif hasattr(assessment, 'course') and assessment.course:
                      parent_folder = slugify(assessment.course.name)
                 else:
                      parent_folder = "general"
                 exam_folder = slugify(assessment.title)
                 
            elif assessment_type == "mockinterview":
                 assessment_type = "mock_interview"
                 # Hierarchy: mock_interview / title (No parent folder requested)
                 parent_folder = "" 
                 exam_folder = slugify(assessment.title)
            
            else:
                 # Fallback for any other types
                 if hasattr(assessment, 'title'):
                      exam_folder = slugify(assessment.title)

            # 3. Attempt Number
            # Count previous submissions to determine attempt number
            lookup_kwargs = {
                "user": user, 
                self.submission_lookup_field: assessment,
                "created_at__lte": submission.created_at
            }
            attempt_count = self.submission_model.objects.filter(**lookup_kwargs).count()
            # If count is 0 (shouldn't happen for existing sub), default to 1
            attempt_count = attempt_count if attempt_count > 0 else 1
            attempt_dir = f"attempt-{attempt_count}"

            # 4. Filename
            ts = str(int(time.time()))
            filename = f"snapshot_{ts}.png"
            if question_id:
                 filename = f"q{question_id}_{ts}.png"

            # Directory Structure
            # uploads/{email}/{type}/{parent}/{exam}/{attempt}/
            email_safe = user.email if user.email else f"user_{user.id}"
            
            paths_components = ["uploads", email_safe, assessment_type]
            if parent_folder:
                 paths_components.append(parent_folder)
            paths_components.append(exam_folder)
            paths_components.append(attempt_dir)
            
            final_dir = os.path.join(*paths_components)

            # Create dirs
            os.makedirs(final_dir, exist_ok=True)

            # Full path
            full_path = os.path.join(final_dir, filename)

            # Write file
            with open(full_path, "wb+") as destination:
                for chunk in file_obj.chunks():
                    destination.write(chunk)

            return full_path
        except Exception as e:
            print(f"Error saving snapshot: {e}")
            return None

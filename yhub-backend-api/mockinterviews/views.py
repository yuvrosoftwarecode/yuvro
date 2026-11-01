import logging
import traceback
import random
import asyncio
import re

from django.db.models import Q
from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from authentication.permissions import IsOwnerOrInstructorOrAdmin

from .models import (
    MockInterview,
    MockInterviewSubmission,
    PredefinedInterviewQuestion,
    UserInterviewProgress,
)
from .serializers import MockInterviewSerializer, MockInterviewSubmissionSerializer

from ai_assistant.models import AIAgent, ChatSession, InterviewSession, ChatMessage, InterviewReport
from ai_assistant.serializers import InterviewReportSerializer
from ai_assistant.services import InterviewReportGenerator
from asgiref.sync import async_to_sync
from mockinterviews.dynamic_engine.models import (
    InterviewCreateRequest,
    InterviewMode as DynMode,
    CandidateContext,
    InterviewSession as DynamicInterviewSession,
    InterviewQuestion,
    QuestionKind,
    Competency,
    new_id,
    AssessmentEvent,
    InterviewStatus as DynamicInterviewStatus,
    UnifiedAssessmentPayload,
    sanitize_null_bytes,
)
from mockinterviews.dynamic_engine.evaluator import InterviewEvaluator
from mockinterviews.dynamic_engine.reporting import InterviewReportService
from mockinterviews.dynamic_engine.payload_adapter import UnifiedPayloadAdapter

from mockinterviews.dynamic_engine.question_engine import DynamicQuestionEngine
from mockinterviews.dynamic_engine.llm import OpenAIInterviewLLM
from mockinterviews.dynamic_engine.config import get_settings

logger = logging.getLogger(__name__)


INTERVIEW_TRANSITIONS = {
    'ask_missing_name': [
        "Before we dive in, what's your name?",
        "Could you tell me your name first?",
    ],
    'ask_missing_experience': [
        "Thanks {name}. To help me tailor the questions, how many years of experience do you have?",
    ],
    'ask_missing_skills': [
        "Got it, {name}. And what are your core technical skills or primary tech stack?",
    ],
    'repeat': [
        "Could you elaborate more on that? ",
        "Can you clarify your last point? ",
    ],
    'skip_topic': [
        "No problem, let's skip that. ",
        "Moving on then. ",
    ],
    'next_topic': [
        "Let's move to a different topic. ",
        "Great, let's switch gears. ",
    ],
    'acknowledgment': [
        "Understood. ",
        "Got it. ",
        "Okay, thanks. ",
    ],
    'first_question_intro': [
        "Thanks {name}. Let's get started. ",
        "Perfect {name}. Here is your first question: ",
    ]
}


class MockInterviewViewSet(viewsets.ModelViewSet):
    queryset = MockInterview.objects.all()
    serializer_class = MockInterviewSerializer
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return super().get_permissions()

    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        publish_status_param = self.request.query_params.get("publish_status")
        product_param = self.request.query_params.get("product")

        q = Q()
        if publish_status_param:
            q &= Q(publish_status=publish_status_param)
        if product_param:
            q &= Q(products__contains=[product_param]) | Q(products__contains=[product_param.lower()])

        if q:
            qs = qs.filter(q)

        return qs.prefetch_related('predefined_questions')

    def _analyze_intro_answer(self, text):
        if not text or len(text.strip()) < 2:
            return {}

        clean = text.strip()
        extracted = {}

        # 1. Fast regex extraction (instant <1ms response)
        name_match = re.search(r"(?:my name is|i am|i'm|this is|myself|call me)\s+([A-Za-z]+)", clean, re.IGNORECASE)
        if name_match:
            extracted["name"] = name_match.group(1).capitalize()

        exp_match = re.search(r"(\d+\+?\s*(?:years?|yrs?)(?:\s+of\s+experience)?|fresher|graduate|intern)", clean, re.IGNORECASE)
        if exp_match:
            extracted["experience"] = exp_match.group(1)

        known_skills = ["python", "javascript", "typescript", "react", "django", "node", "sql", "java", "c++", "aws", "docker"]
        found_skills = [s.capitalize() for s in known_skills if re.search(rf"\b{s}\b", clean, re.IGNORECASE)]
        if found_skills:
            extracted["skills"] = ", ".join(found_skills)

        # If name is extracted via regex or text is brief, return immediately without slow LLM roundtrip
        if extracted.get("name") or len(clean.split()) <= 10:
            return extracted

        from ai_assistant.services import AIServiceFactory
        from django.conf import settings
        import json

        try:
            prompt = f"""
            Extract the following information from the user's self-introduction.
            Return ONLY valid JSON. If a detail is missing, return null for it.

            Text: "{text}"

            Format:
            {{
                "name": "<string or null>",
                "experience": "<string or null, e.g. '2 years' or 'fresher'>",
                "skills": "<string or null, e.g. 'React, Python, Java'>"
            }}
            """

            agent = AIAgent.objects.filter(is_active=True).first()
            if not agent:
                return extracted

            service = AIServiceFactory.create_service(agent.provider, agent.model_name)

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            response = loop.run_until_complete(service.generate_response(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=200
            ))

            resp_text = response.get("response", "").replace("```json", "").replace("```", "").strip()
            llm_res = json.loads(resp_text)
            for k, v in llm_res.items():
                if v and not extracted.get(k):
                    extracted[k] = v
            return extracted
        except Exception as e:
            logger.error(f"Error extracting intro details: {str(e)}")
            return extracted

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def start_interview(self, request, pk=None):
        try:
            # Determine interview source: "student" (student mock interview) vs "evaluation" (lab assessment discussion)
            source = request.data.get('source') or request.data.get('interview_source') or request.data.get('origin')
            if not source:
                # If evaluation parameters are present, mark as evaluation; otherwise default to student side
                if (
                    request.data.get('discussion_max_score') is not None or 
                    request.data.get('max_score') is not None or 
                    request.data.get('candidate_context')
                ):
                    source = 'evaluation'
                else:
                    source = 'student'

            # 1. Student Mock Interview -> Route to Engine 1 (AI Interview Engine)
            if source == 'student':
                return self.start_ai_interview(request, pk)

            # 2. Evaluation Assessment Discussion -> Proceed with Engine 2 (Dynamic Question Engine)
            user = request.user
            mock_interview = self.get_object()

            force = request.data.get('force', False)
            active_session = not force and MockInterviewSubmission.objects.filter(
                user=user,
                status__in=[MockInterviewSubmission.STATUS_STARTED, MockInterviewSubmission.STATUS_IN_PROGRESS]
            ).exists()
            if active_session:
                return Response(
                    {'error': 'You already have an active test, assessment, or interview session in progress. Please complete or cancel it before starting a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            experience_level = request.data.get('experience_level', 'Beginner')
            selected_duration = request.data.get('selected_duration')
            resume_file = request.FILES.get('resume')

            progress, created = UserInterviewProgress.objects.get_or_create(
                user=user,
                mock_interview=mock_interview
            )

            current_cycle_step = progress.completed_count
            is_master = current_cycle_step >= 5
            
            mode_str = getattr(mock_interview, 'interview_mode', 'automatic').lower()
            try:
                engine_mode = DynMode(mode_str)
            except ValueError:
                engine_mode = DynMode.AUTOMATIC
                mode_str = "automatic"
            
            interview_type = mode_str
            
            context_text = ""
            if resume_file:
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(resume_file)
                    for page in reader.pages:
                        text = page.extract_text()
                        if text: context_text += text + "\n"
                except Exception as e:
                    logger.warning(f"Error parsing resume: {e}")

            if not context_text.strip():
                context_text = "No specific background provided."

            resume_context_text = context_text
            candidate_context_frontend = request.data.get('candidate_context', '')
            if candidate_context_frontend:
                context_text += f"\n\nCandidate Assessment & Labs Context:\n{candidate_context_frontend}"

            ai_agent = AIAgent.objects.filter(is_active=True).first()
            if not ai_agent:
                ai_agent = AIAgent.objects.first()
            
            duration_mins = selected_duration or mock_interview.max_duration
            
            chat_session = None
            interview_session = None
            if ai_agent:
                chat_session = ChatSession.objects.create(
                    user=user,
                    ai_agent=ai_agent,
                    title=f"Mock Interview - {mock_interview.title}",
                    page="mock_interview",
                    context={
                        "role": mock_interview.title,
                        "level": experience_level,
                        "difficulty": experience_level,
                        "duration_minutes": duration_mins,
                        "candidate_info": context_text,
                        "required_skills": mock_interview.required_skills
                    }
                )
                
                interview_session = InterviewSession.objects.create(
                    user=user,
                    chat_session=chat_session,
                    role_title=mock_interview.title,
                    role_level=experience_level,
                    difficulty=experience_level,
                    duration_minutes=duration_mins,
                    resume_file=resume_file
                )

            submission = MockInterviewSubmission.objects.create(
                mock_interview=mock_interview,
                user=user,
                status=MockInterviewSubmission.STATUS_STARTED,
                experience_level=experience_level,
                chat_session=chat_session,
                old_chat_session_id=str(chat_session.id) if chat_session else None,
                interview_type=interview_type,
                selected_duration=selected_duration or 0,
                resume=resume_file
            )

            recruiter_qs = []
            if engine_mode in [DynMode.HYBRID, DynMode.CUSTOM]:
                tree = mock_interview.predefined_questions.filter(level=1).order_by('id')
                recruiter_qs = [q.text for q in tree]
                
                # Ensure Pydantic constraints are met
                if not recruiter_qs:
                    recruiter_qs = ["Could you please introduce yourself and discuss your relevant background?"]
                
                if engine_mode == DynMode.HYBRID and len(recruiter_qs) > 2:
                    recruiter_qs = recruiter_qs[:2]

            disc_max_val = request.data.get('discussion_max_score') or request.data.get('max_score')
            session_metadata = {
                "mock_interview_id": mock_interview.id,
                "selected_duration": selected_duration or 0,
            }
            if disc_max_val is not None:
                try:
                    session_metadata["discussion_max_score"] = float(disc_max_val)
                except (ValueError, TypeError):
                    pass

            if candidate_context_frontend:
                adapter = UnifiedPayloadAdapter()
                dynamic_payload = UnifiedAssessmentPayload.model_validate({
                    "candidate_context": candidate_context_frontend,
                    "force": force,
                    "sequential": request.data.get('sequential'),
                    "discussion_mode": engine_mode.value,
                    "candidate": {
                        "id": str(user.id),
                        "experience_level": experience_level,
                        "resume_summary": resume_context_text,
                    },
                    "job_description": {
                        "role": mock_interview.title,
                        "summary": mock_interview.description,
                        "requirements": mock_interview.required_skills,
                    },
                    "recruiter_questions": recruiter_qs,
                    "metadata": session_metadata,
                })
                req = adapter.to_create_request(dynamic_payload)
                dyn_session = DynamicInterviewSession.from_create_request(req)
                settings = get_settings()
                dynamic_engine = DynamicQuestionEngine(
                    max_followups_per_topic=settings.max_followups_per_topic,
                )
                for event in adapter.to_assessment_events(dynamic_payload):
                    dynamic_engine.ingest_event(dyn_session, event)
            else:
                req = InterviewCreateRequest(
                    mode=engine_mode,
                    candidate=CandidateContext(
                        candidate_id=str(user.id),
                        target_role=mock_interview.title,
                        resume=context_text,
                        job_description=mock_interview.description
                    ),
                    recruiter_questions=recruiter_qs,
                    metadata=session_metadata,
                )
                dyn_session = DynamicInterviewSession.from_create_request(req)

            candidate_name = f"{user.first_name} {user.last_name}".strip() or user.username or ""
            if candidate_name:
                dyn_session.candidate.metadata["profile_name"] = candidate_name

            greeting = f"Hello! I'm your AI interviewer today. We'll be discussing the {mock_interview.title} role. To start, could you please introduce yourself?"
            
            # Register greeting as the active initial question in the dynamic session
            intro_q = InterviewQuestion(
                id=new_id("q-intro"),
                prompt=greeting,
                kind=QuestionKind.DYNAMIC_FOLLOW_UP,
                competency_targets=[Competency.COMMUNICATION],
                rationale="Candidate introduction and ice-breaker",
                metadata={"is_intro": True, "probe_axis": "introduction", "topic_key": "introduction"},
            )
            dyn_session.questions.append(intro_q)
            dyn_session.current_question_id = intro_q.id
            dyn_session.turn_index = 0

            submission.session_state = sanitize_null_bytes(dyn_session.model_dump(mode='json'))
            submission.state_data = {
                "source": "evaluation",
                "interview_type": "evaluation"
            }
            submission.save(update_fields=['session_state', 'state_data'])
            
            if chat_session:
                ChatMessage.objects.create(
                    chat_session=chat_session,
                    message_type="assistant",
                    content=greeting
                )
            
            first_question_text = greeting

            return Response({
                'submission_id': submission.id,
                'interview_session_id': str(interview_session.id) if interview_session else None,
                'chat_session_id': str(chat_session.id) if chat_session else None,
                'status': submission.status,
                'interview_type': mode_str,
                'interview_mode': mode_str,
                'first_question': first_question_text,
                'progress': {
                    "completed_count": current_cycle_step,
                    "is_master": is_master
                }
            })

        except Exception as e:
            logger.error(f"Error starting interview: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def get_next_question(self, request, pk=None):
        try:
            mock_interview = self.get_object()
            interview_session_id = request.data.get('interview_session_id')
            user_answer = request.data.get('user_answer', '')
            status_code = request.data.get('status', 'normal')

            if not interview_session_id:
                return Response({"error": "No interview session ID provided"}, status=status.HTTP_400_BAD_REQUEST)

            interview_session = InterviewSession.objects.filter(id=interview_session_id).first()
            if not interview_session:
                sub = MockInterviewSubmission.objects.filter(id=interview_session_id).first()
                if sub and sub.chat_session and hasattr(sub.chat_session, 'interview_session'):
                    interview_session = sub.chat_session.interview_session
            if not interview_session:
                return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
                
            chat_session = interview_session.chat_session

            sub = MockInterviewSubmission.objects.filter(
                user=request.user, 
                mock_interview=mock_interview, 
                chat_session=chat_session
            ).first()

            # Determine whether interview is from student side or from evaluation
            source = request.data.get('source') or request.data.get('interview_source')
            if not source:
                if sub and sub.state_data and sub.state_data.get('source'):
                    source = sub.state_data.get('source')
                elif interview_session and interview_session.state_data and interview_session.state_data.get('source'):
                    source = interview_session.state_data.get('source')
                elif sub and (sub.interview_type == 'full_ai' or (sub.state_data and sub.state_data.get('interview_type') == 'full_ai')):
                    source = 'student'
                elif sub and sub.session_state and not (sub.state_data and sub.state_data.get('interview_type')):
                    source = 'evaluation'
                else:
                    source = 'student'

            # 1. Student Mock Interview -> Route to Engine 1
            if source == 'student':
                return self.get_next_ai_question(request, pk)

            # 2. Evaluation Assessment Discussion -> Proceed with Engine 2 (Dynamic Question Engine)

            state = interview_session.state_data or {}

            if user_answer and user_answer.strip():
                ChatMessage.objects.create(
                    chat_session=chat_session,
                    message_type="user",
                    content=user_answer
                )

            # Use Dynamic Engine if initialized
            submission = MockInterviewSubmission.objects.filter(
                user=request.user, 
                mock_interview=mock_interview, 
                chat_session=chat_session
            ).first()
            if submission and submission.session_state:
                dyn_session = DynamicInterviewSession.model_validate(submission.session_state)
                settings = get_settings()
                engine = DynamicQuestionEngine(
                    llm_client=OpenAIInterviewLLM.from_settings(settings),
                    max_followups_per_topic=settings.max_followups_per_topic,
                )
                
                # Store profile name if not present; candidate conversational name is learned from spoken intro
                if not dyn_session.candidate.metadata.get("profile_name") and request.user:
                    user_display = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
                    if user_display:
                        dyn_session.candidate.metadata["profile_name"] = user_display

                # First handle any answer provided
                if user_answer and user_answer.strip():
                    target_q_id = dyn_session.current_question_id
                    if not target_q_id and dyn_session.questions:
                        target_q_id = dyn_session.questions[-1].id
                    if target_q_id:
                        engine.record_answer(dyn_session, target_q_id, user_answer)
                
                # Advance question
                force_new = (status_code == 'skip')
                question = engine.next_question(dyn_session, force_new=force_new)
                
                submission.session_state = sanitize_null_bytes(dyn_session.model_dump(mode='json'))
                submission.save(update_fields=['session_state'])
                
                if chat_session:
                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=question.prompt
                    )
                return Response({
                    "question": question.prompt,
                    "is_finished": False,
                    "question_id": question.id,
                    "question_kind": question.kind.value,
                    "competency_targets": [competency.value for competency in question.competency_targets],
                    "evidence_event_ids": question.evidence_event_ids,
                    "evidence_answer_ids": question.evidence_answer_ids,
                    "rationale": question.rationale,
                    "metadata": question.metadata,
                    "llm_calls": [call.model_dump(mode='json') for call in dyn_session.llm_calls[-3:]],
                })


            planned_questions = state.get('planned_questions', [])
            current_main_index = state.get('current_main_index', -1)
            current_node_id = state.get('current_node_id')

            intro_details = state.get('intro_details', {'name': None, 'experience': None, 'skills': None, 'attempts': 0, 'completed': False})

            if current_main_index == -1 and not intro_details.get('completed'):
                if user_answer and user_answer.strip():
                    intro_details['attempts'] = intro_details.get('attempts', 0) + 1
                    new_details = self._analyze_intro_answer(user_answer)
                    if new_details.get('name'): intro_details['name'] = new_details['name']
                    if new_details.get('experience'): intro_details['experience'] = new_details['experience']
                    if new_details.get('skills'): intro_details['skills'] = new_details['skills']

                    intro_details['completed'] = True
                    state['intro_details'] = intro_details
                    
                    interview_session.state_data = state
                    interview_session.save()
                else:
                    state['intro_details'] = intro_details
                    interview_session.state_data = state
                    interview_session.save()
                    
                    ask_phrase = ""
                    if not intro_details.get('name'):
                        ask_phrase = random.choice(INTERVIEW_TRANSITIONS['ask_missing_name'])
                    elif not intro_details.get('experience'):
                        name = intro_details.get('name') or request.user.first_name or request.user.username or "there"
                        ask_phrase = random.choice(INTERVIEW_TRANSITIONS['ask_missing_experience']).format(name=name)
                    elif not intro_details.get('skills'):
                        name = intro_details.get('name') or request.user.first_name or request.user.username or "there"
                        ask_phrase = random.choice(INTERVIEW_TRANSITIONS['ask_missing_skills']).format(name=name)

                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=ask_phrase
                    )
                    return Response({
                        "question": ask_phrase,
                        "is_finished": False
                    })

            if status_code == 'repeat' and current_node_id:
                try:
                    curr_node = PredefinedInterviewQuestion.objects.get(id=current_node_id)
                    transition = random.choice(INTERVIEW_TRANSITIONS['repeat'])
                    return Response({
                        "question": transition + curr_node.text,
                        "is_finished": False
                    })
                except PredefinedInterviewQuestion.DoesNotExist:
                    pass

            next_node = None
            is_new_main_topic = False
            is_skip = (status_code == 'skip')
            
            if current_node_id and status_code == 'normal':
                try:
                    curr_node = PredefinedInterviewQuestion.objects.get(id=current_node_id)
                    follow_ups = curr_node.follow_ups.all().order_by('created_at')
                    
                    asked_in_session = state.get('asked_in_session', [])
                    for fu in follow_ups:
                        if str(fu.id) not in asked_in_session:
                            next_node = fu
                            break
                except PredefinedInterviewQuestion.DoesNotExist:
                    pass
            
            if not next_node:
                current_main_index += 1
                if current_main_index < len(planned_questions):
                    next_node_id = planned_questions[current_main_index]
                    try:
                        next_node = PredefinedInterviewQuestion.objects.get(id=next_node_id)
                        is_new_main_topic = True
                    except PredefinedInterviewQuestion.DoesNotExist:
                        return self.get_next_question(request, pk)
                else:
                    farewell = "Thank you! That concludes our discussion for today. I'll now finalize your performance report."
                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=farewell
                    )
                    return Response({
                        "question": farewell,
                        "is_finished": True
                    })

            transition = ""
            if current_node_id is None:
                intro_details = state.get('intro_details', {})
                first_name = intro_details.get('name') or request.user.first_name or request.user.username

                transition_template = random.choice(INTERVIEW_TRANSITIONS['first_question_intro'])
                transition = transition_template.format(name=first_name)
            else:
                if is_skip:
                    transition = random.choice(INTERVIEW_TRANSITIONS['skip_topic'])
                elif is_new_main_topic:
                    transition = random.choice(INTERVIEW_TRANSITIONS['next_topic'])
                elif status_code == 'normal':
                    transition = random.choice(INTERVIEW_TRANSITIONS['acknowledgment'])
                    
            final_question_text = transition + next_node.text

            asked_in_session = state.get('asked_in_session', [])
            asked_in_session.append(str(next_node.id))
            
            state['current_main_index'] = current_main_index
            state['current_node_id'] = str(next_node.id)
            state['asked_in_session'] = list(set(asked_in_session))
            
            interview_session.state_data = state
            interview_session.save()

            ChatMessage.objects.create(
                chat_session=chat_session,
                message_type="assistant",
                content=final_question_text
            )

            return Response({
                "question": final_question_text,
                "is_finished": False
            })

        except Exception as e:
            logger.error(f"Error in get_next_question: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": "Internal server error during question progression"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def start_ai_interview(self, request, pk=None):
        try:
            user = request.user
            mock_interview = self.get_object()

            force = request.data.get('force', False)
            active_session = not force and MockInterviewSubmission.objects.filter(
                user=user,
                status__in=[MockInterviewSubmission.STATUS_STARTED, MockInterviewSubmission.STATUS_IN_PROGRESS]
            ).exists()
            if active_session:
                return Response(
                    {'error': 'You already have an active test, assessment, or interview session in progress. Please complete or cancel it before starting a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            experience_level = request.data.get('experience_level', 'Beginner')
            selected_duration = request.data.get('selected_duration') or request.data.get('duration')
            resume_file = request.FILES.get('resume')

            progress, created = UserInterviewProgress.objects.get_or_create(
                user=user,
                mock_interview=mock_interview
            )

            current_cycle_step = progress.completed_count
            is_master = current_cycle_step >= 5
            
            main_pool = PredefinedInterviewQuestion.objects.filter(
                mock_interview=mock_interview,
                level=1
            )
            has_predefined = main_pool.exists() and getattr(mock_interview, "interview_mode", "") != "automatic"

            if is_master or not has_predefined:
                interview_type = "full_ai"
            else:
                interview_type = "predefined"

            context_text = ""
            if resume_file:
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(resume_file)
                    for page in reader.pages:
                        text = page.extract_text()
                        if text: context_text += text + "\n"
                except Exception as e:
                    logger.warning(f"Error parsing resume: {e}")

            if not context_text.strip():
                try:
                    if hasattr(user, "profile"):
                        profile = user.profile
                        context_text += f"Name: {profile.user.get_full_name()}\n"
                        context_text += f"Title: {getattr(profile, 'title', '')}\n"
                        context_text += f"About: {getattr(profile, 'about', '')}\n"
                except Exception:
                    pass

            if not context_text.strip():
                context_text = "No specific background provided."

            ai_agent = AIAgent.objects.filter(is_active=True).first()
            if not ai_agent:
                ai_agent = AIAgent.objects.first()

            duration_mins = selected_duration or mock_interview.max_duration

            chat_session = None
            interview_session = None
            if ai_agent:
                chat_session = ChatSession.objects.create(
                    user=user,
                    ai_agent=ai_agent,
                    title=f"Mock Interview - {mock_interview.title}",
                    page="mock_interview",
                    context={
                        "role": mock_interview.title,
                        "level": experience_level,
                        "difficulty": experience_level,
                        "duration_minutes": duration_mins,
                        "candidate_info": context_text,
                        "required_skills": mock_interview.required_skills
                    }
                )

                interview_session = InterviewSession.objects.create(
                    user=user,
                    chat_session=chat_session,
                    role_title=mock_interview.title,
                    role_level=experience_level,
                    difficulty=experience_level,
                    duration_minutes=duration_mins,
                    resume_file=resume_file
                )

            submission = MockInterviewSubmission.objects.create(
                mock_interview=mock_interview,
                user=user,
                status=MockInterviewSubmission.STATUS_STARTED,
                experience_level=experience_level,
                chat_session=chat_session,
                old_chat_session_id=str(chat_session.id) if chat_session else None,
                interview_type=interview_type,
                selected_duration=duration_mins or 0,
                resume=resume_file
            )

            is_sequential = str(request.data.get('sequential', '')).lower() in ['true', '1', 'yes']

            greeting = f"Hello! I'm your AI interviewer today. We'll be discussing the {mock_interview.title} role. To start, could you please introduce yourself?"
            if chat_session:
                ChatMessage.objects.create(
                    chat_session=chat_session,
                    message_type="assistant",
                    content=greeting
                )
            first_question_text = greeting
            first_question_id = "intro"

            if interview_type == "predefined":
                if is_sequential:
                    selected_mains = list(main_pool.order_by('created_at'))
                else:
                    available_pool = main_pool.exclude(id__in=progress.asked_questions)
                    if available_pool.count() < 10:
                        progress.asked_questions = []
                        progress.save()
                        available_pool = main_pool
                    selected_mains = list(available_pool.order_by('?')[:10])

                planned_ids = [str(q.id) for q in selected_mains]

                state_data = {
                    "source": "student",
                    "interview_type": "predefined",
                    "current_main_index": -1,
                    "current_node_id": None,
                    "planned_questions": planned_ids,
                    "asked_in_session": [],
                    "intro_details": {"name": None, "experience": None, "skills": None, "attempts": 0, "completed": False}
                }
            else:
                duration_mins = int(selected_duration or mock_interview.max_duration or 30)
                # Full AI mode: adaptive questions flow continuously for the interview duration without an artificial count ceiling
                num_questions = None

                all_skills = list(mock_interview.required_skills or [])
                for opt in (mock_interview.optional_skills or []):
                    if opt not in all_skills:
                        all_skills.append(opt)
                if not all_skills:
                    all_skills = [mock_interview.title]

                if "python" in mock_interview.title.lower():
                    python_core_topics = [
                        "Data Structures (Lists, Tuples, Sets, Dicts)",
                        "Functions, Scopes & Decorators",
                        "OOP Design & Inheritance",
                        "Exception Handling & Debugging",
                        "Iterators, Generators & Comprehensions",
                        "AsyncIO & Asynchronous Programming",
                        "Web Frameworks (FastAPI / Django)",
                        "Unit Testing & Pytest",
                        "Memory Management & Mutability"
                    ]
                    for pt in python_core_topics:
                        if pt not in all_skills:
                            all_skills.append(pt)
                elif "node" in mock_interview.title.lower():
                    node_core_topics = [
                        "Event Loop, Libuv & Concurrency",
                        "Asynchronous JavaScript (Promises, Async/Await, Microtasks)",
                        "Streams, Buffers & File System",
                        "Modules (CommonJS vs ES Modules)",
                        "HTTP, REST APIs & Frameworks (Express / NestJS / Fastify)",
                        "Middleware, Error Handling & Logging",
                        "Database Integration (SQL / NoSQL / ORMs)",
                        "Authentication & Security (JWT, CORS, OWASP, Rate Limiting)",
                        "Performance Optimization, Clustering & Worker Threads",
                        "Unit Testing & Integration Testing (Jest, Supertest)"
                    ]
                    for nt in node_core_topics:
                        if nt not in all_skills:
                            all_skills.append(nt)

                analysis = {
                    "candidate_name": user.get_full_name() or user.username,
                    "experience_level": experience_level,
                    "domain": mock_interview.title,
                    "match_score": 80,
                    "skills": [{"skill": s} for s in all_skills],
                    "strengths": mock_interview.required_skills or [mock_interview.title],
                    "gaps": [],
                    "candidate_info": context_text
                }
                diff = experience_level.lower() if experience_level.lower() in ["easy", "medium", "hard"] else "medium"
                state_data = {
                    "source": "student",
                    "interview_type": "full_ai",
                    "analysis": analysis,
                    "difficulty": diff,
                    "num_questions": num_questions,
                    "duration_minutes": duration_mins,
                    "adaptive": True,
                    "interview": [{
                        "id": 1,
                        "question": greeting,
                        "topic": "Self introduction",
                        "difficulty": "easy",
                        "question_type": "behavioral",
                        "expected_points": ["Professional background", "Relevant experience", "Interest in role"]
                    }],
                    "answers": {},
                    "current_question_index": 0,
                    "intro_details": {"name": None, "experience": None, "skills": None, "attempts": 0, "completed": False}
                }

            if interview_session:
                interview_session.state_data = state_data
                interview_session.save()
            submission.state_data = state_data
            submission.save(update_fields=['state_data'])

            return Response({
                'submission_id': submission.id,
                'interview_session_id': str(interview_session.id) if interview_session else None,
                'chat_session_id': str(chat_session.id) if chat_session else None,
                'status': submission.status,
                'interview_type': interview_type,
                'first_question': first_question_text,
                'first_question_id': first_question_id,
                'first_question_type': 'behavioral',
                'num_questions': state_data.get('num_questions', 5),
                'progress': {
                    "completed_count": current_cycle_step,
                    "is_master": is_master
                }
            })
        except Exception as e:
            logger.error(f"Error starting AI interview: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def get_next_ai_question(self, request, pk=None):
        try:
            mock_interview = self.get_object()
            interview_session_id = request.data.get('interview_session_id')
            user_answer = request.data.get('user_answer', '')
            status_code = request.data.get('status', 'normal')

            if not interview_session_id:
                return Response({"error": "No interview session ID provided"}, status=status.HTTP_400_BAD_REQUEST)

            interview_session = InterviewSession.objects.filter(id=interview_session_id).first()
            submission = None
            if not interview_session:
                submission = MockInterviewSubmission.objects.filter(id=interview_session_id).first()
                if submission and submission.chat_session and hasattr(submission.chat_session, 'interview_session'):
                    interview_session = submission.chat_session.interview_session
            else:
                submission = MockInterviewSubmission.objects.filter(
                    chat_session=interview_session.chat_session
                ).first()

            if not interview_session:
                return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)

            chat_session = interview_session.chat_session

            clean_answer = (user_answer or "").strip()
            if clean_answer:
                ChatMessage.objects.create(
                    chat_session=chat_session,
                    message_type="user",
                    content=clean_answer
                )

            state = interview_session.state_data or {}
            interview_type = state.get("interview_type") or (submission.interview_type if submission else "predefined")
            planned_questions = state.get('planned_questions', [])

            # Fallback to full_ai if no predefined questions exist
            if interview_type == "predefined" and not planned_questions:
                interview_type = "full_ai"
                state["interview_type"] = "full_ai"

            # ==========================================================
            # 1. FULL AI / ADAPTIVE ENGINE MODE
            # ==========================================================
            if interview_type == "full_ai":
                from asgiref.sync import async_to_sync
                from mockinterviews.ai_interview.interview_engine import get_next_question
                from mockinterviews.ai_interview.evaluator import evaluate_answer

                num_questions = state.get("num_questions", 5)
                current_question_index = state.get("current_question_index", 0)
                intro_details = state.get("intro_details", {"name": None, "experience": None, "skills": None, "attempts": 0, "completed": False})
                answers = state.get("answers", {})
                interview = state.get("interview", [])

                if not interview:
                    interview = [{
                        "id": 1,
                        "question": f"Hello! To start our interview for {mock_interview.title}, could you please introduce yourself?",
                        "topic": "Self introduction",
                        "difficulty": "easy",
                        "question_type": "behavioral",
                        "expected_points": ["Professional background", "Relevant experience", "Interest in role"]
                    }]
                    state["interview"] = interview

                # If answering the introduction:
                if current_question_index == 0:
                    is_meaningful = len(clean_answer.split()) >= 2 or len(clean_answer) >= 8

                    if not is_meaningful and not intro_details.get("completed"):
                        intro_details["attempts"] = intro_details.get("attempts", 0) + 1
                        state["intro_details"] = intro_details
                        interview_session.state_data = state
                        interview_session.save()
                        if submission:
                            submission.state_data = state
                            submission.save(update_fields=['state_data'])

                        rep = "Whenever you're ready, please share a brief introduction of yourself to get started."
                        ChatMessage.objects.create(
                            chat_session=chat_session,
                            message_type="assistant",
                            content=rep
                        )
                        return Response({
                            "question": rep,
                            "is_finished": False,
                            "question_id": "intro"
                        })

                    # Intro answered:
                    intro_details["completed"] = True
                    new_details = self._analyze_intro_answer(clean_answer)
                    if new_details.get('name'): intro_details['name'] = new_details['name']
                    if new_details.get('experience'): intro_details['experience'] = new_details['experience']
                    if new_details.get('skills'): intro_details['skills'] = new_details['skills']
                    state["intro_details"] = intro_details

                    answers["1"] = {
                        "answer": clean_answer,
                        "score": 8,
                        "feedback": "Self-introduction completed."
                    }
                    state["answers"] = answers
                    state["current_question_index"] = 1

                    # Generate opening technical Question 2 dynamically based on candidate's introduction
                    next_q = None
                    try:
                        next_q = async_to_sync(get_next_question)(state)
                    except Exception as e:
                        logger.error(f"Error in get_next_question (full_ai intro): {e}")

                    first_name = (intro_details.get('name') or request.user.first_name or "there").strip().title()
                    if not next_q:
                        title_lower = mock_interview.title.lower()
                        if "node" in title_lower:
                            next_q = {
                                "id": 2,
                                "question": f"Nice to meet you, {first_name}! Let's start with our first technical question: In Node.js, can you explain how the Event Loop works and what distinguishes microtasks from macrotasks?",
                                "topic": "Node.js Event Loop & Concurrency",
                                "difficulty": "easy",
                                "question_type": "technical",
                                "expected_points": [
                                    "Libuv event loop phases (timers, I/O callbacks, check, close)",
                                    "Microtask queue priority (process.nextTick, Promise callbacks)",
                                    "Non-blocking I/O and asynchronous event-driven design"
                                ]
                            }
                        elif "data structure" in title_lower or "algorithm" in title_lower:
                            next_q = {
                                "id": 2,
                                "question": f"Nice to meet you, {first_name}! Let's start with our first technical question: Can you explain the fundamental differences between an array and a linked list in terms of memory layout and time complexity?",
                                "topic": "Data Structures (Arrays vs Linked Lists)",
                                "difficulty": "easy",
                                "question_type": "technical",
                                "expected_points": [
                                    "Contiguous memory vs dispersed pointer-linked nodes",
                                    "O(1) index access in arrays vs O(N) access in linked lists",
                                    "Insertion and deletion trade-offs"
                                ]
                            }
                        else:
                            next_q = {
                                "id": 2,
                                "question": f"Nice to meet you, {first_name}! Let's start with our first technical question: In Python, can you explain the difference between a list and a tuple?",
                                "topic": "Data Structures (Lists vs Tuples)",
                                "difficulty": "easy",
                                "question_type": "technical",
                                "expected_points": [
                                    "Lists are mutable while tuples are immutable",
                                    "Syntax differences [] vs ()",
                                    "Use cases when to choose a tuple over a list"
                                ]
                            }

                    if next_q not in interview:
                        interview.append(next_q)
                    state["interview"] = interview

                    interview_session.state_data = state
                    interview_session.save()
                    if submission:
                        submission.state_data = state
                        submission.save(update_fields=['state_data'])

                    final_q_text = next_q["question"]

                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=final_q_text
                    )
                    return Response({
                        "question": final_q_text,
                        "is_finished": False,
                        "question_id": next_q["id"],
                        "question_type": next_q.get("question_type", "technical")
                    })

                # Candidate is answering a technical question:
                curr_q = interview[-1] if interview else {"id": 1, "question": "", "expected_points": []}

                if status_code == 'repeat':
                    rep = f"Certainly, let me repeat the question: {curr_q.get('question')}"
                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=rep
                    )
                    return Response({
                        "question": rep,
                        "is_finished": False,
                        "question_id": curr_q.get("id")
                    })

                # Detect candidate intent to revisit, recall, or answer a previous topic
                backtrack_patterns = [
                    "remember about", "i remember", "can i say that", "can i answer",
                    "which you ask", "which you asked", "ask 2 minutes before", "asked 2 minutes before",
                    "asked before", "earlier question", "previous question", "go back to",
                    "answer about list", "answer about tuple", "add to my answer"
                ]
                clean_lower = clean_answer.lower()
                is_backtrack_request = any(p in clean_lower for p in backtrack_patterns)

                # Detect candidate meta-comments, questions, or remarks on interview phrasing
                meta_patterns = [
                    "why are you saying", "why you are saying", "saying got it", "saying god it",
                    "repeating", "why do you keep", "what are you getting", "are you an ai",
                    "can you hear me", "are you listening", "what do you mean"
                ]
                is_meta_comment = any(p in clean_lower for p in meta_patterns)

                # Detect candidate expressing unfamiliarity or requesting to skip
                dont_know_patterns = [
                    "don't know", "dont know", "do not know", "no idea", "not sure",
                    "skip", "skip this", "haven't worked", "havent worked", "never used",
                    "pass", "not aware", "no clue"
                ]
                is_dont_know = any(p in clean_lower for p in dont_know_patterns)

                # Evaluate answer
                evaluation = {"score": 6, "feedback": "Answer recorded."}
                if is_backtrack_request:
                    evaluation = {
                        "score": 7,
                        "feedback": f"Candidate requested to return and elaborate on an earlier question: '{clean_answer}'.",
                        "covered_points": [],
                        "missed_points": [],
                        "follow_up_suggestion": "Warmly grant permission and invite the candidate to share their answer on the requested topic."
                    }
                elif is_meta_comment:
                    evaluation = {
                        "score": 6,
                        "feedback": f"Candidate made a conversational observation/remark: '{clean_answer}'.",
                        "covered_points": [],
                        "missed_points": [],
                        "follow_up_suggestion": "Address the candidate's remark naturally with poise and professional humor, avoid canned fillers, and proceed with the technical discussion."
                    }
                elif is_dont_know or status_code == 'skip':
                    evaluation = {
                        "score": 2,
                        "feedback": f"Candidate indicated unfamiliarity with this topic: '{clean_answer}'.",
                        "covered_points": [],
                        "missed_points": curr_q.get("expected_points", []),
                        "follow_up_suggestion": "Reassure the candidate warmly with empathy (e.g. 'That is completely okay, no problem at all!' or 'No worries, that is totally fine!') and smoothly transition to a more accessible foundational concept in another topic."
                    }
                elif clean_answer:
                    try:
                        evaluation = async_to_sync(evaluate_answer)(
                            question=curr_q.get("question", ""),
                            expected_points=curr_q.get("expected_points", []),
                            answer=clean_answer,
                            question_type=curr_q.get("question_type", "technical")
                        )
                    except Exception as e:
                        logger.warning(f"AI answer evaluation failed: {e}")

                answers[str(curr_q.get("id"))] = {
                    "answer": clean_answer or "Candidate skipped question.",
                    **evaluation
                }
                state["answers"] = answers

                # Save answer in state right away so evaluated answers are permanently recorded
                interview_session.state_data = state
                interview_session.save()
                if submission:
                    submission.state_data = state
                    submission.save(update_fields=['state_data'])

                # Only conclude if user explicitly requested finish / timer ended
                if status_code in ['finish', 'end', 'complete']:
                    farewell = "Thank you! That concludes our interview for today. I'll now finalize your performance report."
                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=farewell
                    )
                    if submission:
                        submission.status = MockInterviewSubmission.STATUS_COMPLETED
                        submission.save(update_fields=['status'])
                    return Response({
                        "question": farewell,
                        "is_finished": True,
                        "question_id": None
                    })

                # Generate next adaptive question without arbitrary count limitation
                next_q = None
                try:
                    next_q = async_to_sync(get_next_question)(state)
                except Exception as e:
                    logger.error(f"Error in get_next_question (full_ai turn): {e}")

                if not next_q:
                    # Never conclude prematurely on question failures; fall back to deterministic unique technical question
                    from mockinterviews.ai_interview.interview_engine import _build_fallback_question, _get_all_topics
                    all_topics = _get_all_topics(state.get("analysis", {}))
                    next_q = _build_fallback_question(
                        question_id=len(interview) + 1,
                        topics=all_topics,
                        difficulty=state.get("difficulty", "medium"),
                        existing_questions=interview,
                    )

                interview.append(next_q)
                state["interview"] = interview
                state["current_question_index"] = len(interview) - 1

                interview_session.state_data = state
                interview_session.save()
                if submission:
                    submission.state_data = state
                    submission.save(update_fields=['state_data'])

                final_q_text = next_q["question"]
                ChatMessage.objects.create(
                    chat_session=chat_session,
                    message_type="assistant",
                    content=final_q_text
                )
                return Response({
                    "question": final_q_text,
                    "is_finished": False,
                    "question_id": next_q["id"],
                    "question_type": next_q.get("question_type", "technical")
                })

            # ==========================================================
            # 2. PREDEFINED TREE ENGINE MODE
            # ==========================================================
            current_main_index = state.get('current_main_index', -1)
            current_node_id = state.get('current_node_id')
            intro_details = state.get('intro_details', {'name': None, 'experience': None, 'skills': None, 'attempts': 0, 'completed': False})

            if current_main_index == -1 and not intro_details.get('completed'):
                is_meaningful = len(clean_answer.split()) >= 2 or len(clean_answer) >= 8

                if not is_meaningful:
                    intro_details['attempts'] = intro_details.get('attempts', 0) + 1
                    state['intro_details'] = intro_details
                    interview_session.state_data = state
                    interview_session.save()
                    if submission:
                        submission.state_data = state
                        submission.save(update_fields=['state_data'])

                    ask_phrase = "Whenever you're ready, please share a brief introduction of yourself to get started."
                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=ask_phrase
                    )
                    return Response({
                        "question": ask_phrase,
                        "is_finished": False,
                        "question_id": "intro"
                    })

                # Intro provided:
                intro_details['completed'] = True
                new_details = self._analyze_intro_answer(clean_answer)
                if new_details.get('name'): intro_details['name'] = new_details['name']
                if new_details.get('experience'): intro_details['experience'] = new_details['experience']
                if new_details.get('skills'): intro_details['skills'] = new_details['skills']
                state['intro_details'] = intro_details

                current_main_index = 0
                next_node_id = planned_questions[0]
                next_node = PredefinedInterviewQuestion.objects.get(id=next_node_id)

                state['current_main_index'] = 0
                state['current_node_id'] = str(next_node.id)
                state['asked_in_session'] = [str(next_node.id)]

                interview_session.state_data = state
                interview_session.save()
                if submission:
                    submission.state_data = state
                    submission.save(update_fields=['state_data'])

                first_name = intro_details.get('name') or request.user.first_name or "there"
                transition_template = random.choice(INTERVIEW_TRANSITIONS['first_question_intro'])
                transition = transition_template.format(name=first_name)
                final_question_text = transition + next_node.text

                ChatMessage.objects.create(
                    chat_session=chat_session,
                    message_type="assistant",
                    content=final_question_text
                )
                return Response({
                    "question": final_question_text,
                    "is_finished": False,
                    "question_id": str(next_node.id)
                })

            # Handled technical predefined turns:
            if status_code == 'repeat' and current_node_id:
                try:
                    curr_node = PredefinedInterviewQuestion.objects.get(id=current_node_id)
                    transition = random.choice(INTERVIEW_TRANSITIONS['repeat'])
                    return Response({
                        "question": transition + curr_node.text,
                        "is_finished": False,
                        "question_id": str(curr_node.id)
                    })
                except PredefinedInterviewQuestion.DoesNotExist:
                    pass

            next_node = None
            is_new_main_topic = False
            is_skip = (status_code == 'skip')

            if current_node_id and status_code == 'normal':
                try:
                    curr_node = PredefinedInterviewQuestion.objects.get(id=current_node_id)
                    follow_ups = curr_node.follow_ups.all().order_by('created_at')

                    asked_in_session = state.get('asked_in_session', [])
                    for fu in follow_ups:
                        if str(fu.id) not in asked_in_session:
                            next_node = fu
                            break
                except PredefinedInterviewQuestion.DoesNotExist:
                    pass

            if not next_node:
                current_main_index += 1
                if current_main_index < len(planned_questions):
                    next_node_id = planned_questions[current_main_index]
                    try:
                        next_node = PredefinedInterviewQuestion.objects.get(id=next_node_id)
                        is_new_main_topic = True
                    except PredefinedInterviewQuestion.DoesNotExist:
                        state['current_main_index'] = current_main_index
                        interview_session.state_data = state
                        interview_session.save()
                        return self.get_next_ai_question(request, pk)
                else:
                    farewell = "Thank you! That concludes our interview for today. I'll now finalize your performance report."
                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=farewell
                    )
                    if submission:
                        submission.status = MockInterviewSubmission.STATUS_COMPLETED
                        submission.save(update_fields=['status'])
                    return Response({
                        "question": farewell,
                        "is_finished": True,
                        "question_id": None
                    })

            if is_skip:
                transition = random.choice(INTERVIEW_TRANSITIONS['skip_topic'])
            elif is_new_main_topic:
                transition = random.choice(INTERVIEW_TRANSITIONS['next_topic'])
            else:
                transition = random.choice(INTERVIEW_TRANSITIONS['acknowledgment'])

            final_question_text = transition + next_node.text

            asked_in_session = state.get('asked_in_session', [])
            asked_in_session.append(str(next_node.id))

            state['current_main_index'] = current_main_index
            state['current_node_id'] = str(next_node.id)
            state['asked_in_session'] = list(set(asked_in_session))

            interview_session.state_data = state
            interview_session.save()

            if submission:
                submission.state_data = state
                submission.save(update_fields=['state_data'])

            ChatMessage.objects.create(
                chat_session=chat_session,
                message_type="assistant",
                content=final_question_text
            )

            return Response({
                "question": final_question_text,
                "is_finished": False,
                "question_id": str(next_node.id),
                "level": getattr(next_node, 'level', 1)
            })
        except Exception as e:
            logger.error(f"Error in get_next_ai_question: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": "Internal server error during question progression"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def submissions(self, request, pk=None):
        mock_interview = self.get_object()
        user = request.user
        
        qs = MockInterviewSubmission.objects.filter(mock_interview=mock_interview).order_by('-created_at')
        is_privileged = user.is_staff or (hasattr(user, 'role') and user.role in ['admin', 'instructor'])
        
        if not is_privileged:
            qs = qs.filter(user=user)
            
        serializer = MockInterviewSubmissionSerializer(qs, many=True, context={'request': request, 'view': self})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def my_interviews(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            return Response([])
        qs = MockInterviewSubmission.objects.filter(user=user).order_by('-created_at')
        product_param = request.query_params.get("product")
        if product_param:
            qs = qs.filter(
                Q(mock_interview__products__contains=[product_param]) |
                Q(mock_interview__products__contains=[product_param.lower()])
            )
        serializer = MockInterviewSubmissionSerializer(qs, many=True, context={'request': request, 'view': self})
        return Response(serializer.data)


class MockInterviewSubmissionViewSet(viewsets.ModelViewSet):
    queryset = MockInterviewSubmission.objects.all()
    serializer_class = MockInterviewSubmissionSerializer
    permission_classes = [IsOwnerOrInstructorOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["user__username", "mock_interview__title"]
    ordering_fields = ['created_at', 'marks']
    
    def get_queryset(self):
        qs = super().get_queryset()
        mock_interview_id = self.request.query_params.get('mock_interview')
        if mock_interview_id:
            qs = qs.filter(mock_interview_id=mock_interview_id)
        
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
            
        email = self.request.query_params.get('email')
        if email:
            qs = qs.filter(user__email__iexact=email)
            
        user = self.request.user
        is_privileged = (
            user.is_staff
            or user.is_superuser
            or (hasattr(user, 'is_admin') and user.is_admin())
            or (hasattr(user, 'is_instructor') and user.is_instructor())
            or (hasattr(user, 'is_recruiter') and user.is_recruiter())
            or (hasattr(user, 'role') and user.role in ['admin', 'instructor', 'recruiter'])
        )
        if not is_privileged:
            qs = qs.filter(user=user)
            
        return qs.order_by('-created_at')

    def perform_update(self, serializer):
        instance = serializer.save()
        
        if instance.status == MockInterviewSubmission.STATUS_COMPLETED:
            logger.info(f"--- Interview Completed detected for submission {instance.id} ---")
            
            progress, created = UserInterviewProgress.objects.get_or_create(
                user=instance.user,
                mock_interview=instance.mock_interview
            )
            
            progress.completed_count += 1
            
            asked_ids = self.request.data.get('asked_question_ids', [])
            if not asked_ids:
                try:
                    chat_session = instance.chat_session or ChatSession.objects.filter(id=instance.old_chat_session_id).first()
                    if chat_session and hasattr(chat_session, 'interview_session'):
                        state = chat_session.interview_session.state_data or {}
                        if instance.interview_type == 'predefined':
                            asked_ids = state.get('asked_in_session', []) or state.get('planned_questions', [])
                except Exception as e:
                    logger.error(f"Failed to fetch state for perform_update: {e}")

            if asked_ids:
                if not isinstance(progress.asked_questions, list):
                    progress.asked_questions = []
                progress.asked_questions.extend(asked_ids)
                progress.asked_questions = list(set(progress.asked_questions))
            
            if progress.completed_count >= 6:
                progress.completed_count = 0
                progress.asked_questions = []
                
            progress.save()

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def upload_resume(self, request):
        try:
            jd_text = request.data.get('jd_text', '')
            resume_text = request.data.get('resume_text', '')
            if not jd_text.strip() or not resume_text.strip():
                return Response({"error": "Both Job Description and Resume text are required."}, status=status.HTTP_400_BAD_REQUEST)
            
            from mockinterviews.ai_interview.resume_parser import analyze_resume
            
            analysis = async_to_sync(analyze_resume)(resume_text, jd_text)
            return Response(analysis)
        except Exception as e:
            logger.error(f"Error in upload_resume: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def upload_resume_pdf(self, request):
        try:
            jd_text = request.data.get('jd_text', '')
            resume_file = request.FILES.get('resume')
            if not jd_text.strip() or not resume_file:
                return Response({"error": "Both Job Description and Resume PDF file are required."}, status=status.HTTP_400_BAD_REQUEST)
            
            from mockinterviews.ai_interview.resume_parser import extract_text_from_pdf, analyze_resume
            
            pdf_bytes = resume_file.read()
            resume_text = async_to_sync(extract_text_from_pdf)(pdf_bytes)
            if not resume_text.strip():
                return Response({"error": "Could not extract text from the provided PDF. Please try pasting the text instead."}, status=status.HTTP_400_BAD_REQUEST)
            
            analysis = async_to_sync(analyze_resume)(resume_text, jd_text)
            return Response(analysis)
        except Exception as e:
            logger.error(f"Error in upload_resume_pdf: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def start_interview(self, request):
        try:
            user = request.user
            active_session = has_active_submission(user)
            if active_session:
                return Response(
                    {'error': 'You already have an active test, assessment, or interview session in progress. Please complete or cancel it before starting a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            analysis = request.data.get('analysis')
            difficulty = request.data.get('difficulty', 'medium').lower()
            num_questions = int(request.data.get('num_questions', 5))
            adaptive = bool(request.data.get('adaptive', False))
            # Raw texts for admin visibility
            jd_text = request.data.get('jd_text', '')
            resume_text = request.data.get('resume_text', '')
            
            if not analysis:
                return Response({"error": "Resume/JD analysis is required to start the interview."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get AI Agent
            ai_agent = AIAgent.objects.filter(is_active=True).first()
            if not ai_agent:
                return Response({"error": "No active AI agent available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            role_title = analysis.get('_jd_requirements', {}).get('title') or analysis.get('domain') or 'Custom Role'
            
            # Create ChatSession
            chat_session = ChatSession.objects.create(
                user=user,
                ai_agent=ai_agent,
                title=f"Custom JD/Resume Interview: {role_title}",
                page="mock_interview",
                context={
                    "role": role_title,
                    "difficulty": difficulty,
                    "interview_type": "jd_resume",
                    "adaptive": adaptive,
                    "candidate_info": f"Candidate Analysis: {json.dumps(analysis)}"
                }
            )
            
            # Create InterviewSession
            interview_session = InterviewSession.objects.create(
                user=user,
                chat_session=chat_session,
                role_title=role_title,
                role_level=difficulty,
                duration_minutes=30,
                status="started"
            )
            
            # Initialize State
            state_data = {
                "analysis": analysis,
                "difficulty": difficulty,
                "num_questions": num_questions,
                "adaptive": adaptive,
                "interview": [],
                "answers": {},
                "current_question_index": 0,
                "hints": {},
                "face_checks": [],
                "face_enrollment": None,
                # Raw JD + resume for admin review
                "jd_text": jd_text,
                "resume_text": resume_text,
            }
            
            from mockinterviews.ai_interview.interview_engine import generate_questions, get_next_question
            
            if not adaptive:
                # Batch mode: generate all questions
                state_data["interview"] = async_to_sync(generate_questions)(analysis, difficulty, num_questions)
            else:
                # Adaptive mode: generate first question
                first_q = async_to_sync(get_next_question)(state_data, num_questions)
                if first_q:
                    state_data["interview"] = [first_q]
            
            if not state_data["interview"]:
                return Response({"error": "Failed to generate interview questions. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create Submission
            submission = MockInterviewSubmission.objects.create(
                mock_interview=None,
                user=user,
                status=MockInterviewSubmission.STATUS_STARTED,
                experience_level=difficulty,
                chat_session=chat_session,
                interview_type="full_ai",
                selected_duration=30,
                state_data=state_data
            )
            
            # Save first question as ChatMessage
            first_question = state_data["interview"][0]
            ChatMessage.objects.create(
                chat_session=chat_session,
                message_type="assistant",
                content=first_question["question"]
            )
            
            return Response({
                'submission_id': submission.id,
                'interview_session_id': interview_session.id,
                'chat_session_id': chat_session.id,
                'first_question': first_question["question"],
                'first_question_id': first_question["id"],
                'status': submission.status,
                'is_finished': False
            })
        except Exception as e:
            logger.error(f"Error in start_interview: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def next_question(self, request, pk=None):
        try:
            submission = self.get_object()
            state = submission.state_data or {}
            
            interview = state.get("interview", [])
            current_index = state.get("current_question_index", 0)
            num_questions = state.get("num_questions", 5)
            adaptive = state.get("adaptive", False)
            
            # Increment question index
            next_index = current_index + 1
            state["current_question_index"] = next_index
            
            if next_index >= num_questions:
                # End of interview
                farewell = "Thank you! That completes the interview. I'll now finalize your performance report."
                ChatMessage.objects.create(
                    chat_session=submission.chat_session,
                    message_type="assistant",
                    content=farewell
                )
                submission.status = MockInterviewSubmission.STATUS_COMPLETED
                submission.save()
                return Response({
                    "question": farewell,
                    "is_finished": True
                })
            
            next_q = None
            if not adaptive:
                # Batch mode: retrieve pre-generated question
                if next_index < len(interview):
                    next_q = interview[next_index]
            else:
                # Adaptive mode: generate next question on the fly
                from mockinterviews.ai_interview.interview_engine import get_next_question
                next_q = async_to_sync(get_next_question)(state, num_questions)
                if next_q:
                    interview.append(next_q)
                    state["interview"] = interview
            
            if not next_q:
                # Fallback to farewell if we couldn't retrieve/generate the question
                farewell = "Thank you! That completes the interview. I'll now finalize your performance report."
                ChatMessage.objects.create(
                    chat_session=submission.chat_session,
                    message_type="assistant",
                    content=farewell
                )
                submission.status = MockInterviewSubmission.STATUS_COMPLETED
                submission.save()
                return Response({
                    "question": farewell,
                    "is_finished": True
                })
            
            # Save next question as ChatMessage
            ChatMessage.objects.create(
                chat_session=submission.chat_session,
                message_type="assistant",
                content=next_q["question"]
            )
            
            submission.state_data = state
            submission.save()
            
            return Response({
                "question": next_q["question"],
                "question_id": next_q["id"],
                "is_finished": False
            })
        except Exception as e:
            logger.error(f"Error in next_question: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit_answer(self, request, pk=None):
        try:
            submission = self.get_object()
            state = submission.state_data or {}
            
            question_id = int(request.data.get('question_id'))
            user_answer = request.data.get('answer', '')
            answer_duration_seconds = request.data.get('answer_duration_seconds')
            if answer_duration_seconds is not None:
                answer_duration_seconds = float(answer_duration_seconds)
            
            # Find the question
            interview = state.get("interview", [])
            target_q = None
            for q in interview:
                if q.get("id") == question_id:
                    target_q = q
                    break
            
            if not target_q:
                return Response({"error": "Question not found in this interview session."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Log user's answer as ChatMessage
            ChatMessage.objects.create(
                chat_session=submission.chat_session,
                message_type="user",
                content=user_answer
            )
            
            # Update answers dict in state_data
            answers = state.get("answers", {})
            is_follow_up = str(question_id) in answers
            previous_answer_data = answers.get(str(question_id))
            
            is_negative_followup = False
            if is_follow_up and previous_answer_data:
                clean_ans = user_answer.strip().lower().rstrip('.!?')
                negative_phrases = {
                    "no", "nothing", "nothing else", "no nothing else", "skip", "next", 
                    "pass", "move on", "go ahead", "no thanks", "no, thank you", "none",
                    "no other details", "done", "that's it", "thats it", "no more"
                }
                if clean_ans in negative_phrases or len(clean_ans.split()) < 4:
                    is_negative_followup = True
            
            if is_negative_followup:
                # Use the previous evaluation, don't overwrite with low score
                evaluation = {
                    k: v for k, v in previous_answer_data.items()
                    if k not in ["answer", "duration_seconds"]
                }
                proceed = True
                num_questions = state.get("num_questions", 5)
                is_finished = len(answers) >= num_questions
                from mockinterviews.ai_interview.conversation_cues import closing_ack, next_question_ack
                cue = closing_ack() if is_finished else next_question_ack()
            else:
                # If follow up and not negative, evaluate combined answer
                eval_answer = user_answer
                if is_follow_up and previous_answer_data:
                    eval_answer = previous_answer_data.get("answer", "") + "\n" + user_answer
                
                # Evaluate answer
                from mockinterviews.ai_interview.evaluator import evaluate_answer
                
                evaluation = async_to_sync(evaluate_answer)(
                    question=target_q.get("question"),
                    expected_points=target_q.get("expected_points", []),
                    answer=eval_answer,
                    question_type=target_q.get("question_type", "technical")
                )
                
                answers[str(question_id)] = {
                    "answer": eval_answer,
                    "duration_seconds": (previous_answer_data.get("duration_seconds") or 0) + (answer_duration_seconds or 0) if is_follow_up else answer_duration_seconds,
                    **evaluation
                }
                state["answers"] = answers
                
                # Determine dialogue acknowledgement cue
                num_questions = state.get("num_questions", 5)
                is_finished = len(answers) >= num_questions
                
                from mockinterviews.ai_interview.conversation_cues import cue_for_answer
                cue, proceed = cue_for_answer(evaluation, answer_duration_seconds, is_finished)
                
                # Force proceed if it's a follow-up attempt to prevent infinite looping
                if is_follow_up:
                    proceed = True
                    from mockinterviews.ai_interview.conversation_cues import closing_ack, next_question_ack
                    cue = closing_ack() if is_finished else next_question_ack()
            
            # Save cue to ChatMessage
            ChatMessage.objects.create(
                chat_session=submission.chat_session,
                message_type="assistant",
                content=cue.get("message")
            )
            
            submission.state_data = state
            submission.save()
            
            return Response({
                "evaluation": evaluation,
                "cue": cue,
                "proceed": proceed
            })
        except Exception as e:
            logger.error(f"Error in submit_answer: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def get_hint(self, request, pk=None):
        try:
            submission = self.get_object()
            state = submission.state_data or {}
            
            question_id = int(request.data.get('question_id'))
            partial_answer = request.data.get('partial_answer', '')
            
            # Find the question
            interview = state.get("interview", [])
            target_q = None
            for q in interview:
                if q.get("id") == question_id:
                    target_q = q
                    break
            
            if not target_q:
                return Response({"error": "Question not found in this interview session."}, status=status.HTTP_400_BAD_REQUEST)
            
            from mockinterviews.ai_interview.hint_service import generate_hint
            
            hint_res = async_to_sync(generate_hint)(
                session_id=str(submission.id),
                question_id=question_id,
                question=target_q.get("question"),
                topic=target_q.get("topic", "General"),
                partial_answer=partial_answer
            )
            
            # Save hint as ChatMessage
            ChatMessage.objects.create(
                chat_session=submission.chat_session,
                message_type="assistant",
                content=hint_res.get("hint")
            )
            
            # Reload submission
            submission.refresh_from_db()
            
            return Response(hint_res)
        except Exception as e:
            logger.error(f"Error in get_hint: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def interview_cue(self, request, pk=None):
        try:
            event_type = request.data.get('event_type', '')
            silence_seconds = request.data.get('silence_seconds')
            if silence_seconds is not None: silence_seconds = float(silence_seconds)
            answer_duration_seconds = request.data.get('answer_duration_seconds')
            if answer_duration_seconds is not None: answer_duration_seconds = float(answer_duration_seconds)
            partial_answer = request.data.get('partial_answer', '')
            
            from mockinterviews.ai_interview.conversation_cues import cue_for_event
            cue, proceed = cue_for_event(
                event_type=event_type,
                silence_seconds=silence_seconds,
                answer_duration_seconds=answer_duration_seconds,
                partial_answer=partial_answer
            )
            
            return Response({
                "cue": cue,
                "proceed": proceed
            })
        except Exception as e:
            logger.error(f"Error in interview_cue: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def face_enroll(self, request, pk=None):
        try:
            submission = self.get_object()
            image_b64 = request.data.get('image', '')
            if not image_b64:
                return Response({"error": "No image provided for enrollment."}, status=status.HTTP_400_BAD_REQUEST)
            
            import base64, io
            # Handle base64 image data url format
            if ',' in image_b64:
                image_b64 = image_b64.split(',')[1]
            image_bytes = base64.b64decode(image_b64)
            
            from mockinterviews.ai_interview.face_verification import enroll_face
            
            res = async_to_sync(enroll_face)(image_bytes)
            
            # Upload enrollment photo to S3/MinIO
            enroll_photo_key = None
            try:
                from core.storage import upload_image
                from django.core.files.base import ContentFile
                user_id = submission.user_id
                s3_key = f"mock_interviews/{user_id}/{submission.id}/enroll.jpg"
                enroll_photo_key = upload_image(
                    key=s3_key,
                    file_obj=ContentFile(image_bytes, name="enroll.jpg"),
                    replace_extensions=("png", "jpeg", "jpg"),
                )
            except Exception as upload_err:
                logger.warning(f"face_enroll: S3 upload failed (non-fatal): {upload_err}")
            
            if res.get("enrolled") or res.get("status") == "stub":
                state = submission.state_data or {}
                state["face_enrollment"] = {
                    "enrolled": True,
                    "face_id": res.get("reference_id") or "stub",
                    "photo_key": enroll_photo_key,
                }
                submission.state_data = state
                submission.save()
                
            return Response(res)
        except Exception as e:
            logger.error(f"Error in face_enroll: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def face_verify(self, request, pk=None):
        try:
            submission = self.get_object()
            image_b64 = request.data.get('image', '')
            if not image_b64:
                return Response({"error": "No image provided for verification."}, status=status.HTTP_400_BAD_REQUEST)
            
            state = submission.state_data or {}
            enrollment = state.get("face_enrollment") or {}
            if not enrollment.get("enrolled"):
                return Response({"error": "Face not enrolled. Enroll first."}, status=status.HTTP_400_BAD_REQUEST)
            
            import base64, io
            # Handle base64 image data url format
            if ',' in image_b64:
                image_b64 = image_b64.split(',')[1]
            image_bytes = base64.b64decode(image_b64)
            
            from mockinterviews.ai_interview.face_verification import verify_face
            
            res = async_to_sync(verify_face)(image_bytes)
            
            # Upload verification photo to S3/MinIO
            verify_photo_key = None
            try:
                from core.storage import upload_image
                from django.core.files.base import ContentFile
                user_id = submission.user_id
                ts = timezone.now().strftime("%Y%m%dT%H%M%S")
                s3_key = f"mock_interviews/{user_id}/{submission.id}/verify_{ts}.jpg"
                verify_photo_key = upload_image(
                    key=s3_key,
                    file_obj=ContentFile(image_bytes, name=f"verify_{ts}.jpg"),
                )
            except Exception as upload_err:
                logger.warning(f"face_verify: S3 upload failed (non-fatal): {upload_err}")
            
            # Log verify check in state_data
            face_checks = state.get("face_checks", [])
            face_checks.append({
                "timestamp": timezone.now().isoformat(),
                "photo_key": verify_photo_key,
                **res
            })
            state["face_checks"] = face_checks
            submission.state_data = state
            submission.save()
            
            return Response(res)
        except Exception as e:
            logger.error(f"Error in face_verify: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _synthesize_report_from_state(self, submission, interview_session):
        """Synthesize a complete, robust InterviewReport from answers evaluated during the session."""
        state = submission.state_data or (interview_session.state_data if interview_session else {}) or {}
        answers = state.get("answers", {})
        interview = state.get("interview", [])

        q_map = {}
        for q in interview:
            if isinstance(q, dict):
                q_map[str(q.get("id"))] = q

        total_score = 0.0
        valid_count = 0
        question_analysis = []
        skills_covered = set()

        for q_id, a_data in answers.items():
            if not isinstance(a_data, dict):
                continue
            q_info = q_map.get(str(q_id), {})
            q_text = q_info.get("question") or f"Question {q_id}"
            q_type = q_info.get("question_type", "technical")
            topic = q_info.get("topic", "General")
            if topic and topic != "Self introduction":
                skills_covered.add(topic)

            ans_text = a_data.get("answer", "")
            raw_score = a_data.get("score", 5)
            score_100 = round(float(raw_score) * 10, 1) if float(raw_score) <= 10 else round(float(raw_score), 1)

            total_score += score_100
            valid_count += 1

            feedback = a_data.get("feedback") or "Candidate response recorded and evaluated."
            covered = a_data.get("covered_points") or []
            missed = a_data.get("missed_points") or []

            question_analysis.append({
                "question": q_text,
                "type": q_type,
                "user_answer": ans_text[:400] if ans_text else "No response provided.",
                "ai_score": int(score_100),
                "what_went_well": covered if covered else ([feedback] if feedback else ["Attempted question."]),
                "what_could_be_better": missed if missed else (["Provide more in-depth technical explanation."] if score_100 < 70 else ["Clear technical response."]),
                "missing_terminologies": [p for p in missed if len(str(p).split()) <= 4],
                "recommended_response": f"An ideal response should address the key concepts of {topic}, including practical implementation details and architectural trade-offs."
            })

        overall_score = round(total_score / max(1, valid_count), 1) if valid_count > 0 else 60.0

        skill_analysis = {}
        for skill in skills_covered:
            skill_analysis[skill] = {
                "score": min(10, max(1, round(overall_score / 10))),
                "feedback": f"Demonstrated practical understanding of {skill} concepts."
            }
        if not skill_analysis:
            title = submission.mock_interview.title if submission and submission.mock_interview else "Core Technical Skills"
            skill_analysis[title] = {
                "score": min(10, max(1, round(overall_score / 10))),
                "feedback": "Covered core topics during interactive interview."
            }

        comm_score = min(95, max(50, int(overall_score * 0.95 + 5)))
        tech_score = min(95, max(40, int(overall_score)))
        ps_score = min(95, max(45, int(overall_score * 0.92 + 5)))

        return {
            "overall_score": overall_score,
            "feedback_summary": (
                f"Candidate completed {valid_count} interview questions. "
                f"Demonstrated an overall evaluation score of {overall_score}/100. "
                f"Topics assessed included {', '.join(skills_covered) if skills_covered else 'technical fundamentals'}."
            ),
            "performance_metrics": {
                "Communication": comm_score,
                "Technical Proficiency": tech_score,
                "Problem Solving": ps_score,
                "Adaptability": int((comm_score + ps_score) / 2)
            },
            "skill_analysis": skill_analysis,
            "question_analysis": question_analysis,
            "key_takeaways": {
                "strengths": [
                    "Engaged constructively in interactive voice conversation",
                    f"Attempted {valid_count} technical discussion topics"
                ],
                "improvements": [
                    "Elaborate further on core implementation details and edge cases",
                    "Provide concrete code or architectural examples in technical explanations"
                ]
            },
            "meta_stats": {
                "questions_evaluated": valid_count,
                "source": "state_data_synthesis"
            }
        }

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def generate_report(self, request, pk=None):
        try:
            submission = self.get_object()

            source = request.data.get('source') or (submission.state_data and submission.state_data.get('source'))
            is_student = (source == 'student') or (submission.interview_type == 'full_ai' and not (submission.session_state and submission.session_state.get('questions')))

            if not is_student and submission.session_state:
                settings = get_settings()
                dyn_session = DynamicInterviewSession.model_validate(submission.session_state)
                dyn_session.status = DynamicInterviewStatus.COMPLETED
                reporter = InterviewReportService(
                    evaluator=InterviewEvaluator(rubric_version=settings.rubric_version),
                    llm_client=OpenAIInterviewLLM.from_settings(settings),
                )
                report_bundle = reporter.create_report_bundle(dyn_session)
                disc_scaled = (
                    report_bundle.vitarka_report.scaled_score
                    if report_bundle.vitarka_report.scaled_score is not None
                    else round((report_bundle.vitarka_report.overall_score / 10.0) * (report_bundle.vitarka_report.max_score or 25.0), 1)
                )
                response_data = report_bundle.model_dump(mode='json')
                response_data.update({
                    "overall_score": report_bundle.overall_report.overall_score,
                    "recommendation": report_bundle.overall_report.recommendation,
                    "markdown": report_bundle.overall_report.markdown,
                    "scaled_score": disc_scaled,
                    "discussion_max_score": report_bundle.vitarka_report.max_score,
                    "marks": disc_scaled,
                })
                dyn_session_dict = dyn_session.model_dump(mode='json')
                dyn_session_dict['report_bundle'] = response_data
                dyn_session_dict['report'] = report_bundle.vitarka_report.model_dump(mode='json')
                submission.session_state = sanitize_null_bytes(dyn_session_dict)
                submission.marks = disc_scaled
                submission.status = MockInterviewSubmission.STATUS_COMPLETED
                submission.save(update_fields=['session_state', 'marks', 'status'])
                return Response(response_data)

            chat_sess = submission.chat_session
            if not chat_sess and submission.old_chat_session_id:
                chat_sess = ChatSession.objects.filter(id=submission.old_chat_session_id).first()
            if not chat_sess or not hasattr(chat_sess, 'interview_session'):
                return Response({"error": "No active interview session associated with this submission."}, status=status.HTTP_400_BAD_REQUEST)

            interview_session = chat_sess.interview_session
            if hasattr(interview_session, 'report') and interview_session.report:
                serializer = InterviewReportSerializer(interview_session.report)
                report_data = dict(serializer.data)
                report_data["overall_score"] = interview_session.report.overall_score
                report_data["marks"] = interview_session.report.overall_score
                report_data["recommendation"] = "Strong Hire" if interview_session.report.overall_score >= 80 else ("Hire" if interview_session.report.overall_score >= 65 else "Needs Practice")
                return Response(report_data)

            # Generate report using InterviewReportGenerator with state_data synthesis fallback
            report_data = None
            try:
                generator = InterviewReportGenerator()
                trigger_text = "The interview is starting now. Please introduce yourself and ask the first question."
                messages = chat_sess.messages.order_by("created_at")
                conversation_text = ""
                for msg in messages:
                    if msg.content.strip() == trigger_text:
                        continue
                    role = "Interviewer" if msg.message_type != "user" else "Candidate"
                    conversation_text += f"{role}: {msg.content}\n\n"

                resume_text = chat_sess.context.get("candidate_info", "No resume provided.") if chat_sess.context else "No resume provided."

                report_data = async_to_sync(generator.generate_report)(
                    conversation_text, resume_content=resume_text
                )
            except Exception as gen_err:
                logger.warning(f"InterviewReportGenerator failed: {gen_err}. Falling back to state_data synthesis.")
                report_data = self._synthesize_report_from_state(submission, interview_session)

            if not report_data or not isinstance(report_data, dict):
                report_data = self._synthesize_report_from_state(submission, interview_session)

            overall_score = float(report_data.get("overall_score", 0.0))

            report_instance, _ = InterviewReport.objects.update_or_create(
                interview_session=interview_session,
                defaults={
                    "overall_score": overall_score,
                    "feedback_summary": report_data.get("feedback_summary", ""),
                    "performance_metrics": report_data.get("performance_metrics", {}),
                    "skill_analysis": report_data.get("skill_analysis", {}),
                    "question_analysis": report_data.get("question_analysis", []),
                    "key_takeaways": report_data.get("key_takeaways", {}),
                    "meta_stats": report_data.get("meta_stats", {})
                }
            )

            submission.marks = overall_score
            submission.status = MockInterviewSubmission.STATUS_COMPLETED
            if submission.state_data and isinstance(submission.state_data, dict):
                submission.state_data["report"] = report_data
                submission.save(update_fields=['marks', 'status', 'state_data'])
            else:
                submission.save(update_fields=['marks', 'status'])

            progress, created = UserInterviewProgress.objects.get_or_create(
                user=submission.user,
                mock_interview=submission.mock_interview
            )
            progress.completed_count += 1
            if progress.completed_count >= 6:
                progress.completed_count = 0
                progress.asked_questions = []
            progress.save()

            serializer = InterviewReportSerializer(report_instance)
            resp = dict(serializer.data)
            resp["overall_score"] = overall_score
            resp["marks"] = overall_score
            resp["recommendation"] = "Strong Hire" if overall_score >= 80 else ("Hire" if overall_score >= 65 else "Needs Practice")
            return Response(resp)

        except Exception as e:
            logger.error(f"Error in generate_report: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def report(self, request, pk=None):
        submission = self.get_object()
        if submission.session_state and isinstance(submission.session_state, dict):
            if "report" in submission.session_state:
                return Response(submission.session_state["report"])
            if "report_bundle" in submission.session_state:
                return Response(submission.session_state["report_bundle"])

        chat_sess = submission.chat_session
        if not chat_sess and submission.old_chat_session_id:
            chat_sess = ChatSession.objects.filter(id=submission.old_chat_session_id).first()
        if not chat_sess or not hasattr(chat_sess, 'interview_session'):
            return Response({"error": "No interview session associated"}, status=status.HTTP_404_NOT_FOUND)

        interview_session = chat_sess.interview_session
        if not hasattr(interview_session, 'report') or not interview_session.report:
            return Response({"error": "Report not yet generated"}, status=status.HTTP_404_NOT_FOUND)

        serializer = InterviewReportSerializer(interview_session.report)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def dynamic_coverage(self, request, pk=None):
        try:
            submission = self.get_object()
            if not submission.session_state:
                return Response({"error": "Dynamic session not found"}, status=status.HTTP_400_BAD_REQUEST)

            settings = get_settings()
            dyn_session = DynamicInterviewSession.model_validate(submission.session_state)
            coverage = InterviewEvaluator(rubric_version=settings.rubric_version).coverage(dyn_session)
            return Response(coverage.model_dump(mode='json'))
        except Exception as e:
            logger.error(f"Error in dynamic_coverage: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def dynamic_llm_calls(self, request, pk=None):
        try:
            submission = self.get_object()
            if not submission.session_state:
                return Response({"error": "Dynamic session not found"}, status=status.HTTP_400_BAD_REQUEST)

            dyn_session = DynamicInterviewSession.model_validate(submission.session_state)
            return Response([call.model_dump(mode='json') for call in dyn_session.llm_calls])
        except Exception as e:
            logger.error(f"Error in dynamic_llm_calls: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



    @action(detail=True, methods=['post'])
    def ingest_event(self, request, pk=None):
        mock_interview = self.get_object()
        interview_session_id = request.data.get('interview_session_id')
        if not interview_session_id:
            return Response({"error": "No interview session ID provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        from ai_assistant.models import InterviewSession
        interview_session = InterviewSession.objects.filter(id=interview_session_id).first()
        if not interview_session:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
            
        submission = MockInterviewSubmission.objects.filter(
            user=request.user, 
            mock_interview=mock_interview, 
            chat_session=interview_session.chat_session
        ).first()
        
        if not submission or not submission.session_state:
            return Response({"error": "Dynamic session not found"}, status=status.HTTP_400_BAD_REQUEST)
            
        dyn_session = DynamicInterviewSession.model_validate(submission.session_state)
        settings = get_settings()
        engine = DynamicQuestionEngine(
            llm_client=OpenAIInterviewLLM.from_settings(settings),
            max_followups_per_topic=settings.max_followups_per_topic,
        )
        
        try:
            event = AssessmentEvent.model_validate(request.data.get('event', {}))
            ingest_response = engine.ingest_event(dyn_session, event)
            submission.session_state = sanitize_null_bytes(dyn_session.model_dump(mode='json'))
            submission.state_data = {
                "source": "evaluation",
                "interview_type": "evaluation"
            }
            submission.save(update_fields=['session_state', 'state_data'])
            return Response({
                "status": "success",
                "event": ingest_response.event.model_dump(mode='json'),
                "extracted_signals": [signal.model_dump(mode='json') for signal in ingest_response.extracted_signals],
                "suggested_focus": [competency.value for competency in ingest_response.suggested_focus],
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

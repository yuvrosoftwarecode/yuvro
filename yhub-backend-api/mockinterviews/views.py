import logging
import traceback
import random
import asyncio

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

from ai_assistant.models import AIAgent, ChatSession, InterviewSession, ChatMessage

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

    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "updated_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        publish_status_param = self.request.query_params.get("publish_status")

        q = Q()
        if publish_status_param:
            q &= Q(publish_status=publish_status_param)

        if q:
            qs = qs.filter(q)

        return qs

    def _analyze_intro_answer(self, text):
        from ai_assistant.services import AIServiceFactory
        from django.conf import settings
        import json
        
        if not text or len(text.strip()) < 2:
            return {}
            
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
                return {}
                
            service = AIServiceFactory.create_service(agent.provider, agent.model_name)
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            response = loop.run_until_complete(service.generate_response(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=200
            ))
            
            resp_text = response.get("response", "").replace("```json", "").replace("```", "").strip()
            return json.loads(resp_text)
        except Exception as e:
            logger.error(f"Error extracting intro details: {str(e)}")
            return {}

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def start_interview(self, request, pk=None):
        try:
            user = request.user
            mock_interview = self.get_object()

            active_session = MockInterviewSubmission.objects.filter(
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
            
            interview_type = "full_ai" if is_master else "predefined"
            
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

            ai_agent = AIAgent.objects.filter(provider="anthropic", is_active=True).first()
            if not ai_agent:
                ai_agent = AIAgent.objects.filter(provider="gemini", is_active=True).first()
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

            is_sequential = str(request.data.get('sequential', '')).lower() in ['true', '1', 'yes']

            first_question_text = ""
            if interview_type == "predefined":
                if is_sequential:
                    main_pool = PredefinedInterviewQuestion.objects.filter(
                        mock_interview=mock_interview,
                        level=1
                    ).order_by('created_at')
                    selected_mains = list(main_pool)
                else:
                    main_pool = PredefinedInterviewQuestion.objects.filter(
                        mock_interview=mock_interview,
                        level=1
                    ).exclude(id__in=progress.asked_questions)
                    
                    if main_pool.count() < 10:
                        progress.asked_questions = [] 
                        progress.save()
                        main_pool = PredefinedInterviewQuestion.objects.filter(mock_interview=mock_interview, level=1)
                    
                    selected_mains = list(main_pool.order_by('?')[:10])
                
                planned_ids = [str(q.id) for q in selected_mains]
                
                greeting = f"Hello! I'm your AI interviewer today. We'll be discussing the {mock_interview.title} role. To start, could you please introduce yourself?"
                
                if chat_session:
                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="assistant",
                        content=greeting
                    )
                
                first_question_text = greeting
                
                state_data = {
                    "current_main_index": -1, 
                    "current_node_id": None,
                    "planned_questions": planned_ids
                }
                if interview_session:
                    interview_session.state_data = state_data
                    interview_session.save()
            else:
                initial_prompt = f"The interview for {mock_interview.title} ({experience_level}) is starting. Use the following candidate info for context: {context_text[:1000]}. Please introduce yourself and ask the first question."
                first_question_text = "Preparing your AI interviewer..."
                if chat_session:
                    ChatMessage.objects.create(
                        chat_session=chat_session,
                        message_type="system",
                        content=initial_prompt
                    )

            return Response({
                'submission_id': submission.id,
                'interview_session_id': str(interview_session.id) if interview_session else None,
                'chat_session_id': str(chat_session.id) if chat_session else None,
                'status': submission.status,
                'interview_type': interview_type,
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
                return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
                
            chat_session = interview_session.chat_session

            state = interview_session.state_data or {}

            if user_answer and user_answer.strip():
                ChatMessage.objects.create(
                    chat_session=chat_session,
                    message_type="user",
                    content=user_answer
                )

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
                    farewell = "Thank you! That concludes our predefined questions for today. I'll now finalize your performance report."
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

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def submissions(self, request, pk=None):
        mock_interview = self.get_object()
        user = request.user
        
        qs = MockInterviewSubmission.objects.filter(mock_interview=mock_interview)
        is_privileged = user.is_staff or (hasattr(user, 'role') and user.role in ['admin', 'instructor'])
        
        if not is_privileged:
            qs = qs.filter(user=user)
            
        serializer = MockInterviewSubmissionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_interviews(self, request):
        user = request.user
        qs = MockInterviewSubmission.objects.filter(user=user).order_by('-created_at')
        
        serializer = MockInterviewSubmissionSerializer(qs, many=True)
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
            
        if not (self.request.user.is_staff or (hasattr(self.request.user, 'role') and self.request.user.role in ['admin', 'instructor'])):
            qs = qs.filter(user=self.request.user)
            
        return qs

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
            if not asked_ids and instance.old_chat_session_id:
                try:
                    chat_session = ChatSession.objects.filter(id=instance.old_chat_session_id).first()
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

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def generate_report(self, request, pk=None):
        try:
            submission = self.get_object()
            
            if not submission.chat_session.id if submission.chat_session else submission.old_chat_session_id:
                return Response({"error": "No active interview session associated with this submission."}, status=status.HTTP_400_BAD_REQUEST)
            
            auth_token = str(request.auth) if request.auth else None
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # End the interview to generate the report
            try:
                loop.run_until_complete(AIClient.generate_interview_report(submission.old_chat_session_id, auth_token=auth_token))
            except Exception as e:
                # Might already be completed
                pass
                
            # Fetch the session and report from YHub
            session_data = loop.run_until_complete(AIClient.get_interview_session(submission.old_chat_session_id, auth_token=auth_token))
            report_data = session_data.get("report")
            
            if report_data:
                # Update submission marks and status
                submission.marks = report_data.get("overall_score", 0.0)
                submission.status = MockInterviewSubmission.STATUS_COMPLETED
                submission.save()
                return Response(report_data)
            else:
                return Response({"error": "Report not yet available or failed to generate."}, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            logger.error(f"Error in generate_report: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


import React, { useState, useRef } from 'react';
import DashboardLayout from '@/components/common/DashboardLayout';
import MockInterviewLibrary from '@/components/student/mock_interview/MockInterviewLibrary';
import PermissionDialog from '@/components/student/mock_interview/PermissionDialog';
import InterviewScreen from '@/components/student/mock_interview/InterviewScreen';
import ReportsScreen from '@/components/student/mock_interview/ReportsScreen';
import ThankYouScreen from '@/components/student/mock_interview/ThankYouScreen';
import UploadSection from '@/components/student/mock_interview/UploadSection';
import InterviewSetup from '@/components/student/mock_interview/InterviewSetup';
import { Role, InterviewSettings } from '@/types/mockInterview';
import { mockInterviewService } from '@/services/mockInterviewService';
import { aiMockInterviewService } from '@/services/aiMockInterviewService';

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type InterviewState = 'library' | 'upload' | 'setup' | 'permission' | 'interview' | 'reports' | 'thank-you';

const StudentMockInterview = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<InterviewState>('library');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [interviewSettings, setInterviewSettings] = useState<InterviewSettings | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [isNewReport, setIsNewReport] = useState(false);

  const [customAnalysis, setCustomAnalysis] = useState<any>(null);
  const [customSettings, setCustomSettings] = useState<any>(null);
  const [customJdText, setCustomJdText] = useState<string>('');
  const [customResumeText, setCustomResumeText] = useState<string>('');
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);

  // Step 1: User clicks "Start Interview" on a card → open permission dialog or custom upload
  const handleStartPractice = (role: Role) => {
    setSelectedRole(role);
    if (role.id === 'jd_resume') {
      setState('upload');
    } else {
      setState('permission');
    }
  };

  // Step 2: Permission granted → request actual media stream and start interview
  const handlePermissionConfirmed = async () => {
    if (!selectedRole || startingRef.current) return;
    
    // Unlock speech synthesis engine using the initial user gesture!
    const unlockUtterance = new SpeechSynthesisUtterance('');
    unlockUtterance.volume = 0;
    window.speechSynthesis.speak(unlockUtterance);
    
    startingRef.current = true;
    setStarting(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      console.error('Failed to get media permissions:', err);
      toast.error('Camera and microphone access is required. Please grant permissions and try again.');
      setState('library');
      startingRef.current = false;
      setStarting(false);
      return;
    }

    try {
      // Start the interview session
      let response;
      if (selectedRole.id === 'jd_resume') {
        const difficulty = customSettings?.difficulty || 'medium';
        const numQuestions = customSettings?.num_questions || 5;
        const adaptive = customSettings?.adaptive || false;
        
        response = await aiMockInterviewService.startInterview(
          customAnalysis,
          difficulty,
          numQuestions,
          adaptive,
          customJdText,
          customResumeText
        );
      } else {
        response = await mockInterviewService.startInterview(
          selectedRole.id,
          'beginner',
          selectedRole.max_duration,
          undefined 
        );
      }
      
      const settings: InterviewSettings = {
        difficulty: selectedRole.id === 'jd_resume' ? customSettings.difficulty : 'beginner',
        duration: selectedRole.id === 'jd_resume' ? `${customSettings.num_questions * 5} mins` : `${selectedRole.max_duration} mins`,
        interviewer: selectedRole.interviewer_name || 'Junnu',
        mediaStream: stream,
      };
      
      setInterviewSettings(settings);
      setAiConfig({
        interview_type: response.interview_type,
        first_question: response.first_question,
        first_question_id: response.first_question_id
      });
      setSubmissionId(response.submission_id);
      setInterviewSessionId(response.interview_session_id);
      setChatSessionId(response.chat_session_id);
      setState('interview');
      startingRef.current = false;
      setStarting(false);
    } catch (error: any) {
      console.error('Failed to start interview:', error);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      startingRef.current = false;
      setStarting(false);
      const apiError = error.message || 'Failed to start interview. Please try again.';
      sessionStorage.setItem('toast_error', apiError);
      window.location.reload();
    }
  };

  const handleAnalysisComplete = (analysis: any, jdText: string, resumeText: string) => {
    setCustomAnalysis(analysis);
    setCustomJdText(jdText);
    setCustomResumeText(resumeText);
    setState('setup');
  };

  const handleSetupComplete = (settings: { difficulty: string; num_questions: number; adaptive: boolean }) => {
    setCustomSettings(settings);
    setState('permission');
  };

  // Step 3: User cancelled permission dialog
  const handlePermissionCancel = () => {
    setSelectedRole(null);
    setState('library');
  };

  // Step 4: Interview completed (AI session finished)
  const handleInterviewComplete = (role: Role, difficulty: string, duration: string, sid: string) => {
    setSubmissionId(sid);
    setIsNewReport(true);
    setState('thank-you');
  };

  // Step 5: User exits interview early
  const handleExitInterview = () => {
    if (interviewSettings?.mediaStream) {
      interviewSettings.mediaStream.getTracks().forEach(t => t.stop());
    }
    setState('thank-you');
  };

  const handleTryAgain = () => {
    if (interviewSettings?.mediaStream) {
      interviewSettings.mediaStream.getTracks().forEach(t => t.stop());
    }
    setInterviewSettings(null);
    setSubmissionId(null);
    setInterviewSessionId(null);
    setIsNewReport(false);
    setState('permission');
  };

  const handleBackToLibrary = () => {
    if (interviewSettings?.mediaStream) {
      interviewSettings.mediaStream.getTracks().forEach(t => t.stop());
    }
    setSelectedRole(null);
    setInterviewSettings(null);
    setSubmissionId(null);
    setInterviewSessionId(null);
    setIsNewReport(false);
    setState('library');
  };

  // ── Upload section (custom interview only) ──────
  if (state === 'upload') {
    return (
      <DashboardLayout hideHeader={true} hideFooter={true} contentClassName="bg-slate-50/50">
        <div className="flex-1 px-8 py-6 pb-12">
          <UploadSection
            onAnalysisComplete={handleAnalysisComplete}
            onBack={handleBackToLibrary}
          />
        </div>
      </DashboardLayout>
    );
  }

  // ── Setup settings & metrics ───────────────────
  if (state === 'setup') {
    return (
      <DashboardLayout hideHeader={true} hideFooter={true} contentClassName="bg-slate-50/50">
        <div className="flex-1 px-8 py-6 pb-12">
          <InterviewSetup
            analysis={customAnalysis}
            onStart={handleSetupComplete}
            onCancel={handleBackToLibrary}
          />
        </div>
      </DashboardLayout>
    );
  }

  // ── Full-screen interview ──────────────────────
  if (state === 'interview' && selectedRole && interviewSettings) {
    return (
      <InterviewScreen
        role={selectedRole}
        difficulty={interviewSettings.difficulty}
        duration={interviewSettings.duration}
        interviewer={interviewSettings.interviewer}
        mediaStream={interviewSettings.mediaStream}
        resume={interviewSettings.resume}
        aiConfig={aiConfig}
        submissionId={submissionId || ''}
        interviewSessionId={interviewSessionId || ''}
        chatSessionId={chatSessionId || ''}
        onExit={handleExitInterview}
        onInterviewComplete={handleInterviewComplete}
      />
    );
  }

  // ── Reports screen ─────────────────────────────────
  if (state === 'reports' && selectedRole) {
    return (
      <ReportsScreen
        role={selectedRole}
        difficulty={interviewSettings?.difficulty || 'beginner'}
        duration={interviewSettings?.duration || '30 mins'}
        sessionId={submissionId}
        onTryAgain={handleTryAgain}
        onBackToLibrary={handleBackToLibrary}
        isNewReport={isNewReport}
      />
    );
  }

  // ── Thank you screen ──────────────────────
  if (state === 'thank-you') {
    return (
      <ThankYouScreen 
        onComplete={() => {
          if (submissionId) {
            navigate(`/student/mock-interview/report/${submissionId}`);
          } else {
            handleBackToLibrary();
          }
        }} 
      />
    );
  }

  // ── Library view ───────────────────────────────────
  return (
    <DashboardLayout 
      hideHeader={true} 
      hideFooter={true}
      contentClassName="bg-slate-50/50"
    >
      <div className="flex-1 px-8 py-6 pb-12">
        <div className="max-w-[1600px] mx-auto space-y-8">
          <MockInterviewLibrary onStartPractice={handleStartPractice} />
        </div>
      </div>
      <PermissionDialog
        open={state === 'permission'}
        onConfirm={handlePermissionConfirmed}
        onCancel={handlePermissionCancel}
      />
    </DashboardLayout>
  );
};

export default StudentMockInterview;
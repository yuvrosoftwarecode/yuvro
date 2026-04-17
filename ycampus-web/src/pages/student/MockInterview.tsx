import React, { useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import MockInterviewLibrary from '@/components/student/MockInterviewLibrary';
import PermissionDialog from '@/components/student/PermissionDialog';
import InterviewScreen from '@/components/student/InterviewScreen';
import ReportsScreen from '@/components/student/ReportsScreen';
import ThankYouScreen from '@/components/student/ThankYouScreen';
import { Role, InterviewSettings } from '@/types/mockInterview';
import { mockInterviewService } from '@/services/mockInterviewService';

type InterviewState = 'library' | 'permission' | 'interview' | 'reports' | 'thank-you';

const StudentMockInterview = () => {
  const [state, setState] = useState<InterviewState>('library');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [interviewSettings, setInterviewSettings] = useState<InterviewSettings | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [isNewReport, setIsNewReport] = useState(false);

  // Step 1: User clicks "Start Interview" on a card → open permission dialog
  const handleStartPractice = (role: Role) => {
    setSelectedRole(role);
    setState('permission');
  };

  // Step 2: Permission granted → request actual media stream and start interview
  const handlePermissionConfirmed = async () => {
    if (!selectedRole) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Start the interview session
      const response = await mockInterviewService.startInterview(
        selectedRole.id,
        'beginner',
        selectedRole.max_duration,
        undefined 
      );
      
      const settings: InterviewSettings = {
        difficulty: 'beginner',
        duration: `${selectedRole.max_duration} mins`,
        interviewer: selectedRole.interviewer_name || 'Junnu',
        mediaStream: stream,
      };
      
      setInterviewSettings(settings);
      setAiConfig({
        interview_type: response.interview_type,
        first_question: response.first_question
      });
      setSubmissionId(response.submission_id);
      setInterviewSessionId(response.interview_session_id);
      setChatSessionId(response.chat_session_id);
      setState('interview');
    } catch (error) {
      console.error('Failed to get media permissions or start interview:', error);
      alert('Camera and microphone access is required. Please grant permissions and try again.');
      setState('library');
    }
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
    return <ThankYouScreen onComplete={handleBackToLibrary} />;
  }

  // ── Library view ───────────────────────────────────
  return (
    <StudentLayout>
      <MockInterviewLibrary onStartPractice={handleStartPractice} />
      <PermissionDialog
        open={state === 'permission'}
        onConfirm={handlePermissionConfirmed}
        onCancel={handlePermissionCancel}
      />
    </StudentLayout>
  );
};

export default StudentMockInterview;

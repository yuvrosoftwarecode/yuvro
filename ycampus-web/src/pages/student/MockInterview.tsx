import React, { useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import MockInterviewLibrary from '@/components/student/MockInterviewLibrary';
import PermissionDialog from '@/components/student/PermissionDialog';
import InterviewScreen from '@/components/student/InterviewScreen';
import ReportsScreen from '@/components/student/ReportsScreen';
import { Role, InterviewSettings } from '@/types/mockInterview';
import { mockInterviewService } from '@/services/mockInterviewService';

type InterviewState = 'library' | 'permission' | 'interview' | 'reports';

const StudentMockInterview = () => {
  const [state, setState] = useState<InterviewState>('library');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [interviewSettings, setInterviewSettings] = useState<InterviewSettings | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<any>(null);

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
        'beginner', // or get from somewhere
        selectedRole.max_duration,
        undefined // resume file
      );
      
      const settings: InterviewSettings = {
        difficulty: 'beginner',
        duration: `${selectedRole.max_duration} mins`,
        interviewer: selectedRole.interviewer_name || 'Junnu',
        mediaStream: stream,
      };
      
      setInterviewSettings(settings);
      setAiConfig(response.ai_config);
      setSessionId(response.interview_session_id || response.id);
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
    setSessionId(sid);
    setState('reports');
  };

  // Step 5: User exits interview early (keep sessionId if available)
  const handleExitInterview = () => {
    if (interviewSettings?.mediaStream) {
      interviewSettings.mediaStream.getTracks().forEach(t => t.stop());
    }
    // Keep sessionId (if any) so report fetch can still work; to prevent `No session ID provided`.
    setState('reports');
  };

  // Step 6: Try again from reports
  const handleTryAgain = () => {
    if (interviewSettings?.mediaStream) {
      interviewSettings.mediaStream.getTracks().forEach(t => t.stop());
    }
    setInterviewSettings(null);
    setSessionId(null);
    setState('permission');
  };

  // Step 7: Back to library from reports
  const handleBackToLibrary = () => {
    if (interviewSettings?.mediaStream) {
      interviewSettings.mediaStream.getTracks().forEach(t => t.stop());
    }
    setSelectedRole(null);
    setInterviewSettings(null);
    setSessionId(null);
    setState('library');
  };

  // ── Full-screen interview (no sidebar/layout) ──────────────────────
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
        onExit={handleExitInterview}
        onInterviewComplete={handleInterviewComplete}
      />
    );
  }

  // ── Reports screen (inside layout) ─────────────────────────────────
  if (state === 'reports' && selectedRole) {
    return (
      <ReportsScreen
        role={selectedRole}
        difficulty={interviewSettings?.difficulty || 'beginner'}
        duration={interviewSettings?.duration || '30 mins'}
        sessionId={sessionId}
        onTryAgain={handleTryAgain}
        onBackToLibrary={handleBackToLibrary}
      />
    );
  }

  // ── Library view (inside layout) ───────────────────────────────────
  return (
    <StudentLayout>
      <MockInterviewLibrary onStartPractice={handleStartPractice} />

      {/* Permission dialog */}
      <PermissionDialog
        open={state === 'permission'}
        onConfirm={handlePermissionConfirmed}
        onCancel={handlePermissionCancel}
      />
    </StudentLayout>
  );
};

export default StudentMockInterview;

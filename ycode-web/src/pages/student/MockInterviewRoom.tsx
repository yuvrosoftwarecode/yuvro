import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import InterviewScreen from '@/components/student/mock_interview/InterviewScreen';
import { InterviewSettings, Role } from '@/types/mockInterview';
import ProctoringGate from '@/components/student/ProctoringGate';

const MockInterviewRoom = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { role, settings } = location.state || {}; // Expecting { role: Role, settings: InterviewSettings }

    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (!role || !settings) {
            navigate('/student/mock-interview');
        }
    }, [role, settings, navigate]);

    const handleExit = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        navigate('/student/mock-interview');
    };

    const handleInterviewComplete = (role: Role, difficulty: string, duration: string, sessionId: string) => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        navigate(`/student/mock-interview/report/${sessionId}`);
    };

    // Keep camera active cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    if (!role || !settings) return null;

    if (!mediaStream) {
        return (
            <ProctoringGate
                onReady={(data) => {
                    streamRef.current = data.cameraStream;
                    setMediaStream(data.cameraStream);
                }}
                onCancel={handleExit}
            />
        );
    }

    return (
        <InterviewScreen
            role={role}
            difficulty={settings.difficulty}
            duration={settings.duration}
            interviewer={settings.interviewer}
            mediaStream={mediaStream}
            resume={settings.resume}
            onExit={handleExit}
            onInterviewComplete={handleInterviewComplete}
        />
    );
};

export default MockInterviewRoom;

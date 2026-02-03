import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import InterviewScreen from '@/components/student/mock_interview/InterviewScreen';
import { InterviewSettings, Role } from '@/types/mockInterview';

const MockInterviewRoom = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { role, settings } = location.state || {}; // Expecting { role: Role, settings: InterviewSettings (minus stream) }

    // We need to reconstruct the media stream here because it's not serializable for navigation state usually,
    // OR we passed it from the library. Passing MediaStream via state is risky/not recommended.
    // Better to request permission here if stream is missing.

    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!role || !settings) {
            navigate('/student/mock-interview');
            return;
        }

        const initStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream; // Store in ref for cleanup
                setMediaStream(stream);
                setLoading(false);
            } catch (err) {
                console.error("Failed to access media devices", err);
                setError("Camera and Microphone access is required.");
                setLoading(false);
            }
        };

        initStream();

        return () => {
            // Cleanup stream on unmount using ref
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

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

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>Setting up your interview room...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/student/mock-interview')}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                    >
                        Back to Library
                    </button>
                </div>
            </div>
        );
    }

    if (!role || !mediaStream) return null;

    return (
        <InterviewScreen
            role={role}
            difficulty={settings.difficulty}
            duration={settings.duration}
            interviewer={settings.interviewer}
            mediaStream={mediaStream}
            resume={settings.resume} // Pass resume if it was uploaded
            onExit={handleExit}
            onInterviewComplete={handleInterviewComplete}
        />
    );
};

export default MockInterviewRoom;

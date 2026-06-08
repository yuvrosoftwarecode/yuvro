import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AssessmentInterface from '@/components/student/AssessmentInterface';
import { contestService } from '@/services/contestService';
import { toast } from 'sonner';
import ProctoringGate from '@/components/student/ProctoringGate';

export default function ContestAttempt() {
    const { contestId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<any[]>([]);
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [duration, setDuration] = useState(60);
    const [enableProctoring, setEnableProctoring] = useState(false);
    const [tabSwitchThreshold, setTabSwitchThreshold] = useState(3);
    const [violationThreshold, setViolationThreshold] = useState(5);
    const [gatePassed, setGatePassed] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [initialViolations, setInitialViolations] = useState(0);
    const [initialTabSwitches, setInitialTabSwitches] = useState(0);

    useEffect(() => {
        const start = async () => {
            try {
                if (!contestId) return;
                const data = await contestService.startContest(contestId);
                setQuestions(data.questions);
                setSubmissionId(String(data.submission_id));
                setEnableProctoring(data.enable_proctoring ?? false);
                setTabSwitchThreshold(data.tab_switch_threshold ?? 3);
                setViolationThreshold(data.violation_threshold ?? 5);
                setInitialViolations(data.violation_count ?? 0);
                setInitialTabSwitches(data.tab_switch_count ?? 0);

                // Trust the backend-calculated duration (already adjusted for late entry)
                const duration = data.duration || 60;
                if (duration <= 0) {
                    toast.error("Contest has ended.");
                    navigate('/student/contests');
                    return;
                }
                setDuration(duration);
            } catch (err: any) {
                sessionStorage.setItem('toast_error', err.message || "Failed to start contest");
                window.location.href = '/student/contests';
            } finally {
                setLoading(false);
            }
        };
        start();
    }, [contestId, navigate]);

    const handleComplete = (stats?: { answeredCount: number; totalQuestions: number; timeSpent: number }) => {
        // Contest completion is handled by onSubmit
    };

    const handleSubmit = async (
        assessmentId: string,
        submissionId: string,
        answers: any,
        explanations: any,
        q_ids: string[]
    ) => {
        if (!contestId || !submissionId) return;
        try {
            await contestService.submitContest(contestId, submissionId, answers);
            toast.success("Contest submitted successfully!");
            navigate('/student/contests');
        } catch (err) {
            toast.error("Failed to submit");
        }
    };

    if (loading) return <div>Loading contest...</div>;

    if (!questions || questions.length === 0) return <div>No questions found for this contest.</div>;

    if (enableProctoring && !gatePassed) {
        return (
            <ProctoringGate
                onReady={(stream) => {
                    setCameraStream(stream);
                    setGatePassed(true);
                }}
                onCancel={() => navigate('/student/contests')}
            />
        );
    }

    return (
        <AssessmentInterface
            assessment={{
                id: contestId || "",
                title: "Contest Attempt",
                course: "Contest",
                duration: duration,
                totalQuestions: questions.length,
                topicId: "contest",
                proctoring_enabled: enableProctoring,
                tab_switch_threshold: tabSwitchThreshold,
                violation_threshold: violationThreshold,
                initial_violations: initialViolations,
                initial_tab_switches: initialTabSwitches,
            }}
            questions={questions}
            submissionId={submissionId || ""}
            onComplete={handleComplete}
            onSubmit={handleSubmit}
            onBack={() => navigate('/student/contests')}
            assessmentType="contests"
            preExamCameraStream={cameraStream}
        />
    );
}

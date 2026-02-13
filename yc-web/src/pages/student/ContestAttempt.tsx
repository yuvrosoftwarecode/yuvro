import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AssessmentInterface from '@/components/student/AssessmentInterface';
import { contestService } from '@/services/contestService';
import { toast } from 'sonner';

export default function ContestAttempt() {
    const { contestId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [duration, setDuration] = useState(60);

    useEffect(() => {
        const start = async () => {
            try {
                if (!contestId) return;
                const contestDetails = await contestService.getContest(contestId);
                const data = await contestService.startContest(contestId);
                setQuestions(data.questions);
                setSubmissionId(data.submission_id);

                const baseDuration = data.duration || contestDetails.duration || 60;
                const contestEnd = contestDetails.end_datetime
                    ? new Date(contestDetails.end_datetime)
                    : contestDetails.end_date
                        ? new Date(contestDetails.end_date)
                        : null;
                if (contestEnd) {
                    const remainingMs = contestEnd.getTime() - Date.now();
                    const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
                    const effectiveDuration = Math.min(baseDuration, remainingMinutes);
                    if (effectiveDuration <= 0) {
                        toast.error("Contest has ended.");
                        navigate('/student/contests');
                        return;
                    }
                    setDuration(effectiveDuration);
                } else {
                    setDuration(baseDuration);
                }
            } catch (err: any) {
                toast.error(err.response?.data?.error || "Failed to start contest");
                navigate('/student/contests');
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

    return (
        <AssessmentInterface
            assessment={{
                id: contestId || "",
                title: "Contest Attempt",
                course: "Contest",
                duration: duration,
                totalQuestions: questions.length,
                topicId: "contest"
            }}
            questions={questions}
            submissionId={submissionId || ""}
            onComplete={handleComplete}
            onSubmit={handleSubmit}
            onBack={() => navigate('/student/contests')}
        />
    );
}

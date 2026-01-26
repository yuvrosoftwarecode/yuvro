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
                const data = await contestService.startContest(contestId);
                setQuestions(data.questions);
                setSubmissionId(data.submission_id);
                setDuration(data.duration);
            } catch (err: any) {
                toast.error(err.response?.data?.error || "Failed to start contest");
                navigate('/student/contests');
            } finally {
                setLoading(false);
            }
        };
        start();
    }, [contestId, navigate]);

    const handleSubmit = async (
        answers: any,
        stats: { answeredCount: number; totalQuestions: number; timeSpent: number }
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
            onComplete={handleSubmit}
            onBack={() => navigate('/student/contests')}
        />
    );
}

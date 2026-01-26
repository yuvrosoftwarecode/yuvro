import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AssessmentInterface from '@/components/student/AssessmentInterface';
import { startCertificationExam, submitCertificationExam, getCertificationExam } from '@/services/certificationService';
import { toast } from 'sonner';

interface Question {
    id: string;
    type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive';
    title: string;
    content: string;
    mcq_options?: { text: string; is_correct: boolean }[];
    marks: number;
    test_cases_basic?: any;
    test_cases_advanced?: any;
}

interface Assessment {
    id: string;
    title: string;
    course: string;
    duration: number;
    totalQuestions: number;
    topicId: string;
}

interface StartExamResponse {
    submission_id: string;
    status: string;
    duration: number;
    questions: any[];
}

const CertificationExam: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [submissionId, setSubmissionId] = useState<string | null>(null);

    useEffect(() => {
        const fetchExam = async () => {
            try {
                if (!examId) return;

                // 1. Fetch Exam Details
                const exam = await getCertificationExam(examId);

                // 2. Start the exam
                const startRes = await startCertificationExam(examId);

                setSubmissionId(startRes.submission_id);
                setQuestions(startRes.questions.map((q: any) => ({
                    ...q,
                    mcq_options: q.mcq_options || undefined
                })));

                setAssessment({
                    id: exam.id,
                    title: exam.title || "Certification Exam",
                    course: exam.course_name || "Certification",
                    duration: startRes.duration || exam.duration,
                    totalQuestions: startRes.questions.length,
                    topicId: ""
                });

            } catch (err: any) {
                console.error("Failed to start exam", err);
                if (err.response?.data?.error) {
                    toast.error(err.response.data.error);
                } else {
                    toast.error("Failed to load certification exam.");
                }
                navigate('/student/certifications');
            } finally {
                setLoading(false);
            }
        };

        fetchExam();
    }, [examId, navigate]);

    const handleSubmit = async (assessmentId: string, subId: string, answers: any, explanations: any, q_ids: string[]) => {
        // Custom submit handler for certification
        await submitCertificationExam(assessmentId, {
            submission_id: subId,
            answers,
            explanations,
            all_question_ids: q_ids
        });
    };

    const handleComplete = (stats?: any) => {
        // Navigate to results or dashboard
        navigate('/student/certifications'); // Or a generic success page?
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!assessment || !submissionId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <h2 className="text-xl font-semibold">Unable to load exam.</h2>
                <button className="text-blue-600 underline" onClick={() => navigate('/student/certifications')}>
                    Back to Certifications
                </button>
            </div>
        );
    }

    return (
        <AssessmentInterface
            assessment={assessment}
            questions={questions}
            submissionId={submissionId}
            onComplete={handleComplete}
            onBack={() => navigate('/student/certifications')}
            onSubmit={handleSubmit}
            assessmentType="certification-exams"
        />
    );
};

export default CertificationExam;

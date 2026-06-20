import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AssessmentInterface from '@/components/student/AssessmentInterface';
import { startCertificationExam, submitCertificationExam, getCertificationExam } from '@/services/certificationService';
import { toast } from 'sonner';
import ProctoringGate from '@/components/student/ProctoringGate';

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
    proctoring_enabled?: boolean;
    tab_switch_threshold?: number;
    violation_threshold?: number;
    initial_violations?: number;
    initial_tab_switches?: number;
}

interface StartExamResponse {
    submission_id: number;
    status: string;
    duration: number;
    questions: Question[];
    enable_proctoring?: boolean;
    tab_switch_threshold?: number;
    violation_threshold?: number;
    violation_count?: number;
    tab_switch_count?: number;
}

const CertificationExam: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [gatePassed, setGatePassed] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
    const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);

    useEffect(() => {
        return () => {
            if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
            if (screenStream) screenStream.getTracks().forEach(t => t.stop());
        };
    }, [cameraStream, screenStream]);

    useEffect(() => {
        const fetchExam = async () => {
            try {
                if (!examId) return;

                // 1. Fetch Exam Details
                const exam = await getCertificationExam(examId);

                // 2. Start the exam
                const startRes = await startCertificationExam(examId) as StartExamResponse;

                setSubmissionId(startRes.submission_id.toString());
                setQuestions(startRes.questions.map((q: any) => ({
                    ...q,
                    mcq_options: q.mcq_options || undefined
                })));

                setAssessment({
                    id: exam.id.toString(),
                    title: exam.title || "Certification Exam",
                    course: exam.course_name || "Certification",
                    duration: startRes.duration || exam.duration,
                    totalQuestions: startRes.questions.length,
                    topicId: "",
                    proctoring_enabled: startRes.enable_proctoring,
                    tab_switch_threshold: startRes.tab_switch_threshold,
                    violation_threshold: startRes.violation_threshold,
                    initial_violations: startRes.violation_count ?? 0,
                    initial_tab_switches: startRes.tab_switch_count ?? 0,
                    started_at: startRes.started_at,
                });

            } catch (err: any) {
                console.error("Failed to start exam", err);
                sessionStorage.setItem('toast_error', err.message || "Failed to load certification exam.");
                window.location.href = '/student/certifications';
            } finally {
                setLoading(false);
            }
        };

        fetchExam();
    }, [examId, navigate]);

    const [result, setResult] = useState<any | null>(null);

    const handleSubmit = async (assessmentId: string, subId: string, answers: any, explanations: any, q_ids: string[], timeSpent?: Record<string, number>) => {
        // Custom submit handler for certification
        const res = await submitCertificationExam(assessmentId, {
            submission_id: subId,
            answers,
            explanations,
            all_question_ids: q_ids,
            time_spent: timeSpent
        });
        setResult(res);
        return res;
    };

    const handleComplete = (stats?: any) => {
        // Handled by result screen, no immediate navigation needed
    };

    const getCertificateViewUrl = (certId: string) => {
        if (!certId) return '#';
        const apiBase = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:8000/api';
        const host = apiBase.replace(/\/api\/?$/, '');
        return `${host}/api/assessment/certificates/${certId}/view/`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (result) {
        const isPassed = result.passed;
        return (
            <div className="min-h-screen bg-gray-50/30 flex flex-col items-center justify-center p-6 md:p-12">
                <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-500 hover:shadow-indigo-100/50">
                    {/* Header Banner */}
                    <div className={`p-8 text-center text-white relative overflow-hidden ${
                        isPassed 
                            ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900' 
                            : 'bg-gradient-to-r from-slate-900 via-zinc-800 to-slate-900'
                    }`}>
                        {/* Sparkle Watermark Background */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='1' fill='%23ffffff'/%3E%3C/svg%3E")`,
                            }} />
                        </div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                            {isPassed ? (
                                <div className="h-20 w-20 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center mb-4 animate-bounce">
                                    <span className="text-4xl">🏆</span>
                                </div>
                            ) : (
                                <div className="h-20 w-20 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center mb-4">
                                    <span className="text-4xl">📝</span>
                                </div>
                            )}
                            
                            <h2 className="text-3xl font-extrabold tracking-tight">
                                {isPassed ? 'Congratulations! You Passed!' : 'Exam Completed'}
                            </h2>
                            <p className="text-indigo-200 mt-2 font-medium max-w-md mx-auto">
                                {isPassed 
                                    ? `You successfully cleared the certification exam for ${assessment?.course}.`
                                    : `You completed the exam attempt. Let's look at your results.`}
                            </p>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Score Display */}
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Your Score</span>
                                <h3 className="text-3xl font-black text-indigo-900 mt-1">{result.score} <span className="text-lg font-bold text-gray-400">/ 100</span></h3>
                            </div>
                            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Passing Criteria</span>
                                <h3 className="text-3xl font-black text-gray-800 mt-1">60 <span className="text-lg font-bold text-gray-400">/ 100</span></h3>
                            </div>
                        </div>

                        {/* Status Message */}
                        <div className="space-y-4">
                            {isPassed ? (
                                <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-4">
                                    <span className="text-3xl mt-0.5">🌟</span>
                                    <div>
                                        <h4 className="font-bold text-emerald-900 text-lg">Official Certificate Issued</h4>
                                        <p className="text-emerald-700 text-sm mt-1 leading-relaxed">
                                            A secure digital certificate has been dynamically generated under Certificate ID <span className="font-mono font-bold">{result.certificate_display_id}</span>. You can view, verify, or download it immediately.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 bg-red-50/50 rounded-2xl border border-red-100 flex items-start gap-4">
                                    <span className="text-3xl mt-0.5">💡</span>
                                    <div>
                                        <h4 className="font-bold text-red-900 text-lg">Did Not Pass This Attempt</h4>
                                        <p className="text-red-700 text-sm mt-1 leading-relaxed">
                                            You scored <span className="font-bold">{result.score}%</span> which is below the required passing score of <span className="font-bold">60%</span>. Don't worry! Review the materials and prepare for another attempt.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
                            {isPassed ? (
                                <a 
                                    href={getCertificateViewUrl(result.certificate_id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                                >
                                    <span>⎙</span> View & Download Certificate
                                </a>
                            ) : (
                                <button
                                    onClick={() => navigate(`/student/certifications`)}
                                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                                >
                                    Try Again
                                </button>
                            )}
                            
                            <button
                                onClick={() => navigate('/student/certifications')}
                                className="flex-1 py-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-base rounded-2xl active:scale-95 transition-all"
                            >
                                Back to Catalog
                            </button>
                        </div>
                    </div>
                </div>
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

    if (assessment.proctoring_enabled && !gatePassed) {
        return (
            <ProctoringGate
                onReady={(data) => {
                    setCameraStream(data.cameraStream);
                    setScreenStream(data.screenStream);
                    setPhotoBlob(data.photoBlob);
                    setScreenshotBlob(data.screenshotBlob);
                    setGatePassed(true);
                }}
                onCancel={() => navigate('/student/certifications')}
            />
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
            preExamCameraStream={cameraStream}
            screenStream={screenStream}
            preExamPhotoBlob={photoBlob}
            preExamScreenshotBlob={screenshotBlob}
        />
    );
};

export default CertificationExam;

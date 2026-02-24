import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSkillTestSubmission } from '@/services/skillTestService';
import DashboardLayout from '@/components/common/DashboardLayout';
import { toast } from 'sonner';
import ProctoringSessionViewer from '@/components/common/instructor/ProctoringSessionViewer';

export default function SubmissionAnalytics() {
    const { submissionId } = useParams<{ submissionId: string }>();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (submissionId) {
            fetchSubmission(submissionId);
        }
    }, [submissionId]);

    const fetchSubmission = async (id: string) => {
        try {
            setLoading(true);
            const data = await getSkillTestSubmission(id);
            setSubmission(data);
        } catch (error) {
            console.error('Failed to fetch submission:', error);
            toast.error('Failed to load submission details');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !submission) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <DashboardLayout
            title={`${submission.user_name} - Analytics`}
            subtitle={submission.skill_test_title}
            actions={
                <button
                    onClick={() => navigate(-1)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                    ← Back
                </button>
            }
        >
            <ProctoringSessionViewer submission={submission} />
        </DashboardLayout>
    );
}

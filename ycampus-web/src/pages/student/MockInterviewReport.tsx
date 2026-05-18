import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import ReportsScreen from '@/components/student/ReportsScreen';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MockInterviewReport = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const navigate = useNavigate();

    const handleBack = () => {
        navigate('/student/mock-interview');
    };

    const loadingRole = useMemo(() => ({ 
        title: 'Loading Report...', 
        level: 'N/A' 
    }), []);

    return (
        <StudentLayout>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 scrollbar-thin">
                    <ReportsScreen
                        sessionId={submissionId}
                        isNewReport={false} 
                        onBackToLibrary={handleBack}
                        onTryAgain={handleBack}
                        role={loadingRole as any}
                        _difficulty="N/A"
                        duration="N/A"
                    />
                </div>
        </StudentLayout>
    );
};

export default MockInterviewReport;
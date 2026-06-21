import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/common/DashboardLayout';
import ReportsScreen from '@/components/student/mock_interview/ReportsScreen';

const MockInterviewReportPage = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const handleBack = () => {
        navigate('/student/mock-interview');
    };

    const loadingRole = useMemo(() => ({ 
        title: 'Loading Report...', 
        level: 'N/A' 
    }), []);

    return (
        <DashboardLayout contentClassName="bg-slate-50/50">
            <div className="flex-1 px-8 py-6 pb-12">
                <div className="max-w-[1600px] mx-auto space-y-8">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 scrollbar-thin">
                        <ReportsScreen
                            sessionId={sessionId}
                            isNewReport={false} 
                            onBackToLibrary={handleBack}
                            onTryAgain={handleBack}
                            role={loadingRole as any}
                            _difficulty="N/A"
                            duration="N/A"
                        />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default MockInterviewReportPage;
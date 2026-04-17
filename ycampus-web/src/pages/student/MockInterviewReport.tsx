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
            <div className=" sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <Button 
                        variant="ghost" 
                        onClick={handleBack}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 -ml-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Interview Library
                    </Button>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
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
            </div>
        </StudentLayout>
    );
};

export default MockInterviewReport;

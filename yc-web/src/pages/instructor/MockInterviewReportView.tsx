
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReportsScreen from '@/components/student/mock_interview/ReportsScreen';

// This wrapper component allows admins to view the student's report
// It reuses the ReportsScreen but passes proper flags to disable "Try Again" etc.
const MockInterviewReportView = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const handleBack = () => {
        navigate('/instructor/mock-interview/reports');
    };

    if (!sessionId) {
        return <div className="p-8 text-center text-red-500">Invalid Session ID</div>;
    }

    // Role, Difficulty, etc. will be fetched internally by ReportsScreen using the sessionId
    // We pass placeholders that will be overridden by the fetched data
    return (
        <ReportsScreen
            role={{ title: "Loading...", level: "" }} 
            difficulty=""
            duration=""
            sessionId={sessionId}
            onTryAgain={() => {}} // No-op for admin
            onBackToLibrary={handleBack}
            isAdmin={true}
        />
    );
};

export default MockInterviewReportView;


import { useParams, useNavigate } from 'react-router-dom';
import ReportsScreen from '@/components/student/mock_interview/ReportsScreen';

const MockInterviewReportView = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const handleBack = () => {
        // Updated to go back to the general reports list or can be refined to go back to analytics
        navigate('/admin/mock-interview/reports');
    };

    if (!sessionId) {
        return <div className="p-8 text-center text-red-500">Invalid Session ID</div>;
    }

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

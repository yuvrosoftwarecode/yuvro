import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReportsScreen from '@/components/student/mock_interview/ReportsScreen';

const MockInterviewReportPage = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    // In a real app, you might want to fetch the role/difficulty details from the session ID
    // For now, we'll pass placeholders or fetch them inside ReportsScreen if needed
    // ReportsScreen currently takes role/difficulty as props, but it ideally should fetch them from the session too
    // We will assume ReportsScreen can handle some missing data or we'll simple pass defaults/nulls and let it fetch from session.

    // Actually, looking at ReportsScreen, it takes role, difficulty, duration as props. 
    // We should ideally fetch the session details first to populate these, OR update ReportsScreen to fetch everything from sessionId.
    // For this refactor, let's update ReportsScreen to be more self-contained or fetch session metadata here.

    // To keep it simple and consistent with the current "ReportScreen" logic which fetches the report data:
    // We will pass defaults and let the ReportScreen show the data. 
    // However, ReportsScreen displays role title/level in the header.

    // Let's rely on ReportsScreen's internal fetching which we saw earlier (it fetches sessionData).
    // We just need to make sure ReportsScreen uses the data from the API rather than just props if possible.
    // The current ReportsScreen implementation (from previous turns) does fetch sessionData!
    // It merges it into `report` state.

    const handleTryAgain = () => {
        navigate('/student/mock-interview'); // Go back to library to start over
    };

    const handleBackToLibrary = () => {
        navigate('/student/mock-interview');
    };

    if (!sessionId) {
        return <div>Invalid Session ID</div>;
    }

    // We pass placeholder props because ReportsScreen requires them, 
    // but we expect it to display data from the fetched report/session.
    // We might need to slightly adjust ReportsScreen to prefer session data over props if we want to be clean,
    // but for now let's pass generic values so it renders. 
    // The actual report data fetching happens inside ReportsScreen using sessionId.

    return (
        <ReportsScreen
            role={{ title: "Interview Session", level: "Completed" }} // Placeholders, will be overwritten by report data if logic allows or we can improve ReportsScreen next
            difficulty="Standard"
            duration="Unknown"
            sessionId={sessionId}
            onTryAgain={handleTryAgain}
            onBackToLibrary={handleBackToLibrary}
        />
    );
};

export default MockInterviewReportPage;

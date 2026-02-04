import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MockInterviewLibrary from '@/components/student/mock_interview/MockInterviewLibrary';

const StudentMockInterview = () => {
  const navigate = useNavigate();

  const handleStartInterview = (role: any, settings: any) => {
    console.log('Starting interview:', { role, settings });
    // Here you can navigate to interview screen or handle the interview start
    // For now, we'll just log the details
  };

  return (
    <div className="min-h-screen bg-background">
      <main>
        <MockInterviewLibrary onStartInterview={handleStartInterview} />
      </main>
    </div>
  );
};

export default StudentMockInterview;

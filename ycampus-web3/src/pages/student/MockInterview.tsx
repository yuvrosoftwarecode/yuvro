import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import MockInterviewLibrary from '@/components/student/MockInterviewLibrary';

const StudentMockInterview = () => {
  const handleStartInterview = (role: any, settings: any) => {
    console.log('Starting interview:', { role, settings });
    // Here you can navigate to interview screen or handle the interview start
    // For now, we'll just log the details
  };

  return (
    <StudentLayout>
      <MockInterviewLibrary onStartInterview={handleStartInterview} />
    </StudentLayout>
  );
};

export default StudentMockInterview;

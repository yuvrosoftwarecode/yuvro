import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MockInterviewLibrary from '@/components/student/mock_interview/MockInterviewLibrary';

import DashboardLayout from '@/components/common/DashboardLayout';

const StudentMockInterview = () => {
  const navigate = useNavigate();

  const handleStartInterview = (role: any, settings: any) => {
    console.log('Starting interview:', { role, settings });
  };

  return (
    <DashboardLayout hideHeader={true} hideFooter={true}>
      <MockInterviewLibrary onStartInterview={handleStartInterview} />
    </DashboardLayout>
  );
};

export default StudentMockInterview;

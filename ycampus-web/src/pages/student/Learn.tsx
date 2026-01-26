import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LearnDashboard from '@/components/student/LearnDashboard';
import Navigation from '@/components/common/Navigation';

const Learn = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <Navigation />
      <LearnDashboard />
    </>
  );
};

export default Learn;
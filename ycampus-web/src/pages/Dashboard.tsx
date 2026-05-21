import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const { user, isLoading } = useAuth();

  // Wait for authentication check to complete
  if (isLoading) {
    return null; // or a loading spinner
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to role-specific dashboard
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'faculty':
      return <Navigate to="/faculty/dashboard" replace />;
    case 'student':
      return <Navigate to="/student/dashboard" replace />;
    case 'hod':
      return <Navigate to="/hod/dashboard" replace />;
    case 'principal':
      return <Navigate to="/principal/dashboard" replace />;
    case 'college_admin':
      return <Navigate to="/college-admin/dashboard" replace />;
    case 'placement_officer':
      return user.college_product_type === 'assessments'
        ? <Navigate to="/placement/placement-dashboard" replace />
        : <Navigate to="/placement/dashboard" replace />;
    case 'recruiter':
      return <Navigate to="/recruiter/dashboard" replace />;
    default:
      console.warn('Unknown user role:', user.role);
      // Default to student dashboard instead of login to prevent infinite loop
      return <Navigate to="/student/dashboard" replace />;
  }
};

export default Dashboard;
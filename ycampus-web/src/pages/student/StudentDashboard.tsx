import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import MockInterviewLibrary from '@/components/student/MockInterviewLibrary';
import Notes from '@/components/student/Notes';
import TestContent from '@/components/student/TestContent';
import TaskContent from '@/components/student/TaskContent';
import InternalTestContent from '@/components/student/InternalTestContent';
import { ComprehensiveDashboard } from '@/components/dashboard/ComprehensiveDashboard';
import { AssessmentDashboard } from '@/components/dashboard/AssessmentDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, ClipboardCheck, MessageSquare, Mic, StickyNote, Calendar } from 'lucide-react';
import studentService, { Student } from '@/services/studentService';
import { useAuth } from '@/contexts/AuthContext';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get active menu from URL path
  const getActiveMenuFromPath = (pathname: string) => {
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/student/test')) return 'test';
    if (pathname.includes('/student/task')) return 'task';
    if (pathname.includes('/student/assessment')) return 'assessment';
    if (pathname.includes('/student/mock-interview')) return 'mock-interview';
    if (pathname.includes('/student/notes')) return 'notes';
    if (pathname.includes('/student/announcements')) return 'announcements';
    return 'dashboard';
  };

  const [activeMenu, setActiveMenu] = useState(() => {
    return getActiveMenuFromPath(location.pathname);
  });

  // Update active menu when location changes
  useEffect(() => {
    const newActiveMenu = getActiveMenuFromPath(location.pathname);
    setActiveMenu(newActiveMenu);
  }, [location.pathname]);

  const handleMenuClick = (key: string) => {
    console.log({key})
    setActiveMenu(key);
    
    // Navigate to the appropriate URL
    const routeMap = {
      'dashboard': '/student/dashboard',
      'test': '/student/test',
      'task': '/student/task',
      'assessment': '/student/assessment',
      'mock-interview': '/student/mock-interview',
      'notes': '/student/notes'
    };
    
    const targetRoute = routeMap[key as keyof typeof routeMap];
    if (targetRoute && location.pathname !== targetRoute) {
      navigate(targetRoute);
    }
  };

  const handleStartInterview = (role: any, settings: any) => {
    console.log('Starting interview:', { role, settings });
    // Here you can navigate to interview screen or handle the interview start
    // For now, we'll just log the details
  };

  const stats = [
    { title: 'Enrolled Courses', value: '5', icon: BookOpen, change: 'Active' },
    { title: 'Completed Tests', value: '18', icon: ClipboardCheck, change: '85% Average' },
    { title: 'Pending Tasks', value: '3', icon: MessageSquare, change: 'Due Soon' },
    { title: 'Overall Progress', value: '78%', icon: Calendar, change: 'On Track' },
  ];

  const renderDashboardContent = () => {
    const isAssessmentsPath = location.pathname.includes('/student/assessments');
    if (isAssessmentsPath || user?.college_product_type === 'assessments') {
      return <AssessmentDashboard />;
    }
    return <ComprehensiveDashboard />;
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return renderDashboardContent();
      case 'test':
        return <TestContent />;
      case 'task':
        return <TaskContent />;
      case 'assessment':
        return <InternalTestContent />;
      case 'mock-interview':
        return <MockInterviewLibrary onStartInterview={handleStartInterview} />;
      case 'notes':
        return <Notes />;
      default:
        return renderDashboardContent();
    }
  };

  return (
    <StudentLayout>
      {renderContent()}
    </StudentLayout>
  );
};

export default StudentDashboard;
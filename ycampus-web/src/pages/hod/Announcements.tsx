import React from 'react';
import { HODSidebar } from '@/components/hod/HODSidebar';
import AnnouncementManager from '@/components/announcements/AnnouncementManager';
import { useAuth } from '@/contexts/AuthContext';

const HODAnnouncements = () => {
  const { user } = useAuth();
  
  return (
    <AnnouncementManager 
      SidebarComponent={HODSidebar} 
      defaultDepartmentId={user?.department_id} 
    />
  );
};

export default HODAnnouncements;

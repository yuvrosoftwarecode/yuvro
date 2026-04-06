import React from 'react';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import AnnouncementManager from '@/components/announcements/AnnouncementManager';

const CollegeAdminAnnouncements = () => {
  return <AnnouncementManager SidebarComponent={CollegeAdminSidebar} />;
};

export default CollegeAdminAnnouncements;

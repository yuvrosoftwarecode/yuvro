import React from 'react';
import { PrincipalSidebar } from '@/components/principal/PrincipalSidebar';
import AnnouncementManager from '@/components/announcements/AnnouncementManager';

const PrincipalAnnouncements = () => {
  return <AnnouncementManager SidebarComponent={PrincipalSidebar} />;
};

export default PrincipalAnnouncements;

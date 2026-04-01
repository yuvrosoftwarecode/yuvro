import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import FacultySidebar from '@/components/faculty/FacultySidebar';

interface FacultyLayoutProps {
  children: React.ReactNode;
}

const FacultyLayout: React.FC<FacultyLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <FacultySidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default FacultyLayout;
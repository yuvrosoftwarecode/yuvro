import React from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { StudentSidebar } from '@/components/student/StudentSidebar';

interface StudentLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
  hideSidebar?: boolean;
}

export function StudentLayout({ children, noPadding = false, hideSidebar = false }: StudentLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {!hideSidebar && <StudentSidebar />}
        
<div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-6">            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

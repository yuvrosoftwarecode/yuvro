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
      <div className="min-h-screen h-screen flex w-full bg-background overflow-x-hidden">
        {!hideSidebar && <StudentSidebar />}
        
<div className="flex-1 flex flex-col min-w-0 h-full">
          <main className={`flex-1 flex flex-col min-h-0 h-full overflow-y-auto overflow-x-hidden ${noPadding ? '' : 'p-6'}`}>            
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

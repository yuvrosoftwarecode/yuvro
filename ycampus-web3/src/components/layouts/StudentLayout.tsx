import React from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { StudentSidebar } from '@/components/student/StudentSidebar';

interface StudentLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function StudentLayout({ children, noPadding = false }: StudentLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-hidden h-screen">
        <StudentSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <main className={`flex-1 flex flex-col min-h-0 overflow-hidden h-full ${noPadding ? '' : 'p-6'}`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

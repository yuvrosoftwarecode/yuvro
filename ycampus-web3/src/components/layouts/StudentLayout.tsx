import React from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import { StudentSidebar } from '@/components/student/StudentSidebar';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StudentSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

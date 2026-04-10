// COMPLETE FILE - Create this new file
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PrincipalSidebar } from '@/components/principal/PrincipalSidebar';
import Header from '@/components/common/Header';  // Copy if needed

export default function PrincipalLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PrincipalSidebar />
        <div className="flex-1 flex flex-col">
          <Header />  {/* Optional */}
          <main className="flex-1 p-6 space-y-6 overflow-auto">
            <Outlet />  {/* Renders Announcements page here */}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

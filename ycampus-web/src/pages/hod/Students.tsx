import { SidebarProvider } from '@/components/ui/sidebar';
import { HODSidebar } from '@/components/hod/HODSidebar';
import { ManageStudents } from '@/components/hod/ManageStudents';

const HODStudents = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <HODSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Students Management</h1>
            <ManageStudents />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default HODStudents;

import { SidebarProvider } from '@/components/ui/sidebar';
import { PrincipalSidebar } from '@/components/principal/PrincipalSidebar';
import { ManageHODs } from '@/components/principal/ManageHODs';

const PrincipalHODs = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <PrincipalSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">HODs Management</h1>
            <ManageHODs />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PrincipalHODs;

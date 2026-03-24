import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import RoleSidebar from '@/components/common/RoleSidebar';
import ManageHODs from '@/components/principal/ManageHODs';

const PrincipalHODs = () => {
  return (
    <SidebarProvider>
      <RoleSidebar />
      <SidebarInset className="p-6 bg-background">
        <div className="max-w-7xl mx-auto w-full">
          <ManageHODs />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default PrincipalHODs;

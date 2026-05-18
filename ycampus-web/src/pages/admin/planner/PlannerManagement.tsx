import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Target, Map as MapIcon, BarChart3 } from 'lucide-react';

const PlannerManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract the last part of the path to determine the active tab
  const currentTab = location.pathname.split('/').pop() || 'companies';

  const handleTabChange = (value: string) => {
    navigate(`/admin/planner/${value}`);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50/30">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 space-y-6">
            <div className="flex flex-col space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">AI Interview Planner</h1>
              <p className="text-muted-foreground">Manage companies, roles, topics, and roadmap templates in one place.</p>
            </div>

            <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full space-y-6">
              <div className="border-b">
                <TabsList className="bg-transparent h-12 w-full justify-start gap-4 rounded-none border-b-0 p-0">
                  <TabsTrigger 
                    value="companies" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-12 px-4 gap-2 font-semibold"
                  >
                    <Building2 className="h-4 w-4" /> Companies
                  </TabsTrigger>
                  <TabsTrigger 
                    value="topics" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-12 px-4 gap-2 font-semibold"
                  >
                    <Target className="h-4 w-4" /> Topics
                  </TabsTrigger>
                  <TabsTrigger 
                    value="roadmaps" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-12 px-4 gap-2 font-semibold"
                  >
                    <MapIcon className="h-4 w-4" /> Roadmaps
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-12 px-4 gap-2 font-semibold"
                  >
                    <BarChart3 className="h-4 w-4" /> Analytics
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="mt-0 border-0 p-0 outline-none">
                <Outlet />
              </div>
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PlannerManagement;

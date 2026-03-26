import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Building2, Users, TrendingUp } from 'lucide-react';
import { useCollegeAdminStats } from '@/hooks/useDashboardStats';

const CollegeAdminDashboard = () => {
  const { data: stats, isLoading } = useCollegeAdminStats();

  const statsDisplay = [
    { title: 'Principals', value: stats?.principals.toString() || '0', icon: Building, change: 'Active' },
    { title: 'Departments', value: stats?.departments.toString() || '0', icon: Building2, change: 'Total' },
    { title: 'Total Users', value: stats?.users.toString() || '0', icon: Users, change: 'All Roles' },
    { title: 'System Health', value: `${stats?.systemHealth || 0}%`, icon: TrendingUp, change: 'Excellent' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back, College Admin!</h2>
                <p className="text-muted-foreground">Full college control and oversight</p>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="space-y-0 pb-2">
                        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      </CardHeader>
                      <CardContent>
                        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {statsDisplay.map((stat, index) => (
                    <Card key={index}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </CardTitle>
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                        <Badge variant="secondary" className="mt-2">
                          {stat.change}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                        Manage Principals
                      </button>
                      <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                        View All Departments
                      </button>
                      <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                        System Activity Logs
                      </button>
                      <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                        Generate Platform Reports
                      </button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent System Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <p className="text-sm">Principal updated department structure</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <p className="text-sm">New HOD assigned to IT Department</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <p className="text-sm">124 new students enrolled</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CollegeAdminDashboard;

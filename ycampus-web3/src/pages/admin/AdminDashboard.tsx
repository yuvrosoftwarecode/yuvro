import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, GraduationCap, UserCheck } from 'lucide-react';

const AdminDashboard = () => {
  const stats = [
    { title: 'Total Students', value: '1,234', icon: GraduationCap, change: '+12%' },
    { title: 'Faculty Members', value: '89', icon: UserCheck, change: '+3%' },
    { title: 'Active Courses', value: '45', icon: BookOpen, change: '+8%' },
    { title: 'Total Batches', value: '23', icon: Users, change: '+5%' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back, Admin!</h2>
                <p className="text-muted-foreground">Here's an overview of your system.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
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
                        {stat.change} from last month
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest system activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <p className="text-sm">New student registered: John Doe</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <p className="text-sm">Course updated: Mathematics 101</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <p className="text-sm">New batch created: CS-2024-A</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common administrative tasks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                        Add New Student
                      </button>
                      <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                        Create New Course
                      </button>
                      <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                        Add Faculty Member
                      </button>
                      <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                        Generate Reports
                      </button>
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

export default AdminDashboard;
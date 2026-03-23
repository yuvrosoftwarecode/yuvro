// src/pages/hod/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import {
  Users,
  Layers,
  Calendar,
  BookOpen
} from 'lucide-react';

interface DashboardProps {
  sidebarComponent?: React.ReactNode;
  title?: string;
  headerExtra?: React.ReactNode;
}

const Dashboard: React.FC<DashboardProps> = ({ sidebarComponent, title, headerExtra }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Mock data for HOD
  const [dashboardData] = useState({
    stats: {
      faculty: 12,
      students: 240,
      courses: 15,
      attendance: 92
    }
  });

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 800);
  }, []);

  const stats = [
    {
      name: 'Faculty Members',
      value: dashboardData.stats.faculty.toString(),
      change: '+2 this sem',
      icon: Users,
      color: 'bg-blue-500',
      path: '/hod/faculty'
    },
    {
      name: 'Students',
      value: dashboardData.stats.students.toString(),
      change: '+45 new enrollments',
      icon: Users,
      color: 'bg-green-500',
      path: '/hod/students'
    },
    {
      name: 'Courses Offered',
      value: dashboardData.stats.courses.toString(),
      change: '+1 new course',
      icon: BookOpen,
      color: 'bg-purple-500',
      path: '/hod/courses'
    },
    {
      name: 'Dept Attendance',
      value: `${dashboardData.stats.attendance}%`,
      change: 'High',
      icon: Calendar,
      color: 'bg-yellow-500',
      path: '/hod/attendance'
    }
  ];

  if (loading) {
    return (
      <SidebarProvider>
        {sidebarComponent || <RoleSidebar />}
        <SidebarInset>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <RoleHeader
              title={title || "Loading..."}
              subtitle={!title ? "Please wait while we load your dashboard." : ""}
              actions={headerExtra}
            />
            <div className="p-6 flex-1">
              <div className="animate-pulse">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-300 rounded-lg h-24"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      {sidebarComponent || <RoleSidebar />}
      <SidebarInset>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <RoleHeader
            title={title || `Welcome back, ${user?.first_name || user?.username || 'HOD'}! 👋`}
            subtitle={!title ? "Department overview and academic management." : ""}
            actions={headerExtra}
          />
          <div className="p-6 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(stat.path)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      </div>
                      <div className={`${stat.color} p-3 rounded-lg`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center">
                      <span className="text-sm font-medium text-green-600">
                        {stat.change}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
             <div className="bg-white rounded-lg shadow p-6 mb-8">
               <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Schedule</h3>
               <p className="text-gray-600">Class schedules and faculty allocation will be shown here.</p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Dashboard;

// src/pages/college-admin/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleSidebar from '../../components/common/RoleSidebar';
import PageHeader from '../../components/common/PageHeader';
import {
  BookOpen,
  Users,
  Trophy,
  Target,
  MessageCircle,
  TrendingUp,
  Calendar,
  ArrowRight,
  Layers
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Mock data for College Admin
  const [dashboardData] = useState({
    stats: {
      totalDepartments: 8,
      totalFaculty: 45,
      totalStudents: 1250,
      activeCourses: 32
    },
    recentActivity: [
      {
        id: 1,
        type: 'department',
        action: 'Added new department',
        target: 'Data Science',
        time: '2 days ago',
        icon: Layers,
        color: 'text-blue-600'
      },
      {
        id: 2,
        type: 'faculty',
        action: 'New faculty onboarded',
        target: 'Dr. Smith (CS Dept)',
        time: '3 days ago',
        icon: Users,
        color: 'text-green-600'
      }
    ]
  });

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 800);
  }, []);

  const stats = [
    {
      name: 'Total Departments',
      value: dashboardData.stats.totalDepartments.toString(),
      change: '+1 this year',
      icon: Layers,
      color: 'bg-blue-500',
      path: '/college-admin/departments'
    },
    {
      name: 'Total Faculty',
      value: dashboardData.stats.totalFaculty.toString(),
      change: '+5 this semester',
      icon: Users,
      color: 'bg-purple-500',
      path: '/college-admin/faculty'
    },
    {
      name: 'Total Students',
      value: dashboardData.stats.totalStudents.toString(),
      change: '+120 this year',
      icon: Users,
      color: 'bg-green-500',
      path: '/college-admin/students'
    },
    {
      name: 'Active Courses',
      value: dashboardData.stats.activeCourses.toString(),
      change: '+4 this month',
      icon: BookOpen,
      color: 'bg-yellow-500',
      path: '/college-admin/courses'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <PageHeader
              title="Loading..."
              subtitle="Please wait while we load your dashboard."
            />
            <div className="p-6">
              <div className="animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-300 rounded-lg h-24"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PageHeader
              title={`Welcome back, ${user?.first_name || user?.username || 'Admin'}! 👋`}
              subtitle={user?.college_name ? `${user.college_name} | Overview of college performance and administration.` : "Overview of college performance and administration."}
            />

            {/* Stats Grid */}
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Recent Activity */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {dashboardData.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center space-x-4 p-4 bg-white rounded-lg hover:bg-gray-100 transition-colors">
                          <div className={`p-2 rounded-lg ${activity.color} bg-opacity-10`}>
                            <activity.icon className={`w-5 h-5 ${activity.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.action} <span className="text-indigo-600">{activity.target}</span>
                            </p>
                            <p className="text-xs text-gray-500">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Quick Actions */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => navigate('/college-admin/departments')}
                        className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg text-center transition-colors"
                      >
                        <Layers className="w-6 h-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">Departments</div>
                      </button>
                      <button
                        onClick={() => navigate('/college-admin/faculty')}
                        className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg text-center transition-colors"
                      >
                        <Users className="w-6 h-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">Faculty</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

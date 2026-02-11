// src/pages/incharge/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import {
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Mock data for Incharge
  const [dashboardData] = useState({
    stats: {
      tasks: 12,
      pending: 4,
      completed: 8,
      hoursLogged: 45
    }
  });

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 800);
  }, []);

  const stats = [
    {
      name: 'Total Tasks',
      value: dashboardData.stats.tasks.toString(),
      change: '+2 this week',
      icon: ClipboardList,
      color: 'bg-blue-500',
      path: '/incharge/tasks'
    },
    {
      name: 'Pending',
      value: dashboardData.stats.pending.toString(),
      change: 'Action Required',
      icon: Clock,
      color: 'bg-yellow-500',
      path: '/incharge/pending'
    },
    {
      name: 'Completed',
      value: dashboardData.stats.completed.toString(),
      change: '+3 today',
      icon: CheckCircle,
      color: 'bg-green-500',
      path: '/incharge/completed'
    },
    {
      name: 'Hours Logged',
      value: dashboardData.stats.hoursLogged.toString(),
      change: 'On track',
      icon: Calendar,
      color: 'bg-purple-500',
      path: '/incharge/schedule'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
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
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title={`Welcome back, ${user?.first_name || user?.username || 'Incharge'}! 👋`}
            subtitle="Manage your responsibilities and daily tasks."
          />
          <div className="p-6">
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
               <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Management</h3>
               <p className="text-gray-600">Task list and status updates will be displayed here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

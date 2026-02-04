import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Filter, MoreHorizontal, Briefcase, Users, Calendar, TrendingUp } from 'lucide-react';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  experience_level: string;
  salary: string;
  description: string;
  requirements: string[];
  postedDate: string;
  status: 'active' | 'closed' | 'draft';
}

const Jobs: React.FC = () => {
  const { user } = useAuth();

  const [jobs] = useState<Job[]>([
    {
      id: '1',
      title: 'Senior React Developer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      type: 'Full-time',
      experience_level: 'Senior',
      salary: '$120,000 - $150,000',
      description: 'We are looking for an experienced React developer to join our team...',
      requirements: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS'],
      postedDate: '2024-01-15',
      status: 'active'
    },
    {
      id: '2',
      title: 'DevOps Engineer',
      company: 'CloudTech Solutions',
      location: 'Remote',
      type: 'Full-time',
      experience_level: 'Mid-level',
      salary: '$90,000 - $120,000',
      description: 'Join our DevOps team to help scale our infrastructure...',
      requirements: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'Python'],
      postedDate: '2024-01-10',
      status: 'active'
    }
  ]);

  const canManageJobs = user?.role === 'admin' || user?.role === 'instructor';

  // Dashboard stats
  const stats = {
    activeJobs: jobs.filter(j => j.status === 'active').length,
    totalCandidates: 1247,
    interviews: 156,
    successRate: 78
  };

  const headerActions = (
    <>
      <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
        <Filter className="h-4 w-4" />
        <span>Filter</span>
      </button>
      {canManageJobs && (
        <button className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
          <Plus className="h-4 w-4" />
          <span>Post Job</span>
        </button>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <RoleSidebar />

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <RoleHeader 
            title="Job Management Dashboard"
            subtitle="Manage your job recruitment pipeline"
            actions={headerActions}
          />

          {/* Stats Cards */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Active Jobs */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Briefcase className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Jobs</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeJobs}</p>
                  <p className="text-sm text-green-600">+12% from last month</p>
                </div>
              </div>

              {/* Candidates */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Candidates</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalCandidates.toLocaleString()}</p>
                  <p className="text-sm text-green-600">+8% from last month</p>
                </div>
              </div>

              {/* Interviews */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Interviews</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.interviews}</p>
                  <p className="text-sm text-green-600">+15% from last month</p>
                </div>
              </div>

              {/* Success Rate */}
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
                  <p className="text-sm text-green-600">+3% from last month</p>
                </div>
              </div>
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <p className="text-sm text-gray-600">Latest updates from your job recruitment</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">New application • Sarah Chen</p>
                          <p className="text-sm text-gray-600">Senior React Developer</p>
                          <p className="text-xs text-gray-500">2 hours ago</p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Interview scheduled • Mike Johnson</p>
                          <p className="text-sm text-gray-600">DevOps Engineer</p>
                          <p className="text-xs text-gray-500">4 hours ago</p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="h-5 w-5" />
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
    </div>
  );
};



export default Jobs;
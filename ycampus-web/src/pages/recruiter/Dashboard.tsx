import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { 
  Building2, 
  Users, 
  Trophy, 
  Target, 
  MessageCircle, 
  FileText,
  TrendingUp, 
  Calendar,
  Clock,
  Award,
  CheckCircle,
  ArrowRight,
  Play,
  Star,
  BarChart3,
  Plus,
  Eye,
  Edit,
  Settings,
  Briefcase,
  UserCheck,
  Search,
  Filter,
  MapPin,
  DollarSign
} from 'lucide-react';

const RecruiterDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState({
    totalJobs: 24,
    activeJobs: 18,
    totalApplications: 156,
    shortlistedCandidates: 42,
    interviewsScheduled: 12,
    companiesManaged: 8,
    recentJobs: [
      {
        id: 1,
        title: 'Senior React Developer',
        company: 'TechCorp Inc.',
        location: 'San Francisco, CA',
        salary: '$120,000 - $150,000',
        applications: 23,
        status: 'Active',
        postedDate: '2024-12-10'
      },
      {
        id: 2,
        title: 'Product Manager',
        company: 'StartupXYZ',
        location: 'New York, NY',
        salary: '$100,000 - $130,000',
        applications: 18,
        status: 'Active',
        postedDate: '2024-12-08'
      },
      {
        id: 3,
        title: 'DevOps Engineer',
        company: 'CloudTech Solutions',
        location: 'Austin, TX',
        salary: '$95,000 - $125,000',
        applications: 31,
        status: 'Closed',
        postedDate: '2024-12-05'
      }
    ],
    recentApplications: [
      {
        id: 1,
        candidateName: 'John Smith',
        jobTitle: 'Senior React Developer',
        company: 'TechCorp Inc.',
        appliedDate: '2024-12-12',
        status: 'Under Review',
        experience: '5 years'
      },
      {
        id: 2,
        candidateName: 'Sarah Johnson',
        jobTitle: 'Product Manager',
        company: 'StartupXYZ',
        appliedDate: '2024-12-11',
        status: 'Shortlisted',
        experience: '7 years'
      },
      {
        id: 3,
        candidateName: 'Mike Chen',
        jobTitle: 'DevOps Engineer',
        company: 'CloudTech Solutions',
        appliedDate: '2024-12-10',
        status: 'Interview Scheduled',
        experience: '4 years'
      }
    ]
  });

  const statsCards = [
    {
      title: 'Total Jobs Posted',
      value: dashboardData.totalJobs,
      icon: Briefcase,
      color: 'purple',
      change: '+3 this month'
    },
    {
      title: 'Active Job Postings',
      value: dashboardData.activeJobs,
      icon: Target,
      color: 'green',
      change: '+2 this week'
    },
    {
      title: 'Total Applications',
      value: dashboardData.totalApplications,
      icon: Users,
      color: 'blue',
      change: '+12 today'
    },
    {
      title: 'Shortlisted Candidates',
      value: dashboardData.shortlistedCandidates,
      icon: UserCheck,
      color: 'orange',
      change: '+5 this week'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under review':
        return 'bg-yellow-100 text-yellow-800';
      case 'shortlisted':
        return 'bg-blue-100 text-blue-800';
      case 'interview scheduled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <RoleSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <RoleHeader 
          title="Recruiter Dashboard" 
          subtitle={`Welcome back, ${user?.username || 'Recruiter'}`}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((card, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                    <p className="text-sm text-green-600 mt-1">{card.change}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    card.color === 'purple' ? 'bg-purple-100' :
                    card.color === 'green' ? 'bg-green-100' :
                    card.color === 'blue' ? 'bg-blue-100' :
                    'bg-orange-100'
                  }`}>
                    <card.icon className={`h-6 w-6 ${
                      card.color === 'purple' ? 'text-purple-600' :
                      card.color === 'green' ? 'text-green-600' :
                      card.color === 'blue' ? 'text-blue-600' :
                      'text-orange-600'
                    }`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Job Postings</h3>
                  <button 
                    onClick={() => navigate('/recruiter/jobs')}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData.recentJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{job.title}</h4>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3" />
                            <span>{job.company}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3" />
                            <span>{job.salary}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm text-gray-600">{job.applications} applications</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Applications</h3>
                  <button 
                    onClick={() => navigate('/recruiter/applications')}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData.recentApplications.map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-medium text-sm">
                            {application.candidateName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{application.candidateName}</h4>
                          <p className="text-sm text-gray-600">{application.jobTitle} at {application.company}</p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>{application.experience} experience</span>
                            <span>Applied {application.appliedDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {application.status}
                        </span>
                        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                onClick={() => navigate('/recruiter/jobs/add')}
                className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
              >
                <div className="p-2 bg-purple-100 group-hover:bg-purple-200 rounded-lg">
                  <Plus className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Post New Job</p>
                  <p className="text-sm text-gray-600">Create job posting</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/recruiter/jobs/companies')}
                className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <div className="p-2 bg-blue-100 group-hover:bg-blue-200 rounded-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Manage Companies</p>
                  <p className="text-sm text-gray-600">Company profiles</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/recruiter/candidates')}
                className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
              >
                <div className="p-2 bg-green-100 group-hover:bg-green-200 rounded-lg">
                  <Search className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Search Candidates</p>
                  <p className="text-sm text-gray-600">Find talent</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/recruiter/analytics')}
                className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
              >
                <div className="p-2 bg-orange-100 group-hover:bg-orange-200 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">View Analytics</p>
                  <p className="text-sm text-gray-600">Hiring insights</p>
                </div>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
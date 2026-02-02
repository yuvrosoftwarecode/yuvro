import { useAuth } from '../contexts/AuthContext';
import Navigation from '../components/common/Navigation';
import RoleSidebar from '../components/common/RoleSidebar';
import RoleHeader from '../components/common/RoleHeader';

const Dashboard: React.FC = () => {

  const stats = [
    {
      name: 'Total Projects',
      value: '12',
      change: '+4.75%',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      name: 'Active Tasks',
      value: '24',
      change: '+2.02%',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      name: 'Completed',
      value: '89%',
      change: '+12.5%',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Team Members',
      value: '8',
      change: '+1.2%',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
    },
  ];

  const recentActivities = [
    {
      id: 1,
      action: 'Created new project',
      target: 'Mobile App Redesign',
      time: '2 hours ago',
    },
    {
      id: 2,
      action: 'Completed task',
      target: 'User Interface Design',
      time: '4 hours ago',
    },
    {
      id: 3,
      action: 'Updated profile',
      target: 'Personal Information',
      time: '1 day ago',
    },
  ];

  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  if (isStudent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Student Dashboard Content */}
          {renderDashboardContent()}
        </div>
      </div>
    );
  }

  // Non-student roles use sidebar layout
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader 
            title="Dashboard"
            subtitle="Overview of your activities and progress"
          />
          <div className="p-6">
            {renderDashboardContent()}
          </div>
        </div>
      </div>
    </div>
  );

  function renderDashboardContent() {
    return (
      <>
        {/* Header */}
        <div className="mb-8">
          <div className="bg-indigo-600 rounded-lg p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.username || 'User'}! 👋
            </h1>
            <p className="text-indigo-100 text-lg">
              Here's what's happening with your projects today.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <div className="text-indigo-600">{stat.icon}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm font-medium text-green-600">
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">from last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
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

            {/* Project Progress */}
            <div className="bg-white rounded-lg shadow mt-6">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Project Progress</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700">Mobile App Redesign</span>
                      <span className="text-gray-500">75%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700">Website Development</span>
                      <span className="text-gray-500">60%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700">API Integration</span>
                      <span className="text-gray-500">90%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">📁</div>
                    <div className="text-sm font-medium">New Project</div>
                  </button>
                  <button className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">📝</div>
                    <div className="text-sm font-medium">Add Task</div>
                  </button>
                  <button className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">👥</div>
                    <div className="text-sm font-medium">Invite Team</div>
                  </button>
                  <button className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-lg text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-sm font-medium">Analytics</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Summary */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Profile Summary</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{user?.username || 'User'}</h4>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Profile Completion</span>
                    <span className="text-sm font-medium text-gray-900">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium">
                      Complete Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { 
  BookOpen, 
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
  Settings
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API calls
  const [dashboardData, setDashboardData] = useState({
    stats: {
      coursesCreated: 5,
      totalStudents: 247,
      contestsHosted: 12,
      skillTestsCreated: 28,
      mockInterviewsCreated: 15,
      totalQuestions: 156
    },
    recentActivity: [
      {
        id: 1,
        type: 'course',
        action: 'Created new course',
        target: 'Advanced React Patterns',
        time: '2 hours ago',
        icon: BookOpen,
        color: 'text-blue-600'
      },
      {
        id: 2,
        type: 'student',
        action: 'Student enrolled',
        target: 'John Doe joined Python Fundamentals',
        time: '4 hours ago',
        icon: Users,
        color: 'text-green-600'
      },
      {
        id: 3,
        type: 'contest',
        action: 'Contest completed',
        target: 'Weekly Algorithm Challenge #15',
        time: '1 day ago',
        icon: Trophy,
        color: 'text-yellow-600'
      },
      {
        id: 4,
        type: 'assessment',
        action: 'Skill test published',
        target: 'JavaScript Fundamentals Assessment',
        time: '2 days ago',
        icon: Target,
        color: 'text-purple-600'
      }
    ],
    upcomingEvents: [
      {
        id: 1,
        title: 'Weekly Contest Review',
        date: 'Today, 3:00 PM',
        type: 'contest',
        participants: 45
      },
      {
        id: 2,
        title: 'Course Content Review',
        date: 'Tomorrow, 10:00 AM',
        type: 'course',
        duration: '2 hours'
      },
      {
        id: 3,
        title: 'Student Progress Meeting',
        date: 'Dec 18, 2:00 PM',
        type: 'meeting',
        attendees: 8
      }
    ],
    courseProgress: [
      {
        id: 1,
        name: 'Data Structures & Algorithms',
        studentsEnrolled: 89,
        completionRate: 78,
        avgScore: 85
      },
      {
        id: 2,
        name: 'Python Programming',
        studentsEnrolled: 67,
        completionRate: 82,
        avgScore: 88
      },
      {
        id: 3,
        name: 'Web Development',
        studentsEnrolled: 91,
        completionRate: 65,
        avgScore: 79
      }
    ],
    topPerformers: [
      {
        id: 1,
        name: 'Alice Johnson',
        course: 'Python Programming',
        score: 98,
        progress: 95
      },
      {
        id: 2,
        name: 'Bob Smith',
        course: 'Data Structures',
        score: 94,
        progress: 88
      },
      {
        id: 3,
        name: 'Carol Davis',
        course: 'Web Development',
        score: 92,
        progress: 90
      }
    ]
  });

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const stats = [
    {
      name: 'Courses Created',
      value: dashboardData.stats.coursesCreated.toString(),
      change: '+2 this month',
      icon: BookOpen,
      color: 'bg-blue-500',
      path: '/instructor/courses'
    },
    {
      name: 'Total Students',
      value: dashboardData.stats.totalStudents.toString(),
      change: '+23 this week',
      icon: Users,
      color: 'bg-green-500',
      path: '/instructor/users'
    },
    {
      name: 'Contests Hosted',
      value: dashboardData.stats.contestsHosted.toString(),
      change: '+4 this month',
      icon: Trophy,
      color: 'bg-yellow-500',
      path: '/instructor/contests'
    },
    {
      name: 'Skill Tests',
      value: dashboardData.stats.skillTestsCreated.toString(),
      change: '+8 this week',
      icon: Target,
      color: 'bg-purple-500',
      path: '/instructor/skill-tests'
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
            title={`Welcome back, ${user?.first_name || user?.username || 'Instructor'}! 👋`}
            subtitle="Manage your courses, track student progress, and create engaging content."
          />
          <div className="p-6">

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
              {/* Left Column - Recent Activity & Course Analytics */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {dashboardData.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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

                {/* Course Analytics */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Course Analytics</h3>
                    <button 
                      onClick={() => navigate('/instructor/courses')}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                    >
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="space-y-6">
                      {dashboardData.courseProgress.map((course) => (
                        <div key={course.id} className="border-l-4 border-indigo-500 pl-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{course.name}</h4>
                            <span className="text-sm text-gray-500">{course.completionRate}% completion</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-blue-600">{course.studentsEnrolled}</div>
                              <div className="text-xs text-gray-500">Students</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-600">{course.completionRate}%</div>
                              <div className="text-xs text-gray-500">Completion</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-purple-600">{course.avgScore}</div>
                              <div className="text-xs text-gray-500">Avg Score</div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${course.completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => navigate('/instructor/courses')}
                        className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg text-center transition-colors"
                      >
                        <BookOpen className="w-6 h-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">Create Course</div>
                      </button>
                      <button 
                        onClick={() => navigate('/instructor/skill-tests')}
                        className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg text-center transition-colors"
                      >
                        <Target className="w-6 h-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">New Test</div>
                      </button>
                      <button 
                        onClick={() => navigate('/instructor/contests')}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white p-4 rounded-lg text-center transition-colors"
                      >
                        <Trophy className="w-6 h-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">Host Contest</div>
                      </button>
                      <button 
                        onClick={() => navigate('/instructor/mock-interview')}
                        className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-lg text-center transition-colors"
                      >
                        <MessageCircle className="w-6 h-6 mx-auto mb-2" />
                        <div className="text-sm font-medium">Mock Interview</div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upcoming Events */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {dashboardData.upcomingEvents.map((event) => (
                        <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0">
                            <Calendar className="w-5 h-5 text-indigo-600 mt-0.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-gray-500">{event.date}</p>
                            {event.participants && (
                              <p className="text-xs text-gray-400">{event.participants} participants</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
                    <button 
                      onClick={() => navigate('/instructor/users')}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                    >
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {dashboardData.topPerformers.map((student, index) => (
                        <div key={student.id} className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                            }`}>
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.course}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">{student.score}%</p>
                            <p className="text-xs text-gray-500">{student.progress}% progress</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Teaching Stats */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Teaching Impact</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{dashboardData.stats.mockInterviewsCreated}</div>
                        <div className="text-sm text-gray-600">Mock Interviews</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{dashboardData.stats.totalQuestions}</div>
                        <div className="text-sm text-gray-600">Questions Created</div>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Student Satisfaction</span>
                        <span className="text-sm text-gray-500">4.8/5.0</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" style={{ width: '96%' }}></div>
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

export default Dashboard;
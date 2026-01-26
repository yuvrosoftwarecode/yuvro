import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/common/Navigation';

import {
  BookOpen,
  Code,
  Trophy,
  Briefcase,
  Target,
  MessageCircle,
  TrendingUp,
  Calendar,
  Clock,
  Award,
  Users,
  CheckCircle,
  ArrowRight,
  Play,
  Star,
  MapPin,
  DollarSign
} from 'lucide-react';
import { studentDashboardService, DashboardData } from '@/services/studentDashboardService';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await studentDashboardService.getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Use mock data as fallback
        const mockData = await studentDashboardService.getDashboardData();
        setDashboardData(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'course': return BookOpen;
      case 'coding': return Code;
      case 'job': return Briefcase;
      case 'contest': return Trophy;
      case 'skill-test': return Target;
      case 'interview': return MessageCircle;
      default: return BookOpen;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'course': return 'text-blue-600';
      case 'coding': return 'text-green-600';
      case 'job': return 'text-purple-600';
      case 'contest': return 'text-yellow-600';
      case 'skill-test': return 'text-indigo-600';
      case 'interview': return 'text-pink-600';
      default: return 'text-gray-600';
    }
  };

  if (!dashboardData) {
    return null;
  }

  const stats = [
    {
      name: 'Courses Enrolled',
      value: dashboardData.stats.coursesEnrolled.toString(),
      change: '+2 this month',
      icon: BookOpen,
      color: 'bg-blue-500',
      path: '/student/learn'
    },
    {
      name: 'Problems Solved',
      value: dashboardData.stats.problemsSolved.toString(),
      change: '+12 this week',
      icon: Code,
      color: 'bg-green-500',
      path: '/student/code-practice'
    },
    {
      name: 'Contests Joined',
      value: dashboardData.stats.contestsParticipated.toString(),
      change: '+3 this month',
      icon: Trophy,
      color: 'bg-yellow-500',
      path: '/student/contests'
    },
    {
      name: 'Job Applications',
      value: dashboardData.stats.jobApplications.toString(),
      change: '+5 this week',
      icon: Briefcase,
      color: 'bg-purple-500',
      path: '/student/jobs'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="bg-gray-300 rounded-lg h-32 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-300 rounded-lg h-24"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Welcome back, {user?.first_name || user?.username || 'Student'}! 👋
                </h1>
                <p className="text-indigo-100 text-lg mb-4">
                  Continue your learning journey and track your progress.
                </p>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-indigo-100">Learning Streak</p>
                      <p className="font-semibold">7 days</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-indigo-100">XP Points</p>
                      <p className="font-semibold">2,450</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-indigo-100 text-sm mb-1">Today's Goal</p>
                <div className="bg-white bg-opacity-20 rounded-lg p-3">
                  <p className="font-semibold mb-1">2 / 3 Problems</p>
                  <div className="w-24 bg-white bg-opacity-30 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: '67%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
          {/* Left Column - Recent Activity & Course Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData.recentActivity.map((activity) => {
                    const ActivityIcon = getActivityIcon(activity.type);
                    const activityColor = getActivityColor(activity.type);

                    return (
                      <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className={`p-2 rounded-lg ${activityColor} bg-opacity-10`}>
                          <ActivityIcon className={`w-5 h-5 ${activityColor}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.action} <span className="text-indigo-600">{activity.target}</span>
                          </p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Course Progress */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Course Progress</h3>
                <button
                  onClick={() => navigate('/student/learn')}
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
                        <span className="text-sm text-gray-500">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {course.completedLessons} of {course.totalLessons} lessons completed
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{dashboardData.stats.skillTestsCompleted}</div>
                    <div className="text-sm text-gray-600">Tests Completed</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{dashboardData.stats.mockInterviewsCompleted}</div>
                    <div className="text-sm text-gray-600">Mock Interviews</div>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm text-gray-500">78%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                  </div>
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
                    onClick={() => navigate('/student/code-practice')}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-lg text-center transition-colors"
                  >
                    <Code className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Practice Code</div>
                  </button>
                  <button
                    onClick={() => navigate('/student/skill-test')}
                    className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-lg text-center transition-colors"
                  >
                    <Target className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Take Test</div>
                  </button>
                  <button
                    onClick={() => navigate('/student/contests')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white p-4 rounded-lg text-center transition-colors"
                  >
                    <Trophy className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Join Contest</div>
                  </button>
                  <button
                    onClick={() => navigate('/student/mock-interview')}
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

            {/* Recommended Jobs */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Recommended Jobs</h3>
                <button
                  onClick={() => navigate('/student/jobs')}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData.recommendedJobs.map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900 text-sm">{job.title}</h4>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {job.match}% match
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{job.company}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {job.location}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {job.salary}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Achievements</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Problem Solver</p>
                      <p className="text-xs text-gray-500">Solved 50+ problems</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Course Completer</p>
                      <p className="text-xs text-gray-500">Completed 3 courses</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Test Taker</p>
                      <p className="text-xs text-gray-500">Passed 15 skill tests</p>
                    </div>
                  </div>
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
                  <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {(user?.first_name || user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {user?.first_name && user?.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user?.username || 'Student'}
                    </h4>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Profile Completion</span>
                    <span className="text-sm font-medium text-gray-900">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => navigate('/student/profile')}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Complete Profile
                    </button>
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

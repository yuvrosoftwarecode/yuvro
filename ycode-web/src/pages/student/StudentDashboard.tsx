import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/common/DashboardLayout';
import { getMyCertificates } from '@/services/certificationService';

import {
  BookOpen,
  Code,
  Trophy,
  Briefcase,
  Target,
  MessageCircle,
  TrendingUp,
  CalendarDays,
  Clock,
  Award,
  Users,
  CheckCircle,
  ArrowRight,
  Play,
  Star,
  MapPin,
  DollarSign,
  Flame
} from 'lucide-react';
import { CustomCalendarIcon } from '@/components/common/CustomIcons';
import { studentDashboardService, DashboardData } from '@/services/studentDashboardService';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [data, certificates] = await Promise.all([
          studentDashboardService.getDashboardData(),
          getMyCertificates().catch(err => {
            console.error('Failed to fetch certificates:', err);
            return [];
          })
        ]);
        setDashboardData(data);
        setMyCertificates(certificates);
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
      <DashboardLayout hideHeader hideFooter>
        <div className="max-w-[1600px] mx-auto py-6 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="bg-gray-300 rounded-lg h-32 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-300 rounded-lg h-24"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout hideHeader hideFooter>
      <div className="max-w-[1600px] mx-auto px-8 pt-[18px] pb-6">
        {/* Header */}
        <div className="mb-8">
          <div className="rounded-lg p-8 text-black">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                   Welcome back, {user?.first_name || user?.username || 'Student'}! 👋
                </h1>
                <p className="text-lg mb-4">
                  Continue your learning journey and track your progress.
                 </p>
              </div>
              <div className="flex items-center space-x-6">
                 <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Flame className="w-5 h-5 text-orange-500 animate-pulse" fill="currentColor" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm">Learning Streak</p>
                    <p className="font-semibold">7 days</p>
                  </div>
                </div>
                 <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500 animate-pulse" fill="currentColor" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm">XP Points</p>
                     <p className="font-semibold">2,450</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-red-500 animate-pulse" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm">Today's Goal</p>
                    <p className="font-semibold">2 / 3 Problems</p>
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

            {/* Course Progress */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Course Progress</h3>
                <button
                  onClick={() => navigate('/student/learn')}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer text-sm font-medium flex items-center"
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
                        <CustomCalendarIcon className="w-5 h-5 text-gray-600 mt-0.5" />
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
                          <ActivityIcon className="w-5 h-5 text-black" />
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
                    className="bg-blue-50 cursor-pointer text-black p-4 rounded-lg text-center transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Code className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm font-medium">Practice Code</div>
                  </button>
                  <button
                    onClick={() => navigate('/student/skill-test')}
                    className="bg-green-50 cursor-pointer text-black p-4 rounded-lg text-center transition-colors"
                  >
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm font-medium">Take Test</div>
                  </button>
                  <button
                    onClick={() => navigate('/student/contests')}
                    className="bg-yellow-50 cursor-pointer text-black p-4 rounded-lg text-center transition-colors"
                  >
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm font-medium">Join Contest</div>
                  </button>
                  <button
                    onClick={() => navigate('/student/mock-interview')}
                    className="bg-purple-50 cursor-pointer text-black p-4 rounded-lg text-center transition-colors"
                  >
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm font-medium">Mock Interview</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Earned Certificates */}
            {myCertificates.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Earned Certificates
                  </h3>
                  <button
                    onClick={() => navigate('/student/certifications')}
                    className="text-gray-500 hover:text-gray-700 cursor-pointer text-sm font-medium flex items-center"
                  >
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {myCertificates.slice(0, 3).map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-3.5 bg-gradient-to-r from-slate-50 to-indigo-50/20 border border-gray-100 rounded-xl hover:shadow-sm transition-all duration-300">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {cert.course_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            ID: <span className="font-mono">{cert.display_id}</span>
                          </p>
                        </div>
                        <a
                          href={(() => {
                            const apiBase = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:8000/api';
                            const host = apiBase.replace(/\/api\/?$/, '');
                            return `${host}/api/assessment/certificates/${cert.id}/view/`;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 flex items-center justify-center p-2 text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-50 rounded-lg transition-all active:scale-95"
                          title="View Certificate"
                        >
                          <span className="text-sm px-1.5 font-bold">⎙</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}


            {/* Recommended Jobs */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Recommended Jobs</h3>
                <button
                  onClick={() => navigate('/student/jobs')}
                  className="text-gray-500 hover:text-gray-700 cursor-pointer text-sm font-medium flex items-center"
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dashboardData.recommendedJobs.map((job) => (
                    <div key={job.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer p-4 border border-gray-100 relative z-40">
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

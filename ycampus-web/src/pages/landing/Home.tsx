import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { redirectToDashboard } from '../../utils/redirectToDashboard';
import { 
  BookOpen, 
  Code, 
  Trophy, 
  Briefcase, 
  Target, 
  MessageCircle, 
  Users, 
  Building2,
  ArrowRight,
  Play,
  Award,
  TrendingUp,
  Calendar,
  BarChart3,
  Zap,
  Clock
} from 'lucide-react';

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<'student' | 'recruiter'>('student');

  const handleDashboardClick = () => {
    if (!isAuthenticated) navigate('/login');
    else redirectToDashboard(user, navigate);
  };

  const roleFeatures = {
    student: {
      title: "For Students",
      subtitle: "Learn, practice, and excel in your academic journey",
      color: "from-blue-600 to-indigo-600",
      icon: BookOpen,
      features: [
        {
          icon: BookOpen,
          title: "Course Access",
          description: "Access all your enrolled courses with video lectures, assignments, and study materials"
        },
        {
          icon: Code,
          title: "Coding Practice",
          description: "Practice programming with integrated code editor and instant feedback"
        },
        {
          icon: Target,
          title: "Assessments & Quizzes",
          description: "Take tests and quizzes to evaluate your understanding and track progress"
        },
        {
          icon: Trophy,
          title: "Contests & Competitions",
          description: "Participate in coding contests and compete with classmates"
        },
        {
          icon: MessageCircle,
          title: "Mock Interviews",
          description: "Prepare for placements with AI-powered mock interview practice"
        },
        {
          icon: Briefcase,
          title: "Campus Placements",
          description: "Access campus placement opportunities and apply to companies"
        }
      ]
    },
    recruiter: {
      title: "For Instructors",
      subtitle: "Manage courses and engage students effectively",
      color: "from-purple-600 to-pink-600",
      icon: Building2,
      features: [
        {
          icon: BookOpen,
          title: "Course Management",
          description: "Create and manage courses with videos, assignments, and learning materials"
        },
        {
          icon: Users,
          title: "Student Tracking",
          description: "Monitor student progress, attendance, and performance analytics"
        },
        {
          icon: Target,
          title: "Assessment Creation",
          description: "Design quizzes, tests, and coding assignments with auto-grading"
        },
        {
          icon: Trophy,
          title: "Contest Organization",
          description: "Organize coding contests and competitions for your students"
        },
        {
          icon: BarChart3,
          title: "Performance Analytics",
          description: "Track class performance with detailed analytics and insights"
        },
        {
          icon: Calendar,
          title: "Schedule Management",
          description: "Manage class schedules, deadlines, and academic calendar"
        }
      ]
    }
  };

  const stats = [
    { label: "Active Students", value: "10,000+", icon: Users },
    { label: "Courses Available", value: "500+", icon: BookOpen },
    { label: "Institutions", value: "50+", icon: Building2 },
    { label: "Success Rate", value: "95%", icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex justify-start lg:w-0 lg:flex-1">
            <span className="text-2xl font-bold text-indigo-600">Yuvro Campus</span>
          </div>

          <div className="hidden md:flex items-center justify-end md:flex-1 lg:w-0">
            {isAuthenticated ? (
              <button
                onClick={handleDashboardClick}
                className="ml-8 whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="whitespace-nowrap text-base font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="ml-8 whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Your Complete Campus</span>
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Learning Management System
              </span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-500">
              Transform your educational institution with Yuvro Campus - a comprehensive platform for course management, 
              student engagement, assessments, and career development all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              {!isAuthenticated && (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center px-8 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Play className="mr-2 w-5 h-5" />
                    Watch Demo
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-2">
                  {React.createElement(stat.icon, { className: "w-8 h-8 text-indigo-200" })}
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-indigo-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role-based Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Built for Educational Excellence
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Comprehensive features for students, instructors, and career services
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex justify-center mb-12 bg-white rounded-lg p-2 shadow-sm max-w-md mx-auto">
            {Object.entries(roleFeatures).map(([role, config]) => (
              <button
                key={role}
                onClick={() => setActiveRole(role as any)}
                className={`flex items-center px-6 py-3 rounded-md font-medium transition-all flex-1 justify-center ${
                  activeRole === role
                    ? `bg-gradient-to-r ${config.color} text-white shadow-md`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {React.createElement(config.icon, { className: "w-5 h-5 mr-2" })}
                {config.title}
              </button>
            ))}
          </div>

          {/* Active Role Features */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className={`bg-gradient-to-r ${roleFeatures[activeRole].color} px-8 py-12 text-white`}>
              <div className="flex items-center justify-center mb-4">
                {React.createElement(roleFeatures[activeRole].icon, { className: "w-12 h-12" })}
              </div>
              <h3 className="text-3xl font-bold text-center mb-2">
                {roleFeatures[activeRole].title}
              </h3>
              <p className="text-xl text-center opacity-90">
                {roleFeatures[activeRole].subtitle}
              </p>
            </div>
            
            <div className="px-8 py-12">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {roleFeatures[activeRole].features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-r ${roleFeatures[activeRole].color} rounded-lg flex items-center justify-center`}>
                      {React.createElement(feature.icon, { className: "w-6 h-6 text-white" })}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features Highlight */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Why Choose Yuvro Campus?
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">All-in-One Platform</h3>
              <p className="text-gray-600">
                Manage courses, assessments, placements, and student engagement all from a single integrated platform.
              </p>
            </div>
            
            <div className="text-center p-8 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Smart Analytics</h3>
              <p className="text-gray-600">
                Track student performance, course effectiveness, and institutional metrics with powerful analytics tools.
              </p>
            </div>
            
            <div className="text-center p-8 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Flexible & Scalable</h3>
              <p className="text-gray-600">
                Designed to scale from small institutions to large universities with customizable features and workflows.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Transform Your Institution Today
            </h2>
            <p className="mt-4 text-xl text-indigo-100">
              Join leading educational institutions using Yuvro Campus for excellence
            </p>
            {!isAuthenticated && (
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 transition-colors"
                >
                  Get Started Today
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center px-8 py-3 border-2 border-white text-base font-medium rounded-md text-white hover:bg-white hover:text-indigo-600 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-4">Yuvro Campus</div>
            <p className="text-gray-400 mb-8">
              Empowering educational institutions with modern learning technology
            </p>
            <div className="flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
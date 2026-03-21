import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import {
  Menu,
  X,
  Search,
  Briefcase,
  Users,
  Calendar,
  TrendingUp,
  BookOpen,
  Settings,
  Trophy,
  UserCheck,
  BarChart3,
  FileText,
  HelpCircle,
  CheckCircle,
  School,
  Code,
  Building2,
  Layers,
  GraduationCap,
  Activity,
  Target,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  StickyNote,
  ClipboardCheck,
  ListChecks,
  Bell,
  MessageCircle,
  Home,
  MessageSquare,
  BrainCircuit,
  Megaphone
} from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  roles: string[];
}

const sidebarItems: SidebarItem[] = [
  // Student Items
  {
    id: 'student-dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/student/dashboard',
    roles: ['student']
  },
  {
    id: 'student-notes',
    label: 'Notes',
    icon: FileText,
    path: '/student/notes',
    roles: ['student']
  },
  {
    id: 'student-practice-test',
    label: 'Practice Test',
    icon: ClipboardCheck,
    path: '/student/practice-test',
    roles: ['student']
  },
  {
    id: 'student-task',
    label: 'Task',
    icon: MessageSquare,
    path: '/student/task',
    roles: ['student']
  },
  {
    id: 'student-assessment',
    label: 'Assessment',
    icon: BookOpen,
    path: '/student/assessment',
    roles: ['student']
  },
  {
    id: 'student-ai-interview',
    label: 'AI Interview Planner',
    icon: BrainCircuit,
    path: '/student/ai-interview-planner',
    roles: ['student']
  },
  {
    id: 'student-contest',
    label: 'Contest',
    icon: Trophy,
    path: '/student/contests',
    roles: ['student']
  },
  {
    id: 'student-jobs',
    label: 'Jobs',
    icon: Briefcase,
    path: '/student/jobs',
    roles: ['student']
  },
  {
    id: 'student-announcements',
    label: 'Announcements',
    icon: Megaphone,
    path: '/student/announcements',
    roles: ['student']
  },
  {
    id: 'student-community',
    label: 'Community',
    icon: Users,
    path: '/student/community',
    roles: ['student']
  },
  // Admin Items
  {
    id: 'admin-dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/admin/dashboard',
    roles: ['admin']
  },
  {
    id: 'recruiter-dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/recruiter/dashboard',
    roles: ['recruiter']
  },
  {
    id: 'college-admin-dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/college-admin/dashboard',
    roles: ['college_admin']
  },
  {
    id: 'principal-dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/principal/dashboard',
    roles: ['principal']
  },
  // College Admin Items
  {
    id: 'college-departments',
    label: 'Departments',
    icon: Building2,
    path: '/college-admin/departments',
    roles: ['college_admin']
  },
  {
    id: 'college-batches',
    label: 'Batch IDs',
    icon: Layers,
    path: '/college-admin/batches',
    roles: ['college_admin']
  },
  {
    id: 'college-faculty',
    label: 'Faculty',
    icon: Users,
    path: '/college-admin/faculty',
    roles: ['college_admin']
  },
  {
    id: 'college-students',
    label: 'Students',
    icon: GraduationCap,
    path: '/college-admin/students',
    roles: ['college_admin']
  },
  {
    id: 'college-subjects',
    label: 'Subjects',
    icon: BookOpen,
    path: '/college-admin/subjects',
    roles: ['college_admin']
  },
  {
    id: 'college-reports',
    label: 'Reports',
    icon: FileText,
    path: '/college-admin/reports',
    roles: ['college_admin']
  },
  {
    id: 'college-logs',
    label: 'Activity Logs',
    icon: Activity,
    path: '/college-admin/activity-logs',
    roles: ['college_admin']
  },
  {
    id: 'college-settings',
    label: 'Settings',
    icon: Settings,
    path: '/college-admin/settings',
    roles: ['college_admin']
  },

  // Principal Items
  {
    id: 'principal-departments',
    label: 'Departments',
    icon: Building2,
    path: '/principal/departments',
    roles: ['principal']
  },
  {
    id: 'principal-hods',
    label: 'HODs',
    icon: Users,
    path: '/principal/hods',
    roles: ['principal']
  },
  {
    id: 'principal-faculty',
    label: 'Faculty',
    icon: Users,
    path: '/principal/faculty',
    roles: ['principal']
  },
  {
    id: 'principal-students',
    label: 'Students',
    icon: GraduationCap,
    path: '/principal/students',
    roles: ['principal']
  },
  {
    id: 'principal-courses',
    label: 'Courses',
    icon: BookOpen,
    path: '/principal/courses',
    roles: ['principal']
  },
  {
    id: 'principal-reports',
    label: 'Reports',
    icon: FileText,
    path: '/principal/reports',
    roles: ['principal']
  },
  {
    id: 'principal-settings',
    label: 'Settings',
    icon: Settings,
    path: '/principal/settings',
    roles: ['principal']
  },

  {
    id: 'hod-dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/hod/dashboard',
    roles: ['hod']
  },
  {
    id: 'tpo-dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/tpo/dashboard',
    roles: ['tpo']
  },

  {
    id: 'faculty-dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/faculty/dashboard',
    roles: ['faculty']
  },
  {
    id: 'faculty-syllabus',
    label: 'Syllabus',
    icon: BookOpen,
    path: '/faculty/syllabus',
    roles: ['faculty']
  },
  {
    id: 'faculty-revise',
    label: 'Revise',
    icon: Layers,
    path: '/faculty/revise',
    roles: ['faculty']
  },
  {
    id: 'faculty-assessment',
    label: 'Assessment',
    icon: Target,
    path: '/faculty/assessment',
    roles: ['faculty']
  },
  {
    id: 'faculty-attendance',
    label: 'Attendance',
    icon: UserCheck,
    path: '/faculty/attendance',
    roles: ['faculty']
  },
  {
    id: 'faculty-task',
    label: 'Task',
    icon: CheckCircle,
    path: '/faculty/task',
    roles: ['faculty']
  },
  {
    id: 'faculty-individual-report',
    label: 'Individual Report',
    icon: FileText,
    path: '/faculty/reports',
    roles: ['faculty']
  },
  {
    id: 'faculty-attendance-report',
    label: 'Attendance Report',
    icon: UserCheck,
    path: '/faculty/attendance-report',
    roles: ['faculty']
  },
  {
    id: 'users',
    label: 'User Management',
    icon: UserCheck,
    path: '/admin/users',
    roles: ['admin']
  },
  {
    id: 'subjects',
    label: 'Subjects',
    icon: BookOpen,
    path: '/admin/subjects',
    roles: ['admin']
  },
  {
    id: 'skill-tests',
    label: 'Skill Tests',
    icon: CheckCircle,
    path: '/admin/skill-tests',
    roles: ['admin']
  },
  {
    id: 'mock-interview',
    label: 'Mock Interview',
    icon: TrendingUp,
    path: '/admin/mock-interview',
    roles: ['admin']
  },
  {
    id: 'recruiter-jobs',
    label: 'Jobs',
    icon: Briefcase,
    path: '/recruiter/jobs',
    roles: ['admin', 'recruiter']
  },
  {
    id: 'recruiter-jobs-approval',
    label: 'Jobs Approval',
    icon: CheckCircle,
    path: '/recruiter/jobs-approval',
    roles: ['admin', 'recruiter_admin']
  },
  {
    id: 'contests',
    label: 'Contests',
    icon: Trophy,
    path: '/admin/contests',
    roles: ['admin', 'recruiter']
  },
  {
    id: 'code-editor',
    label: 'Code Editor',
    icon: Code,
    path: '/tools/code-editor',
    roles: ['admin', 'recruiter']
  },
  {
    id: 'certifications',
    label: 'Certifications',
    icon: Trophy,
    path: '/admin/certifications',
    roles: ['admin', 'recruiter']
  },
  {
    id: 'colleges',
    label: 'Colleges',
    icon: School,
    path: '/admin/colleges',
    roles: ['admin']
  },
];

interface RoleSidebarProps {
  className?: string;
}

const RoleSidebar: React.FC<RoleSidebarProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(true);

  const userRole = user?.role || 'student';
  const userEmail = user?.email || '';

  const hasJobsApprovalAccess = ['recruiter@yuvro.com', 'recruiter_admin@yuvro.com', 'admin@yuvro.com'].includes(userEmail);

  const filteredItems = sidebarItems.filter(item => {
    if (item.id === 'recruiter-jobs-approval') {
      return hasJobsApprovalAccess;
    }
    return item.roles.includes(userRole);
  });

  const getPortalTitle = () => {
    switch (userRole) {
      case 'admin':
        return 'Yuvro Admin';
      case 'recruiter':
        return 'Yuvro Recruiter';
      case 'college_admin':
        return 'College Admin';
      case 'principal':
        return 'Principal';
      case 'hod':
        return 'HOD';
      case 'faculty':
        return 'Faculty';
      case 'tpo':
        return 'TPO Portal';
      default:
        return 'Yuvro Campus';
    }
  };

  const getToolsSection = () => {
    switch (userRole) {
      case 'admin':
        return {
          title: 'Admin Tools',
          description: 'Access administrative features for system management'
        };
      case 'recruiter':
        return {
          title: 'Recruiter Tools',
          description: 'Access specialized features for recruitment'
        };
      default:
        return {
          title: 'Tools',
          description: 'Access specialized features'
        };
    }
  };

  const isActiveItem = (item: SidebarItem) => {
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  const toolsSection = getToolsSection();

  return (
    <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-sm border-r border-gray-200 sticky top-0 h-screen overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${className}`}>
      <div className={`${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center h-9 mb-6 ${sidebarCollapsed ? 'justify-center' : 'justify-between relative'}`}>
          {!sidebarCollapsed && (
            <h2 className="text-lg font-semibold text-gray-800 w-full text-center pr-8">{getPortalTitle()}</h2>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${!sidebarCollapsed ? 'absolute right-0' : ''}`}
          >
            {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>

        <nav className="space-y-2">
          {userRole === 'faculty' && !sidebarCollapsed && (
            <div className="px-3 mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Navigation</span>
            </div>
          )}
          {filteredItems
            .filter(item => userRole !== 'faculty' || (!item.id.includes('report')))
            .map((item) => {
              const Icon = item.icon;
              const isActive = isActiveItem(item);

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center p-2' : 'space-x-3 p-3'} rounded-lg cursor-pointer group relative transition-colors ${isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}

          {userRole === 'faculty' && !sidebarCollapsed && (
            <div className="pt-4 space-y-1">
              <div
                className="px-3 mb-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-1 transition-colors group"
                onClick={() => setReportsOpen(!reportsOpen)}
              >
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">Reports</span>
                <div className="p-1">
                  {reportsOpen ? <ChevronUp className="h-3 w-3 text-gray-400 group-hover:text-gray-600" /> : <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />}
                </div>
              </div>

              {reportsOpen && filteredItems
                .filter(item => item.id.includes('report'))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveItem(item);

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer group relative transition-colors ${isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          )}

          {userRole === 'faculty' && sidebarCollapsed && filteredItems
            .filter(item => item.id.includes('report'))
            .map((item) => {
              const Icon = item.icon;
              const isActive = isActiveItem(item);

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center justify-center p-2 rounded-lg cursor-pointer group relative transition-colors ${isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  title={item.label}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {item.label}
                  </div>
                </Link>
              );
            })}
        </nav>
      </div>
    </div>
  );
};

export default RoleSidebar;

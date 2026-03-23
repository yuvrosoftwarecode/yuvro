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
  Sidebar,
  ChevronsUpDown
} from 'lucide-react';
import logoUrl from '../../assets/Yuvro Campus Logo.png';

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
    icon: LayoutDashboard,
    path: '/student/dashboard',
    roles: ['student']
  },
  {
    id: 'student-notes',
    label: 'Notes',
    icon: StickyNote,
    path: '/student/learn',
    roles: ['student']
  },
  {
    id: 'student-practice-test',
    label: 'Practice Test',
    icon: ClipboardCheck,
    path: '/student/skill-test',
    roles: ['student']
  },
  {
    id: 'student-task',
    label: 'Task',
    icon: ListChecks,
    path: '/student/code-practice',
    roles: ['student']
  },
  {
    id: 'student-assessment',
    label: 'Assessment',
    icon: FileText,
    path: '/student/certifications',
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
    icon: Bell,
    path: '/student/announcements',
    roles: ['student']
  },
  {
    id: 'student-community',
    label: 'Community',
    icon: MessageCircle,
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
    id: 'principal-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/principal/dashboard',
    roles: ['principal']
  },
  {
    id: 'principal-departments',
    label: 'Department',
    icon: Building2,
    path: '/principal/departments',
    roles: ['principal']
  },
  {
    id: 'principal-faculty',
    label: 'Faculty',
    icon: UserCheck,
    path: '/principal/faculty',
    roles: ['principal']
  },
  {
    id: 'principal-students',
    label: 'Students',
    icon: Users,
    path: '/principal/students',
    roles: ['principal']
  },
  {
    id: 'principal-pri-report',
    label: 'PRI Report',
    icon: FileText,
    path: '/principal/reports',
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
    <div className={`${sidebarCollapsed ? 'w-[72px]' : 'w-64'} bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out ${className}`}>
      
      {/* HEADER: Logo + Actions (Row-based to match reference) */}
      <div className={`flex items-center p-5 border-b border-gray-50 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!sidebarCollapsed && (
          <>
            <img src={logoUrl} alt="Yuvro Campus" className="h-[48px] object-contain" />
            
            <div className="flex items-center gap-2 pr-1">
              <button className="relative p-1.5 hover:bg-slate-50 rounded-md transition-colors group">
                <Bell className="h-[22px] w-[22px] text-slate-600 group-hover:text-[#020817]" />
                <span className="absolute -top-0.5 -right-0.5 bg-[#EF4444] text-white text-[9px] font-bold h-[15px] w-[15px] flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  3
                </span>
              </button>
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 hover:bg-slate-50 rounded-md transition-colors group"
                title="Collapse sidebar"
              >
                <Sidebar className="h-[22px] w-[22px] text-slate-600 group-hover:text-[#020817]" />
              </button>
            </div>
          </>
        )}
        {sidebarCollapsed && (
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-slate-50 rounded-md transition-colors group"
            title="Expand sidebar"
          >
            <Sidebar className="h-[22px] w-[22px] text-slate-600 group-hover:text-[#020817]" />
          </button>
        )}
      </div>

      {/* NAV SECTION */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {userRole === 'principal' && !sidebarCollapsed && (
          <div className="px-3 pb-2 pt-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Principal Portal</span>
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
                className={`flex items-center ${sidebarCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 gap-3'} rounded-lg cursor-pointer group relative transition-colors ${isActive
                  ? 'bg-slate-100/70 text-[#020817] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#020817] font-medium'
                  }`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon className={`${isActive ? 'text-[#020817]' : 'text-slate-600 group-hover:text-[#020817]'} h-5 w-5 flex-shrink-0 transition-colors`} />
                {!sidebarCollapsed && <span className="text-[14px]">{item.label}</span>}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
      </nav>

      {/* FOOTER: User Profile */}
      <div className={`p-4 border-t border-gray-50 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-[#020817] font-semibold text-sm shrink-0">
            {userRole.charAt(0).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#020817] capitalize">{userRole}</span>
              <span className="text-[10px] bg-slate-100 text-[#020817] px-2 py-0.5 rounded-full w-fit mt-0.5 capitalize">{userRole}</span>
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <ChevronsUpDown className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </div>

    </div>
  );
};

export default RoleSidebar;

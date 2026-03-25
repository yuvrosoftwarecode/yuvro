import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  ChevronRight,
  Briefcase,
  Users,
  BookOpen,
  Settings,
  Trophy,
  UserCheck,
  BarChart3,
  FileText,
  CheckCircle,
  School,
  Code,
  Building2,
  Layers,
  GraduationCap,
  Activity,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ClipboardCheck,
  TrendingUp,
  Bell,
  Moon,
  LogOut,
  User,
  PanelLeftClose,
  ChevronsUpDown,
  Home,
  MessageSquare,
  BrainCircuit,
  Megaphone,
  Building,
  RefreshCw,
  ClipboardList,
  CalendarCheck,
  ListTodo,
  FileBarChart,
  CalendarDays,
  Mic
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import knowledgeTree from '@/assets/knowledge-tree.png';
import yuvroLogo from '@/assets/yuvro-campus-combined.png';

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
    label: 'Learn',
    icon: BookOpen,
    path: '/student/notes',
    roles: ['student']
  },
  {
    id: 'student-practice-test',
    label: 'Practice Tests',
    icon: ClipboardCheck,
    path: '/student/practice-tests',
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
    path: '/student/assessments',
    roles: ['student']
  },
  {
    id: 'student-interview-prep',
    label: 'Interview Preparation',
    icon: Users,
    path: '/student/interview-prep',
    roles: ['student']
  },
  {
    id: 'student-mock-interview',
    label: 'Mock Interview',
    icon: Mic,
    path: '/student/mock-interview',
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
    id: 'student-ai-interview-planner',
    label: 'AI Interview Planner',
    icon: BrainCircuit,
    path: '/student/ai-interview-planner',
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
    icon: Activity,
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
    id: 'principal-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/principal/dashboard',
    roles: ['principal']
  },

  // College Admin Items
  {
    id: 'college-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/college-admin/dashboard',
    roles: ['college_admin']
  },
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
    id: 'college-tpo',
    label: 'TPO Management',
    icon: Users,
    path: '/college-admin/tpo',
    roles: ['college_admin']
  },
  {
    id: 'college-announcements',
    label: 'Announcements',
    icon: Activity,
    path: '/college-admin/announcements',
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
    id: 'college-activity-logs',
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
    icon: GraduationCap,
    path: '/principal/departments',
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
    icon: BookOpen,
    path: '/principal/students',
    roles: ['principal']
  },
  {
    id: 'principal-pri-report',
    label: 'PRI Report',
    icon: FileText,
    path: '/principal/pri-report',
    roles: ['principal']
  },

  // Faculty Items
  {
    id: 'faculty-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
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
    icon: RefreshCw,
    path: '/faculty/revise',
    roles: ['faculty']
  },
  {
    id: 'faculty-assessment',
    label: 'Assessment',
    icon: ClipboardList,
    path: '/faculty/assessment',
    roles: ['faculty']
  },
  {
    id: 'faculty-attendance',
    label: 'Attendance',
    icon: CalendarCheck,
    path: '/faculty/attendance',
    roles: ['faculty']
  },
  {
    id: 'faculty-task',
    label: 'Task',
    icon: ListTodo,
    path: '/faculty/task',
    roles: ['faculty']
  },
  {
    id: 'faculty-individual-report',
    label: 'Individual Report',
    icon: FileBarChart,
    path: '/faculty/reports',
    roles: ['faculty']
  },
  {
    id: 'faculty-attendance-report',
    label: 'Attendance Report',
    icon: ClipboardCheck,
    path: '/faculty/attendance-report',
    roles: ['faculty']
  },

  // HOD Items
  {
    id: 'hod-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/hod/dashboard',
    roles: ['hod']
  },
  {
    id: 'hod-faculty',
    label: 'Faculty',
    icon: UserCheck,
    path: '/hod/faculty',
    roles: ['hod']
  },
  {
    id: 'hod-student-performance',
    label: 'Student Performance',
    icon: BarChart3,
    path: '/hod/reports/student-performance',
    roles: ['hod']
  },
  {
    id: 'hod-attendance',
    label: 'Attendance',
    icon: ClipboardCheck,
    path: '/hod/reports/attendance',
    roles: ['hod']
  },
  {
    id: 'hod-faculty-report',
    label: 'Faculty',
    icon: Users,
    path: '/hod/reports/faculty',
    roles: ['hod']
  },

  // Placement Items
  {
    id: 'placement-dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/placement/dashboard',
    roles: ['placement', 'tpo', 'placement_officer']
  },
  {
    id: 'placement-pri-report',
    label: 'PRI Report',
    icon: FileText,
    path: '/placement/pri-report',
    roles: ['placement', 'tpo', 'placement_officer']
  },
  {
    id: 'placement-job-management',
    label: 'Job Management',
    icon: ClipboardCheck,
    path: '/placement/job-approvals',
    roles: ['placement', 'tpo', 'placement_officer']
  },
  {
    id: 'placement-offer-tracking',
    label: 'Offer Tracking',
    icon: Users,
    path: '/placement/offer-tracking',
    roles: ['placement', 'tpo', 'placement_officer']
  },
  {
    id: 'placement-analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/placement/analytics',
    roles: ['placement', 'tpo', 'placement_officer']
  },
  {
    id: 'placement-recruiters',
    label: 'Recruiter Connections',
    icon: Building2,
    path: '/placement/recruiters',
    roles: ['placement', 'tpo', 'placement_officer']
  },
  {
    id: 'placement-drives',
    label: 'Drive Calendar',
    icon: CalendarDays,
    path: '/placement/drives',
    roles: ['placement', 'tpo', 'placement_officer']
  },
  {
    id: 'placement-notifications',
    label: 'Notifications',
    icon: Bell,
    path: '/placement/notifications',
    roles: ['placement', 'tpo', 'placement_officer']
  },
  {
    id: 'placement-settings',
    label: 'Settings',
    icon: Settings,
    path: '/placement/settings',
    roles: ['placement', 'tpo', 'placement_officer']
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
    label: 'Tests',
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

interface SidebarContentProps {
  collapsed?: boolean;
  onItemClick?: () => void;
  onToggle?: () => void;
  className?: string;
}

export const SidebarContent = ({
  collapsed: sidebarCollapsed = false,
  onItemClick,
  onToggle,
  className = ''
}: SidebarContentProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [reportsOpen, setReportsOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const userRole = user?.role || 'student';
  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: 'Admin',
      college_admin: 'College Admin',
      faculty: 'Faculty',
      hod: 'HOD',
      principal: 'Principal',
      placement: 'Placement Officer',
      tpo: 'Placement Officer',
      placement_officer: 'Placement Officer',
      recruiter: 'Recruiter',
      student: 'Student'
    };
    return roleMap[role] || role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };
  const userEmail = user?.email || '';
  const firstName = user?.first_name || user?.username || 'User';
  const initial = firstName.charAt(0).toUpperCase();

  const hasJobsApprovalAccess = ['recruiter@yuvro.com', 'recruiter_admin@yuvro.com', 'admin@yuvro.com'].includes(userEmail);

  const filteredItems = sidebarItems.filter(item => {
    if (item.id === 'recruiter-jobs-approval') {
      return hasJobsApprovalAccess;
    }
    return item.roles?.includes(userRole);
  });

  const isActiveItem = (item: SidebarItem) => {
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  return (
    <TooltipProvider delayDuration={400}>
      <div className={`flex flex-col h-full bg-[#FBFBFB] ${className}`}>
        <div className={`flex-1 overflow-y-auto overflow-x-hidden ${sidebarCollapsed ? 'py-2' : 'py-0'}`}>
          <div className={`flex items-center h-14 border-b border-[#e5e7eb] transition-all duration-300 ${sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'}`}>
            {!sidebarCollapsed && (
              <div className="flex items-center cursor-pointer transition-transform hover:scale-[1.02]">
                <img src={yuvroLogo} alt="Yuvro Campus" className="h-[28px] w-auto mix-blend-multiply" />
              </div>
            )}

            {sidebarCollapsed && (
              <div className="flex items-center justify-center w-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onToggle}
                      className="p-1 px-2 rounded-md hover:bg-gray-100 transition-all duration-300 transform hover:scale-110 active:scale-95"
                    >
                      <img src={knowledgeTree} alt="Expand" className="h-[24px] w-[24px] object-contain mix-blend-multiply" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#3B3D47] text-white border-none shadow-md">
                    Expand Sidebar
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {!sidebarCollapsed && (
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-1.5 rounded-full hover:bg-gray-100 transition-all duration-200 relative group/bell">
                      <Bell className="h-[18px] w-[18px] text-[#3B3D47] stroke-[1.5] transition-colors group-hover/bell:text-indigo-600" />
                      <span className="absolute top-[2px] right-[2px] h-[14px] w-[14px] rounded-full bg-[#ef4444] ring-[2px] ring-[#FBFBFB] text-[10px] font-semibold text-white flex items-center justify-center leading-none">3</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-[#3B3D47] text-white border-none shadow-md">
                    Notifications
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onToggle}
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-all duration-200 text-[#3B3D47] hover:text-indigo-600"
                    >
                      <PanelLeftClose className="h-[18px] w-[18px] stroke-[1.5]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-[#3B3D47] text-white border-none shadow-md">
                    Collapse Sidebar
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          <nav className={`space-y-1 mt-2 ${sidebarCollapsed ? 'px-1' : 'px-3'}`}>
            {userRole === 'faculty' && !sidebarCollapsed && (
              <div className="px-3 mb-3 mt-4">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Navigation</span>
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
                    onClick={onItemClick}
                    className={`flex items-center ${sidebarCollapsed
                        ? 'justify-center p-2 rounded-lg w-full h-9'
                        : `py-2 w-full rounded-lg ${isActive ? 'pl-4 pr-3 space-x-[14px]' : 'px-3 space-x-3'}`
                      } cursor-pointer group relative overflow-hidden transition-all duration-200 ${isActive
                        ? 'text-[#0f172a] bg-[#f4f4f5] font-medium'
                        : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a] font-medium'
                      }`}
                    title={sidebarCollapsed ? item.label : ''}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#0f172a]" />
                    )}

                    <Icon className={`h-[18px] w-[18px] flex-shrink-0 transition-all duration-200 stroke-[2] ${isActive ? 'text-[#0f172a]' : 'text-[#64748b] group-hover:text-[#0f172a]'}`} />
                    {!sidebarCollapsed && <span className="text-[13px] leading-tight">{item.label}</span>}

                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-3 px-2 py-1 bg-[#3B3D47] text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-sm">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}

            {/* Faculty Reports Section */}
            {userRole === 'faculty' && !sidebarCollapsed && (
              <div className="pt-3">
                <div
                  className="px-2 mb-1 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg py-1 transition-colors group"
                  onClick={() => setReportsOpen(!reportsOpen)}
                >
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">Reports</span>
                  <div className="p-0.5">
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
                        onClick={onItemClick}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer group relative transition-colors ${isActive
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                        <span className="text-[13px]">{item.label}</span>
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
                    onClick={onItemClick}
                    className={`flex items-center justify-center p-2 rounded-lg cursor-pointer group relative transition-colors ${isActive
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      {item.label}
                    </div>
                  </Link>
                );
              })}
          </nav>
        </div>

        <div className={`mt-auto border-t border-[#e5e7eb] w-full transition-all duration-300 ${sidebarCollapsed ? 'p-2 flex flex-col items-center' : 'p-3 flex flex-col w-full'}`}>
          <div
            className={`flex items-center justify-between w-full cursor-pointer group rounded-md px-2 py-2 hover:bg-[#f4f4f5] transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
            onClick={() => {
              if (!sidebarCollapsed) setProfileOpen(!profileOpen);
            }}
          >
            <div className="flex items-center gap-3">
              <div className={`h-[36px] w-[36px] rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#3B3D47] font-semibold flex-shrink-0 text-sm`}>
                {initial}
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#3B3D47] leading-tight">{firstName}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {userRole === 'student' ? (
                      <>
                        <span className="text-[10px] font-semibold px-1.5 py-[2px] bg-[#f1f5f9] text-[#0f172a] rounded uppercase tracking-wide">
                          {(user as any)?.branch || 'CSE'}
                        </span>
                        <span className="text-xs text-[#64748b] truncate max-w-[100px]">
                          Sem {(user as any)?.semester || 'I'} &middot; Sec {(user as any)?.section || 'B'}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] font-semibold px-1.5 py-[2px] bg-[#f1f5f9] text-[#475569] rounded tracking-wide">
                        {formatRole(userRole)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className={`text-[#64748b] p-1 rounded-md transition-all duration-200 ${profileOpen ? 'rotate-180' : ''}`}>
                <ChevronsUpDown className="h-4 w-4 stroke-[1.5]" />
              </div>
            )}
          </div>

          {(!sidebarCollapsed && profileOpen) && (
            <div className="mt-2 space-y-1 px-1 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Link to={`/${userRole}/profile`} onClick={onItemClick} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#52525b] hover:text-[#3B3D47] hover:bg-[#f4f4f5] rounded-md transition-all duration-200">
                <User className="h-[16px] w-[16px] stroke-[2]" />
                Profile
              </Link>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#52525b] hover:text-[#3B3D47] hover:bg-[#f4f4f5] rounded-md transition-all duration-200">
                <Moon className="h-[16px] w-[16px] stroke-[2]" />
                Dark Mode
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#ef4444] hover:text-[#dc2626] hover:bg-[#fef2f2] rounded-md transition-all duration-200 mt-1"
              >
                <LogOut className="h-[16px] w-[16px] stroke-[2]" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

interface RoleSidebarProps {
  className?: string;
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const RoleSidebar: React.FC<RoleSidebarProps> = ({ className = '', defaultCollapsed = false, collapsed: controlledCollapsed, onCollapsedChange }) => {
  const { user } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const setSidebarCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onCollapsedChange?.(val);
  };

  const firstName = user?.first_name || user?.username || 'User';
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile Top Bar - Improved Aesthetics */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-4 z-[50] shadow-sm">
        <div className="flex items-center">
          {/* User Initial Circle as Toggle (Left Top) */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="h-9 w-9 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#3B3D47] font-semibold text-sm border border-[#e5e7eb] shadow-sm transform transition-all hover:scale-105 active:scale-95">
                {initial}
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] border-none shadow-2xl">
              <SidebarContent onItemClick={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Yuvro Campus Logo (Right Top) */}
        <div className="flex items-center transition-opacity hover:opacity-80">
          <img src={yuvroLogo} alt="Yuvro Campus" className="h-7 w-auto mix-blend-multiply" />
        </div>
      </div>

      <div className={`${sidebarCollapsed ? 'w-12' : 'w-64'} md:flex hidden bg-[#FBFBFB] shadow-sm border-r border-[#e5e7eb] sticky top-0 h-screen flex-col transition-all duration-300 ease-in-out z-40 ${className}`}>
        <SidebarContent
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />


      </div>
    </>
  );
};

export default RoleSidebar;
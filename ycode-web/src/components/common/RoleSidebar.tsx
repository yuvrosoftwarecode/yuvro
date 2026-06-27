import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, Link, useNavigate } from 'react-router-dom';
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
  Building2,
  Code,
  Award,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Sparkles
} from 'lucide-react';
import DeployInfo from './DeployInfo';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string, strokeWidth?: number }>;
  path: string;
  roles: string[];
}

const sidebarItems: SidebarItem[] = [
  // Student Items
  {
    id: 'student-dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/student/dashboard',
    roles: ['student']
  },
  {
    id: 'student-learn',
    label: 'Learn',
    icon: BookOpen,
    path: '/student/learn',
    roles: ['student']
  },
  {
    id: 'student-code-practice',
    label: 'Code Practice',
    icon: Code,
    path: '/student/code-practice',
    roles: ['student']
  },
  {
    id: 'student-skill-test',
    label: 'Skill Test',
    icon: CheckCircle,
    path: '/student/skill-test',
    roles: ['student']
  },
  {
    id: 'student-mock-interview',
    label: 'Mock Interview',
    icon: TrendingUp,
    path: '/student/mock-interview',
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
    id: 'student-contests',
    label: 'Contests',
    icon: Trophy,
    path: '/student/contests',
    roles: ['student']
  },
  {
    id: 'student-certify',
    label: 'Certify',
    icon: Award,
    path: '/student/certifications',
    roles: ['student']
  },
  // Admin/Instructor Items
  {
    id: 'admin-dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/instructor/dashboard',
    roles: ['admin', 'instructor']
  },
  {
    id: 'recruiter-dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    path: '/recruiter/dashboard',
    roles: ['recruiter']
  },
  {
    id: 'users',
    label: 'Users',
    icon: UserCheck,
    path: '/instructor/users',
    roles: ['admin']
  },
  {
    id: 'colleges',
    label: 'Colleges',
    icon: Building2,
    path: '/instructor/colleges',
    roles: ['admin']
  },
  {
    id: 'courses',
    label: 'Courses',
    icon: BookOpen,
    path: '/instructor/courses',
    roles: ['admin', 'instructor']
  },
  {
    id: 'skill-tests',
    label: 'Skill Tests',
    icon: CheckCircle,
    path: '/instructor/skill-tests',
    roles: ['admin', 'instructor']
  },
  {
    id: 'mock-interview-admin',
    label: 'Mock Interview',
    icon: TrendingUp,
    path: '/instructor/mock-interview',
    roles: ['admin', 'instructor']
  },
  {
    id: 'recruiter-jobs',
    label: 'Jobs',
    icon: Briefcase,
    path: '/recruiter/jobs',
    roles: ['admin', 'recruiter', 'instructor']
  },
  {
    id: 'recruiter-jobs-approval',
    label: 'Job Approvals',
    icon: CheckCircle,
    path: '/recruiter/jobs-approval',
    roles: ['admin', 'recruiter_admin']
  },
  {
    id: 'contests-admin',
    label: 'Contests',
    icon: Trophy,
    path: '/instructor/contests',
    roles: ['admin', 'instructor', 'recruiter']
  },
  {
    id: 'code-editor',
    label: 'Code Editor',
    icon: Code,
    path: '/tools/code-editor',
    roles: ['admin', 'instructor', 'recruiter']
  },
  {
    id: 'certifications-admin',
    label: 'Certifications',
    icon: Trophy,
    path: '/instructor/certifications',
    roles: ['admin', 'instructor', 'recruiter']
  }
];

interface RoleSidebarProps {
  className?: string;
}

const RoleSidebar: React.FC<RoleSidebarProps> = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const userRole = user?.roles?.ycode || user?.role || 'student';
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
        return 'Admin Panel';
      case 'instructor':
        return 'Instructor Portal';
      case 'recruiter':
        return 'Recruiter Portal';
      case 'student':
        return 'Learning Hub';
      default:
        return 'Yuvro';
    }
  };

  const isActiveItem = (item: SidebarItem) => {
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  const profileMenuItems = [
    { label: 'Profile', path: userRole === 'student' ? '/student/profile' : '/instructor/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-sidebar border-r border-border/30 flex flex-col sticky top-0 h-screen transition-all duration-300 ease-in-out ${className}`}>
      {/* Header / Logo */}
      <div className={`p-4 mb-2`}>
        <div className={`flex items-center h-10 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-saffron-start to-saffron-end flex items-center justify-center shadow-lg shadow-saffron/25 shrink-0">
                    <Sparkles className="text-white w-5 h-5" strokeWidth={2.2} />
                </div>
                <span className="text-xl font-extrabold text-foreground tracking-tight truncate">Yuvro</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/60 transition-colors text-muted-foreground"
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 custom-scrollbar">
        {!sidebarCollapsed && (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-saffron/80 mb-2 px-3">
              {getPortalTitle()}
            </p>
        )}
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveItem(item);

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center ${sidebarCollapsed ? 'justify-center p-0' : 'gap-3 px-3 py-2.5'} rounded-xl cursor-pointer group relative transition-all duration-200 min-h-[40px] ${isActive
                  ? 'bg-gradient-to-r from-saffron/12 to-saffron/5 dark:from-saffron/15 dark:to-saffron/8 text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon 
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? 'text-saffron' : 'text-muted-foreground/70'}`} 
                  strokeWidth={isActive ? 2.2 : 1.6} 
                />
                {!sidebarCollapsed && <span className="font-medium text-[13px] tracking-wide">{item.label}</span>}

                {sidebarCollapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1.5 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-all invisible group-hover:visible translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-lg">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-3 border-t border-border/30">
        <div>
          <button
            onClick={() => !sidebarCollapsed && setProfileOpen(!profileOpen)}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} w-full rounded-xl p-2 hover:bg-muted/30 transition-all text-left group`}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-saffron-start to-saffron-end text-white font-bold text-xs uppercase">
                {(user?.first_name || user?.username || 'U').charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            {!sidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.first_name || user?.username || 'User'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate capitalize">{userRole}</p>
                </div>
                <ChevronsUpDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {/* Inline expandable options */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              profileOpen && !sidebarCollapsed ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-2 pb-2 pt-2 space-y-1">
              <p className="text-xs text-muted-foreground px-2 pb-2 truncate border-b border-border/40 mb-1">
                {user?.email}
              </p>
              
              {profileMenuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center rounded-lg px-2 py-2 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {item.label}
                </button>
              ))}
              
              <div className="h-px bg-border/40 my-1" />
              
              <button
                onClick={() => logout()}
                className="w-full flex items-center rounded-lg px-2 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </button>
              <DeployInfo collapsed={sidebarCollapsed} visible={profileOpen} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSidebar;
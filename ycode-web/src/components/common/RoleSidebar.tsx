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
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white shadow-sm border-r border-gray-200 flex flex-col sticky top-0 h-screen transition-all duration-300 ease-in-out ${className}`}>
      {/* Header / Logo */}
      <div className={`p-4 mb-2`}>
        <div className={`flex items-center h-10 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center shrink-0">
                    <Code className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-lg text-gray-900 truncate">Yuvro</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            title={sidebarCollapsed ? "Expand" : "Collapse"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 custom-scrollbar">
        {!sidebarCollapsed && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-3">
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
                className={`flex items-center ${sidebarCollapsed ? 'justify-center p-3' : 'space-x-3 p-3'} rounded-xl cursor-pointer group relative transition-all duration-200 ${isActive
                  ? 'bg-orange-50 text-orange-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-orange-600' : ''}`} />
                {!sidebarCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                
                {isActive && !sidebarCollapsed && (
                    <div className="absolute left-0 w-1 h-6 bg-orange-600 rounded-r-full" />
                )}

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
      <div className="p-4 border-t border-gray-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-gray-50 group ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-gray-100">
                <AvatarFallback className="bg-orange-600 text-white font-bold text-xs">
                  {(user?.first_name || user?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {!sidebarCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {user?.first_name || user?.username || 'User'}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate capitalize">{userRole}</p>
                </div>
              )}
              
              {!sidebarCollapsed && (
                <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              )}
            </button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align={sidebarCollapsed ? "center" : "end"} side={sidebarCollapsed ? "right" : "top"} className="w-56 mb-2 rounded-xl shadow-xl border-gray-100">
            <DropdownMenuLabel className="font-semibold text-xs text-gray-500 uppercase tracking-wider px-3 py-2">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {profileMenuItems.map((item) => (
              <DropdownMenuItem key={item.path} className="rounded-lg m-1 cursor-pointer" onClick={() => navigate(item.path)}>
                <item.icon className="mr-2 h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">{item.label}</span>
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg m-1 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span className="text-sm font-medium">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default RoleSidebar;
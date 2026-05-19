import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LayoutDashboard, ClipboardCheck, Briefcase, Users, BarChart3, Building2, CalendarDays, Bell, Settings, LogOut, User, Moon, Sun, ChevronsUpDown, PanelLeft, FileText, ChevronDown, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { usePlacementNotifications } from '@/hooks/usePlacement';
import { useTheme } from 'next-themes';
import { collegeService, College } from '@/services/collegeService';
import knowledgeTree from '@/assets/knowledge-tree.png';
import yuvroCampusCombined from '@/assets/yuvro-campus-combined.png';
import jntuLogo from '@/assets/JNTU_Hyderabad_logo.png';

const campusPlacementMenuItems = [
  { title: 'Dashboard',             url: '/placement/dashboard',   icon: LayoutDashboard },
  { title: 'PRI Report',            url: '/placement/pri-report',  icon: FileText },
  // Job Management dropdown renders here (see JSX below)
  { title: 'Offer Tracking',        url: '/placement/students',    icon: Users },
  { title: 'Analytics',             url: '/placement/analytics',   icon: BarChart3 },
  { title: 'Recruiter Connections', url: '/placement/recruiters',  icon: Building2 },
  { title: 'Drive Calendar',        url: '/placement/drives',      icon: CalendarDays },
  { title: 'Notifications',         url: '/placement/notifications', icon: Bell },
  { title: 'Settings',              url: '/placement/settings',    icon: Settings },
];

const jobMgmtSubItems = [
  { title: 'Company', url: '/placement/company',       icon: Building2 },
  { title: 'Jobs',    url: '/placement/job-approvals', icon: Briefcase },
];



const PlacementSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { data: notifications } = usePlacementNotifications();
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  const { state, toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const isCollapsed = state === 'collapsed';
  const isJobMgmtActive = location.pathname.startsWith('/placement/job-approvals') || location.pathname.startsWith('/placement/company');
  const [jobMgmtOpen, setJobMgmtOpen] = useState(isJobMgmtActive);
  const [profileOpen, setProfileOpen] = useState(false);

  const firstName = user?.first_name || user?.username || 'Placement';
  const initials = firstName.charAt(0).toUpperCase();

  const isAssessments = user?.college_product_type === 'assessments';
  const menuItems = campusPlacementMenuItems;

  return (
    <Sidebar className="border-r border-border/60" collapsible="icon">
      <SidebarHeader className="h-14 flex items-center border-b border-border/60 px-3">
        <div className="flex items-center justify-between w-full">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={toggleSidebar} className="mx-auto hover:opacity-80 transition-opacity">
                  <img src={knowledgeTree} alt="Yuvro" className="h-8 w-8 shrink-0 object-contain" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand Sidebar</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <img src={yuvroCampusCombined} alt="Yuvro Campus" className="h-8 w-auto object-contain" />
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 relative">
                      <Bell className="h-4 w-4" />
                      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                        {unreadCount || 3}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Notifications</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7">
                      <PanelLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Collapse</TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="sidebar-scrollbar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px]   tracking-wider text-muted-foreground/70 px-5">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAssessments ? (
                <>
                  {/* Placement Dashboard */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/placement/placement-dashboard')}
                      isActive={location.pathname === '/placement/placement-dashboard'}
                      className={location.pathname === '/placement/placement-dashboard' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="flex-1">Placement Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Student Reports */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/placement/student-reports')}
                      isActive={location.pathname === '/placement/student-reports'}
                      className={location.pathname === '/placement/student-reports' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="flex-1">Student Reports</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Offer Tracking */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/placement/students')}
                      isActive={location.pathname === '/placement/students'}
                      className={location.pathname === '/placement/students' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}
                    >
                      <Users className="h-4 w-4" />
                      <span className="flex-1">Offer Tracking</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Job Management Dropdown */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setJobMgmtOpen(!jobMgmtOpen)}
                      isActive={isJobMgmtActive}
                      className={`justify-between ${isJobMgmtActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <span className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        <span className="flex-1">Job Management</span>
                      </span>
                      {!isCollapsed && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${jobMgmtOpen ? 'rotate-180' : ''}`} />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {jobMgmtOpen && !isCollapsed && jobMgmtSubItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.url)}
                        isActive={location.pathname === item.url}
                        className={`pl-8 ${location.pathname === item.url ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </>
              ) : (
                <>
                  {/* Top items: Dashboard + PRI Report */}
                  {menuItems.slice(0, 2).map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.url)}
                          isActive={isActive}
                          className={isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {/* Job Management Dropdown – sits after PRI Report */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setJobMgmtOpen(!jobMgmtOpen)}
                      isActive={isJobMgmtActive}
                      className={`justify-between ${isJobMgmtActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <span className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        <span className="flex-1">Job Management</span>
                      </span>
                      {!isCollapsed && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${jobMgmtOpen ? 'rotate-180' : ''}`} />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {jobMgmtOpen && !isCollapsed && jobMgmtSubItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.url)}
                        isActive={location.pathname === item.url}
                        className={`pl-8 ${location.pathname === item.url ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {/* Remaining items: Offer Tracking → Settings */}
                  {menuItems.slice(2).map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          onClick={() => navigate(item.url)}
                          isActive={isActive}
                          className={isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.title}</span>
                          {item.title === 'Notifications' && unreadCount > 0 && (
                            <BadgeUI className="h-5 min-w-5 text-[10px] bg-destructive text-destructive-foreground px-1.5">{unreadCount}</BadgeUI>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-card border-t border-border/60">
        <div>
          <button
            onClick={() => !isCollapsed && setProfileOpen(!profileOpen)}
            className={`flex items-center w-full rounded-lg p-2 hover:bg-sidebar-accent/50 transition-colors ${isCollapsed ? 'justify-center' : 'gap-3'}`}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{firstName}</p>
                  <BadgeUI variant="secondary" className="text-[10px] px-1.5 py-0">Placement</BadgeUI>
                </div>
                <ChevronsUpDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
          {/* College Logo Section */}
          <div
            className={`mt-1 flex items-center border-t border-border/40 pt-3 ${isCollapsed
                ? 'justify-center'
                : 'gap-3 px-3 pb-3 transition-all duration-200 hover:bg-sidebar-accent/30'
              }`}
          >
            <img src={jntuLogo} alt="JNTU Hyderabad" className="h-8 w-8 shrink-0 object-contain" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-foreground truncate   tracking-tight">
                  JNTU Hyderabad
                </p>
                <p className="text-[10px] font-medium text-muted-foreground truncate tracking-widest opacity-70">
                  University Campus
                </p>
              </div>
            )}
          </div>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${profileOpen && !isCollapsed ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-2 pb-2 pt-1 space-y-0.5">
              <p className="text-xs text-muted-foreground px-2 pb-1 truncate">{user?.email}</p>
              <button className="flex items-center w-full rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/50 transition-colors">
                <User className="mr-2 h-4 w-4" />Profile
              </button>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex items-center w-full rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/50 transition-colors">
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button onClick={logout} className="flex items-center w-full rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="mr-2 h-4 w-4" />Logout
              </button>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default PlacementSidebar;

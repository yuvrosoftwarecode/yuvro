import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { LayoutDashboard, BookOpen, RefreshCw, ClipboardList, CalendarCheck, ListTodo, FileBarChart, LogOut, ChevronDown, ClipboardCheck as ClipboardCheckIcon, Bell, User, Moon, Sun, ChevronsUpDown, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTheme } from 'next-themes';
import knowledgeTree from '@/assets/knowledge-tree.png';
import yuvroCampusCombined from '@/assets/yuvro-campus-combined.png';

const menuItems = [
  { title: 'Dashboard', url: '/faculty/dashboard', icon: LayoutDashboard },
  { title: 'Syllabus', url: '/faculty/syllabus', icon: BookOpen },
  { title: 'Revise', url: '/faculty/revise', icon: RefreshCw },
  { title: 'Assessment', url: '/faculty/assessment', icon: ClipboardList },
  { title: 'Attendance', url: '/faculty/attendance', icon: CalendarCheck },
  { title: 'Task', url: '/faculty/task', icon: ListTodo },
];

const reportItems = [
  { title: 'Individual Report', url: '/faculty/reports', icon: FileBarChart },
  { title: 'Attendance Report', url: '/faculty/attendance-report', icon: ClipboardCheckIcon },
];

const FacultySidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const isCollapsed = state === 'collapsed';
  const isReportActive = reportItems.some(item => location.pathname === item.url);
  const [profileOpen, setProfileOpen] = useState(false);
  const firstName = user?.first_name || user?.username || 'Faculty';
  const initials = firstName.charAt(0).toUpperCase();

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
                      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">3</span>
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
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70 px-5">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible defaultOpen={isReportActive}>
            <SidebarGroupLabel asChild className="text-[11px] uppercase tracking-wider text-muted-foreground/70 px-5 cursor-pointer">
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                Reports
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent className="transition-all duration-200">
              <SidebarGroupContent>
                <SidebarMenu>
                  {reportItems.map((item) => {
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
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
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
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Faculty</Badge>
                </div>
                <ChevronsUpDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
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

export default FacultySidebar;

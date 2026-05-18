import { LayoutDashboard, Building, Users, UserCheck, BookOpen, FileText, Activity, Settings, Layers, Bell, LogOut, User, Moon, Sun, ChevronsUpDown, PanelLeft, Megaphone, ShieldCheck, Trophy } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import knowledgeTree from '@/assets/knowledge-tree.png';
import yuvroCampusCombined from '@/assets/yuvro-campus-combined.png';
import jntuLogo from '@/assets/JNTU_Hyderabad_logo.png';


const menuItems = [
  { title: 'Dashboard', url: '/college-admin/dashboard', icon: LayoutDashboard },
  { title: 'Departments', url: '/college-admin/departments', icon: Building },
  { title: 'Batch IDs', url: '/college-admin/batch-ids', icon: Layers },
  { title: 'Faculty', url: '/college-admin/faculty', icon: UserCheck },
  { title: 'Students', url: '/college-admin/students', icon: Users },
  { title: 'TPO', url: '/college-admin/tpo', icon: ShieldCheck },
  { title: 'Subjects', url: '/college-admin/subjects', icon: BookOpen },
  { title: 'Practice Test', url: '/college-admin/practice-test', icon: Trophy },
  { title: 'Announcements', url: '/college-admin/announcements', icon: Megaphone },
  { title: 'Reports', url: '/college-admin/reports', icon: FileText },
  { title: 'Activity Logs', url: '/college-admin/logs', icon: Activity },
  { title: 'Settings', url: '/college-admin/settings', icon: Settings },
];

export function CollegeAdminSidebar() {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const collapsed = state === 'collapsed';
  const [profileOpen, setProfileOpen] = useState(false);
  const firstName = user?.first_name || user?.username || 'Admin';
  const initials = firstName.charAt(0).toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="h-14 flex items-center border-b border-border/60 px-3">
        <div className="flex items-center justify-between w-full">
          {collapsed ? (
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

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>College Admin Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-card border-t border-border/60">
        <div>
          <button
            onClick={() => !collapsed && setProfileOpen(!profileOpen)}
            className={`flex items-center w-full rounded-lg p-2 hover:bg-sidebar-accent/50 transition-colors ${collapsed ? 'justify-center' : 'gap-3'}`}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{firstName}</p>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Admin</Badge>
                </div>
                <ChevronsUpDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
           {/* College Logo Section */}
                    <div className={`mt-1 flex items-center border-t border-border/40 pt-3 ${collapsed ? 'justify-center' : 'gap-3 px-3 pb-3 transition-all duration-200 hover:bg-sidebar-accent/30'}`}>
                      <img src={jntuLogo} alt="JNTU Hyderabad" className="h-8 w-8 shrink-0 object-contain" />
                      {!collapsed && (
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-foreground truncate">
                            JNTU Hyderabad
                          </p>
                          <p className="text-[10px] font-medium text-muted-foreground truncate opacity-70">
                            University Campus
                          </p>
                        </div>
                      )}
                    </div>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${profileOpen && !collapsed ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
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
}

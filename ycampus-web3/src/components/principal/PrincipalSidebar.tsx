import { LayoutDashboard, Building2, UserCheck, Users, FileText, Bell, LogOut, User, Moon, Sun, ChevronsUpDown, PanelLeft } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
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
import yuvroCampusLogo from '@/assets/yuvro-campus-combined.png';
import knowledgeTreeIcon from '@/assets/knowledge-tree.png';

const mainItems = [
  { title: 'Dashboard', url: '/principal/dashboard', icon: LayoutDashboard },
  { title: 'Department', url: '/principal/departments', icon: Building2 },
  { title: 'Faculty', url: '/principal/faculty', icon: UserCheck },
  { title: 'Students', url: '/principal/students', icon: Users },
  { title: 'PRI Report', url: '/principal/pri-report', icon: FileText },
];

export function PrincipalSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const collapsed = state === 'collapsed';
  const [profileOpen, setProfileOpen] = useState(false);
  const firstName = user?.first_name || user?.username || 'Principal';
  const initials = firstName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="h-14 flex items-center border-b border-border/60 px-3">
        <div className="flex items-center justify-between w-full">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={toggleSidebar} className="mx-auto hover:opacity-80 transition-opacity">
                  <img src={knowledgeTreeIcon} alt="Yuvro" className="h-8 w-8 shrink-0 object-contain" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand Sidebar</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <img src={yuvroCampusLogo} alt="Yuvro Campus" className="h-8 w-auto object-contain" />
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
          <SidebarGroupLabel>Principal Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
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
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Principal</Badge>
                </div>
                <ChevronsUpDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
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
              <button onClick={handleLogout} className="flex items-center w-full rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="mr-2 h-4 w-4" />Logout
              </button>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

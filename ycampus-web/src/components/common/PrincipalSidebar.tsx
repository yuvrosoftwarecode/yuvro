import { LayoutDashboard, Building2, UserCheck, Users, FileText, LogOut } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '../ui/sidebar';
import { useAuth } from '../../contexts/AuthContext';

// Using the existing logo asset known to exist in the project
import yuvroCampusLogo from '../../assets/Yuvro Campus Logo.png';

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
  const { state } = useSidebar();
  const { logout } = useAuth();
  const collapsed = state === 'collapsed';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center justify-center py-6 px-4">
          {collapsed ? (
            <img src={yuvroCampusLogo} alt="Yuvro" className="h-9 w-9 object-contain" />
          ) : (
            <img src={yuvroCampusLogo} alt="Yuvro Campus" className="h-12 w-full object-contain" />
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 py-2">
            Principal Portal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    className={location.pathname === item.url ? "bg-slate-100 text-[#020817] font-semibold" : "text-slate-600"}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-gray-50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout} 
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

import { useState, useEffect } from 'react';
import DeployInfo from '@/components/common/DeployInfo';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Home,
  StickyNote,
  ClipboardCheck,
  MessageSquare,
  BookOpen,
  Trophy,
  Briefcase,
  Megaphone,
  Users,
  BrainCircuit,
  Mic,
  Bell,
  LogOut,
  User,
  Moon,
  Sun,
  ChevronsUpDown,
  PanelLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getMediaUrl } from '@/utils/mediaUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import knowledgeTree from '@/assets/knowledge-tree.png';
import yuvroCampusCombined from '@/assets/yuvro-campus-combined.png';
import jntuLogo from '@/assets/JNTU_Hyderabad_logo.png';
import studentService, { Student } from '@/services/studentService';

const campusMenuItems = [
  { title: 'Dashboard', url: '/student/dashboard', icon: Home },
  { title: 'Learning', url: '/student/notes', icon: StickyNote },
  { title: 'Practice Test', url: '/student/test', icon: ClipboardCheck },
  { title: 'Task', url: '/student/task', icon: MessageSquare },
  { title: 'Assessment', url: '/student/assessment', icon: BookOpen },
  { title: 'Interview Preparation', url: '/student/interview-preparation', icon: Mic },
  { title: 'AI Interview Planner', url: '/student/ai-interview-planner', icon: BrainCircuit },
  { title: 'Jobs', url: '/student/jobs', icon: Briefcase },
  { title: 'Announcements', url: '/student/announcements', icon: Megaphone },
  { title: 'Community', url: '/student/community', icon: Users },
  { title: 'Contest', url: '/student/contest', icon: Trophy },
];

const assessmentMenuItems = [
  { title: 'Dashboard', url: '/student/dashboard', icon: Home },
  { title: 'Learning', url: '/student/notes', icon: StickyNote },
  { title: 'Code Practice', url: '/student/code-practice', icon: ClipboardCheck },
  { title: 'Skill Test', url: '/student/skill-test', icon: BookOpen },
  { title: 'Assessments', url: '/student/assessments', icon: ClipboardCheck },
  { title: 'Aptitude & Reasoning', url: '/student/aptitude-reasoning', icon: BrainCircuit },
  { title: 'Mock Interviews', url: '/student/mock-interview', icon: Mic },
  { title: 'AI Interview Planner', url: '/student/ai-interview-planner', icon: MessageSquare },
  { title: 'Jobs', url: '/student/jobs', icon: Briefcase },
  { title: 'Announcements', url: '/student/announcements', icon: Megaphone },
  { title: 'Contest', url: '/student/contest', icon: Trophy },
  { title: 'Leaderboard', url: '/student/leaderboard', icon: Users },
];

const getConfigKey = (title: string) => {
  return title.toLowerCase().replace(/[&\s-]+/g, '_');
};

export function StudentSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const collapsed = state === "collapsed";
  const [profileOpen, setProfileOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [activeToggle, setActiveToggle] = useState<'campus' | 'assessments'>('campus');

  useEffect(() => {
    if (user?.role === 'student' && user?.id) {
      studentService.getStudents({ user: user.id })
        .then(res => {
          if (res.results && res.results.length > 0) {
            setStudentProfile(res.results[0]);
          }
        })
        .catch(err => {
          console.error('Failed to fetch student profile:', err);
        });
    }
  }, [user]);

  const getBranchShortForm = (name: string) => {
    if (!name) return "...";
    const commonMap: Record<string, string> = {
      "Computer Science Engineering": "CSE",
      "Computer Science and Engineering": "CSE",
      "Electronics and Communication Engineering": "ECE",
      "Electronics & Communication Engineering": "ECE",
      "Information Technology": "IT",
      "Mechanical Engineering": "MECH",
      "Civil Engineering": "CIVIL",
      "Electrical and Electronics Engineering": "EEE",
    };
    if (commonMap[name]) return commonMap[name];
    return name
      .split(/\s+/)
      .filter(w => !["and", "&", "of"].includes(w.toLowerCase()))
      .map(w => w.charAt(0))
      .join("")
      .toUpperCase();

  };

  const toRoman = (num: number) => {
    const romanMap = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    return romanMap[num] || num.toString();
  };

  const formatSection = (name: string) => {
    if (!name) return "";
    return name.replace(/section/gi, "").trim().toUpperCase();

  };

  const isActive = (path: string) => {
    if (path === '/student/dashboard') {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-4 border-primary'
      : 'hover:bg-sidebar-accent/50 transition-all duration-200';

  const firstName = user?.first_name || user?.username || 'User';
  const initials = firstName.charAt(0).toUpperCase();


  const profileImage = getMediaUrl(user?.profile?.avatar);

  const isAssessments = user?.college_product_type === 'assessments';
  const isCampus = user?.college_product_type === 'campus';
  const rawMenuItems = isAssessments ? assessmentMenuItems : campusMenuItems;
  const sidebarConfig = (user as any)?.college_sidebar_config || {};
  const menuItemsToDisplay = rawMenuItems.filter(item => {
    const key = getConfigKey(item.title);
    return sidebarConfig[key] !== false;
  });

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/60 transition-all duration-300 ease-in-out"
    >
      {/* Logo Header with Notifications + Toggle */}
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
                      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                        3
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

      <SidebarContent className="bg-card">
        {!collapsed && isCampus && (
          <div className="px-3 pt-4 pb-1">
            <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/40 relative">
              <button
                type="button"
                className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  activeToggle === 'campus'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveToggle('campus')}
              >
                <Home className="h-3.5 w-3.5" />
                Campus
              </button>
              <button
                type="button"
                className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  activeToggle === 'assessments'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveToggle('assessments')}
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Assessments
              </button>
            </div>
          </div>
        )}
        <SidebarGroup>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItemsToDisplay.map((item) => {
                const navIsActive = isActive(item.url);
                const menuButton = (
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/student/dashboard'}
                      className={`
                        flex items-center rounded-lg p-3 text-sm font-medium transition-all duration-200
                        ${getNavCls({ isActive: navIsActive })}
                        ${collapsed ? "justify-center" : ""}
                      `}
                    >
                      <item.icon className={`h-5 w-5 ${!collapsed ? "mr-3" : ""}`} />
                      {!collapsed && (
                        <span className="truncate">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                );

                return (
                  <SidebarMenuItem key={item.title}>
                    {collapsed ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {menuButton}
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      menuButton
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Profile Footer */}
      <SidebarFooter className="bg-card border-t border-border/60">
        <div>
          <button
            onClick={() => !collapsed && setProfileOpen(!profileOpen)}
            className={`flex items-center w-full rounded-lg p-2 hover:bg-sidebar-accent/50 transition-colors ${collapsed ? 'justify-center' : 'gap-3'}`}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={profileImage} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{firstName}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {getBranchShortForm(studentProfile?.department_name || "")}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {studentProfile?.semester_number ? `Sem ${toRoman(studentProfile.semester_number)}` : ""}
                      {studentProfile?.semester_number && studentProfile?.section_name ? " - " : ""}
                      {studentProfile?.section_name ? `Sec ${formatSection(studentProfile.section_name)}` : ""}
                      {!studentProfile?.semester_number && !studentProfile?.section_name && "---"}
                    </span>
                  </div>
                </div>
                <ChevronsUpDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {/* College Logo Section */}
          {!isAssessments && (
            <div className={`mt-1 flex items-center border-t border-border/40 pt-3 ${collapsed ? 'justify-center' : 'gap-3 px-3 pb-3 transition-all duration-200 hover:bg-sidebar-accent/30'}`}>
              <img src={jntuLogo} alt="JNTU Hyderabad" className="h-8 w-8 shrink-0 object-contain" />
              {!collapsed && (
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
          )}

          {/* Inline expandable options */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${profileOpen && !collapsed ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
              }`}
          >
            <div className="px-2 pb-2 pt-1 space-y-0.5">
              <p className="text-xs text-muted-foreground px-2 pb-1 truncate">{user?.email}</p>
              <NavLink
                to="/student/profile"
                className="flex items-center w-full rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/50 transition-colors"
                onClick={() => setProfileOpen(false)}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </NavLink>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center w-full rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/50 transition-colors"
              >
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button
                onClick={logout}
                className="flex items-center w-full rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </button>
              <DeployInfo collapsed={collapsed} visible={profileOpen} />
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

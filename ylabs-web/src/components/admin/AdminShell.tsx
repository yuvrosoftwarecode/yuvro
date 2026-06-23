import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, FlaskConical, Ticket, Network, BarChart3, Briefcase,
  Bot, Bell, Search, LogOut, GitBranch, Database, Building2, GraduationCap,
  Brain, Cpu, AlertTriangle, ListChecks, Activity, Sparkles, ChevronRight,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

const NAV: { group: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    group: "Operations",
    items: [
      { to: "/admin", label: "Command Center", icon: LayoutDashboard },
      { to: "/admin/intelligence", label: "Intelligence", icon: Brain },
      { to: "/admin/infrastructure", label: "Infrastructure", icon: Cpu },
      { to: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    group: "People",
    items: [
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/recruiters", label: "Recruiters", icon: Briefcase },
      { to: "/admin/institutions", label: "Institutions", icon: GraduationCap },
    ],
  },
  {
    group: "Engineering",
    items: [
      { to: "/admin/labs", label: "Labs", icon: FlaskConical },
      { to: "/admin/sprints", label: "Sprint Templates", icon: GitBranch },
      { to: "/admin/tickets", label: "Tickets", icon: Ticket },
      { to: "/admin/questions", label: "Question Bank", icon: Database },
      { to: "/admin/incidents", label: "Incident Rooms", icon: AlertTriangle },
    ],
  },
  {
    group: "Platform",
    items: [
      { to: "/admin/collaboration", label: "Collaboration Hub", icon: Network },
      { to: "/admin/ai-mentor", label: "AI Mentor", icon: Bot },
      { to: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
];

export function AdminShell({ title, breadcrumb, right, children }: {
  title: string;
  breadcrumb?: string[];
  right?: ReactNode;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("yuvro-admin-sidebar-collapsed") === "1";
  });
  const toggleCollapsed = () => setCollapsed(c => {
    const next = !c;
    try { localStorage.setItem("yuvro-admin-sidebar-collapsed", next ? "1" : "0"); } catch {}
    return next;
  });

  useEffect(() => {
    if (user && user.role !== "admin") nav({ to: "/dashboard" });
  }, [user, nav]);

  const isActive = (to: string) =>
    to === "/admin" ? pathname === "/admin" : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className={`hidden md:flex shrink-0 flex-col border-r border-border bg-card/30 backdrop-blur transition-[width] duration-200 ${collapsed ? "w-14" : "w-60"}`}>
        <div className="h-14 flex items-center gap-2 px-3 border-b border-border">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-primary to-ui text-primary-foreground font-mono text-xs">Y</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">Yuvro Labs</div>
              <div className="text-[10px] text-muted-foreground truncate">Operations Console</div>
            </div>
          )}
          <button onClick={toggleCollapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-4 text-sm">
          {NAV.map((g) => (
            <div key={g.group}>
              {!collapsed && <div className="px-2 mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{g.group}</div>}
              <div className="space-y-0.5">
                {g.items.map((n) => {
                  const active = isActive(n.to);
                  return (
                    <Link key={n.to} to={n.to} title={collapsed ? n.label : undefined} className={`w-full flex items-center gap-2.5 rounded-md ${collapsed ? "justify-center px-0 py-2" : "px-3 py-1.5"} transition ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                      <n.icon className="h-4 w-4 shrink-0" /> {!collapsed && n.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-2 border-t border-border">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 mb-1 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-success" /> All systems operational
            </div>
          )}
          <button onClick={() => { logout(); nav({ to: "/" }); }} title="Sign out" className={`w-full flex items-center gap-2.5 rounded-md ${collapsed ? "justify-center px-0 py-2" : "px-3 py-2"} text-sm text-muted-foreground hover:bg-accent hover:text-foreground`}>
            <LogOut className="h-4 w-4 shrink-0" /> {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-background/60 backdrop-blur sticky top-0 z-30 flex items-center gap-4 px-6">
          <button onClick={toggleCollapsed} className="md:hidden grid h-8 w-8 place-items-center rounded-md border text-muted-foreground hover:bg-accent" title="Toggle sidebar">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Admin</span>
            {(breadcrumb ?? [title]).map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" />
                <span className={i === (breadcrumb ?? [title]).length - 1 ? "text-foreground font-medium" : ""}>{b}</span>
              </span>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-1.5 text-xs text-muted-foreground w-80">
              <Search className="h-3.5 w-3.5" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users, labs, tickets, sprints…" className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground" />
              <kbd className="text-[9px] border border-border px-1 rounded">⌘K</kbd>
            </div>
            <button className="relative grid h-8 w-8 place-items-center rounded-md border hover:bg-accent text-muted-foreground" title="AI insights"><Sparkles className="h-4 w-4" /></button>
            <Link to="/admin/notifications" className="relative grid h-8 w-8 place-items-center rounded-md border hover:bg-accent text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 grid place-items-center rounded-full bg-destructive text-[9px] text-destructive-foreground font-bold">3</span>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-ui text-primary-foreground text-xs font-semibold">{user?.name?.[0] ?? "A"}</div>
              <div className="hidden sm:block">
                <div className="text-xs font-medium leading-tight">{user?.name ?? "Admin"}</div>
                <div className="text-[10px] text-muted-foreground">Platform Admin</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              </div>
              {right}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return <Outlet />;
}

// Reusable building blocks
export function KpiCard({ label, value, delta, color = "primary", icon: Icon }: { label: string; value: string | number; delta?: string; color?: string; icon?: any }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4" style={{ color: `var(--${color})` }} />}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
      {delta && <div className="mt-0.5 text-[10px]" style={{ color: `var(--${color})` }}>{delta}</div>}
    </div>
  );
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "success" | "warning" | "destructive" | "primary" | "ui" }) {
  const map: Record<string, string> = {
    muted: "bg-muted/40 text-muted-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
    primary: "bg-primary/15 text-primary",
    ui: "bg-ui/15 text-ui",
  };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${map[tone]}`}>{children}</span>;
}

export { ListChecks };

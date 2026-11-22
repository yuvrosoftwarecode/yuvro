import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { DeployInfo } from "@/components/common/DeployInfo";
import {
  Users,
  FlaskConical,
  Briefcase,
  LogOut,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Search,
  Sparkles,
  CalendarDays,
  Code2,
  Layers,
  LayoutDashboard,
  Bot,
} from "lucide-react";

const NAV: { group: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    group: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "People",
    items: [
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/recruiters", label: "Recruiters", icon: Briefcase },
    ],
  },
  {
    group: "Developer",
    items: [
      { to: "/admin/labs", label: "Labs", icon: FlaskConical },
      { to: "/admin/mock-interviews", label: "Mock Interviews", icon: Bot },
      { to: "/admin/weekly-tasks", label: "Recurring Tasks", icon: CalendarDays },
      { to: "/admin/research", label: "AI Research Papers", icon: Sparkles },
    ],
  },
  {
    group: "Recruiter",
    items: [
      { to: "/admin/questions", label: "Question Bank", icon: Database },
    ],
  },
  {
    group: "Developer Tools",
    items: [
      { to: "/admin/vitarka-ide", label: "Vitarka IDE", icon: Code2 },
      { to: "/system-design-studio", label: "System Design Studio", icon: Layers },
    ],
  },
];

export function AdminShell({
  title,
  breadcrumb,
  right,
  fullBleed = false,
  hideHeader = false,
  children,
}: {
  title: string;
  breadcrumb?: string[];
  right?: ReactNode;
  fullBleed?: boolean;
  hideHeader?: boolean;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("yuvro-admin-sidebar-collapsed") === "1";
  });
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("yuvro-admin-sidebar-collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Role check is now handled in the parent admin layout (admin.tsx)
  useEffect(() => {
    if (user) {
      const role = user.roles?.ylabs || user.role;
      if (role !== "admin") {
        nav({ to: "/dashboard" });
      }
    }
  }, [user, nav]);

  const isActive = (to: string) =>
    to === "/admin" ? pathname === "/admin" : pathname === to || pathname.startsWith(to + "/");

  const getBreadcrumbLink = (label: string) => {
    for (const group of NAV) {
      if (group.group === label) return group.items[0]?.to;
      for (const item of group.items) {
        if (item.label === label) return item.to;
      }
    }
    return undefined;
  };

  return (
    <div className="recruiter-theme h-screen overflow-hidden bg-white text-neutral-900 flex">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${
          mobileOpen ? "fixed inset-y-0 left-0 z-50 flex w-60 shadow-2xl bg-white" : "hidden"
        } md:flex md:static shrink-0 flex-col h-full border-r border-[#e5e5e5] bg-white transition-[width] duration-200 ${
          collapsed ? "md:w-14" : "md:w-60"
        }`}
      >
        <div className="h-14 shrink-0 flex items-center gap-2.5 px-3 border-b border-[#e5e5e5]">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md">
            <img src="/logo.png" alt="Yuvro" className="h-full w-full object-contain" />
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight truncate text-neutral-900">Yuvro Admin</div>
              <div className="text-[10px] text-neutral-500 truncate">Operations Console</div>
            </div>
          )}
          <button
            onClick={() => {
              if (mobileOpen) {
                setMobileOpen(false);
              } else {
                toggleCollapsed();
              }
            }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto grid h-7 w-7 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
          >
            {collapsed && !mobileOpen ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto min-h-0 p-2 space-y-4 text-sm">
          {NAV.map((g) => (
            <div key={g.group}>
              {(!collapsed || mobileOpen) && (
                <div className="px-2 mb-1 text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                  {g.group}
                </div>
              )}
              <div className="space-y-0.5">
                {g.items.map((n) => {
                  const active = isActive(n.to);
                  return (
                    <Link
                      key={n.to}
                      to={n.to as any}
                      title={collapsed && !mobileOpen ? n.label : undefined}
                      onClick={() => setMobileOpen(false)}
                      data-analytics-action={`admin_nav_${n.label.toLowerCase().replace(/\s+/g, "_")}`}
                      data-analytics-component="navigation"
                      data-analytics-category="admin"
                      className={`w-full flex items-center gap-2.5 rounded-lg transition-colors ${
                        collapsed && !mobileOpen ? "justify-center px-0 py-2" : "px-3 py-2 text-[14px]"
                      } ${
                        active
                          ? "bg-[#ffebd1] text-[#171717] font-medium"
                          : "text-neutral-600 hover:bg-[#fffbf6] hover:text-neutral-900"
                      }`}
                    >
                      <n.icon className={`h-4 w-4 shrink-0 ${active ? "text-[#f7931e]" : "text-neutral-500"}`} />
                      {(!collapsed || mobileOpen) && n.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-2 border-t border-[#e5e5e5] shrink-0">
          <button
            onClick={() => {
              logout();
              nav({ to: "/" });
            }}
            data-analytics-action="admin_sign_out"
            data-analytics-component="button"
            data-analytics-category="admin"
            title="Sign out"
            className={`w-full flex items-center gap-2.5 rounded-md ${
              collapsed && !mobileOpen ? "justify-center px-0 py-2" : "px-3 py-2"
            } text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors`}
          >
            <LogOut className="h-4 w-4 shrink-0" /> {(!collapsed || mobileOpen) && "Sign out"}
          </button>
          <DeployInfo collapsed={collapsed && !mobileOpen} />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#FAFAF8] relative">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden fixed top-3 left-3 z-40 grid h-8 w-8 place-items-center rounded-md border border-[#e5e5e5] bg-white text-neutral-600 shadow-sm"
          title="Toggle menu"
        >
          {mobileOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>

        <main className={`flex-1 min-h-0 ${fullBleed ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>
          {fullBleed ? (
            children
          ) : (
            <div className="p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
              <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
                </div>
                {right}
              </div>
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return <Outlet />;
}

// Reusable building blocks
export function KpiCard({
  label,
  value,
  delta,
  color = "primary",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  color?: string;
  icon?: any;
}) {
  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-neutral-500">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-[#f7931e]" />}
      </div>
      <div className="mt-2 text-xl font-semibold text-neutral-900">{value}</div>
      {delta && (
        <div className="mt-0.5 text-[11px] text-[#f7931e] font-medium">
          {delta}
        </div>
      )}
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-neutral-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "success" | "warning" | "destructive" | "primary" | "ui";
}) {
  const map: Record<string, string> = {
    muted: "bg-neutral-100 text-neutral-600",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    destructive: "bg-rose-50 text-rose-700 border border-rose-200",
    primary: "bg-[#ffebd1] text-[#171717] font-medium",
    ui: "bg-blue-50 text-blue-700 border border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

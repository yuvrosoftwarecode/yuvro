import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Database,
  Settings,
  LogOut,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { requireRecruiterAuth } from "@/utils/authGuards";
import { PricingContent } from "./pricing";
import { DeployInfo } from "@/components/common/DeployInfo";
import { PanelLeftClose, Menu } from "lucide-react";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";

export const Route = createFileRoute("/recruiter")({
  beforeLoad: ({ location }) => requireRecruiterAuth(location.href),
  head: () => ({
    meta: [{ title: "Recruiter — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: RecruiterLayout,
});

function RecruiterLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (!token) {
        nav({ to: "/auth", search: { tab: "signin", redirect: window.location.pathname } });
        return;
      }
    }
  }, [user, nav]);

  useEffect(() => {
    async function checkPlan() {
      try {
        const res = await yhubApiAuthUtil.get<any[]>("/payment/entitlements/");
        const plans = res.filter((e: any) => e.purchasable_item?.product === "ylabs" || e.purchasable_item?.item_type === "plan");
        const plan = plans.find((e: any) => e.purchasable_item?.item_id !== "trial") || plans[0];
        
        setHasPlan(!!plan);
        
        const isTrialPlan = plan?.purchasable_item?.item_id === "trial";
        setIsTrial(isTrialPlan);
        
        if (isTrialPlan && plan.revoked_at) {
          setExpiryDate(plan.revoked_at);
        }
      } catch (err: any) {
        console.error("Failed to fetch entitlements", err);
        if (err?.status === 401 || !localStorage.getItem("access")) {
          nav({ to: "/auth", search: { tab: "signin", redirect: window.location.pathname } });
          return;
        }
        setHasPlan(false);
      }
    }
    checkPlan();
  }, [nav]);
  const items = [
    { to: "/recruiter/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/recruiter/evaluations", label: "Evaluations", icon: ClipboardList },
    { to: "/recruiter/questions", label: "Question Bank", icon: Database },
  ];
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  if (hasPlan === false) {
    return (
      <div className="bg-[#FAFAF8] min-h-screen text-[#0A0A0A] antialiased selection:bg-[#0A0A0A] selection:text-white pb-20">
        <div className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md border-b z-50 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="grid h-8 w-8 place-items-center rounded-lg text-white font-mono text-sm bg-[#0A0A0A]">Y</div>
            <span className="text-base">Yuvro Labs</span>
          </div>
          <button onClick={() => { logout(); nav({ to: "/auth", search: { tab: "signin" } }); }} className="text-sm font-medium text-neutral-500 hover:text-black">
            Sign out
          </button>
        </div>
        <div className="pt-8">
          <PricingContent onSubscribe={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return (
    <div className="recruiter-theme h-screen bg-[#0a0a0b] text-neutral-100 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40 recruiter-glow">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[160px]" />
        <div className="absolute -bottom-40 -right-20 h-[520px] w-[520px] rounded-full bg-violet-500/10 blur-[160px]" />
      </div>
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
            <img src="/logo.png" alt="Yuvro" className="h-full w-full object-contain" />
          </div>
          <div className="text-[13px] font-semibold">Yuvro Labs</div>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="text-neutral-400 hover:text-white">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex h-[calc(100vh-65px)] md:h-screen">
        {/* Backdrop for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-20 bg-black/60 md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-white/5 bg-[#0a0a0b] md:bg-black/40 backdrop-blur-xl transition-all duration-300 ${isSidebarOpen ? "w-[240px] translate-x-0" : "w-[240px] -translate-x-full md:translate-x-0 md:w-[72px]"}`}>
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between px-6 py-5' : 'justify-center py-5'}`}>
            <Link 
              to="/recruiter/dashboard" 
              className={`flex items-center ${isSidebarOpen ? 'gap-2.5' : ''}`} 
              onClick={(e) => { 
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(false);
                } else if (!isSidebarOpen) {
                  e.preventDefault();
                  setIsSidebarOpen(true);
                }
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg hover:ring-2 hover:ring-white/20 transition-all">
                <img src="/logo.png" alt="Yuvro" className="h-full w-full object-contain" />
              </div>
              {isSidebarOpen && (
                <div className="leading-tight">
                  <div className="text-[13px] font-semibold">Yuvro Labs</div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500">
                    Recruiter
                  </div>
                </div>
              )}
            </Link>
            {isSidebarOpen && (
              <button 
                className="text-neutral-500 hover:text-white transition"
                onClick={() => setIsSidebarOpen(false)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {isSidebarOpen && (
            <div className="px-3 pb-2 pt-4 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              Workspace
            </div>
          )}
          
          <nav className={`flex-1 space-y-1 ${isSidebarOpen ? 'px-3' : 'px-2 mt-4'}`}>
            {items.map((it) => {
              const active = isActive(it.to, it.exact);
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  title={!isSidebarOpen ? it.label : undefined}
                  className={`group flex items-center rounded-lg transition ${isSidebarOpen ? 'gap-3 px-3 py-2 text-[13px]' : 'justify-center py-3'} ${active ? "bg-white/[0.06] text-white" : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"}`}
                >
                  <it.icon className={`h-4 w-4 ${active ? "text-emerald-400" : ""}`} />
                  {isSidebarOpen && <span>{it.label}</span>}
                  {isSidebarOpen && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </Link>
              );
            })}
          </nav>
          
          <div className={`border-t border-white/5 ${isSidebarOpen ? 'p-3' : 'p-2 flex flex-col items-center gap-4'}`}>
            {isTrial && expiryDate && isSidebarOpen && (
              <div className="mb-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100/80 dark:bg-white/[0.04] p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-neutral-900 dark:text-neutral-200">
                  Free Trial Ends
                </div>
                <div className="mt-1 font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                  {new Date(expiryDate).toLocaleString(undefined, {
                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                  })}
                </div>
                <Link
                  to="/recruiter/billing"
                  className="mt-3 block w-full text-center rounded-lg bg-neutral-900 dark:bg-white py-1.5 text-[11px] font-semibold text-white dark:text-black transition hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-sm"
                >
                  Upgrade Plan
                </Link>
              </div>
            )}
            
            {isSidebarOpen ? (
              <div className="flex items-center gap-2 rounded-lg px-2 py-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-[11px] font-semibold text-black">
                  {(user?.name ?? "R")[0]}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[12px] text-white">{user?.name ?? "Recruiter"}</div>
                  <div className="truncate text-[10px] text-neutral-500">{user?.email ?? "recruiter@yuvro.com"}</div>
                </div>
                <button
                  onClick={toggle}
                  className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white/5 hover:text-white"
                  title={theme === "dark" ? "Switch to light" : "Switch to dark"}
                >
                  {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => {
                    logout();
                    nav({ to: "/auth", search: { tab: "signin" } });
                  }}
                  className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white/5 hover:text-white"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-[11px] font-semibold text-black" title={user?.name ?? "Recruiter"}>
                  {(user?.name ?? "R")[0]}
                </div>
                <button
                  onClick={toggle}
                  className="rounded-md p-2 text-neutral-500 transition hover:bg-white/5 hover:text-white"
                  title={theme === "dark" ? "Switch to light" : "Switch to dark"}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    logout();
                    nav({ to: "/auth", search: { tab: "signin" } });
                  }}
                  className="rounded-md p-2 text-neutral-500 transition hover:bg-white/5 hover:text-white"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
            {isSidebarOpen && <DeployInfo className="text-neutral-500/60" />}
          </div>
        </aside>
        <main className={`flex-1 h-full overflow-y-auto hide-scrollbar transition-[margin] duration-300 ${isSidebarOpen ? 'md:ml-[240px]' : 'md:ml-[72px]'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

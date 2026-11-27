import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  LayoutDashboard,
  ClipboardList,
  Database,
  Github,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { requireRecruiterAuth } from "@/utils/authGuards";
import { PricingContent } from "./pricing";
import { DeployInfo } from "@/components/common/DeployInfo";
import { RecruiterSidebarProvider, useRecruiterSidebar } from "@/lib/recruiterSidebarContext";

export const Route = createFileRoute("/recruiter")({
  beforeLoad: ({ location }) => requireRecruiterAuth(location.href),
  head: () => ({
    meta: [{ title: "Recruiter — Yuvro Labs" }, { name: "robots", content: "noindex" }],
  }),
  component: RecruiterRoot,
});

function RecruiterRoot() {
  return (
    <RecruiterSidebarProvider>
      <RecruiterLayout />
    </RecruiterSidebarProvider>
  );
}

function RecruiterLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const {
    isMinimized,
    toggleMinimized,
    isDrawerOpen,
    setDrawerOpen,
    isStep4Workspace,
  } = useRecruiterSidebar();

  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (!token) {
        nav({ to: "/recruiter-login", search: { redirect: window.location.pathname } });
        return;
      }
    }
  }, [user, nav]);

  useEffect(() => {
    async function checkPlan() {
      try {
        const res = await yhubApiAuthUtil.get<any[]>("/payment/entitlements/");
        const plans = res.filter(
          (e: any) =>
            e.purchasable_item?.product === "ylabs" || e.purchasable_item?.item_type === "plan"
        );
        const plan =
          plans.find((e: any) => e.purchasable_item?.item_id !== "trial") || plans[0];

        setHasPlan(!!plan);

        const isTrialPlan = plan?.purchasable_item?.item_id === "trial";
        setIsTrial(isTrialPlan);

        if (isTrialPlan && plan.revoked_at) {
          setExpiryDate(plan.revoked_at);
        }
      } catch (err: any) {
        console.error("Failed to fetch entitlements", err);
        if (err?.status === 401 || !localStorage.getItem("access")) {
          nav({ to: "/recruiter-login", search: { redirect: window.location.pathname } });
          return;
        }
        setHasPlan(false);
      }
    }
    checkPlan();
  }, [nav]);

  const items: { to: string; label: string; icon: any; exact?: boolean }[] = [
    { to: "/recruiter/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/recruiter/vitarka-ai", label: "Vitarka AI", icon: Sparkles, exact: true },
    { to: "/recruiter/evaluations", label: "Evaluations", icon: ClipboardList },
    { to: "/recruiter/questions", label: "Question bank", icon: Database },
    { to: "/recruiter/github", label: "GitHub and repositories", icon: Github },
    { to: "/recruiter/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (to: string, exact?: boolean) => {
    if (to === "/recruiter/vitarka-ai") {
      return pathname === "/recruiter/vitarka-ai" || pathname === "/vitarka-ai";
    }
    return exact ? pathname === to : pathname.startsWith(to);
  };

  if (hasPlan === false) {
    return (
      <div className="bg-[#FAFAF8] min-h-screen text-[#0A0A0A] antialiased selection:bg-[#0A0A0A] selection:text-white pb-20">
        <div className="fixed top-0 inset-x-0 h-16 bg-white/80 backdrop-blur-md border-b z-50 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="grid h-8 w-8 place-items-center rounded-lg text-white font-mono text-sm bg-[#0A0A0A]">
              Y
            </div>
            <span className="text-base">Yuvro Labs</span>
          </div>
          <button
            onClick={() => {
              logout();
              nav({ to: "/auth", search: { tab: "signin" } });
            }}
            className="text-sm font-medium text-neutral-500 hover:text-black"
          >
            Sign out
          </button>
        </div>
        <div className="pt-8">
          <PricingContent
            onSubscribe={async () => {
              try {
                await yhubApiAuthUtil.post("/payment/start_trial/", {});
              } catch (e) {
                console.log("start_trial error:", e);
              }
              setHasPlan(true);
              nav({ to: "/recruiter/dashboard" });
            }}
          />
        </div>
      </div>
    );
  }

  const isDrawer = isStep4Workspace && isDrawerOpen;
  const isDockedVisible = !isStep4Workspace && !isMinimized;

  return (
    <div className="recruiter-theme min-h-screen bg-white text-neutral-900">
      {/* Mobile Top Navigation (only when not in step 4 full-screen workspace) */}
      {!isStep4Workspace && (
        <div className="md:hidden flex items-center justify-between px-5 py-4 border-b rec-border bg-white sticky top-0 z-30">
          <Link
            to="/recruiter/dashboard"
            className="rec-fg flex items-center gap-2 text-[16px] font-semibold"
          >
            <img src="/logo.png" alt="Yuvro" className="h-6 w-6 object-contain" />
            <span>Yuvro Recruiter</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rec-muted hover:text-black p-1"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Floating Expand Button when docked sidebar is minimized (not in step 4) */}
      {!isStep4Workspace && isMinimized && (
        <button
          onClick={toggleMinimized}
          className="fixed top-3.5 left-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors shadow-xs"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <div className="flex min-h-screen">
        {/* Drawer Backdrop (for step 4 drawer or mobile menu) */}
        {(isDrawer || isMobileMenuOpen) && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs"
            onClick={() => {
              if (isDrawer) setDrawerOpen(false);
              if (isMobileMenuOpen) setIsMobileMenuOpen(false);
            }}
          />
        )}

        {/* Sidebar: Docked or Overlay Drawer */}
        {(isDockedVisible || isDrawer || isMobileMenuOpen) && (
          <aside
            className={`rec-border fixed inset-y-0 left-0 flex flex-col border-r bg-white transition-all duration-200 overflow-x-hidden ${
              isDrawer
                ? "z-50 w-[240px] shadow-2xl"
                : isDockedVisible
                ? "z-30 w-[240px]"
                : isMobileMenuOpen
                ? "z-50 w-[240px]"
                : "hidden"
            }`}
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-6 py-6 whitespace-nowrap min-w-[240px]">
              <Link
                to="/recruiter/dashboard"
                className="rec-fg flex items-center gap-2.5 text-[16px] font-semibold whitespace-nowrap"
                onClick={() => {
                  if (isDrawer) setDrawerOpen(false);
                  if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                }}
              >
                <img src="/logo.png" alt="Yuvro" className="h-6 w-6 object-contain shrink-0" />
                <span className="whitespace-nowrap">Yuvro Recruiter</span>
              </Link>
              {isDrawer ? (
                /* Close action appears ONLY when it is a drawer */
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-md p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors shrink-0"
                  title="Close sidebar drawer"
                  aria-label="Close sidebar drawer"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              ) : (
                /* Collapse action in normal docked mode */
                <button
                  onClick={toggleMinimized}
                  className="rounded-md p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors shrink-0"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 space-y-1 overflow-hidden px-3">
              {items.map((it) => {
                const active = isActive(it.to, it.exact);
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => {
                      if (isDrawer) setDrawerOpen(false);
                      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
                    }}
                    className={`rec-nav whitespace-nowrap ${active ? "rec-nav-active" : ""}`}
                  >
                    <span className="whitespace-nowrap">{it.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Footer Area */}
            <div className="rec-border border-t p-3 overflow-hidden">
              <div className="px-3 py-2 min-w-[214px] whitespace-nowrap">
                {/* Free Trial Banner */}
                {isTrial && expiryDate && (
                  <div className="mb-4 rounded-xl border rec-border bg-[#fffdfb] p-3.5">
                    <div className="text-[12px] font-semibold text-neutral-900">
                      Free trial ends
                    </div>
                    <div className="mt-1 font-mono text-[11px] rec-muted">
                      {new Date(expiryDate).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                    <Link
                      to="/recruiter/billing"
                      className="mt-3 block w-full text-center rounded-lg bg-[var(--rec-accent)] py-1.5 text-[12px] font-medium text-white transition hover:bg-[var(--rec-accent-hover)]"
                    >
                      Upgrade plan
                    </Link>
                  </div>
                )}

                <div className="rec-accent truncate text-[15px] font-semibold">
                  {(user as any)?.name ?? "Recruiter"}
                </div>
                <div className="rec-muted truncate text-[14px]">
                  {user?.email ?? "recruiter@yuvrolabs.com"}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => {
                      logout();
                      nav({ to: "/auth", search: { tab: "signin" } });
                    }}
                    className="rec-logout"
                  >
                    Log out
                  </button>
                  <DeployInfo className="text-neutral-400 text-[10px]" />
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 min-w-0 bg-white min-h-screen transition-all duration-200 ${
            isDockedVisible ? "md:ml-[240px]" : "ml-0"
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

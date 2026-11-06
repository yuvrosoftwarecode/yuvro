import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  LayoutDashboard,
  ClipboardList,
  Database,
  Github,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { requireRecruiterAuth } from "@/utils/authGuards";
import { PricingContent } from "./pricing";
import { DeployInfo } from "@/components/common/DeployInfo";

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    { to: "/recruiter/questions", label: "Question bank", icon: Database },
    { to: "/recruiter/github", label: "GitHub and repositories", icon: Github },
    { to: "/recruiter/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

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
          <PricingContent onSubscribe={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return (
    <div className="recruiter-theme min-h-screen bg-white text-neutral-900">
      {/* Mobile Top Navigation */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 border-b rec-border bg-white sticky top-0 z-30">
        <Link
          to="/recruiter/dashboard"
          className="rec-fg flex items-center gap-2 text-[16px] font-semibold"
        >
          <img src="/logo.png" alt="Yuvro" className="h-6 w-6 object-contain" />
          <span>Yuvro Recruiter</span>
        </Link>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="rec-muted hover:text-black p-1"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-screen">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/30 backdrop-blur-xs md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`rec-border fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-white transition-all duration-300 overflow-x-hidden ${
            isSidebarOpen
              ? "w-[240px] translate-x-0"
              : "w-[240px] -translate-x-full md:translate-x-0 md:w-[72px]"
          }`}
        >
          {isSidebarOpen ? (
            /* Expanded Header: Yuvro Icon + Yuvro Recruiter Text + Toggle Icon */
            <div className="flex items-center justify-between px-6 py-6 whitespace-nowrap min-w-[240px]">
              <Link
                to="/recruiter/dashboard"
                className="rec-fg flex items-center gap-2.5 text-[16px] font-semibold whitespace-nowrap"
                onClick={() => {
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
              >
                <img src="/logo.png" alt="Yuvro" className="h-6 w-6 object-contain shrink-0" />
                <span className="whitespace-nowrap">Yuvro Recruiter</span>
              </Link>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-md p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors shrink-0"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* Collapsed Header (Desktop): Centered Logo & Expand Button */
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:ring-2 hover:ring-neutral-200 transition-all"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <img src="/logo.png" alt="Yuvro" className="h-6 w-6 object-contain" />
              </button>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="rounded-md p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <nav className={`flex-1 space-y-1 overflow-hidden ${isSidebarOpen ? "px-3" : "px-2 mt-2"}`}>
            {items.map((it) => {
              const active = isActive(it.to, it.exact);
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  title={!isSidebarOpen ? it.label : undefined}
                  onClick={() => {
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={
                    isSidebarOpen
                      ? `rec-nav whitespace-nowrap ${active ? "rec-nav-active" : ""}`
                      : `flex items-center justify-center p-3 rounded-lg transition-colors ${
                          active
                            ? "bg-[#ffebd1] text-[var(--rec-fg)] font-medium"
                            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                        }`
                  }
                >
                  {isSidebarOpen ? (
                    <span className="whitespace-nowrap">{it.label}</span>
                  ) : (
                    <it.icon className="h-5 w-5 shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer Area */}
          <div className="rec-border border-t p-3 overflow-hidden">
            {isSidebarOpen ? (
              <div className="px-3 py-2 min-w-[214px] whitespace-nowrap">
                {/* Free Trial Banner — Retained as requested */}
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
            ) : (
              /* Collapsed Footer: Avatar + Logout Icon */
              <div className="flex flex-col items-center gap-3 py-2">
                <div
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#ffebd1] text-[12px] font-semibold text-[var(--rec-fg)]"
                  title={(user as any)?.name ?? "Recruiter"}
                >
                  {((user as any)?.name ?? "R")[0]}
                </div>
                <button
                  onClick={() => {
                    logout();
                    nav({ to: "/auth", search: { tab: "signin" } });
                  }}
                  className="rounded-md p-2 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          className={`flex-1 min-w-0 bg-white min-h-screen transition-[margin] duration-300 ${
            isSidebarOpen ? "md:ml-[240px]" : "md:ml-[72px]"
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

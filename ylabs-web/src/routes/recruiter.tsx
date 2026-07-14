import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Settings, LogOut, Sparkles, Sun, Moon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/recruiter")({
  head: () => ({ meta: [{ title: "Recruiter — Yuvro Labs" }, { name: "robots", content: "noindex" }] }),
  component: RecruiterLayout,
});

function RecruiterLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const items = [
    { to: "/recruiter", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/recruiter/evaluations", label: "Evaluations", icon: ClipboardList },
    { to: "/recruiter/settings", label: "Settings", icon: Settings },
  ];
  const isActive = (to: string, exact?: boolean) => exact ? pathname === to : pathname.startsWith(to);

  return (
    <div className="recruiter-theme min-h-screen bg-[#0a0a0b] text-neutral-100">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40 recruiter-glow">

        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-emerald-500/10 blur-[160px]" />
        <div className="absolute -bottom-40 -right-20 h-[520px] w-[520px] rounded-full bg-violet-500/10 blur-[160px]" />
      </div>
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-20 flex w-[240px] flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl">
          <Link to="/recruiter" className="flex items-center gap-2.5 px-6 py-5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 text-black font-mono text-sm font-bold">Y</div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold">Yuvro Labs</div>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">Recruiter</div>
            </div>
          </Link>
          <div className="px-3 pb-2 pt-4 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">Workspace</div>
          <nav className="flex-1 space-y-1 px-3">
            {items.map(it => {
              const active = isActive(it.to, it.exact);
              return (
                <Link key={it.to} to={it.to} className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${active ? "bg-white/[0.06] text-white" : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"}`}>
                  <it.icon className={`h-4 w-4 ${active ? "text-emerald-400" : ""}`} />
                  <span>{it.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/5 p-3">
            <div className="mb-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-[11px] text-neutral-400"><Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Vitarka AI</div>
              <div className="mt-1 text-[11px] text-neutral-500">Auto-generates candidate discussions from lab & assessment context.</div>
            </div>
            <div className="flex items-center gap-2 rounded-lg px-2 py-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-[11px] font-semibold text-black">{(user?.name ?? "R")[0]}</div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[12px] text-white">{user?.name ?? "Recruiter"}</div>
                <div className="truncate text-[10px] text-neutral-500">{user?.email ?? "recruiter@yuvrolabs.com"}</div>
              </div>
              <button onClick={toggle} className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white/5 hover:text-white" title={theme === "dark" ? "Switch to light" : "Switch to dark"} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => { logout(); nav({ to: "/auth", search: { tab: "signin" } }); }} className="rounded-md p-1.5 text-neutral-500 transition hover:bg-white/5 hover:text-white" title="Sign out">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>
        <main className="ml-[240px] flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

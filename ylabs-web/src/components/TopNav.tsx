import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Flame, Zap, Trophy, User, Users, LayoutDashboard, MessagesSquare, Award, BarChart3, Sun, Moon, LogOut, Rocket, ChevronDown, MoreHorizontal } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { me } from "@/lib/dummy";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";

const primaryLinks = [
  { to: "/dashboard", label: "Individual Hub", icon: LayoutDashboard },
  { to: "/hackathons", label: "Hackathons", icon: Rocket },
];

const otherLinks = [
  { to: "/collaboration", label: "Collaboration Hub", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/forum", label: "Forum", icon: MessagesSquare },
  { to: "/certificates", label: "Certificates", icon: Award },
];

export function TopNav({ rightSlot, activeOverride }: { rightSlot?: React.ReactNode; activeOverride?: string } = {}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const activePath = activeOverride ?? path;
  const [openOther, setOpenOther] = useState(false);
  const otherRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!openOther) return;
    const onDown = (e: MouseEvent) => {
      if (!otherRef.current?.contains(e.target as Node)) setOpenOther(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openOther]);
  const otherActive = otherLinks.some(l => activePath.startsWith(l.to));
  const isActive = (to: string) => to === "/dashboard" ? activePath === "/dashboard" : activePath.startsWith(to);
  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-ui text-primary-foreground font-mono text-xs">Y</div>
          <span>Yuvro Labs</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {primaryLinks.map((l) => {
            const active = isActive(l.to);
            const Icon = l.icon;
            return (
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}>
                <Icon className="h-3.5 w-3.5" />{l.label}
              </Link>
            );
          })}
          <div ref={otherRef} className="relative">
            <button type="button" onClick={() => setOpenOther(v => !v)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${otherActive || openOther ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}>
              <MoreHorizontal className="h-3.5 w-3.5" />Other
              <ChevronDown className={`h-3 w-3 transition-transform ${openOther ? "rotate-180" : ""}`} />
            </button>
            {openOther && (
              <div className="absolute left-0 top-full mt-1 w-52 rounded-md border border-border bg-popover shadow-lg p-1 z-50">
                {otherLinks.map(l => {
                  const active = isActive(l.to);
                  const Icon = l.icon;
                  return (
                    <Link key={l.to} to={l.to} onClick={() => setOpenOther(false)}
                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}>
                      <Icon className="h-3.5 w-3.5" />{l.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {rightSlot}
          <button onClick={toggle} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <span className="hidden sm:flex items-center gap-1 text-warning"><Flame className="h-4 w-4" />{me.streak}</span>
          <span className="hidden sm:flex items-center gap-1 text-primary"><Zap className="h-4 w-4" />{me.xp.toLocaleString()} XP</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs">Lv {me.level}</span>
          <ProfileMenu onLogout={() => { logout(); nav({ to: "/" }); }} userName={user?.name ?? me.name} userEmail={user?.email} />
        </div>
      </div>
    </header>
  );
}

function ProfileMenu({ onLogout, userName, userEmail }: { onLogout: () => void; userName: string; userEmail?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const initial = (userName || "?").trim().charAt(0).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-border bg-popover shadow-lg p-1 z-50">
          <div className="px-2.5 py-2 border-b border-border/60">
            <div className="text-sm font-medium truncate">{userName}</div>
            {userEmail && <div className="text-[11px] text-muted-foreground truncate">{userEmail}</div>}
          </div>
          <Link to="/profile" onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60">
            <User className="h-3.5 w-3.5" /> Profile
          </Link>
          <button onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

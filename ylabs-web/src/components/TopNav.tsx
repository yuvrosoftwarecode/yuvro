import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Flame, Zap, Trophy, User, Users, LayoutDashboard, MessagesSquare, Award, BarChart3, Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { me } from "@/lib/dummy";
import { useAuth } from "@/lib/auth";

const links = [
  { to: "/dashboard", label: "Individual Hub", icon: LayoutDashboard },
  { to: "/collaboration", label: "Collaboration Hub", icon: Users },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/forum", label: "Forum", icon: MessagesSquare },
  { to: "/certificates", label: "Certificates", icon: Award },
  { to: "/profile", label: "Profile", icon: User },
];

export function TopNav({ rightSlot, activeOverride }: { rightSlot?: React.ReactNode; activeOverride?: string } = {}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const activePath = activeOverride ?? path;
  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-ui text-primary-foreground font-mono text-xs">Y</div>
          <span>Yuvro Labs</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = l.to === "/dashboard" ? activePath === "/dashboard" : activePath.startsWith(l.to);
            const Icon = l.icon;
            return (
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`}>
                <Icon className="h-3.5 w-3.5" />{l.label}
              </Link>
            );
          })}
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
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">{me.avatar}</div>
          {user && (
            <button onClick={() => { logout(); nav({ to: "/" }); }} title="Sign out"
              className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

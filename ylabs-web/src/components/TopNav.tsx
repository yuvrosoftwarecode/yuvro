import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Flame,
  Zap,
  Trophy,
  User,
  Users,
  LayoutDashboard,
  MessagesSquare,
  Award,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  MoreHorizontal,
  Rocket,
} from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import { me } from "@/lib/dummy";
import { useAuth } from "@/lib/auth";
import { loadStudentStats, type StudentStats } from "@/lib/studentStats";
import { useState, useEffect } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const primaryLinks = [
  {
    to: "/dashboard",
    label: "Individual Hub",
    icon: LayoutDashboard,
  },
  {
    to: "/hackathons",
    label: "Hackathons",
    icon: Rocket,
  },
];

const otherLinks = [
  {
    to: "/collaboration",
    label: "Collaboration Hub",
    icon: Users,
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    to: "/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
  },
  {
    to: "/forum",
    label: "Forum",
    icon: MessagesSquare,
  },
  {
    to: "/certificates",
    label: "Certificates",
    icon: Award,
  },
];



export function TopNav({
  rightSlot,
  activeOverride,
}: {
  rightSlot?: React.ReactNode;
  activeOverride?: string;
} = {}) {
  const path = useRouterState({
    select: (s) => s.location.pathname,
  });

  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const activePath = activeOverride ?? path;

  const otherActive = otherLinks.some((link) =>
    activePath.startsWith(link.to)
  );

  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  useEffect(() => {
    loadStudentStats().then(setStudentStats).catch(console.error);
  }, []);

  const userAny = user as any;
  const streak = studentStats?.day_streak ?? userAny?.streak ?? me.streak;
  const xp = studentStats?.total_yp ?? userAny?.xp ?? userAny?.yuvro_points ?? me.xp;

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">

        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-ui text-primary-foreground font-mono text-xs">
            Y
          </div>

          <span>Yuvro Labs</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {primaryLinks.map((link) => {
            const active =
              link.to === "/dashboard"
                ? activePath === "/dashboard"
                : activePath.startsWith(link.to);

            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors ${
                  otherActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                <MoreHorizontal className="h-4 w-4" />
                Other
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-60">
              {otherLinks.map((link) => {
                const Icon = link.icon;
                const active =
                  activePath === link.to || activePath.startsWith(link.to);

                return (
                  <DropdownMenuItem asChild key={link.to}>
                    <Link
                      to={link.to}
                      className={`flex items-center gap-2 ${
                        active ? "font-semibold text-foreground" : ""
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">

          {rightSlot}

          <button
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <span className="hidden sm:flex items-center gap-1 text-warning">
            <Flame className="h-4 w-4" />
            {streak}
          </span>

          <span className="hidden sm:flex items-center gap-1 text-primary">
            <Zap className="h-4 w-4" />
            {xp.toLocaleString()} XP
          </span>

          <span className="rounded-full bg-accent px-2 py-0.5 text-xs">
            Lv {me.level}
          </span>

          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {user
              ? user.first_name?.charAt(0)?.toUpperCase() ||
                user.username?.charAt(0)?.toUpperCase()
              : "U"}
          </div>

          {user && (
            <button
              onClick={() => {
                logout();
                nav({ to: "/" });
              }}
              title="Sign out"
              className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

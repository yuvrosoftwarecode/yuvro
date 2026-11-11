import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { User, Sun, Moon, LogOut, X } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { DeployInfo } from "@/components/common/DeployInfo";
import { loadStudentStats, type StudentStats } from "@/lib/studentStats";
import { WalletBalanceBadge } from "@/components/credits/WalletBalanceBadge";
import YuvroLogo from "@/assets/YuvroLogo.png";

const primaryLinks = [
  { to: "/student/dashboard", label: "Simulation Labs" },
  { to: "/mock-interviews", label: "Mock Interviews" },
];

export function TopNav({
  rightSlot,
  activeOverride,
}: { rightSlot?: React.ReactNode; activeOverride?: string } = {}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const activePath = activeOverride ?? path;

  const [stats, setStats] = useState<StudentStats | null>(null);

  useEffect(() => {
    if (user) {
      loadStudentStats().then(setStats).catch(() => {});
    }

    const handleRefresh = () => {
      loadStudentStats(true).then(setStats).catch(() => {});
    };
    window.addEventListener("yuvro-stats-refresh", handleRefresh);
    return () => window.removeEventListener("yuvro-stats-refresh", handleRefresh);
  }, [user]);

  const [showGithubPrompt, setShowGithubPrompt] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    if (user && !(user as any).github_connected) {
      setShowGithubPrompt(true);
      setIsBlinking(true);
      const timer = setTimeout(() => setIsBlinking(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const dismissPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowGithubPrompt(false);
  };

  const isActive = (to: string) => {
    if (to === "/student/dashboard") {
      return (
        activePath === "/student/dashboard" ||
        activePath === "/dashboard" ||
        activePath.startsWith("/student/lab")
      );
    }
    if (to === "/mock-interviews") {
      return activePath.startsWith("/mock-interviews") || activePath.startsWith("/mock-interview");
    }
    return activePath.startsWith(to);
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
        <Link
          to="/student/dashboard"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <img src={YuvroLogo} alt="Yuvro Labs" className="h-7 w-auto object-contain" />
          <span>Yuvro Labs</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {primaryLinks.map((l) => {
            const active = isActive(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`relative py-1.5 transition-colors after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[2px] after:rounded-full after:transition-opacity ${
                  active
                    ? "text-foreground font-medium after:bg-[#f7931e] after:opacity-100"
                    : "text-muted-foreground hover:text-foreground after:bg-[#f7931e] after:opacity-0"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {rightSlot}
          <button
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user && (
            <div className="relative flex items-center">
              {!(user as any).github_connected && showGithubPrompt && (
                <div
                  className={`absolute top-full right-0 mt-3 w-max flex items-center gap-2 rounded-md bg-warning text-warning-foreground px-3 py-2 text-xs font-medium shadow-lg z-50 ${
                    isBlinking ? "animate-pulse" : ""
                  }`}
                >
                  <span>Connect GitHub for a seamless experience</span>
                  <button
                    onClick={dismissPrompt}
                    className="hover:opacity-70 transition-opacity ml-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute -top-[10px] right-4 border-[6px] border-transparent border-b-warning" />
                </div>
              )}
              <button
                onClick={async () => {
                  if (!(user as any).github_connected) {
                    try {
                      const { yhubApiAuthUtil } = await import("@/utils/RestApiAuthUtil");
                      const data = await yhubApiAuthUtil.get<{ authorization_url: string }>(
                        "/auth/github/connect/",
                      );
                      if (data.authorization_url) window.location.href = data.authorization_url;
                    } catch (e) {
                      console.error("Failed to fetch github connect url", e);
                    }
                  } else {
                    nav({ to: "/student/profile" });
                  }
                }}
                title={(user as any).github_connected ? "GitHub Connected (View Profile)" : "Connect GitHub"}
                className="relative grid h-8 w-8 place-items-center rounded-md border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {(user as any).github_connected && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
                )}
              </button>
            </div>
          )}

          <div
            className="hidden md:flex items-center gap-5 text-xs"
            role="group"
            aria-label="Your stats"
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-muted-foreground">Streak</span>
              <span className="font-semibold text-foreground tabular-nums">
                {stats?.day_streak ?? 0}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-muted-foreground">Points</span>
              <span className="font-semibold text-foreground tabular-nums">
                {(stats?.total_yp ?? 0).toLocaleString()} YP
              </span>
            </div>
            <WalletBalanceBadge variant="minimal" />
          </div>

          {user ? (
            <ProfileMenu
              onLogout={() => {
                logout();
                nav({ to: "/" });
              }}
              userName={
                user.first_name || user.last_name
                  ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                  : user.username
              }
              userEmail={user.email}
              userId={user.id}
              profileImage={user.profile_image}
            />
          ) : (
            <Link
              to="/auth"
              search={{ tab: "signin" }}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function ProfileMenu({
  onLogout,
  userName,
  userEmail,
  userId,
  profileImage,
}: {
  onLogout: () => void;
  userName: string;
  userEmail?: string;
  userId: string;
  profileImage?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const initial = (userName || "?").trim().charAt(0).toUpperCase();
  const displayImage = mounted ? profileImage : undefined;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 overflow-hidden"
      >
        {displayImage ? (
          <img src={displayImage} alt={userName} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-border bg-popover shadow-lg p-1 z-50">
          <div className="px-2.5 py-2 border-b border-border/60">
            <div className="text-sm font-medium truncate">{userName}</div>
            {userEmail && (
              <div className="text-[11px] text-muted-foreground truncate">{userEmail}</div>
            )}
          </div>
          <Link
            to="/u/$userId"
            params={{ userId: String(userId) }}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60"
          >
            <User className="h-3.5 w-3.5" /> Profile
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
          <div className="border-t border-border/40 mt-1 pt-0.5">
            <DeployInfo />
          </div>
        </div>
      )}
    </div>
  );
}

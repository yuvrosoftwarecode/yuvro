import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { restApiUtil } from "@/utils/RestApiUtil";
import { useAuth } from "@/lib/auth";
import { LabIcon } from "@/components/LabIcon";
import { Badge } from "@/components/ui/badge";
import YuvroLogo from "@/assets/YuvroLogo.png";
import {
  Flame,
  Zap,
  Award,
  CheckCircle2,
  Target,
  Github,
  Linkedin,
  Globe,
  MapPin,
  GraduationCap,
  Briefcase,
  Calendar,
  Sparkles,
  ArrowRight,
  Activity,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Profile as OwnStudentProfile } from "./student.profile";

export const Route = createFileRoute("/u/$userId")({
  component: UserProfileRoute,
});

/**
 * `/u/<userId>` is both the shareable public profile and the student's own
 * profile URL. If the logged-in user opens their own id, show their real
 * (editable) profile page; otherwise show the public read-only view.
 */
function UserProfileRoute() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  // Auth state comes from localStorage, so decide only after mount to keep
  // the SSR output and first client render identical.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user?.id && String(user.id) === String(userId)) {
    return <OwnStudentProfile />;
  }
  return <PublicStudentProfilePage />;
}

interface PublicProfileData {
  student: {
    id: string;
    name: string;
    username: string;
    profile_image?: string;
    cover_image?: string;
    about?: string;
    title?: string;
    location?: string;
    website?: string;
    college?: string;
    department?: string;
    education?: Array<Record<string, any>>;
    employment?: Array<Record<string, any>>;
    github_username?: string;
    linkedin_name?: string;
    date_joined?: string;
  };
  stats: {
    day_streak: number;
    total_yp: number;
    rank: number;
    solved_tickets_count: number;
    completed_labs_count: number;
    active_labs_count: number;
  };
  currently_doing: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    type: string;
    difficulty: string;
    icon: string;
    skills: string[];
    total_tickets: number;
    completed_tickets: number;
    earned_yp: number;
    progress: number;
    current_sprint?: string;
    current_ticket?: string;
  }>;
  completed_labs: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    type: string;
    difficulty: string;
    icon: string;
    skills: string[];
    total_tickets: number;
    completed_tickets: number;
    earned_yp: number;
    progress: number;
    milestone_url?: string;
  }>;
  skills: string[];
  activities: Array<{
    date: string;
    count: number;
  }>;
}

function PublicStudentProfilePage() {
  const { userId } = Route.useParams();
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);
        const res = await restApiUtil.get<PublicProfileData>(
          `/lab/public/profile/${userId}/`
        );
        setData(res);
      } catch (err: any) {
        setError(
          err?.details?.error ||
            err?.response?.data?.error ||
            err?.message ||
            "Student profile not found or link is invalid."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [userId]);

  /* ── Generate GitHub-style contribution calendar grid ── */
  const contributionGrid = useMemo(() => {
    const activityMap = new Map<string, number>();
    (data?.activities || []).forEach((a) => {
      activityMap.set(a.date, a.count);
    });

    // Generate last 24 weeks of days (168 days)
    const days: Array<{ date: string; count: number; level: number }> = [];
    const today = new Date();
    for (let i = 167; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const count = activityMap.get(iso) || 0;
      let level = 0;
      if (count >= 4) level = 4;
      else if (count >= 2) level = 3;
      else if (count === 1) level = 2;
      days.push({ date: iso, count, level });
    }
    return days;
  }, [data?.activities]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading student profile…
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border/80 bg-card p-8 text-center shadow-lg">
          <div className="size-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
            <Award className="size-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Profile Not Found</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {error || "The requested student profile does not exist or may have been removed."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Explore Yuvro Labs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { student, stats, currently_doing, completed_labs, skills } = data;
  const initial = (student.name || student.username || "?").trim().charAt(0).toUpperCase();

  const formattedJoinDate = student.date_joined
    ? new Date(student.date_joined).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* ── Public Top Bar ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-foreground group">
            <img src={YuvroLogo} alt="Yuvro Labs" className="h-7 w-auto object-contain" />
            <span className="text-base font-semibold text-foreground">
              Yuvro Labs
            </span>
          </Link>
        </div>
      </header>

      {/* ── Main Profile Container ─────────────────────────── */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 space-y-8">
        {/* ── Hero Banner & Avatar ────────────────────────────── */}
        <section
          className="relative rounded-2xl border border-border/80 bg-gradient-to-br from-primary/10 via-card to-background p-6 sm:p-8 flex flex-col justify-end min-h-[240px] sm:min-h-[270px] overflow-hidden shadow-xs"
          style={
            student.cover_image
              ? {
                  backgroundImage: `url(${student.cover_image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {/* Dark Overlay for high contrast */}
          {student.cover_image && (
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />
          )}

          {/* Student Info Row */}
          <div className="relative z-20 flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-6">
            {/* Avatar */}
            <div className="relative size-24 sm:size-28 shrink-0 rounded-full border-4 border-background bg-primary text-primary-foreground text-4xl font-semibold grid place-items-center shadow-lg overflow-hidden">
              {student.profile_image && !avatarError ? (
                <img
                  src={student.profile_image}
                  alt={student.name}
                  onError={() => setAvatarError(true)}
                  className="size-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>

            {/* Name, Headline & Metadata */}
            <div className="min-w-0 space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                    student.cover_image ? "text-white" : "text-foreground"
                  }`}
                >
                  {student.name}
                </h1>
                <Badge
                  variant="secondary"
                  className="gap-1 border border-primary/20 bg-primary/10 text-primary text-[11px] font-medium"
                >
                  <ShieldCheck className="size-3" />
                  Verified Student
                </Badge>
              </div>

              <p
                className={`text-sm ${
                  student.cover_image ? "text-white/80" : "text-muted-foreground"
                }`}
              >
                @{student.username}
                {student.title && <span> · {student.title}</span>}
              </p>

              {/* Badges / Links Row */}
              <div
                className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs ${
                  student.cover_image ? "text-white/90" : "text-muted-foreground"
                }`}
              >
                {student.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" />
                    {student.location}
                  </span>
                )}
                {student.college && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="size-3.5 shrink-0" />
                    {student.college}
                    {student.department && ` (${student.department})`}
                  </span>
                )}
                {formattedJoinDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5 shrink-0" />
                    Joined {formattedJoinDate}
                  </span>
                )}
                {student.github_username && (
                  <a
                    href={`https://github.com/${student.github_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    <Github className="size-3.5 shrink-0" />
                    github.com/{student.github_username}
                  </a>
                )}
                {student.linkedin_name && (
                  <a
                    href={`https://linkedin.com/in/${encodeURIComponent(student.linkedin_name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    <Linkedin className="size-3.5 shrink-0" />
                    linkedin.com/in/{student.linkedin_name}
                  </a>
                )}
                {student.website && (
                  <a
                    href={student.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors underline-offset-4 hover:underline"
                  >
                    <Globe className="size-3.5 shrink-0" />
                    {student.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Key Stats KPI Row (GitHub-style Metrics) ────────── */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Day Streak */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-border transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Day Streak</span>
              <Flame className="size-4 text-orange-500 fill-orange-500/20" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats.day_streak}
              </span>
              <span className="text-xs text-muted-foreground font-medium">days</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Continuous learning</p>
          </div>

          {/* Total YP */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-border transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total YP</span>
              <Zap className="size-4 text-amber-500 fill-amber-500/20" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats.total_yp.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground font-medium">YP</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Earned solve points</p>
          </div>

          {/* Completed Labs */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-border transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Labs Completed</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats.completed_labs_count}
              </span>
              <span className="text-xs text-muted-foreground font-medium">finished</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Production labs</p>
          </div>

          {/* Tickets Solved */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-border transition-colors">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Tickets Solved</span>
              <Target className="size-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats.solved_tickets_count}
              </span>
              <span className="text-xs text-muted-foreground font-medium">tickets</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Verified solutions</p>
          </div>
        </section>

        {/* ── Two-Column Layout (Content Grid) ───────────────── */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Main Column */}
          <div className="space-y-8 min-w-0">
            {/* 1. Currently Doing / In-Progress Labs */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  <h2 className="text-lg font-semibold tracking-tight">Currently Working On</h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {currently_doing.length} {currently_doing.length === 1 ? "lab" : "labs"} in progress
                </span>
              </div>

              {currently_doing.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                  Not actively working on any lab right now. All enrolled labs are complete!
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {currently_doing.map((lab) => (
                    <div
                      key={lab.id}
                      className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-2xs hover:border-primary/50 transition-all hover:shadow-xs"
                    >
                      <div>
                        {/* Top Meta */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="size-9 rounded-lg bg-primary/10 grid place-items-center border border-primary/20 shrink-0">
                              <LabIcon name={lab.icon || lab.type || "layers"} className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm truncate">{lab.title}</h3>
                              <span className="text-[11px] text-muted-foreground capitalize">
                                {lab.type.toLowerCase().replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                            {lab.difficulty}
                          </Badge>
                        </div>

                        {/* Current ticket indicator */}
                        <div className="mt-4 rounded-lg bg-muted/60 p-2.5 text-xs">
                          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                            <span>Active Ticket</span>
                            <span className="font-medium text-foreground">
                              {lab.completed_tickets}/{lab.total_tickets} done
                            </span>
                          </div>
                          <p className="mt-1 font-medium truncate text-foreground">
                            {lab.current_ticket || "Working on sprint tasks"}
                          </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Overall Progress</span>
                            <span className="font-semibold text-primary">{lab.progress}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${lab.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Skills & Action */}
                      <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-border/60">
                        {lab.skills.slice(0, 3).map((sk) => (
                          <span
                            key={sk}
                            className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Completed Labs & Showcase Milestones */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-emerald-500" />
                  <h2 className="text-lg font-semibold tracking-tight">Completed Labs & Milestones</h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {completed_labs.length} verified
                </span>
              </div>

              {completed_labs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                  No completed labs yet. Check back soon as student completes upcoming sprints!
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {completed_labs.map((lab) => (
                    <div
                      key={lab.id}
                      className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-2xs hover:border-emerald-500/40 transition-all hover:shadow-xs"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="size-9 rounded-lg bg-emerald-500/10 grid place-items-center border border-emerald-500/20 text-emerald-500 shrink-0">
                              <LabIcon name={lab.icon || lab.type || "layers"} className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-sm truncate">{lab.title}</h3>
                              <span className="text-[11px] text-muted-foreground capitalize">
                                {lab.type.toLowerCase().replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="gap-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium"
                          >
                            <CheckCircle2 className="size-3" />
                            Completed
                          </Badge>
                        </div>

                        {lab.description && (
                          <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {lab.description}
                          </p>
                        )}

                        {/* Earned YP pill */}
                        <div className="mt-3 flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 font-semibold text-amber-500">
                            <Zap className="size-3.5 fill-amber-500/20" />
                            +{lab.earned_yp} YP Earned
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {lab.total_tickets} tickets solved
                          </span>
                        </div>
                      </div>

                      {/* Footer Link to Milestone */}
                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {lab.skills.slice(0, 2).map((sk) => (
                            <span
                              key={sk}
                              className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>

                        {lab.milestone_url && (
                          <Link
                            to={lab.milestone_url as any}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
                          >
                            <span>View Milestone</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 3. GitHub-style Activity Heatmap */}
            <section className="space-y-4 rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-primary" />
                  <h2 className="text-base font-semibold tracking-tight">Activity Calendar</h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  {data.activities.reduce((acc, c) => acc + c.count, 0)} contributions in recent months
                </span>
              </div>

              {/* Heatmap Grid */}
              <div className="mt-2 overflow-x-auto pb-2">
                <div className="min-w-[620px]">
                  <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-max">
                    {contributionGrid.map((day) => {
                      let bgClass = "bg-muted/40 hover:ring-1 hover:ring-border";
                      if (day.level === 1) bgClass = "bg-emerald-500/25";
                      else if (day.level === 2) bgClass = "bg-emerald-500/50";
                      else if (day.level === 3) bgClass = "bg-emerald-500/75";
                      else if (day.level === 4) bgClass = "bg-emerald-500";

                      return (
                        <div
                          key={day.date}
                          title={`${day.count} activities on ${day.date}`}
                          className={`size-3 rounded-xs transition-colors cursor-pointer ${bgClass}`}
                        />
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                    <span>Less</span>
                    <span className="size-2.5 rounded-xs bg-muted/40" />
                    <span className="size-2.5 rounded-xs bg-emerald-500/25" />
                    <span className="size-2.5 rounded-xs bg-emerald-500/50" />
                    <span className="size-2.5 rounded-xs bg-emerald-500/75" />
                    <span className="size-2.5 rounded-xs bg-emerald-500" />
                    <span>More</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* About / Bio */}
            {student.about && (
              <section className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  About
                </h3>
                <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                  {student.about}
                </p>
              </section>
            )}

            {/* Verified Skills */}
            <section className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Verified Skills
              </h3>
              {skills.length === 0 ? (
                <p className="text-xs text-muted-foreground">Skills will appear as labs are solved.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md border border-border/70 bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Education */}
            {Array.isArray(student.education) && student.education.length > 0 && (
              <section className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Education
                  </h3>
                </div>
                <div className="space-y-3">
                  {student.education.map((edu, idx) => (
                    <div key={idx} className="text-xs space-y-0.5 border-l-2 border-primary/30 pl-2.5">
                      <div className="font-semibold text-foreground">
                        {edu.school || edu.college || "University"}
                      </div>
                      {(edu.degree || edu.field) && (
                        <div className="text-muted-foreground">
                          {[edu.degree, edu.field].filter(Boolean).join(" in ")}
                        </div>
                      )}
                      {(edu.start || edu.end) && (
                        <div className="text-[11px] text-muted-foreground/80">
                          {edu.start || "Started"} — {edu.end || "Present"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Employment / Experience */}
            {Array.isArray(student.employment) && student.employment.length > 0 && (
              <section className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Experience
                  </h3>
                </div>
                <div className="space-y-3">
                  {student.employment.map((emp, idx) => (
                    <div key={idx} className="text-xs space-y-0.5 border-l-2 border-primary/30 pl-2.5">
                      <div className="font-semibold text-foreground">
                        {emp.role || "Software Engineer"}
                      </div>
                      {emp.company && (
                        <div className="text-muted-foreground">{emp.company}</div>
                      )}
                      {(emp.start || emp.end) && (
                        <div className="text-[11px] text-muted-foreground/80">
                          {emp.start || "Started"} — {emp.end || "Present"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Yuvro Labs Call to Action */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 space-y-3 text-center">
              <Sparkles className="size-6 text-primary mx-auto" />
              <h4 className="text-sm font-semibold text-foreground">Build Real Software on Yuvro</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Experience end-to-end engineering sprints, real git branches, and automated evaluation.
              </p>
              <Link
                to="/"
                className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                Explore All Labs
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* ── Public Footer ───────────────────────────────────── */}
      <footer className="mt-16 border-t border-border/60 bg-muted/20 py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Yuvro Labs. Production-grade engineer training.</p>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">
              Explore Labs
            </Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <a
              href="https://yuvro.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Yuvro Platform
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

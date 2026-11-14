import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";
import {
  Award,
  CheckCircle2,
  Code2,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Share2,
  Linkedin,
} from "lucide-react";

export const Route = createFileRoute("/public/milestone/$slug/$userId")({
  component: PublicMilestoneShowcase,
});

interface PublicMilestoneData {
  student: {
    name: string;
    username: string;
    profile_image?: string;
  };
  lab: {
    id: string;
    slug: string;
    title: string;
    description: string;
    difficulty: string;
    language: string;
    tags: string[];
    total_sprints: number;
    total_tickets: number;
  };
  achievement: {
    completed_tickets: number;
    total_tickets: number;
    overall_progress: number;
    earned_yp: number;
    max_yp: number;
    sprints: Array<{
      id: string;
      name: string;
      tickets_total: number;
      tickets_completed: number;
      is_completed: boolean;
      score: number;
    }>;
  };
}

function PublicMilestoneShowcase() {
  const { slug, userId } = Route.useParams();
  const [data, setData] = useState<PublicMilestoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMilestone() {
      try {
        const res = await restApiAuthUtil.get<PublicMilestoneData>(
          `/lab/public/milestone/${slug}/${userId}/`
        );
        setData(res);
      } catch (err: any) {
        setError(err?.response?.data?.error || "Milestone not found or invalid link.");
      } finally {
        setLoading(false);
      }
    }
    fetchMilestone();
  }, [slug, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center shadow-lg">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
            <Award className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold">Milestone Not Available</h2>
          <p className="text-sm text-muted-foreground mt-2">{error || "Unable to load milestone record."}</p>
          <a
            href="https://yuvrolabs.com"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Explore Yuvro Labs
          </a>
        </div>
      </div>
    );
  }

  const { student, lab, achievement } = data;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top CTA Banner to attract viewers */}
      <header className="border-b border-border/60 bg-primary/5 px-4 py-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-sm">
              Y
            </div>
            <span className="font-semibold text-sm tracking-tight hidden sm:inline">
              Yuvro Labs Verified Milestone
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden md:inline">
              Practice real-world engineering with automated code grading
            </span>
            <a
              href={`/auth?redirect=/student/lab/${lab.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-sm"
            >
              Try This Lab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Showcase Card */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          {/* Student Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 border-b border-border/60 pb-8">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0 overflow-hidden shadow-inner">
              {student.profile_image ? (
                <img
                  src={student.profile_image}
                  alt={student.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                student.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-0.5 text-[11px] font-semibold mb-2">
                <CheckCircle2 className="h-3.5 w-3.5" /> Verified Completion
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {student.name}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                @{student.username} · Engineering Track
              </p>
            </div>

            <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-1 text-center sm:text-right">
              <span className="text-2xl sm:text-3xl font-extrabold text-primary">
                {achievement.earned_yp}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Yuvro Points Earned
              </span>
            </div>
          </div>

          {/* Milestone Details */}
          <div className="py-8">
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">
              Practical Lab Completed
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {lab.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {lab.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-foreground">
                {lab.language}
              </span>
              <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-foreground">
                {lab.difficulty} Difficulty
              </span>
              {lab.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-border/80 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Achievement KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
              <div className="rounded-2xl border border-border/80 bg-background/50 p-4 text-center">
                <div className="text-xs text-muted-foreground font-medium uppercase">Tickets Solved</div>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {achievement.completed_tickets} / {achievement.total_tickets}
                </div>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/50 p-4 text-center">
                <div className="text-xs text-muted-foreground font-medium uppercase">Progress</div>
                <div className="text-2xl font-bold text-emerald-500 mt-1">
                  {achievement.overall_progress}%
                </div>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/50 p-4 text-center">
                <div className="text-xs text-muted-foreground font-medium uppercase">Sprints Cleared</div>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {achievement.sprints.filter((s) => s.is_completed).length} / {lab.total_sprints}
                </div>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/50 p-4 text-center">
                <div className="text-xs text-muted-foreground font-medium uppercase">Evaluation</div>
                <div className="text-2xl font-bold text-primary mt-1">
                  Production Pass
                </div>
              </div>
            </div>

            {/* Sprint Breakdown */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Completed Sprints & Modules
              </h3>
              <div className="space-y-2.5">
                {achievement.sprints.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-3.5 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-xs font-semibold text-muted-foreground shrink-0">
                        {idx + 1}
                      </div>
                      <span className="font-medium truncate">{s.name}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {s.tickets_completed}/{s.tickets_total} tasks
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 px-2 py-0.5 text-xs font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        {s.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Social Footer & Platform Banner */}
          <div className="mt-6 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 bg-accent/20 -mx-6 -mb-6 sm:-mx-10 sm:-mb-10 p-6 sm:p-10">
            <div>
              <div className="text-sm font-bold text-foreground">
                Want to build and test your practical skills like {student.name}?
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Solve realistic engineering tickets with automatic code execution and grading.
              </p>
            </div>

            <a
              href={`/auth?redirect=/student/lab/${lab.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-95 shadow-md shrink-0 transition-transform active:scale-95"
            >
              Start Free Practical Lab
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

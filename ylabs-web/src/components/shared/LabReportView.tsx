import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Activity, Cpu, Gauge, CheckCircle2, XCircle, AlertTriangle, Code2,
  Sparkles, Timer, RefreshCcw, HelpCircle, BookOpen, Zap, TrendingUp, Layers,
  Ticket, LayoutDashboard, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { type AdminLab } from "@/lib/adminLabs";
import { type LabSprint } from "@/lib/labSprints";

export interface LabReportViewProps {
  realLab: AdminLab | null;
  realSprints: LabSprint[];
  statusOverrides: Record<string, { status: string, earnedXp: number, minutes: number, percentage: number }>;
  slug: string;
  backLinkTo: any;
  backLinkParams?: any;
  loading: boolean;
  adminUserId?: string;
}

export function LabReportView({ realLab, realSprints, statusOverrides, slug, backLinkTo, backLinkParams, loading, adminUserId }: LabReportViewProps) {
  const [activeTab, setActiveTab] = useState<"lab" | "sprint" | "ticket">("lab");

  const allTickets = useMemo(() => {
    if (!realLab) return [];
    return realSprints.flatMap((s) => 
      s.tasks.map((t) => {
        const override = statusOverrides[t.id];
        const pct = override?.percentage ?? 0;
        const maxXp = t.xp || 0;
        const eXp = override?.earnedXp > 0
          ? override.earnedXp
          : Math.round((pct / 100) * maxXp);
        const minutesInt = override?.minutes ?? 0;
        const formattedTime = minutesInt > 0 ? `${minutesInt}m` : "-";

        return {
          id: t.id,
          title: t.title,
          difficulty: t.difficulty,
          estMin: t.estMin,
          xp: maxXp,
          sprintName: s.name,
          status: override?.status ?? "backlog",
          earnedXp: eXp,
          percentage: pct,
          minutes: formattedTime,
        };
      })
    );
  }, [realLab, realSprints, statusOverrides]);

  const attemptedTickets = useMemo(() => {
    return allTickets.filter(t => t.status !== "backlog");
  }, [allTickets]);

  const sprintReports = useMemo(() => {
    return realSprints.map(s => {
      const tickets = s.tasks.map(t => {
        const override = statusOverrides[t.id];
        const pct = override?.percentage ?? 0;
        const maxXp = t.xp || 0;
        const eXp = override?.earnedXp > 0
          ? override.earnedXp
          : Math.round((pct / 100) * maxXp);
        return { 
          id: t.id, 
          status: override?.status ?? "backlog",
          earnedXp: eXp,
          xp: maxXp
        };
      });
      const done = tickets.filter(t => t.status === "done").length;
      const inProg = tickets.some(t => t.status === "in_progress" || t.status === "in_review");
      
      const totalMaxXp = tickets.reduce((a, t) => a + t.xp, 0);
      const totalEarnedXp = tickets.reduce((a, t) => a + t.earnedXp, 0);
      const score = totalMaxXp > 0 ? Math.round((totalEarnedXp / totalMaxXp) * 100) : 0;
      
      const status = done === tickets.length && tickets.length ? "Completed" : (inProg || done > 0) ? "In Progress" : "Not Started";
      const estMin = s.tasks.reduce((a, t) => a + (t.estMin || 0), 0);
      const time = Math.round(estMin / 60) + "h " + (estMin % 60) + "m";
      return {
        id: s.id,
        name: s.name,
        score,
        tickets: done,
        time,
        status,
        efficiency: score >= 80 ? "Optimal" : score >= 50 ? "Sub-optimal" : "Needs Review"
      };
    });
  }, [realSprints, statusOverrides]);

  if (loading || !realLab) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link to={backLinkTo} params={backLinkParams} className="hover:text-foreground">
            Practical Labs
          </Link>{" "}
          › <span>Report Dashboard</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Telemetry & Analysis Report</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Deep-dive metrics on your algorithmic efficiency, behavioral grit, and code quality.
            </p>
          </div>
          <Link
            to={backLinkTo}
            params={backLinkParams}
            className="rounded-md border bg-card px-4 py-2 text-sm hover:bg-accent flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lab
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border pt-4 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab("lab")}
          className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === "lab"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" /> Overall Lab Report
        </button>
        <button
          onClick={() => setActiveTab("sprint")}
          className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === "sprint"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="h-4 w-4" /> Sprint-wise Breakdown
        </button>
        <button
          onClick={() => setActiveTab("ticket")}
          className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === "ticket"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Ticket className="h-4 w-4" /> Ticket-wise Breakdown
        </button>
      </div>

      {/* Content Rendering */}
      <div className="pt-2">
        {loading ? (
          <div className="py-12 flex justify-center text-muted-foreground"><Loader2 className="animate-spin h-6 w-6" /></div>
        ) : (
          <>
            {activeTab === "lab" && <LabOverallView lab={realLab} tickets={allTickets} />}
            {activeTab === "sprint" && <SprintWiseView sprints={sprintReports} />}
            {activeTab === "ticket" && <TicketWiseView tickets={attemptedTickets} slug={slug} adminUserId={adminUserId} />}
          </>
        )}
      </div>
    </main>
  );
}

// ============================================================================
// 1. LAB OVERALL VIEW
// ============================================================================
function LabOverallView({ lab, tickets }: { lab: AdminLab | null, tickets: any[] }) {
  const done = tickets.filter(t => t.status === "done").length;
  const inProg = tickets.filter(t => t.status === "in_progress" || t.status === "in_review").length;
  const pct = tickets.length > 0 ? Math.round((done / tickets.length) * 100) : 0;
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-gradient-to-br from-success/20 via-card to-card p-5">
          <div className="flex items-center gap-2 text-success font-medium text-sm mb-3">
            <CheckCircle2 className="h-4 w-4" /> Execution Status
          </div>
          <div className="text-2xl font-bold">{done} Tickets</div>
          <div className="text-xs text-muted-foreground mt-1">Successfully completed</div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-3">
            <Timer className="h-4 w-4 text-warning" /> In Progress
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold font-mono">{inProg} Tickets</div>
          </div>
          <div className="text-xs text-warning mt-1">Currently being worked on</div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-3">
            <Cpu className="h-4 w-4 text-info" /> Total YP
          </div>
          <div className="text-2xl font-bold font-mono">
            {tickets.reduce((acc, t) => acc + (t.earnedXp || 0), 0)}
          </div>
          <div className="text-xs text-success mt-1">Earned in this lab</div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm mb-3">
            <Gauge className="h-4 w-4 text-primary" /> Overall Completion
          </div>
          <div className="text-2xl font-bold text-primary">{pct}%</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Lab progression</div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        <LayoutDashboard className="h-10 w-10 mx-auto mb-4 opacity-50 text-primary" />
        <h3 className="text-lg font-medium text-foreground">Detailed Insights Available Per Ticket</h3>
        <p className="mt-2 max-w-md mx-auto text-sm">
          Deep-dive algorithmic efficiency, time-to-solve velocity, test case archetypes, and AI code reviews have been moved down to the individual ticket level. 
          Navigate to the <strong>Ticket-wise Breakdown</strong> tab and expand a ticket to view its specific telemetry.
        </p>
      </section>
    </div>
  );
}

// ============================================================================
// 2. SPRINT-WISE VIEW
// ============================================================================
function SprintWiseView({ sprints }: { sprints: any[] }) {
  if (sprints.length === 0) {
    return <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border">No sprints found.</div>;
  }
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sprints.map((sprint) => (
          <div key={sprint.id} className="border rounded-xl bg-card p-5 flex flex-col hover:border-primary/50 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">{sprint.name}</h3>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                sprint.status === "Completed" ? "bg-success/10 text-success" 
                : sprint.status === "In Progress" ? "bg-info/10 text-info" 
                : "bg-muted text-muted-foreground"
              }`}>
                {sprint.status}
              </span>
            </div>
            
            <div className="mb-4 flex-1">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Sprint Score</span> 
                <span className={`font-semibold ${sprint.score > 0 ? "text-primary" : "text-muted-foreground"}`}>{sprint.score}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${sprint.score}%` }} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {sprint.tickets} tickets completed
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-4 border-t border-border/50">
              <div>
                <span className="text-muted-foreground flex items-center gap-1 mb-1"><Timer className="h-3 w-3"/> Time</span>
                <span className="font-medium">{sprint.time}</span>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1 mb-1"><Activity className="h-3 w-3"/> Efficiency</span>
                <span className={`font-medium ${
                  sprint.efficiency === 'Optimal' ? 'text-success' : 
                  sprint.efficiency === 'Sub-optimal' ? 'text-warning' : 
                  sprint.efficiency === 'Needs Review' ? 'text-destructive' : 'text-muted-foreground'
                }`}>{sprint.efficiency}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 3. TICKET-WISE VIEW
// ============================================================================
function TicketWiseView({ tickets, slug, adminUserId }: { tickets: any[], slug: string, adminUserId?: string }) {
  const navigate = useNavigate();

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border">
        You haven't attempted any tickets in this lab yet.
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-muted/30 text-xs text-muted-foreground border-b border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium">Ticket Title</th>
                <th className="px-4 py-3 font-medium">Sprint</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Complexity</th>
                <th className="px-4 py-3 font-medium text-right">Score</th>
                <th className="px-4 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tickets.map((t) => (
                <tr 
                  key={t.id}
                  onClick={() => {
                    if (adminUserId) {
                      (navigate as any)({ to: `/admin/student-report/$userId/$labId/ticket/$ticketId/review`, params: { userId: adminUserId, labId: slug, ticketId: String(t.id) }, search: { from: 'report' } })
                    } else {
                      (navigate as any)({ to: `/student/lab/$slug/ticket/$ticketId/review`, params: { slug, ticketId: String(t.id) }, search: { from: 'report' } })
                    }
                  }}
                  className="hover:bg-muted/10 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    {t.title}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.sprintName}</td>
                  <td className="px-4 py-3">
                    {t.status === "done" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Pass
                      </span>
                    ) : t.status === "in_review" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                        <HelpCircle className="h-3 w-3" /> In Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-info bg-info/10 px-2 py-0.5 rounded-full">
                        <Timer className="h-3 w-3" /> In Progress
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">O({t.difficulty === "HARD" ? "N^2" : "N"})</td>
                  <td className="px-4 py-3 font-medium text-right text-primary">{t.status === "done" ? `${t.earnedXp}/${t.xp} YP` : `-/${t.xp} YP`}</td>
                  <td className="px-4 py-3 text-right">
                    <ArrowRight className="h-4 w-4 inline-block text-muted-foreground group-hover:text-foreground transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



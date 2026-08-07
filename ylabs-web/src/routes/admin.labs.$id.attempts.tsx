import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell, Badge, KpiCard } from "@/components/admin/AdminShell";
import { DiffViewer } from "@/components/admin/DiffViewer";
import { loadLabs, type AdminLab } from "@/lib/adminLabs";
import { getLabAttempts, type LabAttemptUser, type AttemptSprint, type AttemptTicket } from "@/lib/labAttempts";
import { ChevronLeft, ChevronRight, Users, GitBranch, Ticket as TicketIcon, Clock, Zap, Award } from "lucide-react";

export const Route = createFileRoute("/admin/labs/$id/attempts")({
  head: () => ({
    meta: [
      { title: "Lab attempts — Yuvro Labs Admin" },
      { name: "description", content: "Review learners who attempted a lab, their sprints, tickets and submitted code diffs." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AttemptsPage,
});

function AttemptsPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [lab, setLab] = useState<AdminLab | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [users, setUsers] = useState<LabAttemptUser[]>([]);

  useEffect(() => {
    const run = async () => {
      const labs = await loadLabs();
      const loadedLab = labs.find((l) => l.id === id) ?? null;
      setLab(loadedLab);
      if (loadedLab) {
        const loadedUsers = await getLabAttempts(
          loadedLab.id,
          loadedLab.title,
          loadedLab.type === "database" ? "sql" : "ts"
        );
        setUsers(loadedUsers);
      }
    };
    run();
  }, [id]);

  const user = users.find(u => u.id === userId) ?? null;
  const sprint = user?.sprints.find(s => s.id === sprintId) ?? null;
  const ticket = sprint?.tickets.find(t => t.id === ticketId) ?? null;

  const filtered = users.filter(u => !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.includes(q.toLowerCase()));
  const completed = users.filter(u => u.status === "Completed").length;
  const avg = users.length ? Math.round(users.reduce((a, u) => a + u.progressPct, 0) / users.length) : 0;

  return (
    <AdminShell
      title={lab ? `${lab.title} — attempts` : "Lab attempts"}
      breadcrumb={["Engineering", "Labs", "Attempts"]}
      right={<Link to="/admin/labs" className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent inline-flex items-center gap-1"><ChevronLeft className="h-3.5 w-3.5" /> Back to labs</Link>}
    >
      {/* Breadcrumb trail */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
        <button onClick={() => { setUserId(null); setSprintId(null); setTicketId(null); }} className={`px-2 py-1 rounded ${!user ? "bg-accent font-medium" : "hover:bg-accent text-muted-foreground"}`}>Users</button>
        {user && <><ChevronRight className="h-3 w-3 text-muted-foreground" />
          <button onClick={() => { setSprintId(null); setTicketId(null); }} className={`px-2 py-1 rounded ${!sprint ? "bg-accent font-medium" : "hover:bg-accent text-muted-foreground"}`}>{user.name}</button></>}
        {sprint && <><ChevronRight className="h-3 w-3 text-muted-foreground" />
          <button onClick={() => setTicketId(null)} className={`px-2 py-1 rounded ${!ticket ? "bg-accent font-medium" : "hover:bg-accent text-muted-foreground"}`}>{sprint.name}</button></>}
        {ticket && <><ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="px-2 py-1 rounded bg-accent font-medium">{ticket.id} · {ticket.title}</span></>}
      </div>

      {!user && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Learners attempted" value={users.length} color="primary" icon={Users} />
            <KpiCard label="Completed lab" value={completed} color="success" />
            <KpiCard label="Avg completion" value={`${avg}%`} color="warning" />
            <KpiCard label="Sprints in lab" value={users[0]?.sprints.length ?? 0} color="ui" icon={GitBranch} />
          </div>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search learners…" className="mb-3 text-xs px-3 py-1.5 rounded-md border border-border bg-transparent w-64" />
          <Table head={["Learner", "Cohort", "Status", "Progress", "XP", "Last active", ""]}>
            {filtered.map(u => (
              <tr key={u.id} className="border-t border-border/40 hover:bg-accent/30 cursor-pointer" onClick={() => setUserId(u.id)}>
                <td className="px-4 py-2.5">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-[11px] text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.cohort}</td>
                <td className="px-4 py-2.5"><Badge tone={u.status === "Completed" ? "success" : u.status === "Dropped" ? "destructive" : "warning"}>{u.status}</Badge></td>
                <td className="px-4 py-2.5 w-40">
                  <Bar pct={u.progressPct} />
                </td>
                <td className="px-4 py-2.5 text-xs">{u.xp}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.lastActive}</td>
                <td className="px-4 py-2.5 text-xs text-primary">View →</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">No learners match.</td></tr>}
          </Table>
        </>
      )}

      {user && !sprint && (
        <div className="grid gap-3 md:grid-cols-2">
          {user.sprints.map(s => (
            <button key={s.id} onClick={() => setSprintId(s.id)} className="text-left rounded-xl border border-border/60 bg-card/40 p-4 hover:bg-accent/30">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{s.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{s.tickets.length} tickets</span>
              </div>
              <div className="mt-3"><Bar pct={s.progressPct} /></div>
              <div className="mt-2 text-[11px] text-muted-foreground">{s.progressPct}% completed</div>
            </button>
          ))}
        </div>
      )}

      {sprint && !ticket && (
        <Table head={["Ticket", "Status", "Score", "Time", "XP", "Submitted", ""]}>
          {sprint.tickets.map(t => (
            <tr key={t.id} className="border-t border-border/40 hover:bg-accent/30 cursor-pointer" onClick={() => setTicketId(t.id)}>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2"><TicketIcon className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono text-[11px] text-muted-foreground">{t.id}</span><span className="font-medium">{t.title}</span></div>
              </td>
              <td className="px-4 py-2.5"><Badge tone={t.status === "Completed" ? "success" : t.status === "Failed" ? "destructive" : "warning"}>{t.status}</Badge></td>
              <td className="px-4 py-2.5 text-xs">{t.score}/100</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.timeMin}m</td>
              <td className="px-4 py-2.5 text-xs">{t.xp}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.submittedAt}</td>
              <td className="px-4 py-2.5 text-xs text-primary">View diff →</td>
            </tr>
          ))}
        </Table>
      )}

      {ticket && user && sprint && (
        <TicketDiff ticket={ticket} user={user} sprint={sprint} />
      )}
    </AdminShell>
  );
}

function TicketDiff({ ticket, user, sprint }: { ticket: AttemptTicket; user: LabAttemptUser; sprint: AttemptSprint }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-[11px] text-muted-foreground font-mono">{ticket.id} · {sprint.name}</div>
            <h2 className="text-lg font-semibold">{ticket.title}</h2>
            <div className="text-xs text-muted-foreground mt-0.5">Submitted by {user.name} · {ticket.submittedAt}</div>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <Badge tone={ticket.status === "Completed" ? "success" : ticket.status === "Failed" ? "destructive" : "warning"}>{ticket.status}</Badge>
            <span className="inline-flex items-center gap-1"><Award className="h-3.5 w-3.5 text-warning" />{ticket.score}/100</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{ticket.timeMin}m</span>
            <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-primary" />{ticket.xp} XP</span>
          </div>
        </div>
      </div>
      <DiffViewer files={ticket.files} />
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
      <div className={`h-full ${pct === 100 ? "bg-success" : pct < 25 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
            <tr>{head.map((h, i) => <th key={i} className="text-left font-medium px-4 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCollab } from "@/lib/collab/store";
import { ArrowLeft, Save } from "lucide-react";

export const Route = createFileRoute("/collaboration/sprint/$id/ticket/$ticketId")({ component: TicketWorkspace });

function TicketWorkspace() {
  const { id, ticketId } = Route.useParams();
  const { sprints, tickets, prs, updateTicket, addCommit, raisePR, mergePR, pushPRCommit, setPRStatus } = useCollab();
  const sprint = sprints.find(s => s.id === id);
  const ticket = tickets[id]?.find(t => t.id === ticketId);
  const [tab, setTab] = useState<"problem" | "dev" | "pr">("problem");
  const [code, setCode] = useState(ticket?.starter ?? "");
  const [output, setOutput] = useState<string | null>(null);
  const [commitMsg, setCommitMsg] = useState("");
  const [prTitle, setPrTitle] = useState(`Fix: ${ticket?.title ?? ""}`);
  const [prDesc, setPrDesc] = useState("");
  const [showPRForm, setShowPRForm] = useState(false);

  if (!sprint || !ticket) return <main className="p-10 text-center text-muted-foreground">Ticket not found.</main>;
  const pr = ticket.prId ? prs[id]?.find(p => p.id === ticket.prId) : null;
  const blocker = ticket.dependsOnTicketId ? tickets[id]?.find(t => t.id === ticket.dependsOnTicketId) : null;

  return (
    <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2 flex-wrap">
        <Link to="/collaboration" className="hover:text-foreground">Collaboration Hub</Link> <span>›</span>
        <Link to="/collaboration/sprint/$id/workspace" params={{ id: sprint.id }} className="hover:text-foreground">{sprint.title}</Link> <span>›</span>
        <span>#{ticket.id.split("-").pop()}</span>
      </div>

      <Link to="/collaboration/sprint/$id/workspace" params={{ id: sprint.id }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-3 w-3" /> Back to board</Link>

      <h1 className="text-2xl font-semibold">{ticket.title}</h1>
      <div className="flex items-center gap-2 mt-2 text-xs">
        <span className="px-1.5 py-0.5 rounded bg-accent">{ticket.role}</span>
        <span className="px-1.5 py-0.5 rounded bg-accent">{ticket.difficulty}</span>
        <span className="text-muted-foreground">~ {ticket.commits.length} commits</span>
      </div>

      {blocker && blocker.status === "Completed" && (
        <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 text-warning text-xs p-2.5">This ticket was unlocked when {blocker.role} completed <b>{blocker.title}</b> ✓</div>
      )}

      <div className="mt-5 flex gap-1 border-b">
        {(["problem", "dev", "pr"] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {k === "problem" ? "Problem" : k === "dev" ? "Dev Environment" : "Commits & PR"}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "problem" && (
          <div className="space-y-5 max-w-3xl">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-card border rounded-lg p-4">{ticket.description}</pre>
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">Acceptance criteria</h3>
              <ul className="space-y-1 text-sm">{ticket.acceptance.map(a => <li key={a} className="flex gap-2"><input type="checkbox" disabled /> {a}</li>)}</ul>
            </div>
          </div>
        )}

        {tab === "dev" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">{ticket.language} · ticket-{ticket.id.split("-").pop()}.{ticket.language === "typescript" ? "ts" : ticket.language === "tsx" ? "tsx" : ticket.language}</span>
              <div className="flex gap-2">
                <span className="text-muted-foreground">Last saved just now</span>
                <button onClick={() => setCode(ticket.starter)} className="rounded border px-2 py-1 hover:bg-accent">Reset</button>
                <button onClick={() => setOutput("✓ All tests passed (3/3)")} className="rounded bg-primary text-primary-foreground px-3 py-1">Run Code</button>
              </div>
            </div>
            <textarea value={code} onChange={e => setCode(e.target.value)} spellCheck={false} className="w-full font-mono text-xs bg-editor-bg text-foreground border rounded-lg p-4 min-h-[360px]" />
            {output && <pre className="bg-editor-panel border rounded-lg p-3 text-xs">{output}</pre>}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">Test cases</h3>
              <div className="space-y-2 text-xs">
                {ticket.tests.length === 0 && <p className="text-muted-foreground">No automated tests for this ticket.</p>}
                {ticket.tests.map((t, i) => (
                  <div key={i} className="rounded border p-2"><div className="font-medium">{t.name}</div><div className="text-muted-foreground">Input: {t.input} · Expected: {t.expected}</div></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "pr" && (
          <div className="space-y-4 max-w-2xl">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">Commit timeline</h3>
              <ol className="space-y-2 text-sm border-l-2 border-border pl-4">
                {ticket.commits.map((c, i) => <li key={i} className="relative"><span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />{c.msg} <span className="text-muted-foreground text-xs">· {c.at}</span></li>)}
              </ol>
              <div className="mt-3 flex gap-2"><input value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="commit message" className="flex-1 px-2 py-1.5 text-xs rounded border bg-background" /><button onClick={() => { if (commitMsg.trim()) { addCommit(id, ticketId, commitMsg.trim()); setCommitMsg(""); } }} className="rounded bg-primary text-primary-foreground px-3 text-xs">Save Commit</button></div>
            </div>

            {!pr && ticket.commits.length > 0 && !showPRForm && (
              <button onClick={() => setShowPRForm(true)} className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">Raise PR</button>
            )}
            {!pr && showPRForm && (
              <div className="rounded-lg border bg-card p-4 space-y-2">
                <input value={prTitle} onChange={e => setPrTitle(e.target.value)} className="w-full px-2 py-1.5 text-sm rounded border bg-background" />
                <textarea value={prDesc} onChange={e => setPrDesc(e.target.value)} rows={3} placeholder="Describe what changed..." className="w-full px-2 py-1.5 text-sm rounded border bg-background" />
                <button onClick={() => { raisePR(id, ticketId, prTitle, prDesc); setShowPRForm(false); }} className="rounded bg-primary text-primary-foreground px-3 py-1.5 text-sm">Submit PR</button>
              </div>
            )}
            {pr && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{pr.title}</h3><span className="text-[10px] px-2 py-0.5 rounded bg-accent">{pr.status}</span></div>
                {pr.status === "Pending Review" && <p className="text-xs text-muted-foreground">Waiting for a teammate to review your PR.</p>}
                {pr.status === "Changes Requested" && (
                  <>
                    <p className="text-xs text-warning">{pr.overallFeedback}</p>
                    {pr.comments.map(c => <div key={c.id} className="text-xs rounded border p-2 bg-accent/30">Line {c.line}: {c.text}</div>)}
                    <div className="flex gap-2"><input value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="new commit" className="flex-1 px-2 py-1.5 text-xs rounded border bg-background" /><button onClick={() => { if (commitMsg.trim()) { pushPRCommit(id, pr.id, commitMsg.trim()); setCommitMsg(""); } }} className="rounded bg-primary text-primary-foreground px-3 text-xs">Push Update</button></div>
                    <button onClick={() => setPRStatus(id, pr.id, "Pending Review")} className="text-xs rounded border px-3 py-1.5 hover:bg-accent">Mark as Ready</button>
                  </>
                )}
                {pr.status === "Approved" && (
                  <button onClick={() => mergePR(id, pr.id)} className="rounded bg-success text-white px-3 py-1.5 text-sm">Merge PR</button>
                )}
                {pr.status === "Merged" && <p className="text-sm text-success">✅ Ticket completed. PR merged.</p>}
                {pr.status !== "Merged" && pr.authorId !== "u-me" && (
                  <div className="flex gap-2">
                    <button onClick={() => setPRStatus(id, pr.id, "Approved")} className="rounded bg-success text-white px-3 py-1.5 text-xs">Approve</button>
                    <button onClick={() => setPRStatus(id, pr.id, "Changes Requested", "Please address review notes.")} className="rounded bg-warning text-white px-3 py-1.5 text-xs">Request Changes</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

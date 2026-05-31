import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCollab, fmtCountdown } from "@/lib/collab/store";
import { Avatar } from "@/components/collab/Avatar";
import { DOMAIN_COLORS, ME_ID, AI_ID, type PR } from "@/lib/collab/data";
import {
  ArrowLeft, Lock, Clock, CheckCircle2, GitPullRequest, Send,
  MessagesSquare, ListChecks, Workflow, X, MessageSquarePlus,
} from "lucide-react";

export const Route = createFileRoute("/collaboration/sprint/$id/workspace")({ component: Workspace });

function Workspace() {
  const { id } = Route.useParams();
  const { sprints, tickets, prs, messages, user, sendMessage, submitSprint } = useCollab();
  const sprint = sprints.find(s => s.id === id);
  const [tab, setTab] = useState<"tickets" | "team" | "pr" | "disc">("tickets");
  const [openPR, setOpenPR] = useState<string | null>(null);

  // client-only countdown to avoid SSR hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!sprint) return <main className="p-10 text-center text-muted-foreground">Sprint not found.</main>;
  const myMember = sprint.members.find(m => m.userId === ME_ID);
  if (!myMember) return (
    <main className="p-10 text-center max-w-md mx-auto">
      <p className="text-sm text-muted-foreground mb-4">You are not a member of this sprint team.</p>
      <Link to="/collaboration/browse" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm">Browse Sprints</Link>
    </main>
  );

  const sTickets = tickets[sprint.id] ?? [];
  const myTickets = sTickets.filter(t => t.assigneeId === ME_ID);
  const sPRs = prs[sprint.id] ?? [];
  const cd = fmtCountdown(sprint.deadlineAt);
  const done = sTickets.filter(t => t.status === "Completed").length;
  const allDone = done === sTickets.length;
  const pct = sTickets.length ? Math.round((done / sTickets.length) * 100) : 0;

  return (
    <main className="mx-auto max-w-[1400px]">
      <header className="px-4 sm:px-6 py-3 border-b bg-card/40 sticky top-14 z-30">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/collaboration/sprint/$id" params={{ id: sprint.id }} className="grid h-7 w-7 place-items-center rounded hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
            <div className="min-w-0">
              <h1 className="font-semibold truncate">{sprint.title}</h1>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${DOMAIN_COLORS[sprint.domain]}`}>{sprint.domain}</span>
            </div>
          </div>
          <div suppressHydrationWarning className={`font-mono text-base sm:text-lg ${mounted && cd.tone === "destructive" ? "text-destructive animate-pulse" : mounted && cd.tone === "warning" ? "text-warning" : "text-foreground"}`}>
            {mounted ? cd.text : "—"}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {sprint.members.slice(0, 6).map((m, i) => (
                <span key={i} title={m.status === "ai" ? "AI Member" : user(m.userId ?? undefined)?.name ?? "Open"}>
                  <Avatar userId={m.userId} ai={m.status === "ai"} size={28} showStatus={m.status === "joined"} />
                </span>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{done}/{sTickets.length} done</div>
          <button disabled={!allDone || sprint.status === "Completed"} onClick={() => submitSprint(sprint.id)} className="rounded-md bg-success text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed" title={!allDone ? "Complete all tickets to unlock" : ""}>
            {sprint.status === "Completed" ? "Submitted ✓" : "Submit Sprint"}
          </button>
        </div>

        <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto">
          {([["tickets", ListChecks, "My Tickets"], ["team", Workflow, "Team Overview"], ["pr", GitPullRequest, "Pull Requests"], ["disc", MessagesSquare, "Discussions"]] as const).map(([k, Ico, label]) => (
            <button key={k} onClick={() => setTab(k as any)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md whitespace-nowrap ${tab === k ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"}`}>
              <Ico className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 sm:px-6 py-6">
        {tab === "tickets" && (
          <div className="grid md:grid-cols-3 gap-4">
            {(["Not Started", "In Progress", "Completed"] as const).map(col => {
              const list = myTickets.filter(t => t.status === col);
              const accent = col === "Not Started" ? "border-muted-foreground/30" : col === "In Progress" ? "border-info/40" : "border-success/40";
              return (
                <div key={col} className={`rounded-xl border bg-card p-3 border-t-4 ${accent}`}>
                  <div className="flex items-center justify-between mb-2 text-xs"><span className="font-semibold">{col}</span><span className="text-muted-foreground">{list.length}</span></div>
                  <div className="space-y-2">
                    {list.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Nothing here.</p>}
                    {list.map(t => {
                      const blocker = t.dependsOnTicketId ? sTickets.find(x => x.id === t.dependsOnTicketId) : null;
                      const locked = blocker && blocker.status !== "Completed";
                      return (
                        <Link key={t.id} to="/collaboration/sprint/$id/ticket/$ticketId" params={{ id: sprint.id, ticketId: t.id }} className={`block rounded-lg border p-3 hover:border-primary/40 ${locked ? "opacity-60" : ""}`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">#{t.id.split("-").pop()}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent">{t.points} pts</span>
                          </div>
                          <p className="text-sm font-medium mt-1">{t.title}</p>
                          <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-accent">{t.difficulty}</span>
                            {col === "In Progress" && <span className="text-info flex items-center gap-0.5"><Clock className="h-3 w-3" /> active</span>}
                            {col === "Completed" && <CheckCircle2 className="h-3 w-3 text-success" />}
                          </div>
                          {locked && (
                            <div className="mt-2 text-[10px] text-warning flex items-center gap-1" title={`Blocked by ${blocker?.role}: ${blocker?.title}`}><Lock className="h-3 w-3" /> Waiting for {blocker?.role} — {blocker?.title}</div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "team" && (
          <div className="space-y-5">
            {sprint.requiredRoles.map(role => {
              const roleTickets = sTickets.filter(t => t.role === role);
              const roleDone = roleTickets.filter(t => t.status === "Completed").length;
              const member = sprint.members.find(m => m.role === role);
              return (
                <details key={role} open className="rounded-xl border bg-card">
                  <summary className="p-3 flex items-center gap-2 cursor-pointer">
                    <Avatar userId={member?.userId} ai={member?.status === "ai"} size={28} />
                    <div className="flex-1"><div className="text-sm font-semibold">{role}</div><div className="text-[10px] text-muted-foreground">{member?.status === "ai" ? "AI Member" : user(member?.userId)?.name ?? "Open"}</div></div>
                    <span className="text-xs text-muted-foreground">{roleDone}/{roleTickets.length} done</span>
                  </summary>
                  <div className="border-t divide-y">
                    {roleTickets.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2.5 text-sm">
                        <span>{t.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.status === "Completed" ? "bg-success/15 text-success" : t.status === "In Progress" ? "bg-info/15 text-info" : "bg-muted text-muted-foreground"}`}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}

            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-4">Dependency Chain</h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {(["SQL", "Backend", "Frontend", "QA", "DevOps"] as const).map((r, i, arr) => {
                  const rTickets = sTickets.filter(t => t.role === r);
                  const rDone = rTickets.filter(t => t.status === "Completed").length;
                  const complete = rDone === rTickets.length && rTickets.length > 0;
                  return (
                    <div key={r} className="flex items-center gap-2 shrink-0">
                      <div className={`px-3 py-2 rounded-lg border text-xs text-center ${complete ? "border-success/40 bg-success/10" : rDone > 0 ? "border-info/40 bg-info/10" : "border-muted-foreground/30"}`}>
                        <div className="font-semibold">{r}</div>
                        <div className="text-[10px] text-muted-foreground">{rDone}/{rTickets.length}</div>
                      </div>
                      {i < arr.length - 1 && <div className={`w-8 border-t-2 ${complete ? "border-success border-solid" : "border-muted-foreground/30 border-dashed"}`} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "pr" && (
          <div className="rounded-xl border bg-card divide-y">
            {sPRs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No pull requests yet.</p>}
            {sPRs.map(pr => {
              const a = user(pr.authorId);
              const tone = pr.status === "Merged" ? "bg-muted text-muted-foreground" : pr.status === "Approved" ? "bg-success/15 text-success" : pr.status === "Changes Requested" ? "bg-warning/15 text-warning" : "bg-info/15 text-info";
              return (
                <div key={pr.id} className="flex items-center gap-3 p-3 hover:bg-accent/30">
                  <Avatar userId={pr.authorId} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="text-[10px] font-mono text-muted-foreground">{pr.ticketId.split("-").pop()}</span><p className="text-sm font-medium truncate">{pr.title}</p></div>
                    <p className="text-[11px] text-muted-foreground">{a?.name} · {pr.raisedAt}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${tone}`}>{pr.status}</span>
                  <button onClick={() => setOpenPR(pr.id)} className="text-xs rounded-md border px-2.5 py-1 hover:bg-accent">Review</button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "disc" && <Discussions sprintId={sprint.id} teamUserIds={sprint.members.map(m => m.userId).filter(Boolean) as string[]} ticketIds={sTickets.map(t => t.id)} />}
      </div>

      {openPR && <PRDrawer pr={sPRs.find(p => p.id === openPR)!} sprintId={sprint.id} onClose={() => setOpenPR(null)} />}
    </main>
  );
}

// ---------- Discussions (sub-tabs) ----------

function Discussions({ sprintId, teamUserIds, ticketIds }: { sprintId: string; teamUserIds: string[]; ticketIds: string[] }) {
  const [sub, setSub] = useState<"chat" | "forum">("chat");
  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b">
        {(["chat", "forum"] as const).map(k => (
          <button key={k} onClick={() => setSub(k)} className={`px-3 py-2 text-xs border-b-2 -mb-px ${sub === k ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {k === "chat" ? "Team Channel (Private)" : "Sprint Forum (Public)"}
          </button>
        ))}
      </div>
      {sub === "chat" ? <TeamChannel sprintId={sprintId} teamUserIds={teamUserIds} ticketIds={ticketIds} /> : <ForumPane sprintId={sprintId} />}
    </div>
  );
}

function TeamChannel({ sprintId, teamUserIds, ticketIds }: { sprintId: string; teamUserIds: string[]; ticketIds: string[] }) {
  const { messages, user, sendMessage } = useCollab();
  const sMsgs = messages[sprintId] ?? [];
  const [draft, setDraft] = useState("");
  const [suggest, setSuggest] = useState<{ kind: "@" | "#"; items: string[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [sMsgs.length]);

  const onDraft = (v: string) => {
    setDraft(v);
    const m = v.match(/(^|\s)([@#])(\w*)$/);
    if (!m) return setSuggest(null);
    const [, , sigil, q] = m;
    const ql = q.toLowerCase();
    if (sigil === "@") {
      const items = teamUserIds.map(id => user(id)?.name).filter((n): n is string => !!n && n.toLowerCase().includes(ql)).slice(0, 5);
      setSuggest({ kind: "@", items });
    } else {
      const items = ticketIds.filter(t => t.toLowerCase().includes(ql)).slice(0, 5);
      setSuggest({ kind: "#", items });
    }
  };

  const pick = (val: string) => {
    setDraft(d => d.replace(/([@#])\w*$/, `$1${val} `));
    setSuggest(null);
  };

  const submit = () => {
    if (!draft.trim()) return;
    sendMessage(sprintId, draft.trim());
    setDraft("");
    setSuggest(null);
  };

  return (
    <div className="rounded-xl border bg-card flex flex-col h-[60vh]">
      <div className="p-3 border-b text-sm font-semibold flex items-center gap-2"><MessagesSquare className="h-4 w-4 text-primary" /> Team Channel</div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {sMsgs.map(m => {
          const isAI = m.authorId === AI_ID;
          const a = user(m.authorId);
          return (
            <div key={m.id} className="flex gap-2">
              <Avatar userId={m.authorId} ai={isAI} size={28} />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-xs"><span className="font-medium">{isAI ? "AI Member" : a?.name}</span><span className="text-muted-foreground">· {m.at}</span></div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">{renderMentions(m.text)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t relative">
        {suggest && suggest.items.length > 0 && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-md border bg-popover shadow-lg max-h-40 overflow-auto">
            {suggest.items.map(it => (
              <button key={it} onClick={() => pick(it)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent">{suggest.kind}{it}</button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => onDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === "Escape") setSuggest(null); }}
            placeholder="Message team... type @ to mention, # for ticket"
            className="flex-1 px-3 py-2 text-sm rounded-md border bg-background"
          />
          <button onClick={submit} className="rounded-md bg-primary text-primary-foreground px-3 grid place-items-center"><Send className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function renderMentions(text: string) {
  const parts = text.split(/(\s)/);
  return parts.map((p, i) => {
    if (p.startsWith("@")) return <span key={i} className="text-primary font-medium">{p}</span>;
    if (p.startsWith("#")) return <span key={i} className="text-info font-medium">{p}</span>;
    return <span key={i}>{p}</span>;
  });
}

// ---------- Forum ----------

function ForumPane({ sprintId }: { sprintId: string }) {
  const { forum, user, addThread, upvoteThread, replyThread } = useCollab();
  const threads = forum[sprintId] ?? [];
  const [newOpen, setNewOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<"Question" | "Discussion" | "Help" | "Tip">("Question");
  const [reply, setReply] = useState("");

  const open = threads.find(t => t.id === openId);

  return (
    <div className="rounded-xl border bg-card flex flex-col h-[60vh]">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-2"><MessageSquarePlus className="h-4 w-4 text-primary" /> Sprint Forum</span>
        <button onClick={() => setNewOpen(v => !v)} className="text-xs rounded-md bg-primary text-primary-foreground px-2 py-1">New Thread +</button>
      </div>
      {newOpen && (
        <div className="p-3 border-b space-y-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full px-2 py-1.5 text-xs rounded border bg-background" />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Body" rows={3} className="w-full px-2 py-1.5 text-xs rounded border bg-background" />
          <div className="flex gap-2">
            <select value={tag} onChange={e => setTag(e.target.value as any)} className="text-xs rounded border bg-background px-2 py-1"><option>Question</option><option>Discussion</option><option>Help</option><option>Tip</option></select>
            <button onClick={() => { if (title.trim()) { addThread(sprintId, title, body, tag); setTitle(""); setBody(""); setNewOpen(false); } }} className="text-xs rounded bg-primary text-primary-foreground px-3 py-1">Post</button>
          </div>
        </div>
      )}
      {open ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <button onClick={() => setOpenId(null)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back to threads</button>
          <div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wider">{open.tag}</span>
            <h3 className="text-base font-semibold mt-1">{open.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{user(open.authorId)?.name} · {open.at}</p>
            <p className="text-sm mt-2 whitespace-pre-wrap">{open.body}</p>
          </div>
          <div className="border-t pt-3 space-y-2">
            {open.replies.map(r => (
              <div key={r.id} className="flex gap-2">
                <Avatar userId={r.authorId} size={24} />
                <div className="flex-1 rounded-md bg-accent/40 p-2">
                  <div className="text-[11px] text-muted-foreground">{user(r.authorId)?.name} · {r.at}</div>
                  <p className="text-sm">{r.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply..." className="flex-1 px-2 py-1.5 text-xs rounded border bg-background" />
            <button onClick={() => { if (reply.trim()) { replyThread(sprintId, open.id, reply.trim()); setReply(""); } }} className="text-xs rounded bg-primary text-primary-foreground px-3">Reply</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y">
          {threads.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No threads yet — start one.</p>}
          {threads.map(t => (
            <button key={t.id} onClick={() => setOpenId(t.id)} className="block w-full text-left p-3 hover:bg-accent/30">
              <div className="flex items-center gap-1.5 text-[10px] mb-1"><span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase tracking-wider">{t.tag}</span><span className="text-muted-foreground">{t.replies.length} replies · {t.at}</span></div>
              <p className="text-sm font-medium">{t.title}</p>
              <div className="mt-1.5 flex items-center gap-2 text-[11px]"><Avatar userId={t.authorId} size={16} /><span>{user(t.authorId)?.name}</span><span onClick={e => { e.stopPropagation(); upvoteThread(sprintId, t.id); }} className="ml-auto text-muted-foreground hover:text-primary cursor-pointer">▲ {t.upvotes}</span></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- PR Detail Drawer ----------

function PRDrawer({ pr, sprintId, onClose }: { pr: PR; sprintId: string; onClose: () => void }) {
  const { user, addPRComment, setPRStatus, pushPRCommit, mergePR } = useCollab();
  const [view, setView] = useState<"unified" | "split">("unified");
  const [commentLine, setCommentLine] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [commit, setCommit] = useState("");
  const isAuthor = pr.authorId === ME_ID;
  const tone = pr.status === "Merged" ? "bg-muted text-muted-foreground" : pr.status === "Approved" ? "bg-success/15 text-success" : pr.status === "Changes Requested" ? "bg-warning/15 text-warning" : "bg-info/15 text-info";

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[640px] bg-card border-l overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><GitPullRequest className="h-4 w-4 text-primary" /><h3 className="font-semibold truncate">{pr.title}</h3></div>
            <p className="text-xs text-muted-foreground">{user(pr.authorId)?.name} · {pr.raisedAt} · #{pr.ticketId.split("-").pop()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded ${tone}`}>{pr.status}</span>
            <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-accent"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {pr.description && <p className="text-sm text-muted-foreground">{pr.description}</p>}

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diff</span>
            <div className="flex gap-1 text-xs">
              <button onClick={() => setView("unified")} className={`px-2 py-0.5 rounded ${view === "unified" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>Unified</button>
              <button onClick={() => setView("split")} className={`px-2 py-0.5 rounded ${view === "split" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>Split</button>
            </div>
          </div>

          <div className="rounded-md border bg-editor-bg overflow-hidden">
            {view === "unified" ? (
              <table className="w-full text-xs font-mono">
                <tbody>
                  {pr.diff.map((d, i) => (
                    <tr key={i} onClick={() => setCommentLine(d.line)} className={`cursor-pointer ${d.type === "add" ? "bg-success/10" : d.type === "del" ? "bg-destructive/10" : ""} hover:outline hover:outline-1 hover:outline-primary/40`}>
                      <td className="px-2 py-0.5 text-muted-foreground w-10 text-right select-none">{d.line}</td>
                      <td className="px-1 w-4 text-muted-foreground select-none">{d.type === "add" ? "+" : d.type === "del" ? "−" : " "}</td>
                      <td className="px-2 py-0.5 whitespace-pre">{d.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-2 divide-x text-xs font-mono">
                <div>{pr.diff.filter(d => d.type !== "add").map((d, i) => (
                  <div key={i} className={`px-2 py-0.5 whitespace-pre ${d.type === "del" ? "bg-destructive/10" : ""}`}><span className="text-muted-foreground mr-2">{d.line}</span>{d.text}</div>
                ))}</div>
                <div>{pr.diff.filter(d => d.type !== "del").map((d, i) => (
                  <div key={i} className={`px-2 py-0.5 whitespace-pre ${d.type === "add" ? "bg-success/10" : ""}`}><span className="text-muted-foreground mr-2">{d.line}</span>{d.text}</div>
                ))}</div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comments</h4>
            {pr.comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet. Click any diff line to add one.</p>}
            {pr.comments.map(c => (
              <div key={c.id} className="rounded border p-2 bg-accent/30 text-xs space-y-1">
                <div className="flex items-center gap-1.5"><Avatar userId={c.authorId} size={18} /><span className="font-medium">{user(c.authorId)?.name}</span><span className="text-muted-foreground">on line {c.line}</span></div>
                <p>{c.text}</p>
                {c.replies.map((r, i) => (
                  <div key={i} className="ml-4 pl-2 border-l text-muted-foreground">↳ <b>{user(r.authorId)?.name}:</b> {r.text}</div>
                ))}
              </div>
            ))}
            {commentLine !== null && (
              <div className="rounded border p-2 space-y-2">
                <p className="text-[11px] text-muted-foreground">Commenting on line {commentLine}</p>
                <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={2} className="w-full text-xs rounded border bg-background p-2" placeholder="Leave a comment..." />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setCommentLine(null); setCommentText(""); }} className="text-xs rounded border px-2 py-1 hover:bg-accent">Cancel</button>
                  <button onClick={() => { if (commentText.trim()) { addPRComment(sprintId, pr.id, commentLine, commentText.trim()); setCommentText(""); setCommentLine(null); } }} className="text-xs rounded bg-primary text-primary-foreground px-3 py-1">Add comment</button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            {isAuthor ? (
              <>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Author actions</h4>
                <div className="flex gap-2">
                  <input value={commit} onChange={e => setCommit(e.target.value)} placeholder="commit message" className="flex-1 px-2 py-1.5 text-xs rounded border bg-background" />
                  <button onClick={() => { if (commit.trim()) { pushPRCommit(sprintId, pr.id, commit.trim()); setCommit(""); } }} className="text-xs rounded bg-primary text-primary-foreground px-3">Push Commit</button>
                </div>
                {pr.status === "Changes Requested" && (
                  <button onClick={() => setPRStatus(sprintId, pr.id, "Pending Review")} className="text-xs rounded border px-3 py-1.5 hover:bg-accent w-full">Mark as Ready for Re-review</button>
                )}
                {pr.status === "Approved" && (
                  <button onClick={() => mergePR(sprintId, pr.id)} className="text-xs rounded bg-success text-white px-3 py-1.5 w-full font-medium">Merge PR</button>
                )}
              </>
            ) : pr.status !== "Merged" && (
              <>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review</h4>
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={2} placeholder="Overall feedback (optional for approve)" className="w-full text-xs rounded border bg-background p-2" />
                <div className="flex gap-2">
                  <button onClick={() => { setPRStatus(sprintId, pr.id, "Approved", feedback || undefined); setFeedback(""); }} className="flex-1 text-xs rounded bg-success text-white px-3 py-1.5">Approve</button>
                  <button onClick={() => { setPRStatus(sprintId, pr.id, "Changes Requested", feedback || "Please address review notes."); setFeedback(""); }} className="flex-1 text-xs rounded bg-warning text-white px-3 py-1.5">Request Changes</button>
                </div>
              </>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Commits</h4>
            <ol className="space-y-1 text-xs border-l-2 border-border pl-3">
              {pr.commits.map((c, i) => <li key={i} className="relative"><span className="absolute -left-[15px] top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />{c.msg} <span className="text-muted-foreground">· {c.at}</span></li>)}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

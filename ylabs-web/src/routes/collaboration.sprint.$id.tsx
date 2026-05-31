import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCollab } from "@/lib/collab/store";
import { DOMAIN_COLORS, ME_ID, type RoleKey, type SprintMember } from "@/lib/collab/data";
import { Avatar, LevelBadge, RoleBadge } from "@/components/collab/Avatar";
import { CheckCircle2, Circle, X, AlertTriangle, Shuffle, Bot, MessageSquare, Users, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/collaboration/sprint/$id")({ component: SprintDetail });

function SprintDetail() {
  const { id } = Route.useParams();
  const { sprints, forum, teams, joinSprint, user } = useCollab();
  const nav = useNavigate();
  const sprint = sprints.find(s => s.id === id);
  const [joinRole, setJoinRole] = useState<RoleKey | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (!sprint) return <main className="p-10 text-center text-muted-foreground">Sprint not found.</main>;

  const myMember = sprint.members.find(m => m.userId === ME_ID);
  const isFull = sprint.requiredRoles.every(r => sprint.members.some(m => m.role === r && (m.status === "joined" || m.status === "ai")));
  const readonly = (sprint.status === "In Progress" || sprint.status === "Completed") && !myMember;
  const threads = (forum[sprint.id] ?? []).slice(0, 3);
  const recruitingTeams = teams.filter(t => t.sprintId === sprint.id && t.status === "Recruiting");

  return (
    <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 grid lg:grid-cols-[2fr_1fr] gap-6">
      <section className="space-y-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${DOMAIN_COLORS[sprint.domain]}`}>{sprint.domain}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${sprint.status === "Open" ? "bg-success/15 text-success" : sprint.status === "In Progress" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>{sprint.status}</span>
          </div>
          <h1 className="text-3xl font-semibold">{sprint.title}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{sprint.description}</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-3">Objectives</h2>
          <ul className="space-y-1.5">
            {sprint.objectives.map(o => (
              <li key={o} className="flex gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /><span>{o}</span></li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-3">Dependency Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="text-left p-2">Role</th><th className="text-left p-2">Depends On</th><th className="text-left p-2">Unlocks When</th></tr>
              </thead>
              <tbody>
                {sprint.dependencies.map(d => (
                  <tr key={d.role} className="border-t border-border/60">
                    <td className="p-2 font-medium">{d.role}</td>
                    <td className="p-2 text-muted-foreground">{d.dependsOn}</td>
                    <td className="p-2 text-muted-foreground">{d.unlocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Recruiting Teams</h2>
            {!myMember && !readonly && <button onClick={() => setCreateOpen(true)} className="text-xs rounded-md bg-primary text-primary-foreground px-2 py-1 inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Start a team</button>}
          </div>
          {recruitingTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams forming yet. Be the first to start one.</p>
          ) : (
            <div className="space-y-2">
              {recruitingTeams.map(t => (
                <div key={t.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">led by {user(t.ownerId)?.name} · {t.memberIds.length} joined</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">{t.status}</span>
                  </div>
                  {t.openRoles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.openRoles.map((r, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border bg-accent/40">Open · {r.role}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Sprint Discussion</h2>
            {myMember && <Link to="/collaboration/sprint/$id/workspace" params={{ id: sprint.id }} className="text-xs text-primary hover:underline">View all →</Link>}
          </div>
          {threads.length === 0 ? <p className="text-sm text-muted-foreground">No threads yet.</p> : (
            <div className="divide-y">
              {threads.map(t => (
                <div key={t.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">{t.tag}</span>
                    <span className="text-xs text-muted-foreground">· {t.replies.length} replies</span>
                  </div>
                  <p className="text-sm">{t.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-3">Team</h2>
          <div className="space-y-2.5">
            {sprint.requiredRoles.map(role => {
              const members = sprint.members.filter(m => m.role === role);
              if (members.length === 0) {
                return (
                  <SlotRow key={role} role={role} status="open" onJoin={() => setJoinRole(role)} disabled={readonly || !!myMember} />
                );
              }
              return members.map((m, i) => (
                <SlotRow key={`${role}-${i}`} role={role} status={m.status} userId={m.userId ?? undefined} onJoin={() => setJoinRole(role)} disabled={readonly || !!myMember} />
              ));
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-4">Sprint timer starts when your team clicks <b>Start Sprint</b>.</p>
          <p className="text-xs text-muted-foreground mt-2">Duration: <span className="text-foreground font-medium">{sprint.durationDays} days</span></p>

          <div className="mt-4 space-y-2">
            {myMember ? (
              <Link to="/collaboration/sprint/$id/workspace" params={{ id: sprint.id }} className="block w-full rounded-md bg-primary text-primary-foreground text-center px-3 py-2 text-sm font-medium hover:opacity-90">Go to Workspace</Link>
            ) : readonly ? (
              <button disabled className="w-full rounded-md border px-3 py-2 text-sm text-muted-foreground cursor-not-allowed" title="Sprint is full or in progress">View Only</button>
            ) : (
              <button onClick={() => setCreateOpen(true)} className="w-full rounded-md border px-3 py-2 text-sm hover:bg-accent">Create New Team</button>
            )}
          </div>
        </div>
      </aside>

      {joinRole && (
        <RoleConfirmModal role={joinRole} onClose={() => setJoinRole(null)} onConfirm={() => {
          joinSprint(sprint.id, joinRole);
          setJoinRole(null);
          nav({ to: "/collaboration/sprint/$id/workspace", params: { id: sprint.id } });
        }} />
      )}
      {createOpen && <CreateTeamModal sprintId={sprint.id} onClose={() => setCreateOpen(false)} />}
    </main>
  );
}

function SlotRow({ role, status, userId, onJoin, disabled }: { role: RoleKey; status: SprintMember["status"]; userId?: string; onJoin: () => void; disabled?: boolean }) {
  const { user } = useCollab();
  if (status === "open") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-2.5">
        <Circle className="h-4 w-4 text-warning" />
        <span className="text-sm flex-1"><b>{role}</b> · Open</span>
        <button onClick={onJoin} disabled={disabled} className="text-xs rounded-md bg-primary text-primary-foreground px-2 py-1 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">Join</button>
      </div>
    );
  }
  if (status === "ai") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5">
        <Avatar ai size={28} />
        <div className="flex-1"><div className="text-sm font-medium">AI Member</div><div className="text-[10px] text-warning">filling {role}</div></div>
      </div>
    );
  }
  if (status === "inactive") {
    const u = user(userId);
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/40 p-2.5 animate-pulse">
        <Avatar userId={userId} size={28} />
        <div className="flex-1"><div className="text-sm font-medium">{u?.name}</div><div className="text-[10px] text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Inactive · {role}</div></div>
      </div>
    );
  }
  const u = user(userId);
  return (
    <div className="flex items-center gap-2 rounded-lg border p-2.5">
      <Avatar userId={userId} size={28} showStatus />
      <div className="flex-1"><div className="text-sm font-medium">{u?.name}</div><div className="text-[10px] text-muted-foreground">{role}</div></div>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30">Joined</span>
    </div>
  );
}

function RoleConfirmModal({ role, onClose, onConfirm }: { role: RoleKey; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card border rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Join as</p>
            <h2 className="text-xl font-semibold">{role}</h2>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Responsibilities</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              {role === "Backend" && (<><li>Build authentication API</li><li>Create payment APIs</li><li>Review FE integration</li></>)}
              {role === "Frontend" && (<><li>Build UI screens</li><li>Wire up API integration</li><li>Handle errors and loading</li></>)}
              {role === "QA" && (<><li>Write E2E tests</li><li>Validate acceptance criteria</li><li>Sign off the sprint</li></>)}
              {role === "DevOps" && (<><li>Set up CI/CD</li><li>Deploy to staging</li><li>Configure monitoring</li></>)}
              {role === "SQL" && (<><li>Design schema</li><li>Add indexes</li><li>Write migrations</li></>)}
              {role === "Mobile" && (<><li>Build mobile screens</li><li>Integrate APIs</li><li>Submit to store</li></>)}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Tickets you'll receive</p>
            <p className="text-muted-foreground">2–4 tickets scoped to this role's slice of the sprint.</p>
          </div>
          <div className="rounded-md border border-warning/40 bg-warning/10 text-warning text-xs p-2.5 flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> You can only join this role once in this sprint.</div>
        </div>
        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Cancel</button>
          <button onClick={onConfirm} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90">Confirm & Join</button>
        </div>
      </div>
    </div>
  );
}

const RANDOM_NAMES = ["Rocket Squad", "Night Owls", "Ship Fast", "Bug Hunters", "API Whisperers", "Pixel Pushers", "Merge Masters", "Code Owls", "Sprint Sharks"];
const randomName = () => RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];

function CreateTeamModal({ sprintId, onClose }: { sprintId: string; onClose: () => void }) {
  const { sprints, users, connections, squads, user, createTeam } = useCollab();
  const nav = useNavigate();
  const sprint = sprints.find(s => s.id === sprintId)!;

  const [name, setName] = useState(randomName());
  const [myRole, setMyRole] = useState<RoleKey>(sprint.requiredRoles[0]);
  const [search, setSearch] = useState("");
  const [onlyConnections, setOnlyConnections] = useState(true);
  const [invited, setInvited] = useState<{ userId: string; role: RoleKey }[]>([]);
  const [squadId, setSquadId] = useState<string>("");
  const [squadPicked, setSquadPicked] = useState<Record<string, RoleKey | "">>({});
  const [openRoles, setOpenRoles] = useState<{ role: RoleKey; note?: string }[]>([]);
  const [requestRole, setRequestRole] = useState<RoleKey>(sprint.requiredRoles[1] ?? sprint.requiredRoles[0]);
  const [requestNote, setRequestNote] = useState("");

  const searchPool = useMemo(() => users.filter(u => u.id !== ME_ID && u.id !== "u-ai" && (!onlyConnections || connections.includes(u.id)))
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.username.includes(search.toLowerCase())), [users, connections, onlyConnections, search]);

  const toggleInvite = (userId: string, role: RoleKey) => {
    setInvited(i => {
      const exists = i.find(x => x.userId === userId);
      if (exists && exists.role === role) return i.filter(x => x.userId !== userId);
      return [...i.filter(x => x.userId !== userId), { userId, role }];
    });
  };

  const squad = squads.find(s => s.id === squadId);

  const submit = () => {
    if (!name.trim()) return;
    const squadInvites = Object.entries(squadPicked).filter(([, r]) => !!r).map(([uid, role]) => ({ userId: uid, role: role as RoleKey }));
    const allInvites = [...invited, ...squadInvites.filter(s => !invited.some(i => i.userId === s.userId))];
    createTeam({ sprintId, name: name.trim(), myRole, invites: allInvites, openRoles });
    onClose();
    nav({ to: "/collaboration/sprint/$id/workspace", params: { id: sprintId } });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[560px] bg-card border-l overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-semibold">Create Team</h2>
            <p className="text-[11px] text-muted-foreground">{sprint.title}</p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Team name */}
          <section>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team name</label>
            <div className="mt-2 flex gap-2">
              <input value={name} onChange={e => setName(e.target.value)} className="flex-1 px-3 py-2 text-sm rounded-md border bg-background" />
              <button onClick={() => setName(randomName())} className="rounded-md border px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1"><Shuffle className="h-3.5 w-3.5" /> Random</button>
            </div>
          </section>

          {/* My role */}
          <section>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your role</label>
            <select value={myRole} onChange={e => setMyRole(e.target.value as RoleKey)} className="mt-2 w-full px-3 py-2 text-sm rounded-md border bg-background">
              {sprint.requiredRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </section>

          {/* Invite members */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invite members</h3>
            <div className="flex gap-2 mb-2">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or @username" className="flex-1 px-3 py-2 text-sm rounded-md border bg-background" />
              <label className="text-xs flex items-center gap-1.5 px-2 py-2 rounded border"><input type="checkbox" checked={onlyConnections} onChange={e => setOnlyConnections(e.target.checked)} /> Connections only</label>
            </div>
            <div className="rounded-lg border max-h-48 overflow-y-auto divide-y">
              {searchPool.length === 0 && <p className="p-3 text-xs text-muted-foreground text-center">No users found.</p>}
              {searchPool.slice(0, 8).map(u => {
                const inv = invited.find(x => x.userId === u.id);
                return (
                  <div key={u.id} className="flex items-center gap-2 p-2">
                    <Avatar userId={u.id} size={28} />
                    <div className="flex-1 min-w-0"><div className="text-xs font-medium truncate">{u.name}</div><div className="flex items-center gap-1"><LevelBadge level={u.level} /><span className="text-[10px] text-muted-foreground">{u.roles.join(", ")}</span></div></div>
                    <select value={inv?.role ?? ""} onChange={e => e.target.value ? toggleInvite(u.id, e.target.value as RoleKey) : setInvited(i => i.filter(x => x.userId !== u.id))} className="text-xs rounded border bg-background px-1.5 py-1">
                      <option value="">— Role —</option>
                      {sprint.requiredRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            {invited.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {invited.map(inv => (
                  <span key={inv.userId} className="inline-flex items-center gap-1 text-[11px] bg-accent/60 rounded-full pl-1 pr-2 py-0.5">
                    <Avatar userId={inv.userId} size={16} /> {user(inv.userId)?.name} <RoleBadge role={inv.role} />
                    <button onClick={() => setInvited(i => i.filter(x => x.userId !== inv.userId))} className="ml-1 text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Squad */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Join with my squad</h3>
            <select value={squadId} onChange={e => { setSquadId(e.target.value); setSquadPicked({}); }} className="w-full px-3 py-2 text-sm rounded-md border bg-background">
              <option value="">— Pick a squad —</option>
              {squads.filter(s => s.memberIds.includes(ME_ID)).map(sq => <option key={sq.id} value={sq.id}>{sq.name} ({sq.memberIds.length} members)</option>)}
            </select>
            {squad && (
              <div className="mt-2 rounded-lg border divide-y">
                {squad.memberIds.filter(mid => mid !== ME_ID).map(mid => {
                  const u = user(mid);
                  return (
                    <div key={mid} className="flex items-center gap-2 p-2">
                      <Avatar userId={mid} size={24} />
                      <span className="text-xs flex-1">{u?.name}</span>
                      <select value={squadPicked[mid] ?? ""} onChange={e => setSquadPicked(p => ({ ...p, [mid]: e.target.value as RoleKey | "" }))} className="text-xs rounded border bg-background px-1.5 py-1">
                        <option value="">— Skip —</option>
                        {sprint.requiredRoles.filter(r => u?.roles.includes(r)).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Public role request */}
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Post public role request</h3>
            <div className="flex gap-2">
              <select value={requestRole} onChange={e => setRequestRole(e.target.value as RoleKey)} className="px-3 py-2 text-sm rounded-md border bg-background">
                {sprint.requiredRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input value={requestNote} onChange={e => setRequestNote(e.target.value)} placeholder="Optional note (e.g. needs JWT exp.)" className="flex-1 px-3 py-2 text-sm rounded-md border bg-background" />
              <button onClick={() => { setOpenRoles(o => [...o, { role: requestRole, note: requestNote || undefined }]); setRequestNote(""); }} className="rounded-md border px-3 text-sm hover:bg-accent inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /></button>
            </div>
            {openRoles.length > 0 && (
              <div className="mt-2 space-y-1">
                {openRoles.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-accent/40 rounded p-2">
                    <span className="font-medium">{r.role}</span>
                    <span className="flex-1 text-muted-foreground truncate">{r.note ?? "Open application"}</span>
                    <button onClick={() => setOpenRoles(o => o.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 p-3 text-xs">
            <Bot className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <span>Any role still open when the sprint starts will be auto-filled by an AI member, so your team can begin immediately.</span>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t p-4 flex gap-2">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
          <button onClick={submit} disabled={!name.trim()} className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
            Create Team · Status: Recruiting
          </button>
        </div>
      </div>
    </div>
  );
}


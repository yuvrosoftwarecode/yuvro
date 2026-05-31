import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useCollab } from "@/lib/collab/store";
import { Avatar, LevelBadge } from "@/components/collab/Avatar";
import { ME_ID } from "@/lib/collab/data";
import { Plus, X, Users, Trash2, LogOut } from "lucide-react";

export const Route = createFileRoute("/collaboration/squads")({ component: Squads });

function Squads() {
  const { squads, users, user, createSquad, removeFromSquad, leaveSquad, disbandSquad, inviteToSquad } = useCollab();
  const [activeId, setActiveId] = useState<string | null>(squads[0]?.id ?? null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVis, setNewVis] = useState<"Public" | "Invite Only">("Invite Only");
  const [inviteQ, setInviteQ] = useState("");
  const active = squads.find(s => s.id === activeId);
  const isOwner = active?.ownerId === ME_ID;

  return (
    <main className="mx-auto max-w-[1300px] px-4 sm:px-6 py-6 grid md:grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">My Squads</h1>
          <button onClick={() => setShowCreate(true)} className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2">
          {squads.map(sq => (
            <button key={sq.id} onClick={() => setActiveId(sq.id)} className={`w-full text-left rounded-xl border p-3 ${activeId === sq.id ? "border-primary/40 bg-primary/5" : "bg-card hover:bg-accent/30"}`}>
              <div className="flex items-center justify-between"><span className="text-sm font-medium">{sq.name}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-accent">{sq.visibility}</span></div>
              <div className="text-[11px] text-muted-foreground mt-1">{sq.memberIds.length} members</div>
            </button>
          ))}
        </div>
      </aside>

      <section>
        {!active ? (
          <p className="text-muted-foreground text-sm">Pick a squad.</p>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{active.name}</h2><span className="text-xs px-2 py-0.5 rounded bg-accent">{active.visibility}</span></div>
              <p className="text-xs text-muted-foreground mt-1">{active.memberIds.length} members{active.pendingIds.length > 0 && ` · ${active.pendingIds.length} pending`}</p>
            </div>

            <div className="rounded-xl border bg-card">
              <div className="p-3 border-b text-sm font-semibold">Members</div>
              <div className="divide-y">
                {active.memberIds.map(id => {
                  const u = user(id);
                  if (!u) return null;
                  return (
                    <div key={id} className="flex items-center gap-3 p-3">
                      <Avatar userId={id} size={32} showStatus />
                      <div className="flex-1"><div className="text-sm font-medium">{u.name}</div><div className="text-[10px] text-muted-foreground">{u.roles.join(", ")}</div></div>
                      <LevelBadge level={u.level} />
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success">Active</span>
                      {isOwner && id !== ME_ID && <button onClick={() => removeFromSquad(active.id, id)} className="text-xs text-destructive hover:underline">Remove</button>}
                    </div>
                  );
                })}
              </div>
            </div>

            {active.pendingIds.length > 0 && (
              <div className="rounded-xl border bg-card">
                <div className="p-3 border-b text-sm font-semibold">Pending invites</div>
                <div className="divide-y">
                  {active.pendingIds.map(id => {
                    const u = user(id);
                    return (
                      <div key={id} className="flex items-center gap-3 p-3">
                        <Avatar userId={id} size={28} />
                        <span className="flex-1 text-sm">{u?.name}</span>
                        <button className="text-xs text-muted-foreground hover:text-destructive">Cancel Invite</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-2">Invite member</h3>
              <input value={inviteQ} onChange={e => setInviteQ(e.target.value)} placeholder="Search username..." className="w-full px-3 py-2 text-sm rounded-md border bg-background mb-2" />
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {users.filter(u => u.id !== "u-ai" && !active.memberIds.includes(u.id) && (!inviteQ || u.name.toLowerCase().includes(inviteQ.toLowerCase()))).slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-accent/40">
                    <Avatar userId={u.id} size={22} /><span className="flex-1">{u.name}</span>
                    <button onClick={() => inviteToSquad(active.id, u.id)} className="text-xs rounded border px-2 py-1 hover:bg-accent">Invite</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {!isOwner && <button onClick={() => leaveSquad(active.id)} className="text-xs text-destructive inline-flex items-center gap-1"><LogOut className="h-3 w-3" /> Leave squad</button>}
              {isOwner && <button onClick={() => { if (confirm("Disband this squad?")) disbandSquad(active.id); }} className="text-xs text-destructive inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Disband squad</button>}
            </div>
          </div>
        )}
      </section>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card border rounded-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Create Squad</h2><button onClick={() => setShowCreate(false)} className="grid h-7 w-7 place-items-center rounded hover:bg-accent"><X className="h-4 w-4" /></button></div>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Squad name" className="w-full px-3 py-2 text-sm rounded-md border bg-background mb-2" />
            <div className="flex gap-2 mb-3">
              {(["Public", "Invite Only"] as const).map(v => <button key={v} onClick={() => setNewVis(v)} className={`flex-1 text-xs px-3 py-1.5 rounded-md border ${newVis === v ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>{v}</button>)}
            </div>
            <button onClick={() => { if (newName.trim()) { const id = createSquad(newName, newVis); setActiveId(id); setNewName(""); setShowCreate(false); } }} className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">Create Squad</button>
          </div>
        </div>
      )}
    </main>
  );
}

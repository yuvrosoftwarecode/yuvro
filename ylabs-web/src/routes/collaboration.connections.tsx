import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useCollab } from "@/lib/collab/store";
import { Avatar, LevelBadge, RoleBadge } from "@/components/collab/Avatar";
import { useCollabUI } from "@/components/collab/CollabShell";
import { Search } from "lucide-react";

export const Route = createFileRoute("/collaboration/connections")({ component: Connections });

function Connections() {
  const { users, connections, pendingIncoming, connect, acceptConnect, ignoreConnect } = useCollab();
  const { openProfile } = useCollabUI();
  const [tab, setTab] = useState<"mine" | "discover">("mine");
  const [q, setQ] = useState("");
  const connectionUsers = users.filter(u => connections.includes(u.id));
  const discover = users.filter(u => u.id !== "u-me" && u.id !== "u-ai" && !connections.includes(u.id) && (!q || u.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <main className="mx-auto max-w-[1300px] px-4 sm:px-6 py-6 space-y-5">
      <h1 className="text-2xl font-semibold">Connections</h1>

      {pendingIncoming.length > 0 && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm font-semibold mb-2">{pendingIncoming.length} people want to connect</p>
          <div className="space-y-2">
            {pendingIncoming.map(id => {
              const u = users.find(x => x.id === id);
              return (
                <div key={id} className="flex items-center gap-2"><Avatar userId={id} size={28} /><span className="flex-1 text-sm">{u?.name}</span>
                  <button onClick={() => acceptConnect(id)} className="text-xs rounded bg-primary text-primary-foreground px-3 py-1">Accept</button>
                  <button onClick={() => ignoreConnect(id)} className="text-xs rounded border px-3 py-1 hover:bg-accent">Ignore</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1">
        {(["mine", "discover"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm rounded-md ${tab === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{t === "mine" ? "My Connections" : "Discover Users"}</button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name..." className="pl-8 pr-3 py-2 text-sm rounded-md border bg-background w-full" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(tab === "mine" ? connectionUsers.filter(u => !q || u.name.toLowerCase().includes(q.toLowerCase())) : discover).map(u => {
          const isConnected = connections.includes(u.id);
          return (
            <div key={u.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3"><Avatar userId={u.id} size={48} showStatus /><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{u.name}</p><p className="text-[11px] text-muted-foreground">{u.title}</p><LevelBadge level={u.level} /></div></div>
              <div className="mt-3 flex flex-wrap gap-1">{u.roles.map(r => <RoleBadge key={r} role={r} />)}</div>
              <p className="mt-2 text-[11px] text-muted-foreground">{u.sprintsCompleted} sprints completed</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => openProfile(u.id)} className="text-xs rounded-md border px-2 py-1.5 hover:bg-accent">View Profile</button>
                {tab === "discover" ? (
                  <button onClick={() => connect(u.id)} disabled={isConnected} className="text-xs rounded-md bg-primary text-primary-foreground px-2 py-1.5 hover:opacity-90 disabled:opacity-50">{isConnected ? "Connected" : "Connect"}</button>
                ) : (
                  <button className="text-xs rounded-md bg-primary text-primary-foreground px-2 py-1.5 hover:opacity-90">Invite to Sprint</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

import { useCollab } from "@/lib/collab/store";
import { Avatar, LevelBadge, RoleBadge } from "./Avatar";
import { X, UserPlus, Users } from "lucide-react";
import { useEffect } from "react";

export function UserProfileDrawer({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { user, connections } = useCollab();
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (userId) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [userId, onClose]);

  if (!userId) return null;
  const u = user(userId);
  if (!u) return null;
  const connected = connections.includes(userId);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-card border-l border-border z-50 overflow-y-auto animate-in slide-in-from-right">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Profile</h2>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3">
            <Avatar userId={u.id} size={64} showStatus />
            <div>
              <p className="text-lg font-semibold">{u.name}</p>
              <p className="text-xs text-muted-foreground">@{u.username}</p>
              <div className="mt-1"><LevelBadge level={u.level} title={u.title} /></div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            {[
              ["Sprints", u.sprintsCompleted],
              ["Roles", u.roles.length],
              ["Points", u.points.toLocaleString()],
              ["Level", u.level],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-background/40 p-2">
                <div className="text-sm font-semibold">{v}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{k}</div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Roles played</p>
            <div className="flex flex-wrap gap-1.5">{u.roles.map(r => <RoleBadge key={r} role={r} />)}</div>
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Sprint history</p>
            <div className="rounded-lg border bg-background/40 divide-y text-sm">
              {[
                ["LoanFlow Origination", "Backend", "92"],
                ["FinScore Credit API", "Backend", "85"],
                ["MoodLens Sentiment", "Backend", "78"],
              ].map(([n, r, sc]) => (
                <div key={n} className="flex items-center justify-between p-2.5">
                  <div><div className="font-medium text-xs">{n}</div><div className="text-[10px] text-muted-foreground">{r}</div></div>
                  <div className="text-xs font-semibold text-success">{sc}/100</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {u.id !== "u-me" && (
              <button className={`text-xs rounded-md px-3 py-2 font-medium ${connected ? "bg-success/15 text-success border border-success/30" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
                {connected ? "Connected" : "Connect"}
              </button>
            )}
            <button className="text-xs rounded-md border px-3 py-2 hover:bg-accent inline-flex items-center justify-center gap-1"><UserPlus className="h-3 w-3" /> Invite to Sprint</button>
            <button className="col-span-2 text-xs rounded-md border px-3 py-2 hover:bg-accent inline-flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Invite to Squad</button>
          </div>
        </div>
      </aside>
    </>
  );
}

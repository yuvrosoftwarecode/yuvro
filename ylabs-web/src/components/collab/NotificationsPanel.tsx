import { Link } from "@tanstack/react-router";
import { useCollab } from "@/lib/collab/store";
import { X, Bell, GitPullRequest, AlertTriangle, UserPlus, Award, CheckCircle2, Inbox } from "lucide-react";
import { useEffect } from "react";

const ICONS: Record<string, any> = {
  "sprint-invite": UserPlus, "role-request": UserPlus, "sprint-started": Bell, "dep-resolved": CheckCircle2,
  "pr-review": GitPullRequest, "pr-approved": CheckCircle2, "pr-changes": GitPullRequest,
  "inactivity": AlertTriangle, "removed": AlertTriangle, "sprint-submitted": Bell, "report-ready": Award,
  "connection": UserPlus, "squad-invite": UserPlus, "level": Award,
};
const TONES: Record<string, string> = {
  "sprint-invite": "text-primary", "role-request": "text-primary", "sprint-started": "text-info",
  "dep-resolved": "text-success", "pr-review": "text-ui", "pr-approved": "text-success", "pr-changes": "text-warning",
  "inactivity": "text-warning", "removed": "text-destructive", "sprint-submitted": "text-info",
  "report-ready": "text-warning", "connection": "text-success", "squad-invite": "text-primary", "level": "text-warning",
};

function group(at: number) {
  const d = Date.now() - at;
  if (d < 24 * 3600 * 1000) return "Today";
  if (d < 48 * 3600 * 1000) return "Yesterday";
  return "Earlier";
}
function rel(at: number) {
  const d = Date.now() - at;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications, markAllRead, markRead } = useCollab();
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  const groups: Record<string, typeof notifications> = { Today: [], Yesterday: [], Earlier: [] };
  notifications.forEach(n => groups[group(n.at)].push(n));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-card border-l border-border z-50 flex flex-col animate-in slide-in-from-right">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /><h2 className="font-semibold">Notifications</h2></div>
          <div className="flex items-center gap-2">
            <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground">Mark all read</button>
            <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded hover:bg-accent"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet. Join a sprint to get started!</p>
            </div>
          ) : (
            (["Today", "Yesterday", "Earlier"] as const).map(label => groups[label].length > 0 && (
              <div key={label}>
                <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground bg-accent/30">{label}</div>
                {groups[label].map(n => {
                  const Icon = ICONS[n.type] ?? Bell;
                  const tone = TONES[n.type] ?? "text-muted-foreground";
                  const inner = (
                    <div className="flex items-start gap-3 p-3 hover:bg-accent/30 border-b border-border/60">
                      <div className={`grid h-8 w-8 place-items-center rounded-md bg-accent ${tone} shrink-0`}><Icon className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{n.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{rel(n.at)} ago</p>
                      </div>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />}
                    </div>
                  );
                  return n.link ? (
                    <Link key={n.id} to={n.link as any} onClick={() => { markRead(n.id); onClose(); }}>{inner}</Link>
                  ) : (
                    <button key={n.id} onClick={() => markRead(n.id)} className="w-full text-left">{inner}</button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}

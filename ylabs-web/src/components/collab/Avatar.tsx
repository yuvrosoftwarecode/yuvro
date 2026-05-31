import { useCollab } from "@/lib/collab/store";
import { AI_ID } from "@/lib/collab/data";

export function Avatar({ userId, size = 32, showStatus = false, ai = false }: { userId?: string | null; size?: number; showStatus?: boolean; ai?: boolean }) {
  const { user } = useCollab();
  const u = user(userId ?? undefined);
  const isAI = ai || userId === AI_ID;
  const initials = u?.avatar ?? (isAI ? "AI" : "?");
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <div
        className={`grid place-items-center rounded-full font-semibold ${isAI ? "bg-warning/20 text-warning" : "bg-primary/15 text-primary"}`}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
        title={u?.name ?? "AI Member"}
      >{initials}</div>
      {showStatus && !isAI && (
        <span className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card ${u?.online ? "bg-success" : "bg-muted-foreground"}`} style={{ width: size * 0.3, height: size * 0.3 }} />
      )}
      {isAI && (
        <span className="absolute -top-1 -right-1 text-[8px] font-bold px-1 rounded bg-warning text-warning-foreground">AI</span>
      )}
    </div>
  );
}

export function LevelBadge({ level, title }: { level: number; title?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning px-2 py-0.5 text-[10px] font-semibold border border-warning/30">
      Lv {level}{title ? ` · ${title}` : ""}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return <span className="rounded bg-accent text-foreground px-1.5 py-0.5 text-[10px] font-medium">{role}</span>;
}

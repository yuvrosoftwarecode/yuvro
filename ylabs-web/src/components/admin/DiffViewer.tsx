import { useState } from "react";
import type { DiffFile, DiffLine } from "@/lib/labAttempts";
import { Columns2, Rows3 } from "lucide-react";

const bg = (t: DiffLine["type"]) =>
  t === "add" ? "bg-success/10" : t === "del" ? "bg-destructive/10" : "";
const sign = (t: DiffLine["type"]) => (t === "add" ? "+" : t === "del" ? "-" : " ");
const signColor = (t: DiffLine["type"]) =>
  t === "add" ? "text-success" : t === "del" ? "text-destructive" : "text-muted-foreground";

function Unified({ file }: { file: DiffFile }) {
  return (
    <div className="font-mono text-[12px] leading-5">
      {file.lines.map((l, i) => (
        <div key={i} className={`flex ${bg(l.type)}`}>
          <span className="w-10 shrink-0 select-none px-2 text-right text-muted-foreground/60">{l.oldNo ?? ""}</span>
          <span className="w-10 shrink-0 select-none px-2 text-right text-muted-foreground/60">{l.newNo ?? ""}</span>
          <span className={`w-4 shrink-0 select-none ${signColor(l.type)}`}>{sign(l.type)}</span>
          <span className="whitespace-pre-wrap break-all pr-3">{l.text}</span>
        </div>
      ))}
    </div>
  );
}

function Split({ file }: { file: DiffFile }) {
  // Pair deletions with additions row-by-row.
  const rows: { left?: DiffLine; right?: DiffLine }[] = [];
  const q: DiffLine[] = [];
  const flush = () => {
    const dels = q.filter(l => l.type === "del");
    const adds = q.filter(l => l.type === "add");
    for (let i = 0; i < Math.max(dels.length, adds.length); i++) rows.push({ left: dels[i], right: adds[i] });
    q.length = 0;
  };
  for (const l of file.lines) {
    if (l.type === "ctx") { flush(); rows.push({ left: l, right: l }); }
    else q.push(l);
  }
  flush();

  const Cell = ({ l, side }: { l?: DiffLine; side: "left" | "right" }) => (
    <div className={`flex min-w-0 flex-1 ${l ? bg(l.type) : "bg-muted/20"}`}>
      <span className="w-10 shrink-0 select-none px-2 text-right text-muted-foreground/60">
        {(side === "left" ? l?.oldNo : l?.newNo) ?? ""}
      </span>
      <span className={`w-4 shrink-0 select-none ${l ? signColor(l.type) : ""}`}>{l ? sign(l.type) : ""}</span>
      <span className="whitespace-pre-wrap break-all pr-3">{l?.text ?? ""}</span>
    </div>
  );

  return (
    <div className="font-mono text-[12px] leading-5">
      {rows.map((r, i) => (
        <div key={i} className="flex divide-x divide-border/50">
          <Cell l={r.left} side="left" />
          <Cell l={r.right} side="right" />
        </div>
      ))}
    </div>
  );
}

export function DiffViewer({ files }: { files: DiffFile[] }) {
  const [mode, setMode] = useState<"unified" | "split">("unified");
  const adds = files.reduce((a, f) => a + f.additions, 0);
  const dels = files.reduce((a, f) => a + f.deletions, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {files.length} file{files.length > 1 ? "s" : ""} changed
          <span className="text-success ml-2">+{adds}</span>
          <span className="text-destructive ml-1">−{dels}</span>
        </span>
        <div className="ml-auto inline-flex rounded-md border border-border overflow-hidden text-[11px]">
          <button onClick={() => setMode("unified")}
            className={`px-2.5 py-1 inline-flex items-center gap-1 ${mode === "unified" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
            <Rows3 className="h-3 w-3" /> Unified
          </button>
          <button onClick={() => setMode("split")}
            className={`px-2.5 py-1 inline-flex items-center gap-1 border-l border-border ${mode === "split" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
            <Columns2 className="h-3 w-3" /> Split
          </button>
        </div>
      </div>

      {files.map(f => (
        <div key={f.path} className="rounded-lg border border-border/60 overflow-hidden bg-card/40">
          <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-1.5 text-xs">
            <span className="font-mono">{f.path}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">{f.status}</span>
            <span className="ml-auto text-[11px]">
              <span className="text-success">+{f.additions}</span> <span className="text-destructive">−{f.deletions}</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            {mode === "unified" ? <Unified file={f} /> : <Split file={f} />}
          </div>
        </div>
      ))}
    </div>
  );
}

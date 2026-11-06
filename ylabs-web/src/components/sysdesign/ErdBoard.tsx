import { useEffect, useRef, useState } from "react";
import { Maximize, ZoomIn, ZoomOut, KeyRound, Link2 } from "lucide-react";

type Col = { name: string; type: string; pk: boolean; unique: boolean; note?: string; ref?: { kind: string; table: string; col: string } };
type Table = { name: string; cols: Col[] };

export function parseDbml(src: string): { tables: Table[]; error?: string } {
  const tables: Table[] = [];
  const re = /Table\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const cols: Col[] = [];
    for (const raw of m[2].split("\n")) {
      const note = raw.match(/\/\/\s*(.*)$/)?.[1];
      const line = raw.replace(/\/\/.*$/, "").trim();
      const cm = line.match(/^(\w+)\s+([\w(),]+)\s*(\[(.*)\])?/);
      if (!cm) continue;
      const attrs = cm[4] ?? "";
      const r = attrs.match(/ref:\s*([<>-])\s*(\w+)\.(\w+)/);
      cols.push({ name: cm[1], type: cm[2], pk: /\bpk\b/.test(attrs), unique: /\bunique\b/.test(attrs), note, ref: r ? { kind: r[1], table: r[2], col: r[3] } : undefined });
    }
    tables.push({ name: m[1], cols });
  }
  return tables.length ? { tables } : { tables, error: "No tables found. Use: Table name { col type [pk] }" };
}

const TW = 230, HH = 32, RH = 24;

/** dbdiagram-style ERD: draggable table cards with column-to-column relationship lines. Built from scratch. */
export function ErdBoard({ src }: { src: string }) {
  const { tables, error } = parseDbml(src);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [view, setView] = useState({ x: 30, y: 30, k: 1 });
  const [hover, setHover] = useState<string | null>(null);

  // auto layout any table that has no position yet
  const names = tables.map(t => t.name).join(",");
  useEffect(() => {
    setPos(p => {
      const next = { ...p }; const colsY = [0, 0, 0];
      tables.forEach((t, i) => {
        const c = i % 3;
        if (!next[t.name]) next[t.name] = { x: c * (TW + 90), y: colsY[c] };
        colsY[c] = Math.max(colsY[c], next[t.name].y + HH + t.cols.length * RH + 60);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names]);

  const fit = () => {
    const el = ref.current; if (!el || !tables.length) return;
    const ps = tables.map(t => ({ ...(pos[t.name] ?? { x: 0, y: 0 }), h: HH + t.cols.length * RH }));
    const minX = Math.min(...ps.map(p => p.x)), minY = Math.min(...ps.map(p => p.y));
    const maxX = Math.max(...ps.map(p => p.x + TW)), maxY = Math.max(...ps.map(p => p.y + p.h));
    const r = el.getBoundingClientRect();
    const k = Math.min(1.3, Math.max(0.3, Math.min((r.width - 60) / (maxX - minX), (r.height - 60) / (maxY - minY))));
    setView({ k, x: (r.width - (maxX - minX) * k) / 2 - minX * k, y: (r.height - (maxY - minY) * k) / 2 - minY * k });
  };
  const fitted = useRef(false);
  useEffect(() => { if (!fitted.current && Object.keys(pos).length && tables.length) { fitted.current = true; fit(); } });

  const drag = (e: React.PointerEvent, mv: (ev: PointerEvent) => void) => {
    e.preventDefault(); e.stopPropagation();
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const zoom = (f: number) => setView(v => ({ ...v, k: Math.min(2.5, Math.max(0.2, v.k * f)) }));

  if (error) return <div className="p-6 text-xs text-muted-foreground">{error}</div>;
  const byName = new Map(tables.map(t => [t.name, t]));
  const colY = (t: string, c: string) => { const tb = byName.get(t); const i = tb ? Math.max(0, tb.cols.findIndex(x => x.name === c)) : 0; return (pos[t]?.y ?? 0) + HH + i * RH + RH / 2; };

  const links = tables.flatMap(t => t.cols.filter(c => c.ref && byName.has(c.ref.table)).map(c => ({ from: t.name, fc: c.name, to: c.ref!.table, tc: c.ref!.col, kind: c.ref!.kind })));

  return (
    <div ref={ref} className="relative h-full w-full touch-none select-none overflow-hidden bg-background"
      onWheel={e => { const r = ref.current!.getBoundingClientRect(); const k = Math.min(2.5, Math.max(0.2, view.k * (e.deltaY < 0 ? 1.1 : 0.9))); const mx = e.clientX - r.left, my = e.clientY - r.top; setView({ k, x: mx - (mx - view.x) * (k / view.k), y: my - (my - view.y) * (k / view.k) }); }}
      onPointerDown={e => { const sx = e.clientX, sy = e.clientY, v0 = view; drag(e, ev => setView({ ...v0, x: v0.x + ev.clientX - sx, y: v0.y + ev.clientY - sy })); }}
      style={{ backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)", backgroundSize: `${18 * view.k}px ${18 * view.k}px`, backgroundPosition: `${view.x}px ${view.y}px` }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.k})` }}>
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
          {links.map((l, i) => {
            const a = pos[l.from], b = pos[l.to]; if (!a || !b) return null;
            const right = b.x > a.x + TW / 2;
            const x1 = right ? a.x + TW : a.x, x2 = right ? b.x : b.x + TW;
            const y1 = colY(l.from, l.fc), y2 = colY(l.to, l.tc);
            const d = Math.max(40, Math.abs(x2 - x1) / 2) * (right ? 1 : -1);
            const on = hover === l.from || hover === l.to;
            const many = l.kind === ">" ? "*" : "1", one = l.kind === "<" ? "*" : "1";
            return (
              <g key={i} className={on ? "text-primary" : "text-muted-foreground"}>
                <path d={`M${x1},${y1} C${x1 + d},${y1} ${x2 - d},${y2} ${x2},${y2}`} fill="none" stroke="currentColor" strokeWidth={on ? 2 : 1.3} />
                <text x={x1 + (right ? 6 : -12)} y={y1 - 4} className="fill-current text-[11px] font-semibold">{many}</text>
                <text x={x2 + (right ? -12 : 6)} y={y2 - 4} className="fill-current text-[11px] font-semibold">{one}</text>
              </g>
            );
          })}
        </svg>
        {tables.map(t => {
          const p = pos[t.name] ?? { x: 0, y: 0 };
          return (
            <div key={t.name} className={`absolute overflow-hidden rounded-lg border bg-card shadow-md ${hover === t.name ? "border-primary ring-2 ring-primary/20" : ""}`}
              style={{ left: p.x, top: p.y, width: TW }} onPointerEnter={() => setHover(t.name)} onPointerLeave={() => setHover(null)}>
              <div className="flex cursor-move items-center bg-primary px-3 font-mono text-xs font-semibold text-primary-foreground" style={{ height: HH }}
                onPointerDown={e => { const sx = e.clientX, sy = e.clientY, k = view.k; drag(e, ev => setPos(ps => ({ ...ps, [t.name]: { x: Math.round(p.x + (ev.clientX - sx) / k), y: Math.round(p.y + (ev.clientY - sy) / k) } }))); }}>
                {t.name}
              </div>
              {t.cols.map(c => (
                <div key={c.name} title={c.note} className="flex items-center gap-1.5 border-t px-3 font-mono text-[11px] hover:bg-accent" style={{ height: RH }}>
                  <span className="w-3.5 shrink-0">{c.pk ? <KeyRound className="h-3 w-3 text-amber-500" /> : c.ref ? <Link2 className="h-3 w-3 text-primary" /> : null}</span>
                  <span className={`truncate ${c.pk ? "font-semibold" : ""}`}>{c.name}</span>
                  {c.unique && !c.pk && <span className="rounded bg-muted px-1 text-[8px] uppercase text-muted-foreground">uq</span>}
                  <span className="ml-auto text-muted-foreground">{c.type}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-3 left-3 flex flex-col overflow-hidden rounded-md border bg-card shadow-sm" onPointerDown={e => e.stopPropagation()}>
        <button className="p-1.5 hover:bg-accent" onClick={() => zoom(1.2)} aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button>
        <button className="p-1.5 hover:bg-accent" onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button>
        <button className="p-1.5 hover:bg-accent" onClick={fit} aria-label="Fit view"><Maximize className="h-3.5 w-3.5" /></button>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded bg-card/80 px-2 py-1 text-[10px] text-muted-foreground">{tables.length} tables · {links.length} relations · drag headers to arrange</div>
    </div>
  );
}

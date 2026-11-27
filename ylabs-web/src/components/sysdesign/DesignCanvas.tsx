import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, ZoomIn, ZoomOut, Maximize, Search, FileCode2, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SD_PALETTE, type SDItem } from "@/lib/sdComponents";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export type SDNode = { id: string; kind: string; label: string; icon: string; tag?: string; x: number; y: number };
export type SDEdge = { id: string; from: string; to: string; label?: string };

const W = 156, H = 46;
type View = { x: number; y: number; k: number };
export type Sel = { type: "node" | "edge"; id: string } | null;

function anchors(a: SDNode, b: SDNode) {
  const ac = { x: a.x + W / 2, y: a.y + H / 2 }, bc = { x: b.x + W / 2, y: b.y + H / 2 };
  const dx = bc.x - ac.x, dy = bc.y - ac.y;
  if (Math.abs(dx) * (H / W) > Math.abs(dy)) {
    const s = Math.sign(dx) || 1;
    return { p1: { x: ac.x + s * W / 2, y: ac.y }, p2: { x: bc.x - s * W / 2, y: bc.y }, horiz: true };
  }
  const s = Math.sign(dy) || 1;
  return { p1: { x: ac.x, y: ac.y + s * H / 2 }, p2: { x: bc.x, y: bc.y - s * H / 2 }, horiz: false };
}

function curve(p1: { x: number; y: number }, p2: { x: number; y: number }, horiz: boolean) {
  const d = horiz ? Math.max(40, Math.abs(p2.x - p1.x) / 2) * Math.sign(p2.x - p1.x || 1) : Math.max(40, Math.abs(p2.y - p1.y) / 2) * Math.sign(p2.y - p1.y || 1);
  return horiz
    ? `M${p1.x},${p1.y} C${p1.x + d},${p1.y} ${p2.x - d},${p2.y} ${p2.x},${p2.y}`
    : `M${p1.x},${p1.y} C${p1.x},${p1.y + d} ${p2.x},${p2.y - d} ${p2.x},${p2.y}`;
}

function fitView(nodes: SDNode[], el: HTMLElement | null): View {
  if (!el || !nodes.length) return { x: 40, y: 40, k: 1 };
  const minX = Math.min(...nodes.map(n => n.x)), minY = Math.min(...nodes.map(n => n.y));
  const maxX = Math.max(...nodes.map(n => n.x + W)), maxY = Math.max(...nodes.map(n => n.y + H));
  const pad = 40, r = el.getBoundingClientRect();
  const k = Math.min(1.2, Math.max(0.85, Math.min((r.width - pad * 2) / (maxX - minX), (r.height - pad * 2) / (maxY - minY))));
  return { k, x: (r.width - (maxX - minX) * k) / 2 - minX * k, y: (r.height - (maxY - minY) * k) / 2 - minY * k };
}

/** Pure-SVG/DOM diagram board — no third-party graph library. */
export function DiagramBoard({ nodes, edges, setNodes, setEdges, readOnly, sel, setSel, emptyHint, onClearBoard }: {
  nodes: SDNode[]; edges: SDEdge[];
  setNodes?: (f: (n: SDNode[]) => SDNode[]) => void; setEdges?: (f: (e: SDEdge[]) => SDEdge[]) => void;
  readOnly?: boolean; sel?: Sel; setSel?: (s: Sel) => void; emptyHint?: React.ReactNode;
  onClearBoard?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 40, y: 40, k: 1 });
  const [link, setLink] = useState<{ from: string; x: number; y: number } | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingIconNodeId, setEditingIconNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);

  const viewRef = useRef(view); viewRef.current = view;

  const toWorld = useCallback((cx: number, cy: number) => {
    const r = ref.current!.getBoundingClientRect(), v = viewRef.current;
    return { x: (cx - r.left - v.x) / v.k, y: (cy - r.top - v.y) / v.k };
  }, []);

  // fit once on mount / when the diagram is replaced wholesale
  const sig = nodes.map(n => n.id).join(",");
  const lastSig = useRef("");
  useEffect(() => {
    const prev = lastSig.current; lastSig.current = sig;
    if (readOnly || !prev || Math.abs(sig.split(",").length - prev.split(",").length) > 1) setView(fitView(nodes, ref.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const drag = (e: React.PointerEvent, onMove: (ev: PointerEvent) => void, onUp?: (ev: PointerEvent) => void) => {
    e.preventDefault();
    const mv = (ev: PointerEvent) => onMove(ev);
    const up = (ev: PointerEvent) => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); onUp?.(ev); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };

  const onBgDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setSel?.(null);
    setEditingNodeId(null);
    setEditingIconNodeId(null);
    setEditingEdgeId(null);
    const sx = e.clientX, sy = e.clientY, v0 = viewRef.current;
    drag(e, ev => setView({ ...v0, x: v0.x + ev.clientX - sx, y: v0.y + ev.clientY - sy }));
  };

  const onNodeDown = (e: React.PointerEvent, n: SDNode) => {
    e.stopPropagation();
    setSel?.({ type: "node", id: n.id });
    if (readOnly || !setNodes) return;
    const sx = e.clientX, sy = e.clientY, k = viewRef.current.k;
    drag(e, ev => setNodes(ns => ns.map(m => m.id === n.id ? { ...m, x: Math.round(n.x + (ev.clientX - sx) / k), y: Math.round(n.y + (ev.clientY - sy) / k) } : m)));
  };

  const onPortDown = (e: React.PointerEvent, n: SDNode) => {
    e.stopPropagation();
    if (!setEdges) return;
    const p = toWorld(e.clientX, e.clientY);
    setLink({ from: n.id, ...p });
    drag(e, ev => setLink({ from: n.id, ...toWorld(ev.clientX, ev.clientY) }), ev => {
      setLink(null);
      const target = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest("[data-node-id]")?.getAttribute("data-node-id");
      if (target && target !== n.id) setEdges(es => es.some(x => x.from === n.id && x.to === target) ? es : [...es, { id: `e${Date.now()}`, from: n.id, to: target }]);
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = ref.current!.getBoundingClientRect(), v = viewRef.current;
    const k = Math.min(2.5, Math.max(0.2, v.k * (e.deltaY < 0 ? 1.1 : 0.9)));
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    setView({ k, x: mx - (mx - v.x) * (k / v.k), y: my - (my - v.y) * (k / v.k) });
  };

  const zoom = (f: number) => setView(v => { const r = ref.current!.getBoundingClientRect(); const k = Math.min(2.5, Math.max(0.2, v.k * f)); return { k, x: r.width / 2 - (r.width / 2 - v.x) * (k / v.k), y: r.height / 2 - (r.height / 2 - v.y) * (k / v.k) }; });

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/sds");
    if (!raw || !setNodes) return;
    const it: SDItem = JSON.parse(raw);
    const p = toWorld(e.clientX, e.clientY);
    const id = `n${Date.now()}`;
    setNodes(ns => [...ns, { id, kind: it.kind, label: it.label, icon: it.icon, tag: it.tag, x: Math.round(p.x - W / 2), y: Math.round(p.y - H / 2) }]);
    setSel?.({ type: "node", id });
  };

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!sel || t.closest("input,textarea,[contenteditable]") || (e.key !== "Delete" && e.key !== "Backspace")) return;
      if (sel.type === "node") { setNodes?.(ns => ns.filter(n => n.id !== sel.id)); setEdges?.(es => es.filter(x => x.from !== sel.id && x.to !== sel.id)); }
      else setEdges?.(es => es.filter(x => x.id !== sel.id));
      setSel?.(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, readOnly, setNodes, setEdges, setSel]);

  const byId = new Map(nodes.map(n => [n.id, n]));
  const g = 16 * view.k;

  return (
    <div ref={ref} onPointerDown={onBgDown} onWheel={onWheel}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }} onDrop={onDrop}
      className="relative h-full w-full touch-none select-none overflow-hidden bg-background"
      style={{ backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)", backgroundSize: `${g}px ${g}px`, backgroundPosition: `${view.x}px ${view.y}px` }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.k})` }}>
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible text-muted-foreground" width="1" height="1">
          <defs>
            <marker id="sd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor" /></marker>
            <marker id="sd-arrow-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#f7931e" /></marker>
          </defs>
          {edges.map(e => {
            const a = byId.get(e.from), b = byId.get(e.to);
            if (!a || !b) return null;
            const { p1, p2, horiz } = anchors(a, b);
            const d = curve(p1, p2, horiz);
            const on = sel?.type === "edge" && sel.id === e.id;
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            return (
              <g key={e.id}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} className="pointer-events-auto cursor-pointer"
                  onPointerDown={ev => { ev.stopPropagation(); setSel?.({ type: "edge", id: e.id }); }}
                  onDoubleClick={ev => { ev.stopPropagation(); setEditingEdgeId(e.id); }}
                />
                <path d={d} fill="none" stroke={on ? "#f7931e" : "currentColor"} strokeWidth={on ? 2.2 : 1.5} strokeDasharray="6 4" markerEnd={`url(#${on ? "sd-arrow-sel" : "sd-arrow"})`} className="sd-flow" />
                {editingEdgeId === e.id ? (
                  <foreignObject x={midX - 60} y={midY - 14} width={120} height={28} className="overflow-visible pointer-events-auto">
                    <input
                      autoFocus
                      value={e.label ?? ""}
                      placeholder="label"
                      onChange={ev => {
                        const val = ev.target.value;
                        setEdges?.(es => es.map(item => item.id === e.id ? { ...item, label: val } : item));
                      }}
                      onBlur={() => setEditingEdgeId(null)}
                      onKeyDown={ev => {
                        if (ev.key === "Enter" || ev.key === "Escape") setEditingEdgeId(null);
                      }}
                      className="w-full text-center text-[11px] font-medium bg-background border border-[#f7931e] rounded px-1 py-0.5 shadow-sm outline-none text-foreground"
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={midX}
                    y={midY - 6}
                    textAnchor="middle"
                    className="fill-foreground text-[11px] cursor-pointer pointer-events-auto hover:fill-[#f7931e]"
                    style={{ paintOrder: "stroke", stroke: "var(--background)", strokeWidth: 4 }}
                    onClick={ev => { ev.stopPropagation(); setSel?.({ type: "edge", id: e.id }); }}
                    onDoubleClick={ev => { ev.stopPropagation(); setEditingEdgeId(e.id); }}
                  >
                    {e.label || (on ? "✎ click to label" : "")}
                  </text>
                )}
              </g>
            );
          })}
          {link && byId.get(link.from) && (() => { const a = byId.get(link.from)!; return <path d={`M${a.x + W},${a.y + H / 2} L${link.x},${link.y}`} stroke="#f7931e" strokeWidth={1.5} strokeDasharray="4 3" fill="none" />; })()}
        </svg>

        {nodes.map(n => {
          const on = sel?.type === "node" && sel.id === n.id;
          const isEditingLabel = editingNodeId === n.id;
          const isEditingIcon = editingIconNodeId === n.id;

          return (
            <div key={n.id} data-node-id={n.id} onPointerDown={e => onNodeDown(e, n)}
              className={`group absolute flex items-center gap-2 rounded-lg border bg-card px-2.5 text-xs shadow-sm ${readOnly ? "" : "cursor-move"} ${on ? "border-[#f7931e] ring-2 ring-[#f7931e]/30" : "hover:border-[#f7931e]/60"}`}
              style={{ left: n.x, top: n.y, width: W, height: H }}>
              {/* Inline Icon Edit */}
              {isEditingIcon ? (
                <input
                  autoFocus
                  value={n.icon}
                  onChange={e => {
                    const val = e.target.value;
                    setNodes?.(ns => ns.map(m => m.id === n.id ? { ...m, icon: val } : m));
                  }}
                  onBlur={() => setEditingIconNodeId(null)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === "Escape") setEditingIconNodeId(null);
                  }}
                  className="w-7 h-7 text-center rounded-md border border-[#f7931e] bg-background text-sm outline-none shrink-0"
                />
              ) : (
                <span
                  title="Double-click to change icon"
                  onDoubleClick={e => {
                    e.stopPropagation();
                    if (!readOnly) setEditingIconNodeId(n.id);
                  }}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-base select-none grayscale opacity-80 cursor-pointer hover:border hover:border-[#f7931e]"
                  style={{ filter: "grayscale(100%)" }}
                >
                  {n.icon}
                </span>
              )}

              {/* Inline Label Edit */}
              <div className="min-w-0 flex-1">
                {isEditingLabel ? (
                  <input
                    autoFocus
                    value={n.label}
                    onChange={e => {
                      const val = e.target.value;
                      setNodes?.(ns => ns.map(m => m.id === n.id ? { ...m, label: val } : m));
                    }}
                    onBlur={() => setEditingNodeId(null)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === "Escape") setEditingNodeId(null);
                    }}
                    className="w-full bg-background border border-[#f7931e] rounded px-1 py-0.5 text-xs outline-none font-medium leading-tight text-foreground"
                  />
                ) : (
                  <span
                    title="Double-click to edit name"
                    onDoubleClick={e => {
                      e.stopPropagation();
                      if (!readOnly) setEditingNodeId(n.id);
                    }}
                    className="block truncate font-medium leading-tight cursor-text hover:text-[#f7931e]"
                  >
                    {n.label}
                  </span>
                )}
                {n.tag && <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">{n.tag}</span>}
              </div>

              {!readOnly && (
                <span onPointerDown={e => onPortDown(e, n)} title="Drag to connect"
                  className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-card bg-[#f7931e] opacity-60 group-hover:opacity-100" />
              )}
            </div>
          );
        })}
      </div>
      {!nodes.length && emptyHint && <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">{emptyHint}</div>}
      
      {/* Bottom-left zoom controls */}
      <div className="absolute bottom-3 left-3 flex flex-col overflow-hidden rounded-md border bg-card shadow-sm" onPointerDown={e => e.stopPropagation()}>
        <button className="p-1.5 hover:bg-accent" onClick={() => zoom(1.2)} aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button>
        <button className="p-1.5 hover:bg-accent" onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button>
        <button className="p-1.5 hover:bg-accent" onClick={() => setView(fitView(nodes, ref.current))} aria-label="Fit view"><Maximize className="h-3.5 w-3.5" /></button>
      </div>

      {/* Bottom-right controls: Zoom % and Clear Board */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5" onPointerDown={e => e.stopPropagation()}>
        {nodes.length > 0 && onClearBoard && (
          <button
            onClick={onClearBoard}
            className="rounded border border-destructive/30 bg-card/90 px-2 py-0.5 text-[11px] font-medium text-destructive hover:bg-destructive/10 inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            title="Clear all components and connections"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear board</span>
          </button>
        )}
        <div className="pointer-events-none rounded bg-card/80 border px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
          {Math.round(view.k * 100)}%
        </div>
      </div>
    </div>
  );
}

/** Full HLD editor: searchable palette + board (with optional bottom slot). */
export function HldEditor({ nodes, edges, setNodes, setEdges, bottomSlot, sel, setSel, onClearBoard, onOpenExamples }: {
  nodes: SDNode[]; edges: SDEdge[];
  setNodes: (f: (n: SDNode[]) => SDNode[]) => void; setEdges: (f: (e: SDEdge[]) => SDEdge[]) => void;
  bottomSlot?: React.ReactNode;
  sel?: Sel;
  setSel?: (s: Sel) => void;
  onClearBoard?: () => void;
  onOpenExamples?: () => void;
}) {
  const [internalSel, setInternalSel] = useState<Sel>(null);
  const currentSel = sel !== undefined ? sel : internalSel;
  const updateSel = setSel || setInternalSel;

  const [q, setQ] = useState("");
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ "Clients & Users": true, "Networking & Edge": true, "Compute & Services": true, Databases: true });
  const query = q.trim().toLowerCase();
  const groups = SD_PALETTE.map(gr => ({ ...gr, items: gr.items.filter(i => !query || `${i.label} ${i.tag ?? ""} ${gr.group}`.toLowerCase().includes(query)) })).filter(gr => gr.items.length);
  const addAtCenter = (it: SDItem) => {
    const id = `n${Date.now()}`;
    setNodes(ns => [...ns, { id, kind: it.kind, label: it.label, icon: it.icon, tag: it.tag, x: 60 + (ns.length % 5) * 190, y: 60 + Math.floor(ns.length / 5) * 110 }]);
    updateSel({ type: "node", id });
  };

  const jsonContent = JSON.stringify({ nodes, edges }, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonContent);
    setCopied(true);
    toast.success("Architecture JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col min-h-0">
      <div className="flex flex-1 min-h-0">
        <aside className="flex min-h-0 w-[190px] lg:w-[230px] shrink-0 flex-col border-r bg-card">
          <div className="border-b p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5 rounded-md border px-2 py-1 flex-1 min-w-0 bg-background">
                <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search 200+..."
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>
              {onOpenExamples && (
                <button
                  type="button"
                  onClick={onOpenExamples}
                  className="p-1.5 rounded-md border border-border/70 hover:bg-[#f7931e]/10 text-muted-foreground hover:text-[#f7931e] transition-colors shrink-0 cursor-pointer"
                  title="View Examples"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#f7931e]" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Drag onto board or click to add.</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {groups.map(gr => {
              const isOpen = !!query || open[gr.group];
              return (
                <div key={gr.group} className="mb-1">
                  <button onClick={() => setOpen(o => ({ ...o, [gr.group]: !isOpen }))} className="flex w-full items-center justify-between rounded px-1 py-1 text-[11px] font-semibold hover:bg-accent cursor-pointer">
                    {gr.group}<span className="text-[10px] font-normal text-muted-foreground">{isOpen ? "−" : gr.items.length}</span>
                  </button>
                  {isOpen && (
                    <div className="mt-1 grid grid-cols-1 gap-1">
                      {gr.items.map(it => (
                        <div key={it.kind} draggable onClick={() => addAtCenter(it)}
                          onDragStart={e => { e.dataTransfer.setData("application/sds", JSON.stringify(it)); e.dataTransfer.effectAllowed = "copy"; }}
                          className="flex cursor-grab items-center gap-2 rounded-md border bg-card px-2 py-1 text-[11px] hover:border-[#f7931e] active:cursor-grabbing">
                          <span className="inline-block w-4 text-center select-none grayscale opacity-75" style={{ filter: "grayscale(100%)" }}>{it.icon}</span><span className="truncate">{it.label}</span>
                          {it.tag && <span className="ml-auto text-[9px] text-muted-foreground">{it.tag}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
        <div className="min-h-0 flex-1 relative">
          <DiagramBoard
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
            sel={currentSel}
            setSel={updateSel}
            onClearBoard={onClearBoard}
            emptyHint={<div><div className="mb-1 text-base font-medium text-foreground">Your board is empty</div>Drag components from the left, or open <b>Examples</b> to start from a sample.</div>}
          />
        </div>
      </div>

      {bottomSlot}

      {/* View JSON Dialog */}
      <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-4 bg-background text-foreground border">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
              <FileCode2 className="h-4 w-4 text-[#f7931e]" />
              HLD Architecture JSON
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyJson}
              className="h-7 text-xs inline-flex items-center gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy JSON"}</span>
            </Button>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto mt-2">
            <pre className="p-3 rounded-md bg-muted/40 border font-mono text-xs overflow-x-auto text-foreground">
              {jsonContent}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

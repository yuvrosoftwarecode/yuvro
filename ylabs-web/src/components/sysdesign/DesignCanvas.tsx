import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, ZoomIn, ZoomOut, Maximize, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SD_PALETTE, type SDItem } from "@/lib/sdComponents";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type SDNode = { id: string; kind: string; label: string; icon: string; tag?: string; x: number; y: number };
export type SDEdge = { id: string; from: string; to: string; label?: string };

const W = 156, H = 46;
type View = { x: number; y: number; k: number };
type Sel = { type: "node" | "edge"; id: string } | null;

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
  const k = Math.min(1.4, Math.max(0.25, Math.min((r.width - pad * 2) / (maxX - minX), (r.height - pad * 2) / (maxY - minY))));
  return { k, x: (r.width - (maxX - minX) * k) / 2 - minX * k, y: (r.height - (maxY - minY) * k) / 2 - minY * k };
}

/** Pure-SVG/DOM diagram board — no third-party graph library. */
export function DiagramBoard({ nodes, edges, setNodes, setEdges, readOnly, sel, setSel, emptyHint }: {
  nodes: SDNode[]; edges: SDEdge[];
  setNodes?: (f: (n: SDNode[]) => SDNode[]) => void; setEdges?: (f: (e: SDEdge[]) => SDEdge[]) => void;
  readOnly?: boolean; sel?: Sel; setSel?: (s: Sel) => void; emptyHint?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 40, y: 40, k: 1 });
  const [link, setLink] = useState<{ from: string; x: number; y: number } | null>(null);
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
            <marker id="sd-arrow-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--primary)" /></marker>
          </defs>
          {edges.map(e => {
            const a = byId.get(e.from), b = byId.get(e.to);
            if (!a || !b) return null;
            const { p1, p2, horiz } = anchors(a, b);
            const d = curve(p1, p2, horiz);
            const on = sel?.type === "edge" && sel.id === e.id;
            return (
              <g key={e.id}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} className="pointer-events-auto cursor-pointer"
                  onPointerDown={ev => { ev.stopPropagation(); setSel?.({ type: "edge", id: e.id }); }} />
                <path d={d} fill="none" stroke={on ? "var(--primary)" : "currentColor"} strokeWidth={on ? 2.2 : 1.5} strokeDasharray="6 4" markerEnd={`url(#${on ? "sd-arrow-sel" : "sd-arrow"})`} className="sd-flow" />
                {e.label && (
                  <text x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 6} textAnchor="middle" className="fill-foreground text-[11px]" style={{ paintOrder: "stroke", stroke: "var(--background)", strokeWidth: 4 }}>{e.label}</text>
                )}
              </g>
            );
          })}
          {link && byId.get(link.from) && (() => { const a = byId.get(link.from)!; return <path d={`M${a.x + W},${a.y + H / 2} L${link.x},${link.y}`} stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="4 3" fill="none" />; })()}
        </svg>
        {nodes.map(n => {
          const on = sel?.type === "node" && sel.id === n.id;
          return (
            <div key={n.id} data-node-id={n.id} onPointerDown={e => onNodeDown(e, n)}
              className={`group absolute flex items-center gap-2 rounded-lg border bg-card px-2.5 text-xs shadow-sm ${readOnly ? "" : "cursor-move"} ${on ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/60"}`}
              style={{ left: n.x, top: n.y, width: W, height: H }}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-base select-none grayscale opacity-80" style={{ filter: "grayscale(100%)" }}>{n.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium leading-tight">{n.label}</span>
                {n.tag && <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">{n.tag}</span>}
              </span>
              {!readOnly && (
                <span onPointerDown={e => onPortDown(e, n)} title="Drag to connect"
                  className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-card bg-primary opacity-60 group-hover:opacity-100" />
              )}
            </div>
          );
        })}
      </div>
      {!nodes.length && emptyHint && <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">{emptyHint}</div>}
      <div className="absolute bottom-3 left-3 flex flex-col overflow-hidden rounded-md border bg-card shadow-sm" onPointerDown={e => e.stopPropagation()}>
        <button className="p-1.5 hover:bg-accent" onClick={() => zoom(1.2)} aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button>
        <button className="p-1.5 hover:bg-accent" onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button>
        <button className="p-1.5 hover:bg-accent" onClick={() => setView(fitView(nodes, ref.current))} aria-label="Fit view"><Maximize className="h-3.5 w-3.5" /></button>
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-card/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">{Math.round(view.k * 100)}%</div>
    </div>
  );
}

/** Full HLD editor: searchable palette + board + inspector. */
export function HldEditor({ nodes, edges, setNodes, setEdges }: {
  nodes: SDNode[]; edges: SDEdge[];
  setNodes: (f: (n: SDNode[]) => SDNode[]) => void; setEdges: (f: (e: SDEdge[]) => SDEdge[]) => void;
}) {
  const [sel, setSel] = useState<Sel>(null);
  const [showClearBoardDialog, setShowClearBoardDialog] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ "Clients & Users": true, "Networking & Edge": true, "Compute & Services": true, Databases: true });
  const query = q.trim().toLowerCase();
  const groups = SD_PALETTE.map(gr => ({ ...gr, items: gr.items.filter(i => !query || `${i.label} ${i.tag ?? ""} ${gr.group}`.toLowerCase().includes(query)) })).filter(gr => gr.items.length);
  const selNode = sel?.type === "node" ? nodes.find(n => n.id === sel.id) : undefined;
  const selEdge = sel?.type === "edge" ? edges.find(e => e.id === sel.id) : undefined;
  const addAtCenter = (it: SDItem) => {
    const id = `n${Date.now()}`;
    setNodes(ns => [...ns, { id, kind: it.kind, label: it.label, icon: it.icon, tag: it.tag, x: 60 + (ns.length % 5) * 190, y: 60 + Math.floor(ns.length / 5) * 110 }]);
    setSel({ type: "node", id });
  };

  return (
    <div className="grid h-full grid-cols-[170px_minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)_230px]">
      <aside className="flex min-h-0 flex-col border-r">
        <div className="border-b p-2">
          <div className="flex items-center gap-1.5 rounded-md border px-2 py-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search 200+ components" className="w-full bg-transparent text-xs outline-none" />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">Drag onto the board, or click to add.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {groups.map(gr => {
            const isOpen = !!query || open[gr.group];
            return (
              <div key={gr.group} className="mb-1">
                <button onClick={() => setOpen(o => ({ ...o, [gr.group]: !isOpen }))} className="flex w-full items-center justify-between rounded px-1 py-1 text-[11px] font-semibold hover:bg-accent">
                  {gr.group}<span className="text-[10px] font-normal text-muted-foreground">{isOpen ? "−" : gr.items.length}</span>
                </button>
                {isOpen && (
                  <div className="mt-1 grid grid-cols-1 gap-1">
                    {gr.items.map(it => (
                      <div key={it.kind} draggable onClick={() => addAtCenter(it)}
                        onDragStart={e => { e.dataTransfer.setData("application/sds", JSON.stringify(it)); e.dataTransfer.effectAllowed = "copy"; }}
                        className="flex cursor-grab items-center gap-2 rounded-md border bg-card px-2 py-1 text-[11px] hover:border-primary active:cursor-grabbing">
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
      <div className="min-h-0">
        <DiagramBoard nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} sel={sel} setSel={setSel}
          emptyHint={<div><div className="mb-1 text-base font-medium text-foreground">Your board is empty</div>Drag components from the left, or open <b>Examples</b> to start from a sample.</div>} />
      </div>
      <aside className="hidden overflow-y-auto border-l p-3 text-xs lg:block">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Inspector</div>
        {selNode ? (
          <div className="space-y-2">
            <label className="block text-muted-foreground">Label</label>
            <input value={selNode.label} onChange={e => setNodes(ns => ns.map(n => n.id === selNode.id ? { ...n, label: e.target.value } : n))}
              className="w-full rounded-md border bg-transparent px-2 py-1.5 outline-none focus:border-primary" />
            <label className="block text-muted-foreground">Icon</label>
            <input value={selNode.icon} onChange={e => setNodes(ns => ns.map(n => n.id === selNode.id ? { ...n, icon: e.target.value } : n))}
              className="w-full rounded-md border bg-transparent px-2 py-1.5 outline-none focus:border-primary" />
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setNodes(ns => ns.filter(n => n.id !== selNode.id)); setEdges(es => es.filter(x => x.from !== selNode.id && x.to !== selNode.id)); setSel(null); }}>
              <Trash2 className="h-3 w-3" />Delete component
            </Button>
          </div>
        ) : selEdge ? (
          <div className="space-y-2">
            <label className="block text-muted-foreground">Connection label</label>
            <input value={selEdge.label ?? ""} placeholder="e.g. HTTPS, async, gRPC" onChange={e => setEdges(es => es.map(x => x.id === selEdge.id ? { ...x, label: e.target.value } : x))}
              className="w-full rounded-md border bg-transparent px-2 py-1.5 outline-none focus:border-primary" />
            <Button variant="outline" size="sm" onClick={() => setEdges(es => es.map(x => x.id === selEdge.id ? { ...x, from: x.to, to: x.from } : x))}>Reverse direction</Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setEdges(es => es.filter(x => x.id !== selEdge.id)); setSel(null); }}>
              <Trash2 className="h-3 w-3" />Delete connection
            </Button>
          </div>
        ) : (
          <p className="leading-relaxed text-muted-foreground">Select a component or connection to edit it. Drag from the dot on a component's right edge to another component to connect. Drag the empty board to pan, scroll to zoom, press Delete to remove.</p>
        )}
        <div className="mt-6 border-t pt-3 text-muted-foreground">{nodes.length} components · {edges.length} connections</div>
        {nodes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-muted-foreground hover:text-destructive"
            onClick={() => setShowClearBoardDialog(true)}
          >
            Clear board
          </Button>
        )}
      </aside>

      {/* Clear Architecture Board Dialog */}
      <AlertDialog open={showClearBoardDialog} onOpenChange={setShowClearBoardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear Architecture Canvas?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This will remove all components and connections from the architecture board. Your Sequence diagrams, DBML schema, and REST APIs will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setNodes(() => []);
                setEdges(() => []);
                setSel(null);
                setShowClearBoardDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

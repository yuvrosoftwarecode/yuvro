import { getSystemDesignLab } from "@/lib/systemDesign";
import { labs, tickets } from "@/lib/dummy";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DiffBadge, StatusBadge } from "@/components/Badges";
import restApiAuthUtil from "@/utils/RestApiAuthUtil";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  GitBranch,
  Database,
  FileText,
  FileCode2,
  ChevronDown,
  Download,
  Sparkles,
  X,
  Users,
  BookOpen,
  Lightbulb,
  Key,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  Zap,
  Send,
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Check,
  Upload,
  Lock,
  Unlock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { evaluateSystemDesign, type SystemDesignEvaluationResult } from "@/lib/systemDesignEvaluator";
import { ApiDesigner, ApiDocs, type ApiEndpoint } from "@/components/sysdesign/ApiDesigner";
import { ErdBoard } from "@/components/sysdesign/ErdBoard";
import { NotesPanel, MarkdownPreview } from "@/components/sysdesign/MarkdownNotes";
import { DiagramBoard, HldEditor, type SDNode, type SDEdge } from "@/components/sysdesign/DesignCanvas";

export const Route = createFileRoute("/system-design-studio")({
  head: () => ({ meta: [{ title: "System Design Studio · Yuvro Labs" }] }),
  component: Studio,
});

type Tab = "hld" | "sequence" | "schema" | "api";
type Notes = Partial<Record<Tab, string>>;
const LS = "yuvro-sds-v2";

type Design = { nodes: SDNode[]; edges: SDEdge[]; seq: string; schema: string; apis: ApiEndpoint[]; notes: Notes };
const EMPTY: Design = { nodes: [], edges: [], seq: "", schema: "", apis: [], notes: {} };
const api = (id: string, method: string, path: string, summary: string, request: unknown, status: string, response: unknown): ApiEndpoint =>
  ({ id, method, path, summary, request: request == null ? "" : JSON.stringify(request, null, 2), status, response: response == null ? "" : JSON.stringify(response, null, 2) });

const n = (id: string, label: string, icon: string, x: number, y: number, tag?: string): SDNode => ({ id, kind: label.toLowerCase(), label, icon, x, y, tag });
const e = (from: string, to: string, label?: string): SDEdge => ({ id: `${from}-${to}`, from, to, label });

const DEFAULT_SEQ = `sequenceDiagram
  autonumber
  actor U as User
  participant LB as Load Balancer
  participant S as URL Service
  participant C as Redis
  participant D as Postgres
  U->>LB: GET /abc123
  LB->>S: forward
  S->>C: GET abc123
  alt cache hit
    C-->>S: long_url
  else cache miss
    S->>D: SELECT long_url
    D-->>S: long_url
    S->>C: SET abc123
  end
  S-->>U: 301 Redirect`;

const DEFAULT_SCHEMA = `// dbdiagram-style (DBML)
Table users {
  id bigint [pk]
  email varchar [unique]
  created_at timestamp
}

Table urls {
  id bigint [pk]
  short_code varchar [unique]
  long_url text
  user_id bigint [ref: > users.id]
  expires_at timestamp
}

Table clicks {
  id bigint [pk]
  url_id bigint [ref: > urls.id]
  country varchar
  clicked_at timestamp
}`;

function loadState(key: string) {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}

function saveState(key: string, data: any) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ---------- DBML -> mermaid erDiagram ----------
function dbmlToMermaid(src: string): { code: string; error?: string } {
  const tables: { name: string; cols: { name: string; type: string; key: string }[] }[] = [];
  const rels: string[] = [];
  const re = /Table\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const name = m[1];
    const cols: { name: string; type: string; key: string }[] = [];
    for (const raw of m[2].split("\n")) {
      const line = raw.replace(/\/\/.*$/, "").trim();
      if (!line) continue;
      const cm = line.match(/^(\w+)\s+([\w()]+)\s*(\[(.*)\])?/);
      if (!cm) continue;
      const attrs = cm[4] ?? "";
      let key = attrs.includes("pk") ? "PK" : attrs.includes("unique") ? "UK" : "";
      const ref = attrs.match(/ref:\s*([<>-])\s*(\w+)\.(\w+)/);
      if (ref) {
        key = "FK";
        const card = ref[1] === ">" ? "}o--||" : ref[1] === "<" ? "||--o{" : "||--||";
        rels.push(`  ${name} ${card} ${ref[2]} : "${cm[1]}"`);
      }
      cols.push({ name: cm[1], type: cm[2].replace(/[()]/g, "_"), key });
    }
    tables.push({ name, cols });
  }
  if (!tables.length) return { code: "", error: "No tables found. Use: Table name { col type [pk] }" };
  const body = tables.map(t => `  ${t.name} {\n${t.cols.map(c => `    ${c.type} ${c.name}${c.key ? " " + c.key : ""}`).join("\n")}\n  }`).join("\n");
  return { code: `erDiagram\n${body}\n${rels.join("\n")}` };
}

// ---------- Mermaid renderer ----------
let mermaidReady: Promise<typeof import("mermaid").default> | null = null;
function getMermaid() {
  if (!mermaidReady) mermaidReady = import("mermaid").then(m => {
    const dark = document.documentElement.classList.contains("dark");
    m.default.initialize({ startOnLoad: false, theme: dark ? "dark" : "default", securityLevel: "strict" });
    return m.default;
  });
  return mermaidReady;
}
let rid = 0;
function MermaidView({ code }: { code: string }) {
  const [svg, setSvg] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const mm = await getMermaid();
        await mm.parse(code);
        const { svg } = await mm.render(`mmd-${++rid}`, code);
        if (alive) { setSvg(svg); setErr(""); }
      } catch (e) { if (alive) setErr(e instanceof Error ? e.message.split("\n").slice(0, 3).join("\n") : String(e)); }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [code]);
  return (
    <div className="relative h-full overflow-auto p-6">
      {err && <pre className="mb-3 whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">{err}</pre>}
      <div className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

function SplitEditor({ value, onChange, preview, hint }: { value: string; onChange: (v: string) => void; preview: React.ReactNode; hint: string }) {
  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-[minmax(320px,40%)_1fr]">
      <div className="flex min-h-0 flex-col border-r">
        <div className="border-b px-3 py-1.5 text-[11px] text-muted-foreground">{hint}</div>
        <textarea value={value} onChange={e => onChange(e.target.value)} spellCheck={false}
          className="min-h-[300px] flex-1 resize-none bg-[#1E1E1E] p-3 font-mono text-[12.5px] leading-relaxed text-[#D4D4D4] outline-none" />
      </div>
      <div className="min-h-0 bg-card">{preview}</div>
    </div>
  );
}

// ---------- Examples ----------
function scenarioExample(slug: string): Design {
  const design = getSystemDesignLab(slug);
  const service = design?.service ?? "URL Service";
  const subject = design?.subject ?? "URL Shortener";
  const isUrl = slug === "systemdesign-url-shortener";
  const nodes = [
    n("n1", "Web Client", "🖥️", 0, 160), n("n2", "Load Balancer", "⚖️", 220, 160),
    n("n3", service, "⚙️", 440, 70), n("n4", service, "⚙️", 440, 250),
    n("n5", "Redis", "⚡", 680, 70), n("n6", "PostgreSQL", "🐘", 680, 250),
  ];
  const edges = [e("n1", "n2", "HTTPS"), e("n2", "n3"), e("n2", "n4"), e("n3", "n5", "read"), e("n4", "n6", "write")];
  const seq = isUrl ? DEFAULT_SEQ : `sequenceDiagram
  autonumber
  actor U as User
  participant A as API Gateway
  participant S as ${service}
  participant D as Database
  participant Q as Event Queue
  U->>A: ${design?.action ?? "Create request"}
  A->>S: Validate request
  S->>D: Check availability and create record
  D-->>S: Confirm transaction
  S->>Q: Publish confirmation event
  S-->>U: Return confirmation`;
  const schema = isUrl ? DEFAULT_SCHEMA : slug === "systemdesign" ? `Table users {
  id bigint [pk]
  email varchar [unique]
}
Table products {
  id bigint [pk]
  name varchar
  stock int
  price decimal
}
Table orders {
  id bigint [pk]
  user_id bigint [ref: > users.id]
  status varchar
}
Table order_items {
  id bigint [pk]
  order_id bigint [ref: > orders.id]
  product_id bigint [ref: > products.id]
  quantity int
}` : `Table users {
  id bigint [pk]
  email varchar [unique]
}
Table events {
  id bigint [pk]
  name varchar
  starts_at timestamp
}
Table seats {
  id bigint [pk]
  event_id bigint [ref: > events.id]
  seat_number varchar
}
Table bookings {
  id bigint [pk]
  user_id bigint [ref: > users.id]
  seat_id bigint [ref: > seats.id]
  status varchar
  expires_at timestamp
}`;
  const ent = design?.entity ?? "urls";
  const apis = isUrl ? [
    api("a1", "POST", "/api/v1/urls", "Create a short URL", { long_url: "https://example.com/very/long", custom_alias: null, expires_at: null }, "201 Created", { short_code: "abc123", short_url: "https://yu.vr/abc123" }),
    api("a2", "GET", "/{short_code}", "Redirect to the long URL", null, "301 Moved Permanently", { Location: "https://example.com/very/long" }),
    api("a3", "GET", "/api/v1/urls/{short_code}/stats", "Click analytics", null, "200 OK", { clicks: 1520, top_countries: ["IN", "US"] }),
    api("a4", "DELETE", "/api/v1/urls/{short_code}", "Delete a short URL", null, "204 No Content", null),
  ] : [
    api("a1", "GET", slug === "systemdesign" ? "/api/v1/products?page=1" : "/api/v1/events/{id}/seats", slug === "systemdesign" ? "List catalog" : "Seat availability", null, "200 OK", slug === "systemdesign" ? { items: [{ id: 7, name: "Headphones", price: 59.0, stock: 12 }], next_page: 2 } : { seats: [{ id: 101, number: "A1", status: "available" }] }),
    api("a2", "POST", `/api/v1/${ent}`, design?.action ?? "Create", slug === "systemdesign" ? { items: [{ product_id: 7, quantity: 1 }], idempotency_key: "c0ffee-42" } : { seat_ids: [101, 102], idempotency_key: "c0ffee-42" }, "201 Created", { id: 9001, status: slug === "systemdesign" ? "PENDING_PAYMENT" : "HELD", expires_at: "2026-10-14T16:10:00Z" }),
    api("a3", "GET", `/api/v1/${ent}/{id}`, "Fetch status", null, "200 OK", { id: 9001, status: "CONFIRMED" }),
    api("a4", "PATCH", `/api/v1/${ent}/{id}`, "Cancel", { status: "CANCELLED" }, "200 OK", { id: 9001, status: "CANCELLED" }),
  ];
  const notes: Notes = {
    hld: isUrl ? "## Requirements\n- Shorten URLs, redirect < 50ms p99\n- 100M URLs/month, read:write 100:1\n\n## Estimates\n- ~40 writes/s, ~4k reads/s\n\n## Trade-offs\n- **Cache-aside Redis** in front of Postgres: fast reads, risk of stale entries on delete\n" : `## ${subject} requirements\n- ${slug === "systemdesign" ? "Prevent overselling and duplicate payments" : "Prevent double booking and expire unpaid seat holds"}\n- Define availability, latency and capacity targets\n\n## Trade-offs\n- Stateless services behind a load balancer scale horizontally\n`,
    sequence: "## Flow notes\n- Cache miss path adds one DB round-trip\n- Use **idempotency keys** on writes so retries are safe\n",
    schema: "## Schema decisions\n- Unique index on the natural key\n- Shard by `id` hash once a single node is not enough\n",
    api: "## API decisions\n- Version in the path (`/api/v1`)\n- `POST` returns **201** with the created resource\n- Cursor pagination for list endpoints\n",
  };
  return { nodes, edges, seq, schema, apis, notes };
}

const USERS_TASKS_SAMPLE: Design = {
  nodes: [
    n("u1", "Web Client", "🖥️", 0, 60), n("u2", "Mobile App", "📱", 0, 220),
    n("u3", "CloudFront", "🛰️", 210, 60, "AWS"), n("u4", "API Gateway", "🚪", 210, 220, "AWS"),
    n("u5", "Auth Service", "🔐", 430, 60), n("u6", "Task Service", "⚙️", 430, 220),
    n("u7", "Redis", "⚡", 650, 140), n("u8", "PostgreSQL", "🐘", 650, 300),
    n("u9", "SQS", "📬", 430, 380, "AWS"), n("u10", "Notification Service", "🔔", 650, 440),
  ],
  edges: [
    e("u1", "u3", "HTTPS"), e("u3", "u4"), e("u2", "u4", "HTTPS"), e("u4", "u5", "JWT"), e("u4", "u6", "REST"),
    e("u6", "u7", "cache"), e("u6", "u8", "SQL"), e("u5", "u8"), e("u6", "u9", "task.assigned"), e("u9", "u10", "consume"),
  ],
  seq: `sequenceDiagram
  autonumber
  actor U as User
  participant G as API Gateway
  participant A as Auth Service
  participant T as Task Service
  participant DB as PostgreSQL
  participant Q as SQS
  U->>G: POST /users/42/tasks
  G->>A: Verify JWT
  A-->>G: user_id = 42
  G->>T: createTask(user_id, title, due_at)
  T->>DB: INSERT INTO user_tasks
  DB-->>T: task_id = 1001
  T->>Q: publish task.assigned
  T-->>U: 201 Created { id: 1001 }`,
  schema: `// users & user_tasks — dbdiagram-style
Table users {
  id bigint [pk]
  email varchar [unique]
  name varchar
  created_at timestamp
}

Table user_tasks {
  id bigint [pk]
  user_id bigint [ref: > users.id]
  title varchar
  status varchar // todo | in_progress | done
  priority int
  due_at timestamp
  created_at timestamp
}`,
  apis: [
    api("s1", "POST", "/api/v1/users", "Sign up", { email: "asha@example.com", name: "Asha" }, "201 Created", { id: 42, email: "asha@example.com" }),
    api("s2", "POST", "/api/v1/users/{id}/tasks", "Create a task", { title: "Write HLD", priority: 2, due_at: "2026-10-20T10:00:00Z" }, "201 Created", { id: 1001, status: "todo" }),
    api("s3", "GET", "/api/v1/users/{id}/tasks?status=todo&cursor=", "List tasks", null, "200 OK", { items: [{ id: 1001, title: "Write HLD", status: "todo" }], next_cursor: null }),
    api("s4", "PATCH", "/api/v1/tasks/{task_id}", "Update status", { status: "done" }, "200 OK", { id: 1001, status: "done" }),
    api("s5", "DELETE", "/api/v1/tasks/{task_id}", "Delete a task", null, "204 No Content", null),
  ],
  notes: {
    hld: `## users & user_tasks — requirements
- Users sign up, create tasks, filter by status, get reminders before due_at
- 1M users, ~20 tasks/user, read:write 10:1

## Trade-offs
- Cache task lists per user in Redis, invalidate on write
- SQS decouples notifications from the write path
`,
    sequence: "## Notes\n- JWT verified at the gateway, services trust `user_id`\n- Event published **after** commit (outbox pattern)\n",
    schema: "## Indexes\n- `(user_id, status)` on user_tasks\n- `email` unique on users\n",
    api: "## Notes\n- Tasks nested under users for creation and listing\n- Cursor pagination on list\n",
  },
};

function ExamplesDialog({ tab, scenario, subject, onClose, onUseTab, onLoadAll }: {
  tab: Tab; scenario: Design; subject: string; onClose: () => void;
  onUseTab: (d: Design) => void; onLoadAll: (d: Design) => void;
}) {
  const [src, setSrc] = useState<"scenario" | "users">("scenario");
  const d = src === "scenario" ? scenario : USERS_TASKS_SAMPLE;
  const code = tab === "sequence" ? d.seq : tab === "schema" ? d.schema : tab === "api" ? d.apis.map(a => `${a.method} ${a.path}${a.summary ? `  # ${a.summary}` : ""}${a.request ? `\nRequest:\n${a.request}` : ""}${a.response ? `\nResponse ${a.status ?? ""}:\n${a.response}` : ""}`).join("\n\n") : JSON.stringify({ components: d.nodes.map(x => x.label), connections: d.edges.map(x => `${d.nodes.find(y => y.id === x.from)?.label} → ${d.nodes.find(y => y.id === x.to)?.label}${x.label ? ` (${x.label})` : ""}`) }, null, 2);
  const label = { hld: "HLD · Architecture", sequence: "Sequence diagram", schema: "DB schema", api: "REST API" }[tab];
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl" onClick={ev => ev.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Example · {label}</div>
          <div className="ml-2 inline-flex rounded-md border p-0.5 text-xs">
            <button onClick={() => setSrc("scenario")} className={`rounded px-2 py-1 ${src === "scenario" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{subject}</button>
            <button onClick={() => setSrc("users")} className={`rounded px-2 py-1 ${src === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>users & user_tasks</button>
          </div>
          <button onClick={onClose} className="ml-auto rounded p-1 hover:bg-accent" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(300px,38%)_1fr]">
          <div className="flex min-h-0 flex-col border-r">
            <div className="border-b px-3 py-1.5 text-[11px] text-muted-foreground">{tab === "hld" ? "Components & connections" : "Code"}</div>
            <pre className="min-h-0 flex-1 overflow-auto bg-[#1E1E1E] p-3 font-mono text-[12px] leading-relaxed text-[#D4D4D4]">{code}</pre>
          </div>
          <div className="min-h-0 bg-background">
            {tab === "hld" ? <DiagramBoard key={src} nodes={d.nodes} edges={d.edges} readOnly />
              : tab === "schema" ? <ErdBoard key={src} src={d.schema} />
              : tab === "api" ? <ApiDocs apis={d.apis} />
              : <MermaidView code={d.seq} />}
          </div>
          {d.notes[tab] && <div className="max-h-40 overflow-auto border-t bg-card p-3 md:col-span-2"><div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Solution notes</div><MarkdownPreview src={d.notes[tab]!} /></div>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" size="sm" onClick={() => onUseTab(d)}>Use for this tab only</Button>
          <Button size="sm" onClick={() => onLoadAll(d)}>{src === "users" ? <Users className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}Load full sample (all tabs)</Button>
        </div>
      </div>
    </div>
  );
}

function EvaluationModal({
  result,
  loading = false,
  onClose,
  onSubmit,
  submitting,
}: {
  result: SystemDesignEvaluationResult | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const isPassed = result ? result.percentage >= 70 : false;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = result ? circumference - (result.percentage / 100) * circumference : circumference;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                {loading ? "AI Evaluation in Progress" : "System Design Evaluation"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {loading ? "Analyzing architecture against ticket requirements…" : "Automated structural & requirement checks"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-5 animate-in fade-in duration-200">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                  <Sparkles className="h-8 w-8 animate-spin" style={{ animationDuration: "3s" }} />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-semibold text-foreground">Evaluating Architecture with AI…</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  DeepSeek AI is analyzing your High-Level Design, Sequence Flows, Database Schema, and REST APIs against ticket requirements.
                </p>
              </div>

              <div className="w-full max-w-sm space-y-2 pt-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 shrink-0" />
                  <span className="text-foreground font-medium">Analyzing component tiers and connection routing</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
                  <span className="text-foreground font-medium">Validating sequence diagram and branching logic</span>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500 shrink-0" />
                  <span className="text-foreground font-medium">Grading database schema and REST API endpoints</span>
                </div>
              </div>
            </div>
          ) : result ? (
            <>
          {/* Top Score Banner */}
          <div className="rounded-xl border bg-muted/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Circular Gauge */}
              <div className="relative grid h-16 w-16 shrink-0 place-items-center">
                <svg className="h-16 w-16 -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    className="stroke-muted"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    className={
                      isPassed
                        ? "stroke-emerald-500"
                        : result.percentage > 0
                        ? "stroke-amber-500"
                        : "stroke-muted-foreground/30"
                    }
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                </svg>
                <span className="absolute text-sm font-bold text-foreground">
                  {result.percentage}%
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-foreground">
                    {isPassed ? "Ready for Submission" : result.percentage > 0 ? "Design In Progress" : "Design Not Started"}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      isPassed
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : result.percentage > 0
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {isPassed ? "Passed" : "Needs Work"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <strong className="text-foreground">{result.totalScore} / 100 pts</strong> · {result.passedCount} of {result.totalCount} criteria satisfied
                </p>
              </div>
            </div>

            {/* Architecture Metrics in neat chips */}
            <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto text-[11px]">
              <span className="rounded-md bg-background border px-2 py-1 font-medium text-muted-foreground">
                🖥️ <strong className="text-foreground">{result.metrics.nodeCount}</strong> Nodes
              </span>
              <span className="rounded-md bg-background border px-2 py-1 font-medium text-muted-foreground">
                🔗 <strong className="text-foreground">{result.metrics.edgeCount}</strong> Edges
              </span>
              <span className="rounded-md bg-background border px-2 py-1 font-medium text-muted-foreground">
                📜 Seq: <strong className="text-foreground">{result.metrics.hasSequence ? "✓" : "—"}</strong>
              </span>
              <span className="rounded-md bg-background border px-2 py-1 font-medium text-muted-foreground">
                🗄️ DBML: <strong className="text-foreground">{result.metrics.hasSchema ? "✓" : "—"}</strong>
              </span>
            </div>
          </div>

          {/* Task Breakdown */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Acceptance Criteria & Tasks</span>
              <span className="font-mono text-[11px] normal-case">
                {result.passedCount} of {result.totalCount} passed
              </span>
            </div>

            <div className="space-y-2">
              {result.tasks.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className={`rounded-xl border p-3.5 transition-all ${
                    t.passed
                      ? "border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06]"
                      : "border-border/80 bg-card hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                          t.passed
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {t.passed ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs font-semibold text-foreground leading-snug">
                          {t.title}
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {t.description}
                          </p>
                        )}
                        <div
                          className={`mt-1.5 flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] leading-relaxed ${
                            t.passed
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                              : "bg-muted/50 text-muted-foreground border border-border/50"
                          }`}
                        >
                          <span className="shrink-0">{t.passed ? "✓" : "💡"}</span>
                          <span>{t.feedback}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 font-mono text-xs font-semibold px-2 py-0.5 rounded-md border ${
                        t.passed
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      {t.score} / {t.maxScore} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t px-5 py-3 bg-muted/20">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {loading ? "Analyzing architecture with AI in real time…" : "Tip: Press Run anytime to re-evaluate"}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="h-8 text-xs">
              Continue Designing
            </Button>
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={loading || submitting}
              className="h-8 text-xs bg-primary text-primary-foreground font-medium shadow-xs inline-flex items-center gap-1.5"
            >
              <Send className="h-3 w-3" />
              {submitting ? "Submitting…" : "Submit Ticket"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Studio() {
  return <SystemDesignStudio slug="systemdesign-url-shortener" isStandaloneStudio={true} />;
}

export const LANDING_SAMPLE_DESIGN: Design = {
  nodes: [
    { id: "n1", kind: "web client", label: "Web Client", icon: "🖥️", x: 40, y: 160 },
    { id: "n2", kind: "load balancer", label: "Load Balancer", icon: "⚖️", x: 240, y: 160 },
    { id: "n3", kind: "url service", label: "URL Service (A)", icon: "⚙️", x: 460, y: 70 },
    { id: "n4", kind: "url service", label: "URL Service (B)", icon: "⚙️", x: 460, y: 250 },
    { id: "n5", kind: "redis", label: "Redis Cache", icon: "⚡", x: 700, y: 70 },
    { id: "n6", kind: "postgresql", label: "PostgreSQL", icon: "🐘", x: 700, y: 250 },
  ],
  edges: [
    { id: "n1-n2", from: "n1", to: "n2", label: "HTTPS" },
    { id: "n2-n3", from: "n2", to: "n3" },
    { id: "n2-n4", from: "n2", to: "n4" },
    { id: "n3-n5", from: "n3", to: "n5", label: "read cache" },
    { id: "n4-n6", from: "n4", to: "n6", label: "write / read miss" },
  ],
  seq: `sequenceDiagram
  autonumber
  actor U as User
  participant LB as Load Balancer
  participant S as URL Service
  participant C as Redis Cache
  participant DB as PostgreSQL
  U->>LB: GET /{shortCode}
  LB->>S: Route to available instance
  S->>C: GET {shortCode}
  alt Cache Hit
    C-->>S: Return original URL
  else Cache Miss
    S->>DB: SELECT original_url WHERE short_code = ?
    DB-->>S: Return original URL
    S->>C: SET {shortCode} = original_url (TTL 24h)
  end
  S-->>U: 302 Temporary Redirect (Location: URL)`,
  schema: `Table urls {
  id bigint [pk]
  short_code varchar(10) [unique]
  original_url text
  created_at timestamp
  expires_at timestamp
  clicks integer [default: 0]
}

Table users {
  id bigint [pk]
  email varchar [unique]
  created_at timestamp
}

Table analytics {
  id bigint [pk]
  url_id bigint [ref: > urls.id]
  ip_address varchar
  user_agent text
  visited_at timestamp
}`,
  apis: [
    {
      id: "a1",
      method: "POST",
      path: "/api/v1/urls",
      summary: "Create short URL",
      request: '{\n  "long_url": "https://yuvro.com/engineering/simulation-labs",\n  "custom_alias": "yvr-labs"\n}',
      status: "201 Created",
      response: '{\n  "short_code": "yvr-labs",\n  "short_url": "https://yvr.to/yvr-labs",\n  "created_at": "2026-10-29T00:00:00Z"\n}',
    },
    {
      id: "a2",
      method: "GET",
      path: "/{short_code}",
      summary: "Redirect to target URL",
      request: "",
      status: "302 Found",
      response: "Location: https://yuvro.com/engineering/simulation-labs",
    },
    {
      id: "a3",
      method: "GET",
      path: "/api/v1/urls/{short_code}/stats",
      summary: "URL click analytics",
      request: "",
      status: "200 OK",
      response: '{\n  "short_code": "yvr-labs",\n  "total_clicks": 3482,\n  "unique_visitors": 2105\n}',
    },
  ],
  notes: {
    hld: "## Architecture Notes\n- Stateless service replicas behind an L7 load balancer scale horizontally based on traffic\n- Redis cluster acts as a high-speed LRU cache for 95% of redirect reads\n- PostgreSQL handles persistent storage with read replicas across multiple availability zones",
    sequence: "## Redirect Flow\n- User issues GET for short code\n- Service queries Redis first (< 5ms latency)\n- On cache miss, queries DB, populates cache with 24h TTL, and returns 302 redirect",
    schema: "## Data Model\n- `urls` table indexed on `short_code` for O(1) B-tree lookup\n- Analytics recorded asynchronously to avoid redirect latency",
    api: "## Endpoint Contracts\n- POST /api/v1/urls generates unique short code\n- GET /{shortCode} returns 302 Found\n- GET /api/v1/urls/{shortCode}/stats returns click analytics",
  },
};

export const LANDING_DEFAULT_TICKET = {
  title: "Design a Scalable URL Shortener",
  tag: "System Design",
  difficulty: "Beginner",
  xp: 120,
  estMin: 35,
  status: "In Progress",
  description: `## Problem Overview
Design a distributed URL shortening service (like Bitly or TinyURL) that converts long URLs into compact, unique short links and redirects users with minimal latency.

### Core Requirements
1. **Shorten URL:** Accept a long URL and return a unique 7-character short link.
2. **Redirection:** When a user visits \`https://yvr.to/{shortCode}\`, immediately redirect them to the original URL (target latency < 10ms for cached links).
3. **High Availability & Caching:** Heavy read traffic (100:1 read-to-write ratio). Cache popular links in Redis to protect the primary database.
4. **Analytics & Durability:** Persist URL mappings in PostgreSQL and record access counts.

### Architecture Pillars
- **HLD:** Position Web Client, Load Balancer, stateless URL Service instances, Redis cache, and PostgreSQL database. Connect read & write paths.
- **Sequence:** Model client request flow for cache-hit and cache-miss redirection.
- **DB Schema:** Design \`urls\` and \`users\` tables with appropriate primary and unique keys in DBML.
- **REST API:** Define endpoints for creating links and retrieving click analytics.`,
  hints: [
    "Use a Load Balancer to distribute traffic evenly across stateless URL Service replicas.",
    "Place Redis in front of PostgreSQL to serve 90%+ of read requests directly from cache.",
    "Return HTTP 302 Found (Temporary Redirect) instead of 301 so all redirect requests pass through your service for accurate click analytics.",
  ],
  tasks: [
    { id: "t1", title: "Add Web Client, Load Balancer, URL Service and PostgreSQL", description: "Place core components on the canvas and establish primary HTTPS connectivity." },
    { id: "t2", title: "Add Redis Cache for read traffic", description: "Connect URL Service to Redis for low-latency cached redirection lookups." },
    { id: "t3", title: "Separate read and write paths", description: "Label edges to distinguish cache reads from database persistence writes." },
    { id: "t4", title: "Define sequence flow, DB schema, and API contracts", description: "Switch between Sequence, DB Schema, and REST API tabs to complete the design." },
  ],
  solution: {
    explanation: "A production URL shortener uses a multi-tier architecture: DNS/CDN → Layer 7 Load Balancer → Stateless URL Service cluster → In-memory Redis Cache Cluster (LRU eviction) → Multi-AZ PostgreSQL with read replicas. High availability is achieved through horizontal scaling of application nodes and active-passive database failover.",
  },
};

export function SystemDesignStudio({
  slug,
  ticketId,
  taskOverride,
  ticket,
  isLandingPage = false,
  isStandaloneStudio = false,
}: {
  slug: string;
  ticketId?: string;
  taskOverride?: { title?: string; description?: string };
  ticket?: any;
  isLandingPage?: boolean;
  isStandaloneStudio?: boolean;
}) {
  const isPureStudio = isStandaloneStudio || isLandingPage || !ticketId;
  const design = getSystemDesignLab(slug) ?? getSystemDesignLab("systemdesign-url-shortener");
  const lab = labs.find(l => l.slug === slug);
  const task = tickets.find(t => t.id === ticketId);
  const navigate = useNavigate();
  const [realLabTitle, setRealLabTitle] = useState<string | null>(null);

  const [ticketData, setTicketData] = useState<any>(ticket || null);
  const [loadingTicket, setLoadingTicket] = useState(!ticket && !!ticketId && !isPureStudio);

  useEffect(() => {
    if (!lab && slug && !isPureStudio) {
      import("@/lib/adminLabs").then(({ getLab }) => {
        getLab(slug).then((l) => {
          if (l?.title) setRealLabTitle(l.title);
        }).catch(() => {});
      });
    }
  }, [slug, lab, isPureStudio]);

  useEffect(() => {
    if (isPureStudio && !ticket) return;
    if (ticket) {
      setTicketData(ticket);
      setLoadingTicket(false);
      return;
    }
    if (!ticketId) return;

    const dummy = tickets.find((t) => t.id === ticketId);
    if (dummy) {
      setTicketData(dummy);
      setLoadingTicket(false);
      return;
    }

    let active = true;
    setLoadingTicket(true);
    restApiAuthUtil
      .get<any>(`/lab/tickets/${ticketId}/`)
      .then((t) => {
        if (!active) return;
        setTicketData({
          ...t,
          id: t.id,
          ticket_slug: t.ticket_slug,
          title: t.title,
          description: t.description ?? "",
          difficulty:
            t.difficulty === "HARD"
              ? "Advanced"
              : t.difficulty === "MEDIUM"
                ? "Intermediate"
                : "Beginner",
          xp: t.yuvro_points ?? 100,
          estMin: t.minutes_max ?? 30,
          tag: t.accepted_programming_languages?.[0] ?? t.tag ?? "System Design",
          status: t.status ?? "Not Started",
          hints: Array.isArray(t.hints) ? t.hints : [],
          solution: t.solution || {},
          tasks: Array.isArray(t.tasks) ? t.tasks : [],
          learning_objectives: Array.isArray(t.learning_objectives) ? t.learning_objectives : [],
          common_mistakes: Array.isArray(t.common_mistakes) ? t.common_mistakes : [],
        });
        setLoadingTicket(false);
      })
      .catch(() => {
        if (active) setLoadingTicket(false);
      });

    return () => {
      active = false;
    };
  }, [ticketId, ticket, isPureStudio]);

  const storageKey = isStandaloneStudio
    ? `${LS}:standalone`
    : isLandingPage
      ? `${LS}:landing`
      : `${LS}:${slug}:${ticketId ?? "sandbox"}`;
  const [saved] = useState<Partial<Design> | null>(() => {
    const s = loadState(storageKey);
    // If the saved content is the legacy default sample design, clear it so workspace starts blank
    if (
      s &&
      Array.isArray(s.nodes) &&
      s.nodes.some((item: any) => item.id === "n1" && item.label === "Web Client")
    ) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      return null;
    }
    return s;
  });
  const initialDesign =
    saved && (saved.nodes?.length || saved.seq || saved.schema || saved.apis?.length)
      ? saved
      : EMPTY;

  const subject = design?.subject ?? "System Design";
  const taskTitle = taskOverride?.title ?? ticketData?.title ?? task?.title ?? `Design ${subject}`;
  const taskDescription = taskOverride?.description ?? ticketData?.description ?? task?.description;
  const labDisplayName = lab?.name ?? realLabTitle ?? "System Design Lab";
  const [tab, setTab] = useState<Tab>("hld");
  const [nodes, setNodes] = useState<SDNode[]>(initialDesign?.nodes ?? EMPTY.nodes);
  const [edges, setEdges] = useState<SDEdge[]>(initialDesign?.edges ?? EMPTY.edges);
  const [seq, setSeq] = useState<string>(initialDesign?.seq ?? "");
  const [schema, setSchema] = useState<string>(initialDesign?.schema ?? "");
  const [apis, setApis] = useState<ApiEndpoint[]>(Array.isArray(initialDesign?.apis) ? initialDesign.apis : []);
  const [notes, setNotes] = useState<Notes>(() => {
    const n = initialDesign?.notes as unknown;
    return typeof n === "string" ? { hld: n } : (n as Notes) ?? {};
  });
  const setNote = (v: string) => setNotes(ns => ({ ...ns, [tab]: v }));
  const [showEx, setShowEx] = useState(false);
  const [referenceDesign, setReferenceDesign] = useState<Design | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [running, setRunning] = useState(false);
  const [evalResult, setEvalResult] = useState<SystemDesignEvaluationResult | null>(null);
  const [showEvalModal, setShowEvalModal] = useState(false);

  // Sidebar state (Problem, Hints, Solution)
  type SidebarTab = "problem" | "hints" | "solution";
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("problem");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [leftWidth, setLeftWidth] = useState(360);

  // Resize handler
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftWidth;
    const onMouseMove = (ev: MouseEvent) => {
      const newW = Math.max(260, Math.min(window.innerWidth * 0.5, startW + (ev.clientX - startX)));
      setLeftWidth(newW);
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Hints state
  const hints: string[] = useMemo(() => {
    if (Array.isArray(ticketData?.hints)) {
      return ticketData.hints.map((h: any) => (typeof h === "string" ? h : h.content || h.hint || JSON.stringify(h)));
    }
    return [];
  }, [ticketData?.hints]);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const toggleRevealHint = (idx: number) => {
    setRevealedHints(prev => prev.includes(idx) ? prev : [...prev, idx]);
    toast.success(`Hint ${idx + 1} revealed`);
  };

  // Solution state
  const [solutionRevealed, setSolutionRevealed] = useState(false);
  const solutionContent = useMemo(() => {
    if (!ticketData?.solution) return null;
    if (typeof ticketData.solution === "string") return ticketData.solution;
    if (typeof ticketData.solution === "object") {
      return (
        ticketData.solution.explanation ||
        ticketData.solution.description ||
        ticketData.solution.approach ||
        (ticketData.solution.raw_solution ? String(ticketData.solution.raw_solution) : null) ||
        JSON.stringify(ticketData.solution, null, 2)
      );
    }
    return null;
  }, [ticketData?.solution]);

  // Submission and Evaluation state
  const [submitting, setSubmitting] = useState(false);

  // Run evaluation
  const handleRun = async () => {
    setRunning(true);
    setShowEvalModal(true);
    const designPayload = { nodes, edges, seq, schema, apis, notes };

    try {
      if (ticketId) {
        const resp = await restApiAuthUtil.post<any>(`/lab/tickets/${ticketId}/system-design/`, {
          ...designPayload,
          action: "evaluate",
          is_submitted: false,
        });

        const rawEval = resp?.evaluation || resp?.solution_output;
        let finalResult: SystemDesignEvaluationResult;

        if (rawEval) {
          const parsed = typeof rawEval === "string" ? JSON.parse(rawEval) : rawEval;
          const pct = Math.round(Number(parsed.percentage ?? parsed.total_score ?? parsed.overall_score ?? 0));
          const rawTasks = parsed.tasks || parsed.task_breakdown || [];
          const tasks = rawTasks.map((t: any, idx: number) => ({
            id: t.id || `task_${idx + 1}`,
            title: t.title || t.task_title || `Task ${idx + 1}`,
            description: t.description,
            passed: Boolean(t.passed ?? (t.status === "passed")),
            score: Number(t.score ?? 0),
            maxScore: Number(t.maxScore ?? t.max_score ?? 25),
            feedback: t.feedback || "",
          }));

          const passedCount = parsed.passedCount ?? parsed.passed_count ?? tasks.filter((t: any) => t.passed).length;
          const totalCount = parsed.totalCount ?? parsed.total_count ?? (tasks.length || 4);

          finalResult = {
            totalScore: pct,
            maxPossibleScore: 100,
            percentage: pct,
            passedCount,
            totalCount,
            status: pct >= 70 ? "passed" : "needs_work",
            tasks,
            summary: Array.isArray(parsed.summary) ? parsed.summary : [parsed.summary || `Design evaluated: ${pct}%`],
            metrics: {
              nodeCount: parsed.metrics?.nodeCount ?? parsed.metrics?.node_count ?? nodes.length,
              edgeCount: parsed.metrics?.edgeCount ?? parsed.metrics?.edge_count ?? edges.length,
              hasSequence: Boolean(parsed.metrics?.hasSequence ?? parsed.metrics?.has_sequence ?? seq.trim()),
              hasSchema: Boolean(parsed.metrics?.hasSchema ?? parsed.metrics?.has_schema ?? schema.trim()),
              apiCount: parsed.metrics?.apiCount ?? parsed.metrics?.api_count ?? apis.length,
              hasNotes: Boolean(parsed.metrics?.hasNotes ?? parsed.metrics?.has_notes ?? (notes && Object.values(notes).some(Boolean))),
            },
          };
        } else {
          finalResult = evaluateSystemDesign(designPayload, ticketData);
        }

        setEvalResult(finalResult);
        toast.success(`Design evaluated: ${finalResult.percentage}% (${finalResult.passedCount}/${finalResult.totalCount} tasks passed)`);
      } else {
        const localResult = evaluateSystemDesign(designPayload, ticketData);
        setEvalResult(localResult);
        toast.success(`Design evaluated: ${localResult.percentage}% (${localResult.passedCount}/${localResult.totalCount} tasks passed)`);
      }
    } catch (e) {
      console.error("Evaluation request error:", e);
      const fallbackResult = evaluateSystemDesign(designPayload, ticketData);
      setEvalResult(fallbackResult);
      toast.success(`Design evaluated: ${fallbackResult.percentage}% (${fallbackResult.passedCount}/${fallbackResult.totalCount} tasks passed)`);
    } finally {
      setRunning(false);
    }
  };

  // Submit and save completed ticket
  const handleSubmit = async () => {
    setSubmitting(true);
    const designPayload = { nodes, edges, seq, schema, apis, notes };
    const result = evalResult || evaluateSystemDesign(designPayload, ticketData);
    setEvalResult(result);

    const isPassed = (result?.percentage ?? 0) >= 70;

    try {
      if (ticketId) {
        const resp = await restApiAuthUtil.post<any>(`/lab/tickets/${ticketId}/system-design/`, {
          ...designPayload,
          is_submitted: true,
          status: isPassed ? "done" : "in_progress",
          solution_output: result,
        });
        setTicketData((prev: any) =>
          prev ? { ...prev, status: isPassed ? "Done" : "In Progress", yuvro_points: resp?.yuvro_points ?? prev.yuvro_points } : prev
        );
      }
      if (isPassed) {
        toast.success("Ticket submitted and passed successfully!");
      } else {
        toast.error(`Submission incomplete: scored ${result?.percentage ?? 0}% (needs 70% to pass)`);
      }

      if (ticketId && slug) {
        navigate({
          to: "/student/lab/$slug/ticket/$ticketId/review",
          params: { slug, ticketId },
        });
      }
    } catch {
      toast.error("Failed to submit ticket. Saved progress locally.");
    } finally {
      setSubmitting(false);
    }
  };

  // Sync / Load design from backend
  useEffect(() => {
    if (!ticketId || isLandingPage) {
      setHasInitialized(true);
      return;
    }
    let active = true;
    restApiAuthUtil
      .get<any>(`/lab/tickets/${ticketId}/system-design/`)
      .then((res) => {
        if (!active || !res) return;
        const ref = res.reference_design || res.template_design || ticketData?.system_design;
        if (ref) {
          setReferenceDesign(ref);
        }

        // Restore past evaluation if present
        if (res.solution_output) {
          try {
            const parsed = typeof res.solution_output === "string" ? JSON.parse(res.solution_output) : res.solution_output;
            if (parsed && typeof parsed.percentage === "number") {
              setEvalResult(parsed);
            }
          } catch {}
        }

        // ONLY load user_design if the user previously worked and saved their own work
        if (
          res.user_design &&
          (res.user_design.nodes?.length ||
            res.user_design.seq ||
            res.user_design.schema ||
            res.user_design.apis?.length)
        ) {
          if (Array.isArray(res.user_design.nodes)) setNodes(res.user_design.nodes);
          if (Array.isArray(res.user_design.edges)) setEdges(res.user_design.edges);
          if (typeof res.user_design.seq === "string") setSeq(res.user_design.seq);
          if (typeof res.user_design.schema === "string") setSchema(res.user_design.schema);
          if (Array.isArray(res.user_design.apis)) setApis(res.user_design.apis);
          if (res.user_design.notes && typeof res.user_design.notes === "object") setNotes(res.user_design.notes);
        } else if (res.starter_design && (res.starter_design.nodes?.length || res.starter_design.seq)) {
          // If the problem provides starter boilerplate
          if (Array.isArray(res.starter_design.nodes)) setNodes(res.starter_design.nodes);
          if (Array.isArray(res.starter_design.edges)) setEdges(res.starter_design.edges);
          if (typeof res.starter_design.seq === "string") setSeq(res.starter_design.seq);
          if (typeof res.starter_design.schema === "string") setSchema(res.starter_design.schema);
          if (Array.isArray(res.starter_design.apis)) setApis(res.starter_design.apis);
          if (res.starter_design.notes && typeof res.starter_design.notes === "object") setNotes(res.starter_design.notes);
        }
        if (res.status) {
          setTicketData((prev: any) =>
            prev ? { ...prev, status: res.status === "done" ? "Done" : res.status } : prev
          );
        }
        setHasInitialized(true);
      })
      .catch(() => {
        if (active) setHasInitialized(true);
      });
    return () => {
      active = false;
    };
  }, [ticketId]);

  // Debounced auto-save to localStorage & backend
  useEffect(() => {
    if (!hasInitialized) return;
    const t = setTimeout(() => {
      const designPayload = { nodes, edges, seq, schema, apis, notes };
      localStorage.setItem(storageKey, JSON.stringify(designPayload));

      if (ticketId) {
        restApiAuthUtil
          .post(`/lab/tickets/${ticketId}/system-design/`, {
            ...designPayload,
            is_submitted: false,
          })
          .catch(() => {});
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [nodes, edges, seq, schema, apis, notes, storageKey, ticketId, hasInitialized]);

  const apply = (d: Design) => { setNodes(d.nodes); setEdges(d.edges); setSeq(d.seq); setSchema(d.schema); setApis(d.apis); setNotes(d.notes); };
  const useTab = (d: Design) => {
    if (tab === "hld") { setNodes(d.nodes); setEdges(d.edges); }
    if (tab === "sequence") setSeq(d.seq);
    if (tab === "schema") setSchema(d.schema);
    if (tab === "api") setApis(d.apis);
    setNotes(ns => ({ ...ns, [tab]: d.notes[tab] ?? "" }));
    setShowEx(false);
  };
  type ImportTarget = "all" | "current" | "hld" | "sequence" | "schema" | "api";
  const importTargetRef = useRef<ImportTarget>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabLabel = (t: Tab) => {
    if (t === "hld") return "HLD Architecture";
    if (t === "sequence") return "Sequence Diagram";
    if (t === "schema") return "DB Schema";
    if (t === "api") return "REST API";
    return t;
  };

  const triggerImport = (target: ImportTarget) => {
    importTargetRef.current = target;
    if (fileInputRef.current) {
      if (target === "sequence") {
        fileInputRef.current.accept = ".mmd,.txt,.json";
      } else if (target === "schema") {
        fileInputRef.current.accept = ".dbml,.sql,.txt,.json";
      } else if (target === "current") {
        if (tab === "sequence") fileInputRef.current.accept = ".mmd,.txt,.json";
        else if (tab === "schema") fileInputRef.current.accept = ".dbml,.sql,.txt,.json";
        else fileInputRef.current.accept = ".json,application/json";
      } else {
        fileInputRef.current.accept = ".json,application/json";
      }
      fileInputRef.current.click();
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetMode = importTargetRef.current;
    const effectiveTarget = targetMode === "current" ? tab : targetMode;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || "";

        if (effectiveTarget === "sequence") {
          try {
            const parsed = JSON.parse(text);
            const raw = parsed.tabs?.sequence?.code || parsed.sequence?.code || parsed.seq || parsed.sequence || text;
            const finalSeq = typeof raw === "string" ? raw : text;
            setSeq(finalSeq);
            saveState(storageKey, { nodes, edges, seq: finalSeq, schema, apis, notes });
          } catch {
            setSeq(text);
            saveState(storageKey, { nodes, edges, seq: text, schema, apis, notes });
          }
          toast.success("Sequence diagram imported successfully into active tab");
          return;
        }

        if (effectiveTarget === "schema") {
          try {
            const parsed = JSON.parse(text);
            const raw = parsed.tabs?.schema?.dbml || parsed.schema?.dbml || parsed.schema || parsed.db_schema || text;
            const finalSchema = typeof raw === "string" ? raw : text;
            setSchema(finalSchema);
            saveState(storageKey, { nodes, edges, seq, schema: finalSchema, apis, notes });
          } catch {
            setSchema(text);
            saveState(storageKey, { nodes, edges, seq, schema: text, apis, notes });
          }
          toast.success("DBML schema imported successfully into active tab");
          return;
        }

        if (effectiveTarget === "api") {
          const parsed = JSON.parse(text);
          const raw = Array.isArray(parsed)
            ? parsed
            : parsed.tabs?.api?.endpoints || parsed.api?.endpoints || parsed.apis || parsed.api_endpoints || parsed.endpoints || [];
          if (Array.isArray(raw)) {
            setApis(raw);
            saveState(storageKey, { nodes, edges, seq, schema, apis: raw, notes });
            toast.success(`Imported ${raw.length} REST API endpoints into active tab`);
          } else {
            toast.error("Invalid API format in JSON");
          }
          return;
        }

        if (effectiveTarget === "hld") {
          const parsed = JSON.parse(text);
          const raw = parsed.tabs?.hld || parsed.hld || parsed.architecture || parsed;
          const newNodes: SDNode[] = Array.isArray(raw.nodes) ? raw.nodes : Array.isArray(parsed.nodes) ? parsed.nodes : [];
          const newEdges: SDEdge[] = Array.isArray(raw.edges) ? raw.edges : Array.isArray(parsed.edges) ? parsed.edges : [];
          setNodes(newNodes);
          setEdges(newEdges);
          saveState(storageKey, { nodes: newNodes, edges: newEdges, seq, schema, apis, notes });
          toast.success(`Imported HLD Architecture (${newNodes.length} nodes, ${newEdges.length} connections)`);
          return;
        }

        // DEFAULT: "all" — Import All 4 Tabs at Once
        const parsed = JSON.parse(text);
        const raw = parsed.design || parsed.user_design || parsed.template_design || parsed;

        const importedNodes: SDNode[] = Array.isArray(raw.nodes)
          ? raw.nodes
          : Array.isArray(raw.tabs?.hld?.nodes)
            ? raw.tabs.hld.nodes
            : Array.isArray(raw.hld?.nodes)
              ? raw.hld.nodes
              : Array.isArray(raw.architecture?.nodes)
                ? raw.architecture.nodes
                : nodes;

        const importedEdges: SDEdge[] = Array.isArray(raw.edges)
          ? raw.edges
          : Array.isArray(raw.tabs?.hld?.edges)
            ? raw.tabs.hld.edges
            : Array.isArray(raw.hld?.edges)
              ? raw.hld.edges
              : Array.isArray(raw.architecture?.edges)
                ? raw.architecture.edges
                : edges;

        const importedSeq: string =
          typeof raw.seq === "string"
            ? raw.seq
            : typeof raw.tabs?.sequence?.code === "string"
              ? raw.tabs.sequence.code
              : typeof raw.sequence?.code === "string"
                ? raw.sequence.code
                : typeof raw.sequence === "string"
                  ? raw.sequence
                  : seq;

        const importedSchema: string =
          typeof raw.schema === "string"
            ? raw.schema
            : typeof raw.tabs?.schema?.dbml === "string"
              ? raw.tabs.schema.dbml
              : typeof raw.schema?.dbml === "string"
                ? raw.schema.dbml
                : typeof raw.db_schema === "string"
                  ? raw.db_schema
                  : schema;

        const importedApis: ApiEndpoint[] = Array.isArray(raw.apis)
          ? raw.apis
          : Array.isArray(raw.tabs?.api?.endpoints)
            ? raw.tabs.api.endpoints
            : Array.isArray(raw.api?.endpoints)
              ? raw.api.endpoints
              : Array.isArray(raw.api_endpoints)
                ? raw.api_endpoints
                : Array.isArray(raw.endpoints)
                  ? raw.endpoints
                  : apis;

        const importedNotes: Notes =
          typeof raw.notes === "object" && raw.notes !== null
            ? { ...notes, ...raw.notes }
            : typeof raw.tabs === "object" && raw.tabs !== null
              ? {
                  hld: raw.tabs.hld?.notes || notes.hld || "",
                  sequence: raw.tabs.sequence?.notes || notes.sequence || "",
                  schema: raw.tabs.schema?.notes || notes.schema || "",
                  api: raw.tabs.api?.notes || notes.api || "",
                }
              : notes;

        const importedDesign: Design = {
          nodes: importedNodes,
          edges: importedEdges,
          seq: importedSeq,
          schema: importedSchema,
          apis: importedApis,
          notes: importedNotes,
        };

        apply(importedDesign);
        saveState(storageKey, importedDesign);
        toast.success(
          `Imported all 4 tabs at once: HLD (${importedNodes.length} nodes), Sequence, DBML Schema & REST APIs (${importedApis.length} endpoints)`
        );
      } catch (err: any) {
        console.error("Failed to import file:", err);
        toast.error("Failed to parse file. Please check file format and try again.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Export All 4 Tabs at Once
  const exportAll4 = () => {
    const payload = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      slug,
      title: taskTitle || "System Design",
      tabs: {
        hld: { nodes, edges, notes: notes.hld ?? "" },
        sequence: { code: seq, notes: notes.sequence ?? "" },
        schema: { dbml: schema, notes: notes.schema ?? "" },
        api: { endpoints: apis, notes: notes.api ?? "" },
      },
      nodes,
      edges,
      seq,
      schema,
      apis,
      notes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug || "system-design"}-complete-all-4-tabs.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Exported all 4 tabs at once (HLD, Sequence, DB Schema, REST APIs) as JSON");
  };

  const exportHld = () => {
    const payload = { nodes, edges, notes: notes.hld ?? "" };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug || "system-design"}-hld-architecture.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Exported HLD Architecture as JSON");
  };

  const exportSequence = () => {
    const blob = new Blob([seq || "// No sequence diagram defined"], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug || "system-design"}-sequence.mmd`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Exported Mermaid Sequence Diagram (.mmd)");
  };

  const exportSchema = () => {
    const blob = new Blob([schema || "// No DBML schema defined"], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug || "system-design"}-schema.dbml`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Exported DBML Schema (.dbml)");
  };

  const exportApis = () => {
    const payload = { endpoints: apis, notes: notes.api ?? "" };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug || "system-design"}-apis.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Exported REST API endpoints as JSON");
  };

  const exportCurrentTab = () => {
    if (tab === "hld") exportHld();
    else if (tab === "sequence") exportSequence();
    else if (tab === "schema") exportSchema();
    else if (tab === "api") exportApis();
  };

  const [showClearWorkspaceDialog, setShowClearWorkspaceDialog] = useState(false);

  const handleConfirmClearWorkspace = () => {
    localStorage.removeItem(storageKey);
    apply(EMPTY);
    if (ticketId && !isLandingPage) {
      restApiAuthUtil
        .post(`/lab/tickets/${ticketId}/system-design/`, {
          ...EMPTY,
          is_submitted: false,
        })
        .catch(() => {});
    }
    setShowClearWorkspaceDialog(false);
    toast.success("Workspace reset to blank canvas");
  };
  const empty = (what: string) => <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground"><div>Nothing to preview yet.<br />Write {what} on the left, or click <b>Examples</b>.</div></div>;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; sub: string }[] = [
    { id: "hld", label: "HLD · Architecture", icon: <Boxes className="h-3.5 w-3.5" />, sub: "Drag & drop" },
    { id: "sequence", label: "Sequence", icon: <GitBranch className="h-3.5 w-3.5" />, sub: "Mermaid" },
    { id: "schema", label: "DB Schema", icon: <Database className="h-3.5 w-3.5" />, sub: "DBML" },
    { id: "api", label: "REST API", icon: <FileText className="h-3.5 w-3.5" />, sub: "Endpoints" },
  ];

  return (
    <div className={`flex flex-col bg-background ${isLandingPage ? "h-full w-full" : "h-screen"}`}>
      {/* Top Header */}
      <header className="flex flex-wrap items-center gap-2 border-b px-3 py-1.5 bg-card shrink-0">
        {isStandaloneStudio ? (
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Home
            </Link>
            <div className="h-4 w-px bg-border mx-1" />
            <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <Boxes className="h-4 w-4 text-primary" />
              System Design Studio
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium font-mono uppercase tracking-wider">
              Live Studio
            </span>
          </div>
        ) : isLandingPage ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <Boxes className="h-3.5 w-3.5 text-primary" />
              System Design Studio
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium font-mono uppercase tracking-wider">
              Live Sandbox
            </span>
          </div>
        ) : (
          <>
            <Link
              to="/student/lab/$slug"
              params={{ slug }}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <ArrowLeft className="h-3 w-3" />
              Exit
            </Link>
            <button
              onClick={() => setLeftCollapsed((v) => !v)}
              title="Toggle problem panel"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              {leftCollapsed ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{leftCollapsed ? "Show" : "Hide"} panel</span>
            </button>

            <div className="h-4 w-px bg-border mx-1" />
            <StatusBadge value={(ticketData?.status || "Not Started") as any} />
            <DiffBadge value={(ticketData?.difficulty || "Advanced") as any} />
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Zap className="h-3 w-3 text-primary" />+{ticketData?.xp || 180} YP
            </span>
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Est. {ticketData?.estMin || 40}m
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5 text-xs">
          {!isPureStudio && evalResult && (
            <button
              onClick={() => setShowEvalModal(true)}
              title="Click to view evaluation details"
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold border transition-colors ${
                evalResult.percentage >= 70
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Score: {evalResult.percentage}%
            </button>
          )}

          {/* Hidden File Input for Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            className="hidden"
          />

          {/* Import Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border inline-flex items-center gap-1 font-medium"
                title="Import system design files"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Import Options
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => triggerImport("all")}
                className="cursor-pointer flex flex-col items-start py-2 focus:bg-primary/10"
              >
                <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                  <Boxes className="h-3.5 w-3.5 text-primary" />
                  Import All 4 Tabs at Once
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  Loads HLD, Sequence, DBML & REST APIs simultaneously from a full design JSON
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => triggerImport("current")}
                className="cursor-pointer flex flex-col items-start py-2"
              >
                <span className="font-medium text-xs flex items-center gap-1.5 text-foreground">
                  <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Import Active Tab Only ({tabLabel(tab)})
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  Updates only {tabLabel(tab)}, leaves other 3 tabs untouched
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => triggerImport("hld")} className="text-xs cursor-pointer py-1.5">
                <Boxes className="h-3.5 w-3.5 mr-2 text-amber-600" />
                Import HLD Architecture (.json)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => triggerImport("sequence")} className="text-xs cursor-pointer py-1.5">
                <GitBranch className="h-3.5 w-3.5 mr-2 text-blue-600" />
                Import Sequence Diagram (.mmd, .txt)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => triggerImport("schema")} className="text-xs cursor-pointer py-1.5">
                <Database className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                Import DB Schema (.dbml, .sql, .txt)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => triggerImport("api")} className="text-xs cursor-pointer py-1.5">
                <FileText className="h-3.5 w-3.5 mr-2 text-purple-600" />
                Import REST APIs (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border inline-flex items-center gap-1 font-medium"
                title="Export system design files"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Export Options
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={exportAll4}
                className="cursor-pointer flex flex-col items-start py-2 focus:bg-primary/10"
              >
                <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                  <Boxes className="h-3.5 w-3.5 text-primary" />
                  Export All 4 Tabs at Once
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  Downloads complete JSON with HLD, Sequence, DBML Schema & REST APIs
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={exportCurrentTab}
                className="cursor-pointer flex flex-col items-start py-2"
              >
                <span className="font-medium text-xs flex items-center gap-1.5 text-foreground">
                  <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Export Active Tab Only ({tabLabel(tab)})
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  Downloads only {tabLabel(tab)} file
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportHld} className="text-xs cursor-pointer py-1.5">
                <Boxes className="h-3.5 w-3.5 mr-2 text-amber-600" />
                Export HLD Architecture (.json)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportSequence} className="text-xs cursor-pointer py-1.5">
                <GitBranch className="h-3.5 w-3.5 mr-2 text-blue-600" />
                Export Sequence Diagram (.mmd)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportSchema} className="text-xs cursor-pointer py-1.5">
                <Database className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                Export DB Schema (.dbml)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportApis} className="text-xs cursor-pointer py-1.5">
                <FileText className="h-3.5 w-3.5 mr-2 text-purple-600" />
                Export REST APIs (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowEx(true)}>
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Examples
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearWorkspaceDialog(true)}
            className="h-7 text-xs border"
            title="Clear canvas"
          >
            Clear
          </Button>
          {isLandingPage && (
            <Link
              to="/system-design-studio"
              className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2.5 py-1 text-xs font-medium hover:bg-primary/90 transition shadow-xs ml-1"
              title="Open dedicated full-screen System Design Studio"
            >
              <span>Full Screen</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {!isPureStudio && (
            <>
              <Button
                size="sm"
                onClick={handleRun}
                disabled={running}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs inline-flex items-center gap-1 ml-1"
                title="Evaluate design against requirements and get score"
              >
                {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                {running ? "Evaluating…" : "Run"}
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
                className="h-7 text-xs bg-primary text-primary-foreground font-medium shadow-xs inline-flex items-center gap-1"
                title="Submit and save completed ticket"
              >
                <Send className="h-3 w-3 mr-1" />
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Body: Left Sidebar + Right Studio Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar: Problem / Hints / Solution */}
        {!isPureStudio && (
          leftCollapsed ? (
          <aside className="w-10 border-r bg-card flex flex-col items-center py-2 text-muted-foreground gap-1 shrink-0">
            <button
              onClick={() => {
                setLeftCollapsed(false);
                setSidebarTab("problem");
              }}
              title="Problem Statement"
              className={`grid h-8 w-8 place-items-center rounded hover:bg-accent hover:text-foreground ${
                sidebarTab === "problem" ? "text-primary bg-primary/10" : ""
              }`}
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setLeftCollapsed(false);
                setSidebarTab("hints");
              }}
              title="Hints"
              className={`grid h-8 w-8 place-items-center rounded hover:bg-accent hover:text-foreground ${
                sidebarTab === "hints" ? "text-primary bg-primary/10" : ""
              }`}
            >
              <Lightbulb className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setLeftCollapsed(false);
                setSidebarTab("solution");
              }}
              title="Solution"
              className={`grid h-8 w-8 place-items-center rounded hover:bg-accent hover:text-foreground ${
                sidebarTab === "solution" ? "text-primary bg-primary/10" : ""
              }`}
            >
              <Key className="h-4 w-4" />
            </button>
            <button
              onClick={() => setLeftCollapsed(false)}
              title="Expand panel"
              className="mt-auto grid h-8 w-8 place-items-center rounded hover:bg-accent hover:text-foreground"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </aside>
        ) : (
          <>
            <aside
              style={{ width: `${leftWidth}px` }}
              className="flex flex-col border-r bg-card shrink-0 min-w-[260px] max-w-[55vw]"
            >
              {/* Sidebar Tabs */}
              <div className="flex items-center border-b text-xs px-1 bg-muted/20">
                <button
                  onClick={() => setSidebarTab("problem")}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                    sidebarTab === "problem"
                      ? "border-primary text-foreground bg-card"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Problem
                </button>
                <button
                  onClick={() => setSidebarTab("hints")}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                    sidebarTab === "hints"
                      ? "border-primary text-foreground bg-card"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  Hints
                  {hints.length > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                      {hints.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSidebarTab("solution")}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                    sidebarTab === "solution"
                      ? "border-primary text-foreground bg-card"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Key className="h-3.5 w-3.5" />
                  Solution
                </button>
                <button
                  onClick={() => setLeftCollapsed(true)}
                  title="Collapse panel"
                  className="ml-auto mr-1 grid h-7 w-7 place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Sidebar Body */}
              <div className="flex-1 overflow-y-auto p-4 text-xs space-y-4">
                {sidebarTab === "problem" && (
                  <div className="space-y-4">
                    <div>
                      <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {ticketData?.tag || "System Design"}
                      </span>
                      <h2 className="text-base font-semibold mt-1.5 text-foreground leading-snug">
                        {taskTitle}
                      </h2>
                    </div>

                    <div className="text-muted-foreground leading-relaxed prose prose-xs dark:prose-invert max-w-none [&>h3]:text-foreground [&>h3]:font-semibold [&>h3]:text-sm [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:mb-2 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[11px] [&_code]:font-mono">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {taskDescription || "Design a robust, scalable system fulfilling the architecture requirements."}
                      </ReactMarkdown>
                    </div>

                    {/* Tasks / Acceptance Criteria */}
                    {Array.isArray(ticketData?.tasks) && ticketData.tasks.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Acceptance Criteria & Tasks
                          </div>
                          {evalResult && (
                            <span className="text-[10px] font-mono font-medium text-muted-foreground">
                              {evalResult.passedCount}/{evalResult.totalCount} passed
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          {ticketData.tasks.map((taskItem: any, idx: number) => {
                            const tTitle =
                              typeof taskItem === "string" ? taskItem : (taskItem.title || `Task ${idx + 1}`);
                            const tDesc = typeof taskItem === "object" ? taskItem.description : null;
                            const taskEval = evalResult?.tasks?.[idx];
                            const isPassed = taskEval?.passed;

                            return (
                              <div
                                key={idx}
                                className={`rounded-md border p-2.5 transition-colors ${
                                  taskEval
                                    ? isPassed
                                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                                      : "border-border bg-muted/20"
                                    : "border-border bg-muted/20"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <span
                                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-[10px] font-bold ${
                                      taskEval
                                        ? isPassed
                                          ? "bg-emerald-500 text-white"
                                          : "bg-muted text-muted-foreground"
                                        : "bg-primary/10 text-primary"
                                    }`}
                                  >
                                    {taskEval && isPassed ? "✓" : idx + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="font-medium text-foreground">{tTitle}</div>
                                      {taskEval && (
                                        <span
                                          className={`shrink-0 font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                            isPassed
                                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                              : "border-muted bg-muted/40 text-muted-foreground"
                                          }`}
                                        >
                                          {taskEval.score}/{taskEval.maxScore} pts
                                        </span>
                                      )}
                                    </div>
                                    {tDesc && (
                                      <p className="mt-0.5 text-muted-foreground text-[11px] leading-relaxed">
                                        {tDesc}
                                      </p>
                                    )}
                                    {taskEval && (
                                      <p
                                        className={`mt-1 text-[11px] font-mono leading-tight ${
                                          isPassed
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-amber-600 dark:text-amber-400"
                                        }`}
                                      >
                                        {isPassed ? "✓ " : "• "}
                                        {taskEval.feedback}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Learning Objectives */}
                    {Array.isArray(ticketData?.learning_objectives) && ticketData.learning_objectives.length > 0 && (
                      <div className="border-t pt-3 space-y-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          🎯 Learning Objectives
                        </div>
                        <ul className="space-y-1 text-muted-foreground text-[11px]">
                          {ticketData.learning_objectives.map((obj: any, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-success shrink-0 mt-0.5">✓</span>
                              <span>{typeof obj === "string" ? obj : obj.title || JSON.stringify(obj)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Common Mistakes */}
                    {Array.isArray(ticketData?.common_mistakes) && ticketData.common_mistakes.length > 0 && (
                      <div className="border-t pt-3 space-y-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          ⚠️ Common Mistakes
                        </div>
                        <ul className="space-y-1 text-muted-foreground text-[11px]">
                          {ticketData.common_mistakes.map((m: any, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-warning shrink-0 mt-0.5">•</span>
                              <span>{typeof m === "string" ? m : m.description || m.title || JSON.stringify(m)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {sidebarTab === "hints" && (
                  <div className="space-y-3">
                    {hints.length === 0 ? (
                      <div className="text-center py-8 border rounded-md bg-muted/10">
                        <Lightbulb className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                        <h4 className="text-xs font-medium text-foreground mb-1">No Hints Available</h4>
                        <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto">
                          No hints have been added to this ticket yet.
                        </p>
                      </div>
                    ) : (
                      hints.map((hintText, idx) => {
                        const isRevealed = revealedHints.includes(idx);
                        return (
                          <div key={idx} className="rounded-md border bg-card p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground inline-flex items-center gap-1.5 text-xs">
                                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                                Hint {idx + 1}
                              </span>
                              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                                {isRevealed ? <Unlock className="h-3 w-3 text-success" /> : <Lock className="h-3 w-3" />}
                                {isRevealed ? "Revealed" : "Locked"}
                              </span>
                            </div>
                            {isRevealed ? (
                              <div className="rounded bg-muted/40 p-2 text-foreground font-mono text-[11px] whitespace-pre-wrap border border-border/50">
                                {hintText}
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleRevealHint(idx)}
                                className="w-full text-xs h-7"
                              >
                                Reveal Hint
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {sidebarTab === "solution" && (
                  <div className="space-y-3">
                    {!solutionRevealed ? (
                      <div className="text-center py-8 border rounded-md bg-muted/10 p-4 space-y-3">
                        <Key className="w-7 h-7 text-muted-foreground mx-auto" />
                        <div>
                          <h4 className="text-xs font-semibold text-foreground">Reference Solution</h4>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Reveal reference design rationale, component trade-offs and recommended architecture.
                          </p>
                        </div>
                        <Button size="sm" onClick={() => setSolutionRevealed(true)} className="h-7 text-xs">
                          Reveal Solution
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="font-semibold text-foreground inline-flex items-center gap-1.5">
                              <Key className="h-3.5 w-3.5 text-primary" />
                              Solution Architecture
                            </span>
                            <span className="text-[10px] text-success font-medium">Revealed</span>
                          </div>
                          {solutionContent ? (
                            <div className="prose prose-xs dark:prose-invert max-w-none text-muted-foreground text-[11px]">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {solutionContent}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground leading-relaxed">
                              Review the reference architecture nodes, database relationships, and sequence flows.
                            </div>
                          )}
                        </div>

                        <div className="rounded-md border p-3 bg-card space-y-2">
                          <div className="text-xs font-medium text-foreground">Reference Architecture</div>
                          <p className="text-[11px] text-muted-foreground">
                            Load the complete system design solution into the canvas tabs (HLD, Sequence, DBML, REST API).
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7"
                            onClick={() => apply(referenceDesign ?? scenarioExample(slug))}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Load Reference Design
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>

            {/* Draggable resize handle */}
            <div
              onMouseDown={startResize}
              className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors shrink-0 z-10"
              title="Drag to resize sidebar"
            />
          </>
        )
      )}

        {/* Right side: Studio navigation and canvas/editors */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Subnav */}
          <nav className="flex flex-wrap gap-1 border-b px-3 bg-card shrink-0">
            {TABS.map(t => (
              <Button
                variant="ghost"
                size="sm"
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px inline-flex items-center gap-1.5 rounded-none border-b-2 px-3 py-2 text-xs ${
                  tab === t.id
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                {t.label}
                <span className="text-[10px] text-muted-foreground">· {t.sub}</span>
              </Button>
            ))}
          </nav>

          {/* Active Tool Area */}
          <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1">
              {tab === "hld" && <HldEditor nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} />}
              {tab === "sequence" && (
                <SplitEditor
                  value={seq}
                  onChange={setSeq}
                  hint="Mermaid sequenceDiagram — live preview"
                  preview={seq.trim() ? <MermaidView code={seq} /> : empty("a sequenceDiagram")}
                />
              )}
              {tab === "schema" && (
                <SplitEditor
                  value={schema}
                  onChange={setSchema}
                  hint="dbdiagram.io-style DBML: Table name { col type [pk, unique, ref: > other.id] }"
                  preview={schema.trim() ? <ErdBoard src={schema} /> : empty("tables in DBML")}
                />
              )}
              {tab === "api" && (
                <ApiDesigner
                  key={apis.map(a => a.id).join() ? "has" : "none"}
                  apis={apis}
                  setApis={setApis}
                />
              )}
            </div>
            <NotesPanel key={tab} value={notes[tab] ?? ""} onChange={setNote} title={TABS.find(t => t.id === tab)!.label} />
          </div>
        </div>
      </div>

      {showEx && <ExamplesDialog tab={tab} scenario={scenarioExample(slug)} subject={subject} onClose={() => setShowEx(false)}
        onUseTab={useTab} onLoadAll={d => { apply(d); setShowEx(false); }} />}
      {showEvalModal && (
        <EvaluationModal
          result={evalResult}
          loading={running}
          onClose={() => setShowEvalModal(false)}
          onSubmit={() => {
            setShowEvalModal(false);
            handleSubmit();
          }}
          submitting={submitting}
        />
      )}

      {/* Clear Workspace Dialog */}
      <AlertDialog open={showClearWorkspaceDialog} onOpenChange={setShowClearWorkspaceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear Entire Workspace?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This will remove all components from your HLD architecture canvas, Sequence diagrams, DBML schema, REST API endpoints, and notes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClearWorkspace}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

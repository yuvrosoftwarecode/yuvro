import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ApiEndpoint = { id: string; method: string; path: string; summary?: string; request?: string; status?: string; response?: string };
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const METHOD_CLS: Record<string, string> = {
  GET: "bg-primary/15 text-primary", POST: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400", PATCH: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  DELETE: "bg-destructive/15 text-destructive",
};
export const MethodBadge = ({ m }: { m: string }) => <span className={`inline-block w-14 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[10px] font-bold ${METHOD_CLS[m] ?? "bg-muted"}`}>{m}</span>;

function jsonError(s?: string) {
  if (!s?.trim()) return "";
  try { JSON.parse(s); return ""; } catch { return "Not valid JSON (allowed, but check it)"; }
}

/** Read-only API reference view. */
export function ApiDocs({ apis }: { apis: ApiEndpoint[] }) {
  if (!apis.length) return <div className="grid h-full place-items-center text-sm text-muted-foreground">No endpoints yet.</div>;
  return (
    <div className="h-full space-y-3 overflow-auto p-4">
      {apis.map(a => (
        <div key={a.id} className="rounded-lg border bg-card">
          <div className="flex items-center gap-2 border-b px-3 py-2"><MethodBadge m={a.method} /><code className="font-mono text-xs">{a.path}</code><span className="ml-2 truncate text-xs text-muted-foreground">{a.summary}</span></div>
          <div className="grid gap-2 p-3 md:grid-cols-2">
            <div><div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Request</div><pre className="overflow-auto rounded bg-muted p-2 font-mono text-[11px]">{a.request?.trim() || "—"}</pre></div>
            <div><div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Response {a.status && `· ${a.status}`}</div><pre className="overflow-auto rounded bg-muted p-2 font-mono text-[11px]">{a.response?.trim() || "—"}</pre></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApiDesigner({ apis, setApis }: { apis: ApiEndpoint[]; setApis: (f: (a: ApiEndpoint[]) => ApiEndpoint[]) => void }) {
  const [selId, setSelId] = useState<string | null>(apis[0]?.id ?? null);
  const sel = apis.find(a => a.id === selId) ?? apis[0];
  const upd = (patch: Partial<ApiEndpoint>) => sel && setApis(as => as.map(a => a.id === sel.id ? { ...a, ...patch } : a));
  const add = () => { const id = `api${Date.now()}`; setApis(as => [...as, { id, method: "GET", path: "/api/v1/", summary: "", status: "200 OK" }]); setSelId(id); };
  const field = "w-full rounded-md border bg-transparent px-2 py-1.5 text-xs outline-none focus:border-primary";
  const code = "min-h-[120px] w-full flex-1 resize-none rounded-md border bg-[#1E1E1E] p-2 font-mono text-[12px] text-[#D4D4D4] outline-none focus:border-primary";

  return (
    <div className="grid h-full grid-cols-[220px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-3 py-2 text-[11px] text-muted-foreground">{apis.length} endpoints
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={add}><Plus className="h-3 w-3" />Add</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!apis.length && <p className="p-2 text-xs text-muted-foreground">No endpoints. Click <b>Add</b>, or open <b>Examples</b>.</p>}
          {apis.map(a => (
            <button key={a.id} onClick={() => setSelId(a.id)} className={`mb-1 flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left ${sel?.id === a.id ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
              <MethodBadge m={a.method} /><span className="truncate font-mono text-[11px]">{a.path || "/"}</span>
            </button>
          ))}
        </div>
      </aside>
      {sel ? (
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4">
          <div className="flex gap-2">
            <select value={sel.method} onChange={e => upd({ method: e.target.value })} className={`${field} w-28 font-mono font-semibold`}>
              {METHODS.map(m => <option key={m} value={m} className="bg-background">{m}</option>)}
            </select>
            <input value={sel.path} onChange={e => upd({ path: e.target.value })} placeholder="/api/v1/resource/{id}" className={`${field} font-mono`} />
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setApis(as => as.filter(a => a.id !== sel.id)); setSelId(null); }} aria-label="Delete endpoint"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
          <input value={sel.summary ?? ""} onChange={e => upd({ summary: e.target.value })} placeholder="Summary, e.g. Create a short URL" className={field} />
          <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2">
            <div className="flex min-h-0 flex-col gap-1">
              <div className="text-[11px] text-muted-foreground">Request body / query <span className="opacity-70">(optional)</span></div>
              <textarea value={sel.request ?? ""} onChange={e => upd({ request: e.target.value })} spellCheck={false} placeholder={'{\n  "field": "value"\n}'} className={code} />
              {jsonError(sel.request) && <div className="text-[10px] text-amber-600">{jsonError(sel.request)}</div>}
            </div>
            <div className="flex min-h-0 flex-col gap-1">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">Response <span className="opacity-70">(optional)</span>
                <input value={sel.status ?? ""} onChange={e => upd({ status: e.target.value })} placeholder="200 OK" className="ml-auto w-28 rounded border bg-transparent px-1.5 py-0.5 font-mono text-[11px] outline-none" />
              </div>
              <textarea value={sel.response ?? ""} onChange={e => upd({ response: e.target.value })} spellCheck={false} placeholder={'{\n  "id": 1\n}'} className={code} />
              {jsonError(sel.response) && <div className="text-[10px] text-amber-600">{jsonError(sel.response)}</div>}
            </div>
          </div>
        </div>
      ) : <div className="grid place-items-center text-sm text-muted-foreground">Add an endpoint to start designing your REST API.</div>}
    </div>
  );
}

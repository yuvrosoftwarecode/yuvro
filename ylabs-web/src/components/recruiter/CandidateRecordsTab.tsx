import type { Candidate } from "@/lib/recruiterCandidates";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, ChevronDown, Columns3, Download, MoreHorizontal, X, Filter,
  Eye, FileText, Link2, PhoneCall, BellPlus, ArrowUpDown, Check, Users,
} from "lucide-react";
import type { Evaluation } from "@/lib/recruiter";
import {
  recordTotals, fmtDate, fmtTime, fetchCandidateRecords,
  type CandidateRecord, type RecordSource, type RecordStatus, type RecordResult,
} from "@/lib/candidateRecords";
import EmptyState from "@/components/common/EmptyState";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";


type SortKey = "sent_desc" | "sent_asc" | "sub_desc" | "score_desc" | "score_asc" | "name_asc";

const SORTS: { v: SortKey; l: string }[] = [
  { v: "sent_desc", l: "Newest Sent" },
  { v: "sent_asc", l: "Oldest Sent" },
  { v: "sub_desc", l: "Newest Submitted" },
  { v: "score_desc", l: "Highest Score" },
  { v: "score_asc", l: "Lowest Score" },
  { v: "name_asc", l: "Name A-Z" },
];

type ColKey =
  | "candidate" | "email" | "source" | "sent" | "status" | "submitted" | "score" | "result" | "followup"
  | "phone" | "candidateId" | "labs" | "assessment" | "vitarka" | "system_design" | "eci" | "deadline" | "emails" | "aicall" | "last";

const COLUMNS: { key: ColKey; label: string; optional?: boolean }[] = [
  { key: "candidate", label: "Candidate" },
  { key: "email", label: "Email" },
  { key: "source", label: "Source" },
  { key: "sent", label: "Sent On" },
  { key: "status", label: "Status" },
  { key: "submitted", label: "Submitted On" },
  { key: "score", label: "Score" },
  { key: "result", label: "Result" },
  { key: "followup", label: "Follow-up" },
  { key: "phone", label: "Phone", optional: true },
  { key: "candidateId", label: "Candidate ID", optional: true },
  { key: "labs", label: "Engineering Labs", optional: true },
  { key: "assessment", label: "Assessment", optional: true },
  { key: "vitarka", label: "Vitarka AI", optional: true },
  { key: "system_design", label: "System Design", optional: true },
  { key: "eci", label: "Total", optional: true },
  { key: "deadline", label: "Deadline", optional: true },
  { key: "emails", label: "Follow-up Emails Sent", optional: true },
  { key: "aicall", label: "AI Call", optional: true },
  { key: "last", label: "Last Activity", optional: true },
];

const DEFAULT_COLS = COLUMNS.filter((c) => !c.optional).map((c) => c.key);
const COLS_KEY = (id: string) => `yuvro-records-cols-${id}`;
export const PREFILL_KEY = (id: string) => `yuvro-followup-prefill-${id}`;



export function CandidateRecordsTab({
  ev,
  candidates,
  notify,
  onGotoFollowUps,
}: {
  ev: Evaluation;
  candidates: Candidate[];
  notify: (m: string) => void;
  onGotoFollowUps: () => void;
}) {

  const [all, setAll] = useState<CandidateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetchCandidateRecords(ev.id).then(data => {
        if (mounted) {
          // Merge scores from the real candidates list!
          const merged = data.map(record => {
            const cand = candidates.find(c => c.email.toLowerCase() === record.email.toLowerCase());
            if (cand) {
              return {
                ...record,
                score: cand.totalEarned ?? cand.eci,
                result: (cand.recommendation === "Reject" ? "Failed" : cand.recommendation === "Pending" ? "Not Evaluated" : "Passed") as RecordResult,
                labsScore: cand.labsScore,
                assessmentScore: cand.assessmentScore,
                vitarkaScore: cand.vitarkaScore,
                eci: cand.eci,
              };
            }
            return record;
          });
          setAll(merged);
          setLoading(false);
        }
      });
    };
    
    setLoading(true);
    load();
    
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        load();
      }
    }, 5000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [ev.id, candidates]);

  const totals = useMemo(() => recordTotals(all), [all]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | RecordStatus>("all");
  const [result, setResult] = useState<"all" | RecordResult>("all");
  const [source, setSource] = useState<"all" | RecordSource>("all");
  const [followUp, setFollowUp] = useState<"all" | "enabled" | "disabled">("all");
  const [sentFrom, setSentFrom] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [subFrom, setSubFrom] = useState("");
  const [subTo, setSubTo] = useState("");
  const [sort, setSort] = useState<SortKey>("sent_desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [cols, setCols] = useState<ColKey[]>(DEFAULT_COLS);
  const [colsOpen, setColsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [detail, setDetail] = useState<CandidateRecord | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(COLS_KEY(ev.id));
        if (raw) setCols(JSON.parse(raw));
      } catch {}
    }
  }, [ev.id]);
  const setColumns = (next: ColKey[]) => {
    setCols(next);
    if (typeof window !== "undefined") {
      try { localStorage.setItem(COLS_KEY(ev.id), JSON.stringify(next)); } catch {}
    }
  };

  useEffect(() => { setPage(1); }, [search, status, result, source, followUp, sentFrom, sentTo, subFrom, subTo, perPage]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const inRange = (ts: number | null, from: string, to: string) => {
      if (!from && !to) return true;
      if (!ts) return false;
      if (from && ts < new Date(from).getTime()) return false;
      if (to && ts > new Date(to).getTime() + 24 * 60 * 60 * 1000) return false;
      return true;
    };
    const filtered = all.filter((r) => {
      if (s && !(r.name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s) || r.phone.includes(s) || r.candidateId.toLowerCase().includes(s))) return false;
      if (status !== "all" && r.status !== status) return false;
      if (result !== "all" && r.result !== result) return false;
      if (source !== "all" && r.source !== source) return false;
      if (followUp === "enabled" && !r.followUp) return false;
      if (followUp === "disabled" && r.followUp) return false;
      if (!inRange(r.sentAt, sentFrom, sentTo)) return false;
      if (!inRange(r.submittedAt, subFrom, subTo)) return false;
      return true;
    });
    const num = (v: number | null, fallback: number) => (v == null ? fallback : v);
    const cmp: Record<SortKey, (a: CandidateRecord, b: CandidateRecord) => number> = {
      sent_desc: (a, b) => num(b.sentAt, 0) - num(a.sentAt, 0),
      sent_asc: (a, b) => num(a.sentAt, Infinity) - num(b.sentAt, Infinity),
      sub_desc: (a, b) => num(b.submittedAt, 0) - num(a.submittedAt, 0),
      score_desc: (a, b) => num(b.score, -1) - num(a.score, -1),
      score_asc: (a, b) => num(a.score, Infinity) - num(b.score, Infinity),
      name_asc: (a, b) => a.name.localeCompare(b.name),
    };
    return filtered.slice().sort(cmp[sort]);
  }, [all, search, status, result, source, followUp, sentFrom, sentTo, subFrom, subTo, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(page, totalPages);
  const slice = rows.slice((current - 1) * perPage, current * perPage);
  const show = (k: ColKey) => cols.includes(k);

  const activeFilters =
    (status !== "all" ? 1 : 0) + (result !== "all" ? 1 : 0) + (source !== "all" ? 1 : 0) +
    (followUp !== "all" ? 1 : 0) + (sentFrom || sentTo ? 1 : 0) + (subFrom || subTo ? 1 : 0);

  const resetFilters = () => {
    setStatus("all"); setResult("all"); setSource("all"); setFollowUp("all");
    setSentFrom(""); setSentTo(""); setSubFrom(""); setSubTo("");
  };

  const exportCsv = () => {
    const head = COLUMNS.filter((c) => show(c.key)).map((c) => c.label);
    const body = rows.map((r) =>
      COLUMNS.filter((c) => show(c.key)).map((c) => cellText(r, c.key))
    );
    const csv = [head, ...body].map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidate-records-${ev.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${rows.length} records`);
  };

  const setFollowUpFor = (r: CandidateRecord) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PREFILL_KEY(ev.id), JSON.stringify({ name: r.name, email: r.email, phone: r.phone }));
      } catch {}
    }
    notify(`Opening Individual Setup for ${r.name}`);
    onGotoFollowUps();
  };

  const summary: { label: string; value: number; onClick: () => void; active: boolean }[] = [
    { label: "Total Candidates", value: totals.total, onClick: () => { setStatus("all"); setResult("all"); }, active: status === "all" && result === "all" },
    { label: "Not Submitted", value: totals.notSubmitted, onClick: () => { setStatus("Not Submitted"); setResult("all"); }, active: status === "Not Submitted" },
    { label: "Submitted", value: totals.submitted, onClick: () => { setStatus("Submitted"); setResult("all"); }, active: status === "Submitted" && result === "all" },
    { label: "Passed", value: totals.passed, onClick: () => { setStatus("all"); setResult("Passed"); }, active: result === "Passed" },
    { label: "Failed", value: totals.failed, onClick: () => { setStatus("all"); setResult("Failed"); }, active: result === "Failed" },
  ];

  return (
    <div className="space-y-3">
      {/* Row 1 — Full-width search */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search candidates by name, email, phone or candidate ID..."
          className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-9 text-[13px] text-neutral-900 placeholder-neutral-400 outline-none focus:border-neutral-400"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Row 2 — Segment nav (left) + toolbar actions (right) */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1">
          {summary.map((s) => (
            <button
              key={s.label}
              onClick={s.onClick}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12.5px] transition ${s.active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"}`}
            >
              <span className={s.active ? "font-medium" : ""}>{s.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${s.active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                {s.value.toLocaleString()}
              </span>
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">


        <div className="relative">
          <button onClick={() => { setFiltersOpen((v) => !v); setColsOpen(false); }} className={toolBtn}>
            <Filter className="h-3.5 w-3.5" /> Filters
            {activeFilters > 0 && <span className="ml-1 rounded bg-neutral-900 px-1.5 text-[10px] text-white">{activeFilters}</span>}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {filtersOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setFiltersOpen(false)} />
              <div className="absolute right-0 z-30 mt-1 w-[420px] rounded-xl border border-black/10 bg-white p-4 shadow-lg">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status">
                    <Select value={status} onChange={(v) => setStatus(v as any)} options={["all", "Not Submitted", "Submitted"]} />
                  </Field>
                  <Field label="Result">
                    <Select value={result} onChange={(v) => setResult(v as any)} options={["all", "Passed", "Failed", "Not Evaluated"]} />
                  </Field>
                  <Field label="Source">
                    <Select value={source} onChange={(v) => setSource(v as any)} options={["all", "Yuvro Invite", "Follow-up Setup", "Shared Link"]} />
                  </Field>
                  <Field label="Follow-up">
                    <Select value={followUp} onChange={(v) => setFollowUp(v as any)} options={["all", "enabled", "disabled"]} labels={{ enabled: "Enabled", disabled: "Not Enabled" }} />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Sent Date">
                      <div className="flex items-center gap-2">
                        <input type="date" value={sentFrom} onChange={(e) => setSentFrom(e.target.value)} className={dateInput} />
                        <span className="text-[12px] text-neutral-400 font-medium">to</span>
                        <input type="date" value={sentTo} onChange={(e) => setSentTo(e.target.value)} className={dateInput} />
                      </div>
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Submitted Date">
                      <div className="flex items-center gap-2">
                        <input type="date" value={subFrom} onChange={(e) => setSubFrom(e.target.value)} className={dateInput} />
                        <span className="text-[12px] text-neutral-400 font-medium">to</span>
                        <input type="date" value={subTo} onChange={(e) => setSubTo(e.target.value)} className={dateInput} />
                      </div>
                    </Field>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3">
                  <button onClick={resetFilters} className="text-[12px] text-neutral-500 hover:text-neutral-900">Reset all</button>
                  <button onClick={() => setFiltersOpen(false)} className="rounded-md bg-neutral-900 px-3 py-1.5 text-[12px] text-white">Done</button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative inline-flex items-center">
          <ArrowUpDown className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-neutral-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none rounded-lg border border-black/10 bg-white py-2 pl-8 pr-8 text-[12.5px] text-neutral-900 outline-none focus:border-neutral-400"
          >
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-neutral-400" />
        </div>

          <button onClick={exportCsv} className={toolBtn}><Download className="h-3.5 w-3.5" /> Export</button>
        </div>
      </div>

      <div className="border-t border-neutral-200 overflow-x-auto">
        <div className="min-w-fit">
          <table className="w-full text-[12.5px]">

            <thead className="sticky top-0 z-10">
              <tr className="bg-neutral-900 text-left text-[11px] uppercase tracking-widest text-white">
                {COLUMNS.filter((c) => show(c.key)).map((c) => (
                  <th key={c.key} className="px-3 py-2.5 font-normal">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={cols.length + 1} className="px-3 py-16 text-center text-[13px] text-neutral-500">
                    Loading records...
                  </td>
                </tr>
              ) : all.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} className="px-3 py-16 text-center text-[13px] text-neutral-500">
                    No candidate records found.
                  </td>
                </tr>
              ) : slice.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} className="px-3 py-12">
                    <EmptyState
                      icon={Users}
                      title="No Candidates Found"
                      description="No candidate records match your active search and filter criteria."
                    />
                  </td>
                </tr>
              ) : (
                slice.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setDetail(r)}
                    className="cursor-pointer border-b border-black/5 text-neutral-900 hover:bg-black/[0.02]"
                  >
                    {COLUMNS.filter((c) => show(c.key)).map((c) => (
                      <td key={c.key} className="px-3 py-2.5 align-middle">
                        {renderCell(r, c.key)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-neutral-600">
        <div className="flex items-center gap-3">
          <span>
            Showing {rows.length === 0 ? 0 : (current - 1) * perPage + 1}–{Math.min(current * perPage, rows.length)} of {rows.length.toLocaleString()}
          </span>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="rounded-md border border-black/10 bg-white px-2 py-1 text-[12px] text-neutral-900 outline-none"
          >
            {[25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={current <= 1} onClick={() => setPage(current - 1)} className={pageBtn}>Previous</button>
          <span className="tabular-nums">Page {current} / {totalPages}</span>
          <button disabled={current >= totalPages} onClick={() => setPage(current + 1)} className={pageBtn}>Next</button>
        </div>
      </div>

      {detail && (
        <DetailDrawer
          r={detail}
          onClose={() => setDetail(null)}
          onFollowUp={() => { setDetail(null); setFollowUpFor(detail); }}
          onFollowUpActivity={() => { setDetail(null); onGotoFollowUps(); }}
        />
      )}
    </div>
  );
}

/* ───────────── detail drawer ───────────── */

function DetailDrawer({
  r, onClose, onFollowUp, onFollowUpActivity,
}: { r: CandidateRecord; onClose: () => void; onFollowUp: () => void; onFollowUpActivity: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[460px] flex-col border-l border-black/10 bg-white">
        <div className="flex items-start justify-between border-b border-black/10 px-6 py-5">
          <div>
            <div className="text-[17px] font-medium text-neutral-900">{r.name}</div>
            <div className="mt-1 text-[12.5px] text-neutral-500">{r.email}</div>
            <div className="text-[12.5px] text-neutral-500">{r.phone}</div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-neutral-500 hover:bg-black/5"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5">
          <div className="grid grid-cols-3 gap-3">
            <Mini label="Status" value={r.status} />
            <Mini label="Result" value={r.result} />
            <Mini label="Score" value={r.score == null ? "—" : `${r.score}/100`} />
          </div>

          <div className="mt-7 text-[11px] uppercase tracking-widest text-neutral-500">Assessment</div>
          <div className="mt-3 divide-y divide-black/5 border-y border-black/5">
            <ScoreRow label="Engineering Labs" value={r.labsScore} />
            <ScoreRow label="Assessment" value={r.assessmentScore} />
            <ScoreRow label="Vitarka AI" value={r.vitarkaScore} />
            <ScoreRow label="Total" value={r.totalEarned != null ? r.totalEarned : r.eci} />
          </div>

          <div className="mt-7 text-[11px] uppercase tracking-widest text-neutral-500">Activity</div>
          <div className="mt-3 space-y-3">
            {r.activity.map((a, i) => (
              <div key={i} className="flex items-start justify-between gap-4">
                <span className="text-[13px] text-neutral-900">{a.label}</span>
                <span className="whitespace-nowrap text-[12px] tabular-nums text-neutral-500">
                  {a.at ? `${fmtDate(a.at)} · ${fmtTime(a.at)}` : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-7 text-[11px] uppercase tracking-widest text-neutral-500">Follow-up</div>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-black/10 px-4 py-3">
            <span className="text-[13px] text-neutral-900">{r.followUp ? "Enabled" : "Not enabled"}</span>
            {r.followUp ? (
              <button onClick={onFollowUpActivity} className="text-[12.5px] text-neutral-900 underline underline-offset-4">View communication history</button>
            ) : (
              <button onClick={onFollowUp} className="text-[12.5px] text-neutral-900 underline underline-offset-4">Set follow-up</button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 text-[13px] text-neutral-900">{value}</div>
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13px] text-neutral-700">{label}</span>
      <span className="text-[13px] tabular-nums text-neutral-900">{value == null ? "—" : value}</span>
    </div>
  );
}

/* ───────────── cells ───────────── */

function cellText(r: CandidateRecord, k: ColKey): string {
  switch (k) {
    case "candidate": return r.name;
    case "email": return r.email;
    case "source": return r.source;
    case "sent": return r.sentAt ? `${fmtDate(r.sentAt)} ${fmtTime(r.sentAt)}` : "—";
    case "status": return r.status;
    case "submitted": return r.submittedAt ? `${fmtDate(r.submittedAt)} ${fmtTime(r.submittedAt)}` : "—";
    case "score": return r.score == null ? "—" : String(r.score);
    case "result": return r.result;
    case "followup": return r.followUp ? "Enabled" : "Not Enabled";
    case "phone": return r.phone;
    case "candidateId": return r.candidateId;
    case "labs": return r.labsScore == null ? "—" : String(r.labsScore);
    case "assessment": return r.assessmentScore == null ? "—" : String(r.assessmentScore);
    case "vitarka": return r.vitarkaScore == null ? "—" : String(r.vitarkaScore);
    case "system_design": return r.systemDesignScore == null ? "—" : String(r.systemDesignScore);
    case "eci": return r.totalEarned != null ? String(r.totalEarned) : (r.eci == null ? "—" : String(r.eci));
    case "deadline": return fmtDate(r.deadline);
    case "emails": return String(r.emailsSent);
    case "aicall": return r.aiCall ? "Yes" : "No";
    case "last": return fmtDate(r.lastActivity);
  }
}

function renderCell(r: CandidateRecord, k: ColKey) {
  if (k === "candidate") return <div className="truncate max-w-[140px] font-medium text-neutral-900" title={r.name}>{r.name}</div>;
  if (k === "email") return <div className="truncate max-w-[160px] text-neutral-700" title={r.email}>{r.email}</div>;
  if (k === "source") return <span className="text-neutral-600">{r.source}</span>;
  if (k === "sent" || k === "submitted") {
    const ts = k === "sent" ? r.sentAt : r.submittedAt;
    if (!ts) return <span className="text-neutral-400">—</span>;
    return (
      <span className="tabular-nums text-neutral-800">
        {fmtDate(ts)} <span className="text-neutral-500">{fmtTime(ts)}</span>
      </span>
    );
  }
  if (k === "status") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-neutral-800`}>
        <span className={`h-1.5 w-1.5 rounded-full ${r.status === "Submitted" ? "bg-emerald-500" : "bg-neutral-300"}`} />
        {r.status}
      </span>
    );
  }
  if (k === "result") {
    const tone = r.result === "Passed" ? "text-emerald-700" : r.result === "Failed" ? "text-red-700" : "text-neutral-400";
    return <span className={tone}>{r.result}</span>;
  }
  if (k === "score") return <span className="tabular-nums text-neutral-900">{r.score == null ? <span className="text-neutral-400">—</span> : `${r.score}/100`}</span>;
  if (k === "followup") return <span className={r.followUp ? "text-neutral-900" : "text-neutral-400"}>{r.followUp ? "Enabled" : "Not Enabled"}</span>;
  return <span className="tabular-nums text-neutral-800">{cellText(r, k)}</span>;
}

/* ───────────── small ui ───────────── */

const toolBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-[12.5px] text-neutral-800 transition hover:border-neutral-400";
const pageBtn =
  "rounded-md border border-black/10 bg-white px-2.5 py-1 text-[12px] text-neutral-800 disabled:opacity-40 hover:border-neutral-400";
const dateInput = "w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-[12px] text-neutral-900 outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-widest text-neutral-500">{label}</div>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, labels }: { value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-black/10 bg-white px-2.5 py-1.5 pr-7 text-[12.5px] text-neutral-900 outline-none focus:border-neutral-400"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o === "all" ? "All" : labels?.[o] ?? o}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
    </div>
  );
}

function RowItem({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-neutral-800 hover:bg-black/[0.03]">
      {icon}{children}
    </button>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  ChevronLeft, Copy as CopyIcon, Mail, Download, FileSpreadsheet, FileText, MoreHorizontal,
  Archive, Trash2, Pencil, Eye, Users, Clock, Search, SlidersHorizontal, LayoutGrid, Table as TableIcon,
  ChevronDown, X, Check, Star, TrendingUp, Activity, ArrowUpRight, CircleDot, Plus, Bookmark, ArrowUpDown, Filter,
} from "lucide-react";
import { getEvaluation, evaluationTotals, saveEvaluation, duplicateEvaluation, deleteEvaluation, Evaluation } from "@/lib/recruiter";
import {
  getCandidates, applyFilters, emptyFilters, activeFilterCount, vitarkaLabel, experienceBucket, completionBucket,
  Candidate, CandidateFilters, SortKey, CandStatus, HiringStatus, Recommendation, VitarkaLabel,
} from "@/lib/recruiterCandidates";

const searchSchema = z.object({
  tab: z.enum(["overview", "candidates", "insights", "reports", "settings"]).default("overview").catch("overview"),
});

export const Route = createFileRoute("/recruiter/evaluations/$id/workspace")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Evaluation Workspace — Yuvro Labs" }, { name: "robots", content: "noindex" }] }),
  component: Workspace,
});

function Workspace() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const nav = useNavigate();
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const e = getEvaluation(id);
    if (!e) nav({ to: "/recruiter/evaluations" });
    else setEv(e);
  }, [id, nav]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);

  if (!ev) return null;

  const candidates = getCandidates(ev.id);
  const totals = evaluationTotals(ev);
  const goto = (t: typeof tab) => nav({ to: "/recruiter/evaluations/$id/workspace", params: { id }, search: { tab: t } });

  const notify = (m: string) => setToast(m);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(`${location.origin}/evaluation/${ev.id}`); notify("Public link copied"); }
    catch { notify("Copy failed"); }
  };
  const download = (kind: "csv" | "xlsx" | "reports") => {
    const rows = [["Candidate","Email","Phone","ECI","Labs","Assessment","Vitarka","Status","Hiring","Submitted"]]
      .concat(candidates.map(c => [c.name, c.email, c.phone, String(c.eci), String(c.labsScore), String(c.assessmentScore), String(c.vitarkaScore), c.status, c.hiringStatus, new Date(c.submittedAt).toISOString()]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: kind === "xlsx" ? "application/vnd.ms-excel" : "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${ev.title.replace(/\s+/g, "-")}-${kind}.${kind === "xlsx" ? "xls" : "csv"}`; a.click();
    URL.revokeObjectURL(url); notify(`Downloaded ${kind.toUpperCase()}`);
  };
  const emailAll = () => notify("Email queued to invited candidates");
  const onDuplicate = () => { const c = duplicateEvaluation(ev.id); if (c) { notify("Evaluation duplicated"); nav({ to: "/recruiter/evaluations/$id/workspace", params: { id: c.id } }); } };
  const onArchive = () => { const c = { ...ev, status: "draft" as const }; saveEvaluation(c); setEv(c); notify("Evaluation archived"); };
  const onDelete = () => { if (confirm("Delete this evaluation? This cannot be undone.")) { deleteEvaluation(ev.id); nav({ to: "/recruiter/evaluations" }); } };

  return (
    <div className="min-h-screen">
      {/* Top header */}
      <header className="border-b border-white/5 bg-black/10 backdrop-blur">
        <div className="mx-auto max-w-[1440px] px-8 pt-6 pb-4">
          <Link to="/recruiter/evaluations" className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white">
            <ChevronLeft className="h-3.5 w-3.5" /> All evaluations
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <StatusBadge status={ev.status} />
                <span className="text-[11px] uppercase tracking-widest text-neutral-500">{ev.domain || "Uncategorized"} · Domain</span>
              </div>
              <h1 className="mt-2 text-[32px] font-medium leading-tight tracking-tight text-white">{ev.title}</h1>
              <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-neutral-500">
                <span>Created <b className="font-normal text-neutral-300">{fmtDate(ev.createdAt)}</b></span>
                <span>Last modified <b className="font-normal text-neutral-300">{fmtRel(ev.createdAt)}</b></span>
                <span>Created by <b className="font-normal text-neutral-300">Riya Recruiter</b></span>
                <span>Duration <b className="font-normal text-neutral-300">{totals.minutes} min</b></span>
                <span>Marks <b className="font-normal text-neutral-300">{totals.marks}</b></span>
                <span>Candidate limit <b className="font-normal text-neutral-300">∞</b></span>
              </dl>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <HeaderBtn onClick={copyLink} icon={<CopyIcon className="h-3.5 w-3.5" />}>Copy Link</HeaderBtn>
              <HeaderBtn onClick={() => notify("Invite dialog opened")} icon={<Mail className="h-3.5 w-3.5" />}>Invite Candidates</HeaderBtn>
              <HeaderBtn onClick={() => download("reports")} icon={<Download className="h-3.5 w-3.5" />}>Download</HeaderBtn>
              <div className="relative">
                <HeaderBtn onClick={() => setMoreOpen(v => !v)} icon={<MoreHorizontal className="h-3.5 w-3.5" />}>More</HeaderBtn>
                {moreOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-2xl">
                      <MenuItem onClick={() => { download("csv"); setMoreOpen(false); }} icon={<FileText className="h-3.5 w-3.5" />}>Export CSV</MenuItem>
                      <MenuItem onClick={() => { download("xlsx"); setMoreOpen(false); }} icon={<FileSpreadsheet className="h-3.5 w-3.5" />}>Export Excel</MenuItem>
                      <MenuItem onClick={() => { emailAll(); setMoreOpen(false); }} icon={<Mail className="h-3.5 w-3.5" />}>Email Candidates</MenuItem>
                      <MenuItem onClick={() => { onDuplicate(); setMoreOpen(false); }} icon={<CopyIcon className="h-3.5 w-3.5" />}>Duplicate Evaluation</MenuItem>
                      <MenuItem onClick={() => { nav({ to: "/recruiter/evaluations/$id", params: { id: ev.id } }); }} icon={<Pencil className="h-3.5 w-3.5" />}>Edit Evaluation</MenuItem>
                      <div className="h-px bg-white/5" />
                      <MenuItem onClick={() => { onArchive(); setMoreOpen(false); }} icon={<Archive className="h-3.5 w-3.5" />}>Archive</MenuItem>
                      <MenuItem onClick={() => { onDelete(); setMoreOpen(false); }} icon={<Trash2 className="h-3.5 w-3.5" />} danger>Delete</MenuItem>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <nav className="mt-6 flex items-center gap-1">
            {(["overview","candidates","insights","reports","settings"] as const).map(t => (
              <button
                key={t}
                onClick={() => goto(t)}
                className={`relative px-3 py-2 text-[13px] transition ${tab === t ? "text-white" : "text-neutral-500 hover:text-neutral-300"}`}
              >
                {cap(t)}
                {tab === t && <span className="absolute inset-x-3 -bottom-[13px] h-px bg-white" />}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-8 py-8">
        {tab === "overview" && <OverviewTab ev={ev} candidates={candidates} onGoto={goto} notify={notify} />}
        {tab === "candidates" && <CandidatesTab evId={ev.id} candidates={candidates} notify={notify} />}
        {tab === "insights" && <SimplePane title="Insights" desc="Aggregate skill heatmaps, question difficulty analysis, and cohort comparisons will be published here." />}
        {tab === "reports" && <SimplePane title="Reports" desc="Downloadable per-candidate reports, batch summaries and ATS-ready exports live in this tab." />}
        {tab === "settings" && <SimplePane title="Settings" desc="Evaluation window, proctoring rules, retake policy, and access controls are managed here." />}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-[12px] text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

// ============================ OVERVIEW ============================

function OverviewTab({ ev, candidates, onGoto, notify }: { ev: Evaluation; candidates: Candidate[]; onGoto: (t: "candidates" | "overview" | "insights" | "reports" | "settings") => void; notify: (m: string) => void }) {
  const stats = useMemo(() => {
    const invited = candidates.length;
    const submitted = candidates.filter(c => c.status === "Submitted").length;
    const completed = candidates.filter(c => c.status === "Completed").length;
    const inProgress = candidates.filter(c => c.status === "In Progress").length;
    const notStarted = candidates.filter(c => c.status === "Not Started").length;
    const expired = candidates.filter(c => c.status === "Expired").length;
    const pending = candidates.filter(c => c.hiringStatus === "Pending Review").length;
    const shortlisted = candidates.filter(c => c.hiringStatus === "Shortlisted").length;
    const interview = candidates.filter(c => c.hiringStatus === "Interview Scheduled").length;
    const selected = candidates.filter(c => c.hiringStatus === "Selected").length;
    const rejected = candidates.filter(c => c.hiringStatus === "Rejected").length;
    const submittedList = candidates.filter(c => c.status === "Submitted" || c.status === "Completed");
    const avgEci = submittedList.length ? Math.round(submittedList.reduce((a, c) => a + c.eci, 0) / submittedList.length) : 0;
    const avgTime = submittedList.length ? Math.round(submittedList.reduce((a, c) => a + c.completionMinutes, 0) / submittedList.length) : 0;
    return { invited, submitted, completed, inProgress, notStarted, expired, pending, shortlisted, interview, selected, rejected, avgEci, avgTime };
  }, [candidates]);

  const activity = useMemo(() => buildActivity(candidates), [candidates]);

  return (
    <div className="space-y-8">
      {/* Quick actions strip */}
      <section>
        <SectionTitle>Quick actions</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <QuickAction label="Invite Candidates" onClick={() => notify("Invite dialog opened")} />
          <QuickAction label="Copy Public Link" onClick={() => { navigator.clipboard.writeText(`${location.origin}/evaluation/${ev.id}`); notify("Public link copied"); }} />
          <QuickAction label="Email Candidates" onClick={() => notify("Email queued")} />
          <QuickAction label="Download Reports" onClick={() => notify("Report bundle prepared")} />
          <QuickAction label="View Candidates" onClick={() => onGoto("candidates")} accent />
        </div>
      </section>

      <section>
        <SectionTitle>Funnel</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/5 bg-white/5 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat label="Invited" value={stats.invited} />
          <MiniStat label="Submitted" value={stats.submitted} />
          <MiniStat label="Completed" value={stats.completed} />
          <MiniStat label="In progress" value={stats.inProgress} />
          <MiniStat label="Not started" value={stats.notStarted} />
          <MiniStat label="Expired" value={stats.expired} tone="muted" />
        </div>
      </section>

      <section>
        <SectionTitle>Hiring status</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/5 bg-white/5 sm:grid-cols-3 lg:grid-cols-5">
          <MiniStat label="Pending review" value={stats.pending} />
          <MiniStat label="Shortlisted" value={stats.shortlisted} />
          <MiniStat label="Interview" value={stats.interview} />
          <MiniStat label="Selected" value={stats.selected} tone="good" />
          <MiniStat label="Rejected" value={stats.rejected} tone="muted" />
        </div>
      </section>

      <section>
        <SectionTitle>Signal</SectionTitle>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <BigStat label="Avg Engineering Capability Index" value={stats.avgEci} suffix="/100" icon={<TrendingUp className="h-3.5 w-3.5" />} />
          <BigStat label="Avg Completion Time" value={stats.avgTime} suffix=" min" icon={<Clock className="h-3.5 w-3.5" />} />
          <BigStat label="Avg Evaluation Duration" value={evaluationTotals(ev).minutes} suffix=" min" icon={<Activity className="h-3.5 w-3.5" />} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle>Recent activity</SectionTitle>
          <div className="mt-3 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
            {activity.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <CircleDot className={`h-3 w-3 ${a.tone === "good" ? "text-emerald-400" : a.tone === "warn" ? "text-amber-400" : a.tone === "bad" ? "text-red-400" : "text-neutral-500"}`} />
                <div className="flex-1 text-[13px] text-neutral-200">{a.text}</div>
                <div className="text-[11px] text-neutral-500">{a.time}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle>Next best action</SectionTitle>
          <div className="mt-3 rounded-xl border border-white/5 p-4">
            <div className="text-[13px] text-white">{stats.pending} candidates pending review</div>
            <p className="mt-1 text-[12px] text-neutral-500">Review high-signal submissions first to shorten your time to shortlist.</p>
            <button onClick={() => onGoto("candidates")} className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-emerald-400 hover:underline">Review candidates <ArrowUpRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================ CANDIDATES ============================

const VIEW_KEY = "yuvro-cand-view";
const SAVED_VIEWS_KEY = "yuvro-cand-saved-views";

interface SavedView { id: string; name: string; filters: SerializedFilters; }
interface SerializedFilters {
  search: string; status: string[]; hiring: string[]; recommendation: string[];
  eciMin: number | null; labsMin: number | null; assessMin: number | null;
  vitarka: string[]; dateRange: string; completion: string[]; experience: string[];
  colleges: string[]; companies: string[]; skills: string[]; tags: string[]; domains: string[];
}

const DEFAULT_VIEWS: { id: string; name: string; build: () => CandidateFilters }[] = [
  { id: "default", name: "Default", build: () => emptyFilters() },
  { id: "needs-review", name: "Needs Review", build: () => ({ ...emptyFilters(), hiring: new Set(["Pending Review" as HiringStatus]) }) },
  { id: "strong", name: "Strong Candidates", build: () => ({ ...emptyFilters(), recommendation: new Set(["Strong Hire","Hire"] as Recommendation[]) }) },
  { id: "pending", name: "Pending", build: () => ({ ...emptyFilters(), status: new Set(["In Progress","Not Started"] as CandStatus[]) }) },
  { id: "selected", name: "Selected", build: () => ({ ...emptyFilters(), hiring: new Set(["Selected" as HiringStatus]) }) },
  { id: "rejected", name: "Rejected", build: () => ({ ...emptyFilters(), hiring: new Set(["Rejected" as HiringStatus]) }) },
  { id: "interview", name: "Interview", build: () => ({ ...emptyFilters(), hiring: new Set(["Interview Scheduled" as HiringStatus]) }) },
];

function CandidatesTab({ evId, candidates, notify }: { evId: string; candidates: Candidate[]; notify: (m: string) => void }) {
  const nav = useNavigate();
  const [filters, setFilters] = useState<CandidateFilters>(emptyFilters());
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"card" | "table">(() => (typeof window !== "undefined" ? ((localStorage.getItem(VIEW_KEY) as any) || "table") : "table"));
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Candidate | null>(null);
  const [activeView, setActiveView] = useState("default");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  useEffect(() => { try { const raw = localStorage.getItem(SAVED_VIEWS_KEY); if (raw) setSavedViews(JSON.parse(raw)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch {} }, [view]);

  const filtered = useMemo(() => applyFilters(candidates, filters, sort), [candidates, filters, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [filters, sort, perPage]);

  const applyDefaultView = (id: string) => {
    setActiveView(id);
    const def = DEFAULT_VIEWS.find(v => v.id === id);
    if (def) return setFilters(def.build());
    const saved = savedViews.find(v => v.id === id);
    if (saved) setFilters(deserializeFilters(saved.filters));
  };

  const saveCurrentView = () => {
    const name = prompt("Name this view"); if (!name) return;
    const v: SavedView = { id: "u-" + Math.random().toString(36).slice(2, 8), name, filters: serializeFilters(filters) };
    const next = [...savedViews, v]; setSavedViews(next);
    try { localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(next)); } catch {}
    setActiveView(v.id); notify("View saved");
  };

  const toggleSelect = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === paged.length ? new Set() : new Set(paged.map(c => c.id)));

  const openDetails = (c: Candidate) => nav({ to: "/recruiter/evaluations/$id/candidates/$candidateId", params: { id: evId, candidateId: c.id } });

  const bulk = (label: string) => { notify(`${label} applied to ${selected.size} candidate${selected.size === 1 ? "" : "s"}`); setSelected(new Set()); };

  const colleges = useMemo(() => Array.from(new Set(candidates.map(c => c.college))).sort(), [candidates]);
  const companies = useMemo(() => Array.from(new Set(candidates.map(c => c.company))).sort(), [candidates]);

  return (
    <div>
      {/* Title strip */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle>Candidates</SectionTitle>
          <div className="mt-1 text-[12px] text-neutral-500">{filtered.length.toLocaleString()} of {candidates.length.toLocaleString()} candidates</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-md border border-white/10">
            <button onClick={() => setView("card")} className={`px-2 py-1.5 text-[12px] ${view === "card" ? "bg-white/10 text-white" : "text-neutral-400"}`} title="Card view"><LayoutGrid className="h-3.5 w-3.5" /></button>
            <button onClick={() => setView("table")} className={`px-2 py-1.5 text-[12px] ${view === "table" ? "bg-white/10 text-white" : "text-neutral-400"}`} title="Table view"><TableIcon className="h-3.5 w-3.5" /></button>
          </div>
          <SortMenu value={sort} onChange={setSort} />
        </div>
      </div>

      {/* Search */}
      <div className="mt-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search by name, email, phone, college, company or candidate ID…"
            className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-9 text-[13px] text-white placeholder-neutral-500 outline-none focus:border-white/25"
          />
          {filters.search && <button onClick={() => setFilters(f => ({ ...f, search: "" }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-500 hover:text-white"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      {/* Saved views + filter chips */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {DEFAULT_VIEWS.map(v => (
          <ViewChip key={v.id} active={activeView === v.id} onClick={() => applyDefaultView(v.id)}>{v.name}</ViewChip>
        ))}
        {savedViews.map(v => (
          <ViewChip key={v.id} active={activeView === v.id} onClick={() => applyDefaultView(v.id)}>
            <Bookmark className="mr-1 inline h-3 w-3" />{v.name}
          </ViewChip>
        ))}
        <button onClick={saveCurrentView} className="ml-1 inline-flex items-center gap-1 rounded-full border border-dashed border-white/15 px-2.5 py-1 text-[11px] text-neutral-400 hover:border-white/30 hover:text-white">
          <Plus className="h-3 w-3" /> Save current
        </button>
      </div>

      {/* Filters row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <FilterMulti label="Status" options={["Submitted","Completed","In Progress","Not Started","Expired"]} value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v as any }))} />
        <FilterMulti label="Hiring" options={["Pending Review","Shortlisted","Interview Scheduled","Selected","Rejected","Hold"]} value={filters.hiring} onChange={v => setFilters(f => ({ ...f, hiring: v as any }))} />
        <FilterMulti label="Recommendation" options={["Strong Hire","Hire","Maybe","Reject"]} value={filters.recommendation} onChange={v => setFilters(f => ({ ...f, recommendation: v as any }))} />
        <FilterMinScore label="ECI" value={filters.eciMin} onChange={v => setFilters(f => ({ ...f, eciMin: v }))} />
        <FilterMinScore label="Labs" value={filters.labsMin} onChange={v => setFilters(f => ({ ...f, labsMin: v }))} />
        <FilterMinScore label="Assessment" value={filters.assessMin} onChange={v => setFilters(f => ({ ...f, assessMin: v }))} />
        <FilterMulti label="Vitarka" options={["Excellent","Good","Average","Poor"]} value={filters.vitarka} onChange={v => setFilters(f => ({ ...f, vitarka: v as any }))} />
        <FilterDate value={filters.dateRange} onChange={v => setFilters(f => ({ ...f, dateRange: v }))} />
        <FilterMulti label="Completion" options={["Below 45 mins","45-60 mins","60-90 mins","Above 90 mins"]} value={filters.completion} onChange={v => setFilters(f => ({ ...f, completion: v }))} />
        <FilterMulti label="Experience" options={["Fresher","1-3 Years","3-5 Years","5-8 Years","8+"]} value={filters.experience} onChange={v => setFilters(f => ({ ...f, experience: v }))} />
        <FilterMulti label="College" options={colleges} value={filters.colleges} onChange={v => setFilters(f => ({ ...f, colleges: v }))} searchable />
        <FilterMulti label="Company" options={companies} value={filters.companies} onChange={v => setFilters(f => ({ ...f, companies: v }))} searchable />
        <FilterMulti label="Skills" options={["Java","Python","SQL","React","Node","AWS","Docker","Spring Boot"]} value={filters.skills} onChange={v => setFilters(f => ({ ...f, skills: v }))} />
        <FilterMulti label="Tags" options={["Priority","Referral","Campus","Internal","Fast Track"]} value={filters.tags} onChange={v => setFilters(f => ({ ...f, tags: v }))} />
        <FilterMulti label="Domain" options={["Finance","Insurance","Retail","Healthcare","EdTech","Supply Chain"]} value={filters.domains} onChange={v => setFilters(f => ({ ...f, domains: v }))} />
        {activeFilterCount(filters) > 0 && (
          <button onClick={() => { setFilters(emptyFilters()); setActiveView("default"); }} className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white"><X className="h-3 w-3" /> Clear all</button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="text-[12px] text-white">{selected.size} selected</div>
          <div className="mx-2 h-4 w-px bg-white/10" />
          <BulkBtn onClick={() => bulk("Moved to Interview")}>Move to Interview</BulkBtn>
          <BulkBtn onClick={() => bulk("Shortlisted")}>Shortlist</BulkBtn>
          <BulkBtn onClick={() => bulk("Rejected")}>Reject</BulkBtn>
          <BulkBtn onClick={() => bulk("Email sent")}>Send Email</BulkBtn>
          <BulkBtn onClick={() => bulk("Reports downloaded")}>Download Reports</BulkBtn>
          <BulkBtn onClick={() => bulk("Resumes downloaded")}>Download Resume</BulkBtn>
          <BulkBtn onClick={() => bulk("Exported CSV")}>Export CSV</BulkBtn>
          <BulkBtn onClick={() => bulk("Exported Excel")}>Export Excel</BulkBtn>
          <BulkBtn onClick={() => bulk("Tag added")}>Add Tags</BulkBtn>
          <BulkBtn onClick={() => bulk("Tag removed")}>Remove Tags</BulkBtn>
          <BulkBtn onClick={() => bulk("Archived")}>Archive</BulkBtn>
          <BulkBtn onClick={() => bulk("Deleted")} danger>Delete</BulkBtn>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] text-neutral-500 hover:text-white">Clear</button>
        </div>
      )}

      {/* List */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState hasFilters={activeFilterCount(filters) > 0} onReset={() => setFilters(emptyFilters())} />
        ) : view === "table" ? (
          <CandidateTable
            rows={paged}
            selected={selected}
            onToggle={toggleSelect}
            onToggleAll={toggleAll}
            allChecked={paged.length > 0 && paged.every(r => selected.has(r.id))}
            onOpen={openDetails}
            onPreview={setPreview}
            onAction={(label) => notify(label)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {paged.map(c => (
              <CandidateCard key={c.id} c={c} selected={selected.has(c.id)} onToggle={() => toggleSelect(c.id)} onOpen={() => openDetails(c)} onPreview={() => setPreview(c)} onAction={(l) => notify(l)} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-[12px] text-neutral-500">
          <div>Showing <b className="text-neutral-300">{(page - 1) * perPage + 1}</b>–<b className="text-neutral-300">{Math.min(page * perPage, filtered.length)}</b> of <b className="text-neutral-300">{filtered.length.toLocaleString()}</b></div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              Per page
              <select value={perPage} onChange={e => setPerPage(parseInt(e.target.value))} className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-neutral-300 outline-none">
                {[25,50,100,250,500].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-md border border-white/10 px-2 py-1 text-neutral-300 disabled:opacity-30">Prev</button>
              <div>Page {page} / {totalPages}</div>
              <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="rounded-md border border-white/10 px-2 py-1 text-neutral-300 disabled:opacity-30">Next</button>
            </div>
          </div>
        </div>
      )}

      {preview && <PreviewPanel c={preview} onClose={() => setPreview(null)} onOpen={() => openDetails(preview)} />}
    </div>
  );
}

// -------------- Candidates: table --------------

function CandidateTable({ rows, selected, onToggle, onToggleAll, allChecked, onOpen, onPreview, onAction }: {
  rows: Candidate[]; selected: Set<string>; onToggle: (id: string) => void; onToggleAll: () => void; allChecked: boolean;
  onOpen: (c: Candidate) => void; onPreview: (c: Candidate) => void; onAction: (label: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur">
            <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-neutral-500">
              <Th className="w-8"><input type="checkbox" checked={allChecked} onChange={onToggleAll} /></Th>
              <Th>Candidate</Th><Th>Experience</Th><Th>Labs</Th><Th>Assessment</Th><Th>Vitarka</Th><Th>ECI</Th><Th>Recommendation</Th><Th>Submitted</Th><Th>Time</Th><Th>Status</Th><Th className="w-8"></Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.id} onClick={() => onPreview(c)} className={`cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03] ${selected.has(c.id) ? "bg-white/[0.04]" : ""}`}>
                <Td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(c.id)} onChange={() => onToggle(c.id)} /></Td>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} hue={c.avatarHue} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{c.name}</div>
                      <div className="truncate text-[11px] text-neutral-500">{c.email}</div>
                    </div>
                  </div>
                </Td>
                <Td>{experienceBucket(c.experience)}</Td>
                <Td><ScorePill v={c.labsScore} /></Td>
                <Td><ScorePill v={c.assessmentScore} /></Td>
                <Td><span className="text-neutral-300">{vitarkaLabel(c.vitarkaScore)}</span></Td>
                <Td><ScorePill v={c.eci} bold /></Td>
                <Td><RecBadge r={c.recommendation} /></Td>
                <Td>{fmtRel(c.submittedAt)}</Td>
                <Td>{c.completionMinutes}m</Td>
                <Td><StatusChip s={c.status} h={c.hiringStatus} /></Td>
                <Td onClick={e => e.stopPropagation()}>
                  <RowMenu onOpen={() => onOpen(c)} onAction={onAction} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowMenu({ onOpen, onAction }: { onOpen: () => void; onAction: (l: string) => void }) {
  const [open, setOpen] = useState(false);
  const items = [
    { label: "View Details", fn: onOpen },
    { label: "Open Resume", fn: () => onAction("Resume opened") },
    { label: "Download Report", fn: () => onAction("Report downloaded") },
    { label: "Move to Interview", fn: () => onAction("Moved to Interview") },
    { label: "Shortlist", fn: () => onAction("Shortlisted") },
    { label: "Reject", fn: () => onAction("Rejected") },
    { label: "Email Candidate", fn: () => onAction("Email sent") },
    { label: "Copy Candidate Link", fn: () => onAction("Link copied") },
    { label: "Add Note", fn: () => onAction("Note added") },
  ];
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }} className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"><MoreHorizontal className="h-3.5 w-3.5" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-48 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-2xl">
            {items.map(it => (
              <button key={it.label} onClick={() => { it.fn(); setOpen(false); }} className="block w-full px-3 py-2 text-left text-[12px] text-neutral-300 hover:bg-white/5 hover:text-white">{it.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CandidateCard({ c, selected, onToggle, onOpen, onPreview, onAction }: {
  c: Candidate; selected: boolean; onToggle: () => void; onOpen: () => void; onPreview: () => void; onAction: (l: string) => void;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-xl border transition ${selected ? "border-emerald-400/40 bg-emerald-400/[0.04]" : "border-white/5 bg-white/[0.02] hover:border-white/15"}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1" />
          <button onClick={onPreview} className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2.5">
              <Avatar name={c.name} hue={c.avatarHue} size="lg" />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-white">{c.name}</div>
                <div className="truncate text-[11px] text-neutral-500">{c.company} · {experienceBucket(c.experience)}</div>
              </div>
            </div>
          </button>
          <RecBadge r={c.recommendation} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-1 text-[11px] text-neutral-500">
          <span className="truncate">{c.email}</span>
          <span className="truncate text-right">{c.phone}</span>
        </dl>
        <div className="mt-4 grid grid-cols-4 gap-1">
          <ScoreBlock label="Labs" v={c.labsScore} />
          <ScoreBlock label="Assess" v={c.assessmentScore} />
          <ScoreBlock label="Vitarka" v={c.vitarkaScore} />
          <ScoreBlock label="ECI" v={c.eci} highlight />
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
          <span>{fmtRel(c.submittedAt)} · {c.completionMinutes}m</span>
          <StatusChip s={c.status} h={c.hiringStatus} compact />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-white/5 bg-black/20 px-3 py-2 text-[11px]">
        <button onClick={() => onAction("Resume opened")} className="text-neutral-400 hover:text-white">Resume</button>
        <div className="flex items-center gap-1.5">
          <button onClick={onPreview} className="rounded-md border border-white/10 px-2 py-1 text-neutral-300 hover:bg-white/5">Preview</button>
          <button onClick={onOpen} className="rounded-md bg-white/10 px-2 py-1 text-white hover:bg-white/15">View Details</button>
        </div>
      </div>
    </div>
  );
}

// -------------- Filters --------------

function FilterMulti({ label, options, value, onChange, searchable }: { label: string; options: string[]; value: Set<string>; onChange: (v: Set<string>) => void; searchable?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const filtered = searchable && q ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition ${value.size ? "border-white/25 bg-white/[0.06] text-white" : "border-white/10 text-neutral-300 hover:border-white/20"}`}>
        <Filter className="h-3 w-3" /> {label}{value.size ? ` · ${value.size}` : ""}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-2xl">
          {searchable && (
            <div className="border-b border-white/5 p-2">
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} className="w-full rounded-md bg-black/30 px-2 py-1 text-[12px] text-white outline-none" />
            </div>
          )}
          <div className="max-h-64 overflow-auto py-1">
            {filtered.map(o => {
              const on = value.has(o);
              return (
                <button key={o} onClick={() => { const n = new Set(value); on ? n.delete(o) : n.add(o); onChange(n); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-neutral-300 hover:bg-white/5">
                  <span className={`grid h-3.5 w-3.5 place-items-center rounded border ${on ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/20"}`}>{on && <Check className="h-2.5 w-2.5" />}</span>
                  <span className="truncate">{o}</span>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="px-3 py-4 text-center text-[11px] text-neutral-500">No matches</div>}
          </div>
          {value.size > 0 && (
            <div className="border-t border-white/5 p-2 text-right">
              <button onClick={() => onChange(new Set())} className="text-[11px] text-neutral-400 hover:text-white">Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterMinScore({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition ${value != null ? "border-white/25 bg-white/[0.06] text-white" : "border-white/10 text-neutral-300 hover:border-white/20"}`}>
        <Filter className="h-3 w-3" /> {label}{value != null ? ` ≥ ${value}` : ""}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-2xl">
          {[90,80,70,60,null].map((v, i) => (
            <button key={i} onClick={() => { onChange(v); setOpen(false); }} className={`block w-full px-3 py-1.5 text-left text-[12px] hover:bg-white/5 ${value === v ? "text-white" : "text-neutral-300"}`}>
              {v == null ? "Any" : v === 60 ? "Below 70" : `${v}+`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterDate({ value, onChange }: { value: "any"|"today"|"yesterday"|"7d"|"30d"; onChange: (v: any) => void }) {
  const opts: [typeof value, string][] = [["any","Any time"],["today","Today"],["yesterday","Yesterday"],["7d","Last 7 days"],["30d","Last 30 days"]];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const cur = opts.find(o => o[0] === value)?.[1];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] ${value !== "any" ? "border-white/25 bg-white/[0.06] text-white" : "border-white/10 text-neutral-300 hover:border-white/20"}`}>
        <Filter className="h-3 w-3" /> Submitted{value !== "any" ? ` · ${cur}` : ""}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-2xl">
          {opts.map(([k, l]) => (
            <button key={k} onClick={() => { onChange(k); setOpen(false); }} className={`block w-full px-3 py-1.5 text-left text-[12px] hover:bg-white/5 ${value === k ? "text-white" : "text-neutral-300"}`}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------- Sort --------------

function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const opts: [SortKey, string][] = [
    ["newest","Newest submission"],["oldest","Oldest submission"],
    ["eci_desc","Highest ECI"],["eci_asc","Lowest ECI"],
    ["labs_desc","Highest Labs"],["assess_desc","Highest Assessment"],["vit_desc","Highest Vitarka"],
    ["fastest","Fastest completion"],["slowest","Slowest completion"],
    ["name_asc","A → Z"],["name_desc","Z → A"],
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[12px] text-neutral-300 hover:border-white/20">
        <ArrowUpDown className="h-3.5 w-3.5" /> {opts.find(o => o[0] === value)?.[1]}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 shadow-2xl">
            {opts.map(([k, l]) => (
              <button key={k} onClick={() => { onChange(k); setOpen(false); }} className={`block w-full px-3 py-1.5 text-left text-[12px] hover:bg-white/5 ${value === k ? "text-white" : "text-neutral-300"}`}>{l}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// -------------- Preview panel --------------

function PreviewPanel({ c, onClose, onOpen }: { c: Candidate; onClose: () => void; onOpen: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-neutral-950 p-6">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Candidate preview</div>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={c.name} hue={c.avatarHue} size="lg" />
          <div>
            <div className="text-[18px] font-medium text-white">{c.name}</div>
            <div className="text-[12px] text-neutral-500">{c.company} · {experienceBucket(c.experience)}</div>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-[12px]">
          <div className="flex justify-between"><dt className="text-neutral-500">Email</dt><dd className="text-neutral-200">{c.email}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Phone</dt><dd className="text-neutral-200">{c.phone}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">College</dt><dd className="max-w-[60%] truncate text-neutral-200">{c.college}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Domain</dt><dd className="text-neutral-200">{c.domain}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Submitted</dt><dd className="text-neutral-200">{fmtDate(c.submittedAt)}</dd></div>
          <div className="flex justify-between"><dt className="text-neutral-500">Completion</dt><dd className="text-neutral-200">{c.completionMinutes} min</dd></div>
        </dl>

        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Engineering capability</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-[36px] font-medium text-white">{c.eci}</div>
            <div className="text-[12px] text-neutral-500">/100</div>
            <div className="ml-auto"><RecBadge r={c.recommendation} /></div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <ScoreBlock label="Labs" v={c.labsScore} big />
          <ScoreBlock label="Assessment" v={c.assessmentScore} big />
          <ScoreBlock label="Vitarka" v={c.vitarkaScore} big />
        </div>

        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">Skills</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.skills.map(s => <span key={s} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-neutral-300">{s}</span>)}
          </div>
        </div>

        <div className="mt-8 flex gap-2">
          <button onClick={onOpen} className="flex-1 rounded-lg bg-white text-black px-3 py-2 text-[13px] font-medium hover:bg-white/90">View full profile</button>
          <button onClick={onClose} className="rounded-lg border border-white/10 px-3 py-2 text-[13px] text-neutral-300 hover:bg-white/5">Close</button>
        </div>
      </aside>
    </>
  );
}

// -------------- Small building blocks --------------

function SectionTitle({ children }: { children: React.ReactNode }) { return <h2 className="text-[11px] uppercase tracking-widest text-neutral-500">{children}</h2>; }
function HeaderBtn({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode }) {
  return <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-neutral-200 transition hover:bg-white/5 hover:border-white/20">{icon}{children}</button>;
}
function MenuItem({ children, onClick, icon, danger }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode; danger?: boolean }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] ${danger ? "text-red-400 hover:bg-red-500/10" : "text-neutral-200 hover:bg-white/5"}`}>{icon}{children}</button>;
}
function QuickAction({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }) {
  return <button onClick={onClick} className={`rounded-xl border px-3 py-3 text-left text-[12px] transition ${accent ? "border-emerald-400/30 bg-emerald-400/[0.06] text-white hover:bg-emerald-400/10" : "border-white/5 bg-white/[0.02] text-neutral-300 hover:border-white/15 hover:text-white"}`}>{label}</button>;
}
function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "good" | "muted" }) {
  return (
    <div className="bg-neutral-950 px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className={`mt-1 text-[22px] font-medium ${tone === "good" ? "text-emerald-300" : tone === "muted" ? "text-neutral-400" : "text-white"}`}>{value.toLocaleString()}</div>
    </div>
  );
}
function BigStat({ label, value, suffix, icon }: { label: string; value: number; suffix?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-neutral-500">{icon}{label}</div>
      <div className="mt-2 text-[30px] font-medium text-white">{value}<span className="text-[14px] text-neutral-500">{suffix}</span></div>
    </div>
  );
}
function StatusBadge({ status }: { status: "draft" | "published" }) {
  return status === "published"
    ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300"><span className="h-1 w-1 rounded-full bg-emerald-400" /> Published</span>
    : <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300"><span className="h-1 w-1 rounded-full bg-amber-400" /> Draft</span>;
}
function ViewChip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-2.5 py-1 text-[11px] transition ${active ? "bg-white text-black" : "border border-white/10 text-neutral-300 hover:border-white/20 hover:text-white"}`}>{children}</button>;
}
function BulkBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`rounded-md border px-2 py-1 text-[11px] ${danger ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-white/10 text-neutral-200 hover:bg-white/5"}`}>{children}</button>;
}
function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) { return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>; }
function Td({ children, className = "", onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) { return <td onClick={onClick} className={`px-3 py-2 align-middle ${className}`}>{children}</td>; }
function ScorePill({ v, bold }: { v: number; bold?: boolean }) {
  const t = v >= 85 ? "text-emerald-300" : v >= 70 ? "text-cyan-300" : v >= 55 ? "text-amber-300" : "text-red-300";
  return <span className={`${t} ${bold ? "font-medium" : ""}`}>{v}</span>;
}
function ScoreBlock({ label, v, highlight, big }: { label: string; v: number; highlight?: boolean; big?: boolean }) {
  return (
    <div className={`rounded-lg border border-white/5 ${highlight ? "bg-emerald-400/[0.05]" : "bg-black/20"} p-2`}>
      <div className="text-[9px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className={`mt-0.5 ${big ? "text-[20px]" : "text-[14px]"} font-medium text-white`}><ScorePill v={v} /></div>
    </div>
  );
}
function RecBadge({ r }: { r: Recommendation }) {
  const map: Record<Recommendation, string> = {
    "Strong Hire": "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    "Hire": "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    "Maybe": "border-amber-400/30 bg-amber-400/10 text-amber-300",
    "Reject": "border-red-400/30 bg-red-400/10 text-red-300",
  };
  return <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${map[r]}`}>{r}</span>;
}
function StatusChip({ s, h, compact }: { s: CandStatus; h: HiringStatus; compact?: boolean }) {
  const color = h === "Selected" ? "text-emerald-300" : h === "Rejected" ? "text-red-300" : h === "Shortlisted" || h === "Interview Scheduled" ? "text-cyan-300" : "text-neutral-400";
  return (
    <div className={`inline-flex items-center gap-1.5 ${compact ? "text-[10px]" : "text-[11px]"}`}>
      <span className="text-neutral-500">{s}</span>
      <span className="text-neutral-700">·</span>
      <span className={color}>{h}</span>
    </div>
  );
}
function Avatar({ name, hue, size = "md" }: { name: string; hue: number; size?: "md" | "lg" }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("");
  const cls = size === "lg" ? "h-9 w-9 text-[13px]" : "h-7 w-7 text-[11px]";
  return <span className={`grid ${cls} flex-shrink-0 place-items-center rounded-full font-medium text-white`} style={{ background: `linear-gradient(135deg, hsl(${hue} 60% 40%), hsl(${(hue + 60) % 360} 55% 30%))` }}>{initials}</span>;
}
function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-white/10 text-neutral-500"><Users className="h-5 w-5" /></div>
      <div className="mt-4 text-[15px] text-white">{hasFilters ? "No candidates match these filters" : "No candidates yet"}</div>
      <div className="mt-1 text-[12px] text-neutral-500">{hasFilters ? "Try loosening a filter or clearing your search." : "Invite candidates from the header to get started."}</div>
      {hasFilters && <button onClick={onReset} className="mt-4 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-neutral-200 hover:bg-white/5">Reset filters</button>}
    </div>
  );
}
function SimplePane({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center">
      <div className="text-[11px] uppercase tracking-widest text-neutral-500">Coming next</div>
      <div className="mt-2 text-[22px] font-medium text-white">{title}</div>
      <p className="mx-auto mt-3 max-w-md text-[13px] text-neutral-500">{desc}</p>
    </div>
  );
}

// -------------- Helpers --------------

function cap(s: string) { return s[0].toUpperCase() + s.slice(1); }
function fmtDate(t: number) { return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
function fmtRel(t: number) {
  const d = Date.now() - t;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(t);
}
function serializeFilters(f: CandidateFilters): SerializedFilters {
  return {
    search: f.search,
    status: [...f.status], hiring: [...f.hiring], recommendation: [...f.recommendation],
    eciMin: f.eciMin, labsMin: f.labsMin, assessMin: f.assessMin,
    vitarka: [...f.vitarka], dateRange: f.dateRange,
    completion: [...f.completion], experience: [...f.experience],
    colleges: [...f.colleges], companies: [...f.companies],
    skills: [...f.skills], tags: [...f.tags], domains: [...f.domains],
  };
}
function deserializeFilters(s: SerializedFilters): CandidateFilters {
  return {
    search: s.search,
    status: new Set(s.status as CandStatus[]), hiring: new Set(s.hiring as HiringStatus[]),
    recommendation: new Set(s.recommendation as Recommendation[]),
    eciMin: s.eciMin, labsMin: s.labsMin, assessMin: s.assessMin,
    vitarka: new Set(s.vitarka as VitarkaLabel[]), dateRange: s.dateRange as any,
    completion: new Set(s.completion), experience: new Set(s.experience),
    colleges: new Set(s.colleges), companies: new Set(s.companies),
    skills: new Set(s.skills), tags: new Set(s.tags), domains: new Set(s.domains),
  };
}
function buildActivity(candidates: Candidate[]) {
  const items: { id: string; text: string; time: string; tone: "good"|"warn"|"bad"|"neutral"; when: number }[] = [];
  const recent = [...candidates].sort((a, b) => b.submittedAt - a.submittedAt).slice(0, 40);
  for (const c of recent) {
    if (c.status === "Submitted") items.push({ id: c.id + "s", text: `${c.name} submitted the evaluation`, time: fmtRel(c.submittedAt), tone: "neutral", when: c.submittedAt });
    if (c.hiringStatus === "Shortlisted") items.push({ id: c.id + "sh", text: `${c.name} was shortlisted`, time: fmtRel(c.submittedAt - 5 * 60000), tone: "good", when: c.submittedAt - 5 * 60000 });
    if (c.hiringStatus === "Interview Scheduled") items.push({ id: c.id + "iv", text: `${c.name} moved to interview`, time: fmtRel(c.submittedAt - 15 * 60000), tone: "good", when: c.submittedAt - 15 * 60000 });
    if (c.status === "Expired") items.push({ id: c.id + "e", text: `${c.name}'s invitation expired`, time: fmtRel(c.submittedAt), tone: "warn", when: c.submittedAt });
    if (c.hiringStatus === "Selected") items.push({ id: c.id + "sel", text: `${c.name} was selected`, time: fmtRel(c.submittedAt - 3600000), tone: "good", when: c.submittedAt - 3600000 });
  }
  return items.sort((a, b) => b.when - a.when);
}

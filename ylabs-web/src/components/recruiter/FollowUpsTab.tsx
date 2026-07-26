import { useEffect, useMemo, useRef, useState } from "react";
import {
  Save, Users, User, ListChecks, Upload, ClipboardPaste, Mail,
  MoreHorizontal, PhoneCall, Send, Pencil, Trash2, Eye, PowerOff,
  Plus, X, Search, Filter, ChevronDown, CheckCircle2, Clock, PhoneOff,
  MailOpen, MousePointerClick, FileCheck2,
} from "lucide-react";
import type { Evaluation } from "@/lib/recruiter";

const KEY = (id: string) => `yuvro-followups-v2-${id}`;

type Lang = "English" | "Hindi" | "Spanish" | "French" | "German";
type Voice = "Aria (Female)" | "Ryan (Male)" | "Nova (Female)" | "Atlas (Male)";
type Page = "bulk" | "individual" | "records";

interface Candidate { id: string; name: string; email: string; phone: string; }

interface BulkSetup {
  candidates: Candidate[];
  startDate: string;
  deadline: string;
  timezone: string;
  smart: boolean;
  reminder1: string;
  reminder2: string;
  aiCall: boolean;
  aiTiming: string;
  language: Lang;
  voice: Voice;
}

interface IndividualSetup {
  name: string; email: string; phone: string;
  startDate: string; deadline: string;
  reminder1: string; reminder2: string;
  aiCall: boolean; aiTiming: string;
  language: Lang; voice: Voice;
}

interface Persisted { bulk: BulkSetup; individual: IndividualSetup; }

const R1_OPTS = ["2 Days Before Deadline", "1 Day Before Deadline", "12 Hours Before Deadline", "6 Hours Before Deadline", "Custom"];
const R2_OPTS = ["1 Day Before Deadline", "12 Hours Before Deadline", "6 Hours Before Deadline", "2 Hours Before Deadline", "Custom"];
const AI_OPTS = ["6 Hours Before Deadline", "4 Hours Before Deadline", "2 Hours Before Deadline", "Custom"];
const TZS = ["Asia/Kolkata", "America/Los_Angeles", "America/New_York", "Europe/London", "Asia/Singapore", "UTC"];
const LANGS: Lang[] = ["English", "Hindi", "Spanish", "French", "German"];
const VOICES: Voice[] = ["Aria (Female)", "Ryan (Male)", "Nova (Female)", "Atlas (Male)"];

const BULK_DEFAULT: BulkSetup = {
  candidates: [],
  startDate: "", deadline: "", timezone: "Asia/Kolkata",
  smart: true,
  reminder1: "1 Day Before Deadline",
  reminder2: "6 Hours Before Deadline",
  aiCall: false,
  aiTiming: "4 Hours Before Deadline",
  language: "English", voice: "Aria (Female)",
};

const IND_DEFAULT: IndividualSetup = {
  name: "", email: "", phone: "",
  startDate: "", deadline: "",
  reminder1: "1 Day Before Deadline",
  reminder2: "6 Hours Before Deadline",
  aiCall: false,
  aiTiming: "4 Hours Before Deadline",
  language: "English", voice: "Aria (Female)",
};

const DEFAULTS: Persisted = { bulk: BULK_DEFAULT, individual: IND_DEFAULT };

type Activity =
  | "Submitted Test" | "Opened Link" | "Email Opened"
  | "Reminder Sent" | "No Action" | "AI Call Answered" | "AI Call Missed";

type RecordRow = {
  id: string;
  name: string; email: string; phone: string;
  deadline: string;
  followups: boolean; aiCall: boolean;
  emailsSent: number; aiCalls: number;
  submitted: boolean;
  activity: Activity;
  timeline: TimelineEvent[];
};

type TimelineEvent = {
  type: string; date: string; time: string; status: string; meta?: string;
};

const SEED_RECORDS: RecordRow[] = [
  {
    id: "r1", name: "John Marsh", email: "john@email.com", phone: "+91 90000 00001",
    deadline: "30 Jul 2026", followups: true, aiCall: true, emailsSent: 2, aiCalls: 1,
    submitted: true, activity: "Submitted Test",
    timeline: [
      { type: "Invitation Email", date: "23 Jul 2026", time: "10:15 AM", status: "Delivered" },
      { type: "Reminder Email 1", date: "29 Jul 2026", time: "09:00 AM", status: "Opened" },
      { type: "Reminder Email 2", date: "30 Jul 2026", time: "11:30 AM", status: "Clicked Assessment Link" },
      { type: "AI Phone Call", date: "30 Jul 2026", time: "02:00 PM", status: "Answered", meta: "Duration 47 Seconds" },
      { type: "Assessment Submitted", date: "30 Jul 2026", time: "03:42 PM", status: "Completed" },
    ],
  },
  {
    id: "r2", name: "Mary Chen", email: "mary@email.com", phone: "+91 90000 00002",
    deadline: "30 Jul 2026", followups: true, aiCall: true, emailsSent: 1, aiCalls: 0,
    submitted: false, activity: "Email Opened",
    timeline: [
      { type: "Invitation Email", date: "23 Jul 2026", time: "10:15 AM", status: "Delivered" },
      { type: "Reminder Email 1", date: "29 Jul 2026", time: "09:00 AM", status: "Opened" },
    ],
  },
  {
    id: "r3", name: "David Ortiz", email: "david@email.com", phone: "+91 90000 00003",
    deadline: "28 Jul 2026", followups: true, aiCall: false, emailsSent: 2, aiCalls: 0,
    submitted: false, activity: "No Action",
    timeline: [
      { type: "Invitation Email", date: "21 Jul 2026", time: "10:15 AM", status: "Delivered" },
      { type: "Reminder Email 1", date: "27 Jul 2026", time: "09:00 AM", status: "Delivered" },
      { type: "Reminder Email 2", date: "28 Jul 2026", time: "11:30 AM", status: "Delivered" },
    ],
  },
  {
    id: "r4", name: "Priya Kapoor", email: "priya@email.com", phone: "+91 90000 00004",
    deadline: "31 Jul 2026", followups: true, aiCall: true, emailsSent: 1, aiCalls: 1,
    submitted: false, activity: "AI Call Missed",
    timeline: [
      { type: "Invitation Email", date: "24 Jul 2026", time: "10:15 AM", status: "Delivered" },
      { type: "Reminder Email 1", date: "30 Jul 2026", time: "09:00 AM", status: "Delivered" },
      { type: "AI Phone Call", date: "31 Jul 2026", time: "10:00 AM", status: "Missed" },
    ],
  },
];

export function FollowUpsTab({ ev, notify }: { ev: Evaluation; notify: (m: string) => void }) {
  const [page, setPage] = useState<Page>("bulk");
  const [data, setData] = useState<Persisted>(DEFAULTS);
  const [records, setRecords] = useState<RecordRow[]>(SEED_RECORDS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY(ev.id));
      if (raw) setData({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, [ev.id]);

  const persist = (next: Persisted) => {
    setData(next);
    try { localStorage.setItem(KEY(ev.id), JSON.stringify(next)); } catch {}
  };

  const nav: { id: Page; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "bulk", label: "Bulk Setup", icon: <Users className="h-4 w-4" />, desc: "Multiple candidates" },
    { id: "individual", label: "Individual Setup", icon: <User className="h-4 w-4" />, desc: "One candidate" },
    { id: "records", label: "Records", icon: <ListChecks className="h-4 w-4" />, desc: "Tracking & activity" },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">Follow-ups</div>
        <nav className="mt-4 flex flex-col gap-1">
          {nav.map((n) => {
            const active = page === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={`group flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-white/15 bg-white/[0.06] text-white"
                    : "border-transparent text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <span className={`mt-0.5 ${active ? "text-white" : "text-neutral-500 group-hover:text-neutral-300"}`}>{n.icon}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{n.label}</span>
                  <span className="mt-0.5 block text-[11px] text-neutral-500">{n.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div>
        {page === "bulk" && <BulkPage bulk={data.bulk} onChange={(b) => persist({ ...data, bulk: b })} notify={notify} />}
        {page === "individual" && <IndividualPage ind={data.individual} onChange={(i) => persist({ ...data, individual: i })} notify={notify} />}
        {page === "records" && <RecordsPage records={records} setRecords={setRecords} notify={notify} />}
      </div>
    </div>
  );
}

/* ────────────────────────── BULK PAGE ────────────────────────── */

function BulkPage({ bulk, onChange, notify }: { bulk: BulkSetup; onChange: (b: BulkSetup) => void; notify: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof BulkSetup>(k: K, v: BulkSetup[K]) => { onChange({ ...bulk, [k]: v }); setDirty(true); };

  const parseCsv = (text: string): Candidate[] => {
    return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line, i) => {
      const [name = "", email = "", phone = ""] = line.split(/,|\t/).map((s) => s.trim());
      return { id: `c-${Date.now()}-${i}`, name, email, phone };
    }).filter((c) => c.email || c.name);
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    const text = await f.text();
    const rows = parseCsv(text);
    set("candidates", [...bulk.candidates, ...rows]);
    notify(`Imported ${rows.length} candidates`);
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = parseCsv(text);
      set("candidates", [...bulk.candidates, ...rows]);
      notify(`Pasted ${rows.length} candidates`);
    } catch { notify("Clipboard access denied"); }
  };

  const addRow = () => set("candidates", [...bulk.candidates, { id: `c-${Date.now()}`, name: "", email: "", phone: "" }]);
  const updRow = (id: string, patch: Partial<Candidate>) => set("candidates", bulk.candidates.map((c) => c.id === id ? { ...c, ...patch } : c));
  const delRow = (id: string) => set("candidates", bulk.candidates.filter((c) => c.id !== id));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Bulk Setup"
        description="Configure automated reminders and AI phone calls for multiple candidates in a single flow."
      />

      <Section title="Candidate Upload" description="Import candidates from a CSV, paste from Excel, or add them manually. Review the parsed rows before activating follow-ups.">
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => fileRef.current?.click()} className={btnOutline}><Upload className="h-3.5 w-3.5" /> Upload CSV</button>
          <button onClick={paste} className={btnOutline}><ClipboardPaste className="h-3.5 w-3.5" /> Paste from Excel</button>
          <button onClick={addRow} className={btnOutline}><Plus className="h-3.5 w-3.5" /> Add Row</button>
          <div className="ml-auto flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-[12px] text-neutral-300">
            <span className="text-neutral-500">Imported Candidates</span>
            <span className="font-medium text-white">{bulk.candidates.length}</span>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-white/[0.03] text-left text-[11px] uppercase tracking-widest text-neutral-500">
                <Th className="w-[28%]">Name</Th>
                <Th className="w-[34%]">Email</Th>
                <Th className="w-[26%]">Phone Number</Th>
                <Th className="w-[12%] text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {bulk.candidates.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="px-3 py-2"><input value={c.name} onChange={(e) => updRow(c.id, { name: e.target.value })} className={cellInp} placeholder="Jane Doe" /></td>
                  <td className="px-3 py-2"><input value={c.email} onChange={(e) => updRow(c.id, { email: e.target.value })} className={cellInp} placeholder="jane@company.com" /></td>
                  <td className="px-3 py-2"><input value={c.phone} onChange={(e) => updRow(c.id, { phone: e.target.value })} className={cellInp} placeholder="+91 90000 00000" /></td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => delRow(c.id)} className="rounded-md p-1.5 text-neutral-400 hover:bg-white/5 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
              {bulk.candidates.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-[12.5px] text-neutral-500">No candidates yet. Upload a CSV or add a row to begin.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11.5px] text-neutral-500">Phone numbers are only required for AI phone calls.</p>
      </Section>

      <Section title="Assessment Schedule" description="Set the window during which candidates can access and complete the assessment.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Start Date"><input type="datetime-local" value={bulk.startDate} onChange={(e) => set("startDate", e.target.value)} className={inp} /></Field>
          <Field label="Deadline"><input type="datetime-local" value={bulk.deadline} onChange={(e) => set("deadline", e.target.value)} className={inp} /></Field>
          <Field label="Timezone">
            <select value={bulk.timezone} onChange={(e) => set("timezone", e.target.value)} className={inp}>
              {TZS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Smart Follow-ups" description="Automated reminders sent only to candidates who haven't submitted yet.">
        <Toggle
          label="Enable Smart Follow-ups"
          desc="Automatically send reminder emails to candidates who haven't submitted the assessment."
          value={bulk.smart}
          onChange={(v) => set("smart", v)}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Reminder Email 1">
            <select value={bulk.reminder1} onChange={(e) => set("reminder1", e.target.value)} className={inp} disabled={!bulk.smart}>
              {R1_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Reminder Email 2">
            <select value={bulk.reminder2} onChange={(e) => set("reminder2", e.target.value)} className={inp} disabled={!bulk.smart}>
              {R2_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="AI Phone Call" description="Reach out with an AI voice call to candidates who still haven't submitted.">
        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-4">
          <input type="checkbox" checked={bulk.aiCall} onChange={(e) => set("aiCall", e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-400" />
          <span>
            <span className="block text-[13px] font-medium text-white">Enable AI Phone Call</span>
            <span className="mt-1 block text-[12px] text-neutral-400">Only call candidates who have not submitted before the selected reminder time.</span>
          </span>
        </label>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Field label="Timing">
            <select value={bulk.aiTiming} onChange={(e) => set("aiTiming", e.target.value)} className={inp} disabled={!bulk.aiCall}>
              {AI_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Language">
            <select value={bulk.language} onChange={(e) => set("language", e.target.value as Lang)} className={inp} disabled={!bulk.aiCall}>
              {LANGS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Voice">
            <select value={bulk.voice} onChange={(e) => set("voice", e.target.value as Voice)} className={inp} disabled={!bulk.aiCall}>
              {VOICES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <div className="flex items-center justify-between border-t border-white/10 pt-6">
        <div className="text-[12px] text-neutral-500">{dirty ? "Unsaved changes" : "All changes saved"}</div>
        <button onClick={() => { setDirty(false); notify("Follow-ups activated for bulk candidates"); }} className={btnPrimary}>
          <Send className="h-3.5 w-3.5" /> Save & Activate Follow-ups
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── INDIVIDUAL PAGE ─────────────────────── */

function IndividualPage({ ind, onChange, notify }: { ind: IndividualSetup; onChange: (i: IndividualSetup) => void; notify: (m: string) => void }) {
  const set = <K extends keyof IndividualSetup>(k: K, v: IndividualSetup[K]) => onChange({ ...ind, [k]: v });

  return (
    <div className="space-y-10">
      <PageHeader title="Individual Setup" description="Configure a personalized reminder cadence for a single candidate." />

      <Section title="Candidate Details" description="Contact information used for reminder emails and AI phone calls.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Candidate Name"><input value={ind.name} onChange={(e) => set("name", e.target.value)} className={inp} placeholder="Jane Doe" /></Field>
          <Field label="Email Address"><input value={ind.email} onChange={(e) => set("email", e.target.value)} className={inp} placeholder="jane@company.com" /></Field>
          <Field label="Phone Number"><input value={ind.phone} onChange={(e) => set("phone", e.target.value)} className={inp} placeholder="+91 90000 00000" /></Field>
        </div>
      </Section>

      <Section title="Assessment Schedule" description="When the candidate can start and must complete the assessment.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Start Date"><input type="datetime-local" value={ind.startDate} onChange={(e) => set("startDate", e.target.value)} className={inp} /></Field>
          <Field label="Deadline"><input type="datetime-local" value={ind.deadline} onChange={(e) => set("deadline", e.target.value)} className={inp} /></Field>
        </div>
      </Section>

      <Section title="Reminder Emails" description="Two automated reminders sent relative to the deadline.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Reminder Email 1">
            <select value={ind.reminder1} onChange={(e) => set("reminder1", e.target.value)} className={inp}>
              {R1_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Reminder Email 2">
            <select value={ind.reminder2} onChange={(e) => set("reminder2", e.target.value)} className={inp}>
              {R2_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="AI Phone Call" description="Optional voice outreach if the candidate hasn't submitted.">
        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-4">
          <input type="checkbox" checked={ind.aiCall} onChange={(e) => set("aiCall", e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-400" />
          <span>
            <span className="block text-[13px] font-medium text-white">Enable AI Phone Call</span>
            <span className="mt-1 block text-[12px] text-neutral-400">Only call this candidate if they haven't submitted before the selected time.</span>
          </span>
        </label>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Field label="AI Call Timing">
            <select value={ind.aiTiming} onChange={(e) => set("aiTiming", e.target.value)} className={inp} disabled={!ind.aiCall}>
              {AI_OPTS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Language">
            <select value={ind.language} onChange={(e) => set("language", e.target.value as Lang)} className={inp} disabled={!ind.aiCall}>
              {LANGS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Voice">
            <select value={ind.voice} onChange={(e) => set("voice", e.target.value as Voice)} className={inp} disabled={!ind.aiCall}>
              {VOICES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <div className="flex items-center justify-end border-t border-white/10 pt-6">
        <button onClick={() => notify("Candidate added and follow-ups activated")} className={btnPrimary}>
          <User className="h-3.5 w-3.5" /> Add Candidate & Activate Follow-ups
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── RECORDS PAGE ───────────────────────── */

type FilterKey = "all" | "submitted" | "not_submitted" | "ai_on" | "ai_off" | "rem_on" | "rem_off";
type SortKey = "deadline" | "activity" | "emails" | "aiCalls" | "submitted";

function RecordsPage({ records, setRecords, notify }: {
  records: RecordRow[]; setRecords: React.Dispatch<React.SetStateAction<RecordRow[]>>; notify: (m: string) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("deadline");
  const [drawer, setDrawer] = useState<RecordRow | null>(null);

  const filtered = useMemo(() => {
    let list = records.slice();
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s) || r.phone.toLowerCase().includes(s));
    }
    switch (filter) {
      case "submitted": list = list.filter((r) => r.submitted); break;
      case "not_submitted": list = list.filter((r) => !r.submitted); break;
      case "ai_on": list = list.filter((r) => r.aiCall); break;
      case "ai_off": list = list.filter((r) => !r.aiCall); break;
      case "rem_on": list = list.filter((r) => r.followups); break;
      case "rem_off": list = list.filter((r) => !r.followups); break;
    }
    list.sort((a, b) => {
      switch (sort) {
        case "deadline": return a.deadline.localeCompare(b.deadline);
        case "activity": return a.activity.localeCompare(b.activity);
        case "emails": return b.emailsSent - a.emailsSent;
        case "aiCalls": return b.aiCalls - a.aiCalls;
        case "submitted": return Number(b.submitted) - Number(a.submitted);
      }
    });
    return list;
  }, [records, q, filter, sort]);

  const summary = useMemo(() => {
    const total = records.length;
    const submitted = records.filter((r) => r.submitted).length;
    const emails = records.reduce((n, r) => n + r.emailsSent, 0);
    const noResp = records.filter((r) => r.activity === "No Action").length;
    const aiCalls = records.reduce((n, r) => n + r.aiCalls, 0);
    return { total, emails, submitted, noResp, aiCalls };
  }, [records]);

  return (
    <div className="space-y-8">
      <PageHeader title="Records" description="Track every reminder email, AI call, and candidate interaction from one place." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total Candidates" value={summary.total} />
        <Stat label="Reminder Emails Sent" value={summary.emails} />
        <Stat label="Submitted Tests" value={summary.submitted} />
        <Stat label="No Response" value={summary.noResp} />
        <Stat label="AI Calls Completed" value={summary.aiCalls} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or phone…"
            className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-[13px] text-white outline-none focus:border-white/25" />
        </div>
        <SelectPill icon={<Filter className="h-3.5 w-3.5" />} value={filter} onChange={(v) => setFilter(v as FilterKey)} options={[
          { v: "all", l: "All Candidates" },
          { v: "submitted", l: "Submitted" },
          { v: "not_submitted", l: "Not Submitted" },
          { v: "ai_on", l: "AI Call Enabled" },
          { v: "ai_off", l: "AI Call Disabled" },
          { v: "rem_on", l: "Reminder Enabled" },
          { v: "rem_off", l: "Reminder Disabled" },
        ]} />
        <SelectPill icon={<ChevronDown className="h-3.5 w-3.5" />} value={sort} onChange={(v) => setSort(v as SortKey)} options={[
          { v: "deadline", l: "Sort: Deadline" },
          { v: "activity", l: "Sort: Current Activity" },
          { v: "emails", l: "Sort: Emails Sent" },
          { v: "aiCalls", l: "Sort: AI Calls" },
          { v: "submitted", l: "Sort: Submission Status" },
        ]} />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-white/[0.03] text-left text-[11px] uppercase tracking-widest text-neutral-500">
              <Th>Candidate</Th><Th>Email</Th><Th>Deadline</Th><Th>Follow-ups</Th>
              <Th>AI Call</Th><Th>Emails</Th><Th>Current Activity</Th><Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <RecordRowView key={r.id} row={r} notify={notify}
                onOpen={() => setDrawer(r)}
                onRemove={() => setRecords((rs) => rs.filter((x) => x.id !== r.id))}
                onToggleFollowups={() => setRecords((rs) => rs.map((x) => x.id === r.id ? { ...x, followups: !x.followups } : x))}
              />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-12 text-center text-[12.5px] text-neutral-500">No candidates match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {drawer && <HistoryDrawer row={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}

function RecordRowView({ row, notify, onOpen, onRemove, onToggleFollowups }: {
  row: RecordRow; notify: (m: string) => void; onOpen: () => void; onRemove: () => void; onToggleFollowups: () => void;
}) {
  const [open, setOpen] = useState(false);
  const act = activityMeta(row.activity);
  return (
    <tr className="border-t border-white/5 text-neutral-200">
      <td className="px-3 py-3 font-medium text-white">{row.name}</td>
      <td className="px-3 py-3 text-neutral-400">{row.email}</td>
      <td className="px-3 py-3">{row.deadline}</td>
      <td className="px-3 py-3">{row.followups ? "Enabled" : "Disabled"}</td>
      <td className="px-3 py-3">{row.aiCall ? "Yes" : "No"}</td>
      <td className="px-3 py-3">{row.emailsSent}</td>
      <td className="px-3 py-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${act.tone}`}>
          {act.icon}{row.activity}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="relative inline-block">
          <button onClick={() => setOpen((v) => !v)} className="rounded-md border border-white/10 p-1.5 text-neutral-300 hover:bg-white/5"><MoreHorizontal className="h-3.5 w-3.5" /></button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-white/10 bg-neutral-950 text-left shadow-2xl">
                <Item icon={<Eye className="h-3.5 w-3.5" />} onClick={() => { onOpen(); setOpen(false); }}>View Communication History</Item>
                <Item icon={<Send className="h-3.5 w-3.5" />} onClick={() => { notify("Reminder sent"); setOpen(false); }}>Send Reminder Now</Item>
                <Item icon={<PhoneCall className="h-3.5 w-3.5" />} onClick={() => { notify("AI call triggered"); setOpen(false); }}>Trigger AI Call</Item>
                <Item icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { notify("Edit deadline"); setOpen(false); }}>Edit Deadline</Item>
                <Item icon={<PowerOff className="h-3.5 w-3.5" />} onClick={() => { onToggleFollowups(); setOpen(false); }}>{row.followups ? "Disable" : "Enable"} Follow-ups</Item>
                <div className="h-px bg-white/5" />
                <Item icon={<Trash2 className="h-3.5 w-3.5" />} danger onClick={() => { onRemove(); setOpen(false); notify("Candidate deleted"); }}>Delete Candidate</Item>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function HistoryDrawer({ row, onClose }: { row: RecordRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-neutral-950">
        <header className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Communication History</div>
            <div className="mt-1 text-[16px] font-medium text-white">{row.name}</div>
            <div className="text-[12px] text-neutral-400">{row.email}</div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ol className="relative border-l border-white/10 pl-6">
            {row.timeline.map((t, i) => (
              <li key={i} className="mb-6 last:mb-0">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white/20 bg-neutral-900" />
                <div className="text-[13px] font-medium text-white">{t.type}</div>
                <div className="mt-0.5 text-[11.5px] text-neutral-500">{t.date} · {t.time}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-neutral-200">{t.status}</div>
                {t.meta && <div className="mt-1 text-[11.5px] text-neutral-400">{t.meta}</div>}
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────── UI PRIMITIVES ───────────────────────── */

const inp = "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px] text-white outline-none focus:border-white/25 disabled:opacity-50";
const cellInp = "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[12.5px] text-white outline-none hover:border-white/10 focus:border-white/25 focus:bg-black/30";
const btnOutline = "inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-transparent px-3 py-1.5 text-[12px] text-neutral-100 hover:bg-white/5";
const btnPrimary = "inline-flex items-center gap-1.5 rounded-md bg-white px-4 py-2 text-[12.5px] font-medium text-black transition hover:bg-white/90";

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="border-b border-white/10 pb-6">
      <h2 className="text-[22px] font-medium tracking-tight text-white">{title}</h2>
      <p className="mt-2 max-w-2xl text-[13px] text-neutral-400">{description}</p>
    </header>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-5">
        <h3 className="text-[15px] font-medium text-white">{title}</h3>
        {description && <p className="mt-1 text-[12.5px] text-neutral-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] uppercase tracking-widest text-neutral-500">{label}</div>
      {children}
    </label>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-6 rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-white">{label}</div>
        {desc && <div className="mt-1 text-[12px] text-neutral-400">{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)} className={`relative h-5 w-9 shrink-0 rounded-full transition ${value ? "bg-amber-400" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-4" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-2 text-[22px] font-medium text-white">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 font-normal ${className}`}>{children}</th>;
}

function Item({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2 px-3 py-2 text-[12px] hover:bg-white/5 ${danger ? "text-red-300" : "text-neutral-200"}`}>
      {icon}{children}
    </button>
  );
}

function SelectPill({ icon, value, onChange, options }: {
  icon: React.ReactNode; value: string; onChange: (v: string) => void; options: { v: string; l: string }[];
}) {
  return (
    <div className="relative inline-flex items-center">
      <span className="pointer-events-none absolute left-2.5 text-neutral-400">{icon}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-white/10 bg-black/20 py-2 pl-8 pr-8 text-[12.5px] text-white outline-none focus:border-white/25">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-neutral-400" />
    </div>
  );
}

function activityMeta(a: Activity): { icon: React.ReactNode; tone: string } {
  switch (a) {
    case "Submitted Test": return { icon: <FileCheck2 className="h-3 w-3" />, tone: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" };
    case "AI Call Answered": return { icon: <PhoneCall className="h-3 w-3" />, tone: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" };
    case "Opened Link": return { icon: <MousePointerClick className="h-3 w-3" />, tone: "border-amber-400/30 bg-amber-400/10 text-amber-300" };
    case "Email Opened": return { icon: <MailOpen className="h-3 w-3" />, tone: "border-amber-400/30 bg-amber-400/10 text-amber-300" };
    case "Reminder Sent": return { icon: <Mail className="h-3 w-3" />, tone: "border-white/15 bg-white/[0.03] text-neutral-200" };
    case "AI Call Missed": return { icon: <PhoneOff className="h-3 w-3" />, tone: "border-red-400/30 bg-red-400/10 text-red-300" };
    case "No Action": return { icon: <Clock className="h-3 w-3" />, tone: "border-red-400/30 bg-red-400/10 text-red-300" };
  }
  return { icon: <CheckCircle2 className="h-3 w-3" />, tone: "border-white/15 bg-white/[0.03] text-neutral-200" };
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export const Route = createFileRoute("/evaluation/workspace")({
  head: () => ({ meta: [{ title: "Evaluation workspace — Yuvro Labs" }, { name: "robots", content: "noindex" }] }),
  component: Workspace,
});

// ────────────────────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────────────────────

type LabId = "payments" | "sql";
type SectionId = "labs" | "knowledge" | "coding" | "discussion";
type SubjectId = "java" | "sql" | "javascript" | "systemdesign";

const LABS: { id: LabId; title: string; sub: string; minutes: number; problem: string; tasks: string[]; file: string; code: string; terminal: string[] }[] = [
  {
    id: "payments",
    title: "Payment Service Debugging",
    sub: "Node.js · REST · Postgres",
    minutes: 15,
    problem:
      "A webhook retry worker is silently dropping failed events. Investigate the queue handler, identify the regression introduced in commit a17f4c9, and restore idempotent retries with exponential backoff.",
    tasks: [
      "Reproduce the dropped-event scenario from the failing test.",
      "Locate the regression in the queue handler and describe the root cause.",
      "Restore idempotent retries with exponential backoff.",
      "Add a regression test to prevent recurrence.",
    ],
    file: "services/payments/queue-handler.ts",
    code:
`export async function handleWebhook(event: WebhookEvent) {
  const record = await db.events.findByIdempotencyKey(event.id);
  if (record?.status === "processed") return;

  try {
    await processEvent(event);
    await db.events.markProcessed(event.id);
  } catch (err) {
    // TODO(you): retries were removed here — restore backoff
    logger.error({ err, event }, "webhook failed");
    // drops the event silently 👀
  }
}`,
    terminal: [
      "$ pnpm test payments/queue-handler",
      "  ✕ retries a transient failure with backoff",
      "  ✓ marks processed on success",
      "  ✕ does not re-process an already processed event",
    ],
  },
  {
    id: "sql",
    title: "SQL Performance Optimisation",
    sub: "Postgres · 14M rows · read-heavy",
    minutes: 15,
    problem:
      "Analytics rollups are timing out at p95. Analyse the query plan, propose an index strategy, and rewrite the query so the p95 stays under 400ms on the seeded dataset.",
    tasks: [
      "Read the EXPLAIN ANALYZE output for the current query.",
      "Propose an index (or composite index) that removes the sequential scan.",
      "Rewrite the query to avoid the correlated subquery.",
      "Verify the new plan and document the trade-offs.",
    ],
    file: "queries/monthly_rollup.sql",
    code:
`SELECT
  u.id,
  u.name,
  (SELECT COUNT(*) FROM events e
    WHERE e.user_id = u.id
      AND e.created_at >= date_trunc('month', now())) AS event_count
FROM users u
WHERE u.status = 'active'
ORDER BY event_count DESC
LIMIT 100;`,
    terminal: [
      "$ EXPLAIN ANALYZE ... ",
      "  Seq Scan on users  (cost=0.00..42198.00 rows=1400000)",
      "  SubPlan 1: Seq Scan on events (cost=0.00..91882 rows=14M)",
      "  Planning Time: 0.8 ms",
      "  Execution Time: 2841 ms",
    ],
  },
];

const KNOWLEDGE: { id: SubjectId; title: string; questions: { q: string; options: string[]; correct: number }[] }[] = [
  {
    id: "java",
    title: "Java",
    questions: [
      { q: "Which collection guarantees insertion order and allows null values?", options: ["HashMap", "LinkedHashMap", "TreeMap", "ConcurrentHashMap"], correct: 1 },
      { q: "What does the volatile keyword primarily guarantee?", options: ["Atomicity of compound actions", "Visibility of writes across threads", "Mutual exclusion", "Reordering prevention only in the compiler"], correct: 1 },
      { q: "Which stream operation is a terminal operation?", options: ["map", "filter", "collect", "peek"], correct: 2 },
      { q: "Which is true about checked exceptions?", options: ["They extend RuntimeException", "They must be declared or caught", "They are ignored by the compiler", "They cannot be user-defined"], correct: 1 },
      { q: "What is the default fetch type for @OneToMany in JPA?", options: ["EAGER", "LAZY", "AUTO", "SUBSELECT"], correct: 1 },
    ],
  },
  {
    id: "sql",
    title: "SQL",
    questions: [
      { q: "Which index type best serves range queries on a timestamp column?", options: ["Hash", "B-Tree", "GIN", "BRIN for very large tables"], correct: 3 },
      { q: "A LEFT JOIN returns…", options: ["Only matching rows", "All rows from the right table", "All rows from the left table, with nulls for missing right matches", "The intersection"], correct: 2 },
      { q: "Which isolation level prevents phantom reads?", options: ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE", "READ UNCOMMITTED"], correct: 2 },
      { q: "Given a slow query, the first thing to inspect is…", options: ["Server CPU", "The query plan", "Network latency", "Row counts"], correct: 1 },
      { q: "A window function differs from GROUP BY because…", options: ["It aggregates without collapsing rows", "It cannot use PARTITION BY", "It must have an ORDER BY", "It only works on numeric columns"], correct: 0 },
    ],
  },
  {
    id: "javascript",
    title: "JavaScript",
    questions: [
      { q: "typeof null returns…", options: ["'null'", "'undefined'", "'object'", "'number'"], correct: 2 },
      { q: "Which best describes a Promise's microtask?", options: ["Runs before the next macrotask", "Runs on the next animation frame", "Blocks the event loop", "Runs on a separate thread"], correct: 0 },
      { q: "Object spread performs…", options: ["A deep clone", "A shallow copy of own enumerable properties", "A reference copy", "A structured clone"], correct: 1 },
      { q: "In strict mode, this in a plain function call is…", options: ["The global object", "undefined", "The caller", "The module"], correct: 1 },
      { q: "Which loop returns a new array?", options: ["for", "forEach", "map", "while"], correct: 2 },
    ],
  },
  {
    id: "systemdesign",
    title: "System Design",
    questions: [
      { q: "The CAP theorem forces a trade-off between…", options: ["Cost and performance", "Consistency and availability under partition", "Latency and throughput", "Reads and writes"], correct: 1 },
      { q: "A read-heavy service benefits most from…", options: ["Write-through cache", "Read replicas + cache", "Two-phase commit", "Distributed locks"], correct: 1 },
      { q: "Idempotency keys are primarily used to…", options: ["Speed up requests", "Prevent duplicate side effects on retry", "Encrypt payloads", "Compress responses"], correct: 1 },
      { q: "For a work queue with strict ordering per user, prefer…", options: ["A single global FIFO", "Partition by user id", "Round-robin workers", "LIFO with backpressure"], correct: 1 },
      { q: "Which is a good SLO for a public API?", options: ["100% availability", "99.9% success rate, p95 < 300ms", "0 errors ever", "Fastest possible response"], correct: 1 },
    ],
  },
];

const DISCUSSION_QUESTIONS = [
  "Walk me through the regression you identified in the payments queue. Why do you think it was introduced?",
  "You chose exponential backoff for retries — how would you decide the max attempts and the ceiling?",
  "For the SQL rollup, what led you to your index choice, and what does it cost on the write path?",
  "Imagine the events table grows 10× next quarter. What breaks first?",
  "If you had another 30 minutes, what would you improve about either solution?",
];

const TOTAL_SECONDS = 60 * 60;
const DISCUSSION_LOCK_SECONDS = 15 * 60;

// ────────────────────────────────────────────────────────────────────────────
// Workspace
// ────────────────────────────────────────────────────────────────────────────

function Workspace() {
  const nav = useNavigate();
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [section, setSection] = useState<SectionId>("labs");
  const [openLab, setOpenLab] = useState<LabId | null>(null);
  const [submittedLabs, setSubmittedLabs] = useState<Set<LabId>>(new Set());
  const [taskState, setTaskState] = useState<Record<string, Set<number>>>({});
  const [subject, setSubject] = useState<SubjectId | null>(null);
  const [answers, setAnswers] = useState<Record<string, (number | null)[]>>({});
  const [marked, setMarked] = useState<Record<string, Set<number>>>({});
  const [qIndex, setQIndex] = useState(0);
  const [submittedSubjects, setSubmittedSubjects] = useState<Set<SubjectId>>(new Set());
  const [codingSubmitted, setCodingSubmitted] = useState(false);
  const [codingLanguage, setCodingLanguage] = useState("javascript");
  const [codingCode, setCodingCode] = useState(
`function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}`
  );
  const [codingResults, setCodingResults] = useState<null | { name: string; pass: boolean }[]>(null);
  const [discussionIndex, setDiscussionIndex] = useState(0);
  const [discussionResponses, setDiscussionResponses] = useState<string[]>([]);
  const [discussionDraft, setDiscussionDraft] = useState("");
  const [modal, setModal] = useState<null | { kind: "submit-lab"; id: LabId } | { kind: "submit-subject"; id: SubjectId } | { kind: "submit-coding" } | { kind: "end-discussion" } | { kind: "exit" } | { kind: "tab-warning" } | { kind: "discussion-starting" } | { kind: "fullscreen" }>(null);
  const [autosave, setAutosave] = useState<"idle" | "saving" | "saved">("saved");
  const [online, setOnline] = useState(true);
  const discussionTriggered = useRef(false);

  // Timer
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(t); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Trigger discussion lock at 15 min
  useEffect(() => {
    if (remaining <= DISCUSSION_LOCK_SECONDS && !discussionTriggered.current && remaining > 0) {
      discussionTriggered.current = true;
      setSection("discussion");
      setOpenLab(null);
      setSubject(null);
      setModal({ kind: "discussion-starting" });
    }
    if (remaining === 0) submitEvaluation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // Tab-switch warning
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setModal(m => m ?? { kind: "tab-warning" });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Online status
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Autosave feel
  const touchAutosave = () => {
    setAutosave("saving");
    window.clearTimeout((touchAutosave as any)._t);
    (touchAutosave as any)._t = window.setTimeout(() => setAutosave("saved"), 600);
  };

  const locked = discussionTriggered.current;

  const submitEvaluation = () => {
    try { document.exitFullscreen?.(); } catch {}
    nav({ to: "/evaluation/complete" });
  };

  // Section statuses
  const labsStatus = useMemo(() => submittedLabs.size === LABS.length ? "complete" : submittedLabs.size > 0 ? "in-progress" : section === "labs" ? "current" : "not-started", [submittedLabs, section]);
  const knowStatus = useMemo(() => submittedSubjects.size === KNOWLEDGE.length ? "complete" : submittedSubjects.size > 0 ? "in-progress" : section === "knowledge" ? "current" : "not-started", [submittedSubjects, section]);
  const codingStatus = codingSubmitted ? "complete" : section === "coding" ? "current" : "not-started";
  const discussionStatus = discussionIndex >= DISCUSSION_QUESTIONS.length ? "complete" : locked ? "current" : "locked";

  const goSection = (s: SectionId) => {
    if (locked && s !== "discussion") return;
    setSection(s);
    setOpenLab(null);
    setSubject(null);
    setQIndex(0);
  };

  // Handlers
  const toggleTask = (labId: LabId, i: number) => {
    setTaskState(prev => {
      const s = new Set(prev[labId] ?? []);
      if (s.has(i)) s.delete(i); else s.add(i);
      return { ...prev, [labId]: s };
    });
    touchAutosave();
  };
  const confirmSubmitLab = (labId: LabId) => {
    setSubmittedLabs(prev => new Set(prev).add(labId));
    setOpenLab(null);
    setModal(null);
  };
  const setAnswer = (subj: SubjectId, i: number, opt: number) => {
    setAnswers(prev => {
      const arr = prev[subj] ? [...prev[subj]] : Array(5).fill(null);
      arr[i] = opt;
      return { ...prev, [subj]: arr };
    });
    touchAutosave();
  };
  const clearAnswer = (subj: SubjectId, i: number) => {
    setAnswers(prev => {
      const arr = prev[subj] ? [...prev[subj]] : Array(5).fill(null);
      arr[i] = null;
      return { ...prev, [subj]: arr };
    });
  };
  const toggleMarked = (subj: SubjectId, i: number) => {
    setMarked(prev => {
      const s = new Set(prev[subj] ?? []);
      if (s.has(i)) s.delete(i); else s.add(i);
      return { ...prev, [subj]: s };
    });
  };
  const confirmSubmitSubject = (subj: SubjectId) => {
    setSubmittedSubjects(prev => new Set(prev).add(subj));
    setSubject(null);
    setQIndex(0);
    setModal(null);
  };
  const runCode = () => {
    setCodingResults(null);
    setTimeout(() => {
      setCodingResults([
        { name: "twoSum([2,7,11,15], 9)", pass: true },
        { name: "twoSum([3,2,4], 6)", pass: true },
        { name: "twoSum([3,3], 6)", pass: true },
        { name: "edge case: empty array", pass: /return \[\]/.test(codingCode) },
      ]);
    }, 500);
  };
  const confirmSubmitCoding = () => {
    setCodingSubmitted(true);
    setModal(null);
  };
  const submitDiscussionAnswer = () => {
    if (!discussionDraft.trim()) return;
    setDiscussionResponses(r => [...r, discussionDraft.trim()]);
    setDiscussionDraft("");
    setDiscussionIndex(i => i + 1);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#fafaf7] text-neutral-900 antialiased">
      <TopBar
        remaining={remaining}
        online={online}
        autosave={autosave}
        section={section}
        onExit={() => setModal({ kind: "exit" })}
        onJumpToDiscussion={() => setRemaining(DISCUSSION_LOCK_SECONDS + 5)}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          section={section}
          openLab={openLab}
          subject={subject}
          onSelectSection={goSection}
          onSelectLab={(id) => { setSection("labs"); setOpenLab(id); }}
          onSelectSubject={(id) => { setSection("knowledge"); setSubject(id); setQIndex(0); }}
          labsStatus={labsStatus}
          knowStatus={knowStatus}
          codingStatus={codingStatus}
          discussionStatus={discussionStatus}
          submittedLabs={submittedLabs}
          submittedSubjects={submittedSubjects}
          locked={locked}
        />

        <main className="min-w-0 flex-1 overflow-y-auto">
          {section === "labs" && (
            openLab ? (
              <LabDetail
                lab={LABS.find(l => l.id === openLab)!}
                tasks={taskState[openLab] ?? new Set()}
                submitted={submittedLabs.has(openLab)}
                onToggleTask={(i) => toggleTask(openLab, i)}
                onBack={() => setOpenLab(null)}
                onSubmit={() => setModal({ kind: "submit-lab", id: openLab })}
              />
            ) : (
              <LabsList
                submitted={submittedLabs}
                onOpen={(id) => setOpenLab(id)}
                onFinishSection={() => goSection("knowledge")}
              />
            )
          )}

          {section === "knowledge" && (
            subject ? (
              <KnowledgeRunner
                subject={KNOWLEDGE.find(s => s.id === subject)!}
                submitted={submittedSubjects.has(subject)}
                index={qIndex}
                setIndex={setQIndex}
                answers={answers[subject] ?? Array(5).fill(null)}
                marked={marked[subject] ?? new Set()}
                onAnswer={(i, o) => setAnswer(subject, i, o)}
                onClear={(i) => clearAnswer(subject, i)}
                onMark={(i) => toggleMarked(subject, i)}
                onBack={() => { setSubject(null); setQIndex(0); }}
                onSubmit={() => setModal({ kind: "submit-subject", id: subject })}
              />
            ) : (
              <KnowledgeList
                submitted={submittedSubjects}
                onOpen={(id) => { setSubject(id); setQIndex(0); }}
                onFinishSection={() => goSection("coding")}
              />
            )
          )}

          {section === "coding" && (
            <CodingChallenge
              submitted={codingSubmitted}
              language={codingLanguage} setLanguage={setCodingLanguage}
              code={codingCode} setCode={(c) => { setCodingCode(c); touchAutosave(); }}
              results={codingResults} onRun={runCode}
              onSubmit={() => setModal({ kind: "submit-coding" })}
              onSkip={() => goSection("discussion")}
            />
          )}

          {section === "discussion" && (
            <Discussion
              index={discussionIndex}
              responses={discussionResponses}
              draft={discussionDraft}
              setDraft={setDiscussionDraft}
              onSubmit={submitDiscussionAnswer}
              onEnd={() => setModal({ kind: "end-discussion" })}
              done={discussionIndex >= DISCUSSION_QUESTIONS.length}
              onFinish={submitEvaluation}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {modal?.kind === "submit-lab" && (
        <Confirm
          title="Submit this lab?"
          body="Once submitted, you cannot reopen this lab. Your task progress and code will be locked in."
          confirm="Submit lab"
          onConfirm={() => confirmSubmitLab(modal.id)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "submit-subject" && (
        <Confirm
          title={`Submit ${KNOWLEDGE.find(s => s.id === modal.id)!.title} section?`}
          body="You cannot return to these questions once submitted."
          confirm="Submit section"
          onConfirm={() => confirmSubmitSubject(modal.id)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "submit-coding" && (
        <Confirm
          title="Submit your coding challenge?"
          body="Your latest code will be evaluated. You won't be able to edit after this."
          confirm="Submit challenge"
          onConfirm={confirmSubmitCoding}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "end-discussion" && (
        <Confirm
          title="End the engineering discussion?"
          body="This will conclude your evaluation and generate your report."
          confirm="End and submit"
          onConfirm={submitEvaluation}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "exit" && (
        <Confirm
          title="Exit the evaluation?"
          body="Your progress will not be saved and you may lose access to this evaluation. Are you sure?"
          confirm="Exit evaluation"
          destructive
          onConfirm={() => { try { document.exitFullscreen?.(); } catch {}; nav({ to: "/" }); }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "tab-warning" && (
        <Confirm
          title="Please stay on this tab"
          body="Switching tabs or windows during your evaluation is recorded. Repeated tab switches may end your evaluation."
          confirm="I understand"
          onConfirm={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "discussion-starting" && (
        <Confirm
          title="The engineering discussion will now begin"
          body="The remaining 15 minutes are reserved for your discussion. Labs, assessment and the coding challenge are now locked."
          confirm="Begin discussion"
          onConfirm={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Top bar
// ────────────────────────────────────────────────────────────────────────────

function TopBar({ remaining, online, autosave, section, onExit, onJumpToDiscussion }: { remaining: number; online: boolean; autosave: "idle" | "saving" | "saved"; section: SectionId; onExit: () => void; onJumpToDiscussion: () => void }) {
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };
  const critical = remaining <= 15 * 60;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white/80 px-5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-neutral-900 text-[10px] font-mono text-white">Y</div>
        <div className="min-w-0">
          <div className="truncate text-[12px] leading-none text-neutral-500">Yuvro Labs · Backend Engineer Evaluation</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500">
            <span>Section</span>
            <span className="text-neutral-900">{sectionLabel(section)}</span>
          </div>
        </div>
      </div>

      <div className={`font-mono text-[15px] tracking-wide ${critical ? "text-neutral-900" : "text-neutral-700"}`}>
        {fmt(remaining)}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-neutral-500">
        <StatusDot label={online ? "Online" : "Reconnecting"} tone={online ? "ok" : "warn"} />
        <StatusDot label="Camera" tone="ok" />
        <StatusDot label="Fullscreen" tone="ok" />
        <span className="hidden md:inline">
          {autosave === "saving" ? "Saving…" : autosave === "saved" ? "Saved" : ""}
        </span>
        <span className="hidden text-neutral-300 md:inline">·</span>
        <button onClick={onJumpToDiscussion} title="Demo: jump to 15:00 remaining" className="hidden rounded-md border border-dashed border-neutral-300 px-2 py-0.5 text-[10px] text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 md:inline">
          demo · jump to 15:00
        </button>
        <button className="text-neutral-500 hover:text-neutral-900">Help</button>
        <button onClick={onExit} className="text-neutral-500 hover:text-neutral-900">Exit</button>
      </div>
    </header>
  );
}

function StatusDot({ label, tone }: { label: string; tone: "ok" | "warn" }) {
  return (
    <span className="hidden items-center gap-1.5 sm:inline-flex">
      <span className={`h-1.5 w-1.5 rounded-full ${tone === "ok" ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

function sectionLabel(s: SectionId) {
  return s === "labs" ? "Engineering Labs" : s === "knowledge" ? "Knowledge Assessment" : s === "coding" ? "Coding Challenge" : "Engineering Discussion";
}

// ────────────────────────────────────────────────────────────────────────────
// Sidebar
// ────────────────────────────────────────────────────────────────────────────

type Status = "not-started" | "current" | "in-progress" | "complete" | "locked";

function Sidebar({
  section, openLab, subject,
  onSelectSection, onSelectLab, onSelectSubject,
  labsStatus, knowStatus, codingStatus, discussionStatus,
  submittedLabs, submittedSubjects, locked,
}: {
  section: SectionId; openLab: LabId | null; subject: SubjectId | null;
  onSelectSection: (s: SectionId) => void; onSelectLab: (id: LabId) => void; onSelectSubject: (id: SubjectId) => void;
  labsStatus: Status; knowStatus: Status; codingStatus: Status; discussionStatus: Status;
  submittedLabs: Set<LabId>; submittedSubjects: Set<SubjectId>; locked: boolean;
}) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-neutral-200 bg-white/60 md:block">
      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Evaluation</div>
        <div className="mt-1 font-serif text-[16px] tracking-tight text-neutral-900">Four sections</div>
      </div>

      <nav className="flex flex-col gap-1 px-2 py-3 text-[13px]">
        <SectionItem
          n="01" label="Engineering Labs" status={section === "labs" ? "current" : labsStatus}
          onClick={() => onSelectSection("labs")}
          disabled={locked}
        >
          <div className="mt-2 flex flex-col gap-0.5 pl-8">
            {LABS.map(l => (
              <button
                key={l.id}
                disabled={locked && !submittedLabs.has(l.id)}
                onClick={() => onSelectLab(l.id)}
                className={`flex items-center justify-between rounded-md px-2 py-1 text-left transition ${openLab === l.id ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"} disabled:cursor-not-allowed disabled:text-neutral-300`}
              >
                <span className="truncate text-[12px]">{l.title}</span>
                {submittedLabs.has(l.id) && <span className="text-[10px] text-emerald-600">Done</span>}
              </button>
            ))}
          </div>
        </SectionItem>

        <SectionItem
          n="02" label="Knowledge Assessment" status={section === "knowledge" ? "current" : knowStatus}
          onClick={() => onSelectSection("knowledge")}
          disabled={locked}
        >
          <div className="mt-2 flex flex-col gap-0.5 pl-8">
            {KNOWLEDGE.map(s => (
              <button
                key={s.id}
                disabled={locked && !submittedSubjects.has(s.id)}
                onClick={() => onSelectSubject(s.id)}
                className={`flex items-center justify-between rounded-md px-2 py-1 text-left transition ${subject === s.id ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"} disabled:cursor-not-allowed disabled:text-neutral-300`}
              >
                <span className="text-[12px]">{s.title}</span>
                {submittedSubjects.has(s.id) && <span className="text-[10px] text-emerald-600">Done</span>}
              </button>
            ))}
          </div>
        </SectionItem>

        <SectionItem
          n="03" label="Coding Challenge" status={section === "coding" ? "current" : codingStatus}
          hint="Optional"
          onClick={() => onSelectSection("coding")}
          disabled={locked}
        />

        <SectionItem
          n="04" label="Engineering Discussion" status={discussionStatus}
          hint="Last 15 minutes"
          onClick={() => onSelectSection("discussion")}
          disabled={discussionStatus === "locked"}
        />
      </nav>
    </aside>
  );
}

function SectionItem({ n, label, status, hint, onClick, disabled, children }: { n: string; label: string; status: Status; hint?: string; onClick: () => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <div>
      <button
        disabled={disabled}
        onClick={onClick}
        className={`group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition ${status === "current" ? "bg-neutral-100" : "hover:bg-neutral-50"} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="mt-0.5 font-mono text-[10px] tracking-widest text-neutral-400">{n}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`text-[13px] ${status === "current" ? "text-neutral-900" : "text-neutral-700"}`}>{label}</span>
            <StatusChip status={status} />
          </span>
          {hint && <span className="mt-0.5 block text-[11px] text-neutral-400">{hint}</span>}
        </span>
      </button>
      {children}
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    "not-started": { label: "", cls: "" },
    "current": { label: "Current", cls: "text-neutral-900" },
    "in-progress": { label: "In progress", cls: "text-amber-600" },
    "complete": { label: "Done", cls: "text-emerald-600" },
    "locked": { label: "Locked", cls: "text-neutral-400" },
  };
  const { label, cls } = map[status];
  if (!label) return null;
  return <span className={`text-[10px] uppercase tracking-wider ${cls}`}>· {label}</span>;
}

// ────────────────────────────────────────────────────────────────────────────
// Section: Labs
// ────────────────────────────────────────────────────────────────────────────

function LabsList({ submitted, onOpen, onFinishSection }: { submitted: Set<LabId>; onOpen: (id: LabId) => void; onFinishSection: () => void }) {
  const allDone = submitted.size === LABS.length;
  return (
    <div className="mx-auto max-w-4xl px-8 py-12">
      <SectionHeader eyebrow="Section 01" title="Engineering Labs" body="Two labs. Pick one to start. You can submit each independently." />
      <div className="mt-10 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {LABS.map((l, i) => {
          const done = submitted.has(l.id);
          return (
            <div key={l.id} className="flex items-center justify-between gap-6 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] tracking-widest text-neutral-400">L0{i + 1}</span>
                  <div className="text-[15px] text-neutral-900">{l.title}</div>
                  {done && <span className="text-[11px] text-emerald-600">· Submitted</span>}
                </div>
                <div className="mt-1 text-[12px] text-neutral-500">{l.sub} · ~{l.minutes} min</div>
              </div>
              <button
                onClick={() => onOpen(l.id)}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-[13px] text-neutral-800 hover:border-neutral-900 hover:text-neutral-900"
              >
                {done ? "Review" : "Open lab"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <span className="text-[12px] text-neutral-500">{submitted.size} of {LABS.length} submitted</span>
        <button onClick={onFinishSection} disabled={!allDone} className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
          Continue to Knowledge Assessment →
        </button>
      </div>
    </div>
  );
}

function LabDetail({ lab, tasks, submitted, onToggleTask, onBack, onSubmit }: { lab: typeof LABS[number]; tasks: Set<number>; submitted: boolean; onToggleTask: (i: number) => void; onBack: () => void; onSubmit: () => void }) {
  const [tab, setTab] = useState<"code" | "terminal" | "db" | "preview" | "docs">("code");
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white/80 px-6 py-3 text-[12px]">
        <button onClick={onBack} className="text-neutral-500 hover:text-neutral-900">← All labs</button>
        <div className="text-neutral-500">Lab · <span className="text-neutral-900">{lab.title}</span></div>
        <button onClick={onSubmit} disabled={submitted} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
          {submitted ? "Submitted" : "Submit lab"}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_1fr]">
        <div className="min-h-0 overflow-y-auto border-r border-neutral-200 bg-white/60 p-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Problem</div>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-700">{lab.problem}</p>

          <div className="mt-8 text-[11px] uppercase tracking-[0.14em] text-neutral-500">Tasks</div>
          <ol className="mt-3 space-y-2">
            {lab.tasks.map((t, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-neutral-100">
                  <input type="checkbox" checked={tasks.has(i)} onChange={() => onToggleTask(i)} disabled={submitted} className="mt-0.5 h-4 w-4 rounded border-neutral-300" />
                  <span className={`text-[13px] ${tasks.has(i) ? "text-neutral-400 line-through" : "text-neutral-800"}`}>{t}</span>
                </label>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-[11px] text-neutral-500">
            {tasks.size} of {lab.tasks.length} tasks marked complete. This is only your local tracker.
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex items-center gap-1 border-b border-neutral-200 bg-white/80 px-3">
            {(["code", "terminal", "db", "preview", "docs"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`border-b-2 px-3 py-2 text-[12px] transition ${tab === t ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-900"}`}
              >
                {t === "code" ? "VS Code" : t === "terminal" ? "Terminal" : t === "db" ? "Database" : t === "preview" ? "Browser" : "Docs"}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {tab === "code" && (
              <div className="flex h-full flex-col">
                <div className="border-b border-neutral-200 bg-neutral-50/60 px-4 py-1.5 font-mono text-[11px] text-neutral-500">{lab.file}</div>
                <pre className="flex-1 overflow-auto bg-[#0b0b0c] p-5 font-mono text-[12px] leading-relaxed text-[#e4e4e7]">
                  {lab.code.split("\n").map((line, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="w-6 select-none text-right text-[#555]">{i + 1}</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </pre>
              </div>
            )}
            {tab === "terminal" && (
              <pre className="h-full overflow-auto bg-[#0b0b0c] p-5 font-mono text-[12px] leading-relaxed text-[#e4e4e7]">
                {lab.terminal.join("\n")}
              </pre>
            )}
            {tab === "db" && (
              <div className="p-6 text-[13px] text-neutral-600">
                <div className="text-neutral-900">Connected to <span className="font-mono">yuvro_lab_db</span></div>
                <div className="mt-2 text-neutral-500">7 tables · 14,204,881 rows · seeded for this lab.</div>
              </div>
            )}
            {tab === "preview" && (
              <div className="grid h-full place-items-center bg-neutral-50/60 text-[12px] text-neutral-500">Browser preview attached to <span className="mx-1 font-mono text-neutral-900">http://localhost:3000</span></div>
            )}
            {tab === "docs" && (
              <div className="p-6 text-[13px] text-neutral-600">
                <div className="text-neutral-900">Reference</div>
                <ul className="mt-2 list-disc pl-4 text-neutral-500">
                  <li>Internal runbook — retry policies</li>
                  <li>Postgres query planner cheatsheet</li>
                  <li>Swagger / API reference</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Section: Knowledge
// ────────────────────────────────────────────────────────────────────────────

function KnowledgeList({ submitted, onOpen, onFinishSection }: { submitted: Set<SubjectId>; onOpen: (id: SubjectId) => void; onFinishSection: () => void }) {
  const allDone = submitted.size === KNOWLEDGE.length;
  return (
    <div className="mx-auto max-w-4xl px-8 py-12">
      <SectionHeader eyebrow="Section 02" title="Knowledge Assessment" body="Four short subjects. Submit each independently — you'll only see the summary at the end." />
      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {KNOWLEDGE.map(s => {
          const done = submitted.has(s.id);
          return (
            <button key={s.id} onClick={() => onOpen(s.id)} className="group rounded-xl border border-neutral-200 bg-white p-5 text-left transition hover:border-neutral-900">
              <div className="flex items-center justify-between">
                <div className="font-serif text-[20px] tracking-tight text-neutral-900">{s.title}</div>
                {done && <span className="text-[11px] text-emerald-600">Submitted</span>}
              </div>
              <div className="mt-1 text-[12px] text-neutral-500">{s.questions.length} questions</div>
              <div className="mt-6 text-[12px] text-neutral-500 group-hover:text-neutral-900">{done ? "Review submitted" : "Start subject →"}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <span className="text-[12px] text-neutral-500">{submitted.size} of {KNOWLEDGE.length} submitted</span>
        <button onClick={onFinishSection} disabled={!allDone} className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
          Continue to Coding Challenge →
        </button>
      </div>
    </div>
  );
}

function KnowledgeRunner({ subject, submitted, index, setIndex, answers, marked, onAnswer, onClear, onMark, onBack, onSubmit }: {
  subject: typeof KNOWLEDGE[number]; submitted: boolean; index: number; setIndex: (i: number) => void;
  answers: (number | null)[]; marked: Set<number>;
  onAnswer: (i: number, opt: number) => void; onClear: (i: number) => void; onMark: (i: number) => void;
  onBack: () => void; onSubmit: () => void;
}) {
  const q = subject.questions[index];
  const disabled = submitted;
  return (
    <div className="mx-auto max-w-4xl px-8 py-12">
      <div className="flex items-center justify-between text-[12px] text-neutral-500">
        <button onClick={onBack} className="hover:text-neutral-900">← All subjects</button>
        <span>{subject.title} · Question {index + 1} of {subject.questions.length}</span>
      </div>

      <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-8">
        <div className="font-serif text-[22px] leading-snug tracking-tight text-neutral-900">{q.q}</div>
        <div className="mt-6 space-y-2">
          {q.options.map((opt, i) => {
            const active = answers[index] === i;
            return (
              <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-[13px] transition ${active ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
                <input type="radio" disabled={disabled} name={`q-${index}`} checked={active} onChange={() => onAnswer(index, i)} className="mt-0.5 h-4 w-4" />
                <span className="text-neutral-800">{opt}</span>
              </label>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-3 text-neutral-500">
            <button onClick={() => onMark(index)} disabled={disabled} className="rounded-md border border-neutral-200 px-3 py-1.5 hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-50">
              {marked.has(index) ? "Unmark" : "Mark for review"}
            </button>
            <button onClick={() => onClear(index)} disabled={disabled} className="hover:text-neutral-900 disabled:opacity-50">Clear answer</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="rounded-md border border-neutral-200 px-3 py-1.5 hover:border-neutral-900 disabled:opacity-40">Previous</button>
            {index < subject.questions.length - 1 ? (
              <button onClick={() => setIndex(index + 1)} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800">Next</button>
            ) : (
              <button onClick={onSubmit} disabled={submitted} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
                {submitted ? "Submitted" : `Submit ${subject.title}`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">Question navigator</div>
        <div className="flex flex-wrap gap-2">
          {subject.questions.map((_, i) => {
            const answered = answers[i] !== null && answers[i] !== undefined;
            const isCurrent = i === index;
            const isMarked = marked.has(i);
            return (
              <button key={i} onClick={() => setIndex(i)} className={`h-9 w-9 rounded-md border text-[12px] font-mono transition ${isCurrent ? "border-neutral-900 bg-neutral-900 text-white" : answered ? "border-emerald-500/40 bg-emerald-50 text-emerald-700" : isMarked ? "border-amber-400 bg-amber-50 text-amber-700" : "border-neutral-200 text-neutral-500 hover:border-neutral-400"}`}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Section: Coding challenge
// ────────────────────────────────────────────────────────────────────────────

function CodingChallenge({ submitted, language, setLanguage, code, setCode, results, onRun, onSubmit, onSkip }: {
  submitted: boolean; language: string; setLanguage: (v: string) => void; code: string; setCode: (v: string) => void;
  results: null | { name: string; pass: boolean }[]; onRun: () => void; onSubmit: () => void; onSkip: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 bg-white/80 px-8 py-6">
        <div className="mx-auto max-w-6xl">
          <SectionHeader eyebrow="Section 03 · optional" title="Two-sum, adapted" body="Given an array of integers and a target, return the two indices that sum to the target. Assume exactly one solution and no duplicates." />
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_360px]">
        <div className="flex min-h-0 flex-col border-r border-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-white/60 px-4 py-2 text-[12px]">
            <div className="flex items-center gap-3">
              <span className="text-neutral-500">Language</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={submitted} className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[12px]">
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onRun} disabled={submitted} className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 hover:border-neutral-900 disabled:opacity-50">Run</button>
              <button onClick={onSubmit} disabled={submitted} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
                {submitted ? "Submitted" : "Submit code"}
              </button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            disabled={submitted}
            className="flex-1 resize-none bg-[#0b0b0c] p-5 font-mono text-[12.5px] leading-relaxed text-[#e4e4e7] outline-none disabled:opacity-70"
          />
        </div>

        <div className="flex flex-col overflow-y-auto bg-white/60 p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Test cases</div>
          {!results && <div className="mt-3 text-[12px] text-neutral-500">Run your code to see test results.</div>}
          {results && (
            <div className="mt-3 space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-[12px]">
                  <span className="truncate text-neutral-700">{r.name}</span>
                  <span className={r.pass ? "text-emerald-600" : "text-red-600"}>{r.pass ? "pass" : "fail"}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4 text-[12px] text-neutral-600">
            Prefer to skip and go straight to the discussion? You can.
            <button onClick={onSkip} className="mt-3 block text-[12px] text-neutral-900 underline underline-offset-4">Skip and continue →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Section: Engineering Discussion
// ────────────────────────────────────────────────────────────────────────────

function Discussion({ index, responses, draft, setDraft, onSubmit, onEnd, done, onFinish }: {
  index: number; responses: string[]; draft: string; setDraft: (v: string) => void;
  onSubmit: () => void; onEnd: () => void; done: boolean; onFinish: () => void;
}) {
  const question = DISCUSSION_QUESTIONS[Math.min(index, DISCUSSION_QUESTIONS.length - 1)];
  return (
    <div className="mx-auto max-w-5xl px-8 py-12">
      <SectionHeader eyebrow="Section 04" title="Engineering Discussion" body="A short reflection on what you built. Answer in your own words — this is a conversation, not a test." />

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {!done ? (
            <>
              <div className="rounded-2xl border border-neutral-200 bg-white p-8">
                <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Question {index + 1} of {DISCUSSION_QUESTIONS.length}</div>
                <div className="mt-3 font-serif text-[22px] leading-snug tracking-tight text-neutral-900">{question}</div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={5}
                  placeholder="Speak or type your answer…"
                  className="mt-6 w-full resize-none rounded-lg border border-neutral-200 bg-white p-4 text-[14px] leading-relaxed text-neutral-900 outline-none focus:border-neutral-900"
                />
                <div className="mt-4 flex items-center justify-between">
                  <button onClick={onEnd} className="text-[12px] text-neutral-500 hover:text-neutral-900">End discussion early</button>
                  <button onClick={onSubmit} disabled={!draft.trim()} className="rounded-md bg-neutral-900 px-4 py-2 text-[13px] text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300">
                    {index === DISCUSSION_QUESTIONS.length - 1 ? "Submit final answer" : "Next question"}
                  </button>
                </div>
              </div>

              {responses.length > 0 && (
                <div className="mt-8">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Transcript</div>
                  <div className="mt-3 space-y-4">
                    {responses.map((r, i) => (
                      <div key={i} className="rounded-lg border border-neutral-200 bg-white/60 p-4">
                        <div className="text-[11px] text-neutral-500">Q{i + 1} · {DISCUSSION_QUESTIONS[i]}</div>
                        <div className="mt-2 text-[13px] leading-relaxed text-neutral-800">{r}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M4 10.5l3.5 3.5L16 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div className="mt-4 font-serif text-[24px] tracking-tight text-neutral-900">Discussion complete</div>
              <div className="mt-2 text-[13px] text-neutral-500">Nice work. Submit to generate your report.</div>
              <button onClick={onFinish} className="mt-6 rounded-lg bg-neutral-900 px-5 py-2.5 text-[13px] text-white hover:bg-neutral-800">Submit evaluation</button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950 aspect-video grid place-items-center text-[11px] text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Camera active
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 text-[12px] text-neutral-600">
            <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">How this works</div>
            <p className="mt-2 leading-relaxed">Questions are generated from the work you did in Sections 1–3. Speak the way you'd speak to a colleague — clarity beats jargon.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared
// ────────────────────────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">{eyebrow}</div>
      <h2 className="mt-2 font-serif text-[34px] leading-tight tracking-tight text-neutral-900">{title}</h2>
      {body && <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-neutral-600">{body}</p>}
    </div>
  );
}

function Confirm({ title, body, confirm, onConfirm, onCancel, destructive }: { title: string; body: string; confirm: string; onConfirm: () => void; onCancel?: () => void; destructive?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <div className="font-serif text-[22px] leading-tight tracking-tight text-neutral-900">{title}</div>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-600">{body}</p>
        <div className="mt-6 flex items-center justify-end gap-2">
          {onCancel && <button onClick={onCancel} className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-[13px] text-neutral-700 hover:border-neutral-900 hover:text-neutral-900">Cancel</button>}
          <button onClick={onConfirm} className={`rounded-lg px-4 py-2 text-[13px] text-white ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-neutral-900 hover:bg-neutral-800"}`}>{confirm}</button>
        </div>
      </div>
    </div>
  );
}

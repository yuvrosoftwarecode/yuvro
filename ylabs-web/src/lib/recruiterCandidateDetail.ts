// Deterministic detail generator per candidate (labs, assessment, vitarka, timeline, resume, AI).
import type { Candidate } from "./recruiterCandidates";

function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pick = <T>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];

export interface LabAttempt {
  id: string;
  title: string;
  domain: string;
  score: number;
  timeTaken: number; // minutes
  timeLimit: number;
  tasksCompleted: number;
  tasksTotal: number;
  files: { path: string; changes: number; kind: "modified" | "created" | "deleted" }[];
  gitCommits: { sha: string; message: string; time: string }[];
  consoleLogs: string[];
  execOutput: string[];
  problemStatement: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  aiVerdict: "Excellent" | "Strong" | "Good" | "Needs Work" | "Not Attempted";
  timeline: { t: number; label: string }[];
}

export interface AssessmentQ {
  q: string;
  candidateAnswer: string;
  correctAnswer: string;
  explanation: string;
  correct: boolean;
  seconds: number;
  difficulty: "Easy" | "Medium" | "Hard";
}
export interface AssessmentSubsection {
  name: string;
  score: number;
  total: number;
  questions: AssessmentQ[];
}

export interface VitarkaSignal {
  label: string;
  score: number;
}
export interface VitarkaTranscriptLine {
  speaker: "AI" | "Candidate";
  text: string;
  time: string;
}

export interface CandidateDetail {
  strengths: string[];
  weaknesses: string[];
  aiSummary: string;
  nextStep: string;
  confidence: number;
  location: string;
  ecIBreakdown: { label: string; contribution: string; kind: "pos" | "neg" | "neu" }[];
  labs: LabAttempt[];
  assessment: AssessmentSubsection[];
  vitarka: {
    signals: VitarkaSignal[];
    overall: number;
    summary: string[];
    transcript: VitarkaTranscriptLine[];
  };
  resume: {
    summary: string;
    experience: { company: string; role: string; period: string; bullets: string[] }[];
    education: { school: string; degree: string; period: string }[];
  };
  timeline: {
    icon: string;
    label: string;
    time: string;
    done: boolean;
    tone: "neutral" | "good" | "warn";
  }[];
}

const LAB_TITLES = [
  [
    "Payment API Broken",
    "Finance",
    "Restore the /charge endpoint that started returning 500s after the last deploy. Diagnose the root cause, add a regression test, and document the fix.",
  ],
  [
    "Inventory SQL Optimization",
    "Supply Chain",
    "The warehouse dashboard query takes 12s. Bring it under 1s without changing the API contract. Explain your index choices.",
  ],
  [
    "Authentication Bug",
    "Security",
    "Users report intermittent 401s after refresh. Trace token handling across services and produce a reproducible fix.",
  ],
  [
    "React Checkout Regression",
    "Retail",
    "Cart totals show NaN on locale switch. Fix the calculation, add unit tests, keep bundle size the same.",
  ],
  [
    "Deploy Pipeline Broken",
    "EdTech",
    "The staging pipeline fails on the migration step. Repair it, gate future migrations behind a review job.",
  ],
];
const FILE_POOL = [
  "src/routes/api/charge.ts",
  "src/lib/payments.ts",
  "src/db/schema.sql",
  "migrations/2026_07_charge.sql",
  "src/lib/logger.ts",
  "tests/charge.spec.ts",
  "src/hooks/useCart.ts",
  "src/components/CartTotal.tsx",
  "src/lib/auth.ts",
  "docker-compose.yml",
  ".github/workflows/deploy.yml",
];
const COMMIT_MSGS = [
  "fix: guard nullable amount before rounding",
  "test: add regression for zero-amount charges",
  "chore: log correlation id on failure path",
  "refactor: extract retry policy",
  "docs: annotate migration ordering",
  "perf: add composite index (warehouse_id, sku)",
];
const CONSOLE_LOGS = [
  "› npm test",
  "PASS tests/charge.spec.ts (4.1s)",
  "[warn] deprecated: use `decimal.js`",
  "EXPLAIN ANALYZE: seq scan on inventory (cost=0.00..48291.10)",
  "after fix: index scan (cost=0.42..12.03) ✓",
  "auth: refresh token TTL 900s",
  "cart_total: recalculated (locale=fr-FR) → 148.20",
];

const ASSESS_BANK: Record<
  string,
  { q: string; opts: string[]; correct: number; explain: string }[]
> = {
  Java: [
    {
      q: "Which Collection guarantees insertion order and O(1) get?",
      opts: ["HashMap", "LinkedHashMap", "TreeMap", "ConcurrentHashMap"],
      correct: 1,
      explain:
        "LinkedHashMap preserves insertion order and offers amortized O(1) get via its underlying hash table.",
    },
    {
      q: "`volatile` guarantees…",
      opts: ["Atomicity", "Visibility", "Mutual exclusion", "Reentrancy"],
      correct: 1,
      explain:
        "volatile ensures visibility of writes across threads but does not make compound operations atomic.",
    },
    {
      q: "The default GC in JDK 17 is:",
      opts: ["Parallel", "CMS", "G1", "ZGC"],
      correct: 2,
      explain: "G1 has been the default since JDK 9.",
    },
    {
      q: "Which Stream op is terminal?",
      opts: ["map", "filter", "collect", "peek"],
      correct: 2,
      explain: "collect triggers pipeline execution.",
    },
    {
      q: "@Transactional propagation REQUIRES_NEW does what?",
      opts: [
        "Joins existing",
        "Suspends and starts new",
        "Runs without transaction",
        "Nested savepoint",
      ],
      correct: 1,
      explain: "It suspends the caller's transaction and starts a fresh one.",
    },
  ],
  SQL: [
    {
      q: "Which JOIN returns all left rows even without a match?",
      opts: ["INNER", "LEFT", "RIGHT", "CROSS"],
      correct: 1,
      explain: "LEFT JOIN preserves left-side rows with NULLs on the right.",
    },
    {
      q: "A covering index means…",
      opts: [
        "Index on primary key",
        "Includes all queried columns",
        "Unique index",
        "Partial index",
      ],
      correct: 1,
      explain:
        "A covering index contains every column the query needs so the row itself isn't fetched.",
    },
    {
      q: "ROW_NUMBER() vs RANK() — the difference is:",
      opts: [
        "No difference",
        "RANK skips on ties",
        "ROW_NUMBER can repeat",
        "Both partition differently",
      ],
      correct: 1,
      explain: "RANK leaves gaps on ties; ROW_NUMBER never repeats.",
    },
    {
      q: "Which isolation level prevents phantom reads?",
      opts: ["Read committed", "Repeatable read", "Serializable", "Read uncommitted"],
      correct: 2,
      explain: "Only SERIALIZABLE prevents phantom reads in the SQL standard.",
    },
  ],
  JavaScript: [
    {
      q: "`Promise.all` rejects when…",
      opts: ["All reject", "Any rejects", "First resolves", "Never"],
      correct: 1,
      explain: "It short-circuits on the first rejection.",
    },
    {
      q: "`typeof null` returns:",
      opts: ["null", "undefined", "object", "number"],
      correct: 2,
      explain: "Legacy quirk from the original tagged-union implementation.",
    },
    {
      q: "Microtasks run…",
      opts: ["Before rendering", "After timers", "In parallel", "Once per frame"],
      correct: 0,
      explain: "The microtask queue drains before the browser paints.",
    },
    {
      q: "Which creates a truly private field?",
      opts: ["_prefix", "Symbol key", "#name", "closure only"],
      correct: 2,
      explain: "The # syntax defines a private class field enforced by the runtime.",
    },
  ],
  React: [
    {
      q: "useMemo is appropriate when:",
      opts: [
        "Every render",
        "Expensive derivation with stable deps",
        "Side effects",
        "Component mounts",
      ],
      correct: 1,
      explain:
        "Memoize only when the computation is expensive relative to reference equality checks.",
    },
    {
      q: "Keys on lists should be:",
      opts: ["Array index", "Stable and unique", "Random", "Component name"],
      correct: 1,
      explain: "Stable keys let React reconcile efficiently across renders.",
    },
    {
      q: "Server Components can:",
      opts: ["Use useState", "Read from DB directly", "Attach onClick", "Use useEffect"],
      correct: 1,
      explain: "They run on the server and can access data sources directly.",
    },
  ],
  "System Design": [
    {
      q: "Which pattern isolates failures across downstream services?",
      opts: ["Retry with jitter", "Circuit breaker", "Bulkhead", "Saga"],
      correct: 2,
      explain: "Bulkheads partition resources so one saturated tenant does not exhaust the pool.",
    },
    {
      q: "Eventually consistent reads are acceptable when:",
      opts: ["Bank ledger", "Session cache", "Feed timeline", "2FA state"],
      correct: 2,
      explain: "Feed staleness of a few seconds is typically fine.",
    },
  ],
};

const VITARKA_QUESTIONS = [
  "Walk me through how you triaged the payment API failure.",
  "How would you design idempotency for the /charge endpoint?",
  "Why did you choose a composite index over a covering index for the inventory query?",
  "How do you keep the pipeline safe when running migrations concurrently?",
  "What would you monitor in production for this fix?",
];
const VITARKA_ANSWERS = [
  "I started with the deploy diff, then checked the correlation id in the failing traces. The regression was a nullable amount field after we removed a default. I added a guard and a regression test.",
  "I'd hash the client-supplied idempotency key with the request body signature, store it in Redis for 24h with the response, and short-circuit duplicates.",
  "The dashboard filters by warehouse_id then sorts by sku, so a composite (warehouse_id, sku) index avoids the sort and lets me include the aggregate columns.",
  "Migrations run in a single-writer job gated by an advisory lock; the pipeline holds the lock, runs, releases. Rollbacks require a code path, never a manual DROP.",
  "P99 latency of /charge, 5xx rate, retry count histogram, plus a synthetic transaction from three regions every minute.",
];

const NEXT_STEPS = [
  "Move to L2 interview with the platform team.",
  "Schedule a system design round focused on payments.",
  "Send take-home extension and review with the hiring manager.",
  "Hold for the next hiring window; keep in the talent pool.",
  "Reject — communication is strong but engineering depth is below the bar.",
];

const CITIES = [
  "Bengaluru, IN",
  "Hyderabad, IN",
  "Pune, IN",
  "Chennai, IN",
  "Gurugram, IN",
  "Mumbai, IN",
  "Noida, IN",
  "Remote, IN",
];

const cache = new Map<string, CandidateDetail>();

export function getCandidateDetail(
  c: Candidate,
  sectionMaxScores?: {
    labsMaxScore?: number;
    assessmentMaxScore?: number;
    discussionMaxScore?: number;
  }
): CandidateDetail {
  const cacheKey = `${c.id}:${c.labsScore}:${c.assessmentScore}:${c.vitarkaScore}:${c.eci}:${sectionMaxScores?.labsMaxScore}:${sectionMaxScores?.assessmentMaxScore}:${sectionMaxScores?.discussionMaxScore}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const r = rng(hash(c.id + ":detail"));

  const labCount = 3 + Math.floor(r() * 2);
  const labs: LabAttempt[] = Array.from({ length: labCount }, (_, i) => {
    const [title, domain, statement] = LAB_TITLES[i % LAB_TITLES.length];
    const drift = Math.floor((r() - 0.5) * 20);
    const score = Math.max(30, Math.min(100, c.labsScore + drift));
    const tasksTotal = 3 + Math.floor(r() * 3);
    const tasksCompleted = c.labsScore === 0 ? 0 : Math.max(
      0,
      Math.min(tasksTotal, Math.round((score / 100) * tasksTotal + (r() - 0.5))),
    );
    const timeLimit = 20 + Math.floor(r() * 20);
    const timeTaken = c.labsScore === 0 ? 0 : Math.max(
      6,
      Math.min(timeLimit + 8, Math.round(timeLimit * (0.6 + r() * 0.6))),
    );
    const files = c.labsScore === 0 ? [] : Array.from({ length: 3 + Math.floor(r() * 3) }, () => ({
      path: pick(r, FILE_POOL),
      changes: 1 + Math.floor(r() * 40),
      kind: (r() < 0.7 ? "modified" : r() < 0.9 ? "created" : "deleted") as
        "modified" | "created" | "deleted",
    }));
    const gitCommits = c.labsScore === 0 ? [] : Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({
      sha: Math.random().toString(16).slice(2, 9),
      message: pick(r, COMMIT_MSGS),
      time: `${Math.floor(r() * timeTaken)}m in`,
    }));
    const consoleLogs = c.labsScore === 0 ? [] : Array.from({ length: 4 + Math.floor(r() * 4) }, () =>
      pick(r, CONSOLE_LOGS),
    );
    return {
      id: `${c.id}-lab-${i}`,
      title,
      domain,
      score,
      timeTaken,
      timeLimit,
      tasksCompleted,
      tasksTotal,
      files,
      gitCommits,
      consoleLogs,
      execOutput: c.labsScore === 0
        ? [
            "› build … not started",
            "› tests … 0/0 passed",
          ]
        : [
            "› build … ok",
            `› tests … ${tasksCompleted}/${tasksTotal} passed`,
            score >= 80 ? "› lint … 0 issues" : "› lint … 3 warnings",
          ],
      problemStatement: statement,
      strengths:
        score === 0
          ? []
          : score >= 80
            ? [
                "Diagnosed root cause quickly",
                "Wrote a regression test before shipping",
                "Clear commit hygiene",
              ]
            : ["Reached a partial fix", "Kept commits scoped"],
      weaknesses:
        score === 0
          ? ["No code modifications or test submissions detected."]
          : score >= 80
            ? ["Missed an edge case around currency rounding"]
            : ["Skipped test coverage", "Did not document assumptions"],
      suggestions:
        score === 0
          ? ["Attempt lab requirements and run automated tests."]
          : [
              "Add contract tests at the API boundary",
              "Instrument correlation ids across services",
            ],
      aiVerdict:
        score === 0 ? "Not Attempted" : score >= 90 ? "Excellent" : score >= 78 ? "Strong" : score >= 65 ? "Good" : "Needs Work",
      timeline:
        score === 0
          ? [{ t: 0, label: "Lab not attempted" }]
          : [
              { t: 0, label: "Opened lab" },
              { t: Math.floor(timeTaken * 0.15), label: "Read problem statement" },
              { t: Math.floor(timeTaken * 0.35), label: "Reproduced issue locally" },
              { t: Math.floor(timeTaken * 0.65), label: "First passing test" },
              { t: Math.floor(timeTaken * 0.9), label: "Refactor + docs" },
              { t: timeTaken, label: "Submitted" },
            ],
    };
  });

  const assessNames = ["Java", "SQL", "JavaScript", "React", "System Design"];
  const nSubs = 3 + Math.floor(r() * 2);
  const assessment: AssessmentSubsection[] = assessNames.slice(0, nSubs).map((name) => {
    const bank = ASSESS_BANK[name] ?? ASSESS_BANK.Java;
    const drift = (r() - 0.5) * 20;
    const targetPct = c.assessmentScore === 0 ? 0 : Math.max(0.4, Math.min(1, (c.assessmentScore + drift) / 100));
    const questions: AssessmentQ[] = bank.map((b, i) => {
      const correct = c.assessmentScore === 0 ? false : r() < targetPct;
      const chosen = correct
        ? b.correct
        : (b.correct + 1 + Math.floor(r() * (b.opts.length - 1))) % b.opts.length;
      return {
        q: b.q,
        candidateAnswer: b.opts[chosen],
        correctAnswer: b.opts[b.correct],
        explanation: b.explain,
        correct,
        seconds: c.assessmentScore === 0 ? 0 : 20 + Math.floor(r() * 90),
        difficulty: (["Easy", "Medium", "Hard"] as const)[i % 3],
      };
    });
    const score = questions.filter((q) => q.correct).length;
    return { name, score, total: questions.length, questions };
  });

  const vitarkaSignals: VitarkaSignal[] = [
    { label: "Communication", score: c.vitarkaScore === 0 ? 0 : clamp(c.vitarkaScore + roll(r, 8)) },
    { label: "Problem Solving", score: c.vitarkaScore === 0 ? 0 : clamp(c.vitarkaScore + roll(r, 8)) },
    { label: "Technical Depth", score: c.vitarkaScore === 0 ? 0 : clamp((c.vitarkaScore + c.labsScore) / 2 + roll(r, 6)) },
    { label: "Architecture", score: c.vitarkaScore === 0 ? 0 : clamp(c.vitarkaScore + roll(r, 12) - 4) },
    { label: "Confidence", score: c.vitarkaScore === 0 ? 0 : clamp(c.vitarkaScore + roll(r, 8)) },
    { label: "Leadership", score: c.vitarkaScore === 0 ? 0 : clamp(c.vitarkaScore + roll(r, 10) - 6) },
    { label: "Business Understanding", score: c.vitarkaScore === 0 ? 0 : clamp(c.vitarkaScore + roll(r, 10)) },
  ];
  const vitarkaOverall = c.vitarkaScore === 0 ? 0 : Math.round(
    vitarkaSignals.reduce((a, s) => a + s.score, 0) / vitarkaSignals.length,
  );
  const transcript: VitarkaTranscriptLine[] = [];
  if (c.vitarkaScore > 0) {
    let clock = 0;
    for (let i = 0; i < 5; i++) {
      transcript.push({ speaker: "AI", text: VITARKA_QUESTIONS[i], time: fmtClock(clock) });
      clock += 30 + Math.floor(r() * 40);
      transcript.push({ speaker: "Candidate", text: VITARKA_ANSWERS[i], time: fmtClock(clock) });
      clock += 90 + Math.floor(r() * 120);
    }
  }

  const rec = c.recommendation;
  const strengths = c.eci === 0 ? [] : pickN(
    r,
    [
      "Excellent debugging methodology under pressure",
      "Writes tests before shipping — clear regression discipline",
      "Explains architectural trade-offs with concrete examples",
      "Strong SQL query optimisation with correct index intuition",
      "Clean commit hygiene and small, reviewable PRs",
      "Balances short-term fixes with long-term platform health",
    ],
    3,
  );
  const weaknesses = c.eci === 0 ? ["No passing submissions or interview activity recorded across sections."] : pickN(
    r,
    [
      "Occasionally over-indexes on the first hypothesis",
      "Distributed systems reasoning is shallow",
      "Documentation lags behind implementation",
      "Comfort with observability tooling is limited",
      "Could be more explicit about assumptions early in the discussion",
    ],
    2,
  );
  const labsMax = sectionMaxScores?.labsMaxScore ?? 80;
  const assessMax = sectionMaxScores?.assessmentMaxScore ?? (sectionMaxScores ? 0 : 30);
  const vitarkaMax = sectionMaxScores?.discussionMaxScore ?? (sectionMaxScores ? 0 : 25);

  const summaryParts: string[] = [];
  if (labsMax > 0) {
    summaryParts.push(`Labs performance was ${c.labsScore >= (labsMax * 0.8) ? "consistently high" : c.labsScore >= (labsMax * 0.65) ? "reliable" : "inconsistent"}`);
  }
  if (assessMax > 0) {
    summaryParts.push(`assessment coverage was ${c.assessmentScore >= (assessMax * 0.8) ? "wide and accurate" : "focused on core topics"}`);
  }
  if (vitarkaMax > 0) {
    summaryParts.push(`the Vitarka discussion showed ${vitarkaOverall >= 80 ? "clear articulation and depth" : "room for sharper reasoning"}`);
  }
  const summaryDetails = summaryParts.length > 0 ? `. ${summaryParts.join(", and ")}.` : ".";
  const summary = c.eci === 0
    ? "Candidate did not record passing scores, submissions, or interview responses across the evaluation."
    : `Candidate demonstrated ${rec === "Strong Hire" ? "exceptional" : rec === "Hire" ? "strong" : rec === "Maybe" ? "solid but uneven" : "below-bar"} engineering behaviour across the evaluation${summaryDetails}`;
  const nextStep = c.eci === 0
    ? "Do not proceed — Candidate did not complete or pass evaluation requirements."
    : (rec === "Strong Hire"
      ? NEXT_STEPS[0]
      : rec === "Hire"
        ? NEXT_STEPS[1]
        : rec === "Maybe"
          ? NEXT_STEPS[2]
          : NEXT_STEPS[4]);

  const ecIBreakdown: { label: string; contribution: string; kind: "pos" | "neg" | "neu" }[] = [];

  const roundContribution = (val: number) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return val;
    return Math.abs(Math.round(num) - num) < 0.15 ? Math.round(num) : Number(num.toFixed(1));
  };

  if (labsMax > 0) {
    ecIBreakdown.push({
      label: "Engineering Labs",
      contribution: `+${roundContribution(c.labsScore)} of a possible ${labsMax}`,
      kind: (labsMax > 0 && c.labsScore / labsMax >= 0.7 ? "pos" : "neg") as "pos" | "neg",
    });
  }

  if (assessMax > 0) {
    ecIBreakdown.push({
      label: "Knowledge Assessment",
      contribution: `+${roundContribution(c.assessmentScore)} of a possible ${assessMax}`,
      kind: (assessMax > 0 && c.assessmentScore / assessMax >= 0.7 ? "pos" : "neg") as "pos" | "neg",
    });
  }

  if (vitarkaMax > 0) {
    ecIBreakdown.push({
      label: "Vitarka Discussion",
      contribution: `+${roundContribution(c.vitarkaScore)} of a possible ${vitarkaMax}`,
      kind: (vitarkaMax > 0 && c.vitarkaScore / vitarkaMax >= 0.7 ? "pos" : "neg") as "pos" | "neg",
    });
  }

  if (labsMax > 0) {
    ecIBreakdown.push({
      label: "Debugging signal",
      contribution: c.labsScore === 0 ? "No lab activity" : c.labsScore >= (labsMax * 0.85) ? "Excellent" : c.labsScore >= (labsMax * 0.7) ? "Strong" : "Average",
      kind: (c.labsScore === 0 ? "neg" : "neu") as "pos" | "neg" | "neu",
    });
  }

  if (vitarkaMax > 0) {
    ecIBreakdown.push({
      label: "Architecture signal",
      contribution:
        c.vitarkaScore === 0
          ? "No interview responses"
          : vitarkaSignals[3].score >= 80
            ? "Strong"
            : vitarkaSignals[3].score >= 65
              ? "Reasonable"
              : "Minor gaps",
      kind: (c.vitarkaScore === 0 ? "neg" : "neu") as "pos" | "neg" | "neu",
    });
  }

  const resume = {
    summary: `${c.experience === 0 ? "Recent graduate" : `${c.experience}+ year engineer`} focused on ${c.domain.toLowerCase()} systems. Currently at ${c.company}, with a track record of shipping production services and mentoring peers.`,
    experience: [
      c.experience > 0
        ? {
            company: c.company,
            role: c.experience >= 5 ? "Senior Software Engineer" : "Software Engineer",
            period: `${2026 - c.experience}—Present`,
            bullets: [
              "Owned the payments reconciliation service (99.98% availability)",
              "Reduced P95 checkout latency by 42% via query and cache work",
              "Mentored two junior engineers through the ramp-up program",
            ],
          }
        : {
            company: "Campus Projects",
            role: "Student Engineer",
            period: "2024—2026",
            bullets: [
              "Built a full-stack notes app used by 300+ students",
              "Won runner-up at the university hackathon",
              "Interned with a local fintech for a summer",
            ],
          },
      {
        company: "Prior Internship",
        role: "Software Engineering Intern",
        period: "Summer 2024",
        bullets: [
          "Shipped a small internal tool end-to-end",
          "Wrote the first unit tests for a legacy module",
        ],
      },
    ],
    education: [
      {
        school: c.college,
        degree: "B.Tech, Computer Science",
        period: `${2026 - c.experience - 4}—${2026 - c.experience}`,
      },
    ],
  };

  const timeline = buildTimeline(c);

  const detail: CandidateDetail = {
    strengths,
    weaknesses,
    aiSummary: summary,
    nextStep,
    confidence: Math.min(99, 62 + Math.round(vitarkaOverall * 0.3)),
    location: pick(r, CITIES),
    ecIBreakdown,
    labs,
    assessment,
    vitarka: {
      signals: vitarkaSignals,
      overall: vitarkaOverall,
      summary: [
        "Explained the API lifecycle clearly and with concrete examples.",
        "Suggested scalable database design with practical trade-offs.",
        vitarkaSignals[3].score >= 75
          ? "Comfortable with service boundaries and failure modes."
          : "Distributed systems reasoning could be sharper.",
      ],
      transcript,
    },
    resume,
    timeline,
  };
  cache.set(cacheKey, detail);
  return detail;
}

function roll(r: () => number, span: number) {
  return Math.round((r() - 0.5) * span * 2);
}
function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
function pickN<T>(r: () => number, arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++)
    out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
  return out;
}
function fmtClock(s: number) {
  const m = Math.floor(s / 60),
    r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
function buildTimeline(c: Candidate): CandidateDetail["timeline"] {
  const submitted = c.status === "Submitted" || c.status === "Completed" || !!c.hasVitarkaSubmission;
  const shortlisted =
    c.hiringStatus === "Shortlisted" ||
    c.hiringStatus === "Interview Scheduled" ||
    c.hiringStatus === "Selected";
  const interview = c.hiringStatus === "Interview Scheduled" || c.hiringStatus === "Selected";
  const rejected = c.hiringStatus === "Rejected";
  
  const anchor = c.submittedAt;
  // If it's very recent (e.g., within the last 24h), don't subtract 12 hours!
  // Instead, space them by small increments (e.g., 5 mins) or just use the anchor.
  const isRecent = Date.now() - anchor < 24 * 60 * 60 * 1000;
  const d = isRecent ? 5 * 60 * 1000 : 2 * 60 * 60 * 1000;
  
  const safeTime = (t: number) => Math.min(t, Date.now() - 60000); 

  return [
    {
      icon: "mail",
      label: "Evaluation invitation sent",
      time: rel(safeTime(anchor - 6 * d)),
      done: true,
      tone: "neutral" as const,
    },
    {
      icon: "play",
      label: "Candidate started evaluation",
      time: rel(safeTime(anchor - 5 * d)),
      done: c.status !== "Not Started",
      tone: "good" as const,
    },
    {
      icon: "labs",
      label: "Engineering Labs submitted",
      time: rel(safeTime(anchor - 4 * d)),
      done: submitted || (c.rawSubmission?.lab_submissions?.length > 0),
      tone: (submitted || (c.rawSubmission?.lab_submissions?.length > 0) ? "good" : "neutral") as "good" | "neutral",
    },
    {
      icon: "assess",
      label: "Knowledge Assessment submitted",
      time: rel(safeTime(anchor - 3 * d)),
      done: submitted || (c.rawSubmission?.knowledge_submissions?.length > 0),
      tone: (submitted || (c.rawSubmission?.knowledge_submissions?.length > 0) ? "good" : "neutral") as "good" | "neutral",
    },
    {
      icon: "chat",
      label: "Vitarka discussion completed",
      time: rel(safeTime(anchor - 2 * d)),
      done: c.vitarkaScore > 0 || !!c.hasVitarkaSubmission,
      tone: (c.vitarkaScore > 0 || !!c.hasVitarkaSubmission ? "good" : "neutral") as "good" | "neutral",
    },
    {
      icon: "check",
      label: "Evaluation finished",
      time: rel(safeTime(anchor - d)),
      done: submitted,
      tone: (submitted ? "good" : "neutral") as "good" | "neutral",
    },
    {
      icon: "eye",
      label: "Recruiter viewed profile",
      time: rel(safeTime(anchor + d)),
      done: submitted, // Assume viewed if submitted in this mock
      tone: (submitted ? "good" : "neutral") as "good" | "neutral",
    },
    {
      icon: "star",
      label: "Shortlisted",
      time: rel(safeTime(anchor + 2 * d)),
      done: shortlisted,
      tone: (shortlisted ? "good" : "neutral") as "good" | "neutral",
    },
    {
      icon: "cal",
      label: "Interview scheduled",
      time: rel(safeTime(anchor + 3 * d)),
      done: interview,
      tone: (interview ? "good" : "neutral") as "good" | "neutral",
    },
    {
      icon: "offer",
      label: "Offer sent",
      time: rel(safeTime(anchor + 4 * d)),
      done: c.hiringStatus === "Selected",
      tone: (c.hiringStatus === "Selected" ? "good" : "neutral") as "good" | "neutral",
    },
    { icon: "x", label: "Rejected", time: rel(safeTime(anchor + 2 * d)), done: rejected, tone: "warn" as const },
  ].filter((item) => !(item.icon === "x" && !rejected));
}
function rel(t: number) {
  const diff = t - Date.now();
  if (Math.abs(diff) < 60000) return "just now";
  const abs = Math.abs(diff);
  const h = Math.floor(abs / (60 * 60 * 1000));
  const days = Math.floor(h / 24);
  const label = days > 0 ? `${days}d` : `${h}h`;
  return diff < 0 ? `${label} ago` : `in ${label}`;
}

// ---- Attention groups (used by candidate list) ----
export interface AttentionGroup {
  id: string;
  emoji: string;
  tone: "red" | "green" | "amber";
  title: string;
  count: number;
  description: string;
  cta: string;
  match: (c: Candidate) => boolean;
}

export function computeAttentionGroups(
  candidates: Candidate[],
  viewed: Set<string>,
  noted: Set<string>,
): AttentionGroup[] {
  const groups: Omit<AttentionGroup, "count">[] = [
    {
      id: "awaiting",
      emoji: "🔴",
      tone: "red",
      title: "Candidates Awaiting Review",
      description: "Completed the evaluation but not yet reviewed by anyone on your team.",
      cta: "Review Now",
      match: (c) =>
        (c.status === "Submitted" || c.status === "Completed") &&
        c.hiringStatus === "Pending Review" &&
        !viewed.has(c.id),
    },
    {
      id: "strong",
      emoji: "🟢",
      tone: "green",
      title: "Strong Hire Candidates",
      description:
        "Engineering Capability Index above 90 with excellent labs — ready for interview.",
      cta: "View Candidates",
      match: (c) => c.eci >= 90 && c.labsScore >= 85 && c.hiringStatus !== "Rejected",
    },
    {
      id: "gems",
      emoji: "🟡",
      tone: "amber",
      title: "Hidden Gems",
      description:
        "Overall score around 72 but exceptional labs and debugging — recommended for manual review.",
      cta: "Review",
      match: (c) => c.eci >= 66 && c.eci <= 78 && c.labsScore >= 82,
    },
    {
      id: "expiring",
      emoji: "⚠️",
      tone: "amber",
      title: "Invitations Expire Today",
      description: "Send a reminder or extend the invitation window.",
      cta: "Send Reminders",
      match: (c) => c.status === "Not Started" && Date.now() - c.submittedAt < 24 * 60 * 60 * 1000,
    },
    {
      id: "comm-code",
      emoji: "🎤",
      tone: "amber",
      title: "Great Communicators, Weaker Coders",
      description:
        "Vitarka discussion is excellent but labs performance lags — good for client-facing roles.",
      cta: "Compare",
      match: (c) => c.vitarkaScore >= 82 && c.labsScore < 65,
    },
    {
      id: "debug",
      emoji: "🐞",
      tone: "green",
      title: "Outstanding Debuggers",
      description: "Solved every debugging lab quickly with clean commits.",
      cta: "View",
      match: (c) => c.labsScore >= 92 && c.completionMinutes < 90,
    },
    {
      id: "labs-perfect",
      emoji: "🧪",
      tone: "green",
      title: "Solved Every Engineering Lab",
      description: "Cleared the labs section without skipping any task.",
      cta: "View",
      match: (c) => c.labsScore >= 88 && (c.status === "Submitted" || c.status === "Completed"),
    },
    {
      id: "fastest",
      emoji: "⚡",
      tone: "green",
      title: "Fastest Completions",
      description: "Finished the full evaluation in under 45 minutes — high-throughput engineers.",
      cta: "View",
      match: (c) =>
        c.completionMinutes < 45 && (c.status === "Submitted" || c.status === "Completed"),
    },
    {
      id: "abandoned",
      emoji: "⏸️",
      tone: "amber",
      title: "Abandoned Midway",
      description: "Started the evaluation but never submitted — worth a nudge.",
      cta: "Follow Up",
      match: (c) => c.status === "In Progress",
    },
    {
      id: "viewed",
      emoji: "👁️",
      tone: "amber",
      title: "Already Reviewed by You",
      description: "Candidates you have opened at least once — pick up where you left off.",
      cta: "Resume",
      match: (c) => viewed.has(c.id),
    },
    {
      id: "notes",
      emoji: "📝",
      tone: "green",
      title: "With Recruiter Notes",
      description: "Candidates already have written notes from your team.",
      cta: "Open",
      match: (c) => noted.has(c.id),
    },
  ];
  return groups
    .map((g) => ({ ...g, count: candidates.filter(g.match).length }))
    .filter((g) => g.count > 0);
}

// ---- Viewed / notes persistence ----
export function loadViewed(evId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(`yuvro-viewed-${evId}`) || "[]"));
  } catch {
    return new Set();
  }
}
export function markViewed(evId: string, candidateId: string) {
  const s = loadViewed(evId);
  s.add(candidateId);
  try {
    localStorage.setItem(`yuvro-viewed-${evId}`, JSON.stringify([...s]));
  } catch {}
}
export interface Note {
  id: string | number;
  text: string;
  author: string;
  time: number;
  priority: "low" | "medium" | "high";
  tags: string[];
  internal?: boolean;
}
import { restApiAuthUtil } from "../utils/RestApiAuthUtil";

export async function loadNotes(evId: string, email: string): Promise<Note[]> {
  if (evId.startsWith("7700") || evId.startsWith("demo")) {
    try {
      return JSON.parse(localStorage.getItem(`yuvro-notes-${evId}-${email}`) || "[]");
    } catch {
      return [];
    }
  }
  try {
    const res = await restApiAuthUtil.get<any[]>(`/skill_evaluation/notes/?evaluation_id=${evId}&candidate_email=${encodeURIComponent(email)}`);
    return res.map((r) => ({
      id: r.id,
      text: r.text,
      author: r.author_name || "Unknown",
      time: new Date(r.created_at).getTime(),
      priority: (r.priority || "LOW").toLowerCase() as any,
      tags: r.tags || [],
      internal: r.is_internal,
    }));
  } catch (err) {
    console.error("Failed to load notes", err);
    return [];
  }
}

export interface TimelineEvent {
  id: string | number;
  label: string;
  time: string;
  occurred_at?: string;
  done: boolean;
  tone: "success" | "warn" | "neutral";
}

import { formatDistanceToNow } from "date-fns";

const EVALUATION_MILESTONES = [
  "Evaluation invitation sent",
  "Candidate started evaluation",
  "Engineering Labs submitted",
  "Knowledge Assessment submitted",
  "Vitarka discussion completed",
  "Evaluation finished",
];

const RECRUITER_MILESTONES = [
  "Recruiter viewed profile",
  "Shortlisted",
  "Interview scheduled",
  "Offer sent"
];

export function formatTimelineEvents(rawEvents: any[]): TimelineEvent[] {
  const completed = rawEvents.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()).map((r) => {
    let tone: "success" | "warn" | "neutral" = "neutral";
    if (r.status === "SUCCESS") tone = "success";
    else if (r.status === "WARNING" || r.status === "ERROR") tone = "warn";

    return {
      id: r.id || String(Math.random()),
      label: r.title,
      time: formatDistanceToNow(new Date(r.occurred_at), { addSuffix: true }),
      occurred_at: r.occurred_at,
      done: r.status !== "PENDING",
      tone,
    };
  });

  const completedMap = new Map(completed.map(e => [e.label, e]));
  
  const isFinished = completedMap.has("Evaluation finished") || completedMap.has("Auto submitted");
  const sectionMilestones = [
    "Engineering Labs submitted",
    "Knowledge Assessment submitted",
    "Vitarka discussion completed",
  ];

  const fullTimeline: TimelineEvent[] = [];

  // 1. Fixed evaluation lifecycle
  for (const m of EVALUATION_MILESTONES) {
    if (m === "Evaluation finished" && completedMap.has("Auto submitted")) {
      fullTimeline.push(completedMap.get("Auto submitted")!);
    } else if (completedMap.has(m)) {
      fullTimeline.push(completedMap.get(m)!);
    } else {
      let timeLabel = "pending";
      if (isFinished && sectionMilestones.includes(m)) {
        timeLabel = "Not submitted";
      }
      fullTimeline.push({ id: m, label: m, time: timeLabel, done: false, tone: "neutral" });
    }
  }

  // 2. Chronological post-evaluation events (decisions, holds, etc)
  const evalSet = new Set(EVALUATION_MILESTONES);
  evalSet.add("Auto submitted");
  
  const postEvents = completed.filter(e => !evalSet.has(e.label));
  for (const e of postEvents) {
    fullTimeline.push(e);
  }

  // 3. Pending recruiter milestones
  const postEventsSet = new Set(postEvents.map(e => e.label));
  for (const m of RECRUITER_MILESTONES) {
    if (!postEventsSet.has(m)) {
      fullTimeline.push({ id: m, label: m, time: "pending", done: false, tone: "neutral" });
    }
  }
  
  return fullTimeline;
}

export async function loadTimelineEvents(evId: string, email: string): Promise<TimelineEvent[]> {
  if (evId.startsWith("7700") || evId.startsWith("demo")) {
    return []; // Handled by demo mock in getCandidateDetail
  }
  try {
    const res = await restApiAuthUtil.get<any[]>(`/skill_evaluation/timeline-events/?evaluation_id=${evId}&candidate_email=${encodeURIComponent(email)}`);
    return formatTimelineEvents(res);
  } catch (err) {
    console.error("Failed to load timeline events", err);
    return [];
  }
}

export async function createTimelineEvent(evId: string, email: string, title: string, status: string = "SUCCESS"): Promise<void> {
  if (evId.startsWith("7700") || evId.startsWith("demo")) return;
  try {
    const payload = {
      evaluation: evId,
      candidate_email: email,
      title,
      status,
      occurred_at: new Date().toISOString()
    };
    await restApiAuthUtil.post(`/skill_evaluation/timeline-events/`, payload);
  } catch (err) {
    console.error("Failed to create timeline event", err);
  }
}

export async function addNote(evId: string, email: string, note: Partial<Note>): Promise<Note | null> {
  const isDemo = evId.startsWith("7700") || evId.startsWith("demo");
  const newNote: Note = {
      id: Math.random().toString(36).slice(2, 9),
      text: note.text || "",
      author: "You",
      time: Date.now(),
      priority: note.priority || "medium",
      tags: note.tags || [],
      internal: note.internal ?? true,
  };

  if (isDemo) {
    try {
      const existing = JSON.parse(localStorage.getItem(`yuvro-notes-${evId}-${email}`) || "[]");
      localStorage.setItem(`yuvro-notes-${evId}-${email}`, JSON.stringify([newNote, ...existing]));
      return newNote;
    } catch {
      return null;
    }
  }

  try {
    const payload = {
      evaluation: evId,
      candidate_email: email,
      text: note.text,
      priority: (note.priority || "medium").toUpperCase(),
      is_internal: note.internal ?? true,
      tags: note.tags || []
    };
    const res = await restApiAuthUtil.post<any>(`/skill_evaluation/notes/`, payload);
    return {
      id: res.id,
      text: res.text,
      author: res.author_name || "You",
      time: new Date(res.created_at).getTime(),
      priority: (res.priority || "LOW").toLowerCase() as any,
      tags: res.tags || [],
      internal: res.is_internal,
    };
  } catch (err: any) {
    console.error("Failed to save note", err, err.details);
    return null;
  }
}

export async function deleteNote(noteId: string | number, evId?: string, email?: string): Promise<boolean> {
  if (evId && (evId.startsWith("7700") || evId.startsWith("demo"))) {
    try {
      if (!email) return false;
      const existing = JSON.parse(localStorage.getItem(`yuvro-notes-${evId}-${email}`) || "[]");
      localStorage.setItem(`yuvro-notes-${evId}-${email}`, JSON.stringify(existing.filter((n: any) => n.id !== noteId)));
      return true;
    } catch {
      return false;
    }
  }

  try {
    await restApiAuthUtil.request<any>(`/skill_evaluation/notes/${noteId}/`, { method: "DELETE" });
    return true;
  } catch (err) {
    console.error("Failed to delete note", err);
    return false;
  }
}

export function loadNotedSet(evId: string, candidateIds: string[]): Set<string> {
  const out = new Set<string>();
  if (typeof window === "undefined") return out;
  for (const id of candidateIds) {
    // For demo evaluations, we can still read from localStorage by ID if it's the email or candId
    try {
      const raw = localStorage.getItem(`yuvro-notes-${evId}-${id}`);
      if (raw && JSON.parse(raw).length) out.add(id);
    } catch {}
  }
  return out;
}

export interface ActivityEvent {
  id: string;
  kind: string;
  text: string;
  time: number;
}
export async function loadActivity(evId: string, email: string): Promise<ActivityEvent[]> {
  if (evId.startsWith("7700") || evId.startsWith("demo")) {
    try {
      return JSON.parse(localStorage.getItem(`yuvro-act-${evId}-${email}`) || "[]");
    } catch {
      return [];
    }
  }
  
  try {
    const res = await restApiAuthUtil.get<any[]>(`/skill_evaluation/activity-logs/?evaluation_id=${evId}&candidate_email=${encodeURIComponent(email)}`);
    return res.map(r => ({
      id: String(r.id),
      kind: r.kind,
      text: r.text,
      time: new Date(r.created_at).getTime()
    }));
  } catch (err) {
    console.error("Failed to load activity logs", err);
    return [];
  }
}

export async function pushActivity(evId: string, email: string, kind: string, text: string) {
  if (typeof window === "undefined") return;
  // Deduplicate rapid view events
  if (kind === "view") {
    const dedupKey = `view-dedup-${evId}-${email}`;
    try {
      const lastView = sessionStorage.getItem(dedupKey);
      if (lastView && Date.now() - parseInt(lastView) < 60 * 60 * 1000) {
        return; // Skip if viewed in the last hour
      }
      sessionStorage.setItem(dedupKey, Date.now().toString());
    } catch {}
  }

  if (evId.startsWith("7700") || evId.startsWith("demo")) {
    const list = await loadActivity(evId, email);
    list.unshift({ id: Math.random().toString(36).slice(2, 9), kind, text, time: Date.now() });
    try {
      localStorage.setItem(`yuvro-act-${evId}-${email}`, JSON.stringify(list.slice(0, 100)));
    } catch {}
    return;
  }

  try {
    await restApiAuthUtil.post(`/skill_evaluation/activity-logs/`, {
      evaluation: evId,
      candidate_email: email,
      kind,
      text
    });
  } catch (err) {
    console.error("Failed to push activity log", err);
  }
}


export type HiringDecision =
  "Pending Review" | "Shortlisted" | "Interview Scheduled" | "Selected" | "Rejected" | "Hold";
export function loadDecision(evId: string, cid: string, fallback: HiringDecision): HiringDecision {
  if (typeof window === "undefined") return fallback;
  try {
    return (localStorage.getItem(`yuvro-dec-${evId}-${cid}`) as HiringDecision) || fallback;
  } catch {
    return fallback;
  }
}
export async function saveDecision(evId: string, cid: string, email: string, d: HiringDecision) {
  try {
    localStorage.setItem(`yuvro-dec-${evId}-${cid}`, d);
    if (!evId.startsWith("7700") && !evId.startsWith("demo")) {
      const { evaluationService } = await import("@/services/evaluationService");
      await evaluationService.updateCandidateStatus(evId, email, d);
    }
  } catch {}
}

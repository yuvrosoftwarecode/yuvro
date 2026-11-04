import InterviewReport, { type Report, type AttemptItem, IR_CSS } from "@/components/InterviewReport";
import {
  captureInterviewReport,
  readInterviewReport,
  readInterviewReportHistory,
  submissionToReport,
} from "@/lib/mockInterviewReports";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Clock,
  ChevronRight,
  PhoneOff,
  MessageSquare,
  Code2,
  Loader2,
  BrainCircuit,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { sql } from "@codemirror/lang-sql";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import YuvroLogo from "@/assets/YuvroLogo.png";
import { type Category, type Interview } from "@/lib/mockInterviews";
import {
  fetchMockInterviewBySlugOrId,
  fetchInterviewSubmissions,
  startBackendInterview,
  submitBackendAnswer,
  generateBackendReport,
  fetchMockInterviewQuota,
  type CandidateMockInterviewQuota,
} from "@/services/mockInterviewService";
import { BuyMockInterviewsModal } from "@/components/interview/BuyMockInterviewsModal";

const LANGS = {
  javascript: {
    label: "JavaScript",
    ext: "js",
    ext_fn: () => javascript({ typescript: true }),
    starter: "function solve(input) {\n  // write your solution\n}\n",
  },
  python: {
    label: "Python",
    ext: "py",
    ext_fn: () => python(),
    starter: "def solve(data):\n    # write your solution\n    pass\n",
  },
  java: {
    label: "Java",
    ext: "java",
    ext_fn: () => java(),
    starter: "public class Solution {\n  // write your solution\n}\n",
  },
  cpp: {
    label: "C++",
    ext: "cpp",
    ext_fn: () => cpp(),
    starter: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n",
  },
  sql: {
    label: "SQL",
    ext: "sql",
    ext_fn: () => sql(),
    starter: "SELECT *\nFROM users;\n",
  },
};

let lockedVoice: SpeechSynthesisVoice | null = null;

function resolveConsistentVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (lockedVoice) return lockedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const choice =
    voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Google US English") ||
          v.name.includes("Google") ||
          v.name.includes("Natural") ||
          v.name.includes("Samantha") ||
          v.name.includes("Victoria") ||
          v.name.includes("Karen"))
    ) ||
    voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        !v.name.includes("Fred") &&
        !v.name.includes("Zarvox") &&
        !v.name.includes("Bells")
    ) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0];

  if (choice) {
    lockedVoice = choice;
  }
  return lockedVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      resolveConsistentVoice();
    };
  } catch {}
}

export function isCodingQuestion(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  const explicitPhrases = [
    "write code",
    "write a code",
    "write some code",
    "write the code",
    "write out the code",
    "write a function",
    "write the function",
    "write a program",
    "write a script",
    "write an algorithm",
    "write a query",
    "write an sql query",
    "write a sql query",
    "write a class",
    "write a method",
    "write a solution",
    "write your solution",
    "write the solution",
    "code editor",
    "in the editor",
    "open the editor",
    "open the code editor",
    "in the code editor",
    "using the code editor",
    "code a function",
    "code an algorithm",
    "code a solution",
    "code this up",
    "code this out",
    "code this in",
    "code it in",
    "code it up",
    "code this solution",
    "implement a function",
    "implement the function",
    "implement a method",
    "implement a class",
    "implement an algorithm",
    "implement a solution",
    "implement binary search",
    "implement quicksort",
    "implement mergesort",
    "implement a linked list",
    "implement a stack",
    "implement a queue",
    "implement a hash map",
    "implement a tree",
    "implement a graph",
    "implement debounce",
    "implement throttle",
    "implement an lru",
    "implement a decorator",
    "implement a generator",
    "solve this in code",
    "solve this using code",
    "solve this in the editor",
    "show me in code",
    "provide the code",
    "share the code",
    "show me how you'd write",
    "show me how you would write",
    "how you'd write",
    "how you would write",
    "write a simple one",
    "write a simple function",
    "returns their sum",
    "takes two numbers",
  ];

  if (explicitPhrases.some((phrase) => lower.includes(phrase))) {
    return true;
  }

  const patterns = [
    /\b(write|create|develop|draft)\s+(a|an|the|me\s+a)?\s*[\w\s-]{0,25}?\s*(function|script|program|algorithm|method|query|decorator|generator|class|subroutine)\b/i,
    /\bimplement\s+(a|an|the)?\s*[\w\s-]{0,30}?\s*(in code|using code|in python|in javascript|in java|in c\+\+|in sql)\b/i,
    /\b(can|could|would)\s+you\s+(write|code|implement)\s+(a|an|the|this)?\s*[\w\s-]{0,25}?\s*(function|solution|algorithm|class|script|program|code)\b/i,
    /\b(code|program)\s+(a|an|the)\s+[\w\s-]{0,25}?\s*(solution|function|algorithm|class|method)\b/i,
  ];

  return patterns.some((rx) => rx.test(lower));
}

export function isUserSignalingCodeIntent(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  const phrases = [
    "i will write",
    "i'll write",
    "i am going to write",
    "let me write",
    "will write the code",
    "will write a function",
    "will write the function",
    "will write function",
    "will write a code",
    "let me code",
    "i will code",
    "i'll code",
    "i will type",
    "let me type",
    "in the editor",
    "write the code now",
    "write code now",
    "writing the code",
    "writing code",
    "writing a function",
    "writing function",
    "code it now",
    "code it",
    "open the editor",
    "open code editor",
  ];

  if (phrases.some((p) => lower.includes(p))) {
    return true;
  }

  const patterns = [
    /\b(i\s+will|i'll|let\s+me|going\s+to)\s+(write|code|type|implement|draft)\b/i,
    /\bwrite\s+(?:the\s+|a\s+)?(?:code|function|program|script|solution)\s+now\b/i,
  ];

  return patterns.some((rx) => rx.test(lower));
}

export function detectDefaultLang(title: string): keyof typeof LANGS {
  const t = (title || "").toLowerCase();
  if (t.includes("python") || t.includes("django") || t.includes("flask") || t.includes("fastapi")) return "python";
  if (t.includes("node") || t.includes("javascript") || t.includes("js") || t.includes("react") || t.includes("typescript") || t.includes("ts") || t.includes("frontend") || t.includes("web")) return "javascript";
  if (t.includes("c++") || t.includes("cpp")) return "cpp";
  if (t.includes("sql") || t.includes("database") || t.includes("postgres") || t.includes("mysql")) return "sql";
  if (t.includes("java") && !t.includes("javascript")) return "java";
  return "python";
}

export function detectLangFromContext(
  questionText: string,
  interviewTitle: string
): keyof typeof LANGS {
  const q = (questionText || "").toLowerCase();

  if (q.includes("python") || q.includes("django") || q.includes("flask") || q.includes("fastapi")) {
    return "python";
  }
  if (
    q.includes("javascript") ||
    q.includes("typescript") ||
    q.includes("node.js") ||
    q.includes("nodejs") ||
    q.includes("react")
  ) {
    return "javascript";
  }
  if (q.includes("sql") || q.includes("database") || q.includes("postgres") || q.includes("mysql") || q.includes("query")) {
    return "sql";
  }
  if (q.includes("c++") || q.includes("cpp")) {
    return "cpp";
  }
  if (q.includes("java") && !q.includes("javascript")) {
    return "java";
  }

  return detectDefaultLang(interviewTitle);
}

export const Route = createFileRoute("/mock-interview/$slug")({
  validateSearch: (search: Record<string, unknown>) => ({
    report: search.report === true || search.report === "true",
  }),
  head: () => ({
    meta: [
      { title: "Vitarka Interview | Yuvro" },
      { name: "description", content: "Live AI mock interview with Vitarka." },
    ],
  }),
  loader: async ({ params }): Promise<Interview> => {
    const i = await fetchMockInterviewBySlugOrId(params.slug);
    if (!i) throw notFound();
    return i;
  },
  component: InterviewScreen,
});

const BANK: Record<Category, { text: string; skill: string }[]> = {
  Backend: [
    { text: "Walk me through how you'd design a REST endpoint to create an order. What validations and status codes would you return?", skill: "API design" },
    { text: "How do you handle database transactions when an operation touches multiple tables?", skill: "Data consistency" },
    { text: "A service's p99 latency doubled after a deploy. How do you investigate?", skill: "Debugging" },
    { text: "Explain how you'd add caching to a read-heavy endpoint and keep it fresh.", skill: "Caching" },
    { text: "How do you secure an API that is called by both mobile apps and other services?", skill: "Security" },
  ],
  Frontend: [
    { text: "Explain what triggers a re-render in React and how you'd prevent unnecessary ones.", skill: "Rendering" },
    { text: "How would you structure state for a large form with dependent fields?", skill: "State management" },
    { text: "A page feels slow on low-end phones. What do you measure first?", skill: "Performance" },
    { text: "How do you make a custom dropdown accessible?", skill: "Accessibility" },
    { text: "Describe how you'd handle loading and error states for data fetching.", skill: "UX patterns" },
  ],
  Data: [
    { text: "Explain the difference between INNER, LEFT and FULL joins with an example.", skill: "SQL" },
    { text: "When would you use a window function instead of GROUP BY?", skill: "Analytics" },
    { text: "A query on a 50M-row table is slow. How do you optimize it?", skill: "Indexing" },
    { text: "How would you model data for a reporting warehouse?", skill: "Data modelling" },
    { text: "How do you ensure data quality in a daily pipeline?", skill: "Pipelines" },
  ],
  "DevOps & Cloud": [
    { text: "Describe a CI/CD pipeline you'd set up for a containerized service.", skill: "CI/CD" },
    { text: "A pod keeps restarting in Kubernetes. How do you diagnose it?", skill: "Kubernetes" },
    { text: "How would you design a VPC for a public web app with a private database?", skill: "Networking" },
    { text: "What metrics and alerts would you set up for a new service?", skill: "Observability" },
    { text: "How do you reduce cloud cost without hurting reliability?", skill: "Cost" },
  ],
  "System Design": [
    { text: "Design a URL shortener. Start with requirements and capacity estimates.", skill: "Requirements" },
    { text: "How would you scale the write path to 10k requests per second?", skill: "Scalability" },
    { text: "Which database would you choose and why? What's your schema?", skill: "Storage" },
    { text: "How do you handle failure of a single region?", skill: "Reliability" },
    { text: "What trade-offs did you make, and what would you revisit?", skill: "Trade-offs" },
  ],
  "AI/ML": [
    { text: "How do you choose an evaluation metric for an imbalanced classification problem?", skill: "Evaluation" },
    { text: "Explain how a retrieval-augmented generation system works end to end.", skill: "RAG" },
    { text: "Your model performs well offline but poorly in production. Why might that be?", skill: "MLOps" },
    { text: "How would you detect and reduce hallucinations in an LLM app?", skill: "Guardrails" },
    { text: "How do you version data and models?", skill: "Reproducibility" },
  ],
  Security: [
    { text: "Explain SQL injection and how you prevent it.", skill: "OWASP" },
    { text: "How does a JWT work and what are its risks?", skill: "Auth" },
    { text: "Walk me through threat modelling a login feature.", skill: "Threat modelling" },
    { text: "How do you store user passwords safely?", skill: "Crypto" },
    { text: "What's the difference between CSRF and XSS?", skill: "Web security" },
  ],
  Behavioural: [
    { text: "Tell me about yourself and why you're interested in this role.", skill: "Introduction" },
    { text: "Describe a time you disagreed with a teammate. How did you resolve it?", skill: "Collaboration" },
    { text: "Tell me about a project you're proud of. What was your role?", skill: "Ownership" },
    { text: "Describe a failure and what you learned from it.", skill: "Growth" },
    { text: "Where do you see yourself in three years?", skill: "Goals" },
  ],
};

const FOLLOWUPS = [
  "Good. Can you give a concrete example from a project?",
  "What trade-offs would you consider there?",
  "How would that change at 10x the scale?",
  "Interesting — what could go wrong with that approach?",
];

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function CapturedReport({
  slug,
  report,
  children,
}: {
  slug: string;
  report: Report;
  children: React.ReactNode;
}) {
  useEffect(() => {
    captureInterviewReport(slug, report);
  }, [slug, report]);
  return <>{children}</>;
}

function InterviewScreen() {
  const iv = Route.useLoaderData();
  const navigate = useNavigate();
  const { report: showReport } = Route.useSearch();
  const [savedReport, setSavedReport] = useState<Report | null>(() => readInterviewReport(iv.slug));
  const [submissions, setSubmissions] = useState<any[]>(() => iv.mySubmissions || []);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [viewingReportOverride, setViewingReportOverride] = useState<Report | null>(null);
  const [quota, setQuota] = useState<CandidateMockInterviewQuota | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [buyModalNote, setBuyModalNote] = useState<string | null>(null);

  const backendId = iv.backendId || (iv.slug.length > 20 ? iv.slug : null);

  useEffect(() => {
    fetchMockInterviewQuota().then((q) => {
      if (q) setQuota(q);
    });
  }, []);

  useEffect(() => {
    if (!backendId) return;
    setIsLoadingSubmissions(true);
    fetchInterviewSubmissions(backendId)
      .then((subs) => {
        if (subs && subs.length > 0) {
          setSubmissions(subs);
        }
      })
      .finally(() => {
        setIsLoadingSubmissions(false);
      });
  }, [backendId, iv.slug]);

  const attemptsList = useMemo<AttemptItem[]>(() => {
    const list: AttemptItem[] = [];
    const seenIds = new Set<string>();

    // 1. Backend submissions from the server database (most recent first)
    submissions.forEach((sub: any) => {
      const subId = String(sub.id);
      if (seenIds.has(subId)) return;
      seenIds.add(subId);

      const subRep = submissionToReport(sub, iv.name);
      list.push({
        id: subId,
        attemptNumber: 0,
        date: subRep.date,
        duration: subRep.duration,
        score: subRep.score,
        status: sub.status || "completed",
        summary: subRep.summary,
        strength: subRep.strength,
        focus: subRep.focus,
        report: subRep,
      });
    });

    // 2. Active saved report from current session if not yet in backend submissions
    if (savedReport) {
      const isAlreadyIncluded = list.some(
        (it) =>
          it.id === savedReport.id ||
          (it.score === savedReport.score && it.duration === savedReport.duration)
      );
      if (!isAlreadyIncluded) {
        list.unshift({
          id: savedReport.id || "current-session",
          attemptNumber: 0,
          date: savedReport.date,
          duration: savedReport.duration,
          score: savedReport.score,
          status: "completed",
          summary: savedReport.summary,
          strength: savedReport.strength,
          focus: savedReport.focus,
          report: savedReport,
        });
      }
    }

    // 3. Local report history cache
    const history = readInterviewReportHistory(iv.slug);
    history.forEach((h) => {
      const exists = list.some(
        (it) =>
          it.id === h.id ||
          (it.date === h.date && it.duration === h.duration && it.score === h.score)
      );
      if (!exists) {
        list.push({
          id: h.id || `loc-${list.length}`,
          attemptNumber: 0,
          date: h.date,
          duration: h.duration,
          score: h.score,
          status: "completed",
          summary: h.summary,
          strength: h.strength,
          focus: h.focus,
          report: h,
        });
      }
    });

    // Assign attempt numbers: newest attempt gets total, oldest gets #1
    const total = list.length;
    return list.map((it, idx) => ({
      ...it,
      attemptNumber: total - idx,
    }));
  }, [submissions, savedReport, iv.name, iv.slug]);

  const activeReport = useMemo<Report | null>(() => {
    if (viewingReportOverride) return viewingReportOverride;
    if (selectedAttemptId) {
      const match = attemptsList.find((a) => a.id === selectedAttemptId);
      if (match?.report) return match.report;
    }
    if (attemptsList.length > 0 && attemptsList[0].report) return attemptsList[0].report;
    if (savedReport) return savedReport;
    return null;
  }, [viewingReportOverride, selectedAttemptId, savedReport, attemptsList]);

  const handleSelectAttempt = (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    const match = attemptsList.find((a) => a.id === attemptId);
    if (match?.report) {
      setViewingReportOverride(match.report);
    }
  };

  const questions = useMemo(() => {
    const introItem = {
      text: `Hello! I'm your AI interviewer today for the ${iv.name} role. To get started, could you please introduce yourself and share a brief overview of your background and technical experience?`,
      skill: "Introduction",
    };

    let baseQuestions: { text: string; skill: string }[] = [];

    if (iv.predefinedTree && Array.isArray(iv.predefinedTree) && iv.predefinedTree.length > 0) {
      baseQuestions = iv.predefinedTree.map((node: any, k: number) => ({
        text: node.text || node.question || `Question ${k + 1}`,
        skill: `${iv.name} · Topic ${k + 1}`,
      }));
    } else {
      const nameLower = (iv.name || "").toLowerCase();
      const slugLower = (iv.slug || "").toLowerCase();
      if (nameLower.includes("mongodb") || slugLower.includes("mongodb") || nameLower.includes("mongo")) {
        baseQuestions = [
          { text: "Can you explain the key architectural differences between MongoDB and traditional relational databases, specifically regarding schema design and horizontal scaling?", skill: "MongoDB Architecture & NoSQL" },
          { text: "When modeling one-to-many relationships in MongoDB, how do you decide whether to embed documents or reference them with ObjectIDs?", skill: "Document Schema Design" },
          { text: "How does the MongoDB Aggregation Pipeline work, and can you walk through a pipeline using $match, $group, and $project stages?", skill: "Aggregation Framework" },
          { text: "What indexing strategies does MongoDB support (e.g. compound, multikey, TTL), and how do you use explain plans to optimize a slow query?", skill: "Indexing & Query Optimization" },
          { text: "Can you explain how replication and replica sets work in MongoDB to ensure high availability and automatic failover?", skill: "Replication & High Availability" },
        ];
      } else if (iv.category && BANK[iv.category] && BANK[iv.category].length > 0) {
        baseQuestions = BANK[iv.category];
      } else {
        baseQuestions = BANK.Backend;
      }
    }

    return [introItem, ...baseQuestions];
  }, [iv]);

  const [phase, setPhase] = useState<"lobby" | "live" | "done">("lobby");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [log, setLog] = useState<{ who: "ai" | "me"; text: string }[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [backendReportData, setBackendReportData] = useState<any | null>(null);
  const [questionType, setQuestionType] = useState<string>("behavioral");

  useEffect(() => {
    if (phase === "live" && log.length === 0 && questions.length > 0) {
      setLog([{ who: "ai", text: questions[0].text }]);
    }
  }, [phase, questions, log.length]);

  const [left, setLeft] = useState((iv.minutes || 30) * 60);
  const endRef = useRef<HTMLDivElement>(null);
  const isEndingRef = useRef(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleEndInterview = async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    setPhase("done");
    setIsGeneratingReport(true);

    const backendId = iv.backendId || (iv.slug.length > 20 ? iv.slug : null);
    if (sessionId && backendId) {
      try {
        await submitBackendAnswer(backendId, {
          interview_session_id: sessionId,
          user_answer: "",
          status: "finish",
        });
      } catch (e) {
        console.warn("Could not notify backend of interview finish:", e);
      }
    }

    if (submissionId) {
      try {
        const backendRep = await generateBackendReport(submissionId);
        if (backendRep) {
          setBackendReportData(backendRep);
        }
        if (backendId) {
          fetchInterviewSubmissions(backendId).then((subs) => {
            if (subs && subs.length > 0) {
              setSubmissions(subs);
            }
          });
        }
      } catch (e) {
        console.warn("Could not generate backend report:", e);
      } finally {
        setIsGeneratingReport(false);
      }
    } else {
      setIsGeneratingReport(false);
    }
  };

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(
      () => setLeft((v) => (v <= 1 ? (handleEndInterview(), 0) : v - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [phase, sessionId, submissionId]);

  const lastAiMessage = useMemo(() => {
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].who === "ai") return log[i].text;
    }
    return "";
  }, [log]);

  // AI voice speech synthesis with acoustic isolation & persistent consistent voice
  useEffect(() => {
    if (phase !== "live" || !lastAiMessage) return;
    setSpeaking(true);
    let cancelled = false;
    let failsafeTimer: NodeJS.Timeout | null = null;
    let synthUtterance: SpeechSynthesisUtterance | null = null;

    const playSpeech = () => {
      if (cancelled) return;
      try {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(lastAiMessage);
          synthUtterance = utterance;
          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          const voice = resolveConsistentVoice();
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || "en-US";
          }

          const handleSpeechEnd = () => {
            if (failsafeTimer) clearTimeout(failsafeTimer);
            synthUtterance = null;
            // Hold speaking state for an extra 600ms so room acoustic echo and speaker tail completely decay
            setTimeout(() => {
              if (!cancelled) setSpeaking(false);
            }, 600);
          };

          utterance.onend = handleSpeechEnd;
          utterance.onerror = handleSpeechEnd;

          failsafeTimer = setTimeout(handleSpeechEnd, 30000);
          window.speechSynthesis.speak(utterance);
        } else {
          setSpeaking(false);
        }
      } catch {
        setSpeaking(false);
      }
    };

    // If voices haven't loaded yet on first speech, wait for them:
    if (typeof window !== "undefined" && "speechSynthesis" in window && !lockedVoice) {
      const current = window.speechSynthesis.getVoices();
      if (!current || current.length === 0) {
        let fired = false;
        const onVoicesReady = () => {
          if (fired) return;
          fired = true;
          window.speechSynthesis.onvoiceschanged = null;
          resolveConsistentVoice();
          playSpeech();
        };
        window.speechSynthesis.onvoiceschanged = onVoicesReady;
        const timer = setTimeout(() => {
          if (!fired) {
            fired = true;
            resolveConsistentVoice();
            playSpeech();
          }
        }, 150);
        return () => {
          cancelled = true;
          clearTimeout(timer);
          window.speechSynthesis.onvoiceschanged = null;
        };
      }
    }

    playSpeech();

    return () => {
      cancelled = true;
      if (failsafeTimer) clearTimeout(failsafeTimer);
      try {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      } catch {}
      synthUtterance = null;
      setSpeaking(false);
    };
  }, [lastAiMessage, phase]);

  useEffect(() => {
    const el = endRef.current?.parentElement;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [log]);

  const handleStart = async () => {
    if (quota && quota.available_interviews <= 0) {
      setBuyModalNote("You have 0 mock interviews remaining. Please choose a pack to start your interview.");
      setIsBuyModalOpen(true);
      return;
    }

    setIsStarting(true);
    const backendId = iv.backendId || (iv.slug.length > 20 ? iv.slug : null);

    if (backendId) {
      try {
        const res = await startBackendInterview(backendId, {
          duration: iv.minutes || 30,
        });

        if (res) {
          if (res.available_interviews !== undefined && quota) {
            setQuota({ ...quota, available_interviews: res.available_interviews });
          } else if (quota) {
            setQuota({
              ...quota,
              available_interviews: Math.max(0, quota.available_interviews - 1),
              used_interviews: quota.used_interviews + 1,
            });
          }

          const sessId = res.interview_session_id || res.chat_session_id || res.submission_id;
          if (res.submission_id) setSubmissionId(res.submission_id);
          if (sessId) setSessionId(sessId);

          const firstQ =
            res.first_question ||
            questions[0]?.text ||
            `Hello! I'm your AI interviewer today for the ${iv.name} role. To get started, could you please introduce yourself and share a brief overview of your background and technical experience?`;
          if (firstQ) {
            setLog([{ who: "ai", text: firstQ }]);
            setQuestionType(res.first_question_type || "behavioral");
          }
          setPhase("live");
          setIsStarting(false);
          return;
        }
      } catch (err: any) {
        console.error("Failed to start backend interview:", err);
        const errData = err?.response?.data || err?.data || err;
        const isQuotaErr =
          err?.status === 402 ||
          err?.response?.status === 402 ||
          errData?.code === "INSUFFICIENT_MOCK_INTERVIEWS" ||
          (typeof err?.message === "string" && err.message.includes("0 mock interviews"));

        if (isQuotaErr) {
          setIsStarting(false);
          setBuyModalNote("You have 0 mock interviews remaining. Please choose a pack to continue.");
          setIsBuyModalOpen(true);
          return;
        }
      }
    }

    // Fallback if not a backend interview or network call failed
    const firstQ =
      questions[0]?.text ||
      `Hello! I'm your AI interviewer today for the ${iv.name} role. To get started, could you please introduce yourself and share a brief overview of your background and technical experience?`;
    setLog([{ who: "ai", text: firstQ }]);
    setQuestionType("behavioral");
    setPhase("live");
    setIsStarting(false);
  };

  const submit = async (override?: string) => {
    const text = (typeof override === "string" ? override : draft).trim();
    if (!text || isThinking) return;
    const next = [...answers, text];
    setAnswers(next);
    setDraft("");

    setLog((l) => [...l, { who: "me", text }]);

    const backendId = iv.backendId || (iv.slug.length > 20 ? iv.slug : null);

    if (sessionId && backendId) {
      setIsThinking(true);
      try {
        const nextRes = await submitBackendAnswer(backendId, {
          interview_session_id: sessionId,
          user_answer: text,
          status: "normal",
        });

        if (nextRes && nextRes.question) {
          setLog((l) => [...l, { who: "ai", text: nextRes.question }]);
          setIdx((i) => i + 1);
          setQuestionType(nextRes.question_type || (isCodingQuestion(nextRes.question) ? "coding" : "technical"));
          if (nextRes.is_finished) {
            // Give 4 seconds for AI voice to speak the farewell before transitioning to report
            setTimeout(async () => {
              await handleEndInterview();
            }, 4000);
          }
          return;
        }
      } catch (err) {
        console.error("Error submitting answer to backend dynamic engine:", err);
      } finally {
        setIsThinking(false);
      }
      return;
    }

    // Fallback to local questions
    if (idx === 0) {
      const nextQ = questions[1]?.text || "Can you explain your approach to writing scalable, maintainable code?";
      const transitionText = `Thank you for introducing yourself! Let's start with our first technical question:\n\n${nextQ}`;
      setLog((l) => [...l, { who: "ai", text: transitionText }]);
      setFollowUp(null);
      setIdx(1);
      setQuestionType(isCodingQuestion(nextQ) ? "coding" : "technical");
      return;
    }

    if (!followUp && next.length % 2 === 1 && idx < questions.length - 1) {
      const f = FOLLOWUPS[idx % FOLLOWUPS.length];
      setLog((l) => [...l, { who: "ai", text: f }]);
      setFollowUp(f);
      setQuestionType(isCodingQuestion(f) ? "coding" : "technical");
      return;
    }
    if (idx < questions.length - 1) {
      const nextQ = questions[idx + 1].text;
      setLog((l) => [...l, { who: "ai", text: nextQ }]);
      setFollowUp(null);
      setIdx(idx + 1);
      setQuestionType(isCodingQuestion(nextQ) ? "coding" : "technical");
    } else {
      await handleEndInterview();
    }
  };

  const q = questions[idx] || questions[0];

  if (showReport) {
    if (isLoadingSubmissions && !activeReport && (!submissions || submissions.length === 0)) {
      return (
        <Shell title={iv.name}>
          <div className="mx-auto max-w-xl px-6 py-24 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h2 className="mt-4 text-base font-semibold">Loading interview attempts and report...</h2>
          </div>
        </Shell>
      );
    }

    if (activeReport) {
      return (
        <InterviewReport
          report={activeReport}
          attempts={attemptsList}
          currentAttemptId={
            selectedAttemptId ||
            attemptsList.find((a) => a.report?.id === activeReport.id)?.id ||
            attemptsList[0]?.id
          }
          onSelectAttempt={handleSelectAttempt}
          onBack={() => navigate({ to: "/mock-interviews" })}
          onTryAgain={() =>
            navigate({
              to: "/mock-interview/$slug",
              params: { slug: iv.slug },
              search: { report: false },
            })
          }
        />
      );
    }

    return (
      <Shell title={iv.name}>
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <h1 className="text-xl font-medium">No saved report available</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            No previous interview attempts were found for this role. Complete a practice interview to view your full evaluation report and performance breakdown.
          </p>
          <Button
            className="mt-6"
            onClick={() =>
              navigate({
                to: "/mock-interview/$slug",
                params: { slug: iv.slug },
                search: { report: false },
              })
            }
          >
            Start interview
          </Button>
        </div>
      </Shell>
    );
  }

  if (phase === "lobby") {
    return (
      <>
        <Lobby
          iv={iv}
          mic={mic}
          cam={cam}
          setMic={setMic}
          setCam={setCam}
          onStart={handleStart}
          isStarting={isStarting}
          availableInterviews={quota ? quota.available_interviews : 3}
          onOpenBuyModal={() => {
            setBuyModalNote(null);
            setIsBuyModalOpen(true);
          }}
        />
        <BuyMockInterviewsModal
          open={isBuyModalOpen}
          onOpenChange={setIsBuyModalOpen}
          quota={quota}
          initialNote={buyModalNote}
          onSuccess={(updated) => {
            setQuota(updated);
          }}
        />
      </>
    );
  }

  if (phase === "done") {
    if (isGeneratingReport) {
      const todayStr = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return (
        <div className="ir dark min-h-screen">
          <style>{IR_CSS}</style>
          <div className="ir-wrap">
            <header className="ir-top">
              <div>
                <button
                  className="ir-back"
                  onClick={() => navigate({ to: "/mock-interviews" })}
                >
                  ← Back to interviews
                </button>
                <h1 className="ir-h1">{iv.name}</h1>
                <p className="ir-meta">Interview report · Finalizing report · {todayStr}</p>
              </div>
            </header>

            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--bar)",
                borderRadius: "20px",
                padding: "72px 32px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                marginTop: "8px",
              }}
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute h-28 w-28 animate-ping rounded-full bg-[#4a7bdc]/20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#4a7bdc]/40 bg-[#1b2546] shadow-xl backdrop-blur">
                  <BrainCircuit className="h-10 w-10 animate-pulse text-[#4a7bdc]" />
                </div>
              </div>

              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  letterSpacing: "-0.01em",
                  margin: "32px 0 10px",
                }}
              >
                Generating your performance report...
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: "var(--muted)",
                  lineHeight: 1.65,
                  maxWidth: "540px",
                  margin: "0 0 32px",
                }}
              >
                Vitarka AI is evaluating your responses, scoring technical competencies, and preparing detailed insights.
              </p>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  borderRadius: "9999px",
                  border: "1px solid var(--bar)",
                  background: "var(--soft)",
                  padding: "10px 22px",
                  fontSize: "13px",
                  color: "var(--body)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <Loader2 className="h-4 w-4 animate-spin text-[#4a7bdc]" />
                <span>Analyzing interview answers and conversation flow...</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const totalSecs = (iv.minutes || 30) * 60;
    const used = Math.max(15, totalSecs - left);
    const scoreOf = (a?: string) => (a ? Math.min(95, 30 + Math.floor(a.trim().length / 6)) : 0);
    const qa = questions.map((x, k) => ({ x, a: answers[k] }));
    const calculatedOverall = Math.round(qa.reduce((t, r) => t + scoreOf(r.a), 0) / Math.max(1, qa.length));
    const overall = backendReportData?.overall_score != null
      ? Math.round(Number(backendReportData.overall_score))
      : backendReportData?.marks != null
      ? Math.round(Number(backendReportData.marks))
      : calculatedOverall;

    const bySkill = new Map<string, number[]>();
    qa.forEach((r) =>
      bySkill.set(r.x.skill, [...(bySkill.get(r.x.skill) ?? []), scoreOf(r.a)])
    );
    const fallbackSkills = [...bySkill].map(([name, v]) => ({
      name,
      score: Math.round(v.reduce((a, b) => a + b, 0) / v.length / 10),
    }));

    const backendSkills = backendReportData?.skill_analysis
      ? Object.entries(backendReportData.skill_analysis).map(([name, item]: [string, any]) => ({
          name,
          score: Math.round(Number(item.score || overall / 10)),
          description: item.feedback || (item.score >= 7 ? "Solid technical depth." : "Revisit core concepts."),
        }))
      : [];

    const skills = backendSkills.length ? backendSkills : fallbackSkills;

    const reportQuestions = backendReportData?.question_analysis?.length
      ? backendReportData.question_analysis.map((item: any) => ({
          question: item.question,
          category: item.type || "Technical",
          score: Math.round(Number(item.ai_score || 0)),
          answer: item.user_answer || "Not answered.",
          missing: item.what_could_be_better?.[0] || item.missing_terminologies?.join(", ") || "More specific examples and trade-offs.",
          tip: item.recommended_response || "Use a structured approach with practical examples.",
        }))
      : qa.map((r) => ({
          question: r.x.text,
          category: r.x.skill,
          score: scoreOf(r.a),
          answer: r.a ?? "Not answered.",
          missing: r.a
            ? "More specifics: a real example, numbers, and trade-offs."
            : "This question was not reached.",
          tip: "Use a short structure: context, approach, trade-offs, result.",
        }));

    const report: Report = {
      id: submissionId || `session-${Date.now()}`,
      role: iv.name,
      duration: `${Math.floor(used / 60)}m ${used % 60}s`,
      date: `${new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}, ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}`,
      score: overall,
      summary:
        backendReportData?.feedback_summary ||
        backendReportData?.overall_report?.markdown ||
        `You answered ${answers.length} question${answers.length === 1 ? "" : "s"}. ${
          overall >= 75
            ? "Strong performance with clear technical depth."
            : overall >= 50
            ? "Solid practice session. Revisit key concepts to sharpen your responses."
            : "Keep practicing — structured answers and concrete examples will boost your score."
        }`,
      strength:
        backendReportData?.key_takeaways?.strengths?.[0] ||
        (answers.length
          ? "You engaged with the questions and gave structured answers."
          : "You started the session."),
      focus:
        backendReportData?.key_takeaways?.improvements?.[0] ||
        "Give structured answers with a concrete example and the trade-offs you considered.",
      competencies:
        skills.length >= 3
          ? skills.map((s) => ({ name: s.name, value: s.score }))
          : [
              ...skills.map((s) => ({ name: s.name, value: s.score })),
              { name: "Communication", value: Math.round(overall / 10) },
              { name: "Depth", value: Math.round(overall / 12) },
            ].slice(0, Math.max(3, skills.length)),
      skills: skills.map((s) => ({
        ...s,
        description:
          s.description ||
          (s.score >= 7
            ? "Solid answer with good detail."
            : s.score >= 4
            ? "Reasonable start; add more depth and examples."
            : "Needs practice — revisit the fundamentals."),
      })),
      questions: reportQuestions,
      transcript: (() => {
        const turns: { from: "ai" | "me"; text: string }[] = [];
        log.forEach((m, k) => {
          turns.push({ from: m.who, text: m.text });
          if (m.who === "ai" && log[k + 1]?.who !== "me") {
            turns.push({ from: "me", text: "No answer recorded." });
          }
        });
        return turns.map((m, k) => ({
          ...m,
          time: fmt(Math.round((used * k) / Math.max(1, turns.length - 1))),
        }));
      })(),
    };

    const finalReport = viewingReportOverride || report;
    return (
      <CapturedReport slug={iv.slug} report={report}>
        <InterviewReport
          report={finalReport}
          attempts={attemptsList}
          currentAttemptId={
            selectedAttemptId ||
            attemptsList.find((a) => a.report?.id === finalReport.id)?.id ||
            attemptsList[0]?.id
          }
          onSelectAttempt={handleSelectAttempt}
          onBack={() => {
            captureInterviewReport(iv.slug, report);
            setSavedReport(report);
            navigate({ to: "/mock-interviews" });
          }}
          onTryAgain={() => {
            isEndingRef.current = false;
            setIsGeneratingReport(false);
            setPhase("lobby");
            setIdx(0);
            setAnswers([]);
            setLog([]);
            setFollowUp(null);
            setSessionId(null);
            setSubmissionId(null);
            setBackendReportData(null);
            setQuestionType("behavioral");
            setViewingReportOverride(null);
            setSelectedAttemptId(null);
            setLeft((iv.minutes || 30) * 60);
          }}
          onLearn={() => navigate({ to: "/mock-interviews" })}
        />
      </CapturedReport>
    );
  }

  return (
    <LiveRoom
      title={iv.name}
      left={left}
      log={log}
      speaking={speaking}
      isThinking={isThinking}
      questionType={questionType}
      mic={mic}
      setMic={setMic}
      cam={cam}
      setCam={setCam}
      draft={draft}
      setDraft={setDraft}
      submit={submit}
      onEnd={handleEndInterview}
      progress={`Question ${idx + 1} of ${questions.length} · ${q.skill}`}
      endRef={endRef}
    />
  );
}

function LiveRoom(p: {
  title: string;
  left: number;
  log: { who: "ai" | "me"; text: string }[];
  speaking: boolean;
  isThinking?: boolean;
  questionType?: string;
  mic: boolean;
  setMic: (v: boolean) => void;
  cam: boolean;
  setCam: (v: boolean) => void;
  draft: string;
  setDraft: (v: string | ((prev: string) => string)) => void;
  submit: (override?: string) => void;
  onEnd: () => void;
  progress: string;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  const streamRef = useRef<MediaStream | null>(null);
  const [chat, setChat] = useState(true);
  const [camErr, setCamErr] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const [lang, setLang] = useState<keyof typeof LANGS>(() => detectDefaultLang(p.title));
  const [code, setCode] = useState<Record<string, string>>({});
  const [micLevel, setMicLevel] = useState(0);

  const autoOpenedForRef = useRef<string>("");
  const wasAutoOpenedRef = useRef<boolean>(false);

  const [liveSpokenText, setLiveSpokenText] = useState("");
  const [isSilentCountdown, setIsSilentCountdown] = useState(false);
  const spokenAccumulatorRef = useRef("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const recRef = useRef<any>(null);
  const aiSpeakingCooldownRef = useRef(0);
  const isListeningRef = useRef(false);

  const submitRef = useRef(p.submit);
  useEffect(() => {
    submitRef.current = p.submit;
  }, [p.submit]);

  const micRef = useRef(p.mic);
  useEffect(() => {
    micRef.current = p.mic;
  }, [p.mic]);

  const thinkingRef = useRef(p.isThinking);
  useEffect(() => {
    thinkingRef.current = p.isThinking;
  }, [p.isThinking]);

  const speakingRef = useRef(p.speaking);
  useEffect(() => {
    speakingRef.current = p.speaking;
  }, [p.speaking]);

  // Audio level monitoring
  useEffect(() => {
    if (!p.mic || !navigator.mediaDevices?.getUserMedia) {
      setMicLevel(0);
      return;
    }
    let raf = 0,
      stream: MediaStream | null = null,
      ctx: AudioContext | null = null,
      alive = true;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (!alive) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        ctx = new AudioContext();
        const an = ctx.createAnalyser();
        an.fftSize = 512;
        ctx.createMediaStreamSource(s).connect(an);
        const buf = new Uint8Array(an.fftSize);
        const tick = () => {
          an.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) {
            const x = (v - 128) / 128;
            sum += x * x;
          }
          setMicLevel(Math.sqrt(sum / buf.length) * 3);
          raf = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => setMicLevel(0));
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, [p.mic]);

  const stopListening = useCallback(() => {
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {}
      recRef.current = null;
    }
    isListeningRef.current = false;
  }, []);

  const startListening = useCallback(() => {
    if (
      !p.mic ||
      p.speaking ||
      speakingRef.current ||
      p.isThinking ||
      thinkingRef.current ||
      !isMountedRef.current
    ) {
      return;
    }
    if (Date.now() < aiSpeakingCooldownRef.current) {
      const waitMs = Math.max(50, aiSpeakingCooldownRef.current - Date.now());
      setTimeout(() => {
        if (isMountedRef.current && p.mic && !speakingRef.current && !thinkingRef.current) {
          startListening();
        }
      }, waitMs);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {}
      recRef.current = null;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        isListeningRef.current = true;
      };

      rec.onresult = (ev: any) => {
        // Acoustic Echo / Self-Voice Rejection:
        // Strictly ignore microphone events if AI is speaking, within post-speech cooldown, or thinking
        if (
          p.speaking ||
          speakingRef.current ||
          Date.now() < aiSpeakingCooldownRef.current ||
          p.isThinking ||
          thinkingRef.current
        ) {
          return;
        }

        let newFinal = "";
        let interim = "";

        for (let i = ev.resultIndex; i < ev.results.length; ++i) {
          const item = ev.results[i];
          const text = item[0]?.transcript || "";
          if (item.isFinal) {
            newFinal += " " + text;
          } else {
            interim += " " + text;
          }
        }

        if (newFinal.trim()) {
          spokenAccumulatorRef.current = (
            spokenAccumulatorRef.current +
            " " +
            newFinal.trim()
          ).trim();
        }

        const fullSpoken = (
          spokenAccumulatorRef.current +
          " " +
          interim.trim()
        ).trim();

        // Require at least 2 words or 6 characters to prevent background clicks/noise from triggering
        const words = fullSpoken.split(/\s+/).filter(Boolean);
        if (words.length >= 2 || fullSpoken.length >= 6) {
          setLiveSpokenText(fullSpoken);
          setIsSilentCountdown(true);

          // Reset the 3-second auto-submit silence timer
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;
            const textToSubmit =
              spokenAccumulatorRef.current.trim() || fullSpoken.trim();
            spokenAccumulatorRef.current = "";
            setLiveSpokenText("");
            setIsSilentCountdown(false);
            if (
              textToSubmit &&
              !thinkingRef.current &&
              !speakingRef.current &&
              Date.now() >= aiSpeakingCooldownRef.current
            ) {
              submitRef.current(textToSubmit);
            }
          }, 3000);
        } else if (fullSpoken) {
          setLiveSpokenText(fullSpoken);
        }
      };

      rec.onerror = (err: any) => {
        if (err.error === "no-speech") return;
        if (err.error === "not-allowed" || err.error === "service-not-allowed") {
          isListeningRef.current = false;
        }
      };

      rec.onend = () => {
        isListeningRef.current = false;
        if (
          isMountedRef.current &&
          micRef.current &&
          !speakingRef.current &&
          !thinkingRef.current
        ) {
          setTimeout(() => {
            if (
              isMountedRef.current &&
              micRef.current &&
              !speakingRef.current &&
              !thinkingRef.current
            ) {
              startListening();
            }
          }, 300);
        }
      };

      rec.start();
      recRef.current = rec;
    } catch (e) {
      console.warn("Could not start speech recognition:", e);
      isListeningRef.current = false;
    }
  }, [p.mic, p.speaking, p.isThinking]);

  // Master speech recognition lifecycle controller:
  // - Stops listening and clears buffers whenever AI speaks or thinks
  // - Restarts listening automatically after speech finishes with 600ms acoustic echo cooldown
  useEffect(() => {
    isMountedRef.current = true;
    if (!p.mic || p.speaking || p.isThinking) {
      stopListening();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      spokenAccumulatorRef.current = "";
      setLiveSpokenText("");
      setIsSilentCountdown(false);
    } else {
      // AI just stopped speaking: set post-speech cooldown to completely reject speaker tail and room reverb
      aiSpeakingCooldownRef.current = Date.now() + 600;
      const timer = setTimeout(() => {
        if (isMountedRef.current && p.mic && !speakingRef.current && !thinkingRef.current) {
          startListening();
        }
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [p.mic, p.speaking, p.isThinking, startListening, stopListening]);

  const videoRef = (el: HTMLVideoElement | null) => {
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (p.cam && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((s) => {
          stream = s;
          streamRef.current = s;
          setCamErr(false);
          document.querySelectorAll<HTMLVideoElement>("video[data-self]").forEach((v) => {
            v.srcObject = s;
          });
        })
        .catch(() => setCamErr(true));
    }
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [p.cam]);

  const lastAi = p.log.map((m) => m.who).lastIndexOf("ai");
  const lastAiText = lastAi >= 0 ? p.log[lastAi].text : "";

  // Automatically open the code editor whenever a question asks to write code
  useEffect(() => {
    if (!lastAiText) return;
    if (autoOpenedForRef.current === lastAiText) return;

    autoOpenedForRef.current = lastAiText;
    const isCoding = p.questionType === "coding" || isCodingQuestion(lastAiText);

    if (isCoding) {
      wasAutoOpenedRef.current = true;
      const appropriateLang = detectLangFromContext(lastAiText, p.title);
      setLang(appropriateLang);
      setCodeMode(true);
    } else if (wasAutoOpenedRef.current) {
      wasAutoOpenedRef.current = false;
      setCodeMode(false);
    }
  }, [lastAiText, p.questionType, p.title]);

  const currentQuestionView = (compact: boolean) => (
    <div
      className={`${compact ? "flex-1 min-h-0" : "max-h-[340px]"} space-y-3 overflow-y-auto pr-2 [scrollbar-width:none]`}
    >
      <div className="space-y-2">
        <div className="text-xs font-medium text-[#f59e42]">Vitarka AI</div>
        <p
          className={`${compact ? "text-sm" : "text-[16px] md:text-lg"} leading-relaxed text-foreground`}
        >
          {lastAiText || "Connecting to interviewer..."}
          {p.speaking && (
            <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-[#f59e42]" />
          )}
        </p>
      </div>
      <div ref={p.endRef} />
    </div>
  );

  const camera = (
    <div className="relative aspect-video overflow-hidden rounded-xl border bg-card shadow-2xl">
      {p.cam && !camErr ? (
        <video
          data-self
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full -scale-x-100 object-cover"
        />
      ) : (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          {camErr ? "Camera unavailable" : "Camera off"}
        </div>
      )}
      <div className="absolute bottom-3 right-3 flex h-7 items-end gap-[3px] rounded-md bg-background/70 px-1.5 py-1">
        {[6, 10, 8, 14].map((h, k) => (
          <span
            key={k}
            className={`w-[3px] rounded-sm ${p.mic ? "bg-primary" : "bg-muted-foreground"}`}
            style={{ height: p.mic ? h : 4 }}
          />
        ))}
      </div>
    </div>
  );

  const current = code[lang] ?? LANGS[lang].starter;
  const submitCode = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    spokenAccumulatorRef.current = "";
    setLiveSpokenText("");
    setIsSilentCountdown(false);
    p.submit(`\`\`\`${lang}\n${current}\n\`\`\``);
  };

  const handleManualSubmit = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const textToSend = p.draft.trim() || liveSpokenText.trim();
    spokenAccumulatorRef.current = "";
    setLiveSpokenText("");
    setIsSilentCountdown(false);
    p.setDraft("");
    if (textToSend) {
      p.submit(textToSend);
    }
  };

  const userTalking = !p.speaking && !p.isThinking && p.mic && (micLevel > 0.04 || !!liveSpokenText);
  const orb = p.speaking
    ? "bg-[radial-gradient(circle_at_35%_30%,#ffd08a,#f59e42_55%,#b8661c)]"
    : p.isThinking
    ? "bg-[radial-gradient(circle_at_35%_30%,#ffd08a,#f59e42_55%,#b8661c)] animate-pulse"
    : userTalking
    ? "bg-[radial-gradient(circle_at_35%_30%,#ffd08a,#f59e42_55%,#b8661c)]"
    : "bg-[radial-gradient(circle_at_35%_30%,#a9bcff,#6b8cf5_55%,#3a55c4)]";

  if (codeMode) {
    return (
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0b0f17] text-[#e6e8ee]">
        <div className="relative flex h-12 shrink-0 items-center justify-between border-b border-white/5 bg-[#0b0f17] px-3">
          <div className="flex items-center gap-3">
            <Link to="/mock-interviews" className="flex items-center rounded-md bg-white px-2 py-1">
              <img src={YuvroLogo} alt="Yuvro" className="h-5 w-auto" />
            </Link>
            <span className="text-sm font-semibold text-white">{p.title}</span>
          </div>
          <span className="absolute left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#111622] px-2.5 py-1 font-mono text-xs text-white">
            <Clock className="h-3.5 w-3.5" /> {fmt(p.left)}
          </span>
          <span />
        </div>

        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize="38%" minSize="25%" maxSize="55%">
            <div
              className="relative flex h-full flex-col overflow-hidden bg-[#0e1322]"
              style={{
                backgroundImage:
                  "radial-gradient(60% 40% at 0% 100%, rgba(120,60,40,0.22), transparent 70%), radial-gradient(50% 35% at 100% 15%, rgba(60,70,120,0.18), transparent 70%)",
              }}
            >
              <div className="flex items-center justify-between px-3 pt-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8b93a7]">
                  Conversation
                </div>
                {p.cam && (
                  <div className="relative h-14 w-20 overflow-hidden rounded-md border border-white/10 bg-[#070a10]">
                    {!camErr ? (
                      <video
                        data-self
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full -scale-x-100 object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-[9px] text-[#6b7285]">
                        Camera off
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 [scrollbar-width:none]">
                <div className="text-xs font-medium text-[#f59e42]">Vitarka AI</div>
                <p className="mt-1.5 text-[15px] leading-relaxed text-white">
                  {lastAiText}
                  {p.speaking && (
                    <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-[#f59e42]" />
                  )}
                </p>
                <div ref={p.endRef} />
              </div>
              <div className="space-y-2 p-2.5">
                <div
                  className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                    userTalking ? "border-[#f59e42]/30 bg-[#1f150a]" : "border-white/5 bg-[#121827]"
                  }`}
                >
                  <span
                    className={`h-8 w-8 shrink-0 rounded-full transition-transform ${orb}`}
                    style={{
                      transform: userTalking ? `scale(${1 + Math.min(0.25, micLevel)})` : undefined,
                      boxShadow: userTalking ? "0 0 18px rgba(245,158,66,0.5)" : undefined,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">
                      {p.speaking
                        ? "Vitarka AI is speaking"
                        : p.isThinking
                        ? "Vitarka AI is thinking..."
                        : isSilentCountdown
                        ? "Submitting answer..."
                        : userTalking
                        ? "You're speaking"
                        : p.mic
                        ? "Listening to you"
                        : "Mic is off"}
                    </div>
                    <div className="text-xs text-[#8b93a7]">
                      {p.speaking
                        ? "Listen to the full question first"
                        : p.isThinking
                        ? "Formulating the next question based on your response..."
                        : isSilentCountdown
                        ? "Pause detected — auto-submitting in 3 seconds..."
                        : userTalking
                        ? "Go on, Vitarka is listening."
                        : p.mic
                        ? "Take your time. Speak or type your answer."
                        : "Turn on your mic or type your answer."}
                    </div>
                  </div>
                  <div className="flex h-7 items-center gap-[3px]">
                    {Array.from({ length: 22 }).map((_, k) => {
                      const h = p.speaking
                        ? 6 + ((k * 7) % 18)
                        : p.isThinking
                        ? 4 + ((k * 5) % 12)
                        : isSilentCountdown
                        ? 3 + ((k * 3) % 8)
                        : userTalking
                        ? Math.max(
                            3,
                            Math.min(
                              26,
                              micLevel * 90 * (0.5 + Math.abs(Math.sin(k * 1.7 + Date.now() / 120)))
                            )
                          )
                        : 2;
                      return (
                        <span
                          key={k}
                          className={`w-[2px] rounded-full ${
                            p.speaking
                              ? "animate-pulse bg-[#f59e42]"
                              : p.isThinking
                              ? "animate-pulse bg-[#f59e42]/80"
                              : isSilentCountdown
                              ? "animate-pulse bg-[#6b8cf5]/80"
                              : userTalking
                              ? "bg-[#f59e42]"
                              : "bg-[#6b8cf5]/70"
                          }`}
                          style={{ height: h, animationDelay: `${k * 60}ms` }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={p.draft}
                    onChange={(e) => p.setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleManualSubmit();
                    }}
                    placeholder={p.isThinking ? "Vitarka AI is thinking..." : "Type your answer, or just speak"}
                    disabled={p.isThinking}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-white/5 bg-[#121827] px-3 text-sm text-white outline-none placeholder:text-[#6b7285] focus:border-[#6b8cf5]/50 disabled:opacity-50"
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={(!p.draft.trim() && !liveSpokenText.trim()) || p.isThinking}
                    className="flex items-center gap-1.5 h-9 rounded-lg bg-[#6b8cf5] px-3.5 text-sm font-semibold text-white hover:bg-[#7d9bff] disabled:opacity-50"
                  >
                    {p.isThinking ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle className="bg-white/5" />
          <ResizablePanel defaultSize="62%" minSize="40%">
            <div className="flex h-full min-w-0 flex-col bg-[#1e1e1e]">
              <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-black/40 bg-[#181818] px-3">
                <span className="font-mono text-sm text-[#a0a6b4]">
                  Solution.{LANGS[lang].ext}
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value as keyof typeof LANGS)}
                    className="h-8 w-[100px] rounded-md border border-white/10 bg-[#1e1e1e] px-2 text-sm text-white outline-none"
                  >
                    {Object.entries(LANGS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={submitCode}
                    disabled={p.isThinking}
                    className="flex items-center gap-1.5 h-8 rounded-md bg-[#6b8cf5] px-3 text-sm font-semibold text-white hover:bg-[#7d9bff] disabled:opacity-50"
                  >
                    {p.isThinking ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      "Submit code"
                    )}
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <CodeMirror
                  value={current}
                  onChange={(v) => setCode((c) => ({ ...c, [lang]: v }))}
                  theme={vscodeDark}
                  extensions={[LANGS[lang].ext_fn()]}
                  height="100%"
                  className="h-full text-sm [&_.cm-editor]:h-full [&_.cm-gutters]:!bg-[#1e1e1e] [&_.cm-gutters]:!border-0"
                  basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        <div className="flex h-[74px] shrink-0 items-center justify-center bg-[#0b0f17]">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0e1320] p-1.5">
            {[
              {
                l: p.mic ? "Mute" : "Unmute",
                f: () => p.setMic(!p.mic),
                i: p.mic ? (
                  <Mic className="h-4 w-4" />
                ) : (
                  <MicOff className="h-4 w-4 text-[#e06c6c]" />
                ),
              },
              {
                l: p.cam ? "Turn camera off" : "Turn camera on",
                f: () => p.setCam(!p.cam),
                i: p.cam ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <VideoOff className="h-4 w-4 text-[#e06c6c]" />
                ),
              },
              {
                l: "Type answer",
                f: () => setChat(!chat),
                i: <MessageSquare className="h-4 w-4" />,
              },
              {
                l: "Close code editor",
                f: () => {
                  wasAutoOpenedRef.current = false;
                  setCodeMode(false);
                },
                i: <Code2 className="h-4 w-4" />,
              },
            ].map((b) => (
              <button
                key={b.l}
                onClick={b.f}
                aria-label={b.l}
                title={b.l}
                className="grid h-10 w-11 place-items-center rounded-lg border border-white/5 bg-[#1a2030] text-white hover:bg-[#232a3d]"
              >
                {b.i}
              </button>
            ))}
            <button
              onClick={p.onEnd}
              aria-label="End interview"
              className="grid h-10 w-11 place-items-center rounded-lg bg-[#c94b4b] text-white hover:bg-[#d65a5a]"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dark">
      <div
        className="fixed inset-0 flex flex-col overflow-hidden bg-[#0e1322] text-foreground"
        style={{
          backgroundImage:
            "radial-gradient(60% 40% at 0% 100%, rgba(120,60,40,0.22), transparent 70%), radial-gradient(50% 35% at 100% 15%, rgba(60,70,120,0.18), transparent 70%)",
        }}
      >
        <div className="relative z-10 flex h-12 shrink-0 items-center justify-between border-b border-white/5 px-3">
          <div className="flex items-center gap-3">
            <Link to="/mock-interviews" className="flex items-center rounded-md bg-white px-2 py-1">
              <img src={YuvroLogo} alt="Yuvro" className="h-5 w-auto" />
            </Link>
            <span className="text-sm font-semibold text-white">{p.title}</span>
          </div>
          <span className="absolute left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#111622] px-2.5 py-1 font-mono text-xs text-white">
            <Clock className="h-3.5 w-3.5" /> {fmt(p.left)}
          </span>
          <span />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 pb-40 lg:grid-cols-2">
          {currentQuestionView(false)}
          {camera}
        </div>
        <VoiceTerrain speaking={p.speaking} listening={p.mic && !p.speaking} />

        {/* answer box */}
        {chat && (
          <div className="absolute bottom-24 left-1/2 z-20 w-[min(560px,92vw)] -translate-x-1/2 space-y-2">
            <div
              className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                userTalking ? "border-[#f59e42]/30 bg-[#1f150a]" : "border-white/5 bg-[#121827]"
              }`}
            >
              <span
                className={`h-8 w-8 shrink-0 rounded-full transition-transform ${orb}`}
                style={{
                  transform: userTalking ? `scale(${1 + Math.min(0.25, micLevel)})` : undefined,
                  boxShadow: userTalking ? "0 0 18px rgba(245,158,66,0.5)" : undefined,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">
                  {p.speaking
                    ? "Vitarka AI is speaking"
                    : p.isThinking
                    ? "Vitarka AI is thinking..."
                    : isSilentCountdown
                    ? "Submitting answer..."
                    : userTalking
                    ? "You're speaking"
                    : p.mic
                    ? "Listening to you"
                    : "Mic is off"}
                </div>
                <div className="text-xs text-[#8b93a7]">
                  {p.speaking
                    ? "Listen to the full question first"
                    : p.isThinking
                    ? "Formulating the next question based on your response..."
                    : isSilentCountdown
                    ? "Pause detected — auto-submitting in 3 seconds..."
                    : userTalking
                    ? "Go on, Vitarka is listening."
                    : p.mic
                    ? "Take your time. Speak or type your answer."
                    : "Turn on your mic or type your answer."}
                </div>
              </div>
              <div className="flex h-7 items-center gap-[3px]">
                {Array.from({ length: 22 }).map((_, k) => {
                  const h = p.speaking
                    ? 6 + ((k * 7) % 18)
                    : p.isThinking
                    ? 4 + ((k * 5) % 12)
                    : isSilentCountdown
                    ? 3 + ((k * 3) % 8)
                    : userTalking
                    ? Math.max(
                        3,
                        Math.min(
                          26,
                          micLevel * 90 * (0.5 + Math.abs(Math.sin(k * 1.7 + Date.now() / 120)))
                        )
                      )
                    : 2;
                  return (
                    <span
                      key={k}
                      className={`w-[2px] rounded-full ${
                        p.speaking
                          ? "animate-pulse bg-[#f59e42]"
                          : p.isThinking
                          ? "animate-pulse bg-[#f59e42]/80"
                          : isSilentCountdown
                          ? "animate-pulse bg-[#6b8cf5]/80"
                          : userTalking
                          ? "bg-[#f59e42]"
                          : "bg-[#6b8cf5]/70"
                      }`}
                      style={{ height: h, animationDelay: `${k * 60}ms` }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex gap-1.5">
              <input
                autoFocus
                value={p.draft}
                onChange={(e) => p.setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleManualSubmit();
                }}
                placeholder={p.isThinking ? "Vitarka AI is thinking..." : "Type your answer, or just speak"}
                disabled={p.isThinking}
                className="h-9 min-w-0 flex-1 rounded-lg border border-white/5 bg-[#121827] px-3 text-sm text-white outline-none placeholder:text-[#6b7285] focus:border-[#6b8cf5]/50 disabled:opacity-50"
              />
              <button
                onClick={handleManualSubmit}
                disabled={(!p.draft.trim() && !liveSpokenText.trim()) || p.isThinking}
                className="flex items-center gap-1.5 h-9 rounded-lg bg-[#6b8cf5] px-3.5 text-sm font-semibold text-white hover:bg-[#7d9bff] disabled:opacity-50"
              >
                {p.isThinking ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Sending...</span>
                  </>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </div>
        )}

        {/* controls */}
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-card/90 p-1.5 backdrop-blur">
          <CtrlBtn
            label={p.mic ? "Mute" : "Unmute"}
            on={p.mic}
            onClick={() => p.setMic(!p.mic)}
          >
            {p.mic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </CtrlBtn>
          <CtrlBtn
            label={p.cam ? "Turn camera off" : "Turn camera on"}
            on={p.cam}
            onClick={() => p.setCam(!p.cam)}
          >
            {p.cam ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </CtrlBtn>
          <CtrlBtn label="Type answer" on={!chat} onClick={() => setChat(!chat)}>
            <MessageSquare className="h-4 w-4" />
          </CtrlBtn>
          <CtrlBtn
            label={codeMode ? "Close code editor" : "Open code editor"}
            on={!codeMode}
            onClick={() => {
              wasAutoOpenedRef.current = false;
              setCodeMode(!codeMode);
            }}
          >
            <Code2 className="h-4 w-4" />
          </CtrlBtn>
          <button
            onClick={p.onEnd}
            aria-label="End interview"
            className="grid h-9 w-11 place-items-center rounded-lg bg-destructive text-destructive-foreground hover:opacity-90"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CtrlBtn({
  on,
  onClick,
  label,
  children,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-9 w-11 place-items-center rounded-lg border transition-colors ${
        on ? "bg-muted/40 text-foreground hover:bg-muted" : "bg-muted text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Shell({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/mock-interviews" className="rounded-md p-1.5 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="text-sm font-semibold">Vitarka · {title}</div>
        </div>
        {right}
      </header>
      {children}
    </div>
  );
}

/** Perspective dot-matrix landscape that ripples with the conversation. */
function VoiceTerrain({ speaking, listening }: { speaking: boolean; listening: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ speaking, listening, energy: 0 });
  state.current.speaking = speaking;
  state.current.listening = listening;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(c);
    const primary = "#F97316"; // Yuvro brand orange
    const fg = css.getPropertyValue("--foreground").trim() || "white";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const d = window.devicePixelRatio || 1;
      c.width = c.offsetWidth * d;
      c.height = c.offsetHeight * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const ROWS = 22,
      COLS = 72;
    const draw = () => {
      const s = state.current;
      const target = s.speaking ? 1 : s.listening ? 0.35 : 0.12;
      s.energy += (target - s.energy) * 0.05;
      const w = c.offsetWidth,
        h = c.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      for (let r = 0; r < ROWS; r++) {
        const z = r / (ROWS - 1);
        const persp = 0.25 + z * 0.75;
        const baseY = h * 0.25 + Math.pow(z, 1.6) * h * 0.75;
        for (let i = 0; i < COLS; i++) {
          const u = i / (COLS - 1) - 0.5;
          const x = w / 2 + u * w * (0.7 + persp * 1.1);
          const d = Math.hypot(u * 2.2, (1 - z) * 1.4);
          const wave = Math.sin(d * 9 - t * 3) * Math.exp(-d * 1.6);
          const lift =
            wave * 46 * s.energy * persp + Math.sin(u * 6 + t * 0.6 + r) * 3 * persp;
          const glow = Math.max(0, wave) * s.energy;
          ctx.globalAlpha = (0.08 + z * 0.35) * (0.6 + glow * 1.4);
          ctx.fillStyle = glow > 0.25 ? primary : fg;
          ctx.beginPath();
          ctx.arc(x, baseY - lift, 0.6 + persp * 1.3 + glow * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      t += reduce ? 0 : 0.016;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] w-full"
      style={{
        maskImage: "linear-gradient(to top, black 55%, transparent)",
        WebkitMaskImage: "linear-gradient(to top, black 55%, transparent)",
      }}
    />
  );
}

const FUEL = [
  "One mock interview teaches more than three hours of passive videos.",
  "Your future production bug is practising on you today. Be kind to it.",
  "Interviewers remember clear thinking more than perfect answers.",
  'Saying "I\'m not sure, but here\'s how I\'d find out" is a great answer.',
];

const FEATURES = [
  { icon: "🎙️", title: "AI voice interviewer", body: "It speaks, listens and reacts to your voice in real time.", cls: "bg-[#86E0A8]" },
  { icon: "🎯", title: "Feels like the real thing", body: "Same pace and pressure as a live panel, minus the sweaty palms.", cls: "bg-[#E87565]" },
  { icon: "🔁", title: "Smart follow-ups", body: 'Say "HashMap" and it will ask what happens on a collision.', cls: "bg-[#7B9CF2]" },
  { icon: "📝", title: "Detailed feedback", body: "Get a clear report: what you nailed and exactly what to improve.", cls: "bg-[#F0D45C]" },
];

function Lobby({
  iv,
  mic,
  cam,
  setMic,
  setCam,
  onStart,
  isStarting,
  availableInterviews = 3,
  onOpenBuyModal,
}: {
  iv: { name: string; icon?: string; minutes?: number };
  mic: boolean;
  cam: boolean;
  setMic: (v: boolean) => void;
  setCam: (v: boolean) => void;
  onStart: () => void;
  isStarting?: boolean;
  availableInterviews?: number;
  onOpenBuyModal?: () => void;
}) {
  const words = (iv.name || "Technical Interview")
    .replace(/\s+(Engineer|Developer|Interview|\(Automatic\))$/gi, "")
    .split(" ");
  const [first, rest] = [words[0] || "Technical", words.slice(1).join(" ")];
  const [fuel, setFuel] = useState(0);
  const vid = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setFuel((f) => (f + 1) % FUEL.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!cam) {
      setLive(false);
      return;
    }
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then((s) => {
        stream = s;
        if (vid.current) {
          vid.current.srcObject = s;
          setLive(true);
        }
      })
      .catch(() => setLive(false));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [cam]);

  const isBlocked = availableInterviews <= 0;

  return (
    <div className="min-h-screen bg-white font-sans text-[#1B1340]">
      <div className="flex items-center justify-between px-6 pt-4">
        <Link
          to="/mock-interviews"
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-[#1B1340]/70 hover:bg-[#1B1340]/5"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#1B1340]/70">
            Available:{" "}
            <strong className={availableInterviews > 0 ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"}>
              {availableInterviews}
            </strong>
          </span>
          <button
            type="button"
            onClick={onOpenBuyModal}
            className="rounded-md border border-[#1B1340]/20 px-2 py-0.5 text-xs font-medium text-[#1B1340] hover:bg-[#1B1340]/5"
          >
            Buy
          </button>
        </div>
      </div>
      <div className="mx-auto mt-2 max-w-6xl px-6">
        <div className="flex items-center justify-center gap-4 rounded-2xl px-5 py-3 text-center">
          <span className="text-4xl leading-none">😊</span>
          <div>
            <div className="text-lg font-semibold md:text-xl">
              All the best, buddy! You've got this.
            </div>
            <div className="text-sm text-[#1B1340]/60">
              Take a breath — this is practice, so every answer helps you grow.
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 grid max-w-6xl gap-8 px-6 pb-12 md:grid-cols-2">
        <div>
          <h1 className="font-bold leading-[1] tracking-tight">
            <span className="inline-block -rotate-2 rounded-lg bg-[#F97316] px-3 pb-1 text-4xl text-white md:text-5xl">
              {first}
            </span>
            {rest && <span className="mt-1 block text-4xl md:text-5xl">{rest}</span>}
          </h1>
          <p className="mt-4 max-w-md text-sm text-[#1B1340]/70">
            Your first round is a friendly chat, not an exam. Talk it out like you would with a teammate.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`rounded-xl p-4 text-white transition-transform hover:-translate-y-0.5 ${f.cls}`}
              >
                <div className="text-base font-semibold">{f.title}</div>
                <div className="mt-1 text-sm leading-snug text-white/85">{f.body}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-[#1B1340]/25 bg-white p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[#1B1340]/60">
              Learner fuel
            </div>
            <div key={fuel} className="mt-1 text-sm font-medium">
              {FUEL[fuel]}
            </div>
          </div>
        </div>
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#1B1340]">
            <video
              ref={vid}
              autoPlay
              muted
              playsInline
              className={`h-full w-full scale-x-[-1] object-cover ${live ? "" : "hidden"}`}
            />
            {!live && (
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="text-5xl">🙂</div>
                  <p className="mt-4 text-sm text-white/80">
                    {cam ? "Waiting for camera…" : "Camera is off. Turn it on to practise eye contact."}
                  </p>
                </div>
              </div>
            )}
            <span className="absolute bottom-4 left-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
              You
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <LobbyToggle
              on={mic}
              onClick={() => setMic(!mic)}
              icon={mic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              label={mic ? "Mic on" : "Mic off"}
            />
            <LobbyToggle
              on={cam}
              onClick={() => setCam(!cam)}
              icon={cam ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              label={cam ? "Camera on" : "Camera off"}
            />
            {isBlocked ? (
              <button
                onClick={onOpenBuyModal}
                className="ml-auto flex items-center justify-center gap-2 rounded-md bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 min-w-[140px]"
              >
                Buy interviews to start
              </button>
            ) : (
              <button
                onClick={onStart}
                disabled={isStarting}
                className="ml-auto flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
              >
                {isStarting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  "Start interview"
                )}
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-[#1B1340]/60">
            Tip: sit near a window, look at the lens, and smile once before you start. Speak or type — pause any time.
          </p>
        </div>
      </div>
    </div>
  );
}

function LobbyToggle({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-[#1B1340]/20 bg-white px-4 py-1.5 text-sm font-medium hover:bg-[#1B1340]/5"
    >
      {icon} {label}{" "}
      <span
        className={`h-2 w-2 rounded-full ${on ? "bg-emerald-500" : "bg-[#E87565]"}`}
      />
    </button>
  );
}

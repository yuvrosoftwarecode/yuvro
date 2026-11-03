import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, memo } from "react";
import {
  Database,
  Plus,
  Search,
  Trash2,
  Pencil,
  Eye,
  Check,
  Clock,
  Code2,
  X,
  FileQuestion,
  BookOpen,
  FlaskConical,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Link,
  Boxes,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { questionBankService } from "@/services/questionBankService";
import { fetchCourses, fetchQuestions, fetchQuestionDetails } from "@/lib/recruiter";
import { ycodeApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreateQuestionForm } from "@/components/evaluation/CreateQuestionForm";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import { GithubAppIntegration } from "@/components/recruiter/GithubAppIntegration";

export const Route = createFileRoute("/recruiter/questions")({
  head: () => ({
    meta: [{ title: "Question Bank — Yuvro Recruiter" }, { name: "robots", content: "noindex" }],
  }),
  component: RecruiterQuestionBankPage,
});

const DOMAINS = [
  { value: "ERP", label: "Enterprise Resource Planning (ERP)" },
  { value: "PAYMENT", label: "Payments & Fintech" },
  { value: "SUPPLY_CHAIN", label: "Supply Chain & Logistics" },
  { value: "FINANCE", label: "Banking & Financial Services" },
  { value: "RETAIL", label: "E-Commerce & Retail" },
  { value: "HEALTHCARE", label: "Healthcare & Life Sciences" },
  { value: "INSURANCE", label: "Insurance & Underwriting" },
  { value: "EDTECH", label: "EdTech & Learning" },
  { value: "BACKEND", label: "Backend Engineering" },
  { value: "FRONTEND", label: "Frontend Engineering" },
  { value: "FULLSTACK", label: "Fullstack Engineering" },
  { value: "DEVOPS", label: "DevOps & Cloud" },
  { value: "DATA", label: "Data Engineering" },
  { value: "SECURITY", label: "Cybersecurity" },
  { value: "OTHER", label: "Other / General" },
];
const LAB_TYPES = ["DATABASE", "BACKEND", "FRONTEND", "FULL_STACK", "QUALITY_ASSURANCE", "DEVOPS"];
const SCENARIOS = [
  "DEBUGGING",
  "BUG_FIXING",
  "FEATURE_DEVELOPMENT",
  "API_OPTIMIZATION",
  "PERFORMANCE_OPTIMIZATION",
  "SECURITY",
  "ARCHITECTURE",
  "PERFORMANCE",
  "TESTING",
  "PRODUCTION_INCIDENT",
];

const DEFAULT_LAB_FORM = {
  title: "",
  description: "",
  difficulty: "EASY",
  domain: "ERP",
  type: "BACKEND",
  experience: "FRESHER",
  scenario: "FEATURE_DEVELOPMENT",
  marks: 10,
  duration_minutes: 30,
  git_repo_starter_url: "",
  git_repo_starter_branch: "main",
  repo_source_type: "ADMIN_SYSTEM",
  github_app_installation: null,
  github_repo_id: "",
  startup_command: "",
  test_command: "",
  connection_url: "",
  allow_task_selection: true,
  programming_languages: [],
  databases: [],
  backend_frameworks: [],
  frontend_frameworks: [],
  tasks: [],
};

const BUILTIN_SYSTEM_DESIGN_CHALLENGES = [
  {
    id: "builtin-sd-url-shortener",
    title: "Design a High-Throughput URL Shortener (TinyURL)",
    description:
      "Architect a resilient, distributed URL shortening service capable of creating billions of aliases and serving high-frequency redirects with sub-millisecond response times, low latency CDN caching, and custom analytics tracking.",
    company: "Uber",
    scenario_type: "Distributed Storage & Routing",
    difficulty: "MEDIUM",
    domain: "BACKEND",
    duration_minutes: 45,
    marks: 30,
    system_slug: "systemdesign-url-shortener",
    constraints: [
      "100M new URLs shortened per month (10:1 read-to-write ratio)",
      "URL redirects must respond in < 15ms at p99",
      "99.999% availability for resolution endpoints",
      "Shortened keys must be 7-8 base62 alphanumeric characters",
      "Protect against malicious redirects and rate-limit abusive IP ranges",
    ],
    tasks: [
      {
        id: "t1",
        title: "HLD Architecture Canvas",
        description:
          "Design client DNS, API Gateway, Key Generation Service (KGS), cache layer, and database cluster with replication.",
        marks: 10,
      },
      {
        id: "t2",
        title: "Database Schema (DBML)",
        description:
          "Define relational or NoSQL schema for URLs, users, expiration timestamps, and analytics telemetry.",
        marks: 10,
      },
      {
        id: "t3",
        title: "REST API Contracts",
        description:
          "Specify endpoints for POST /api/v1/shorten, GET /{shortCode}, and GET /api/v1/analytics.",
        marks: 5,
      },
      {
        id: "t4",
        title: "Sequence Diagrams",
        description:
          "Model the end-to-end request lifecycle for URL creation and cached redirection lookup.",
        marks: 5,
      },
    ],
  },
  {
    id: "builtin-sd-ecommerce",
    title: "Design a Flash-Sale E-Commerce Platform",
    description:
      "Design an ultra-high concurrency e-commerce checkout and inventory system capable of handling surges of 100,000+ orders per second during limited-time flash sales without double bookings or overselling.",
    company: "Amazon",
    scenario_type: "High Concurrency & Transactions",
    difficulty: "HARD",
    domain: "RETAIL",
    duration_minutes: 60,
    marks: 40,
    system_slug: "systemdesign",
    constraints: [
      "Peak throughput: 100k requests/sec during drop window",
      "Zero overselling: strict inventory reservation guarantees",
      "Eventual consistency for order fulfillment and payment webhook processing",
      "Cart reservations expire after 10 minutes if unpurchased",
    ],
    tasks: [
      {
        id: "t1",
        title: "HLD Architecture Canvas",
        description:
          "Draw CDN, Edge Rate Limiter, Inventory Cache with Redis Lua scripts, Kafka Order Queue, and Payment Orchestrator.",
        marks: 10,
      },
      {
        id: "t2",
        title: "Database Schema (DBML)",
        description:
          "Model inventory balances, lock states, order records, and idempotent transaction logs.",
        marks: 10,
      },
      {
        id: "t3",
        title: "REST API Contracts",
        description:
          "Define endpoints for product catalog, inventory lock, and order placement.",
        marks: 10,
      },
      {
        id: "t4",
        title: "Sequence Diagrams",
        description:
          "Trace the distributed lock acquisition, payment confirmation, and async inventory reconciliation flow.",
        marks: 10,
      },
    ],
  },
  {
    id: "builtin-sd-bookmyshow",
    title: "Design a Real-Time Ticket & Seat Booking Engine",
    description:
      "Build a distributed movie and concert seat reservation platform with interactive venue seat maps, pessimistic seat locking, and live websocket seat availability updates.",
    company: "BookMyShow",
    scenario_type: "Real-time Event Streaming & Locking",
    difficulty: "HARD",
    domain: "FINANCE",
    duration_minutes: 60,
    marks: 40,
    system_slug: "systemdesign-bookmysystem",
    constraints: [
      "Concurrent seat locking by tens of thousands of users per showtime",
      "Seat held for max 8 minutes during checkout before releasing back to the pool",
      "Real-time websocket broadcast of seat occupancy status to active viewers",
      "Multi-region data isolation per theatre/cinema chain",
    ],
    tasks: [
      {
        id: "t1",
        title: "HLD Architecture Canvas",
        description:
          "Diagram load balancers, WebSocket gateways, Distributed Locking Service, and Show Booking Workers.",
        marks: 10,
      },
      {
        id: "t2",
        title: "Database Schema (DBML)",
        description:
          "Design theatres, screens, shows, seats, seat reservations, and booking tickets tables.",
        marks: 10,
      },
      {
        id: "t3",
        title: "REST API Contracts",
        description:
          "Create contracts for seat map queries, seat reservation requests, and payment settlement.",
        marks: 10,
      },
      {
        id: "t4",
        title: "Sequence Diagrams",
        description:
          "Illustrate concurrent seat conflict handling and automatic release on timeout.",
        marks: 10,
      },
    ],
  },
];

const DEFAULT_SYSTEM_DESIGN_FORM = {
  title: "",
  description: "",
  difficulty: "MEDIUM",
  marks: 30,
  duration_minutes: 45,
  scenario_type: "Distributed System",
  system_slug: "systemdesign-url-shortener",
  domain: "BACKEND",
  company: "",
  constraints: "",
  tasks: [
    { id: "t1", title: "HLD Architecture Canvas", description: "Design client DNS, API Gateway, caching layer, and database cluster with replication.", marks: 10 },
    { id: "t2", title: "Database Schema (DBML)", description: "Define relational or NoSQL schema with keys, relationships, and telemetry tables.", marks: 10 },
    { id: "t3", title: "REST API Contracts", description: "Specify endpoints, request schemas, status codes, and error responses.", marks: 5 },
    { id: "t4", title: "Sequence Diagrams", description: "Model the end-to-end request lifecycle and async operations.", marks: 5 },
  ],
};

const PROGRAMMING_LANGUAGES = ["C", "C++", "Python", "Java", "SQL", "Bash", "JavaScript", "TypeScript"];
const DATABASES = ["SQLite", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch"];
const BACKEND_FRAMEWORKS = ["Django", "Django REST Framework", "FastAPI", "Flask", "Spring Boot", "NodeJS", "Express", "NestJS"];
const FRONTEND_FRAMEWORKS = ["React", "NextJS", "Vue", "Angular", "Svelte"];

function MultiSelectPills({ label, options, value, onChange }: { label: string, options: string[], value: string[], onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    let mappedVal = opt.toUpperCase().replace(/ /g, "_").replace(/\+/g, "P");
    if (opt === "C++") mappedVal = "C++";
    
    if (value.includes(mappedVal)) {
      onChange(value.filter(v => v !== mappedVal));
    } else {
      onChange([...value, mappedVal]);
    }
  };
  return (
    <div className="col-span-full">
      <label className="text-[11px] uppercase tracking-widest text-neutral-500">{label}</label>
      <div className="flex flex-wrap gap-2 mt-1.5">
        {options.map(opt => {
          let mappedVal = opt.toUpperCase().replace(/ /g, "_").replace(/\+/g, "P");
          if (opt === "C++") mappedVal = "C++";
          const selected = value.includes(mappedVal);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium border transition ${
                selected 
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                  : "border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-white/20"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const getSolutionString = (solution: any) => {
  if (!solution) return "";
  if (typeof solution === "string") return solution;
  if (typeof solution === "object") {
    if (solution["query.sql"]) return solution["query.sql"];
    if (solution["query.js"]) return solution["query.js"];
    if (solution["code"]) return solution["code"];
    if (solution["solution"]) return solution["solution"];
    if (Object.keys(solution).length > 0) return JSON.stringify(solution, null, 2);
  }
  return "";
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-neutral-300">
      {children}
    </span>
  );
}

function LabPreview({ l }: { l: any }) {
  if (!l) return null;
  return (
    <div className="rounded-md bg-neutral-50 dark:bg-white/5 p-4 text-[13px] text-neutral-700 dark:text-neutral-300 space-y-4">
      {l.description ? (
        <div className="whitespace-pre-wrap">{l.description}</div>
      ) : l.text ? (
        <div className="whitespace-pre-wrap">{l.text}</div>
      ) : (
        <div className="italic text-neutral-500">No detailed description available.</div>
      )}

      <div className="grid grid-cols-2 gap-4 text-[12px]">
        <div>
          <div className="text-neutral-500 dark:text-neutral-400">Domain</div>
          <div className="text-neutral-900 dark:text-white font-medium">{l.domain || "N/A"}</div>
        </div>
        <div>
          <div className="text-neutral-500 dark:text-neutral-400">Scenario</div>
          <div className="text-neutral-900 dark:text-white font-medium">{l.scenario || "N/A"}</div>
        </div>
        <div>
          <div className="text-neutral-500 dark:text-neutral-400">Difficulty</div>
          <div className="text-neutral-900 dark:text-white font-medium">{l.difficulty || "N/A"}</div>
        </div>
        <div>
          <div className="text-neutral-500 dark:text-neutral-400">Duration</div>
          <div className="text-neutral-900 dark:text-white font-medium">{l.duration_minutes || 0} min</div>
        </div>
        <div>
          <div className="text-neutral-500 dark:text-neutral-400">Marks</div>
          <div className="text-neutral-900 dark:text-white font-medium">{l.marks || 0}</div>
        </div>
      </div>

      {Array.isArray(l.programming_languages) && l.programming_languages.length > 0 && (
        <div>
          <div className="text-neutral-500 dark:text-neutral-400 mb-1 text-[12px]">Programming Languages</div>
          <div className="flex flex-wrap gap-1">
            {l.programming_languages.map((x: string) => (
              <Chip key={x}>{x}</Chip>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(l.databases) && l.databases.length > 0 && (
        <div>
          <div className="text-neutral-500 dark:text-neutral-400 mb-1 text-[12px]">Databases</div>
          <div className="flex flex-wrap gap-1">
            {l.databases.map((x: string) => (
              <Chip key={x}>{x}</Chip>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(l.tasks) && l.tasks.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-white/5 pt-4">
          <div className="text-neutral-900 dark:text-neutral-200 font-semibold mb-3">Tasks in this Lab</div>
          <div className="space-y-2">
            {l.tasks.map((t: any, i: number) => (
              <div key={t.id || i} className="rounded bg-white dark:bg-black/20 p-3 text-[12px] border border-neutral-200 dark:border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {i + 1}. {t.title}
                  </span>
                  {t.difficulty && (
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{t.difficulty}</span>
                  )}
                </div>
                {t.description && (
                  <div className="text-neutral-600 dark:text-neutral-400 mt-1 whitespace-pre-wrap">
                    {t.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionPreview({ q }: { q: any }) {
  if (!q) return null;

  const questionContent = q.content || q.description || (q.text && q.text !== q.title ? q.text : "");
  
  const options = Array.isArray(q.mcq_options) && q.mcq_options.length > 0
    ? q.mcq_options
    : Array.isArray(q.options) && q.options.length > 0
    ? q.options
    : [];

  const testCases = Array.isArray(q.test_cases_basic) && q.test_cases_basic.length > 0
    ? q.test_cases_basic
    : Array.isArray(q.test_cases) && q.test_cases.length > 0
    ? q.test_cases
    : Array.isArray(q.examples) && q.examples.length > 0
    ? q.examples
    : [];

  const rawHints = (Array.isArray(q.hints) && q.hints.length > 0)
    ? q.hints
    : [];

  const hints = rawHints.map((h: any) => {
    if (typeof h === "string") return h.trim();
    return h?.text || h?.hint || String(h);
  }).filter(Boolean);

  let solutions: any[] = [];
  if (Array.isArray(q.solutions) && q.solutions.length > 0) {
    solutions = q.solutions;
  } else if (q.solution_explanation && typeof q.solution_explanation === "string") {
    let explanationText = q.solution_explanation;
    // Just in case there is some lingering JSON string, try to parse or keep as text
    if (explanationText.trim().startsWith("{")) {
       try {
         const p = JSON.parse(explanationText);
         if (p.solutions && p.solutions.length > 0) {
           solutions = p.solutions;
           explanationText = "";
         } else if (p.hints && p.hints.length > 0) {
           // We could extract hints here but for simplicity we ignore it, or just use as text
           explanationText = "";
         }
       } catch {}
    }
    if (explanationText) {
      solutions = [{ title: "Solution Explanation", code: explanationText, language: "text" }];
    }
  } else if (typeof q.solution === "string" && q.solution.trim()) {
    solutions = [{ title: "Solution", code: q.solution, language: "text" }];
  } else if (typeof q.solution === "object" && q.solution && Object.keys(q.solution).length > 0) {
    solutions = [{ title: "Solution", code: JSON.stringify(q.solution, null, 2), language: "json" }];
  }

  return (
    <div className="rounded-md bg-neutral-50 dark:bg-white/5 p-4 text-[13px] text-neutral-700 dark:text-neutral-300 space-y-4">
      {questionContent && (
        <div className="whitespace-pre-wrap font-medium text-neutral-900 dark:text-white">{questionContent}</div>
      )}

      {options.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold text-neutral-600 dark:text-neutral-400">Options:</div>
          {options.map((opt: any, i: number) => (
            <div key={i} className="flex items-start gap-3 rounded bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/5 px-3 py-2">
              <div className="mt-0.5">
                {opt?.is_correct ? (
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-neutral-300 dark:border-white/20" />
                )}
              </div>
              <div className="flex-1 text-neutral-900 dark:text-white">{opt?.text || (typeof opt === "string" ? opt : "")}</div>
            </div>
          ))}
        </div>
      )}

      {testCases.length > 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-neutral-600 dark:text-neutral-400">Examples:</div>
          {testCases.map((ex: any, i: number) => (
            <div key={i} className="rounded bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/5 p-3 font-mono text-[11px]">
              <div className="text-neutral-900 dark:text-neutral-300">
                <span className="text-neutral-500">Input:</span> {ex?.input !== undefined ? String(ex.input) : ""}
              </div>
              <div className="mt-2 text-neutral-900 dark:text-neutral-300">
                <span className="text-neutral-500">Output:</span> {ex?.expected_output !== undefined ? String(ex.expected_output) : ex?.output !== undefined ? String(ex.output) : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {hints.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold text-neutral-600 dark:text-neutral-400">Hints:</div>
          <ul className="list-inside list-disc space-y-1">
            {hints.map((hint: string, i: number) => (
              <li key={i} className="text-neutral-700 dark:text-neutral-300">
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {solutions.length > 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-neutral-600 dark:text-neutral-400">Solutions:</div>
          {solutions.map((sol: any, i: number) => (
            <div key={i} className="rounded border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900 dark:text-white">
                  {sol?.title || "Solution"}
                </span>
                {sol?.language && (
                  <span className="rounded bg-neutral-100 dark:bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-neutral-600 dark:text-neutral-400">
                    {sol.language}
                  </span>
                )}
                {sol?.is_primary && (
                  <span className="rounded bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[10px] uppercase text-emerald-700 dark:text-emerald-400">
                    Primary
                  </span>
                )}
              </div>
              {sol?.code && (
                <pre className="overflow-x-auto rounded bg-neutral-100 dark:bg-black/50 p-2 font-mono text-[11px] text-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-white/5">
                  <code>{sol.code}</code>
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SystemDesignPreview({ q }: { q: any }) {
  if (!q) return null;
  return (
    <div className="rounded-md bg-neutral-50 dark:bg-white/5 p-4 text-[13px] text-neutral-700 dark:text-neutral-300 space-y-4">
      {q.description || q.problem ? (
        <div className="whitespace-pre-wrap leading-relaxed">{q.description || q.problem}</div>
      ) : (
        <div className="italic text-neutral-500">No detailed description available.</div>
      )}

      <div className="grid grid-cols-2 gap-4 text-[12px]">
        <div>
          <div className="text-neutral-500 dark:text-neutral-400">Category</div>
          <div className="text-neutral-900 dark:text-white font-medium">System Design</div>
        </div>
        <div>
          <div className="text-neutral-500 dark:text-neutral-400">Difficulty</div>
          <div className="text-neutral-900 dark:text-white font-medium">{q.difficulty || "MEDIUM"}</div>
        </div>
        <div>
          <div className="text-neutral-500 dark:text-neutral-400">Duration</div>
          <div className="text-neutral-900 dark:text-white font-medium">{q.duration_minutes || 45} min</div>
        </div>
        <div>
          <div className="text-neutral-500 dark:text-neutral-400">Marks</div>
          <div className="text-neutral-900 dark:text-white font-medium">{q.marks || 100}</div>
        </div>
      </div>

      {Array.isArray(q.tasks) && q.tasks.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-white/5 pt-4">
          <div className="text-neutral-900 dark:text-neutral-200 font-semibold mb-3">Deliverables & Objectives</div>
          <div className="space-y-2">
            {q.tasks.map((t: any, i: number) => (
              <div key={t.id || i} className="rounded bg-white dark:bg-black/20 p-3 text-[12px] border border-neutral-200 dark:border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {i + 1}. {t.title || t.name}
                  </span>
                  {t.marks && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{t.marks} pts</span>
                  )}
                </div>
                {t.description && (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{t.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(q.constraints) && q.constraints.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-white/5 pt-4">
          <div className="text-neutral-900 dark:text-neutral-200 font-semibold mb-2">Constraints & Scale Targets</div>
          <ul className="space-y-1 text-[12px] text-neutral-600 dark:text-neutral-400 list-disc pl-4">
            {q.constraints.map((c: string, i: number) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const QuestionCardItem = memo(function QuestionCardItem({
  q,
  loadingEditId,
  onPreview,
  onEdit,
  onDelete,
}: {
  q: any;
  loadingEditId: string | null;
  onPreview: (q: any) => void;
  onEdit: (q: any) => void;
  onDelete: (q: any) => void;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-gradient-to-b dark:from-white/[0.03] dark:to-white/[0.01] p-5 hover:border-neutral-300 dark:hover:border-white/15 shadow-sm dark:shadow-none flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {q.questionCategory === "LAB" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-300">
                <FlaskConical className="h-3 w-3" /> Engineering Lab
              </span>
            ) : q.questionCategory === "SYSTEM_DESIGN" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                <Boxes className="h-3 w-3" /> System Design
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-300">
                <BookOpen className="h-3 w-3" /> Knowledge Assessment
              </span>
            )}
          </div>
          <DifficultyPill difficulty={q.difficulty} />
        </div>
        <h3 className="mt-3 text-[16px] font-medium text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {q.title}
        </h3>
        {q.description && (
          <p className="mt-1 text-[12px] text-neutral-600 dark:text-neutral-400 line-clamp-2">{q.description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-300">
            {q.domain || "GENERAL"}
          </span>
          {q.scenario && (
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-300">
              {q.scenario?.replace(/_/g, " ")}
            </span>
          )}
          {q.scenario_type && (
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
              {q.scenario_type}
            </span>
          )}
          {q.company && (
            <span className="rounded-full border border-neutral-300 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
              {q.company}
            </span>
          )}
          {(q.format || q.type) && q.questionCategory === "KNOWLEDGE" && (
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
              {(q.format || q.type)?.replace(/_/g, " ").toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-neutral-200 dark:border-white/5 pt-3">
        <div className="flex items-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400">
          <span>
            Marks <strong className="text-neutral-900 dark:text-white font-mono">{q.marks || 0}</strong>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {q.duration_minutes || 0}m
          </span>
          {(q.questionCategory === "LAB" || q.questionCategory === "SYSTEM_DESIGN") && (
            <span>
              {q.questionCategory === "SYSTEM_DESIGN" ? "Deliverables" : "Tasks"}{" "}
              <strong className="text-neutral-900 dark:text-white font-mono">{q.tasks?.length || 0}</strong>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPreview(q)}
            className="rounded-md p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
            title="Preview question"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            disabled={loadingEditId === q.id}
            onClick={() => onEdit(q)}
            className="rounded-md p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white disabled:opacity-50"
            title="Edit question"
          >
            {loadingEditId === q.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => onDelete(q)}
            className="rounded-md p-1.5 text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400"
            title="Delete question"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});

function RecruiterQuestionBankPage() {
  const queryClient = useQueryClient();

  // Tab State: "ALL" | "LAB" | "KNOWLEDGE" | "SYSTEM_DESIGN"
  const [activeTab, setActiveTab] = useState<"ALL" | "LAB" | "KNOWLEDGE" | "SYSTEM_DESIGN">("ALL");

  // Courses state for Knowledge Assessment Form
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchCourses().then(setCourses).catch(console.error);
  }, []);

  // Fetch Lab Questions
  const { data: labQuestions = [], isLoading: isLoadingLabs } = useQuery({
    queryKey: ["labQuestions"],
    queryFn: () => questionBankService.getLabQuestions(),
  });

  // Fetch Knowledge Questions (Only recruiter created questions from ylabs-backend)
  const { data: knowledgeQuestions = [], isLoading: isLoadingKnowledge } = useQuery({
    queryKey: ["knowledgeQuestions"],
    queryFn: () => questionBankService.getKnowledgeQuestions(),
  });

  // Fetch System Design Questions
  const { data: systemDesignQuestions = [], isLoading: isLoadingSystemDesign } = useQuery({
    queryKey: ["systemDesignQuestions"],
    queryFn: async () => {
      try {
        const data = await questionBankService.getSystemDesignQuestions();
        if (Array.isArray(data) && data.length > 0) {
          const ids = new Set(data.map((d: any) => d.id));
          const nonDupBuiltins = BUILTIN_SYSTEM_DESIGN_CHALLENGES.filter((b) => !ids.has(b.id));
          return [...data, ...nonDupBuiltins];
        }
      } catch (e) {
        console.warn("Failed to fetch system design questions from API, using builtins", e);
      }
      return BUILTIN_SYSTEM_DESIGN_CHALLENGES;
    },
  });

  // Filters state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState("ALL");
  const [selectedScenario, setSelectedScenario] = useState("ALL");
  const [selectedFormat, setSelectedFormat] = useState("ALL");
  const [selectedCourse, setSelectedCourse] = useState("ALL");

  // Client-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedDomain, selectedDifficulty, selectedScenario, selectedFormat, selectedCourse, activeTab]);

  // Modal Visibility States
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);

  // Edit States
  const [editingLabId, setEditingLabId] = useState<string | null>(null);
  const [labFormData, setLabFormData] = useState<any>(DEFAULT_LAB_FORM);
  const [editingKnowledgeQuestion, setEditingKnowledgeQuestion] = useState<any | null>(null);

  // Preview State
  const [previewQuestion, setPreviewQuestion] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleOpenPreview = async (q: any) => {
    setPreviewQuestion(q);
    if (q.questionCategory === "LAB" || q.questionCategory === "SYSTEM_DESIGN") return;

    setLoadingPreview(true);
    try {
      const details = await fetchQuestionDetails(q.id);
      if (details) {
        setPreviewQuestion({ ...q, ...details, questionCategory: q.questionCategory || "KNOWLEDGE" });
      }
    } catch (err) {
      console.error("Error loading question details", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Lab Mutations
  const createLabMutation = useMutation({
    mutationFn: (data: any) => questionBankService.createLabQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      closeLabModal();
      showToast("Engineering Lab Question created successfully");
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to create lab question");
    },
  });

  const updateLabMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => questionBankService.updateLabQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      closeLabModal();
      showToast("Engineering Lab Question updated successfully");
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to update lab question");
    },
  });

  const deleteLabMutation = useMutation({
    mutationFn: (id: string) => questionBankService.deleteLabQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      showToast("Lab Question deleted");
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to delete lab question");
    },
  });

  // Knowledge Assessment Mutations
  const deleteKnowledgeMutation = useMutation({
    mutationFn: (id: string) => questionBankService.deleteKnowledgeQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeQuestions"] });
      showToast("Knowledge Assessment Question deleted");
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to delete question");
    },
  });

  const deleteSystemDesignMutation = useMutation({
    mutationFn: (id: string) => questionBankService.deleteSystemDesignQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemDesignQuestions"] });
      showToast("System Design Question deleted");
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to delete question");
    },
  });

  // System Design Form State & Mutations
  const [isSystemDesignModalOpen, setIsSystemDesignModalOpen] = useState(false);
  const [editingSystemDesignId, setEditingSystemDesignId] = useState<string | null>(null);
  const [systemDesignFormData, setSystemDesignFormData] = useState<any>(DEFAULT_SYSTEM_DESIGN_FORM);

  const createSystemDesignMutation = useMutation({
    mutationFn: (data: any) => questionBankService.createSystemDesignQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemDesignQuestions"] });
      showToast("System Design Challenge created");
      setIsSystemDesignModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to create system design challenge");
    },
  });

  const updateSystemDesignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      questionBankService.updateSystemDesignQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemDesignQuestions"] });
      showToast("System Design Challenge updated");
      setIsSystemDesignModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err?.message || "Failed to update system design challenge");
    },
  });

  const handleSelectSystemDesignType = () => {
    setIsAddTypeModalOpen(false);
    setEditingSystemDesignId(null);
    setSystemDesignFormData(DEFAULT_SYSTEM_DESIGN_FORM);
    setIsSystemDesignModalOpen(true);
  };

  const closeSystemDesignModal = () => {
    setIsSystemDesignModalOpen(false);
    setEditingSystemDesignId(null);
  };

  const openEditSystemDesignModal = (q: any) => {
    setEditingSystemDesignId(q.id);
    setSystemDesignFormData({
      title: q.title || "",
      description: q.description || q.problem || "",
      difficulty: (q.difficulty || "MEDIUM").toUpperCase(),
      marks: q.marks || 30,
      duration_minutes: q.duration_minutes || 45,
      scenario_type: q.scenario_type || "Distributed System",
      system_slug: q.system_slug || "systemdesign-url-shortener",
      domain: q.domain || "BACKEND",
      company: q.company || "",
      constraints: Array.isArray(q.constraints) ? q.constraints.join("\n") : (q.constraints || ""),
      tasks: Array.isArray(q.tasks) && q.tasks.length > 0 ? q.tasks : DEFAULT_SYSTEM_DESIGN_FORM.tasks,
    });
    setIsSystemDesignModalOpen(true);
  };

  const handleSaveSystemDesign = () => {
    const rawConstraints = typeof systemDesignFormData.constraints === "string"
      ? systemDesignFormData.constraints.split("\n").map((s: string) => s.trim()).filter(Boolean)
      : systemDesignFormData.constraints || [];

    const payload = {
      ...systemDesignFormData,
      constraints: rawConstraints,
      tasks: (systemDesignFormData.tasks || []).map((t: any, index: number) => ({
        id: t.id || `t${index + 1}`,
        title: t.title,
        description: t.description || "",
        marks: Number(t.marks) || 10,
      })),
      marks: Number(systemDesignFormData.marks) || 30,
      duration_minutes: Number(systemDesignFormData.duration_minutes) || 45,
    };

    if (editingSystemDesignId) {
      updateSystemDesignMutation.mutate({ id: editingSystemDesignId, data: payload });
    } else {
      createSystemDesignMutation.mutate(payload);
    }
  };

  // Handlers for Add Button
  const handleOpenAddModal = () => {
    setIsAddTypeModalOpen(true);
  };

  const handleSelectLabType = () => {
    setIsAddTypeModalOpen(false);
    setEditingLabId(null);
    setLabFormData(DEFAULT_LAB_FORM);
    setIsLabModalOpen(true);
  };

  const handleSelectKnowledgeType = () => {
    setIsAddTypeModalOpen(false);
    setEditingKnowledgeQuestion(null);
    setIsKnowledgeModalOpen(true);
  };

  const closeLabModal = () => {
    setIsLabModalOpen(false);
    setEditingLabId(null);
  };

  const closeKnowledgeModal = () => {
    setIsKnowledgeModalOpen(false);
    setEditingKnowledgeQuestion(null);
  };

  const openEditLabModal = (q: any) => {
    setEditingLabId(q.id);
    setLabFormData({
      title: q.title || "",
      description: q.description || "",
      domain: q.domain || "OTHER",
      difficulty: q.difficulty || "EASY",
      type: q.type || "BACKEND",
      experience: q.experience || "FRESHER",
      scenario: q.scenario || "FEATURE_DEVELOPMENT",
      marks: q.marks || 10,
      duration_minutes: q.duration_minutes || 30,
      git_repo_starter_url: q.git_repo_starter_url || "",
      git_repo_starter_branch: q.git_repo_starter_branch || "main",
      repo_source_type: q.repo_source_type || "ADMIN_SYSTEM",
      github_app_installation: q.github_app_installation || null,
      github_repo_id: q.github_repo_id || "",
      startup_command: q.startup_command || "",
      test_command: q.test_command || "",
      programming_languages: q.programming_languages || [],
      databases: q.databases || [],
      backend_frameworks: (q.backend_frameworks || []).map((f: string) => f === "DJANGO_REST_FRAMEWOR" ? "DJANGO_REST_FRAMEWORK" : f),
      frontend_frameworks: q.frontend_frameworks || [],
      tasks: (q.tasks || []).map((t: any, i: number) => ({
        ...t,
        id: t.id || `task_${i}`,
        parent_task_id: t.parent_task_id || t.scoring_rules?.parent_task_id || (typeof t.parent_task === "string" ? t.parent_task : t.parent_task?.id) || null,
      })),
    });
    setIsLabModalOpen(true);
  };

  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  const openEditKnowledgeModal = async (q: any) => {
    setLoadingEditId(q.id);
    try {
      const details = await fetchQuestionDetails(q.id);
      setEditingKnowledgeQuestion(details || q);
      setIsKnowledgeModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch knowledge question details for edit:", err);
      setEditingKnowledgeQuestion(q);
      setIsKnowledgeModalOpen(true);
    } finally {
      setLoadingEditId(null);
    }
  };

  // Delete Warning Dialog State
  const [deletingQuestion, setDeletingQuestion] = useState<{
    id: string;
    title: string;
    category: "LAB" | "KNOWLEDGE" | "SYSTEM_DESIGN";
  } | null>(null);

  const handleSaveLab = () => {
    const preparedTasks = (labFormData.tasks || []).map((t: any, index: number) => {
      let solutionObj = t.solution;
      if (typeof t.solution === "string") {
        const trimmed = t.solution.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            solutionObj = JSON.parse(trimmed);
          } catch (e) {
            solutionObj = { code: trimmed };
          }
        } else if (trimmed) {
          const dbs = labFormData.databases || [];
          if (dbs.includes("MONGODB")) {
            solutionObj = { "query.js": trimmed };
          } else if (dbs.includes("MYSQL") || dbs.includes("POSTGRESQL") || dbs.includes("SQLITE")) {
            solutionObj = { "query.sql": trimmed };
          } else {
            solutionObj = { code: trimmed };
          }
        } else {
          solutionObj = {};
        }
      }
      const pId = t.parent_task_id || (typeof t.parent_task === "string" ? t.parent_task : t.parent_task?.id) || null;
      return {
        ...t,
        order_index: index,
        solution: solutionObj,
        parent_task_id: pId,
        parent_task: pId,
        scoring_rules: {
          ...(typeof t.scoring_rules === "object" ? t.scoring_rules : {}),
          parent_task_id: pId,
        },
      };
    });

    const sanitizedBackendFrameworks = (labFormData.backend_frameworks || []).map((f: string) =>
      f === "DJANGO_REST_FRAMEWOR" ? "DJANGO_REST_FRAMEWORK" : f
    );

    const payload = {
      ...labFormData,
      backend_frameworks: sanitizedBackendFrameworks,
      tasks: preparedTasks,
      domain: labFormData.domain || "OTHER",
    };

    if (editingLabId) {
      updateLabMutation.mutate({ id: editingLabId, data: payload });
    } else {
      createLabMutation.mutate(payload);
    }
  };

  const updateLabTask = (index: number, field: string, value: any) => {
    const newTasks = [...labFormData.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setLabFormData({ ...labFormData, tasks: newTasks });
  };

  const removeLabTask = (index: number) => {
    const newTasks = labFormData.tasks.filter((_: any, i: number) => i !== index);
    setLabFormData({ ...labFormData, tasks: newTasks });
  };

  const addLabTask = () => {
    setLabFormData({
      ...labFormData,
      tasks: [
        ...labFormData.tasks,
        {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: "",
          description: "",
          solution: "",
          difficulty: "EASY",
          marks: 10,
          duration_minutes: 15,
          order_index: labFormData.tasks.length,
          parent_task_id: null,
        },
      ],
    });
  };

  // Combine questions with type tags
  const combinedQuestions = useMemo(() => {
    const labs = labQuestions.map((q: any) => ({
      ...q,
      questionCategory: "LAB",
    }));

    const knowledge = knowledgeQuestions.map((q: any) => ({
      ...q,
      title: q.title || q.content || q.text || "Untitled Question",
      description: q.content || q.text || "",
      difficulty: (q.difficulty || "EASY").toUpperCase(),
      domain: q.course_name || q.domain || "GENERAL",
      marks: q.marks || 1,
      duration_minutes: q.duration || q.duration_minutes || 5,
      questionCategory: "KNOWLEDGE",
    }));

    const sysDesign = systemDesignQuestions.map((q: any) => ({
      ...q,
      title: q.title || "Untitled System Design Challenge",
      description: q.description || q.problem || "",
      difficulty: (q.difficulty || "MEDIUM").toUpperCase(),
      domain: q.domain || "BACKEND",
      marks: q.marks || 30,
      duration_minutes: q.duration_minutes || 45,
      questionCategory: "SYSTEM_DESIGN",
      format: "SYSTEM_DESIGN",
      type: "SYSTEM_DESIGN",
    }));

    if (activeTab === "LAB") return labs;
    if (activeTab === "KNOWLEDGE") return knowledge;
    if (activeTab === "SYSTEM_DESIGN") return sysDesign;
    return [...labs, ...knowledge, ...sysDesign];
  }, [labQuestions, knowledgeQuestions, systemDesignQuestions, activeTab]);

  const handleTabChange = (tab: "ALL" | "LAB" | "KNOWLEDGE" | "SYSTEM_DESIGN") => {
    setActiveTab(tab);
    setSelectedDomain("ALL");
    setSelectedDifficulty("ALL");
    setSelectedScenario("ALL");
    setSelectedFormat("ALL");
    setSelectedCourse("ALL");
  };

  // Filter questions
  const filteredQuestions = useMemo(() => {
    return combinedQuestions.filter((q: any) => {
      // 1. Search text filter
      const matchesSearch =
        !debouncedSearch ||
        q.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        q.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        q.domain?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        q.course_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        q.scenario_type?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        q.company?.toLowerCase().includes(debouncedSearch.toLowerCase());

      // 2. Difficulty filter (applies to all)
      const matchesDifficulty =
        selectedDifficulty === "ALL" ||
        (q.difficulty || "").toUpperCase() === selectedDifficulty.toUpperCase();

      // 3. Domain filter (applies to LAB questions; ignored for KNOWLEDGE when on KNOWLEDGE tab or SYSTEM_DESIGN)
      const matchesDomain =
        selectedDomain === "ALL" ||
        (q.questionCategory === "KNOWLEDGE" && activeTab === "KNOWLEDGE") ||
        (q.questionCategory === "SYSTEM_DESIGN" && activeTab === "SYSTEM_DESIGN") ||
        q.domain === selectedDomain;

      // 4. Scenario filter (applies to LAB questions; ignored for KNOWLEDGE and SYSTEM_DESIGN)
      const matchesScenario =
        selectedScenario === "ALL" ||
        q.questionCategory === "KNOWLEDGE" ||
        q.questionCategory === "SYSTEM_DESIGN" ||
        q.scenario === selectedScenario;

      // 5. Format filter
      let matchesFormat = true;
      if (selectedFormat !== "ALL") {
        if (selectedFormat === "LAB") {
          matchesFormat = q.questionCategory === "LAB";
        } else if (selectedFormat === "SYSTEM_DESIGN") {
          matchesFormat = q.questionCategory === "SYSTEM_DESIGN" || q.format === "SYSTEM_DESIGN" || q.type === "SYSTEM_DESIGN";
        } else if (q.questionCategory === "LAB" || q.questionCategory === "SYSTEM_DESIGN") {
          matchesFormat = false;
        } else {
          const qFmt = (q.format || "").toUpperCase();
          const qType = (q.type || "").toUpperCase();
          const target = selectedFormat.toUpperCase();

          if (target === "MCQ") {
            matchesFormat = qFmt === "MCQ" || qType === "MCQ_SINGLE" || qType === "MCQ" || qType === "SINGLE";
          } else if (target === "MULTIPLE_SELECT") {
            matchesFormat =
              qFmt === "MULTIPLE SELECT" ||
              qFmt === "MULTIPLE_SELECT" ||
              qType === "MCQ_MULTIPLE" ||
              qType === "MULTIPLE";
          } else if (target === "DESCRIPTION") {
            matchesFormat =
              qFmt === "DESCRIPTION" ||
              qFmt === "DESCRIPTIVE" ||
              qType === "DESCRIPTIVE" ||
              qType === "SHORT_ANSWER";
          } else if (target === "CODING") {
            matchesFormat = qFmt === "CODING" || qType === "CODING";
          } else {
            matchesFormat = qFmt === target || qType === target;
          }
        }
      }

      // 6. Course filter (applies to KNOWLEDGE questions; ignored for LAB and SYSTEM_DESIGN)
      const matchesCourse =
        selectedCourse === "ALL" ||
        q.questionCategory === "LAB" ||
        q.questionCategory === "SYSTEM_DESIGN" ||
        q.course === selectedCourse ||
        q.course_id === selectedCourse ||
        q.course_name === selectedCourse ||
        (courses.find((c) => c.id === selectedCourse)?.name &&
          q.domain === courses.find((c) => c.id === selectedCourse)?.name);

      return (
        matchesSearch &&
        matchesDifficulty &&
        matchesDomain &&
        matchesScenario &&
        matchesFormat &&
        matchesCourse
      );
    });
  }, [
    combinedQuestions,
    debouncedSearch,
    selectedDomain,
    selectedDifficulty,
    selectedScenario,
    selectedFormat,
    selectedCourse,
    courses,
    activeTab,
  ]);

  const isLoading = isLoadingLabs || isLoadingKnowledge || isLoadingSystemDesign;
  const labCount = labQuestions.length;
  const knowledgeCount = knowledgeQuestions.length;
  const systemDesignCount = systemDesignQuestions.length;
  const totalCount = labCount + knowledgeCount + systemDesignCount;

  const totalFilteredCount = filteredQuestions.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  return (
    <div className="p-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-white">Question Bank</h1>
          <p className="mt-1 text-[13px] text-neutral-600 dark:text-neutral-400">
            Browse, create, and manage engineering lab, system design & knowledge assessment questions for candidate evaluations.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-[13px] font-medium text-black transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Add Question
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div 
          onClick={() => handleTabChange("ALL")}
          className={`relative overflow-hidden rounded-2xl border p-5 cursor-pointer ${activeTab === "ALL" ? "border-emerald-500/50 bg-emerald-500/5 dark:border-emerald-400/50 dark:bg-white/[0.04]" : "border-neutral-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-neutral-300 dark:hover:border-white/15"}`}
        >
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 text-black">
            <Database className="h-4 w-4" />
          </div>
          <div className="mt-4 text-[11px] uppercase tracking-widest text-neutral-500">
            Total Questions
          </div>
          <div className="mt-1 text-[32px] font-semibold tracking-tight text-neutral-900 dark:text-white">
            {isLoading ? "..." : totalCount}
          </div>
        </div>

        <div 
          onClick={() => handleTabChange("LAB")}
          className={`relative overflow-hidden rounded-2xl border p-5 cursor-pointer ${activeTab === "LAB" ? "border-cyan-500/50 bg-cyan-500/5 dark:border-cyan-400/50 dark:bg-white/[0.04]" : "border-neutral-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-neutral-300 dark:hover:border-white/15"}`}
        >
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-500 dark:text-cyan-300">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div className="mt-4 text-[11px] uppercase tracking-widest text-neutral-500">
            Engineering Labs
          </div>
          <div className="mt-1 text-[32px] font-semibold tracking-tight text-cyan-600 dark:text-cyan-400">
            {isLoadingLabs ? "..." : labCount}
          </div>
        </div>

        <div 
          onClick={() => handleTabChange("SYSTEM_DESIGN")}
          className={`relative overflow-hidden rounded-2xl border p-5 cursor-pointer ${activeTab === "SYSTEM_DESIGN" ? "border-amber-500/50 bg-amber-500/5 dark:border-amber-400/50 dark:bg-white/[0.04]" : "border-neutral-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-neutral-300 dark:hover:border-white/15"}`}
        >
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Boxes className="h-4 w-4" />
          </div>
          <div className="mt-4 text-[11px] uppercase tracking-widest text-neutral-500">
            System Design
          </div>
          <div className="mt-1 text-[32px] font-semibold tracking-tight text-amber-600 dark:text-amber-400">
            {isLoadingSystemDesign ? "..." : systemDesignCount}
          </div>
        </div>

        <div 
          onClick={() => handleTabChange("KNOWLEDGE")}
          className={`relative overflow-hidden rounded-2xl border p-5 cursor-pointer ${activeTab === "KNOWLEDGE" ? "border-purple-500/50 bg-purple-500/5 dark:border-purple-400/50 dark:bg-white/[0.04]" : "border-neutral-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-neutral-300 dark:hover:border-white/15"}`}
        >
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-300">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="mt-4 text-[11px] uppercase tracking-widest text-neutral-500">
            Knowledge Assessment
          </div>
          <div className="mt-1 text-[32px] font-semibold tracking-tight text-purple-600 dark:text-purple-400">
            {isLoadingKnowledge ? "..." : knowledgeCount}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-neutral-200 dark:border-white/5 pb-3">
        <button
          onClick={() => handleTabChange("ALL")}
          className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors duration-150 ${activeTab === "ALL" ? "bg-neutral-200 dark:bg-white/10 text-neutral-900 dark:text-white font-semibold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5"}`}
        >
          All Questions ({totalCount})
        </button>
        <button
          onClick={() => handleTabChange("LAB")}
          className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors duration-150 ${activeTab === "LAB" ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5"}`}
        >
          Engineering Labs ({labCount})
        </button>
        <button
          onClick={() => handleTabChange("SYSTEM_DESIGN")}
          className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors duration-150 ${activeTab === "SYSTEM_DESIGN" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5"}`}
        >
          System Design ({systemDesignCount})
        </button>
        <button
          onClick={() => handleTabChange("KNOWLEDGE")}
          className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors duration-150 ${activeTab === "KNOWLEDGE" ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5"}`}
        >
          Knowledge Assessment ({knowledgeCount})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mt-6 rounded-2xl border border-neutral-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-4 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Bar */}
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/40 px-3 py-2 text-[13px] text-neutral-900 dark:text-white flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-neutral-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === "LAB"
                  ? "Search by title, description, or domain..."
                  : activeTab === "SYSTEM_DESIGN"
                  ? "Search by title, description, or scenario..."
                  : activeTab === "KNOWLEDGE"
                  ? "Search by title, description, or course..."
                  : "Search questions by title, description, or domain..."
              }
              className="bg-transparent outline-none flex-1 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Domain Filter (For LAB or SYSTEM_DESIGN or ALL) */}
          {(activeTab === "LAB" || activeTab === "SYSTEM_DESIGN" || activeTab === "ALL") && (
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/40 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-300 outline-none focus:border-emerald-500/60"
            >
              <option value="ALL" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">All Domains</option>
              {DOMAINS.map((d) => (
                <option key={d.value} value={d.value} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                  {d.label}
                </option>
              ))}
            </select>
          )}

          {/* Format Filter (For KNOWLEDGE or SYSTEM_DESIGN or ALL) */}
          {(activeTab === "KNOWLEDGE" || activeTab === "SYSTEM_DESIGN" || activeTab === "ALL") && (
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/40 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-300 outline-none focus:border-emerald-500/60"
            >
              <option value="ALL" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">All Formats</option>
              {activeTab === "ALL" && (
                <option value="LAB" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Engineering Lab</option>
              )}
              {(activeTab === "ALL" || activeTab === "SYSTEM_DESIGN") && (
                <option value="SYSTEM_DESIGN" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">System Design</option>
              )}
              {(activeTab === "ALL" || activeTab === "KNOWLEDGE") && (
                <>
                  <option value="MCQ" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">MCQ</option>
                  <option value="MULTIPLE_SELECT" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Multiple Select</option>
                  <option value="DESCRIPTION" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Description</option>
                  <option value="CODING" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Coding</option>
                </>
              )}
            </select>
          )}

          {/* Difficulty Filter (Common across all tabs) */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/40 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-300 outline-none focus:border-emerald-500/60"
          >
            <option value="ALL" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">All Difficulties</option>
            <option value="EASY" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Easy</option>
            <option value="MEDIUM" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Medium</option>
            <option value="HARD" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Hard</option>
          </select>

          {/* Course Filter (For KNOWLEDGE or ALL) */}
          {(activeTab === "KNOWLEDGE" || activeTab === "ALL") && (
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/40 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-300 outline-none focus:border-emerald-500/60"
            >
              <option value="ALL" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Scenario Filter (For LAB) */}
          {activeTab === "LAB" && (
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/40 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-300 outline-none focus:border-emerald-500/60"
            >
              <option value="ALL" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">All Scenarios</option>
              {SCENARIOS.map((s) => (
                <option key={s} value={s} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <LoadingSkeleton type="cards" count={6} className="mt-8" />
      ) : filteredQuestions.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-neutral-200 dark:border-white/10 p-16 text-center bg-white dark:bg-transparent shadow-sm dark:shadow-none">
          <FileQuestion className="mx-auto h-8 w-8 text-neutral-400 dark:text-neutral-500 mb-3" />
          <div className="text-[15px] font-medium text-neutral-900 dark:text-white">No questions found</div>
          <div className="mt-1 text-[12px] text-neutral-500">
            {search || selectedDomain !== "ALL" || selectedDifficulty !== "ALL"
              ? "Try adjusting your search filters."
              : "Start by adding your first assessment question."}
          </div>
          <button
            onClick={handleOpenAddModal}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-neutral-100 dark:bg-white/10 px-4 py-2 text-[12px] font-medium text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/15 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Question
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
            {paginatedQuestions.map((q: any) => (
              <QuestionCardItem
                key={`${q.questionCategory}-${q.id}`}
                q={q}
                loadingEditId={loadingEditId}
                onPreview={handleOpenPreview}
                onEdit={(item) => {
                  if (item.questionCategory === "LAB") {
                    openEditLabModal(item);
                  } else if (item.questionCategory === "SYSTEM_DESIGN") {
                    openEditSystemDesignModal(item);
                  } else {
                    openEditKnowledgeModal(item);
                  }
                }}
                onDelete={(item) => {
                  setDeletingQuestion({
                    id: item.id,
                    title: item.title,
                    category: item.questionCategory,
                  });
                }}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalFilteredCount > 0 && (
            <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row border-t border-neutral-200 dark:border-white/5 pt-6">
              <div className="text-[13px] text-neutral-500 dark:text-neutral-400">
                Showing{" "}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {Math.min((currentPage - 1) * pageSize + 1, totalFilteredCount)}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {Math.min(currentPage * pageSize, totalFilteredCount)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {totalFilteredCount}
                </span>{" "}
                questions
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-[12px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true;
                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    );
                  })
                  .map((page, index, array) => {
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;
                    return (
                      <div key={page} className="flex items-center gap-1.5">
                        {showEllipsis && (
                          <span className="px-1 text-[12px] text-neutral-400">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 rounded-lg text-[12px] font-medium transition ${
                            currentPage === page
                              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold"
                              : "border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10"
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    );
                  })}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-[12px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 1. SELECTION MODAL: "What kind of question?" */}
      <Dialog open={isAddTypeModalOpen} onOpenChange={setIsAddTypeModalOpen}>
        <DialogContent className="sm:max-w-[540px] w-full bg-white dark:bg-neutral-950 border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white p-6 shadow-xl dark:shadow-none rounded-2xl">
          <DialogHeader className="p-0 text-left">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
              ADD QUESTION
            </div>
            <DialogTitle className="text-[18px] font-semibold text-neutral-900 dark:text-white mt-1">
              What kind of question?
            </DialogTitle>
          </DialogHeader>

          <div className="mt-5 grid gap-2.5">
            {/* Option 1: Engineering Labs */}
            <button
              onClick={handleSelectLabType}
              className="group flex items-center gap-4 rounded-xl border border-neutral-100 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02] p-4 text-left transition hover:border-neutral-200 dark:hover:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/[0.04] w-full"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 text-white dark:text-black shrink-0">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-neutral-900 dark:text-white">
                  Engineering Labs
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Real workspaces with terminal, editor and tasks.
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 dark:text-neutral-600 transition group-hover:text-neutral-900 dark:group-hover:text-white shrink-0" />
            </button>

            {/* Option 2: System Design Challenge */}
            <button
              onClick={handleSelectSystemDesignType}
              className="group flex items-center gap-4 rounded-xl border border-neutral-100 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02] p-4 text-left transition hover:border-neutral-200 dark:hover:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/[0.04] w-full"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 text-white dark:text-black shrink-0">
                <Boxes className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-neutral-900 dark:text-white">
                  System Design Challenge
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  High-level architecture, DBML, REST API & sequence flows.
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 dark:text-neutral-600 transition group-hover:text-neutral-900 dark:group-hover:text-white shrink-0" />
            </button>

            {/* Option 3: Knowledge Assessment */}
            <button
              onClick={handleSelectKnowledgeType}
              className="group flex items-center gap-4 rounded-xl border border-neutral-100 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02] p-4 text-left transition hover:border-neutral-200 dark:hover:border-white/15 hover:bg-neutral-100 dark:hover:bg-white/[0.04] w-full"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-violet-400 to-fuchsia-400 text-white dark:text-black shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-neutral-900 dark:text-white">
                  Knowledge Assessment
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  MCQ, multi-select and scenario questions.
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 dark:text-neutral-600 transition group-hover:text-neutral-900 dark:group-hover:text-white shrink-0" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. ENGINEERING LAB QUESTION FORM MODAL */}
      <Dialog open={isLabModalOpen} onOpenChange={setIsLabModalOpen}>
        <DialogContent className="sm:max-w-[780px] w-full bg-white dark:bg-[#121215] border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 border-b border-neutral-200 dark:border-white/5">
            <DialogTitle className="text-[18px] font-semibold text-neutral-900 dark:text-white">
              {editingLabId ? "Edit Engineering Lab Question" : "New Engineering Lab Question"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 hide-scrollbar">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-neutral-500">Title</label>
              <input
                value={labFormData.title}
                onChange={(e) => setLabFormData({ ...labFormData, title: e.target.value })}
                placeholder="e.g. Build a High-Throughput Order Queue"
                className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest text-neutral-500">Description</label>
              <textarea
                rows={3}
                value={labFormData.description}
                onChange={(e) => setLabFormData({ ...labFormData, description: e.target.value })}
                placeholder="Problem overview, background, and expectations..."
                className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Domain / Industry</label>
                <select
                  value={labFormData.domain || "OTHER"}
                  onChange={(e) => setLabFormData({ ...labFormData, domain: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                >
                  {DOMAINS.map((d) => (
                    <option key={d.value} value={d.value} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Difficulty</label>
                <select
                  value={labFormData.difficulty}
                  onChange={(e) => setLabFormData({ ...labFormData, difficulty: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                >
                  <option value="EASY" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Easy</option>
                  <option value="MEDIUM" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Medium</option>
                  <option value="HARD" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Hard</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Lab Role / Type</label>
                <select
                  value={labFormData.type}
                  onChange={(e) => setLabFormData({ ...labFormData, type: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                >
                  {LAB_TYPES.map((d) => (
                    <option key={d} value={d} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      {d.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Experience</label>
                <select
                  value={labFormData.experience}
                  onChange={(e) => setLabFormData({ ...labFormData, experience: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                >
                  <option value="FRESHER" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Fresher</option>
                  <option value="MID_LEVEL" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Mid Level</option>
                  <option value="SENIOR" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Senior</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Scenario</label>
                <select
                  value={labFormData.scenario}
                  onChange={(e) => setLabFormData({ ...labFormData, scenario: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                >
                  {SCENARIOS.map((s) => (
                    <option key={s} value={s} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Marks</label>
                <input
                  type="number"
                  value={labFormData.marks}
                  onChange={(e) => setLabFormData({ ...labFormData, marks: parseInt(e.target.value) || 0 })}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Duration (minutes)</label>
                <input
                  type="number"
                  value={labFormData.duration_minutes}
                  onChange={(e) =>
                    setLabFormData({ ...labFormData, duration_minutes: parseInt(e.target.value) || 0 })
                  }
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/20 p-3">
              <input
                type="checkbox"
                id="allow_task_selection"
                checked={labFormData.allow_task_selection !== false}
                onChange={(e) => setLabFormData({ ...labFormData, allow_task_selection: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="allow_task_selection" className="text-[12px] text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                <span className="font-medium text-neutral-900 dark:text-white">Allow Task Selection:</span> Enable recruiters to select specific tasks from this question when building evaluations.
              </label>
            </div>

            {/* GitHub App Repository Selection */}
            <GithubAppIntegration
              value={{
                github_repo_id: labFormData.github_repo_id,
                git_repo_starter_url: labFormData.git_repo_starter_url,
                repo_source_type: labFormData.repo_source_type,
                github_app_installation: labFormData.github_app_installation,
              }}
              onChange={(val: any) => {
                setLabFormData({
                  ...labFormData,
                  ...val,
                });
              }}
              onBranchChange={(branch: string) => {
                setLabFormData((prev: any) => ({
                  ...prev,
                  git_repo_starter_branch: branch,
                }));
              }}
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Starter Repository URL
                </label>
                <input
                  value={labFormData.git_repo_starter_url}
                  onChange={(e) =>
                    setLabFormData({
                      ...labFormData,
                      git_repo_starter_url: e.target.value,
                      repo_source_type: labFormData.github_repo_id ? labFormData.repo_source_type : "ADMIN_SYSTEM",
                    })
                  }
                  placeholder="https://github.com/..."
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Branch</label>
                <input
                  value={labFormData.git_repo_starter_branch}
                  onChange={(e) => setLabFormData({ ...labFormData, git_repo_starter_branch: e.target.value })}
                  placeholder="main"
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Startup Command</label>
                <input
                  value={labFormData.startup_command}
                  onChange={(e) => setLabFormData({ ...labFormData, startup_command: e.target.value })}
                  placeholder="npm start or python main.py"
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Test Command</label>
                <input
                  value={labFormData.test_command || ""}
                  onChange={(e) => setLabFormData({ ...labFormData, test_command: e.target.value })}
                  placeholder="npm test or pytest"
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-emerald-500/60"
                />
              </div>
            </div>

            <MultiSelectPills
              label="Programming Languages"
              options={PROGRAMMING_LANGUAGES as any}
              value={labFormData.programming_languages || []}
              onChange={(v) => setLabFormData({ ...labFormData, programming_languages: v })}
            />

            <MultiSelectPills
              label="Databases"
              options={DATABASES as any}
              value={labFormData.databases || []}
              onChange={(v) => setLabFormData({ ...labFormData, databases: v })}
            />

            {labFormData.databases?.some((d: string) => ["MySQL", "PostgreSQL", "MongoDB", "MYSQL", "POSTGRESQL", "MONGODB"].includes(d)) && (
              <div className="grid gap-2 border p-3 rounded-md bg-muted/20">
                <label className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  <Database className="h-4 w-4 text-primary" />
                  Evaluation Database Connection URL (e.g. Aiven MySQL)
                </label>
                <input
                  type="text"
                  placeholder="mysql://avnadmin:password@mysql-xyz.aivencloud.com:24128/defaultdb"
                  value={labFormData.connection_url || ""}
                  onChange={(e) => setLabFormData({ ...labFormData, connection_url: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Candidates will automatically execute queries against this database without needing credentials.
                </p>
              </div>
            )}

            <MultiSelectPills
              label="Backend Frameworks"
              options={BACKEND_FRAMEWORKS}
              value={labFormData.backend_frameworks || []}
              onChange={(v) => setLabFormData({ ...labFormData, backend_frameworks: v })}
            />

            <MultiSelectPills
              label="Frontend Frameworks"
              options={FRONTEND_FRAMEWORKS}
              value={labFormData.frontend_frameworks || []}
              onChange={(v) => setLabFormData({ ...labFormData, frontend_frameworks: v })}
            />

            {/* Dynamic Tasks Section */}
            <div className="border-t border-neutral-200 dark:border-white/5 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-medium text-neutral-900 dark:text-white">Tasks / Sub-questions</span>
                <button
                  type="button"
                  onClick={addLabTask}
                  className="inline-flex items-center gap-1 text-[11px] rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-2.5 py-1 text-neutral-800 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/10 transition"
                >
                  <Plus className="h-3 w-3" /> Add Task
                </button>
              </div>

              <div className="space-y-3">
                {labFormData.tasks.map((task: any, index: number) => (
                  <div key={index} className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-4 relative">
                    <button
                      type="button"
                      onClick={() => removeLabTask(index)}
                      className="absolute top-3 right-3 text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 transition"
                      title="Remove task"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="space-y-3 pr-6">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                          Task Title
                        </label>
                        <input
                          value={task.title}
                          onChange={(e) => updateLabTask(index, "title", e.target.value)}
                          placeholder="e.g. Implement GET /api/orders endpoint"
                          className="mt-1 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-1.5 text-[12px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-emerald-500/60"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={task.description}
                          onChange={(e) => updateLabTask(index, "description", e.target.value)}
                          placeholder="Input parameters, constraints, and requirements..."
                          className="mt-1 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-1.5 text-[12px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-emerald-500/60"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                          Reference Solution / Query
                        </label>
                        <textarea
                          rows={2}
                          value={getSolutionString(task.solution)}
                          onChange={(e) => updateLabTask(index, "solution", e.target.value)}
                          placeholder="Reference solution code or SQL query..."
                          className="mt-1 w-full font-mono rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-1.5 text-[11px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-emerald-500/60"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                            Difficulty
                          </label>
                          <select
                            value={task.difficulty}
                            onChange={(e) => updateLabTask(index, "difficulty", e.target.value)}
                            className="mt-1 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/40 px-2 py-1 text-[12px] text-neutral-900 dark:text-neutral-200 outline-none"
                          >
                            <option value="EASY" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Easy</option>
                            <option value="MEDIUM" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Medium</option>
                            <option value="HARD" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Hard</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-neutral-500">Marks</label>
                          <input
                            type="number"
                            value={task.marks}
                            onChange={(e) => updateLabTask(index, "marks", parseInt(e.target.value) || 0)}
                            className="mt-1 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/40 px-2 py-1 text-[12px] text-neutral-900 dark:text-neutral-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-neutral-500">
                            Duration (min)
                          </label>
                          <input
                            type="number"
                            value={task.duration_minutes}
                            onChange={(e) =>
                              updateLabTask(index, "duration_minutes", parseInt(e.target.value) || 0)
                            }
                            className="mt-1 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/40 px-2 py-1 text-[12px] text-neutral-900 dark:text-neutral-200 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500 flex items-center gap-1">
                          <Link className="h-3 w-3" /> Linked Task / Dependency
                        </label>
                        <select
                          value={task.parent_task_id || task.parent_task || ""}
                          onChange={(e) => updateLabTask(index, "parent_task_id", e.target.value || null)}
                          className="mt-1 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-black/40 px-2 py-1.5 text-[12px] text-neutral-900 dark:text-neutral-200 outline-none focus:border-emerald-500/60"
                        >
                          <option value="" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">None (Independent Task)</option>
                          {labFormData.tasks.map((otherTask: any, otherIdx: number) => {
                            if (otherIdx === index) return null;
                            const otherId = otherTask.id || `task_idx_${otherIdx}`;
                            return (
                              <option key={otherId} value={otherId} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                                Task {otherIdx + 1}: {otherTask.title || `Task ${otherIdx + 1}`}
                              </option>
                            );
                          })}
                        </select>
                        <p className="mt-0.5 text-[10px] text-neutral-500">
                          Selecting this task when creating an evaluation will automatically select the linked task.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {labFormData.tasks.length === 0 && (
                  <p className="text-[12px] text-neutral-500 text-center py-3">No tasks added yet.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-black/20 flex items-center justify-end gap-3">
            <button
              onClick={closeLabModal}
              className="rounded-lg border border-neutral-200 dark:border-white/10 px-4 py-2 text-[13px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveLab}
              disabled={createLabMutation.isPending || updateLabMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {createLabMutation.isPending || updateLabMutation.isPending ? "Saving..." : "Save Lab Question"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SYSTEM DESIGN QUESTION FORM MODAL */}
      <Dialog open={isSystemDesignModalOpen} onOpenChange={setIsSystemDesignModalOpen}>
        <DialogContent className="sm:max-w-[780px] w-full bg-white dark:bg-[#121215] border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
          <DialogHeader className="p-6 border-b border-neutral-200 dark:border-white/5">
            <DialogTitle className="text-[18px] font-semibold text-neutral-900 dark:text-white">
              {editingSystemDesignId ? "Edit System Design Challenge" : "New System Design Challenge"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 hide-scrollbar">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-neutral-500">Title</label>
              <input
                value={systemDesignFormData.title}
                onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, title: e.target.value })}
                placeholder="e.g. Design a High-Throughput URL Shortener (TinyURL)"
                className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-amber-500/60"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest text-neutral-500">Description / Problem Statement</label>
              <textarea
                rows={3}
                value={systemDesignFormData.description}
                onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, description: e.target.value })}
                placeholder="Architect an end-to-end distributed system capable of handling high loads..."
                className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-amber-500/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Scenario Type</label>
                <input
                  value={systemDesignFormData.scenario_type}
                  onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, scenario_type: e.target.value })}
                  placeholder="e.g. Distributed Storage, High Concurrency"
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Difficulty</label>
                <select
                  value={systemDesignFormData.difficulty}
                  onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, difficulty: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-amber-500/60"
                >
                  <option value="EASY" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Easy</option>
                  <option value="MEDIUM" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Medium</option>
                  <option value="HARD" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Marks</label>
                <input
                  type="number"
                  value={systemDesignFormData.marks}
                  onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, marks: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-amber-500/60 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">Duration (Minutes)</label>
                <input
                  type="number"
                  value={systemDesignFormData.duration_minutes}
                  onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, duration_minutes: e.target.value })}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-amber-500/60 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-neutral-500">System Slug</label>
                <input
                  value={systemDesignFormData.system_slug}
                  onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, system_slug: e.target.value })}
                  placeholder="systemdesign-url-shortener"
                  className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-amber-500/60 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest text-neutral-500">Company (Optional)</label>
              <input
                value={systemDesignFormData.company || ""}
                onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, company: e.target.value })}
                placeholder="e.g. Uber, Amazon, BookMyShow"
                className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-amber-500/60"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest text-neutral-500">Constraints & Scale Targets (One per line)</label>
              <textarea
                rows={3}
                value={systemDesignFormData.constraints}
                onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, constraints: e.target.value })}
                placeholder="100M daily active requests&#10;Sub-15ms p99 latency&#10;99.999% availability"
                className="mt-1.5 w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 px-3 py-2 text-[13px] text-neutral-900 dark:text-neutral-200 outline-none transition focus:border-amber-500/60 font-mono text-[12px]"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-black/20 flex items-center justify-end gap-3">
            <button
              onClick={closeSystemDesignModal}
              className="rounded-lg border border-neutral-200 dark:border-white/10 px-4 py-2 text-[13px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSystemDesign}
              disabled={createSystemDesignMutation.isPending || updateSystemDesignMutation.isPending || !systemDesignFormData.title}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {createSystemDesignMutation.isPending || updateSystemDesignMutation.isPending ? "Saving..." : "Save System Design Challenge"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. KNOWLEDGE ASSESSMENT QUESTION FORM MODAL */}
      <Dialog open={isKnowledgeModalOpen} onOpenChange={setIsKnowledgeModalOpen}>
        <DialogContent hideCloseButton className="sm:max-w-[800px] w-full bg-white dark:bg-[#121215] border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white h-[85vh] max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
          <CreateQuestionForm
            initialData={editingKnowledgeQuestion}
            courses={courses}
            onClose={closeKnowledgeModal}
            onSuccess={() => {
              closeKnowledgeModal();
              queryClient.invalidateQueries({ queryKey: ["knowledgeQuestions"] });
              showToast(
                editingKnowledgeQuestion
                  ? "Knowledge Assessment Question updated"
                  : "Knowledge Assessment Question created"
              );
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 4. PREVIEW QUESTION MODAL (Matches Engineering Lab Library & Assessment Question Bank Preview UI) */}
      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="sm:max-w-[700px] w-full bg-white dark:bg-[#121215] border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/5 p-6 shrink-0 pr-12">
            <div className="text-[16px] font-semibold text-neutral-900 dark:text-white truncate">
              {previewQuestion?.title || previewQuestion?.text || previewQuestion?.content || "Preview"}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar p-6 min-h-0">
            {loadingPreview ? (
              <div className="flex items-center justify-center p-12 text-neutral-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading question details...
              </div>
            ) : previewQuestion?.questionCategory === "LAB" ? (
              <LabPreview l={previewQuestion} />
            ) : previewQuestion?.questionCategory === "SYSTEM_DESIGN" ? (
              <SystemDesignPreview q={previewQuestion} />
            ) : (
              <QuestionPreview q={previewQuestion} />
            )}
          </div>
          <div className="border-t border-neutral-200 dark:border-white/5 p-5 flex justify-end shrink-0 bg-neutral-50 dark:bg-black/20">
            <button
              onClick={() => setPreviewQuestion(null)}
              className="rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-5 py-2.5 text-[13px] font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. DELETE QUESTION CONFIRMATION MODAL */}
      <Dialog open={!!deletingQuestion} onOpenChange={(open) => !open && setDeletingQuestion(null)}>
        <DialogContent className="sm:max-w-[440px] w-full bg-white dark:bg-[#121215] border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white p-6 shadow-2xl rounded-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogHeader className="p-0 text-center">
              <DialogTitle className="text-[18px] font-semibold text-neutral-900 dark:text-white text-center">
                Delete Question
              </DialogTitle>
            </DialogHeader>
            <p className="mt-2 text-[13px] text-neutral-600 dark:text-neutral-400">
              Are you sure you want to delete <span className="font-semibold text-neutral-900 dark:text-white">"{deletingQuestion?.title}"</span>? This action cannot be undone.
            </p>
          </div>

          <DialogFooter className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-200 dark:border-white/5 pt-4">
            <button
              onClick={() => setDeletingQuestion(null)}
              className="rounded-lg border border-neutral-200 dark:border-white/10 px-4 py-2 text-[13px] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              disabled={deleteLabMutation.isPending || deleteKnowledgeMutation.isPending || deleteSystemDesignMutation.isPending}
              onClick={() => {
                if (!deletingQuestion) return;
                if (deletingQuestion.category === "LAB") {
                  deleteLabMutation.mutate(deletingQuestion.id);
                } else if (deletingQuestion.category === "SYSTEM_DESIGN") {
                  deleteSystemDesignMutation.mutate(deletingQuestion.id);
                } else {
                  deleteKnowledgeMutation.mutate(deletingQuestion.id);
                }
                setDeletingQuestion(null);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              {deleteLabMutation.isPending || deleteKnowledgeMutation.isPending || deleteSystemDesignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Deleting...
                </>
              ) : (
                "Delete Question"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-[12px] text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function DifficultyPill({ difficulty }: { difficulty: string }) {
  if (difficulty === "HARD") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">
        <span className="h-1 w-1 rounded-full bg-rose-400" /> Hard
      </span>
    );
  }
  if (difficulty === "MEDIUM") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
        <span className="h-1 w-1 rounded-full bg-amber-400" /> Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
      <span className="h-1 w-1 rounded-full bg-emerald-400" /> Easy
    </span>
  );
}

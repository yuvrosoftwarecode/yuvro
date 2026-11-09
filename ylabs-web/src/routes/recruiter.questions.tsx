// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { questionBankService } from "@/services/questionBankService";
import { fetchCourses, fetchQuestions, fetchQuestionDetails } from "@/lib/recruiter";
import { ycodeApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import LoadingSkeleton from "@/components/common/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { QuestionBuilder } from "@/components/recruiter/QuestionBuilder";

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
    <span className="rounded bg-background/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {children}
    </span>
  );
}

function LabPreview({ l }: { l: any }) {
  if (!l) return null;
  return (
    <div className="rounded-md bg-background  p-4 text-[13px] text-muted-foreground  space-y-4">
      {l.description ? (
        <div className="whitespace-pre-wrap">{l.description}</div>
      ) : l.text ? (
        <div className="whitespace-pre-wrap">{l.text}</div>
      ) : (
        <div className="italic text-muted-foreground">No detailed description available.</div>
      )}

      <div className="grid grid-cols-2 gap-4 text-[12px]">
        <div>
          <div className="text-muted-foreground ">Domain</div>
          <div className="text-muted-foreground  font-medium">{l.domain || "N/A"}</div>
        </div>
        <div>
          <div className="text-muted-foreground ">Scenario</div>
          <div className="text-muted-foreground  font-medium">{l.scenario || "N/A"}</div>
        </div>
        <div>
          <div className="text-muted-foreground ">Difficulty</div>
          <div className="text-muted-foreground  font-medium">{l.difficulty || "N/A"}</div>
        </div>
        <div>
          <div className="text-muted-foreground ">Duration</div>
          <div className="text-muted-foreground  font-medium">{l.duration_minutes || 0} min</div>
        </div>
        <div>
          <div className="text-muted-foreground ">Marks</div>
          <div className="text-muted-foreground  font-medium">{l.marks || 0}</div>
        </div>
      </div>

      {Array.isArray(l.programming_languages) && l.programming_languages.length > 0 && (
        <div>
          <div className="text-muted-foreground  mb-1 text-[12px]">Programming Languages</div>
          <div className="flex flex-wrap gap-1">
            {l.programming_languages.map((x: string) => (
              <Chip key={x}>{x}</Chip>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(l.databases) && l.databases.length > 0 && (
        <div>
          <div className="text-muted-foreground  mb-1 text-[12px]">Databases</div>
          <div className="flex flex-wrap gap-1">
            {l.databases.map((x: string) => (
              <Chip key={x}>{x}</Chip>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(l.tasks) && l.tasks.length > 0 && (
        <div className="border-t border-border  pt-4">
          <div className="text-muted-foreground  font-semibold mb-3">Tasks in this Lab</div>
          <div className="space-y-2">
            {l.tasks.map((t: any, i: number) => (
              <div key={t.id || i} className="rounded bg-background  p-3 text-[12px] border border-border ">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-muted-foreground ">
                    {i + 1}. {t.title}
                  </span>
                  {t.difficulty && (
                    <span className="text-[10px] text-muted-foreground ">{t.difficulty}</span>
                  )}
                </div>
                {t.description && (
                  <div className="text-muted-foreground  mt-1 whitespace-pre-wrap">
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
    <div className="rounded-md bg-background  p-4 text-[13px] text-muted-foreground  space-y-4">
      {questionContent && (
        <div className="whitespace-pre-wrap font-medium text-muted-foreground ">{questionContent}</div>
      )}

      {options.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold text-muted-foreground ">Options:</div>
          {options.map((opt: any, i: number) => (
            <div key={i} className="flex items-start gap-3 rounded bg-background  border border-border  px-3 py-2">
              <div className="mt-0.5">
                {opt?.is_correct ? (
                  <span className="text-muted-foreground">Correct</span>
                ) : (
                  <div className="h-4 w-4 rounded-full border border-border " />
                )}
              </div>
              <div className="flex-1 text-muted-foreground ">{opt?.text || (typeof opt === "string" ? opt : "")}</div>
            </div>
          ))}
        </div>
      )}

      {testCases.length > 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-muted-foreground ">Examples:</div>
          {testCases.map((ex: any, i: number) => (
            <div key={i} className="rounded bg-background  border border-border  p-3 font-mono text-[11px]">
              <div className="text-muted-foreground ">
                <span className="text-muted-foreground">Input:</span> {ex?.input !== undefined ? String(ex.input) : ""}
              </div>
              <div className="mt-2 text-muted-foreground ">
                <span className="text-muted-foreground">Output:</span> {ex?.expected_output !== undefined ? String(ex.expected_output) : ex?.output !== undefined ? String(ex.output) : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {hints.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold text-muted-foreground ">Hints:</div>
          <ul className="list-inside list-disc space-y-1">
            {hints.map((hint: string, i: number) => (
              <li key={i} className="text-muted-foreground ">
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {solutions.length > 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-muted-foreground ">Solutions:</div>
          {solutions.map((sol: any, i: number) => (
            <div key={i} className="rounded border border-border  bg-background  p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground ">
                  {sol?.title || "Solution"}
                </span>
                {sol?.language && (
                  <span className="rounded bg-background  px-1.5 py-0.5 text-[10px]  text-muted-foreground ">
                    {sol.language}
                  </span>
                )}
                {sol?.is_primary && (
                  <span className="rounded bg-background  px-1.5 py-0.5 text-[10px]  text-muted-foreground ">
                    Primary
                  </span>
                )}
              </div>
              {sol?.code && (
                <pre className="overflow-x-auto rounded bg-background  p-2 font-mono text-[11px] text-muted-foreground  border border-border ">
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
    <div className="rounded-md bg-background  p-4 text-[13px] text-muted-foreground  space-y-4">
      {q.description || q.problem ? (
        <div className="whitespace-pre-wrap leading-relaxed">{q.description || q.problem}</div>
      ) : (
        <div className="italic text-muted-foreground">No detailed description available.</div>
      )}

      <div className="grid grid-cols-2 gap-4 text-[12px]">
        <div>
          <div className="text-muted-foreground ">Category</div>
          <div className="text-muted-foreground  font-medium">System Design</div>
        </div>
        <div>
          <div className="text-muted-foreground ">Difficulty</div>
          <div className="text-muted-foreground  font-medium">{q.difficulty || "MEDIUM"}</div>
        </div>
        <div>
          <div className="text-muted-foreground ">Duration</div>
          <div className="text-muted-foreground  font-medium">{q.duration_minutes || 45} min</div>
        </div>
        <div>
          <div className="text-muted-foreground ">Marks</div>
          <div className="text-muted-foreground  font-medium">{q.marks || 100}</div>
        </div>
      </div>

      {Array.isArray(q.tasks) && q.tasks.length > 0 && (
        <div className="border-t border-border  pt-4">
          <div className="text-muted-foreground  font-semibold mb-3">Deliverables & Objectives</div>
          <div className="space-y-2">
            {q.tasks.map((t: any, i: number) => (
              <div key={t.id || i} className="rounded bg-background  p-3 text-[12px] border border-border ">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-muted-foreground ">
                    {i + 1}. {t.title || t.name}
                  </span>
                  {t.marks && (
                    <span className="text-[10px] font-mono text-muted-foreground  font-semibold">{t.marks} pts</span>
                  )}
                </div>
                {t.description && (
                  <p className="text-[11px] text-muted-foreground ">{t.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(q.constraints) && q.constraints.length > 0 && (
        <div className="border-t border-border  pt-4">
          <div className="text-muted-foreground  font-semibold mb-2">Constraints & Scale Targets</div>
          <ul className="space-y-1 text-[12px] text-muted-foreground  list-disc pl-4">
            {q.constraints.map((c: string, i: number) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const sentence = (value: string) => {
  const text = value.replace(/_/g, " ").toLowerCase();
  return (text.charAt(0).toUpperCase() + text.slice(1)).replace(/\b(mcq|sql|api)\b/gi, word => word.toUpperCase());
};
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const categoryLabels: Record<string, string> = {
  LAB: "Engineering lab", SYSTEM_DESIGN: "System design", KNOWLEDGE: "Knowledge assessment",
};

const QuestionCardItem = memo(function QuestionCardItem({
  q, loadingEditId, onPreview, onEdit, onDelete,
}: {
  q: any;
  loadingEditId: string | null;
  onPreview: (q: any) => void;
  onEdit: (q: any) => void;
  onDelete: (q: any) => void;
}) {
  const tags = [q.domain, q.scenario, q.scenario_type, q.company,
    q.questionCategory === "KNOWLEDGE" ? q.format || q.type : null,
  ].filter(Boolean);
  const tasks = Array.isArray(q.tasks) ? q.tasks.length : 0;
  return (
    <article
      className="qb-question-card flex min-w-0 cursor-pointer flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent"
      onClick={() => onPreview(q)}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPreview(q);
        }
      }}
      tabIndex={0}
      aria-label={`Open ${q.title}`}
    >
      <div className="text-sm leading-5 text-muted-foreground">
        {categoryLabels[q.questionCategory]} · {sentence(q.difficulty || "Easy")}
      </div>
      <h3 className="mt-2 break-words text-base font-medium leading-6 text-foreground">{q.title}</h3>
      {q.description && <p className="mt-1 break-words text-[15px] leading-[22px] text-secondary-foreground">{q.description}</p>}
      {tags.length > 0 && <div className="mt-3 break-words text-sm leading-5 text-muted-foreground">{tags.map(sentence).join(" · ")}</div>}
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-border pt-4 text-sm leading-5 text-muted-foreground">
          <span>{plural(q.marks ?? 0, "mark")} · {q.duration_minutes ?? 0} min{tasks > 0 ? ` · ${plural(tasks, "task")}` : ""}</span>
          <div className="flex gap-4" onClick={event => event.stopPropagation()}>
            <Button variant="link" className="qb-action" onClick={() => onPreview(q)}>View</Button>
            <Button variant="link" className="qb-action" disabled={loadingEditId === q.id} onClick={() => onEdit(q)}>{loadingEditId === q.id ? "Editing…" : "Edit"}</Button>
            <Button variant="link" className="qb-action hover:text-destructive" onClick={() => onDelete(q)}>Delete</Button>
          </div>
        </div>
      </div>
    </article>
  );
});

function RecruiterQuestionBankPage() {
  const queryClient = useQueryClient();

  // Tab State: "ALL" | "LAB" | "KNOWLEDGE" | "SYSTEM_DESIGN"
  const [activeTab, setActiveTab] = useState<"ALL" | "LAB" | "KNOWLEDGE" | "SYSTEM_DESIGN">("ALL");

  // Courses state for Knowledge assessment Form
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

  // Full Page Multi-step Builder State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderCategory, setBuilderCategory] = useState<"LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE">("LAB");
  const [builderEditingId, setBuilderEditingId] = useState<string | null>(null);
  const [builderInitialData, setBuilderInitialData] = useState<any>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

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

  // Delete Mutations (for Delete Confirmation Modal)
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

  // Knowledge assessment Mutations
  const deleteKnowledgeMutation = useMutation({
    mutationFn: (id: string) => questionBankService.deleteKnowledgeQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeQuestions"] });
      showToast("Knowledge assessment Question deleted");
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

  // Handlers for Add Button & Edit Button
  const handleOpenAddModal = () => {
    let defaultCat: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE" = "LAB";
    if (activeTab === "SYSTEM_DESIGN") defaultCat = "SYSTEM_DESIGN";
    else if (activeTab === "KNOWLEDGE") defaultCat = "KNOWLEDGE";
    setBuilderCategory(defaultCat);
    setBuilderEditingId(null);
    setBuilderInitialData(null);
    setIsBuilderOpen(true);
  };

  const handleEditQuestion = async (q: any) => {
    setBuilderEditingId(q.id);
    if (q.questionCategory === "LAB") {
      setBuilderCategory("LAB");
      setBuilderInitialData(q);
      setIsBuilderOpen(true);
    } else if (q.questionCategory === "SYSTEM_DESIGN") {
      setBuilderCategory("SYSTEM_DESIGN");
      setBuilderInitialData(q);
      setIsBuilderOpen(true);
    } else {
      setLoadingEditId(q.id);
      try {
        const details = await fetchQuestionDetails(q.id);
        setBuilderCategory("KNOWLEDGE");
        setBuilderInitialData(details || q);
        setIsBuilderOpen(true);
      } catch (err) {
        console.error("Failed to fetch knowledge question details for edit:", err);
        setBuilderCategory("KNOWLEDGE");
        setBuilderInitialData(q);
        setIsBuilderOpen(true);
      } finally {
        setLoadingEditId(null);
      }
    }
  };

  // Delete Warning Dialog State
  const [deletingQuestion, setDeletingQuestion] = useState<{
    id: string;
    title: string;
    category: "LAB" | "KNOWLEDGE" | "SYSTEM_DESIGN";
  } | null>(null);

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
      title: q.title || "Untitled System design challenge",
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

  // Full Page Multi-step Builder View
  if (isBuilderOpen) {
    return (
      <QuestionBuilder
        initialCategory={builderCategory}
        editingId={builderEditingId}
        initialData={builderInitialData}
        courses={courses}
        onClose={() => {
          setIsBuilderOpen(false);
          setBuilderEditingId(null);
          setBuilderInitialData(null);
        }}
        onSuccess={(msg) => {
          showToast(msg);
        }}
      />
    );
  }

  return (
    <div className="qb-theme min-w-0 px-5 py-8 lg:px-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-8 text-foreground">Question bank</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">Browse and manage questions for candidate evaluations</p>
        </div>
        <Button onClick={handleOpenAddModal} className="rec-btn shrink-0">Add question</Button>
      </header>

      <div role="tablist" aria-label="Question categories" className="mb-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-border">
        {([
          { key: "ALL", label: "All questions", count: totalCount },
          { key: "LAB", label: "Engineering labs", count: labCount },
          { key: "SYSTEM_DESIGN", label: "System design", count: systemDesignCount },
          { key: "KNOWLEDGE", label: "Knowledge assessment", count: knowledgeCount },
        ] as const).map(tab => (
          <Button key={tab.key} role="tab" aria-selected={activeTab === tab.key} variant="ghost"
            onClick={() => handleTabChange(tab.key)}
            className={`qb-tab -mb-px h-auto rounded-none border-b-2 px-0 pb-3 pt-0 text-[15px] leading-5 ${activeTab === tab.key ? "border-primary font-medium text-foreground" : "border-transparent font-normal text-muted-foreground hover:text-foreground"}`}>
            {tab.label} ({tab.count})
          </Button>
        ))}
      </div>

      <div className="qb-filters mb-6 flex flex-wrap gap-3">
        <input value={search} onChange={event => setSearch(event.target.value)}
          aria-label="Search questions" placeholder="Search by title, description or domain"
          className="qb-filter h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-[15px] text-foreground placeholder:text-muted-foreground" />
        <select aria-label="Domain" value={selectedDomain} onChange={event => setSelectedDomain(event.target.value)} className="qb-filter h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
          <option value="ALL">All domains</option>
          {DOMAINS.map(domain => <option key={domain.value} value={domain.value}>{domain.label}</option>)}
        </select>
        <select aria-label="Format" value={selectedFormat} onChange={event => setSelectedFormat(event.target.value)} className="qb-filter h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
          <option value="ALL">All formats</option>
          <option value="LAB">Engineering lab</option><option value="SYSTEM_DESIGN">System design</option>
          <option value="MCQ">MCQ</option><option value="MULTIPLE_SELECT">Multiple select</option>
          <option value="DESCRIPTION">Description</option><option value="CODING">Coding</option>
        </select>
        <select aria-label="Difficulty" value={selectedDifficulty} onChange={event => setSelectedDifficulty(event.target.value)} className="qb-filter h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
          <option value="ALL">All difficulties</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
        </select>
        <select aria-label="Course" value={selectedCourse} onChange={event => setSelectedCourse(event.target.value)} className="qb-filter h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
          <option value="ALL">All courses</option>
          {courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <LoadingSkeleton type="cards" count={6} className="mt-8" />
      ) : filteredQuestions.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No questions match your filters</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {paginatedQuestions.map((q: any) => (
              <QuestionCardItem
                key={`${q.questionCategory}-${q.id}`}
                q={q}
                loadingEditId={loadingEditId}
                onPreview={handleOpenPreview}
                onEdit={(item) => {
                  handleEditQuestion(item);
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
            <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row border-t border-border  pt-6">
              <div className="text-[13px] text-muted-foreground ">
                Showing{" "}
                <span className="font-semibold text-muted-foreground ">
                  {Math.min((currentPage - 1) * pageSize + 1, totalFilteredCount)}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-muted-foreground ">
                  {Math.min(currentPage * pageSize, totalFilteredCount)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-muted-foreground ">
                  {totalFilteredCount}
                </span>{" "}
                questions
              </div>

              <div className="flex items-center gap-1.5">
                <Button variant="ghost"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-border  bg-background  px-3 py-1.5 text-[12px] font-medium text-muted-foreground  hover:bg-background  transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </Button>

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
                          <span className="px-1 text-[12px] text-muted-foreground">...</span>
                        )}
                        <Button variant="ghost"
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 rounded-lg text-[12px] font-medium transition ${
                            currentPage === page
                              ? "bg-background  text-muted-foreground  font-semibold"
                              : "border border-border  bg-background  text-muted-foreground  hover:bg-background "
                          }`}
                        >
                          {page}
                        </Button>
                      </div>
                    );
                  })}

                <Button variant="ghost"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-border  bg-background  px-3 py-1.5 text-[12px] font-medium text-muted-foreground  hover:bg-background  transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. PREVIEW QUESTION MODAL (Matches Engineering Lab Library & Assessment Question Bank Preview UI) */}
      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="recruiter-theme qb-theme qb-dialog sm:max-w-[700px] w-full bg-background  border-border  text-muted-foreground  max-h-[85vh] flex flex-col p-0 overflow-hidden  rounded-xl">
          <div className="flex items-center justify-between border-b border-border  p-6 shrink-0 pr-12">
            <div className="text-[16px] font-semibold text-muted-foreground  truncate">
              {previewQuestion?.title || previewQuestion?.text || previewQuestion?.content || "Preview"}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar p-6 min-h-0">
            {loadingPreview ? (
              <div className="flex items-center justify-center p-12 text-muted-foreground">
                
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
          <div className="border-t border-border  p-5 flex justify-end shrink-0 bg-background ">
            <Button variant="ghost"
              onClick={() => setPreviewQuestion(null)}
              className="rounded-md bg-background  text-muted-foreground  px-5 py-2.5 text-[13px] font-medium hover:bg-background  transition-colors"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. DELETE QUESTION CONFIRMATION MODAL */}
      <Dialog open={!!deletingQuestion} onOpenChange={(open) => !open && setDeletingQuestion(null)}>
        <DialogContent className="recruiter-theme qb-theme qb-dialog sm:max-w-[440px] w-full bg-background  border-border  text-muted-foreground  p-6  rounded-xl">
          <div className="flex flex-col items-center text-center">
            
            <DialogHeader className="p-0 text-center">
              <DialogTitle className="text-[18px] font-semibold text-muted-foreground  text-center">
                Delete question
              </DialogTitle>
            </DialogHeader>
            <p className="mt-2 text-[13px] text-muted-foreground ">
              Are you sure you want to delete <span className="font-semibold text-muted-foreground ">"{deletingQuestion?.title}"</span>? This action cannot be undone.
            </p>
          </div>

          <DialogFooter className="mt-6 flex items-center justify-end gap-3 border-t border-border  pt-4">
            <Button variant="ghost"
              onClick={() => setDeletingQuestion(null)}
              className="rounded-lg border border-border  px-4 py-2 text-[13px] text-muted-foreground  hover:bg-background  transition"
            >
              Cancel
            </Button>
            <Button variant="ghost"
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
              className="inline-flex items-center gap-2 rounded-lg bg-background px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-background transition-colors disabled:opacity-50"
            >
              {deleteLabMutation.isPending || deleteKnowledgeMutation.isPending || deleteSystemDesignMutation.isPending ? (
                <>
                  
                  Deleting...
                </>
              ) : (
                "Delete question"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border/10 bg-background px-4 py-2 text-[12px] text-muted-foreground ">
          {toast}
        </div>
      )}
    </div>
  );
}

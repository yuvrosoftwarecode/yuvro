import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, Badge, KpiCard, Panel } from "@/components/admin/AdminShell";
import {
  Database,
  Link as LinkIcon,
  Plus,
  Search,
  Trash2,
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  FileJson,
  Loader2,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Clock,
  Code2,
  Pencil,
  User,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { questionBankService } from "@/services/questionBankService";
import { fetchCourses, fetchQuestionDetails } from "@/lib/recruiter";
import { QuestionBuilder } from "@/components/recruiter/QuestionBuilder";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/questions")({ component: QuestionsPage });

const STEPS = ["Basic info", "Tasks", "Verification & Solution"];

const DOMAINS = [
  { value: "ERP", label: "Enterprise Resource Planning (ERP)" },
  { value: "PAYMENT", label: "Payments & Fintech" },
  { value: "SUPPLY_CHAIN", label: "Supply Chain & Logistics" },
  { value: "FINANCE", label: "Banking & Financial Services" },
  { value: "RETAIL", label: "E-Commerce & Retail" },
  { value: "HEALTHCARE", label: "Healthcare & Life Sciences" },
  { value: "INSURANCE", label: "Insurance & Underwriting" },
  { value: "EDTECH", label: "EdTech & Learning" },
  { value: "OTHER", label: "Other / General" },
];

const CATS = [
  "Java",
  "Python",
  "React",
  "SQL",
  "DevOps",
  "Security",
  "System Design",
  "Testing",
  "Debugging",
  "Code Reviews",
];

const TYPES = [
  "Coding Task",
  "Bug Scenario",
  "Debugging Case",
  "Security Vuln",
  "Optimization",
  "Database Issue",
  "API Problem",
  "Deployment Failure",
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

const PROGRAMMING_LANGUAGES = [
  "C",
  "C++",
  "Python",
  "Java",
  "SQL",
  "Bash",
  "JavaScript",
  "TypeScript",
];
const DATABASES = ["SQLite", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch"];
const BACKEND_FRAMEWORKS = [
  "Django",
  "Django REST Framework",
  "FastAPI",
  "Flask",
  "Spring Boot",
  "NodeJS",
  "Express",
  "NestJS",
];
const FRONTEND_FRAMEWORKS = ["React", "NextJS", "Vue", "Angular", "Svelte"];

const DEFAULT_FORM = {
  title: "",
  description: "",
  difficulty: "HARD",
  domain: "ERP",
  type: "BACKEND",
  experience: "MID_LEVEL",
  scenario: "BUG_FIXING",
  marks: 30,
  duration_minutes: 60,
  git_repo_starter_url: "https://github.com/yuvrosoftwarecode/evaluation_django",
  git_repo_starter_branch: "feature/",
  startup_command: "python manage.py migrate && python manage.py runserver 0.0.0.0:8010",
  test_command: "python yuvro_scoring_rules/main_test.py",
  connection_url: "",
  allow_task_selection: true,
  programming_languages: ["PYTHON"],
  databases: ["SQLITE"],
  backend_frameworks: ["DJANGO", "DJANGO_REST_FRAMEWORK"],
  frontend_frameworks: [],
  tasks: [],
  solution_files: [{ path: "", code: "" }],
};

const arrayToString = (arr: any) => (Array.isArray(arr) ? arr.join(", ") : "");
const stringToArray = (str: string) =>
  str
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s);

function MultiSelectPills({
  label,
  options,
  value = [],
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (opt: string) => {
    let mappedVal = opt.toUpperCase().replace(/ /g, "_").replace(/\+/g, "P");
    if (opt === "C++") mappedVal = "C++";

    if (value.includes(mappedVal)) {
      onChange(value.filter((v) => v !== mappedVal));
    } else {
      onChange([...value, mappedVal]);
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          let mappedVal = opt.toUpperCase().replace(/ /g, "_").replace(/\+/g, "P");
          if (opt === "C++") mappedVal = "C++";
          const selected = value.includes(mappedVal);
          return (
            <button
              type="button"
              key={opt}
              onClick={() => toggle(opt)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                selected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground"
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

function Field({
  label,
  children,
  full,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  hint?: string;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-full" : ""}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

const sentence = (value: string) => {
  const text = value.replace(/_/g, " ").toLowerCase();
  return (text.charAt(0).toUpperCase() + text.slice(1)).replace(/\b(mcq|sql|api)\b/gi, (word) =>
    word.toUpperCase(),
  );
};
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const categoryLabels: Record<string, string> = {
  LAB: "Engineering lab",
  SYSTEM_DESIGN: "System design",
  KNOWLEDGE: "Knowledge assessment",
};

const isYuvroQuestion = (q: any) =>
  q.is_yuvro === true ||
  (!q.company && !q.company_name && !q.company_id) ||
  (typeof q.id === "string" && q.id.startsWith("builtin-"));

const creatorDisplay = (q: any) => {
  const name = q.created_by_name?.trim();
  if (name && name.toLowerCase() !== "tech recruiter") return name;
  try {
    const stored = localStorage.getItem("pl-recruiter-settings");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.name && parsed.name.trim()) {
        const storedEmail = parsed.email;
        if (
          !storedEmail ||
          !q.created_by_email ||
          q.created_by_email.toLowerCase() === storedEmail.toLowerCase()
        ) {
          return parsed.name.trim();
        }
      }
    }
  } catch {}
  if (name) return name;
  if (typeof q.created_by === "object") {
    const objName = `${q.created_by?.first_name || ""} ${q.created_by?.last_name || ""}`.trim();
    if (objName && objName.toLowerCase() !== "tech recruiter") return objName;
    return q.created_by?.email || "";
  }
  return q.created_by_email || "";
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
    <div className="rounded-md bg-background p-4 text-[13px] text-muted-foreground space-y-4">
      {l.description ? (
        <div className="whitespace-pre-wrap">{l.description}</div>
      ) : l.text ? (
        <div className="whitespace-pre-wrap">{l.text}</div>
      ) : (
        <div className="italic text-muted-foreground">No detailed description available.</div>
      )}

      <div className="grid grid-cols-2 gap-4 text-[12px]">
        <div>
          <div className="text-muted-foreground">Domain</div>
          <div className="text-muted-foreground font-medium">{l.domain || "N/A"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Scenario</div>
          <div className="text-muted-foreground font-medium">{l.scenario || "N/A"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Difficulty</div>
          <div className="text-muted-foreground font-medium">{l.difficulty || "N/A"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Duration</div>
          <div className="text-muted-foreground font-medium">{l.duration_minutes || 0} min</div>
        </div>
        <div>
          <div className="text-muted-foreground">Marks</div>
          <div className="text-muted-foreground font-medium">{l.marks || 0}</div>
        </div>
      </div>

      {Array.isArray(l.programming_languages) && l.programming_languages.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-1 text-[12px]">Programming Languages</div>
          <div className="flex flex-wrap gap-1">
            {l.programming_languages.map((x: string) => (
              <Chip key={x}>{x}</Chip>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(l.databases) && l.databases.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-1 text-[12px]">Databases</div>
          <div className="flex flex-wrap gap-1">
            {l.databases.map((x: string) => (
              <Chip key={x}>{x}</Chip>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(l.tasks) && l.tasks.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="text-muted-foreground font-semibold mb-3">Tasks in this Lab</div>
          <div className="space-y-2">
            {l.tasks.map((t: any, i: number) => (
              <div
                key={t.id || i}
                className="rounded bg-background p-3 text-[12px] border border-border"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-muted-foreground">
                    {i + 1}. {t.title}
                  </span>
                  {t.difficulty && (
                    <span className="text-[10px] text-muted-foreground">{t.difficulty}</span>
                  )}
                </div>
                {t.description && (
                  <div className="text-muted-foreground mt-1 whitespace-pre-wrap">
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

  const questionContent =
    q.content || q.description || (q.text && q.text !== q.title ? q.text : "");

  const options =
    Array.isArray(q.mcq_options) && q.mcq_options.length > 0
      ? q.mcq_options
      : Array.isArray(q.options) && q.options.length > 0
        ? q.options
        : [];

  const testCases =
    Array.isArray(q.test_cases_basic) && q.test_cases_basic.length > 0
      ? q.test_cases_basic
      : Array.isArray(q.test_cases) && q.test_cases.length > 0
        ? q.test_cases
        : Array.isArray(q.examples) && q.examples.length > 0
          ? q.examples
          : [];

  const rawHints = Array.isArray(q.hints) && q.hints.length > 0 ? q.hints : [];

  const hints = rawHints
    .map((h: any) => {
      if (typeof h === "string") return h.trim();
      return h?.text || h?.hint || String(h);
    })
    .filter(Boolean);

  let solutions: any[] = [];
  if (Array.isArray(q.solutions) && q.solutions.length > 0) {
    solutions = q.solutions;
  } else if (q.solution_explanation && typeof q.solution_explanation === "string") {
    let explanationText = q.solution_explanation;
    if (explanationText.trim().startsWith("{")) {
      try {
        const p = JSON.parse(explanationText);
        if (p.solutions && p.solutions.length > 0) {
          solutions = p.solutions;
          explanationText = "";
        } else if (p.hints && p.hints.length > 0) {
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
    solutions = [
      { title: "Solution", code: JSON.stringify(q.solution, null, 2), language: "json" },
    ];
  }

  return (
    <div className="rounded-md bg-background p-4 text-[13px] text-muted-foreground space-y-4">
      {questionContent && (
        <div className="whitespace-pre-wrap font-medium text-muted-foreground">
          {questionContent}
        </div>
      )}

      {options.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold text-muted-foreground">Options:</div>
          {options.map((opt: any, i: number) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded bg-background border border-border px-3 py-2"
            >
              <div className="mt-0.5">
                {opt?.is_correct ? (
                  <span className="text-muted-foreground">Correct</span>
                ) : (
                  <div className="h-4 w-4 rounded-full border border-border" />
                )}
              </div>
              <div className="flex-1 text-muted-foreground">
                {opt?.text || (typeof opt === "string" ? opt : "")}
              </div>
            </div>
          ))}
        </div>
      )}

      {testCases.length > 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-muted-foreground">Examples:</div>
          {testCases.map((ex: any, i: number) => (
            <div
              key={i}
              className="rounded bg-background border border-border p-3 font-mono text-[11px]"
            >
              <div className="text-muted-foreground">
                <span className="text-muted-foreground">Input:</span>{" "}
                {ex?.input !== undefined ? String(ex.input) : ""}
              </div>
              <div className="mt-2 text-muted-foreground">
                <span className="text-muted-foreground">Output:</span>{" "}
                {ex?.expected_output !== undefined
                  ? String(ex.expected_output)
                  : ex?.output !== undefined
                    ? String(ex.output)
                    : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {hints.length > 0 && (
        <div className="space-y-2">
          <div className="font-semibold text-muted-foreground">Hints:</div>
          <ul className="list-inside list-disc space-y-1">
            {hints.map((hint: string, i: number) => (
              <li key={i} className="text-muted-foreground">
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {solutions.length > 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-muted-foreground">Solutions:</div>
          {solutions.map((sol: any, i: number) => (
            <div key={i} className="rounded border border-border bg-background p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">
                  {sol?.title || "Solution"}
                </span>
                {sol?.language && (
                  <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {sol.language}
                  </span>
                )}
                {sol?.is_primary && (
                  <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Primary
                  </span>
                )}
              </div>
              {sol?.code && (
                <pre className="overflow-x-auto rounded bg-background p-2 font-mono text-[11px] text-muted-foreground border border-border">
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
    <div className="rounded-md bg-background p-4 text-[13px] text-muted-foreground space-y-4">
      {q.description || q.problem ? (
        <div className="whitespace-pre-wrap leading-relaxed">{q.description || q.problem}</div>
      ) : (
        <div className="italic text-muted-foreground">No detailed description available.</div>
      )}

      <div className="grid grid-cols-2 gap-4 text-[12px]">
        <div>
          <div className="text-muted-foreground">Category</div>
          <div className="text-muted-foreground font-medium">System Design</div>
        </div>
        <div>
          <div className="text-muted-foreground">Difficulty</div>
          <div className="text-muted-foreground font-medium">{q.difficulty || "MEDIUM"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Duration</div>
          <div className="text-muted-foreground font-medium">{q.duration_minutes || 45} min</div>
        </div>
        <div>
          <div className="text-muted-foreground">Marks</div>
          <div className="text-muted-foreground font-medium">{q.marks || 100}</div>
        </div>
      </div>

      {Array.isArray(q.tasks) && q.tasks.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="text-muted-foreground font-semibold mb-3">Deliverables & Objectives</div>
          <div className="space-y-2">
            {q.tasks.map((t: any, i: number) => (
              <div
                key={t.id || i}
                className="rounded bg-background p-3 text-[12px] border border-border"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-muted-foreground">
                    {i + 1}. {t.title || t.name}
                  </span>
                  {t.marks && (
                    <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                      {t.marks} pts
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-[11px] text-muted-foreground">{t.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(q.constraints) && q.constraints.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="text-muted-foreground font-semibold mb-2">
            Constraints & Scale Targets
          </div>
          <ul className="space-y-1 text-[12px] text-muted-foreground list-disc pl-4">
            {q.constraints.map((c: string, i: number) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function QuestionCardItem({
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
  const isYuvro = isYuvroQuestion(q);
  const tags = [
    q.domain,
    q.scenario,
    q.scenario_type,
    q.company_name || q.company,
    q.questionCategory === "KNOWLEDGE" ? q.format || q.type : null,
  ].filter(Boolean);
  const tasks = Array.isArray(q.tasks) ? q.tasks.length : 0;
  const creator = creatorDisplay(q);

  return (
    <article
      className="qb-question-card flex min-w-0 cursor-pointer flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent"
      onClick={() => onPreview(q)}
      onKeyDown={(event) => {
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
      <h3 className="mt-2 break-words text-base font-medium leading-6 text-foreground">
        {q.title}
      </h3>
      {q.description && (
        <p className="mt-1 break-words text-[15px] leading-[22px] text-secondary-foreground">
          {q.description}
        </p>
      )}
      {tags.length > 0 && (
        <div className="mt-3 break-words text-sm leading-5 text-muted-foreground">
          {tags.map(sentence).join(" · ")}
        </div>
      )}
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-border pt-4 text-sm leading-5 text-muted-foreground">
          <span>
            {plural(q.marks ?? 0, "mark")} · {q.duration_minutes ?? 0} min
            {tasks > 0 ? ` · ${plural(tasks, "task")}` : ""}
          </span>
          <div className="flex items-center gap-4" onClick={(event) => event.stopPropagation()}>
            {!isYuvro && creator && (
              <span className="text-xs text-muted-foreground font-normal">{creator}</span>
            )}
            <Button variant="link" className="qb-action" onClick={() => onPreview(q)}>
              View
            </Button>
            {!isYuvro && (
              <>
                <Button
                  variant="link"
                  className="qb-action"
                  disabled={loadingEditId === q.id}
                  onClick={() => onEdit(q)}
                >
                  {loadingEditId === q.id ? "Editing…" : "Edit"}
                </Button>
                <Button
                  variant="link"
                  className="qb-action hover:text-destructive"
                  onClick={() => onDelete(q)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function QuestionsPage() {
  const queryClient = useQueryClient();

  // Source State: "yuvro" (library) | "recruiter" (recruiter's company questions)
  const [questionSource, setQuestionSource] = useState<"yuvro" | "recruiter">("yuvro");

  // Courses state for Course filter
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetchCourses().then(setCourses).catch(console.error);
  }, []);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["labQuestions", questionSource],
    queryFn: () => questionBankService.getLabQuestions(questionSource),
  });

  // Fetch Knowledge Questions
  const { data: knowledgeQuestions = [], isLoading: isLoadingKnowledge } = useQuery({
    queryKey: ["knowledgeQuestions", questionSource],
    queryFn: () => questionBankService.getKnowledgeQuestions(questionSource),
  });

  // Fetch System Design Questions
  const { data: systemDesignQuestions = [], isLoading: isLoadingSystemDesign } = useQuery({
    queryKey: ["systemDesignQuestions", questionSource],
    queryFn: () => questionBankService.getSystemDesignQuestions(questionSource),
  });

  // Builder View Mode States
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(DEFAULT_FORM);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedDomain, setSelectedDomain] = useState("ALL");
  const [selectedFormat, setSelectedFormat] = useState("ALL");
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [selectedType, setSelectedType] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleSourceChange = (newSource: "yuvro" | "recruiter") => {
    setQuestionSource(newSource);
    setPage(1);
  };

  // Preview State
  const [previewQuestion, setPreviewQuestion] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleOpenPreview = async (q: any) => {
    setPreviewQuestion(q);
    // LAB and SYSTEM_DESIGN questions already have full data from combinedQuestions
    // Only fetch detailed content for KNOWLEDGE questions
    if (q.questionCategory === "LAB" || q.questionCategory === "SYSTEM_DESIGN") {
      setLoadingPreview(false);
      return;
    }
    setLoadingPreview(true);
    try {
      const details = await fetchQuestionDetails(q.id);
      if (details) {
        setPreviewQuestion({
          ...q,
          ...details,
          questionCategory: q.questionCategory || "KNOWLEDGE",
        });
      }
    } catch (err) {
      console.error("Error loading question details", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Tab State: "ALL" | "LAB" | "KNOWLEDGE" | "SYSTEM_DESIGN"
  const [activeTab, setActiveTab] = useState<"ALL" | "LAB" | "KNOWLEDGE" | "SYSTEM_DESIGN">("ALL");

  const handleTabChange = (tab: "ALL" | "LAB" | "KNOWLEDGE" | "SYSTEM_DESIGN") => {
    setActiveTab(tab);
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [
    search,
    category,
    selectedDomain,
    selectedFormat,
    selectedCourse,
    selectedType,
    difficulty,
    questionSource,
    activeTab,
  ]);

  // Combine questions with type tags based on active tab and source
  const combinedQuestions = useMemo(() => {
    const labs = (questions || []).map((q: any) => ({
      ...q,
      questionCategory: "LAB",
    }));

    const knowledge = (knowledgeQuestions || []).map((q: any) => ({
      ...q,
      title: q.title || q.content || q.text || "Untitled Question",
      description: q.content || q.text || "",
      difficulty: (q.difficulty || "EASY").toUpperCase(),
      domain: q.course_name || q.domain || "GENERAL",
      marks: q.marks || 1,
      duration_minutes: q.duration || q.duration_minutes || 5,
      questionCategory: "KNOWLEDGE",
    }));

    const sysDesign = (systemDesignQuestions || []).map((q: any) => ({
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
  }, [questions, knowledgeQuestions, systemDesignQuestions, activeTab]);

  const filteredQuestions = useMemo(() => {
    return combinedQuestions.filter((q: any) => {
      const matchSearch =
        !search ||
        q.title?.toLowerCase().includes(search.toLowerCase()) ||
        q.description?.toLowerCase().includes(search.toLowerCase()) ||
        q.id?.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        category === "All" ||
        q.programming_languages?.some((lang: string) =>
          lang.toLowerCase().includes(category.toLowerCase()),
        ) ||
        q.domain?.toLowerCase().includes(category.toLowerCase());

      const matchDomain =
        selectedDomain === "ALL" || q.domain?.toUpperCase() === selectedDomain.toUpperCase();

      const matchType =
        selectedType === "All" ||
        q.scenario?.toLowerCase().includes(selectedType.toLowerCase().replace(/\s+/g, "_")) ||
        q.type?.toLowerCase().includes(selectedType.toLowerCase().replace(/\s+/g, "_"));

      const matchDifficulty =
        difficulty === "All" || q.difficulty?.toUpperCase() === difficulty.toUpperCase();

      const matchFormat =
        selectedFormat === "ALL" ||
        q.questionCategory === selectedFormat ||
        q.format?.toUpperCase() === selectedFormat.toUpperCase() ||
        q.type?.toUpperCase() === selectedFormat.toUpperCase();

      const matchCourse =
        selectedCourse === "ALL" ||
        q.course === selectedCourse ||
        q.course_id === selectedCourse ||
        q.course_name?.toUpperCase() === selectedCourse.toUpperCase();

      return (
        matchSearch &&
        matchCategory &&
        matchDomain &&
        matchType &&
        matchDifficulty &&
        matchFormat &&
        matchCourse
      );
    });
  }, [
    combinedQuestions,
    search,
    category,
    selectedDomain,
    selectedFormat,
    selectedCourse,
    selectedType,
    difficulty,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));

  const labCount = (questions || []).length;
  const knowledgeCount = (knowledgeQuestions || []).length;
  const systemDesignCount = (systemDesignQuestions || []).length;
  const totalCount = labCount + knowledgeCount + systemDesignCount;

  const totalFilteredCount = filteredQuestions.length;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedQuestions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, page, pageSize]);

  // Verification Suite States
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Delete Warning Dialog State
  const [deletingQuestion, setDeletingQuestion] = useState<{
    id: string;
    title: string;
    category: string;
  } | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: any) => questionBankService.createLabQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      closeBuilder();
      alert("✅ Question saved & JSON fixture exported successfully!");
    },
    onError: (err: any) => {
      alert(`❌ Failed to save question: ${err?.message || "Unknown error"}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      questionBankService.updateLabQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      closeBuilder();
      alert("✅ Question updated & JSON fixture synchronized!");
    },
    onError: (err: any) => {
      alert(`❌ Failed to update question: ${err?.message || "Unknown error"}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questionBankService.deleteLabQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      closeBuilder();
      alert("🗑️ Question deleted successfully.");
    },
    onError: (err: any) => {
      alert(`❌ Failed to delete question: ${err?.message || "Unknown error"}`);
    },
  });

  const handleDelete = (q: any) => {
    setDeletingQuestion({
      id: q.id,
      title: q.title,
      category: q.questionCategory || "LAB",
    });
  };

  // Helper functions for rich question cards
  const sentence = (value: string) => {
    const text = value.replace(/_/g, " ").toLowerCase();
    return (text.charAt(0).toUpperCase() + text.slice(1)).replace(/\b(mcq|sql|api)\b/gi, (word) =>
      word.toUpperCase(),
    );
  };
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
  const categoryLabels: Record<string, string> = {
    LAB: "Engineering lab",
    SYSTEM_DESIGN: "System design",
    KNOWLEDGE: "Knowledge assessment",
  };

  const isYuvroQuestion = (q: any) =>
    q.is_yuvro === true ||
    (!q.company && !q.company_name && !q.company_id) ||
    (typeof q.id === "string" && q.id.startsWith("builtin-"));

  const creatorDisplay = (q: any) => {
    const name = q.created_by_name?.trim();
    if (name && name.toLowerCase() !== "tech recruiter") return name;
    try {
      const stored = localStorage.getItem("pl-recruiter-settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name && parsed.name.trim()) {
          const storedEmail = parsed.email;
          if (
            !storedEmail ||
            !q.created_by_email ||
            q.created_by_email.toLowerCase() === storedEmail.toLowerCase()
          ) {
            return parsed.name.trim();
          }
        }
      }
    } catch {}
    if (name) return name;
    if (typeof q.created_by === "object") {
      const objName = `${q.created_by?.first_name || ""} ${q.created_by?.last_name || ""}`.trim();
      if (objName && objName.toLowerCase() !== "tech recruiter") return objName;
      return q.created_by?.email || "";
    }
    return q.created_by_email || "";
  };

  const openNewBuilder = () => {
    // Default category based on active tab (matching recruiter behavior)
    let defaultCat: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE" = "LAB";
    if (activeTab === "SYSTEM_DESIGN") defaultCat = "SYSTEM_DESIGN";
    else if (activeTab === "KNOWLEDGE") defaultCat = "KNOWLEDGE";

    setEditingId(null);
    setFormData(DEFAULT_FORM);
    setVerificationResult(null);
    setVerificationError(null);
    setStep(0);

    // Apply category defaults to form data based on active tab
    if (defaultCat === "SYSTEM_DESIGN") {
      setFormData((prev) => ({ ...prev, type: "SYSTEM_DESIGN" }));
    } else if (defaultCat === "KNOWLEDGE") {
      setFormData((prev) => ({ ...prev, type: "KNOWLEDGE" }));
    }

    setIsBuilderOpen(true);
  };

  const openEditBuilder = (q: any) => {
    setEditingId(q.id);
    setVerificationResult(null);
    setVerificationError(null);

    let initialSolutionFiles = [{ path: "", code: "" }];
    if (Array.isArray(q.solution_files) && q.solution_files.length > 0) {
      initialSolutionFiles = q.solution_files;
    } else if (q.solution && typeof q.solution === "object" && Object.keys(q.solution).length > 0) {
      initialSolutionFiles = Object.entries(q.solution).map(([p, c]) => ({
        path: p,
        code: typeof c === "string" ? c : JSON.stringify(c, null, 2),
      }));
    }

    setFormData({
      title: q.title || "",
      description: q.description || "",
      difficulty: q.difficulty || "HARD",
      domain: q.domain || "ERP",
      type: q.type || "BACKEND",
      experience: q.experience || "MID_LEVEL",
      scenario: q.scenario || "BUG_FIXING",
      marks: q.marks || 30,
      duration_minutes: q.duration_minutes || 60,
      git_repo_starter_url:
        q.git_repo_starter_url || "https://github.com/yuvrosoftwarecode/evaluation_django",
      git_repo_starter_branch: q.git_repo_starter_branch || "main",
      startup_command:
        q.startup_command || "python manage.py migrate && python manage.py runserver 0.0.0.0:8010",
      test_command: q.test_command || "python yuvro_scoring_rules/main_test.py",
      connection_url: q.connection_url || "",
      allow_task_selection: q.allow_task_selection !== false,
      programming_languages: q.programming_languages || ["PYTHON"],
      databases: q.databases || ["SQLITE"],
      backend_frameworks: (q.backend_frameworks || []).map((f: string) =>
        f === "DJANGO_REST_FRAMEWOR" ? "DJANGO_REST_FRAMEWORK" : f,
      ),
      frontend_frameworks: q.frontend_frameworks || [],
      solution_files: initialSolutionFiles,
      tasks: (q.tasks || []).map((t: any, i: number) => ({
        ...t,
        id: t.id || `task_${i}`,
        scoring_rules: t.scoring_rules || {
          logic_score: t.marks || 10,
          clean_code: 0,
          visual_accuracy: 0,
        },
        parent_task_id:
          t.parent_task_id ||
          t.scoring_rules?.parent_task_id ||
          (typeof t.parent_task === "string" ? t.parent_task : t.parent_task?.id) ||
          null,
      })),
    });
    setStep(0);
    setIsBuilderOpen(true);
  };

  const closeBuilder = () => {
    setIsBuilderOpen(false);
    setEditingId(null);
    setVerificationResult(null);
    setVerificationError(null);
  };

  const applyDjangoPreset = () => {
    setFormData((prev: any) => ({
      ...prev,
      type: "BACKEND",
      domain: prev.domain && prev.domain !== "OTHER" ? prev.domain : "ERP",
      experience: "MID_LEVEL",
      difficulty: "HARD",
      scenario: "BUG_FIXING",
      marks: 30,
      duration_minutes: 60,
      git_repo_starter_url: "https://github.com/yuvrosoftwarecode/evaluation_django",
      git_repo_starter_branch: prev.git_repo_starter_branch?.startsWith("feature/")
        ? prev.git_repo_starter_branch
        : "feature/",
      startup_command: "python manage.py migrate && python manage.py runserver 0.0.0.0:8010",
      test_command: "python yuvro_scoring_rules/main_test.py",
      programming_languages: ["PYTHON"],
      databases: ["SQLITE"],
      backend_frameworks: ["DJANGO", "DJANGO_REST_FRAMEWORK"],
      frontend_frameworks: [],
    }));
  };

  const addSolutionFile = () => {
    setFormData((prev: any) => ({
      ...prev,
      solution_files: [...(prev.solution_files || []), { path: "", code: "" }],
    }));
  };

  const removeSolutionFile = (index: number) => {
    setFormData((prev: any) => {
      const updated = (prev.solution_files || []).filter((_: any, i: number) => i !== index);
      return {
        ...prev,
        solution_files: updated.length > 0 ? updated : [{ path: "", code: "" }],
      };
    });
  };

  const updateSolutionFile = (index: number, field: "path" | "code", value: string) => {
    setFormData((prev: any) => {
      const files = [...(prev.solution_files || [])];
      if (!files[index]) files[index] = { path: "", code: "" };
      files[index] = { ...files[index], [field]: value };
      return { ...prev, solution_files: files };
    });
  };

  const handleVerify = async () => {
    if (!formData.git_repo_starter_url) {
      setVerificationError("Git Repo Starter URL is required for verification.");
      return;
    }

    const filesWithCode = (formData.solution_files || []).filter((f: any) => f.code?.trim());
    const unpathed = filesWithCode.find((f: any) => !f.path?.trim());
    if (unpathed) {
      setVerificationError(
        "Please specify the Target File Path for all solution code files (e.g. folder/file.py).",
      );
      return;
    }

    const filesMap: Record<string, string> = {};
    filesWithCode.forEach((f: any) => {
      filesMap[f.path.trim()] = f.code;
    });

    setIsVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);

    try {
      const res = await questionBankService.verifyLabQuestion({
        git_repo_starter_url: formData.git_repo_starter_url,
        git_repo_starter_branch: formData.git_repo_starter_branch || "main",
        test_command: formData.test_command || "python yuvro_scoring_rules/main_test.py",
        solution_files: filesMap,
      });
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationError(err?.message || "Verification request failed. Check server logs.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportFixture = async (id: string, title: string) => {
    try {
      const res = await questionBankService.exportFixture(id);
      alert(`✅ Fixture exported successfully to:\n${res.file_path}`);
    } catch (err: any) {
      alert(`❌ Failed to export fixture: ${err?.message || err}`);
    }
  };

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

  const handleSave = () => {
    if (!formData.title?.trim()) {
      alert("Please provide a Title for the question.");
      setStep(0);
      return;
    }
    if (!formData.description?.trim()) {
      alert("Please provide a Description for the question.");
      setStep(0);
      return;
    }

    const preparedTasks = (formData.tasks || []).map((t: any, index: number) => {
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
          const dbs = formData.databases || [];
          if (dbs.includes("MONGODB")) {
            solutionObj = { "query.js": trimmed };
          } else if (
            dbs.includes("MYSQL") ||
            dbs.includes("POSTGRESQL") ||
            dbs.includes("SQLITE")
          ) {
            solutionObj = { "query.sql": trimmed };
          } else {
            solutionObj = { code: trimmed };
          }
        } else {
          solutionObj = {};
        }
      }
      const pId =
        t.parent_task_id ||
        (typeof t.parent_task === "string" ? t.parent_task : t.parent_task?.id) ||
        null;
      return {
        ...t,
        order_index: index,
        solution: solutionObj,
        parent_task_id: pId,
        parent_task: pId,
        scoring_rules: {
          logic_score: t.scoring_rules?.logic_score ?? t.marks ?? 10,
          clean_code: t.scoring_rules?.clean_code ?? 0,
          visual_accuracy: t.scoring_rules?.visual_accuracy ?? 0,
          system_query: "N/A",
          expected_result: "N/A",
          parent_task_id: pId,
        },
      };
    });

    const sanitizedBackendFrameworks = (formData.backend_frameworks || []).map((f: string) =>
      f === "DJANGO_REST_FRAMEWOR" ? "DJANGO_REST_FRAMEWORK" : f,
    );

    const solutionMap: Record<string, string> = {};
    (formData.solution_files || []).forEach((f: any) => {
      if (f.path?.trim() && f.code) {
        solutionMap[f.path.trim()] = f.code;
      }
    });

    const payload = {
      ...formData,
      backend_frameworks: sanitizedBackendFrameworks,
      tasks: preparedTasks,
      domain: formData.domain || "ERP",
      solution: solutionMap,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const updateTask = (index: number, field: string, value: any) => {
    const newTasks = [...formData.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setFormData({ ...formData, tasks: newTasks });
  };

  const removeTask = (index: number) => {
    const newTasks = formData.tasks.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, tasks: newTasks });
  };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [
        ...formData.tasks,
        {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: "",
          description: "",
          solution: "",
          difficulty: "EASY",
          marks: 10,
          duration_minutes: 15,
          order_index: formData.tasks.length,
          parent_task_id: null,
          scoring_rules: {
            logic_score: 10,
            clean_code: 0,
            visual_accuracy: 0,
          },
        },
      ],
    });
  };

  // ==========================================
  // ==========================================
  // QUESTION BUILDER VIEW (matches recruiter side UI)
  // ==========================================
  if (isBuilderOpen) {
    let defaultCat: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE" = "LAB";
    if (activeTab === "SYSTEM_DESIGN") defaultCat = "SYSTEM_DESIGN";
    else if (activeTab === "KNOWLEDGE") defaultCat = "KNOWLEDGE";

    return (
      <div className="recruiter-theme qb-theme min-w-0 px-5 py-8 lg:px-10">
        <QuestionBuilder
          initialCategory={defaultCat}
          editingId={editingId}
          initialData={editingId ? questions.find((q: any) => q.id === editingId) : undefined}
          courses={courses}
          onClose={() => {
            setIsBuilderOpen(false);
            setEditingId(null);
          }}
          onSuccess={(msg) => {
            toast.success(msg);
            queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
            queryClient.invalidateQueries({ queryKey: ["knowledgeQuestions"] });
            queryClient.invalidateQueries({ queryKey: ["systemDesignQuestions"] });
            setEditingId(null);
          }}
        />
      </div>
    );
  }

  // ==========================================
  // QUESTION BANK LIST VIEW
  // ==========================================
  return (
    <AdminShell breadcrumb={["Engineering", "Question Bank"]}>
      <div className="recruiter-theme qb-theme mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-8 text-foreground">Question bank</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Browse and manage questions for candidate evaluations
          </p>
        </div>
        <Button onClick={openNewBuilder} className="rec-btn shrink-0">
          Add question
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Question categories"
        className="recruiter-theme qb-theme mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border pb-1"
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {(
            [
              { key: "ALL", label: "All questions", count: totalCount },
              { key: "LAB", label: "Engineering labs", count: labCount },
              { key: "SYSTEM_DESIGN", label: "System design", count: systemDesignCount },
              { key: "KNOWLEDGE", label: "Knowledge assessment", count: knowledgeCount },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              variant="ghost"
              onClick={() => handleTabChange(tab.key)}
              className={`qb-tab -mb-px h-auto rounded-none border-b-2 px-0 pb-3 pt-0 text-[15px] leading-5 ${activeTab === tab.key ? "border-primary font-medium text-foreground" : "border-transparent font-normal text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>

        {/* Source Toggle: Yuvro Library vs Recruiters */}
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              questionSource === "yuvro" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Yuvro
          </span>
          <Switch
            aria-label="Show recruiter questions"
            checked={questionSource === "recruiter"}
            onCheckedChange={(checked) => handleSourceChange(checked ? "recruiter" : "yuvro")}
          />
          <span
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              questionSource === "recruiter" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5 text-primary" />
            Recruiters
          </span>
        </div>
      </div>

      <div className="qb-filters mb-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search questions"
          placeholder="Search by title, description or domain…"
          className="qb-filter h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-[15px] text-foreground placeholder:text-muted-foreground"
        />
        <select
          aria-label="Domain"
          value={selectedDomain}
          onChange={(event) => setSelectedDomain(event.target.value)}
          className="qb-filter h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="ALL">All domains</option>
          {DOMAINS.map((domain) => (
            <option key={domain.value} value={domain.value}>
              {domain.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Format"
          value={selectedFormat}
          onChange={(event) => setSelectedFormat(event.target.value)}
          className="qb-filter h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="ALL">All formats</option>
          <option value="LAB">Engineering lab</option>
          <option value="SYSTEM_DESIGN">System design</option>
          <option value="MCQ">MCQ</option>
          <option value="MULTIPLE_SELECT">Multiple select</option>
          <option value="DESCRIPTION">Description</option>
          <option value="CODING">Coding</option>
        </select>
        <select
          aria-label="Course"
          value={selectedCourse}
          onChange={(event) => setSelectedCourse(event.target.value)}
          className="qb-filter h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="ALL">All courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Difficulty"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
          className="qb-filter h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="All">All difficulty</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading questions...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {paginatedQuestions.map((q: any) => (
            <QuestionCardItem
              key={`${q.questionCategory}-${q.id}`}
              q={q}
              loadingEditId={null}
              onPreview={handleOpenPreview}
              onEdit={(item) => {
                openEditBuilder(item);
              }}
              onDelete={(item) => {
                setDeletingQuestion({
                  id: item.id,
                  title: item.title,
                  category: item.questionCategory || "LAB",
                });
              }}
            />
          ))}
        </div>
      )}

      {filteredQuestions.length === 0 && (
        <div className="col-span-2 p-8 text-center text-muted-foreground">
          No questions match your filters
        </div>
      )}

      {totalFilteredCount > 0 && (
        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row border-t border-border pt-6">
          <div className="text-[13px] text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-muted-foreground">
              {Math.min((page - 1) * pageSize + 1, totalFilteredCount)}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-muted-foreground">
              {Math.min(page * pageSize, totalFilteredCount)}
            </span>{" "}
            of <span className="font-semibold text-muted-foreground">{totalFilteredCount}</span>{" "}
            questions
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-background transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((pg) => {
                if (totalPages <= 7) return true;
                return pg === 1 || pg === totalPages || Math.abs(pg - page) <= 1;
              })
              .map((pg, index, array) => {
                const prevPage = array[index - 1];
                const showEllipsis = prevPage && pg - prevPage > 1;
                return (
                  <div key={pg} className="flex items-center gap-1.5">
                    {showEllipsis && (
                      <span className="px-1 text-[12px] text-muted-foreground">...</span>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => setPage(pg)}
                      className={`h-8 w-8 rounded-lg text-[12px] font-medium transition ${
                        page === pg
                          ? "bg-background text-muted-foreground font-semibold"
                          : "border border-border bg-background text-muted-foreground hover:bg-background "
                      }`}
                    >
                      {pg}
                    </Button>
                  </div>
                );
              })}

            <Button
              variant="ghost"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-background transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Preview Question Modal */}
      <Dialog open={!!previewQuestion} onOpenChange={(open) => !open && setPreviewQuestion(null)}>
        <DialogContent className="recruiter-theme qb-theme qb-dialog sm:max-w-[700px] w-full bg-background border-border text-muted-foreground max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-border p-6 shrink-0 pr-12">
            <div className="text-[16px] font-semibold text-muted-foreground truncate">
              {previewQuestion?.title ||
                previewQuestion?.text ||
                previewQuestion?.content ||
                "Preview"}
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
          <div className="border-t border-border p-5 flex justify-end shrink-0 bg-background">
            <Button
              variant="ghost"
              onClick={() => setPreviewQuestion(null)}
              className="rounded-md bg-background text-muted-foreground px-5 py-2.5 text-[13px] font-medium hover:bg-background transition-colors"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Question Confirmation Modal */}
      <Dialog open={!!deletingQuestion} onOpenChange={(open) => !open && setDeletingQuestion(null)}>
        <DialogContent className="recruiter-theme qb-theme qb-dialog sm:max-w-[440px] w-full bg-background border-border text-muted-foreground p-6 rounded-xl">
          <div className="flex flex-col items-center text-center">
            <DialogHeader className="p-0 text-center">
              <DialogTitle className="text-[18px] font-semibold text-muted-foreground text-center">
                Delete question
              </DialogTitle>
            </DialogHeader>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-muted-foreground">
                "{deletingQuestion?.title}"
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="ghost"
              onClick={() => setDeletingQuestion(null)}
              className="rounded-md bg-background text-muted-foreground px-5 py-2.5 text-[13px] font-medium hover:bg-background transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                deleteMutation.mutate(deletingQuestion!.id);
                setDeletingQuestion(null);
              }}
              disabled={deleteMutation.isPending}
              className="rounded-md bg-destructive text-destructive-foreground px-5 py-2.5 text-[13px] font-medium hover:bg-destructive/10 transition-colors"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

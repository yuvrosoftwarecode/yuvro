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
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { questionBankService } from "@/services/questionBankService";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

const PROGRAMMING_LANGUAGES = ["C", "C++", "Python", "Java", "SQL", "Bash", "JavaScript", "TypeScript"];
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

function QuestionsPage() {
  const queryClient = useQueryClient();
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["labQuestions"],
    queryFn: () => questionBankService.getLabQuestions(),
  });

  // Builder View Mode States
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(DEFAULT_FORM);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedDomain, setSelectedDomain] = useState("ALL");
  const [selectedType, setSelectedType] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, category, selectedDomain, selectedType, difficulty]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q: any) => {
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
        selectedDomain === "ALL" ||
        q.domain?.toUpperCase() === selectedDomain.toUpperCase();

      const matchType =
        selectedType === "All" ||
        q.scenario?.toLowerCase().includes(selectedType.toLowerCase().replace(/\s+/g, "_")) ||
        q.type?.toLowerCase().includes(selectedType.toLowerCase().replace(/\s+/g, "_"));

      const matchDifficulty =
        difficulty === "All" || q.difficulty?.toUpperCase() === difficulty.toUpperCase();

      return matchSearch && matchCategory && matchDomain && matchType && matchDifficulty;
    });
  }, [questions, search, category, selectedDomain, selectedType, difficulty]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));

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
    if (window.confirm(`Are you sure you want to delete "${q.title}"?\nThis action cannot be undone.`)) {
      deleteMutation.mutate(q.id);
    }
  };

  const openNewBuilder = () => {
    setEditingId(null);
    setFormData(DEFAULT_FORM);
    setVerificationResult(null);
    setVerificationError(null);
    setStep(0);
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
      git_repo_starter_url: q.git_repo_starter_url || "https://github.com/yuvrosoftwarecode/evaluation_django",
      git_repo_starter_branch: q.git_repo_starter_branch || "main",
      startup_command: q.startup_command || "python manage.py migrate && python manage.py runserver 0.0.0.0:8010",
      test_command: q.test_command || "python yuvro_scoring_rules/main_test.py",
      connection_url: q.connection_url || "",
      allow_task_selection: q.allow_task_selection !== false,
      programming_languages: q.programming_languages || ["PYTHON"],
      databases: q.databases || ["SQLITE"],
      backend_frameworks: (q.backend_frameworks || []).map((f: string) =>
        f === "DJANGO_REST_FRAMEWOR" ? "DJANGO_REST_FRAMEWORK" : f
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
      setVerificationError("Please specify the Target File Path for all solution code files (e.g. folder/file.py).");
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
  // FULL PAGE STEPPER BUILDER VIEW
  // ==========================================
  if (isBuilderOpen) {
    return (
      <AdminShell
        title={editingId ? `Edit Question: ${formData.title || "Untitled"}` : "New Lab Question"}
        breadcrumb={["Engineering", "Question Bank", editingId ? "Edit" : "New"]}
        right={
          <div className="flex items-center gap-2">
            {editingId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const q = questions.find((item: any) => item.id === editingId);
                  if (q) handleDelete(q);
                }}
                disabled={deleteMutation.isPending}
                className="text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Question
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeBuilder}
              className="text-xs gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Question & Export Fixture"}
            </Button>
          </div>
        }
      >
        {/* Step Navigation Wizard Bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition cursor-pointer select-none ${
                  i === step
                    ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                    : i < step
                    ? "border-success/40 text-success hover:bg-success/5"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full border text-[10px]">
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {s}
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* STEP 0: BASIC INFO & REPOSITORY CONFIGURATION */}
        {step === 0 && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* General Information Panel */}
              <Panel
                title="General Information"
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyDjangoPreset}
                    className="text-xs h-7 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Django Practical Lab Preset
                  </Button>
                }
              >
                <div className="space-y-4">
                  <Field label="Question Title *">
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Three-Way Procurement Matching & Approval Hierarchy"
                    />
                  </Field>

                  <Field label="Description & Background *">
                    <Textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed scenario overview, background context, and problem statement..."
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Domain / Industry">
                      <select
                        value={formData.domain}
                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        {DOMAINS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Difficulty">
                      <select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                    </Field>

                    <Field label="Lab Role / Type">
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        {LAB_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Field label="Experience">
                      <select
                        value={formData.experience}
                        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        <option value="FRESHER">Fresher</option>
                        <option value="MID_LEVEL">Mid Level</option>
                        <option value="SENIOR">Senior</option>
                      </select>
                    </Field>

                    <Field label="Scenario">
                      <select
                        value={formData.scenario}
                        onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        {SCENARIOS.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Total Marks">
                      <Input
                        type="number"
                        value={formData.marks}
                        onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 0 })}
                      />
                    </Field>

                    <Field label="Duration (min)">
                      <Input
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) =>
                          setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })
                        }
                      />
                    </Field>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <input
                      type="checkbox"
                      id="allow_task_selection"
                      checked={formData.allow_task_selection}
                      onChange={(e) => setFormData({ ...formData, allow_task_selection: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer"
                    />
                    <label
                      htmlFor="allow_task_selection"
                      className="text-xs text-muted-foreground cursor-pointer select-none"
                    >
                      Allow recruiters and candidates to select individual sub-tasks from this lab during evaluations
                    </label>
                  </div>
                </div>
              </Panel>

              {/* Starter Repository & Runtime Configuration */}
              <Panel title="Starter Repository & Runtime Commands">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Field
                        label="Git Repo Starter URL"
                        hint="The GitHub repository containing the starter boilerplate and buggy code."
                      >
                        <Input
                          value={formData.git_repo_starter_url}
                          onChange={(e) =>
                            setFormData({ ...formData, git_repo_starter_url: e.target.value })
                          }
                          placeholder="https://github.com/..."
                        />
                      </Field>
                    </div>
                    <div>
                      <Field label="Starter Branch" hint="Target feature branch (e.g. main or feature/xyz)">
                        <Input
                          value={formData.git_repo_starter_branch}
                          onChange={(e) =>
                            setFormData({ ...formData, git_repo_starter_branch: e.target.value })
                          }
                          placeholder="main"
                        />
                      </Field>
                    </div>
                  </div>

                  <Field
                    label="Startup Command"
                    hint="Executed when the candidate boots their IDE container or terminal."
                  >
                    <Input
                      value={formData.startup_command}
                      onChange={(e) => setFormData({ ...formData, startup_command: e.target.value })}
                      placeholder="e.g. python manage.py migrate && python manage.py runserver 0.0.0.0:8010"
                    />
                  </Field>

                  <Field
                    label="Test Command"
                    hint="Grading execution command called when candidate clicks 'Run Test' or submits."
                  >
                    <Input
                      value={formData.test_command}
                      onChange={(e) => setFormData({ ...formData, test_command: e.target.value })}
                      placeholder="e.g. python yuvro_scoring_rules/main_test.py"
                    />
                  </Field>

                  {formData.databases?.some((d: string) =>
                    ["MYSQL", "POSTGRESQL", "MONGODB"].includes(d)
                  ) && (
                    <Field
                      label="Evaluation Database Connection URL"
                      hint="Candidates will execute queries against this managed test database."
                    >
                      <Input
                        placeholder="mysql://avnadmin:password@mysql-xyz.aivencloud.com:24128/defaultdb"
                        value={formData.connection_url || ""}
                        onChange={(e) => setFormData({ ...formData, connection_url: e.target.value })}
                      />
                    </Field>
                  )}
                </div>
              </Panel>

              {/* Technology Stack Panel */}
              <Panel title="Technology Stack">
                <div className="space-y-4">
                  <MultiSelectPills
                    label="Programming Languages"
                    options={PROGRAMMING_LANGUAGES}
                    value={formData.programming_languages}
                    onChange={(val) => setFormData({ ...formData, programming_languages: val })}
                  />

                  <MultiSelectPills
                    label="Databases"
                    options={DATABASES}
                    value={formData.databases}
                    onChange={(val) => setFormData({ ...formData, databases: val })}
                  />

                  <MultiSelectPills
                    label="Backend Frameworks"
                    options={BACKEND_FRAMEWORKS}
                    value={formData.backend_frameworks}
                    onChange={(val) => setFormData({ ...formData, backend_frameworks: val })}
                  />

                  <MultiSelectPills
                    label="Frontend Frameworks"
                    options={FRONTEND_FRAMEWORKS}
                    value={formData.frontend_frameworks}
                    onChange={(val) => setFormData({ ...formData, frontend_frameworks: val })}
                  />
                </div>
              </Panel>

              {/* Step Navigation Bottom Bar */}
              <div className="flex items-center justify-between border-t border-border/70 pt-4">
                <Button variant="outline" size="sm" onClick={closeBuilder}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!formData.title?.trim()) {
                      alert("Please provide a Title before proceeding.");
                      return;
                    }
                    setStep(1);
                  }}
                  className="gap-2 text-xs"
                >
                  Next: Tasks ({formData.tasks.length}) <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Right Column: Live Summary / Preview Card */}
            <div className="space-y-4">
              <Panel title="Lab Summary Preview">
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-sm text-foreground block truncate">
                      {formData.title || "Untitled Question"}
                    </span>
                    <p className="text-muted-foreground mt-1 line-clamp-3">
                      {formData.description || "No description provided yet."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                    <Badge tone="primary">{formData.domain || "OTHER"}</Badge>
                    <Badge tone={formData.difficulty === "HARD" ? "destructive" : formData.difficulty === "MEDIUM" ? "warning" : "success"}>
                      {formData.difficulty}
                    </Badge>
                    <Badge tone="ui">{formData.scenario}</Badge>
                    <Badge tone="muted">{formData.type}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                    <div>
                      Marks: <strong className="text-foreground">{formData.marks}</strong>
                    </div>
                    <div>
                      Duration: <strong className="text-foreground">{formData.duration_minutes}m</strong>
                    </div>
                    <div>
                      Tasks: <strong className="text-foreground">{formData.tasks.length}</strong>
                    </div>
                    <div className="truncate">
                      Branch: <strong className="text-foreground truncate">{formData.git_repo_starter_branch}</strong>
                    </div>
                  </div>

                  {formData.backend_frameworks?.length > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-[10px] uppercase text-muted-foreground block mb-1">Frameworks</span>
                      <div className="flex flex-wrap gap-1">
                        {formData.backend_frameworks.map((f: string) => (
                          <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 border border-border">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="w-full mt-3 text-xs gap-1.5"
                  >
                    Continue to Tasks →
                  </Button>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* STEP 1: TASKS & SCORING RULES */}
        {step === 1 && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div>
                <h3 className="font-semibold text-base">Question Tasks</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define sub-tasks, evaluation queries, requirements, and scoring weightings.
                </p>
              </div>
              <Button type="button" onClick={addTask} size="sm" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Task
              </Button>
            </div>

            {formData.tasks.length === 0 ? (
              <div className="p-12 border border-dashed rounded-xl text-center space-y-3 bg-muted/10">
                <Code2 className="h-8 w-8 mx-auto text-muted-foreground/60" />
                <h4 className="font-medium text-sm">No tasks added yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click the button below to add sub-tasks with instructions and scoring rules.
                </p>
                <Button type="button" onClick={addTask} size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add First Task
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.tasks.map((task: any, index: number) => (
                  <Panel
                    key={task.id || index}
                    title={`Task ${index + 1}: ${task.title || "Untitled Task"}`}
                    action={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeTask(index)}
                        title="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  >
                    <div className="space-y-4 pt-1">
                      <Field label="Task Title *">
                        <Input
                          value={task.title}
                          onChange={(e) => updateTask(index, "title", e.target.value)}
                          placeholder="e.g. Mid-Cycle Proration Calculation"
                        />
                      </Field>

                      <Field label="Description & Requirements">
                        <Textarea
                          rows={3}
                          value={task.description}
                          onChange={(e) => updateTask(index, "description", e.target.value)}
                          placeholder="Detailed task description, edge-case constraints, and output schema expectations..."
                        />
                      </Field>

                      <Field
                        label="Solution / Reference Query"
                        hint="Target reference query or working snippet for grading verification."
                      >
                        <Textarea
                          rows={3}
                          className="font-mono text-xs"
                          placeholder="e.g. SELECT * FROM billing_subscription; or python logic snippet or JSON"
                          value={getSolutionString(task.solution)}
                          onChange={(e) => updateTask(index, "solution", e.target.value)}
                        />
                      </Field>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Field label="Difficulty">
                          <select
                            value={task.difficulty}
                            onChange={(e) => updateTask(index, "difficulty", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          >
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                          </select>
                        </Field>

                        <Field label="Task Marks">
                          <Input
                            type="number"
                            value={task.marks}
                            onChange={(e) => updateTask(index, "marks", parseInt(e.target.value) || 0)}
                          />
                        </Field>

                        <Field label="Logic Score">
                          <Input
                            type="number"
                            value={task.scoring_rules?.logic_score ?? task.marks ?? 10}
                            onChange={(e) =>
                              updateTask(index, "scoring_rules", {
                                ...(task.scoring_rules || {}),
                                logic_score: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </Field>

                        <Field label="Duration (min)">
                          <Input
                            type="number"
                            value={task.duration_minutes}
                            onChange={(e) =>
                              updateTask(index, "duration_minutes", parseInt(e.target.value) || 0)
                            }
                          />
                        </Field>
                      </div>

                      <Field
                        label="Linked Task / Prerequisite Dependency"
                        hint="Selecting this task when creating an evaluation will automatically select its prerequisite task."
                      >
                        <select
                          value={task.parent_task_id || task.parent_task || ""}
                          onChange={(e) => updateTask(index, "parent_task_id", e.target.value || null)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="">None (Independent Task)</option>
                          {formData.tasks.map((otherTask: any, otherIdx: number) => {
                            if (otherIdx === index) return null;
                            const otherId = otherTask.id || `task_idx_${otherIdx}`;
                            return (
                              <option key={otherId} value={otherId}>
                                Task {otherIdx + 1}: {otherTask.title || `Task ${otherIdx + 1}`}
                              </option>
                            );
                          })}
                        </select>
                      </Field>
                    </div>
                  </Panel>
                ))}
              </div>
            )}

            {/* Bottom Navigation */}
            <div className="flex items-center justify-between border-t border-border/70 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(0)}>
                ← Back to Basic info
              </Button>
              <Button type="button" onClick={() => setStep(2)} className="gap-2 text-xs">
                Next: Verification & Solution <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PRE-PUBLISH VERIFICATION & REFERENCE SOLUTION */}
        {step === 2 && (
          <div className="space-y-6 max-w-4xl">
            <Panel
              title="Pre-Publish Lab Verification Suite (0/30 vs 30/30)"
              action={
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" /> Run Verification
                    </>
                  )}
                </Button>
              }
            >
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  The verification suite executes automated tests in an isolated sandbox. It verifies that candidate
                  starter code correctly fails with <strong>0 marks</strong> and your reference solution scores a perfect{" "}
                  <strong>100%</strong> before saving.
                </p>

                {/* Reference Solution Files */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-foreground">
                        Reference Solution Files
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Provide one or more solution files to test and verify the lab before publishing.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSolutionFile}
                      className="text-xs h-7 gap-1.5 border-dashed"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Another File
                    </Button>
                  </div>

                  {(formData.solution_files || [{ path: "", code: "" }]).map((file: any, index: number) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-border/70 bg-card/40 space-y-3 relative"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-border/40">
                        <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Code2 className="h-3.5 w-3.5 text-primary" />
                          Solution File #{index + 1}
                        </span>
                        {formData.solution_files && formData.solution_files.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSolutionFile(index)}
                            className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10 gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove File
                          </Button>
                        )}
                      </div>

                      <Field
                        label="Solution Target File Path *"
                        hint="The relative path inside the repo where this solution should be injected (e.g. folder/file.py)."
                      >
                        <Input
                          value={file.path || ""}
                          onChange={(e) => updateSolutionFile(index, "path", e.target.value)}
                          placeholder="folder/file.py"
                        />
                      </Field>

                      <Field
                        label="Reference Working Solution Code *"
                        hint="Paste candidate working solution code for this file to test that it scores full marks."
                      >
                        <Textarea
                          rows={7}
                          className="font-mono text-xs"
                          value={file.code || ""}
                          onChange={(e) => updateSolutionFile(index, "code", e.target.value)}
                          placeholder="# Paste working Python / Django solution code here to verify full passing score"
                        />
                      </Field>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSolutionFile}
                    className="w-full text-xs gap-1.5 border-dashed py-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Another File
                  </Button>
                </div>

                {verificationError && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>{verificationError}</span>
                  </div>
                )}

                {verificationResult && (
                  <div
                    className={`p-4 rounded-lg border text-xs space-y-3 ${
                      verificationResult.is_valid
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      {verificationResult.is_valid ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          Verification Passed: Starter Code Failed (0/
                          {verificationResult.starter?.max_score}) & Solution Code Passed (
                          {verificationResult.solution?.score ?? "N/A"}/
                          {verificationResult.solution?.max_score ?? "N/A"})!
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-amber-500 shrink-0" />
                          Verification Incomplete: Starter score {verificationResult.starter?.score}/
                          {verificationResult.starter?.max_score}, Solution score{" "}
                          {verificationResult.solution?.score ?? "N/A"}/
                          {verificationResult.solution?.max_score ?? "N/A"}
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-current/20">
                      <div>
                        <span className="font-semibold block mb-1">Starter Code Test Result:</span>
                        <div className="font-mono text-[11px] p-2.5 rounded bg-background/90 text-foreground border border-border overflow-x-auto max-h-60">
                          <div>
                            Score: {verificationResult.starter?.score}/{verificationResult.starter?.max_score} (
                            {verificationResult.starter?.passed ? "Passed" : "Failed as expected"})
                          </div>
                          {verificationResult.starter?.stdout && (
                            <pre className="mt-1.5 whitespace-pre-wrap text-[10px]">
                              {verificationResult.starter.stdout}
                            </pre>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="font-semibold block mb-1">Reference Solution Test Result:</span>
                        <div className="font-mono text-[11px] p-2.5 rounded bg-background/90 text-foreground border border-border overflow-x-auto max-h-60">
                          {verificationResult.solution ? (
                            <>
                              <div>
                                Score: {verificationResult.solution?.score}/
                                {verificationResult.solution?.max_score} (
                                {verificationResult.solution?.passed ? "100% All Passed" : "Incomplete"})
                              </div>
                              {verificationResult.solution?.stdout && (
                                <pre className="mt-1.5 whitespace-pre-wrap text-[10px]">
                                  {verificationResult.solution.stdout}
                                </pre>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">
                              No solution code provided. Paste solution code above to test full marks.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-border/70 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)}>
                ← Back to Tasks
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : "Save Question & Export Fixture"}
              </Button>
            </div>
          </div>
        )}
      </AdminShell>
    );
  }

  // ==========================================
  // QUESTION BANK LIST VIEW
  // ==========================================
  return (
    <AdminShell
      title="Question Bank"
      breadcrumb={["Engineering", "Question Bank"]}
      right={
        <button
          onClick={openNewBuilder}
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground inline-flex items-center gap-1.5 hover:bg-primary/90 transition cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> New item
        </button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Total items"
          value={isLoading ? "..." : questions.length.toString()}
          color="primary"
          icon={Database}
        />
        <KpiCard
          label="Backend Labs"
          value={isLoading ? "..." : questions.filter((q: any) => q.type === "BACKEND").length.toString()}
          color="ui"
        />
        <KpiCard
          label="Hard Labs"
          value={isLoading ? "..." : questions.filter((q: any) => q.difficulty === "HARD").length.toString()}
          color="warning"
        />
        <KpiCard
          label="Database Labs"
          value={isLoading ? "..." : questions.filter((q: any) => q.type === "DATABASE").length.toString()}
          color="success"
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-xs flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, description, domain…"
              className="bg-transparent outline-none flex-1"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer"
          >
            <option value="All">All categories</option>
            {CATS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer"
          >
            <option value="ALL">All Domains</option>
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer"
          >
            <option value="All">All types</option>
            {TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="text-xs bg-transparent border border-border rounded-md px-2 py-1.5 outline-none cursor-pointer"
          >
            <option value="All">All difficulty</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading questions...</div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {paginatedQuestions.map((q: any) => (
              <div
                key={q.id}
                className="rounded-xl border border-border/60 bg-card/40 p-4 hover:border-primary/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{q.id.substring(0, 8)}...</span>
                    <Badge
                      tone={
                        q.difficulty === "HARD"
                          ? "destructive"
                          : q.difficulty === "MEDIUM"
                          ? "warning"
                          : "success"
                      }
                    >
                      {q.difficulty}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5">{q.title}</h3>
                  {q.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{q.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-3">
                    <Badge tone="primary">{q.domain || "OTHER"}</Badge>
                    {q.scenario && <Badge tone="ui">{q.scenario}</Badge>}
                    {q.type && <Badge tone="muted">{q.type}</Badge>}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-border/40">
                  <span className="text-muted-foreground">
                    Marks <span className="font-mono text-foreground font-semibold">{q.marks || 0}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Duration <span className="font-mono text-foreground font-semibold">{q.duration_minutes || 0}m</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditBuilder(q)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition cursor-pointer"
                      title="Edit question"
                      aria-label="Edit question"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(q)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer disabled:opacity-50"
                      title="Delete question"
                      aria-label="Delete question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredQuestions.length === 0 && (
              <div className="col-span-2 p-8 text-center text-muted-foreground">
                No questions found matching your filters.
              </div>
            )}
          </div>

          {filteredQuestions.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 backdrop-blur p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {(page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, filteredQuestions.length)}
                  </span>{" "}
                  of <span className="font-medium text-foreground">{filteredQuestions.length}</span>{" "}
                  questions
                </span>
                <div className="flex items-center gap-1.5 ml-2">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground outline-none cursor-pointer"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded border border-border hover:bg-accent text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition inline-flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {totalPages <= 7
                    ? Array.from({ length: totalPages }, (_, i) => i + 1).map((item) => (
                        <button
                          key={item}
                          onClick={() => setPage(item)}
                          className={`h-7 w-7 rounded border text-xs font-medium cursor-pointer transition ${
                            page === item
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-accent text-foreground"
                          }`}
                        >
                          {item}
                        </button>
                      ))
                    : Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => {
                          return p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                        })
                        .reduce<(number | string)[]>((acc, p, idx, arr) => {
                          if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
                            acc.push("...");
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((item, idx) =>
                          typeof item === "string" ? (
                            <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                              ...
                            </span>
                          ) : (
                            <button
                              key={item}
                              onClick={() => setPage(item)}
                              className={`h-7 w-7 rounded border text-xs font-medium cursor-pointer transition ${
                                page === item
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border hover:bg-accent text-foreground"
                              }`}
                            >
                              {item}
                            </button>
                          ),
                        )}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded border border-border hover:bg-accent text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition inline-flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { questionBankService } from "@/services/questionBankService";
import { fetchTopics, checkDuplicateQuestion } from "@/lib/recruiter";
import { Button } from "@/components/ui/button";
import { GithubAppIntegration } from "./GithubAppIntegration";
import { toast } from "sonner";
import { labTaskAIService } from "@/services/labTaskAIService";
import { ScoringRulesModal } from "./ScoringRulesModal";
import { Sparkles, RefreshCw } from "lucide-react";


export interface QuestionBuilderProps {
  initialCategory?: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE";
  editingId?: string | null;
  initialData?: any;
  courses: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

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

const PROGRAMMING_LANGUAGES = ["C", "C++", "Python", "Java", "SQL", "Bash", "JavaScript", "TypeScript"];
const DATABASES = ["SQLite", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch"];
const BACKEND_FRAMEWORKS = ["Django", "Django REST Framework", "FastAPI", "Flask", "Spring Boot", "NodeJS", "Express", "NestJS"];
const FRONTEND_FRAMEWORKS = ["React", "NextJS", "Vue", "Angular", "Svelte"];

const STEPS = [
  { id: 0, label: "Basics" },
  { id: 1, label: "Configuration" },
  { id: 2, label: "Tasks" },
  { id: 3, label: "Review" },
];

const categoryLabels: Record<string, string> = {
  LAB: "Engineering lab",
  SYSTEM_DESIGN: "System design",
  KNOWLEDGE: "Knowledge assessment",
};

function MultiSelectPills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
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
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-2 pt-0.5">
        {options.map((opt) => {
          let mappedVal = opt.toUpperCase().replace(/ /g, "_").replace(/\+/g, "P");
          if (opt === "C++") mappedVal = "C++";
          const selected = value.includes(mappedVal);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium border transition cursor-pointer ${
                selected
                  ? "border-primary bg-primary/10 text-foreground font-semibold"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
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

export function QuestionBuilder({
  initialCategory = "LAB",
  editingId = null,
  initialData = null,
  courses = [],
  onClose,
  onSuccess,
}: QuestionBuilderProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [category, setCategory] = useState<"LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE">(initialCategory);

  // LAB STATE
  const [labFormData, setLabFormData] = useState<any>({
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
    github_installation_id: null,
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
  });

  // SYSTEM DESIGN STATE
  const [systemDesignFormData, setSystemDesignFormData] = useState<any>({
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
  });

  // KNOWLEDGE STATE
  const [knowledgeFormData, setKnowledgeFormData] = useState<any>({
    format: "MCQ",
    title: "",
    content: "",
    course: courses.length > 0 ? courses[0].id : "",
    topic: "",
    difficulty: "EASY",
    marks: 1,
    duration_minutes: 5,
    mcq_options: [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
    test_cases: [{ input: "", expected_output: "" }],
    hints: [""],
    solutions: [{ title: "Optimal Solution", language: "python", code: "", is_primary: true }],
  });

  const [availableTopics, setAvailableTopics] = useState<any[]>([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateMeta, setDuplicateMeta] = useState<any>(null);

  // AI Task Assistant State (Step 3)
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [isAIBulkGenerating, setIsAIBulkGenerating] = useState(false);
  const [standardizingIndex, setStandardizingIndex] = useState<number | null>(null);
  const [estimatingIndex, setEstimatingIndex] = useState<number | null>(null);
  const [scoringRulesModalOpen, setScoringRulesModalOpen] = useState(false);
  const [isGeneratingLifecycle, setIsGeneratingLifecycle] = useState(false);


  // Initialize editing data
  useEffect(() => {
    if (!initialData) return;

    if (category === "LAB") {
      setLabFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        domain: initialData.domain || "OTHER",
        difficulty: initialData.difficulty || "EASY",
        type: initialData.type || "BACKEND",
        experience: initialData.experience || "FRESHER",
        scenario: initialData.scenario || "FEATURE_DEVELOPMENT",
        marks: initialData.marks || 10,
        duration_minutes: initialData.duration_minutes || 30,
        git_repo_starter_url: initialData.git_repo_starter_url || "",
        git_repo_starter_branch: initialData.git_repo_starter_branch || "main",
        repo_source_type: initialData.repo_source_type || "ADMIN_SYSTEM",
        github_app_installation: initialData.github_app_installation || null,
        github_installation_id: initialData.github_installation_id || null,
        github_repo_id: initialData.github_repo_id || "",
        startup_command: initialData.startup_command || "",
        test_command: initialData.test_command || "",
        connection_url: initialData.connection_url || "",
        allow_task_selection: initialData.allow_task_selection !== false,
        programming_languages: initialData.programming_languages || [],
        databases: initialData.databases || [],
        backend_frameworks: (initialData.backend_frameworks || []).map((f: string) =>
          f === "DJANGO_REST_FRAMEWOR" ? "DJANGO_REST_FRAMEWORK" : f
        ),
        frontend_frameworks: initialData.frontend_frameworks || [],
        tasks: (initialData.tasks || []).map((t: any, i: number) => ({
          ...t,
          id: t.id || `task_${i}`,
          parent_task_id:
            t.parent_task_id ||
            t.scoring_rules?.parent_task_id ||
            (typeof t.parent_task === "string" ? t.parent_task : t.parent_task?.id) ||
            null,
        })),
      });
    } else if (category === "SYSTEM_DESIGN") {
      setSystemDesignFormData({
        title: initialData.title || "",
        description: initialData.description || initialData.problem || "",
        difficulty: (initialData.difficulty || "MEDIUM").toUpperCase(),
        marks: initialData.marks || 30,
        duration_minutes: initialData.duration_minutes || 45,
        scenario_type: initialData.scenario_type || "Distributed System",
        system_slug: initialData.system_slug || "systemdesign-url-shortener",
        domain: initialData.domain || "BACKEND",
        company: initialData.company || "",
        constraints: Array.isArray(initialData.constraints)
          ? initialData.constraints.join("\n")
          : initialData.constraints || "",
        tasks:
          Array.isArray(initialData.tasks) && initialData.tasks.length > 0
            ? initialData.tasks
            : [
                { id: "t1", title: "HLD Architecture Canvas", description: "Design client DNS, API Gateway, caching layer, and database cluster with replication.", marks: 10 },
                { id: "t2", title: "Database Schema (DBML)", description: "Define relational or NoSQL schema with keys, relationships, and telemetry tables.", marks: 10 },
                { id: "t3", title: "REST API Contracts", description: "Specify endpoints, request schemas, status codes, and error responses.", marks: 5 },
                { id: "t4", title: "Sequence Diagrams", description: "Model the end-to-end request lifecycle and async operations.", marks: 5 },
              ],
      });
    } else if (category === "KNOWLEDGE") {
      const formatStr =
        initialData.format ||
        (initialData.type === "coding"
          ? "CODING"
          : initialData.type === "mcq_multiple"
          ? "MULTIPLE SELECT"
          : initialData.type === "descriptive"
          ? "DESCRIPTION"
          : "MCQ");

      setKnowledgeFormData({
        format: formatStr,
        title: initialData.title || initialData.content || "",
        content: initialData.content || initialData.title || "",
        course: initialData.course || (courses.length > 0 ? courses[0].id : ""),
        topic: initialData.topic || "",
        difficulty: (initialData.difficulty || "EASY").toUpperCase(),
        marks: initialData.marks || 1,
        duration_minutes: initialData.duration_minutes || initialData.duration || 5,
        mcq_options:
          initialData.mcq_options && initialData.mcq_options.length > 0
            ? initialData.mcq_options
            : [
                { text: "", is_correct: true },
                { text: "", is_correct: false },
                { text: "", is_correct: false },
                { text: "", is_correct: false },
              ],
        test_cases:
          (initialData.test_cases || initialData.test_cases_basic) && (initialData.test_cases || initialData.test_cases_basic).length > 0
            ? initialData.test_cases || initialData.test_cases_basic
            : [{ input: "", expected_output: "" }],
        hints: Array.isArray(initialData.hints) && initialData.hints.length > 0 ? initialData.hints : [""],
        solutions:
          Array.isArray(initialData.solutions) && initialData.solutions.length > 0
            ? initialData.solutions
            : initialData.solution_explanation
            ? [{ title: "Optimal Solution", language: "python", code: initialData.solution_explanation, is_primary: true }]
            : [{ title: "Optimal Solution", language: "python", code: "", is_primary: true }],
      });
    }
  }, [initialData, category]);

  // Fetch topics for knowledge course
  useEffect(() => {
    if (category === "KNOWLEDGE" && knowledgeFormData.course) {
      fetchTopics(knowledgeFormData.course).then(setAvailableTopics).catch(console.error);
    } else {
      setAvailableTopics([]);
    }
  }, [category, knowledgeFormData.course]);

  // Duplicate question check for Knowledge Assessment
  useEffect(() => {
    if (category !== "KNOWLEDGE") return;
    const textToCheck = knowledgeFormData.title || knowledgeFormData.content;
    if (!textToCheck || textToCheck.trim().length < 10 || !knowledgeFormData.course) {
      setDuplicateMeta(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const res = await checkDuplicateQuestion(textToCheck, knowledgeFormData.course);
        setDuplicateMeta(res);
      } catch (err) {
        console.error("Duplicate check error", err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [category, knowledgeFormData.title, knowledgeFormData.content, knowledgeFormData.course]);

  // Mutations
  const createLabMutation = useMutation({
    mutationFn: (data: any) => questionBankService.createLabQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      onSuccess("Engineering lab question created");
      onClose();
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to create lab question");
    },
  });

  const updateLabMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => questionBankService.updateLabQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labQuestions"] });
      onSuccess("Engineering lab question updated");
      onClose();
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to update lab question");
    },
  });

  const createSystemDesignMutation = useMutation({
    mutationFn: (data: any) => questionBankService.createSystemDesignQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemDesignQuestions"] });
      onSuccess("System design challenge created");
      onClose();
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to create system design challenge");
    },
  });

  const updateSystemDesignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      questionBankService.updateSystemDesignQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemDesignQuestions"] });
      onSuccess("System design challenge updated");
      onClose();
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to update system design challenge");
    },
  });

  const createKnowledgeMutation = useMutation({
    mutationFn: (data: any) => questionBankService.createKnowledgeQuestion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeQuestions"] });
      onSuccess("Knowledge assessment question created");
      onClose();
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to create knowledge question");
    },
  });

  const updateKnowledgeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      questionBankService.updateKnowledgeQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeQuestions"] });
      onSuccess("Knowledge assessment question updated");
      onClose();
    },
    onError: (err: any) => {
      alert(err?.message || "Failed to update knowledge question");
    },
  });

  // Task Helpers for Lab
  const addLabTask = () => {
    setLabFormData((prev: any) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        {
          id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          title: "",
          description: "",
          solution: "",
          difficulty: "EASY",
          marks: 10,
          duration_minutes: 15,
          order_index: prev.tasks.length,
          parent_task_id: null,
        },
      ],
    }));
  };

  const updateLabTask = (index: number, field: string, val: any) => {
    setLabFormData((prev: any) => {
      const nextTasks = [...prev.tasks];
      nextTasks[index] = { ...nextTasks[index], [field]: val };
      return { ...prev, tasks: nextTasks };
    });
  };

  const removeLabTask = (index: number) => {
    setLabFormData((prev: any) => ({
      ...prev,
      tasks: prev.tasks.filter((_: any, i: number) => i !== index),
    }));
  };

  // AI Task Assistant Helpers for Engineering Labs
  const getLabContext = () => {
    const url = labFormData.git_repo_starter_url || "";
    const cleanRepo = url
      ? url
          .replace(/^https?:\/\/github\.com\//, "")
          .replace(/\.git$/, "")
          .replace(/\/$/, "")
      : "";

    return {
      title: labFormData.title || "Engineering Lab Challenge",
      description: labFormData.description || "",
      difficulty: labFormData.difficulty || "EASY",
      domain: labFormData.domain || "BACKEND",
      type: labFormData.type || "BACKEND",
      scenario: labFormData.scenario || "FEATURE_DEVELOPMENT",
      programming_languages: labFormData.programming_languages || [],
      backend_frameworks: labFormData.backend_frameworks || [],
      frontend_frameworks: labFormData.frontend_frameworks || [],
      databases: labFormData.databases || [],
      git_repo_starter_url: labFormData.git_repo_starter_url || "",
      git_repo_starter_branch: labFormData.git_repo_starter_branch || "main",
      tech_stack: [
        ...(labFormData.programming_languages || []),
        ...(labFormData.databases || []),
        ...(labFormData.backend_frameworks || []),
        ...(labFormData.frontend_frameworks || []),
      ],
      repo_name: cleanRepo,
      repo_description: labFormData.description || "",
    };
  };

  const handleAISuggestTask = async () => {
    setIsAISuggesting(true);
    try {
      const context = getLabContext();
      const res = await labTaskAIService.suggestTask(context, labFormData.tasks, "deepseek");
      setLabFormData((prev: any) => ({
        ...prev,
        tasks: [
          ...prev.tasks,
          {
            id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            title: res.title || "Untitled Task",
            description: res.description || "",
            solution: (res as any).solution || res.solution_code || "",
            difficulty: (res as any).difficulty || "MEDIUM",
            marks: res.marks || 25,
            duration_minutes: (res as any).duration_minutes || res.estimated_minutes || 20,
            order_index: prev.tasks.length,
            parent_task_id: null,
          },
        ],
      }));
      toast.success(`Task suggested: ${res.title}`);
    } catch (err: any) {
      console.error("AI Suggest Task error", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to suggest task.");
    } finally {
      setIsAISuggesting(false);
    }
  };

  const handleAIGenerateBulkTasks = async (count: number) => {
    if (labFormData.tasks.length > 0) {
      const ok = window.confirm(
        `Generate ${count} tasks with AI? This will replace your existing ${labFormData.tasks.length} task(s).`
      );
      if (!ok) return;
    }

    setIsAIBulkGenerating(true);
    try {
      const context = getLabContext();
      const targetMarks = labFormData.marks || 100;
      const res = await labTaskAIService.generateBulkTasks(context, count, targetMarks, "deepseek");
      const taskList = Array.isArray(res.tasks) ? res.tasks : [];
      const newTasks = taskList.map((t: any, idx: number) => ({
        id: `task_${Date.now()}_${idx}`,
        title: t.title || `Task ${idx + 1}`,
        description: t.description || "",
        solution: t.solution || t.solution_code || "",
        difficulty: t.difficulty || (idx === 0 ? "EASY" : idx === taskList.length - 1 ? "HARD" : "MEDIUM"),
        marks: t.marks || Math.round((res.total_marks || targetMarks) / (taskList.length || count)),
        duration_minutes: t.duration_minutes || t.estimated_minutes || 15,
        order_index: idx,
        parent_task_id: idx > 0 ? `task_${Date.now()}_${idx - 1}` : null,
      }));

      setLabFormData((prev: any) => ({
        ...prev,
        tasks: newTasks,
        marks: res.total_marks || prev.marks,
        duration_minutes: res.total_estimated_minutes || prev.duration_minutes,
      }));
      toast.success(`Generated ${newTasks.length} progressive tasks with marks & duration`);
    } catch (err: any) {
      console.error("Bulk tasks error", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to generate bulk tasks.");
    } finally {
      setIsAIBulkGenerating(false);
    }
  };

  const handleAIStandardizeTask = async (index: number) => {
    const currentTask = labFormData.tasks[index];
    if (!currentTask || (!currentTask.title && !currentTask.description)) {
      toast.error("Please enter a title or description first so AI can standardize it.");
      return;
    }

    setStandardizingIndex(index);
    try {
      const context = getLabContext();
      const res = await labTaskAIService.standardizeTask(currentTask, context, "deepseek");
      setLabFormData((prev: any) => {
        const nextTasks = [...prev.tasks];
        nextTasks[index] = {
          ...nextTasks[index],
          title: res.title || nextTasks[index].title,
          description: res.description || nextTasks[index].description,
          marks: res.marks || nextTasks[index].marks,
          duration_minutes: (res as any).duration_minutes || res.estimated_minutes || nextTasks[index].duration_minutes,
          solution: (res as any).solution || res.solution_code || nextTasks[index].solution,
        };
        return { ...prev, tasks: nextTasks };
      });
      toast.success(`Task ${index + 1} standardized`);
    } catch (err: any) {
      console.error("Standardize task error", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to standardize task.");
    } finally {
      setStandardizingIndex(null);
    }
  };

  const handleAIEstimateDuration = async (index: number) => {
    const currentTask = labFormData.tasks[index];
    if (!currentTask || (!currentTask.title && !currentTask.description)) {
      toast.error("Please enter task details first to estimate duration.");
      return;
    }

    setEstimatingIndex(index);
    try {
      const context = getLabContext();
      const res = await labTaskAIService.estimateDuration(currentTask, context);
      updateLabTask(index, "duration_minutes", res.estimated_minutes);
      toast.success(`Estimated: ${res.estimated_minutes} min (${res.complexity})`);
    } catch (err: any) {
      console.error("Estimate duration error", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to estimate duration.");
    } finally {
      setEstimatingIndex(null);
    }
  };

  const handleGenerateLifecycleCommands = async () => {
    setIsGeneratingLifecycle(true);
    try {
      const context = getLabContext();
      let startupCmd = "";
      let testCmd = "";

      try {
        const res = await labTaskAIService.generateLifecycleCommands(context, labFormData.tasks, "deepseek");
        if (res?.startup_command || res?.test_command) {
          startupCmd = res.startup_command || "";
          testCmd = res.test_command || "";
        }
      } catch (backendErr) {
        console.warn("AI lifecycle commands endpoint unreachable, falling back to smart heuristic deduction:", backendErr);
      }

      if (!startupCmd || !testCmd) {
        const langs = (labFormData.programming_languages || []).map((l: string) => l.toLowerCase());
        const beFrameworks = (labFormData.backend_frameworks || []).map((f: string) => f.toLowerCase());
        const feFrameworks = (labFormData.frontend_frameworks || []).map((f: string) => f.toLowerCase());
        const repoStr = (labFormData.git_repo_starter_url || "").toLowerCase();

        const isDjango = beFrameworks.some((f: string) => f.includes("django")) || repoStr.includes("django");
        const isFastAPI = beFrameworks.some((f: string) => f.includes("fastapi")) || repoStr.includes("fastapi");
        const isFlask = beFrameworks.some((f: string) => f.includes("flask")) || repoStr.includes("flask");
        const isSpringBoot = beFrameworks.some((f: string) => f.includes("spring")) || repoStr.includes("spring");
        const isNode = beFrameworks.some((f: string) => f.includes("node") || f.includes("express") || f.includes("nest")) ||
          langs.some((l: string) => l.includes("javascript") || l.includes("typescript")) ||
          feFrameworks.length > 0 || repoStr.includes("node") || repoStr.includes("express");
        const isGo = langs.some((l: string) => l.includes("go") || l === "golang") || repoStr.includes("go");
        const isPython = langs.some((l: string) => l.includes("python")) || repoStr.includes("python");

        if (isDjango) {
          if (!startupCmd) startupCmd = "python manage.py runserver 0.0.0.0:8000";
          if (!testCmd) testCmd = "python manage.py test";
        } else if (isFastAPI) {
          if (!startupCmd) startupCmd = "uvicorn main:app --host 0.0.0.0 --port 8000 --reload";
          if (!testCmd) testCmd = "pytest";
        } else if (isFlask) {
          if (!startupCmd) startupCmd = "python app.py";
          if (!testCmd) testCmd = "pytest";
        } else if (isSpringBoot) {
          if (!startupCmd) startupCmd = "./mvnw spring-boot:run";
          if (!testCmd) testCmd = "./mvnw test";
        } else if (isGo) {
          if (!startupCmd) startupCmd = "go run main.go";
          if (!testCmd) testCmd = "go test ./...";
        } else if (isNode) {
          if (!startupCmd) startupCmd = "npm start";
          if (!testCmd) testCmd = "npm test";
        } else if (isPython) {
          if (!startupCmd) startupCmd = "python main.py";
          if (!testCmd) testCmd = "pytest";
        } else {
          if (!startupCmd) startupCmd = "npm start";
          if (!testCmd) testCmd = "npm test";
        }
      }

      setLabFormData((prev: any) => ({
        ...prev,
        startup_command: startupCmd,
        test_command: testCmd,
      }));
      toast.success("Lifecycle commands generated successfully");
    } catch (err: any) {
      console.error("Failed to generate lifecycle commands", err);
      toast.error(err?.message || "Failed to generate lifecycle commands.");
    } finally {
      setIsGeneratingLifecycle(false);
    }
  };


  // Task Helpers for System Design
  const addSystemDesignTask = () => {
    setSystemDesignFormData((prev: any) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        {
          id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: "",
          description: "",
          marks: 10,
        },
      ],
    }));
  };

  const updateSystemDesignTask = (index: number, field: string, val: any) => {
    setSystemDesignFormData((prev: any) => {
      const nextTasks = [...prev.tasks];
      nextTasks[index] = { ...nextTasks[index], [field]: val };
      return { ...prev, tasks: nextTasks };
    });
  };

  const removeSystemDesignTask = (index: number) => {
    setSystemDesignFormData((prev: any) => ({
      ...prev,
      tasks: prev.tasks.filter((_: any, i: number) => i !== index),
    }));
  };

  // Knowledge Options helpers
  const handleOptionChange = (idx: number, field: "text" | "is_correct", val: any) => {
    setKnowledgeFormData((prev: any) => {
      const opts = [...prev.mcq_options];
      if (field === "is_correct" && prev.format === "MCQ" && val === true) {
        opts.forEach((o) => (o.is_correct = false));
      }
      opts[idx] = { ...opts[idx], [field]: val };
      return { ...prev, mcq_options: opts };
    });
  };

  const addKnowledgeOption = () => {
    setKnowledgeFormData((prev: any) => ({
      ...prev,
      mcq_options: [...prev.mcq_options, { text: "", is_correct: false }],
    }));
  };

  const removeKnowledgeOption = (idx: number) => {
    if (knowledgeFormData.mcq_options.length <= 2) return;
    setKnowledgeFormData((prev: any) => ({
      ...prev,
      mcq_options: prev.mcq_options.filter((_: any, i: number) => i !== idx),
    }));
  };

  // Submit Handler
  const handleSave = () => {
    if (category === "LAB") {
      if (!labFormData.title.trim()) {
        setCurrentStep(0);
        return;
      }

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

      if (editingId) {
        updateLabMutation.mutate({ id: editingId, data: payload });
      } else {
        createLabMutation.mutate(payload);
      }
    } else if (category === "SYSTEM_DESIGN") {
      if (!systemDesignFormData.title.trim()) {
        setCurrentStep(0);
        return;
      }

      const rawConstraints =
        typeof systemDesignFormData.constraints === "string"
          ? systemDesignFormData.constraints
              .split("\n")
              .map((s: string) => s.trim())
              .filter(Boolean)
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

      if (editingId) {
        updateSystemDesignMutation.mutate({ id: editingId, data: payload });
      } else {
        createSystemDesignMutation.mutate(payload);
      }
    } else {
      const qTitle = knowledgeFormData.title.trim() || knowledgeFormData.content.trim();
      if (!qTitle) {
        setCurrentStep(0);
        return;
      }

      const payload: any = {
        title: qTitle,
        content: knowledgeFormData.content.trim() || qTitle,
        format: knowledgeFormData.format || "MCQ",
        course: knowledgeFormData.course || "GENERAL",
        topic: knowledgeFormData.topic === "no_topic" ? "" : knowledgeFormData.topic || "",
        difficulty: (knowledgeFormData.difficulty || "EASY").toUpperCase(),
        marks: Number(knowledgeFormData.marks) || 1,
        duration_minutes: Number(knowledgeFormData.duration_minutes) || 5,
      };

      if (knowledgeFormData.format === "MCQ" || knowledgeFormData.format === "MULTIPLE SELECT") {
        payload.mcq_options = (knowledgeFormData.mcq_options || []).map((opt: any) => ({
          text: opt.text?.trim() || "",
          is_correct: !!opt.is_correct,
        }));
      } else if (knowledgeFormData.format === "CODING") {
        payload.test_cases = (knowledgeFormData.test_cases || []).map((tc: any) => ({
          input: tc.input?.trim() || "",
          expected_output: tc.expected_output?.trim() || "",
        }));
        payload.test_cases_basic = payload.test_cases;
        payload.hints = (knowledgeFormData.hints || []).filter((h: string) => h.trim() !== "");
        payload.solutions = (knowledgeFormData.solutions || [])
          .filter((s: any) => s.code?.trim() !== "")
          .map((s: any) => ({
            title: s.title || "Optimal Solution",
            language: s.language || "python",
            code: s.code,
            is_primary: s.is_primary ?? true,
          }));
      }

      if (editingId) {
        updateKnowledgeMutation.mutate({ id: editingId, data: payload });
      } else {
        createKnowledgeMutation.mutate(payload);
      }
    }
  };

  const isSaving =
    createLabMutation.isPending ||
    updateLabMutation.isPending ||
    createSystemDesignMutation.isPending ||
    updateSystemDesignMutation.isPending ||
    createKnowledgeMutation.isPending ||
    updateKnowledgeMutation.isPending;

  const activeTitle =
    category === "LAB"
      ? labFormData.title
      : category === "SYSTEM_DESIGN"
      ? systemDesignFormData.title
      : knowledgeFormData.title;

  const canSave = Boolean(activeTitle?.trim());

  return (
    <div className="qb-theme min-w-0 px-5 py-8 lg:px-10 bg-background text-foreground min-h-screen">
      {/* HEADER */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1.5">
            <button
              type="button"
              onClick={onClose}
              className="qb-action text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              ← Back to Question bank
            </button>
          </div>
          <h1 className="text-2xl font-semibold leading-8 text-foreground">
            {editingId ? `Edit question: ${activeTitle || "Untitled"}` : "New question"}
          </h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {categoryLabels[category]} · {editingId ? "Modify challenge details" : "Configure and publish challenge"}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving || !canSave}
            className="rec-btn shrink-0"
          >
            {isSaving ? "Saving…" : editingId ? "Save changes" : "Publish question"}
          </Button>
        </div>
      </header>

      {/* STEP TABS (Identical to Question Bank Category Tabs) */}
      <div role="tablist" aria-label="Creation steps" className="mb-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-border">
        {STEPS.map((step, idx) => (
          <Button
            key={step.id}
            role="tab"
            aria-selected={currentStep === idx}
            variant="ghost"
            onClick={() => setCurrentStep(idx)}
            className={`qb-tab -mb-px h-auto rounded-none border-b-2 px-0 pb-3 pt-0 text-[15px] leading-5 ${
              currentStep === idx
                ? "border-primary font-medium text-foreground"
                : "border-transparent font-normal text-muted-foreground hover:text-foreground"
            }`}
          >
            {idx + 1}. {step.label}
          </Button>
        ))}
      </div>

      {/* STEP CONTENT */}
      <div className="space-y-6">
        {/* ========================================================================================= */}
        {/* STEP 0: BASICS                                                                            */}
        {/* ========================================================================================= */}
        {currentStep === 0 && (
          <div className="space-y-6">
            {/* Format Cards (Text-only, no logos or icons) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => !editingId && setCategory("LAB")}
                className={`flex flex-col rounded-xl border p-5 transition-colors ${
                  category === "LAB"
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:bg-accent"
                } ${editingId ? "opacity-60 cursor-default" : "cursor-pointer"}`}
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Container environment</div>
                <h3 className="mt-2 text-base font-medium text-foreground">Engineering lab</h3>
                <p className="mt-1 text-sm text-secondary-foreground leading-relaxed">
                  Interactive sandbox with starter git repository, terminal commands, and automated test execution.
                </p>
              </div>

              <div
                onClick={() => !editingId && setCategory("SYSTEM_DESIGN")}
                className={`flex flex-col rounded-xl border p-5 transition-colors ${
                  category === "SYSTEM_DESIGN"
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:bg-accent"
                } ${editingId ? "opacity-60 cursor-default" : "cursor-pointer"}`}
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Distributed systems</div>
                <h3 className="mt-2 text-base font-medium text-foreground">System design</h3>
                <p className="mt-1 text-sm text-secondary-foreground leading-relaxed">
                  Architecture canvas, DBML schemas, REST API contracts, and high-concurrency flows.
                </p>
              </div>

              <div
                onClick={() => !editingId && setCategory("KNOWLEDGE")}
                className={`flex flex-col rounded-xl border p-5 transition-colors ${
                  category === "KNOWLEDGE"
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:bg-accent"
                } ${editingId ? "opacity-60 cursor-default" : "cursor-pointer"}`}
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Theory & coding</div>
                <h3 className="mt-2 text-base font-medium text-foreground">Knowledge assessment</h3>
                <p className="mt-1 text-sm text-secondary-foreground leading-relaxed">
                  Multiple choice, multiple select, descriptive responses, and algorithmic coding challenges.
                </p>
              </div>
            </div>

            {/* Core Info Panel */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title *</label>
                <input
                  value={
                    category === "LAB"
                      ? labFormData.title
                      : category === "SYSTEM_DESIGN"
                      ? systemDesignFormData.title
                      : knowledgeFormData.title
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (category === "LAB") setLabFormData({ ...labFormData, title: val });
                    else if (category === "SYSTEM_DESIGN") setSystemDesignFormData({ ...systemDesignFormData, title: val });
                    else setKnowledgeFormData({ ...knowledgeFormData, title: val });
                  }}
                  placeholder="e.g. Build a High-Throughput Order Queue"
                  className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Description *</label>
                <textarea
                  rows={4}
                  value={
                    category === "LAB"
                      ? labFormData.description
                      : category === "SYSTEM_DESIGN"
                      ? systemDesignFormData.description
                      : knowledgeFormData.content
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (category === "LAB") setLabFormData({ ...labFormData, description: val });
                    else if (category === "SYSTEM_DESIGN") setSystemDesignFormData({ ...systemDesignFormData, description: val });
                    else setKnowledgeFormData({ ...knowledgeFormData, content: val });
                  }}
                  placeholder="Problem overview, background, expectations, and evaluation criteria..."
                  className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {category !== "KNOWLEDGE" ? (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Domain</label>
                    <select
                      value={category === "LAB" ? labFormData.domain || "OTHER" : systemDesignFormData.domain || "BACKEND"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (category === "LAB") setLabFormData({ ...labFormData, domain: val });
                        else setSystemDesignFormData({ ...systemDesignFormData, domain: val });
                      }}
                      className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    >
                      {DOMAINS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Course</label>
                    <select
                      value={knowledgeFormData.course}
                      onChange={(e) => setKnowledgeFormData({ ...knowledgeFormData, course: e.target.value })}
                      className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                  <select
                    value={
                      category === "LAB"
                        ? labFormData.difficulty
                        : category === "SYSTEM_DESIGN"
                        ? systemDesignFormData.difficulty
                        : knowledgeFormData.difficulty
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (category === "LAB") setLabFormData({ ...labFormData, difficulty: val });
                      else if (category === "SYSTEM_DESIGN") setSystemDesignFormData({ ...systemDesignFormData, difficulty: val });
                      else setKnowledgeFormData({ ...knowledgeFormData, difficulty: val });
                    }}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Marks</label>
                  <input
                    type="number"
                    value={
                      category === "LAB"
                        ? labFormData.marks
                        : category === "SYSTEM_DESIGN"
                        ? systemDesignFormData.marks
                        : knowledgeFormData.marks
                    }
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (category === "LAB") setLabFormData({ ...labFormData, marks: val });
                      else if (category === "SYSTEM_DESIGN") setSystemDesignFormData({ ...systemDesignFormData, marks: val });
                      else setKnowledgeFormData({ ...knowledgeFormData, marks: val });
                    }}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={
                      category === "LAB"
                        ? labFormData.duration_minutes
                        : category === "SYSTEM_DESIGN"
                        ? systemDesignFormData.duration_minutes
                        : knowledgeFormData.duration_minutes
                    }
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (category === "LAB") setLabFormData({ ...labFormData, duration_minutes: val });
                      else if (category === "SYSTEM_DESIGN") setSystemDesignFormData({ ...systemDesignFormData, duration_minutes: val });
                      else setKnowledgeFormData({ ...knowledgeFormData, duration_minutes: val });
                    }}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>

                {category === "LAB" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Scenario</label>
                      <select
                        value={labFormData.scenario}
                        onChange={(e) => setLabFormData({ ...labFormData, scenario: e.target.value })}
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        {SCENARIOS.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Role Type</label>
                      <select
                        value={labFormData.type}
                        onChange={(e) => setLabFormData({ ...labFormData, type: e.target.value })}
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        {LAB_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {category === "SYSTEM_DESIGN" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Scenario Type</label>
                      <input
                        value={systemDesignFormData.scenario_type}
                        onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, scenario_type: e.target.value })}
                        placeholder="e.g. Distributed Storage"
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Company</label>
                      <input
                        value={systemDesignFormData.company}
                        onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, company: e.target.value })}
                        placeholder="e.g. Uber"
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                    </div>
                  </>
                )}

                {category === "KNOWLEDGE" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Format</label>
                      <select
                        value={knowledgeFormData.format}
                        onChange={(e) => setKnowledgeFormData({ ...knowledgeFormData, format: e.target.value })}
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        <option value="MCQ">Multiple Choice (Single Answer)</option>
                        <option value="MULTIPLE SELECT">Multiple Select</option>
                        <option value="DESCRIPTION">Description</option>
                        <option value="CODING">Coding</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Topic</label>
                      <select
                        value={knowledgeFormData.topic}
                        onChange={(e) => setKnowledgeFormData({ ...knowledgeFormData, topic: e.target.value })}
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      >
                        <option value="">General / No Topic</option>
                        {availableTopics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================================= */}
        {/* STEP 1: CONFIGURATION                                                                     */}
        {/* ========================================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {category === "LAB" && (
              <>
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-base font-medium text-foreground">Starter Code Repository</span>
                    <span className="text-xs text-muted-foreground">Candidate workspace clone source</span>
                  </div>

                  <GithubAppIntegration
                    value={{
                      github_repo_id: labFormData.github_repo_id,
                      git_repo_starter_url: labFormData.git_repo_starter_url,
                      repo_source_type: labFormData.repo_source_type,
                      github_app_installation: labFormData.github_app_installation,
                      github_installation_id: labFormData.github_installation_id,
                    }}
                    onChange={(val: any) => {
                      setLabFormData((prev: any) => ({
                        ...prev,
                        ...val,
                      }));
                    }}
                    onBranchChange={(branch: string) => {
                      setLabFormData((prev: any) => ({
                        ...prev,
                        git_repo_starter_branch: branch,
                      }));
                    }}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Starter Repository URL</label>
                      <input
                        value={labFormData.git_repo_starter_url}
                        onChange={(e) =>
                          setLabFormData({
                            ...labFormData,
                            git_repo_starter_url: e.target.value,
                            repo_source_type: labFormData.github_repo_id ? labFormData.repo_source_type : "ADMIN_SYSTEM",
                          })
                        }
                        placeholder="https://github.com/org/repo"
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Branch</label>
                      <input
                        value={labFormData.git_repo_starter_branch}
                        onChange={(e) => setLabFormData({ ...labFormData, git_repo_starter_branch: e.target.value })}
                        placeholder="main"
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="border-b border-border pb-3">
                    <span className="text-base font-medium text-foreground">Technology Stack</span>
                  </div>

                  <MultiSelectPills
                    label="Programming Languages"
                    options={PROGRAMMING_LANGUAGES}
                    value={labFormData.programming_languages || []}
                    onChange={(v) => setLabFormData({ ...labFormData, programming_languages: v })}
                  />

                  <MultiSelectPills
                    label="Databases"
                    options={DATABASES}
                    value={labFormData.databases || []}
                    onChange={(v) => setLabFormData({ ...labFormData, databases: v })}
                  />

                  {labFormData.databases?.some((d: string) =>
                    ["MySQL", "PostgreSQL", "MongoDB", "MYSQL", "POSTGRESQL", "MONGODB"].includes(d)
                  ) && (
                    <div className="rounded-lg border border-border bg-background p-4 space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Evaluation Database Connection URL
                      </label>
                      <input
                        type="text"
                        placeholder="mysql://user:pass@host:port/dbname"
                        value={labFormData.connection_url || ""}
                        onChange={(e) => setLabFormData({ ...labFormData, connection_url: e.target.value })}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs font-mono text-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        Candidates will automatically execute queries against this database.
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
                </div>
              </>
            )}

            {category === "SYSTEM_DESIGN" && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Studio Slug *</label>
                  <input
                    value={systemDesignFormData.system_slug}
                    onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, system_slug: e.target.value })}
                    placeholder="systemdesign-url-shortener"
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Scale Targets & Constraints (One per line)</label>
                  <textarea
                    rows={6}
                    value={systemDesignFormData.constraints}
                    onChange={(e) => setSystemDesignFormData({ ...systemDesignFormData, constraints: e.target.value })}
                    placeholder="100k requests/sec peak traffic&#10;Sub-15ms p99 latency&#10;99.999% availability"
                    className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground"
                  />
                </div>
              </div>
            )}

            {category === "KNOWLEDGE" && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Question Content Prompt</label>
                  <textarea
                    rows={8}
                    value={knowledgeFormData.content}
                    onChange={(e) => setKnowledgeFormData({ ...knowledgeFormData, content: e.target.value })}
                    placeholder="Provide full formulation, markdown code blocks, and expected format..."
                    className="mt-1.5 w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground"
                  />
                </div>

                {isCheckingDuplicate && (
                  <p className="text-xs text-muted-foreground">Checking for duplicate questions across database…</p>
                )}

                {!isCheckingDuplicate && duplicateMeta?.is_duplicate && (
                  <div className="rounded-lg border border-border bg-background p-3 text-xs text-foreground">
                    <span className="font-medium">Potential duplicate:</span> "{duplicateMeta.duplicate_title}"
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================================= */}
        {/* STEP 2: TASKS                                                                             */}
        {/* ========================================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {category === "LAB" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-medium text-foreground">Tasks ({labFormData.tasks.length})</h3>
                    <p className="text-sm text-muted-foreground">Break this lab into scored sub-tasks and milestones.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setScoringRulesModalOpen(true)}
                      className="h-9 px-3 text-xs border-border bg-background text-foreground hover:bg-muted font-medium cursor-pointer"
                    >
                      Scoring rules
                    </Button>
                    <Button onClick={addLabTask} className="rec-btn">Add task</Button>
                  </div>
                </div>

                {/* AI Assistant Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">AI Assistant:</span>
                    <button
                      type="button"
                      onClick={handleAISuggestTask}
                      disabled={isAISuggesting || isAIBulkGenerating}
                      className="qb-action text-xs text-foreground font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {isAISuggesting ? "Suggesting..." : "Suggest new task"}
                    </button>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="text-muted-foreground">Generate:</span>
                    <button
                      type="button"
                      onClick={() => handleAIGenerateBulkTasks(2)}
                      disabled={isAISuggesting || isAIBulkGenerating}
                      className="qb-action text-xs text-foreground font-medium disabled:opacity-50 cursor-pointer"
                    >
                      2 tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAIGenerateBulkTasks(3)}
                      disabled={isAISuggesting || isAIBulkGenerating}
                      className="qb-action text-xs text-foreground font-medium disabled:opacity-50 cursor-pointer"
                    >
                      3 tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAIGenerateBulkTasks(4)}
                      disabled={isAISuggesting || isAIBulkGenerating}
                      className="qb-action text-xs text-foreground font-medium disabled:opacity-50 cursor-pointer"
                    >
                      4 tasks
                    </button>
                  </div>
                  {(isAIBulkGenerating || isAISuggesting) && (
                    <span className="text-muted-foreground italic">
                      {isAIBulkGenerating ? "Generating progressive task sequence..." : "Synthesizing lab task..."}
                    </span>
                  )}
                </div>

                {labFormData.tasks.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-10 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">No tasks added yet.</p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <Button onClick={addLabTask} className="rec-btn">Add first task</Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAISuggestTask}
                        disabled={isAISuggesting || isAIBulkGenerating}
                        className="h-10 px-4 text-sm border-border bg-background text-foreground hover:bg-muted font-medium cursor-pointer"
                      >
                        {isAISuggesting ? "Suggesting..." : "Suggest task with AI"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAIGenerateBulkTasks(3)}
                        disabled={isAISuggesting || isAIBulkGenerating}
                        className="h-10 px-4 text-sm border-border bg-background text-foreground hover:bg-muted font-medium cursor-pointer"
                      >
                        {isAIBulkGenerating ? "Generating..." : "Generate 3 tasks with AI"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {labFormData.tasks.map((task: any, index: number) => (
                      <div key={task.id || index} className="rounded-xl border border-border bg-card p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                          <span className="text-sm font-medium text-foreground">
                            Task {index + 1}: {task.title || "Untitled"}
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={standardizingIndex === index}
                              onClick={() => handleAIStandardizeTask(index)}
                              className="qb-action text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
                            >
                              {standardizingIndex === index ? "Standardizing..." : "Standardize with AI"}
                            </button>
                            <button
                              type="button"
                              disabled={estimatingIndex === index}
                              onClick={() => handleAIEstimateDuration(index)}
                              className="qb-action text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 cursor-pointer"
                            >
                              {estimatingIndex === index ? "Estimating..." : "Estimate duration"}
                            </button>
                            <Button
                              variant="link"
                              className="qb-action hover:text-destructive cursor-pointer"
                              onClick={() => removeLabTask(index)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Title *</label>
                            <input
                              value={task.title}
                              onChange={(e) => updateLabTask(index, "title", e.target.value)}
                              placeholder="e.g. Implement GET /api/orders endpoint"
                              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Description</label>
                            <textarea
                              rows={2}
                              value={task.description}
                              onChange={(e) => updateLabTask(index, "description", e.target.value)}
                              placeholder="Task instructions and requirements..."
                              className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Reference Solution / Query</label>
                            <textarea
                              rows={2}
                              value={getSolutionString(task.solution)}
                              onChange={(e) => updateLabTask(index, "solution", e.target.value)}
                              placeholder="SELECT * FROM orders WHERE ... or code snippet"
                              className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-xs font-mono text-foreground"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                              <select
                                value={task.difficulty}
                                onChange={(e) => updateLabTask(index, "difficulty", e.target.value)}
                                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                              >
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Marks</label>
                              <input
                                type="number"
                                value={task.marks}
                                onChange={(e) => updateLabTask(index, "marks", parseInt(e.target.value) || 0)}
                                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Duration (min)</label>
                              <input
                                type="number"
                                value={task.duration_minutes}
                                onChange={(e) =>
                                  updateLabTask(index, "duration_minutes", parseInt(e.target.value) || 0)
                                }
                                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Linked Task / Dependency</label>
                            <select
                              value={task.parent_task_id || task.parent_task || ""}
                              onChange={(e) => updateLabTask(index, "parent_task_id", e.target.value || null)}
                              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                            >
                              <option value="">None (Independent task)</option>
                              {labFormData.tasks.map((otherTask: any, otherIdx: number) => {
                                if (otherIdx === index) return null;
                                const otherId = otherTask.id || `task_idx_${otherIdx}`;
                                return (
                                  <option key={otherId} value={otherId}>
                                    Task {otherIdx + 1}: {otherTask.title || `Task ${otherIdx + 1}`}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Lifecycle Commands shifted to Step 3 */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <span className="text-base font-medium text-foreground">Lifecycle Commands</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Commands executed in the candidate container for startup and automated test grading.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateLifecycleCommands}
                      disabled={isGeneratingLifecycle}
                      className="h-9 px-3 text-xs border-border bg-background text-foreground hover:bg-muted font-medium cursor-pointer flex items-center gap-1.5"
                    >
                      {isGeneratingLifecycle ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Generating commands...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span>Generate lifecycle commands</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Startup Command</label>
                      <input
                        value={labFormData.startup_command}
                        onChange={(e) => setLabFormData({ ...labFormData, startup_command: e.target.value })}
                        placeholder="npm start or python main.py"
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Test Command</label>
                      <input
                        value={labFormData.test_command}
                        onChange={(e) => setLabFormData({ ...labFormData, test_command: e.target.value })}
                        placeholder="npm test or pytest"
                        className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <input
                      type="checkbox"
                      id="allow_task_selection_cb"
                      checked={labFormData.allow_task_selection !== false}
                      onChange={(e) => setLabFormData({ ...labFormData, allow_task_selection: e.target.checked })}
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor="allow_task_selection_cb" className="text-sm text-foreground cursor-pointer">
                      Allow recruiters to select individual tasks when assigning this lab in an evaluation
                    </label>
                  </div>
                </div>
              </>
            )}

            {category === "SYSTEM_DESIGN" && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium text-foreground">Deliverables ({systemDesignFormData.tasks.length})</h3>
                    <p className="text-sm text-muted-foreground">Expected artifacts submitted by candidates.</p>
                  </div>
                  <Button onClick={addSystemDesignTask} className="rec-btn">Add deliverable</Button>
                </div>

                <div className="space-y-3">
                  {systemDesignFormData.tasks.map((task: any, index: number) => (
                    <div key={task.id || index} className="rounded-xl border border-border bg-card p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="text-sm font-medium text-foreground">
                          Deliverable {index + 1}: {task.title || "Untitled"}
                        </span>
                        <Button
                          variant="link"
                          className="qb-action hover:text-destructive"
                          onClick={() => removeSystemDesignTask(index)}
                        >
                          Delete
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3">
                          <label className="text-xs font-medium text-muted-foreground">Title</label>
                          <input
                            value={task.title}
                            onChange={(e) => updateSystemDesignTask(index, "title", e.target.value)}
                            placeholder="e.g. HLD Architecture Canvas"
                            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Marks</label>
                          <input
                            type="number"
                            value={task.marks}
                            onChange={(e) =>
                              updateSystemDesignTask(index, "marks", parseInt(e.target.value) || 0)
                            }
                            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Objectives</label>
                        <textarea
                          rows={2}
                          value={task.description}
                          onChange={(e) => updateSystemDesignTask(index, "description", e.target.value)}
                          placeholder="What candidates are expected to produce..."
                          className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {category === "KNOWLEDGE" && (
              <div className="space-y-4">
                {(knowledgeFormData.format === "MCQ" || knowledgeFormData.format === "MULTIPLE SELECT") && (
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h4 className="text-base font-medium text-foreground">Options</h4>
                        <p className="text-xs text-muted-foreground">Mark correct answer option(s)</p>
                      </div>
                      <Button onClick={addKnowledgeOption} className="rec-btn">Add option</Button>
                    </div>

                    <div className="space-y-2">
                      {knowledgeFormData.mcq_options.map((opt: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                          <input
                            type={knowledgeFormData.format === "MCQ" ? "radio" : "checkbox"}
                            name="correct_answer"
                            checked={!!opt.is_correct}
                            onChange={(e) => handleOptionChange(idx, "is_correct", e.target.checked)}
                            className="h-4 w-4"
                          />
                          <input
                            value={opt.text}
                            onChange={(e) => handleOptionChange(idx, "text", e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 bg-transparent text-sm text-foreground outline-none"
                          />
                          {knowledgeFormData.mcq_options.length > 2 && (
                            <Button
                              variant="link"
                              className="qb-action hover:text-destructive"
                              onClick={() => removeKnowledgeOption(idx)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {knowledgeFormData.format === "CODING" && (
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                    <h4 className="text-base font-medium text-foreground border-b border-border pb-3">
                      Automated Test Cases
                    </h4>
                    {knowledgeFormData.test_cases.map((tc: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-background">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Input</label>
                          <textarea
                            rows={2}
                            value={tc.input}
                            onChange={(e) => {
                              const next = [...knowledgeFormData.test_cases];
                              next[idx].input = e.target.value;
                              setKnowledgeFormData({ ...knowledgeFormData, test_cases: next });
                            }}
                            className="mt-1 w-full font-mono text-xs bg-background rounded-lg p-2 border border-input outline-none"
                            placeholder="[2, 7, 11, 15], 9"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Expected Output</label>
                          <textarea
                            rows={2}
                            value={tc.expected_output}
                            onChange={(e) => {
                              const next = [...knowledgeFormData.test_cases];
                              next[idx].expected_output = e.target.value;
                              setKnowledgeFormData({ ...knowledgeFormData, test_cases: next });
                            }}
                            className="mt-1 w-full font-mono text-xs bg-background rounded-lg p-2 border border-input outline-none"
                            placeholder="[0, 1]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================================= */}
        {/* STEP 3: REVIEW                                                                            */}
        {/* ========================================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="text-sm leading-5 text-muted-foreground">
                {categoryLabels[category]} ·{" "}
                {category === "LAB"
                  ? labFormData.difficulty
                  : category === "SYSTEM_DESIGN"
                  ? systemDesignFormData.difficulty
                  : knowledgeFormData.difficulty}{" "}
                ·{" "}
                {category === "LAB"
                  ? `${labFormData.marks} marks · ${labFormData.duration_minutes} min`
                  : category === "SYSTEM_DESIGN"
                  ? `${systemDesignFormData.marks} marks · ${systemDesignFormData.duration_minutes} min`
                  : `${knowledgeFormData.marks} marks · ${knowledgeFormData.duration_minutes} min`}
              </div>

              <h2 className="text-lg font-medium leading-7 text-foreground">
                {activeTitle || "Untitled question"}
              </h2>

              <p className="text-sm leading-6 text-secondary-foreground whitespace-pre-wrap">
                {category === "LAB"
                  ? labFormData.description || "No description provided."
                  : category === "SYSTEM_DESIGN"
                  ? systemDesignFormData.description || "No description provided."
                  : knowledgeFormData.content || "No content provided."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
                <div className="font-medium text-foreground pb-2 border-b border-border">Configuration Details</div>
                {category === "LAB" && (
                  <>
                    <div className="text-muted-foreground">
                      Repository: <span className="text-foreground">{labFormData.git_repo_starter_url || "None"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Branch: <span className="text-foreground">{labFormData.git_repo_starter_branch || "main"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Startup: <span className="text-foreground">{labFormData.startup_command || "None"}</span>
                    </div>
                  </>
                )}
                {category === "SYSTEM_DESIGN" && (
                  <>
                    <div className="text-muted-foreground">
                      Studio slug: <span className="text-foreground">{systemDesignFormData.system_slug}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Scenario: <span className="text-foreground">{systemDesignFormData.scenario_type}</span>
                    </div>
                  </>
                )}
                {category === "KNOWLEDGE" && (
                  <>
                    <div className="text-muted-foreground">
                      Format: <span className="text-foreground">{knowledgeFormData.format}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Course: <span className="text-foreground">{courses.find((c) => c.id === knowledgeFormData.course)?.name || "General"}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
                <div className="font-medium text-foreground pb-2 border-b border-border">Tasks and Deliverables</div>
                {category === "LAB" && (
                  <div className="space-y-1">
                    <div className="text-foreground font-medium">{labFormData.tasks.length} tasks configured</div>
                    {labFormData.tasks.map((t: any, idx: number) => (
                      <div key={idx} className="text-xs text-muted-foreground truncate">
                        • {t.title || `Task ${idx + 1}`} ({t.marks} marks)
                      </div>
                    ))}
                  </div>
                )}
                {category === "SYSTEM_DESIGN" && (
                  <div className="space-y-1">
                    <div className="text-foreground font-medium">{systemDesignFormData.tasks.length} deliverables configured</div>
                    {systemDesignFormData.tasks.map((t: any, idx: number) => (
                      <div key={idx} className="text-xs text-muted-foreground truncate">
                        • {t.title || `Deliverable ${idx + 1}`} ({t.marks} marks)
                      </div>
                    ))}
                  </div>
                )}
                {category === "KNOWLEDGE" && (
                  <div>
                    <div className="text-foreground font-medium">
                      {knowledgeFormData.format === "CODING"
                        ? `${knowledgeFormData.test_cases.length} test cases`
                        : `${knowledgeFormData.mcq_options.length} options`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-medium text-foreground">Ready to publish</div>
                <div className="text-sm text-muted-foreground">All required configurations are set for this challenge.</div>
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving || !canSave}
                className="rec-btn"
              >
                {isSaving ? "Saving…" : editingId ? "Save changes" : "Publish question"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER NAVIGATION */}
      <footer className="mt-8 pt-4 border-t border-border flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition disabled:opacity-40"
        >
          ← Previous
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={() => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="rec-btn"
          >
            Next step →
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={isSaving || !canSave}
            className="rec-btn"
          >
            {isSaving ? "Saving…" : editingId ? "Save changes" : "Publish question"}
          </Button>
        )}
      </footer>

      {/* Yuvro Scoring Rules Modal */}
      {category === "LAB" && (
        <ScoringRulesModal
          open={scoringRulesModalOpen}
          onClose={() => setScoringRulesModalOpen(false)}
          labFormData={labFormData}
          onApplyTestCommand={(cmd) => {
            setLabFormData((prev: any) => ({ ...prev, test_command: cmd }));
          }}
        />
      )}
    </div>
  );
}

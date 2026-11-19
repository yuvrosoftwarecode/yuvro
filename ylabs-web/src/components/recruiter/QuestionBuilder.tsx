import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { questionBankService } from "@/services/questionBankService";
import { fetchTopics, checkDuplicateQuestion } from "@/lib/recruiter";
import { Button } from "@/components/ui/button";
import { GithubAppIntegration } from "./GithubAppIntegration";
import { toast } from "sonner";
import {
  labTaskAIService,
  type InspectRepoResponse,
  type ScoringRulesResponse,
} from "@/services/labTaskAIService";
import { ScoringRulesModal } from "./ScoringRulesModal";
import { LabTasksChatStep } from "./LabTasksChatStep";
import { LabScoringLiveTestStep } from "./LabScoringLiveTestStep";


export interface QuestionBuilderProps {
  initialCategory?: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE";
  category?: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE";
  onCategoryChange?: (category: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE") => void;
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

const LAB_STEPS = [
  { id: 0, label: "Basics" },
  { id: 1, label: "Repository & Stack" },
  { id: 2, label: "Codebase Scan" },
  { id: 3, label: "Tasks" },
  { id: 4, label: "Scoring & Testing" },
];

const DEFAULT_STEPS = [
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
  category: controlledCategory,
  onCategoryChange,
  editingId = null,
  initialData = null,
  courses = [],
  onClose,
  onSuccess,
}: QuestionBuilderProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [internalCategory, setInternalCategory] = useState<"LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE">(
    controlledCategory || initialCategory
  );

  useEffect(() => {
    if (controlledCategory && controlledCategory !== internalCategory) {
      setInternalCategory(controlledCategory);
    }
  }, [controlledCategory]);

  const category = controlledCategory || internalCategory;

  const handleSelectCategory = (newCat: "LAB" | "SYSTEM_DESIGN" | "KNOWLEDGE") => {
    if (editingId) return;
    setInternalCategory(newCat);
    onCategoryChange?.(newCat);
  };

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

  // AI Task Assistant & Verification State (Steps 3, 4, 5)
  const [standardizingIndex, setStandardizingIndex] = useState<number | null>(null);
  const [estimatingIndex, setEstimatingIndex] = useState<number | null>(null);
  const [scoringRulesModalOpen, setScoringRulesModalOpen] = useState(false);
  const [repoInspection, setRepoInspection] = useState<InspectRepoResponse | null>(null);
  const [isInspectingRepo, setIsInspectingRepo] = useState(false);
  const [scoringRules, setScoringRules] = useState<ScoringRulesResponse | null>(null);

  const activeSteps = category === "LAB" ? LAB_STEPS : DEFAULT_STEPS;

  useEffect(() => {
    if (currentStep > activeSteps.length - 1) {
      setCurrentStep(activeSteps.length - 1);
    }
  }, [category, activeSteps.length, currentStep]);


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
      toast.error(err?.message || "Failed to create lab question");
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
      toast.error(err?.message || "Failed to update lab question");
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
      toast.error(err?.message || "Failed to create system design challenge");
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
      toast.error(err?.message || "Failed to update system design challenge");
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
      toast.error(err?.message || "Failed to create knowledge question");
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
      toast.error(err?.message || "Failed to update knowledge question");
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
      marks: Number(labFormData.marks) || 100,
      duration_minutes: Number(labFormData.duration_minutes) || 45,
      programming_languages: labFormData.programming_languages || [],
      backend_frameworks: labFormData.backend_frameworks || [],
      frontend_frameworks: labFormData.frontend_frameworks || [],
      databases: labFormData.databases || [],
      git_repo_starter_url: labFormData.git_repo_starter_url || "",
      git_repo_starter_branch: labFormData.git_repo_starter_branch || "main",
      startup_command: labFormData.startup_command || "",
      test_command: labFormData.test_command || "",
      tech_stack: [
        ...(labFormData.programming_languages || []),
        ...(labFormData.databases || []),
        ...(labFormData.backend_frameworks || []),
        ...(labFormData.frontend_frameworks || []),
      ],
      repo_name: repoInspection?.full_name || cleanRepo,
      repo_description: repoInspection?.description || labFormData.description || "",
      repo_readme: repoInspection?.readme || "",
      repo_tree: repoInspection?.files || [],
      repo_files: repoInspection?.key_files || {},
    };
  };

  const handleInspectRepo = async () => {
    const url = (labFormData.git_repo_starter_url || "").trim();
    if (!url) {
      toast.error("Configure a Starter Repository URL in Step 2 first.");
      return;
    }
    setIsInspectingRepo(true);
    try {
      const res = await labTaskAIService.inspectRepo({
        repo_identifier: url,
        branch: labFormData.git_repo_starter_branch || "main",
        installation_id: labFormData.github_app_installation || labFormData.github_installation_id || null,
        include_clone_token: false,
      });
      setRepoInspection(res);
      toast.success(`Scanned ${res.full_name} (${res.file_count} files indexed for AI)`);
    } catch (err: any) {
      console.error("Repo inspection error", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to inspect repository.");
    } finally {
      setIsInspectingRepo(false);
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
      const res = await labTaskAIService.estimateDuration(currentTask, context, "deepseek");
      const mins = res.recommended_duration_minutes || res.estimated_minutes || 15;
      updateLabTask(index, "duration_minutes", mins);
      toast.success(`Estimated: ${mins} min${res.rationale ? ` — ${res.rationale}` : ""}`);
    } catch (err: any) {
      console.error("Estimate duration error", err);
      toast.error(err?.response?.data?.error || err?.message || "Failed to estimate duration.");
    } finally {
      setEstimatingIndex(null);
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
        {activeSteps.map((step, idx) => {
          const isScanGateLocked = category === "LAB" && idx >= 3 && !repoInspection;
          return (
            <Button
              key={step.id}
              role="tab"
              aria-selected={currentStep === idx}
              variant="ghost"
              onClick={() => {
                if (isScanGateLocked) {
                  toast.error("Please scan the starter repository in Step 3 before proceeding to Tasks or Scoring.");
                  return;
                }
                setCurrentStep(idx);
              }}
              title={isScanGateLocked ? "Complete Codebase Scan in Step 3 to unlock" : undefined}
              className={`qb-tab -mb-px h-auto rounded-none border-b-2 px-0 pb-3 pt-0 text-[15px] leading-5 ${
                currentStep === idx
                  ? "border-primary font-medium text-foreground"
                  : isScanGateLocked
                  ? "border-transparent font-normal text-muted-foreground/50 hover:text-muted-foreground cursor-not-allowed"
                  : "border-transparent font-normal text-muted-foreground hover:text-foreground"
              }`}
            >
              {idx + 1}. {step.label}
              {isScanGateLocked && (
                <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                  Locked
                </span>
              )}
            </Button>
          );
        })}
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
                onClick={() => handleSelectCategory("LAB")}
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
                onClick={() => handleSelectCategory("SYSTEM_DESIGN")}
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
                onClick={() => handleSelectCategory("KNOWLEDGE")}
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
        {/* STEP 2: WORKSPACE & COMMANDS (LAB) / TASKS (SYSTEM DESIGN & KNOWLEDGE)                    */}
        {/* ========================================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {category === "LAB" && (
              <>
                {/* Repository Codebase Inspection */}
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <span className="text-base font-medium text-foreground">Repository Codebase Scan</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Index the starter repository so AI Task Architect (Step 4) and Scoring Rules (Step 5) use your real files and imports.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleInspectRepo}
                      disabled={isInspectingRepo || !labFormData.git_repo_starter_url}
                      className="h-9 px-3.5 text-xs border-border bg-background text-foreground hover:bg-muted font-medium cursor-pointer"
                    >
                      {isInspectingRepo
                        ? "Scanning repository…"
                        : repoInspection
                        ? "Rescan repository"
                        : "Scan repository"}
                    </Button>
                  </div>

                  {!labFormData.git_repo_starter_url ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground space-y-2">
                      <p className="font-medium text-foreground">No starter repository configured.</p>
                      <p>Go back to Step 2 (Repository &amp; Stack) to enter or select a GitHub repository URL. A starter repository scan is required before proceeding to Tasks.</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="h-7 text-xs px-2.5 mt-1 cursor-pointer"
                      >
                        ← Back to Step 2
                      </Button>
                    </div>
                  ) : repoInspection ? (
                    <div className="space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5">
                        <div>
                          <span className="font-mono font-medium text-foreground">
                            {repoInspection.full_name}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}· {repoInspection.default_branch} · {repoInspection.private ? "Private" : "Public"}
                            {repoInspection.language ? ` · ${repoInspection.language}` : ""}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {repoInspection.file_count} files · {Object.keys(repoInspection.key_files || {}).length} key files indexed
                        </span>
                      </div>
                      {repoInspection.description && (
                        <p className="text-muted-foreground">{repoInspection.description}</p>
                      )}
                      {repoInspection.files && repoInspection.files.length > 0 && (
                        <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px] text-foreground grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                          {repoInspection.files.slice(0, 60).map((f) => (
                            <div key={f} className="truncate">
                              {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-foreground">
                          Target repo:{" "}
                          <span className="font-mono font-medium text-foreground">{labFormData.git_repo_starter_url}</span>{" "}
                          <span className="text-muted-foreground">({labFormData.git_repo_starter_branch || "main"})</span>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                          Scan required before Step 4
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The repository must be scanned before proceeding. AI Task Architect (Step 4) and Live Scoring (Step 5) use the indexed source files and dependencies to generate tailored challenge tasks.
                      </p>
                      <div className="pt-1">
                        <Button
                          type="button"
                          onClick={handleInspectRepo}
                          disabled={isInspectingRepo}
                          className="h-8 px-4 text-xs rec-btn cursor-pointer"
                        >
                          {isInspectingRepo ? "Scanning repository…" : "Scan repository now"}
                        </Button>
                      </div>
                    </div>
                  )}
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
        {/* STEP 3: TASKS AI CHAT (LAB) / REVIEW (SYSTEM DESIGN & KNOWLEDGE)                          */}
        {/* ========================================================================================= */}
        {currentStep === 3 && category === "LAB" && (
          <LabTasksChatStep
            labFormData={labFormData}
            repoInspection={repoInspection}
            getLabContext={getLabContext}
            onTasksChange={(nextTasks, meta) => {
              setLabFormData((prev: any) => ({
                ...prev,
                tasks: nextTasks,
                ...(meta?.marks ? { marks: meta.marks } : {}),
                ...(meta?.duration_minutes ? { duration_minutes: meta.duration_minutes } : {}),
              }));
            }}
            onAddManualTask={addLabTask}
            onUpdateTask={updateLabTask}
            onRemoveTask={removeLabTask}
            onStandardizeTask={handleAIStandardizeTask}
            onEstimateDuration={handleAIEstimateDuration}
            standardizingIndex={standardizingIndex}
            estimatingIndex={estimatingIndex}
            onProceedToScoring={() => setCurrentStep(4)}
            getSolutionString={getSolutionString}
          />
        )}

        {currentStep === 3 && category !== "LAB" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="text-sm leading-5 text-muted-foreground">
                {categoryLabels[category]} ·{" "}
                {category === "SYSTEM_DESIGN"
                  ? systemDesignFormData.difficulty
                  : knowledgeFormData.difficulty}{" "}
                ·{" "}
                {category === "SYSTEM_DESIGN"
                  ? `${systemDesignFormData.marks} marks · ${systemDesignFormData.duration_minutes} min`
                  : `${knowledgeFormData.marks} marks · ${knowledgeFormData.duration_minutes} min`}
              </div>

              <h2 className="text-lg font-medium leading-7 text-foreground">
                {activeTitle || "Untitled question"}
              </h2>

              <p className="text-sm leading-6 text-secondary-foreground whitespace-pre-wrap">
                {category === "SYSTEM_DESIGN"
                  ? systemDesignFormData.description || "No description provided."
                  : knowledgeFormData.content || "No content provided."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
                <div className="font-medium text-foreground pb-2 border-b border-border">Configuration Details</div>
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

        {/* ========================================================================================= */}
        {/* STEP 4: SCORING RULES & LIVE TESTING (ENGINEERING LAB ONLY)                               */}
        {/* ========================================================================================= */}
        {currentStep === 4 && category === "LAB" && (
          <LabScoringLiveTestStep
            labFormData={labFormData}
            repoInspection={repoInspection}
            onRepoInspected={setRepoInspection}
            getLabContext={getLabContext}
            scoringRules={scoringRules}
            onScoringRulesChange={setScoringRules}
            onApplyStartupCommand={(cmd) => {
              setLabFormData((prev: any) => ({ ...prev, startup_command: cmd }));
            }}
            onApplyTestCommand={(cmd) => {
              setLabFormData((prev: any) => ({ ...prev, test_command: cmd }));
            }}
            onApplySolution={(solutionFiles) => {
              setLabFormData((prev: any) => ({ ...prev, solution: solutionFiles }));
            }}
            onToggleTaskSelection={(allow) => {
              setLabFormData((prev: any) => ({ ...prev, allow_task_selection: allow }));
            }}
            onSave={handleSave}
            isSaving={isSaving}
            canSave={canSave}
            editingId={editingId}
          />
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

        {currentStep < activeSteps.length - 1 ? (
          <Button
            onClick={() => {
              if (category === "LAB" && currentStep === 2 && !repoInspection) {
                toast.error("Please scan the starter repository before proceeding to Tasks.");
                return;
              }
              setCurrentStep((s) => Math.min(activeSteps.length - 1, s + 1));
            }}
            disabled={
              category === "LAB" && currentStep === 2 && (!repoInspection || isInspectingRepo)
            }
            title={
              category === "LAB" && currentStep === 2 && !repoInspection
                ? "Scan the repository in Step 3 to proceed"
                : undefined
            }
            className="rec-btn"
          >
            {category === "LAB" && currentStep === 2 && isInspectingRepo
              ? "Scanning repository…"
              : category === "LAB" && currentStep === 2 && !repoInspection
              ? "Scan repository to continue →"
              : "Next step →"}
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

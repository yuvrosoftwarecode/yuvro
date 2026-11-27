export type QuestionCategory = "lab" | "design" | "know";

export interface QuestionTypeInfo {
  cat: string;
  t: string;
  d: string;
}

export const TYPES: Record<QuestionCategory, QuestionTypeInfo> = {
  lab: {
    cat: "Container environment",
    t: "Engineering lab",
    d: "Interactive sandbox with starter git repository, terminal commands and automated test execution.",
  },
  design: {
    cat: "Distributed systems",
    t: "System design",
    d: "Architecture canvas, DBML schemas, REST API contracts and high-concurrency flows.",
  },
  know: {
    cat: "Theory and coding",
    t: "Knowledge assessment",
    d: "Multiple choice, multiple select, descriptive responses and algorithmic coding challenges.",
  },
};

export const STEPS = [
  "Repository and scan",
  "Basics",
  "Tasks",
  "Scoring and testing",
];

export function getStepsForCategory(type: QuestionCategory): string[] {
  if (type === "design") {
    return ["Basics", "Tasks"];
  }
  if (type === "know") {
    return ["Basics"];
  }
  return ["Repository and scan", "Basics", "Tasks", "Scoring and testing"];
}

export const OPT = {
  domain: [
    "Enterprise resource planning (ERP)",
    "Finance",
    "Payment",
    "Supply chain",
    "Healthcare",
    "Retail",
    "E-commerce",
  ],
  difficulty: ["Easy", "Medium", "Hard"],
  scenario: [
    "Feature development",
    "Debugging",
    "Performance optimization",
    "Architecture",
    "Production incident",
  ],
  role: ["Backend", "Frontend", "Full stack", "DevOps", "Data"],
};

export const DEF_BRIEF = "";

export const INITIAL_REPOS: Array<{ o: string; n: string; v: string; b: string; id: string }> = [];

export type StackKey = "lang" | "db" | "be" | "fe";

export const STACK_CONFIG: Array<[StackKey, string, string[]]> = [
  ["lang", "Programming languages", ["C", "C++", "Python", "Java", "SQL", "Bash", "JavaScript", "TypeScript"]],
  ["db", "Databases", ["SQLite", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch"]],
  ["be", "Backend frameworks", ["Django", "Django REST Framework", "FastAPI", "Flask", "Spring Boot", "NodeJS", "Express", "NestJS"]],
  ["fe", "Frontend frameworks", ["React", "NextJS", "Vue", "Angular", "Svelte"]],
];

export const BASE_STACK = Object.fromEntries(
  STACK_CONFIG.map(([k, , o]) => [k, o])
) as Record<StackKey, string[]>;

export interface TaskItem {
  id: string;
  title: string;
  diff: "Easy" | "Medium" | "Hard";
  obj?: string;
  desc: string;
  ref: string;
  marks: number;
  min: number;
  dep?: string;
  fresh?: boolean;
  upd?: boolean;
}

export interface RunItem {
  id: string;
  prompt: string;
  time: string;
  v: number;
  items: TaskItem[];
}

export interface ChatMessage {
  r: "u" | "a";
  t: string;
  snap?: boolean;
  muted?: boolean;
  isError?: boolean;
}

export interface ChatHistoryItem {
  id: string;
  title: string;
  when: string;
  msgs: ChatMessage[];
  runs?: RunItem[];
  tasks?: TaskItem[];
}

export interface TasksState {
  busy: boolean;
  msgs: ChatMessage[];
  tasks: TaskItem[];
  runs: RunItem[];
  tab: "gen" | "lab";
  sel: string | null;
  draft: string;
  ed: null | {
    id: string | null;
    d: {
      title: string;
      diff: "Easy" | "Medium" | "Hard";
      marks: number;
      min: number;
      dep: string;
      desc: string;
      ref: string;
    };
    e: Record<string, string>;
  };
  run: number;
  chats: ChatHistoryItem[];
  editMsg: number | null;
  editDraft: string;
}

export interface ScoringFileRule {
  name: string;
  title: string;
  desc: string;
  checks: string[];
}

export interface VerificationState {
  st: "idle" | "running" | "done";
  p: number; // 0: temp ws, 1: fail case, 2: pass case
  done: Record<number, boolean>;
  log: string[];
  run: number;
}

export interface ScoringState {
  startup: string;
  test: string;
  allow: boolean;
  rules: null | {
    files: Record<string, string>;
    fileRules: ScoringFileRule[];
    timestamp: string;
    test_command?: string;
  };
  solutionFiles?: Record<string, string>;
  activeFile?: string;
  rulesOutOfDate?: boolean;
  pushed: string | null;
  ver: VerificationState;
  open: Record<string, boolean>;
  genCmd: boolean;
  genRules: boolean;
  pushing: boolean;
}

export interface WizardFormData {
  title: string;
  desc: string;
  domain: string;
  difficulty: string;
  marks: number;
  dur: number;
  scenario: string;
  role: string;
  repo: string;
  url: string;
  branch: string;
  github_repo_id?: string;
  github_installation_id?: string | null;
  github_app_installation?: string | null;
}

export interface ScanState {
  scanning: boolean;
  stageIndex: number;
  files: string[] | null;
  fileCount: number;
  keyFiles: Record<string, string>;
  cloneToken?: string;
  workspaceId?: string | null;
  clonedRepoUrl?: string;
  clonedBranch?: string;
}

export interface WizardState {
  questionUuid?: string;
  step: number;
  reached: number;
  type: QuestionCategory;
  f: WizardFormData;
  e: Record<string, string>;
  stack: Record<StackKey, string[]>;
  custom: Record<StackKey, string[]>;
  addTagCategory: StackKey | null;
  rp: {
    open: boolean;
    q: string;
    i: number;
  };
  scan: ScanState;
  t: TasksState;
  sc: ScoringState;
  sp: {
    a2: number;
    a3: number;
    b3: number;
  };
  menu: boolean;
  hmenu: boolean;
}

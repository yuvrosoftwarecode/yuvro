import { restApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { mapDomainToFrontend } from "@/lib/recruiter";

export interface LabTask {
  id: string;
  t: string;
  title: string;
  m: number;
  marks: number;
  d: number;
  duration_minutes: number;
  duration: number;
  x: string;
  description: string;
  hid: boolean;
  hidden: boolean;
}

export interface LabLibraryItem {
  id: string;
  t: string;
  title: string;
  type: string;
  lab_type: string;
  dom: string;
  domain: string;
  langs: string[];
  programming_languages: string[];
  dbs: string[];
  databases: string[];
  sc: string;
  scenario: string;
  df: "Easy" | "Medium" | "Hard";
  difficulty: "Easy" | "Medium" | "Hard";
  min: number;
  duration_minutes: number;
  marks: number;
  tasks: LabTask[];
  desc: string;
  description: string;
}

export interface LabFilterParams {
  dom?: string;
  lang?: string;
  type?: string;
  db?: string;
  sc?: string;
  df?: string;
}

export interface LabSearchParams {
  q?: string;
  filters?: LabFilterParams;
  sort?: "" | "easy" | "short" | "marks";
  offset?: number;
  limit?: number;
}

export interface LabSearchResult {
  items: LabLibraryItem[];
  total: number;
  totalAvailable?: number;
}

function normalizeLanguageName(l: any): string {
  if (!l || typeof l !== "string") return "";
  const upper = l.trim().toUpperCase();
  const map: Record<string, string> = {
    PYTHON: "Python",
    JAVASCRIPT: "JavaScript",
    TYPESCRIPT: "TypeScript",
    JAVA: "Java",
    C: "C",
    CPP: "C++",
    "C++": "C++",
    C_PLUS_PLUS: "C++",
    CSHARP: "C#",
    "C#": "C#",
    SQL: "SQL",
    GO: "Go",
    GOLANG: "Go",
    RUST: "Rust",
    PHP: "PHP",
    RUBY: "Ruby",
    KOTLIN: "Kotlin",
    SWIFT: "Swift",
    HTML: "HTML",
    CSS: "CSS",
  };
  return map[upper] || (l.charAt(0).toUpperCase() + l.slice(1));
}

function normalizeDatabaseName(d: any): string {
  if (!d || typeof d !== "string") return "";
  const upper = d.trim().toUpperCase();
  const map: Record<string, string> = {
    SQLITE: "SQLite",
    POSTGRESQL: "PostgreSQL",
    POSTGRES: "PostgreSQL",
    MYSQL: "MySQL",
    MONGODB: "MongoDB",
    MONGO: "MongoDB",
    REDIS: "Redis",
    DYNAMODB: "DynamoDB",
    CASSANDRA: "Cassandra",
    ORACLE: "Oracle",
  };
  return map[upper] || (d.charAt(0).toUpperCase() + d.slice(1));
}

function normalizeScenario(s: any): string {
  if (!s || typeof s !== "string") return "Feature development";
  const upper = s.trim().toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    BUG_FIXING: "Bug fixing",
    DEBUGGING: "Bug fixing",
    FEATURE_DEVELOPMENT: "Feature development",
    PERFORMANCE_OPTIMIZATION: "Performance optimization",
    API_OPTIMIZATION: "Performance optimization",
    PERFORMANCE: "Performance optimization",
    SECURITY: "Security",
    DATA_INTEGRITY: "Data integrity",
    INFRASTRUCTURE: "Infrastructure",
    ARCHITECTURE: "Infrastructure",
    TESTING: "Testing",
    PRODUCTION_INCIDENT: "Bug fixing",
  };
  if (map[upper]) return map[upper];
  const words = s.replace(/_/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function normalizeDifficulty(df: any): "Easy" | "Medium" | "Hard" {
  const upper = String(df || "").trim().toUpperCase();
  if (upper === "EASY") return "Easy";
  if (upper === "HARD") return "Hard";
  return "Medium";
}

function normalizeLabType(t: any): string {
  if (!t || typeof t !== "string") return "Backend";
  const upper = t.trim().toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    BACKEND: "Backend",
    FRONTEND: "Frontend",
    FULL_STACK: "Full Stack",
    FULLSTACK: "Full Stack",
    DATABASE: "Database",
    QUALITY_ASSURANCE: "QA",
    QA: "QA",
    DEVOPS: "DevOps",
  };
  if (map[upper]) return map[upper];
  const words = t.replace(/_/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function normalizeTasks(
  rawTasks: any[],
  labMarks: number,
  labDuration: number,
  labTitle: string,
  labDesc: string,
): LabTask[] {
  if (Array.isArray(rawTasks) && rawTasks.length > 0) {
    const defaultTaskMarks = Math.max(1, Math.round(labMarks / rawTasks.length));
    const defaultTaskDuration = Math.max(1, Math.round(labDuration / rawTasks.length));
    return rawTasks.map((t: any, idx: number) => {
      const title = t.title || t.name || `Task ${idx + 1}`;
      const desc = t.description || "";
      const marks = Number(t.marks ?? defaultTaskMarks) || 5;
      const duration =
        Number(t.duration_minutes ?? t.duration ?? defaultTaskDuration) || 10;
      const isHidden = Boolean(t.is_hidden || t.hidden);
      const id = String(t.id || t.task_slug || `task-${idx}`);
      return {
        id,
        t: title,
        title,
        m: marks,
        marks,
        d: duration,
        duration_minutes: duration,
        duration,
        x: desc,
        description: desc,
        hid: isHidden,
        hidden: isHidden,
      };
    });
  }

  // If lab has no tasks defined, create a default task representing the lab
  return [
    {
      id: "task-0",
      t: labTitle,
      title: labTitle,
      m: labMarks,
      marks: labMarks,
      d: labDuration,
      duration_minutes: labDuration,
      duration: labDuration,
      x: labDesc,
      description: labDesc,
      hid: false,
      hidden: false,
    },
  ];
}

export function normalizeBackendLab(raw: any, index: number = 0): LabLibraryItem {
  const id = String(raw.id || `lab-${index}`);
  const title = String(raw.title || raw.name || "Untitled Lab").trim();
  const domain = mapDomainToFrontend(raw.domain);

  const rawLangs = Array.isArray(raw.programming_languages)
    ? raw.programming_languages
    : Array.isArray(raw.languages)
    ? raw.languages
    : raw.programming_language
    ? [raw.programming_language]
    : [];
  const langs: string[] = Array.from(
    new Set(rawLangs.map(normalizeLanguageName).filter(Boolean)),
  );

  const rawDbs = Array.isArray(raw.databases)
    ? raw.databases
    : raw.database
    ? [raw.database]
    : [];
  const dbs: string[] = Array.from(
    new Set(rawDbs.map(normalizeDatabaseName).filter(Boolean)),
  );

  const labType = normalizeLabType(
    raw.type || raw.lab_type || (raw.databases?.length ? "Database" : "Backend"),
  );
  const scenario = normalizeScenario(raw.scenario || raw.scenario_type || "Feature development");
  const difficulty = normalizeDifficulty(raw.difficulty);
  const duration_minutes = Number(raw.duration_minutes || raw.duration || 30);
  const marks = Number(raw.marks || 10);
  const description = String(raw.description || raw.prompt || "").trim();

  const tasks = normalizeTasks(raw.tasks, marks, duration_minutes, title, description);

  return {
    id,
    t: title,
    title,
    type: labType,
    lab_type: labType,
    dom: domain,
    domain,
    langs,
    programming_languages: langs,
    dbs,
    databases: dbs,
    sc: scenario,
    scenario,
    df: difficulty,
    difficulty,
    min: duration_minutes,
    duration_minutes,
    marks,
    tasks,
    desc: description,
    description,
  };
}

let cachedLabs: LabLibraryItem[] | null = null;
let fetchLabsPromise: Promise<LabLibraryItem[]> | null = null;

export const ALL_LABS: LabLibraryItem[] = [];

export const LAB_FILTER_OPTIONS: {
  dom: string[];
  lang: string[];
  type: string[];
  sc: string[];
  df: readonly string[];
} = {
  dom: [
    "Finance",
    "Insurance",
    "Supply Chain",
    "Healthcare",
    "EdTech",
    "Retail",
    "Payment",
    "Other",
  ],
  lang: ["C", "C++", "Python", "Java", "SQL", "JavaScript", "TypeScript", "Go"],
  type: ["Backend", "Frontend", "Full Stack", "Database", "QA", "DevOps"],
  sc: [
    "Bug fixing",
    "Feature development",
    "Performance optimization",
    "Security",
    "Data integrity",
    "Infrastructure",
  ],
  df: ["Easy", "Medium", "Hard"] as const,
};

function updateFilterOptions(labs: LabLibraryItem[]) {
  const domSet = new Set(LAB_FILTER_OPTIONS.dom);
  const langSet = new Set(LAB_FILTER_OPTIONS.lang);
  const typeSet = new Set(LAB_FILTER_OPTIONS.type);
  const scSet = new Set(LAB_FILTER_OPTIONS.sc);

  labs.forEach((l) => {
    if (l.domain) domSet.add(l.domain);
    l.programming_languages.forEach((lang) => {
      if (lang) langSet.add(lang);
    });
    if (l.type) typeSet.add(l.type);
    if (l.scenario) scSet.add(l.scenario);
  });

  LAB_FILTER_OPTIONS.dom = Array.from(domSet) as string[];
  LAB_FILTER_OPTIONS.lang = Array.from(langSet) as string[];
  LAB_FILTER_OPTIONS.type = Array.from(typeSet) as string[];
  LAB_FILTER_OPTIONS.sc = Array.from(scSet) as string[];
}

export const LAB_FILTER_LABELS: Record<string, string> = {
  dom: "Domain",
  lang: "Language",
  type: "Lab Type",
  sc: "Scenario",
  df: "Difficulty",
};

export async function fetchRealLabs(forceRefresh = false): Promise<LabLibraryItem[]> {
  if (cachedLabs && !forceRefresh) {
    return cachedLabs;
  }
  if (fetchLabsPromise && !forceRefresh) {
    return fetchLabsPromise;
  }

  fetchLabsPromise = (async () => {
    try {
      const data = await restApiAuthUtil.get<any[]>("/skill_evaluation/lab-questions/");
      const rawList = Array.isArray(data) ? data : (data as any)?.results || [];
      const normalized = rawList.map((item: any, idx: number) =>
        normalizeBackendLab(item, idx),
      );
      cachedLabs = normalized;
      ALL_LABS.length = 0;
      ALL_LABS.push(...normalized);
      updateFilterOptions(normalized);
      return normalized;
    } catch (err) {
      console.error("Failed to fetch real lab questions from backend API:", err);
      cachedLabs = [];
      ALL_LABS.length = 0;
      return [];
    } finally {
      fetchLabsPromise = null;
    }
  })();

  return fetchLabsPromise;
}

export function refreshLabs(): Promise<LabLibraryItem[]> {
  return fetchRealLabs(true);
}

export async function searchLabs({
  q = "",
  filters = {},
  sort = "",
  offset = 0,
  limit = 20,
}: LabSearchParams): Promise<LabSearchResult> {
  const allLabs = await fetchRealLabs();
  const query = q.trim().toLowerCase();
  const f = filters;

  const filtered = allLabs.filter((l) => {
    const matchesQuery =
      !query ||
      l.title.toLowerCase().includes(query) ||
      l.description.toLowerCase().includes(query) ||
      l.domain.toLowerCase().includes(query) ||
      l.programming_languages.some((pl) => pl.toLowerCase().includes(query));

    const matchesDom = !f.dom || l.domain.toLowerCase() === f.dom.toLowerCase();
    const matchesLang =
      !f.lang ||
      l.programming_languages.some(
        (lang) => lang.toLowerCase() === f.lang?.toLowerCase(),
      );
    const matchesType =
      !f.type ||
      l.type.toLowerCase() === f.type.toLowerCase();
    const matchesDb =
      !f.db ||
      l.databases.some((db) => db.toLowerCase() === f.db?.toLowerCase());
    const matchesSc = !f.sc || l.scenario.toLowerCase() === f.sc.toLowerCase();
    const matchesDf = !f.df || l.difficulty.toLowerCase() === f.df.toLowerCase();

    return matchesQuery && matchesDom && matchesLang && matchesType && matchesDb && matchesSc && matchesDf;
  });

  const difficultyRanks: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
  const sorted = [...filtered];

  if (sort === "easy") {
    sorted.sort(
      (a, b) => (difficultyRanks[a.difficulty] ?? 0) - (difficultyRanks[b.difficulty] ?? 0),
    );
  } else if (sort === "short") {
    sorted.sort((a, b) => a.duration_minutes - b.duration_minutes);
  } else if (sort === "marks") {
    sorted.sort((a, b) => b.marks - a.marks);
  }

  const items = sorted.slice(offset, offset + limit);

  return {
    items,
    total: sorted.length,
    totalAvailable: allLabs.length,
  };
}

export async function getLab(id: string): Promise<LabLibraryItem | null> {
  const allLabs = await fetchRealLabs();
  const found = allLabs.find((l) => String(l.id) === String(id));
  if (found) {
    return JSON.parse(JSON.stringify(found));
  }

  // If not found in cache, attempt single fetch from backend
  try {
    const raw = await restApiAuthUtil.get<any>(`/skill_evaluation/lab-questions/${id}/`);
    if (raw && (raw.id || raw.title)) {
      const normalized = normalizeBackendLab(raw);
      return normalized;
    }
  } catch (err) {
    console.warn(`Lab question ${id} not found on backend:`, err);
  }

  return null;
}

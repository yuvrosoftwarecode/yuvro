// Per-lab sprints & tasks store (localStorage).
export type EditorKind = "code" | "sql" | "none";
export const EDITORS: { value: EditorKind; label: string }[] = [
  { value: "code", label: "Code Editor" },
  { value: "sql", label: "SQL Editor" },
  { value: "none", label: "No Editor (theory / quiz)" },
];

export const LANGUAGES = [
  "python", "javascript", "typescript", "java", "c", "cpp", "csharp",
  "go", "rust", "ruby", "php", "kotlin", "swift", "scala", "html", "css", "sql", "bash",
] as const;
export type Language = (typeof LANGUAGES)[number];

export interface LabTask {
  id: string;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  xp: number;
  estMin: number;
  editor: EditorKind;
  language: Language;
  starterCode: string;
  starterPath?: string;
}

export interface LabSprint {
  id: string;
  name: string;
  description: string;
  tasks: LabTask[];
}

const KEY = "yuvro-admin-lab-sprints";

type Store = Record<string, LabSprint[]>;

function readAll(): Store {
  if (typeof window === "undefined") return {};
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Store) : {}; } catch { return {}; }
}
function writeAll(store: Store) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
}

export function loadSprints(labId: string): LabSprint[] {
  return readAll()[labId] ?? [];
}

export function saveSprints(labId: string, sprints: LabSprint[]) {
  const store = readAll();
  store[labId] = sprints;
  writeAll(store);
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export function newSprint(): LabSprint {
  return { id: newId("sp"), name: "New Sprint", description: "", tasks: [] };
}

export function newTask(): LabTask {
  return {
    id: newId("tk"),
    title: "New Task",
    description: "",
    difficulty: "Beginner",
    xp: 100,
    estMin: 30,
    editor: "code",
    language: "python",
    starterCode: "# Write your solution here\n",
  };
}

// ---- Seed sprints/tasks from the student-side catalog ----
import { tickets as catalogTickets, type Ticket } from "@/lib/dummy";

const SPRINT_GROUPS: Record<string, { id: string; name: string; goal: string; tags: string[] }[]> = {
  java: [
    { id: "S1", name: "Sprint 1 · Foundations", goal: "Master language fundamentals & control flow", tags: ["Fundamentals"] },
    { id: "S2", name: "Sprint 2 · OOP Core", goal: "Classes, inheritance and interfaces", tags: ["OOP"] },
    { id: "S3", name: "Sprint 3 · Generics & Errors", goal: "Type-safe APIs and resilient error handling", tags: ["Generics", "Errors", "I/O"] },
    { id: "S4", name: "Sprint 4 · Collections", goal: "Lists, maps and idiomatic data access", tags: ["Collections"] },
    { id: "S5", name: "Sprint 5 · Advanced Java", goal: "Streams, concurrency, testing & patterns", tags: ["Streams", "FP", "Threads", "DB", "Testing", "Patterns"] },
  ],
  python: [
    { id: "PS1", name: "Sprint 1 · Python Foundations", goal: "Types, collections, control flow & functions", tags: ["Py Fundamentals"] },
    { id: "PS2", name: "Sprint 2 · Data & APIs", goal: "Files, JSON, requests and pandas basics", tags: ["Py Data"] },
  ],
  pydjango: [
    { id: "DJ1", name: "Sprint 1 · Project setup", goal: "Bootstrap a Django project and app", tags: ["Django Bootstrap"] },
    { id: "DJ2", name: "Sprint 2 · Models & data", goal: "Models, migrations and the ORM", tags: ["Django Models"] },
    { id: "DJ3", name: "Sprint 3 · Views & URLs", goal: "Function/class-based views and routing", tags: ["Django Views"] },
    { id: "DJ4", name: "Sprint 4 · Templates", goal: "Template inheritance and tags", tags: ["Django Templates"] },
    { id: "DJ5", name: "Sprint 5 · Forms", goal: "Forms and ModelForm validation", tags: ["Django Forms"] },
    { id: "DJ6", name: "Sprint 6 · Admin", goal: "Customize the Django admin", tags: ["Django Admin"] },
    { id: "DJ7", name: "Sprint 7 · REST APIs", goal: "Build CRUD APIs with DRF", tags: ["Django REST"] },
  ],
  pyflask: [
    { id: "FL1", name: "Sprint 1 · Intro & routing", goal: "Hello Flask and basic routes", tags: ["Flask Intro"] },
    { id: "FL2", name: "Sprint 2 · Templates", goal: "Render HTML with Jinja2", tags: ["Flask Templates"] },
    { id: "FL3", name: "Sprint 3 · Blueprints", goal: "Structure with blueprints & app factory", tags: ["Flask Blueprints"] },
    { id: "FL4", name: "Sprint 4 · Database", goal: "Models with Flask-SQLAlchemy", tags: ["Flask DB"] },
    { id: "FL5", name: "Sprint 5 · REST API", goal: "Build JSON CRUD endpoints", tags: ["Flask REST"] },
    { id: "FL6", name: "Sprint 6 · Auth", goal: "JWT authentication", tags: ["Flask Auth"] },
  ],
  javaspring: [
    { id: "SP1", name: "Sprint 1 · Spring Boot intro", goal: "Bootstrap a Spring Boot app", tags: ["Spring Intro"] },
    { id: "SP2", name: "Sprint 2 · Dependency Injection", goal: "Beans, scopes and DI", tags: ["Spring DI"] },
    { id: "SP3", name: "Sprint 3 · REST APIs", goal: "Controllers, validation and error handling", tags: ["Spring REST"] },
    { id: "SP4", name: "Sprint 4 · Spring Data JPA", goal: "Entities and repositories", tags: ["Spring JPA"] },
    { id: "SP5", name: "Sprint 5 · Security", goal: "Secure endpoints with Spring Security", tags: ["Spring Security"] },
    { id: "SP6", name: "Sprint 6 · Testing", goal: "Integration and slice tests", tags: ["Spring Testing"] },
  ],
  postgres: [
    { id: "PG1", name: "Sprint 1 · Querying", goal: "SELECT, filtering and aggregates", tags: ["PG Querying"] },
    { id: "PG2", name: "Sprint 2 · Joins", goal: "Combine tables with JOINs", tags: ["PG Joins"] },
    { id: "PG3", name: "Sprint 3 · Advanced SQL", goal: "CTEs and recursion", tags: ["PG Advanced"] },
    { id: "PG4", name: "Sprint 4 · JSONB", goal: "Query and index JSONB", tags: ["PG JSONB"] },
    { id: "PG5", name: "Sprint 5 · Window functions", goal: "Ranking and running totals", tags: ["PG Windows"] },
    { id: "PG6", name: "Sprint 6 · Tuning", goal: "EXPLAIN ANALYZE and indexes", tags: ["PG Tuning"] },
  ],
  git: [
    { id: "G1", name: "Sprint 1 · Setup", goal: "Install git and set up SSH keys", tags: ["Git Setup"] },
    { id: "G2", name: "Sprint 2 · Basics", goal: "init, add, commit and stash", tags: ["Git Basics"] },
    { id: "G3", name: "Sprint 3 · Remotes", goal: "Clone, push and pull", tags: ["Git Remotes"] },
    { id: "G4", name: "Sprint 4 · Branching", goal: "Branches and switching", tags: ["Git Branching"] },
    { id: "G5", name: "Sprint 5 · Merging", goal: "Fast-forward and 3-way merges", tags: ["Git Merging"] },
    { id: "G6", name: "Sprint 6 · Rebase", goal: "Rebase and interactive rebase", tags: ["Git Rebase"] },
    { id: "G7", name: "Sprint 7 · Conflicts", goal: "Resolve merge conflicts", tags: ["Git Conflicts"] },
    { id: "G8", name: "Sprint 8 · Tags & PRs", goal: "Tags, releases and pull request workflow", tags: ["Git Tags", "Git PRs"] },
    { id: "G9", name: "Sprint 9 · Recovery", goal: "Reset, revert and reflog", tags: ["Git Recovery", "Git Advanced"] },
  ],
  ui: [
    { id: "US1", name: "Sprint 1 · HTML & CSS", goal: "Semantic markup, box model and specificity", tags: ["HTML/CSS"] },
    { id: "US2", name: "Sprint 2 · Layout", goal: "Flexbox, Grid and responsive breakpoints", tags: ["Layout"] },
    { id: "US3", name: "Sprint 3 · React Essentials", goal: "Components, state, effects and custom hooks", tags: ["React"] },
    { id: "US4", name: "Sprint 4 · Accessibility", goal: "Build inclusive UI: keyboard, focus, contrast", tags: ["Accessibility"] },
  ],
  sql: [
    { id: "QS1", name: "Sprint 1 · Querying", goal: "SELECT, filtering, aggregates and CTEs", tags: ["Querying"] },
    { id: "QS2", name: "Sprint 2 · Joins", goal: "Combine tables with INNER, LEFT and multi-joins", tags: ["Joins"] },
    { id: "QS3", name: "Sprint 3 · Window Functions", goal: "Ranking, LAG/LEAD and running totals", tags: ["Windows"] },
    { id: "QS4", name: "Sprint 4 · Performance & Modeling", goal: "EXPLAIN, indexes and normalization", tags: ["Tuning"] },
  ],
  mongo: [
    { id: "MS1", name: "Sprint 1 · CRUD basics", goal: "Insert, find, update and delete documents", tags: ["Mongo CRUD"] },
    { id: "MS2", name: "Sprint 2 · Query Operators", goal: "Comparison, logical, array and nested queries", tags: ["Mongo Query"] },
    { id: "MS3", name: "Sprint 3 · Aggregation Pipelines", goal: "$match, $group, $lookup and projections", tags: ["Aggregation"] },
    { id: "MS4", name: "Sprint 4 · Indexes & Performance", goal: "Design indexes and read explain plans", tags: ["Mongo Indexes"] },
  ],
  programming: [
    { id: "PG1", name: "Sprint 1 · Intro", goal: "Hello world, comments and reading input", tags: ["Prog Intro"] },
    { id: "PG2", name: "Sprint 2 · Variables & Operators", goal: "Types, arithmetic, boolean and comparisons", tags: ["Prog Variables"] },
    { id: "PG3", name: "Sprint 3 · Control Flow", goal: "if/else, nested and switch/match", tags: ["Prog Control Flow"] },
    { id: "PG4", name: "Sprint 4 · Loops", goal: "for/while, break/continue, nested patterns", tags: ["Prog Loops"] },
    { id: "PG5", name: "Sprint 5 · Functions", goal: "Define, call, defaults, kwargs and recursion", tags: ["Prog Functions"] },
    { id: "PG6", name: "Sprint 6 · Strings", goal: "Slicing, methods and palindrome check", tags: ["Prog Strings"] },
    { id: "PG7", name: "Sprint 7 · File I/O", goal: "Read/write files and word count", tags: ["Prog File I/O"] },
    { id: "PG8", name: "Sprint 8 · Error Handling", goal: "try/except and custom exceptions", tags: ["Prog Errors"] },
    { id: "PG9", name: "Sprint 9 · OOP Basics", goal: "Classes, inheritance and dunder methods", tags: ["Prog OOP"] },
  ],
  datastructures: [
    { id: "DS1", name: "Sprint 1 · Arrays", goal: "Traversal, two-pointer and sliding window", tags: ["DS Arrays"] },
    { id: "DS2", name: "Sprint 2 · Linked Lists", goal: "Singly linked lists, reverse and cycle detection", tags: ["DS Linked Lists"] },
    { id: "DS3", name: "Sprint 3 · Stacks", goal: "Stack ops, parentheses and min stack", tags: ["DS Stacks"] },
    { id: "DS4", name: "Sprint 4 · Queues", goal: "Two-stack queue, circular queue and deque", tags: ["DS Queues"] },
    { id: "DS5", name: "Sprint 5 · Hashing", goal: "Hash maps, two-sum and group anagrams", tags: ["DS Hashing"] },
    { id: "DS6", name: "Sprint 6 · Trees", goal: "Traversals, BST and LCA", tags: ["DS Trees"] },
    { id: "DS7", name: "Sprint 7 · Heaps", goal: "Heapify and top-K problems", tags: ["DS Heaps"] },
    { id: "DS8", name: "Sprint 8 · Graphs", goal: "BFS, DFS and Dijkstra", tags: ["DS Graphs"] },
    { id: "DS9", name: "Sprint 9 · Sorting", goal: "Bubble, merge and quick sort", tags: ["DS Sorting"] },
    { id: "DS10", name: "Sprint 10 · Searching", goal: "Binary search and rotated array search", tags: ["DS Searching"] },
  ],
};

const SLUG_LANGUAGE: Record<string, Language> = {
  java: "java", python: "python", ui: "javascript", sql: "sql",
  mongo: "javascript", programming: "python", datastructures: "python",
  systemdesign: "javascript", cybersecurity: "python",
  pydjango: "python", pyflask: "python", javaspring: "java",
  postgres: "sql", git: "bash",
};

const STARTERS: Record<Language, string> = {
  python: "# Write your solution here\n", javascript: "// Write your solution here\n",
  typescript: "// Write your solution here\n", java: "class Solution {\n  // Write your code\n}\n",
  c: "#include <stdio.h>\nint main(){ return 0; }\n", cpp: "#include <iostream>\nint main(){ return 0; }\n",
  csharp: "// Write your solution here\n", go: "package main\nfunc main(){}\n",
  rust: "fn main(){}\n", ruby: "# Write your solution here\n",
  php: "<?php\n// Write your solution here\n", kotlin: "fun main(){}\n",
  swift: "// Write your solution here\n", scala: "object Main extends App {}\n",
  html: "<!doctype html>\n<html></html>\n", css: "/* styles */\n",
  sql: "-- Write your query here\n", bash: "#!/usr/bin/env bash\n",
};

function ticketToTask(t: Ticket, lang: Language): LabTask {
  const editor: EditorKind = lang === "sql" ? "sql" : "code";
  return {
    id: t.id, title: t.title, description: t.description,
    difficulty: t.difficulty, xp: t.xp, estMin: t.estMin,
    editor, language: lang, starterCode: STARTERS[lang] ?? "",
  };
}

export function seedSprintsFromCatalog(slug: string): LabSprint[] {
  const groups = SPRINT_GROUPS[slug];
  if (!groups) return [];
  const lang = SLUG_LANGUAGE[slug] ?? "python";
  return groups.map(g => ({
    id: g.id, name: g.name, description: g.goal,
    tasks: catalogTickets.filter(t => g.tags.includes(t.tag)).map(t => ticketToTask(t, lang)),
  }));
}

export function loadSprintsWithSeed(labId: string, slug: string): LabSprint[] {
  const stored = loadSprints(labId);
  if (stored.length) return stored;
  return seedSprintsFromCatalog(slug);
}


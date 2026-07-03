// Admin-side labs store. Seeds from the student-side `labs` catalog and layers
// localStorage edits/additions/deletions on top.
import { labs as studentLabs, type Lab } from "@/lib/dummy";

export type LabType =
  | "database"
  | "backend"
  | "frontend"
  | "full_stack"
  | "qa"
  | "devops"
  | "ai";

export type LabDifficulty = "easy" | "medium" | "hard";

export interface AdminLab {
  id: string;              // slug or generated id
  slug: string;
  title: string;
  icon: string;
  type: LabType;
  description: string;
  prerequisites: string[];
  skills: string[];
  gitRepoStarterUrl: string;
  difficulty: LabDifficulty;
  isActive: boolean;
  custom?: boolean;
  createdAt?: number;
}

export const LAB_TYPES: { value: LabType; label: string }[] = [
  { value: "database", label: "Database" },
  { value: "backend", label: "Backend" },
  { value: "frontend", label: "Frontend" },
  { value: "full_stack", label: "Full Stack" },
  { value: "qa", label: "Quality Assurance" },
  { value: "devops", label: "DevOps" },
  { value: "ai", label: "AI" },
];

export const DIFFICULTIES: { value: LabDifficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export const labTypeLabel = (t: LabType) =>
  LAB_TYPES.find(x => x.value === t)?.label ?? t;
export const difficultyLabel = (d: LabDifficulty) =>
  DIFFICULTIES.find(x => x.value === d)?.label ?? d;

const ADDS = "yuvro-admin-labs-adds";
const EDITS = "yuvro-admin-labs-edits";
const DELS = "yuvro-admin-labs-dels";

const diffMap: Record<Lab["difficulty"], LabDifficulty> = {
  Beginner: "easy",
  Intermediate: "medium",
  Advanced: "hard",
};

const slugTypeMap: Record<string, LabType> = {
  sql: "database",
  postgres: "database",
  mongo: "database",
  ui: "frontend",
  git: "devops",
  cybersecurity: "devops",
  systemdesign: "backend",
  java: "backend",
  javaspring: "backend",
  python: "backend",
  pydjango: "backend",
  pyflask: "backend",
  programming: "backend",
  datastructures: "backend",
  linux: "devops",
  qa: "qa",
};

function seedFromStudent(l: Lab): AdminLab {
  return {
    id: l.slug,
    slug: l.slug,
    title: l.name,
    icon: l.icon,
    type: slugTypeMap[l.slug] ?? "backend",
    description: l.description,
    prerequisites: [],
    skills: (l.skills ?? []).map(s => s.name),
    gitRepoStarterUrl: "",
    difficulty: diffMap[l.difficulty],
    isActive: true,
  };
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function loadLabs(): AdminLab[] {
  const adds = read<AdminLab[]>(ADDS, []);
  const edits = read<Record<string, Partial<AdminLab>>>(EDITS, {});
  const dels = read<string[]>(DELS, []);

  const seeds = studentLabs.map(seedFromStudent).filter(l => !dels.includes(l.id));
  const merged = seeds.map(l => ({ ...l, ...(edits[l.id] ?? {}) }));
  return [...adds.filter(a => !dels.includes(a.id)), ...merged];
}

export function createLab(input: Omit<AdminLab, "id" | "createdAt" | "custom" | "slug"> & { slug?: string }): AdminLab {
  const adds = read<AdminLab[]>(ADDS, []);
  const slug = (input.slug?.trim() || input.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id = `custom-${slug}-${Date.now().toString(36)}`;
  const entry: AdminLab = { ...input, id, slug, custom: true, createdAt: Date.now() } as AdminLab;
  adds.unshift(entry);
  write(ADDS, adds);
  return entry;
}

export function updateLab(id: string, patch: Partial<AdminLab>) {
  const adds = read<AdminLab[]>(ADDS, []);
  const idx = adds.findIndex(a => a.id === id);
  if (idx >= 0) {
    adds[idx] = { ...adds[idx], ...patch };
    write(ADDS, adds);
    return;
  }
  const edits = read<Record<string, Partial<AdminLab>>>(EDITS, {});
  edits[id] = { ...(edits[id] ?? {}), ...patch };
  write(EDITS, edits);
}

export function deleteLab(id: string) {
  const adds = read<AdminLab[]>(ADDS, []);
  const remaining = adds.filter(a => a.id !== id);
  if (remaining.length !== adds.length) { write(ADDS, remaining); return; }
  const dels = read<string[]>(DELS, []);
  if (!dels.includes(id)) { dels.push(id); write(DELS, dels); }
}

export function getLab(id: string): AdminLab | undefined {
  return loadLabs().find(l => l.id === id);
}

// Admin-side labs store. Seeds from the student-side `labs` catalog and layers
// localStorage edits/additions/deletions on top.
import { labs as studentLabs, type Lab } from "@/lib/dummy";

export interface AdminLab {
  id: string;            // slug or generated id
  slug: string;
  name: string;
  icon: string;
  cat: string;           // category label
  color: Lab["color"] | "custom";
  diff: "Easy" | "Medium" | "Hard";
  difficulty: Lab["difficulty"];
  users: number;
  tickets: number;
  sprints: number;
  comp: number;
  rating: number;
  description: string;
  duration?: number;
  skills?: string;
  tags?: string;
  repoUrl?: string;
  repoBranch?: string;
  custom?: boolean;
  createdAt?: number;
}

const ADDS = "yuvro-admin-labs-adds";
const EDITS = "yuvro-admin-labs-edits";
const DELS = "yuvro-admin-labs-dels";

const diffMap: Record<Lab["difficulty"], "Easy" | "Medium" | "Hard"> = {
  Beginner: "Easy",
  Intermediate: "Medium",
  Advanced: "Hard",
};

const catMap: Record<string, string> = {
  java: "Java Backend",
  python: "Python",
  ui: "Frontend/UI",
  sql: "SQL",
  mongo: "MongoDB",
  prog: "Programming",
  ds: "Data Structures",
  sysd: "System Design",
  sec: "Security",
};

function seedFromStudent(l: Lab): AdminLab {
  return {
    id: l.slug,
    slug: l.slug,
    name: l.name,
    icon: l.icon,
    cat: catMap[l.color] ?? l.name,
    color: l.color,
    diff: diffMap[l.difficulty],
    difficulty: l.difficulty,
    users: Math.round(800 + l.total * 120),
    tickets: l.total,
    sprints: Math.max(3, Math.round(l.total / 4)),
    comp: Math.round((l.completed / Math.max(l.total, 1)) * 100),
    rating: 4.5,
    description: l.description,
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
  const slug = (input.slug?.trim() || input.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

export const CATEGORIES = ["Java Backend", "Python", "Frontend/UI", "SQL", "MongoDB", "Programming", "Data Structures", "DevOps", "Security", "System Design", "Collaboration"];
export const DIFFS = ["Easy", "Medium", "Hard"] as const;

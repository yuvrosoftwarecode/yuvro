export type LabTier = "free" | "freemium" | "premium";

export const TIER_META: Record<LabTier, {
  label: string;
  short: string;
  price: string;
  blurb: string;
  tone: "success" | "warning" | "primary";
}> = {
  free:     { label: "Free Access",     short: "Free",     price: "Free",   blurb: "Every sprint is fully unlocked. Learn at your own pace.", tone: "success" },
  freemium: { label: "Freemium",        short: "Freemium", price: "₹499",   blurb: "Sprint 1 is free as a preview. Unlock the full track to continue.", tone: "warning" },
  premium:  { label: "Premium Track",   short: "Premium",  price: "₹1,499", blurb: "Curated premium track. Unlock to access every sprint.", tone: "primary" },
};

const TIER_MAP: Record<string, LabTier> = {
  programming: "free",
  git: "free",
  linux: "free",
  python: "free",

  java: "freemium",
  ui: "freemium",
  sql: "freemium",
  mongo: "freemium",
  datastructures: "freemium",
  pydjango: "freemium",
  pyflask: "freemium",

  postgres: "premium",
  javaspring: "premium",
  systemdesign: "premium",
  cybersecurity: "premium",
  qa: "premium",
};

export function getLabTier(slug: string, name?: string): LabTier {
  if (TIER_MAP[slug]) return TIER_MAP[slug];
  
  if (name) {
    const n = name.toLowerCase();
    if (n.includes("linux") || n.includes("git") || n === "python") return "free";
    if (n.includes("java") && !n.includes("spring")) return "freemium";
    if (n.includes("ui") || n.includes("sql") || n.includes("data") || n.includes("django")) return "freemium";
    if (n.includes("spring") || n.includes("postgres") || n.includes("design") || n.includes("security") || n.includes("qa")) return "premium";
  }
  
  return "freemium";
}

const KEY = "yuvro-lab-unlocks-v1";
function read(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as string[]; } catch { return []; }
}
function write(list: string[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}
export function isLabUnlocked(slug: string): boolean {
  return read().includes(slug);
}
export function unlockLab(slug: string) {
  const list = read();
  if (!list.includes(slug)) { list.push(slug); write(list); }
}

export function freeSprintCount(tier: LabTier): number {
  if (tier === "free") return Infinity;
  if (tier === "freemium") return 1;
  return 0;
}

export function isSprintLocked(slug: string, index: number, name?: string): boolean {
  const tier = getLabTier(slug, name);
  if (tier === "free") return false;
  if (isLabUnlocked(slug)) return false;
  return index >= freeSprintCount(tier);
}

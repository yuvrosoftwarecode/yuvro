import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export type LabType =
  | "DATABASE"
  | "BACKEND"
  | "FRONTEND"
  | "FULL_STACK"
  | "QUALITY_ASSURANCE"
  | "DEVOPS"
  | "AI"
  | "SYSTEM_DESIGN";

export type LabDifficulty = "EASY" | "MEDIUM" | "HARD";

export type LabStatus = "active" | "inactive" | "draft" | "upcoming";

export interface AdminLab {
  id: string;
  title: string;
  slug?: string;
  icon: string;
  type: LabType;
  description: string;
  prerequisites: string;
  skills: string[];
  git_repo_starter_url: string;
  difficulty: LabDifficulty;
  status: LabStatus;
  is_active?: boolean;
  payment_tier: "free" | "freemium" | "premium";
  payment_amount: number;
  created_at?: string;
  updated_at?: string;
  custom?: boolean;
}

export const LAB_TYPES: { value: LabType; label: string }[] = [
  { value: "DATABASE", label: "Database" },
  { value: "BACKEND", label: "Backend" },
  { value: "FRONTEND", label: "Frontend" },
  { value: "FULL_STACK", label: "Full Stack" },
  { value: "QUALITY_ASSURANCE", label: "Quality Assurance" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "AI", label: "AI" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
];

export const DIFFICULTIES: { value: LabDifficulty; label: string }[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

export const LAB_STATUSES: { value: LabStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "draft", label: "Draft" },
  { value: "inactive", label: "Inactive" },
];

export const labTypeLabel = (t: LabType) =>
  LAB_TYPES.find((x) => x.value === t || x.value.toLowerCase() === (t as string)?.toLowerCase())
    ?.label ?? t;
export const difficultyLabel = (d: LabDifficulty) =>
  DIFFICULTIES.find(
    (x) => x.value === d || x.value.toLowerCase() === (d as string)?.toLowerCase(),
  )?.label ?? d;
export const labStatusLabel = (s?: LabStatus | string) =>
  LAB_STATUSES.find((x) => x.value === s || x.value.toLowerCase() === s?.toLowerCase())
    ?.label ?? (s ? s.charAt(0).toUpperCase() + s.slice(1) : "Active");

export async function loadLabs(): Promise<AdminLab[]> {
  return await restApiAuthUtil.get<AdminLab[]>("/lab/labs/");
}

export async function createLab(input: Partial<AdminLab>): Promise<AdminLab> {
  return await restApiAuthUtil.post<AdminLab>("/lab/labs/", input);
}

export async function updateLab(id: string, patch: Partial<AdminLab>): Promise<AdminLab> {
  return await restApiAuthUtil.patch<AdminLab>(`/lab/labs/${id}/`, patch);
}

export async function deleteLab(id: string): Promise<void> {
  await restApiAuthUtil.delete(`/lab/labs/${id}/`);
}

export async function getLab(id: string): Promise<AdminLab | undefined> {
  try {
    return await restApiAuthUtil.get<AdminLab>(`/lab/labs/${id}/`);
  } catch (err) {
    return undefined;
  }
}

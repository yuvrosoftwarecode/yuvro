export type Category = "Backend" | "Frontend" | "Data" | "DevOps & Cloud" | "System Design" | "AI/ML" | "Security" | "Behavioural";
export const CATEGORIES: Category[] = ["Backend", "Frontend", "Data", "DevOps & Cloud", "System Design", "AI/ML", "Security", "Behavioural"];
export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;
export type Diff = typeof DIFFICULTIES[number];
export const ROLES = ["Fresher", "SDE I", "SDE II", "Senior"] as const;

export interface Interview {
  slug: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  category: Category;
  difficulty: Diff;
  role: typeof ROLES[number];
  questions: number;
  minutes: number;
  completed: number;
  featured?: boolean;
  backendId?: string;
  predefinedTree?: any;
  requiredSkills?: string[];
  optionalSkills?: string[];
  instructions?: string;
  interviewMode?: string;
  products?: string[];
  mySubmissions?: any[];
  userProgress?: {
    completed_count: number;
    is_master: boolean;
  } | null;
}

export const INTERVIEWS: Interview[] = [];

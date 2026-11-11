export type WorkType =
  | "Internship"
  | "Full-time"
  | "Part-time"
  | "Freelance"
  | "Volunteer"
  | "Research";

export interface WorkItem {
  id: string;
  type: WorkType;
  role: string;
  company: string;
  from: string; // YYYY-MM
  to?: string; // YYYY-MM or undefined if current
  current: boolean;
  responsibilities: string[];
  technologies: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  role?: string;
  from?: string; // YYYY-MM
  to?: string; // YYYY-MM
  ongoing: boolean;
  bullets: string[];
  technologies: string[];
  link?: string; // https://
}

export interface EducationItem {
  id: string;
  school: string;
  degree?: string;
  field?: string;
  startYear?: number;
  endYear?: number; // or expected
}

export type SkillLevel = "Beginner" | "Intermediate" | "Advanced";

export interface VerifiedSkill {
  id: string;
  name: string;
  level: SkillLevel;
  tasksCount: number;
}

export interface Resume {
  id: string;
  fileName: string;
  fileSize: number; // in bytes
  uploadedAt: string; // ISO date
  url?: string;
}

export interface Connection {
  platform: "github" | "linkedin";
  handle: string;
  connected: boolean;
  connectedAt?: string;
}

export interface Profile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  about: string;
  avatarUrl?: string;
  coverUrl?: string;
  userSkills: string[];
  verifiedSkills: VerifiedSkill[];
  work: WorkItem[];
  projects: ProjectItem[];
  education: EducationItem[];
  resume?: Resume;
  connections: Connection[];
}

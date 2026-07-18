// Recruiter data + backend API
import { ycodeApiAuthUtil } from "../utils/RestApiAuthUtil";

export const DOMAINS = ["Finance", "Insurance", "EdTech", "Supply Chain", "Healthcare", "Retail", "Payment", "Other"] as const;
export type Domain = typeof DOMAINS[number];

export const PROGRAMMING_LANGUAGES = ["C", "C++", "Python", "Java", "SQL", "Bash", "JavaScript", "TypeScript"] as const;
export type ProgrammingLanguage = typeof PROGRAMMING_LANGUAGES[number];

export const DATABASES = ["SQLite", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch"] as const;
export type Database = typeof DATABASES[number];

export const SCENARIOS = ["Debugging", "Feature Development", "API Optimization", "Security", "Architecture", "Performance", "Testing", "Production Incident"] as const;
export type Scenario = typeof SCENARIOS[number];

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = typeof DIFFICULTIES[number];

export const EXPERIENCE_LEVELS = ["Intern", "Fresher", "Junior Developer", "Mid-Level Developer", "Senior Developer", "Lead Developer", "Staff Engineer", "Principal Engineer", "Software Architect", "Engineering Manager", "Director of Engineering", "VP of Engineering", "Chief Technology Officer"] as const;
export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];

export const FORMATS = ["MCQ", "Multiple Select", "Description", "Coding"] as const;
export type Format = typeof FORMATS[number];


export interface LabItem {
  id: string;
  title: string;
  domain: Domain;
  programming_languages: ProgrammingLanguage[];
  databases: Database[];
  scenario: Scenario;
  difficulty: Difficulty;
  marks: number;
  duration_minutes: number;
  tasks?: number; // legacy optional for frontend UI compat
}

export interface QuestionItem {
  id: string;
  text: string; // Wait, frontend uses text instead of title maybe? Or text was in the mock. Let's use text for compat
  title?: string;
  programming_languages: ProgrammingLanguage[];
  databases: Database[];
  difficulty: Difficulty;
  experience: ExperienceLevel;
  format: Format;
  marks: number;
  duration_minutes: number;
  seconds?: number; // legacy
  course?: string;
  topic?: string;
}

export interface CourseItem {
  id: string;
  name: string;
}

export interface TopicItem {
  id: string;
  name: string;
  course: string;
}

export type SectionType = "labs" | "assessment" | "discussion";

export interface LabsSection {
  id: string;
  kind: "labs";
  title: string;
  labs: LabItem[];
}
export interface AssessmentSection {
  id: string;
  kind: "assessment";
  title: string;
  questions: QuestionItem[];
  randomize?: boolean;
  shuffle?: boolean;
}
export interface DiscussionSection {
  id: string;
  kind: "discussion";
  title: string;
  duration: number;
  mode: "Automatic" | "Custom" | "Hybrid";
  questions: string[]; // custom questions
}
export type Section = LabsSection | AssessmentSection | DiscussionSection;

export interface Evaluation {
  id: string;
  title: string;
  domain: Domain | "";
  status: "draft" | "published";
  createdAt: number;
  publishedAt?: number;
  candidatesInvited: number;
  candidatesCompleted: number;
  sections: Section[];
  invite?: {
    type: "email" | "link" | "csv";
    emails: string[];
    expiry: "7" | "14" | "30" | "custom";
    attempts: "1" | "2" | "unlimited";
    link?: string;
  };
}

// Ensure unique ID generation
export function newUid() { return Math.random().toString(36).slice(2, 10); }

const API_BASE = "http://localhost:8002/api/skill_evaluation";

function mapBackendToFrontend(be: any): Evaluation {
  return {
    id: be.id,
    title: be.title || "Untitled Evaluation",
    domain: (be.domain === "OTHER" ? "" : be.domain) as any,
    status: be.is_published ? "published" : "draft",
    createdAt: be.created_at ? new Date(be.created_at).getTime() : Date.now(),
    candidatesInvited: be.candidate_invited_emails?.length || 0,
    candidatesCompleted: 0,
    invite: be.candidate_invited_emails?.length ? {
      type: "email",
      emails: be.candidate_invited_emails,
      expiry: "7",
      attempts: "1"
    } : undefined,
    sections: (be.sections || []).map((s: any) => {
      if (s.type === "LAB") {
        return { id: s.id || newUid(), kind: "labs", title: s.title, labs: s.questions || [] };
      } else if (s.type === "VITARKA_AI_INTERVIEW") {
        let meta = { duration: 15, mode: "Automatic" };
        try { meta = JSON.parse(s.description || "{}"); } catch {}
        return { id: s.id || newUid(), kind: "discussion", title: s.title, duration: meta.duration || 15, mode: meta.mode || "Automatic", questions: s.questions || [] };
      } else {
        return { id: s.id || newUid(), kind: "assessment", title: s.title, questions: s.questions || [] };
      }
    }),
  };
}

function mapFrontendToBackend(fe: Evaluation): any {
  return {
    title: fe.title,
    domain: fe.domain || "OTHER",
    is_published: fe.status === "published",
    candidate_invited_emails: (fe.invite?.type === "email" && fe.invite?.emails) ? fe.invite.emails : [],
    sections: fe.sections.map((s: any, idx: number) => {
      let type = "KNOWLEDGE_ASSESSMENT";
      let qs = [];
      let desc = "";
      if (s.kind === "labs") { type = "LAB"; qs = s.labs || []; }
      else if (s.kind === "assessment") { type = "KNOWLEDGE_ASSESSMENT"; qs = s.questions || []; }
      else if (s.kind === "discussion") { type = "VITARKA_AI_INTERVIEW"; qs = s.questions || []; desc = JSON.stringify({ duration: s.duration, mode: s.mode }); }
      
      return {
        title: s.title,
        description: desc,
        type: type,
        order_index: idx,
        questions: qs,
      };
    }),
  };
}

export async function listEvaluations(): Promise<Evaluation[]> {
  try {
    const res = await fetch(`${API_BASE}/evaluations/`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(mapBackendToFrontend);
  } catch {
    return [];
  }
}

export async function getEvaluation(id: string): Promise<Evaluation | undefined> {
  try {
    const res = await fetch(`${API_BASE}/evaluations/${id}/`);
    if (!res.ok) return undefined;
    const data = await res.json();
    return mapBackendToFrontend(data);
  } catch {
    return undefined;
  }
}

export async function saveEvaluation(e: Evaluation): Promise<Evaluation | undefined> {
  try {
    const payload = mapFrontendToBackend(e);
    let res;
    if (e.id === "draft") {
      res = await fetch(`${API_BASE}/evaluations/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${API_BASE}/evaluations/${e.id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    
    if (!res.ok) {
      const errText = await res.text();
      console.error("Backend returned error:", res.status, errText);
      alert("Error saving: " + errText);
      return undefined;
    }
    
    const data = await res.json();
    return mapBackendToFrontend(data);
  } catch (err) {
    console.error("Error saving evaluation", err);
    alert("Network error while saving.");
    return undefined;
  }
}

export async function createEvaluation(): Promise<Evaluation> {
  return {
    id: "draft",
    title: "Untitled Evaluation",
    domain: "",
    status: "draft",
    createdAt: Date.now(),
    candidatesInvited: 0,
    candidatesCompleted: 0,
    sections: []
  };
}

export function saveDraftLocally(e: Evaluation) {
  try {
    localStorage.setItem(`draft_eval_${e.id}`, JSON.stringify(e));
  } catch (err) {
    console.error("Failed to save draft locally", err);
  }
}

export function getDraftLocally(id: string): Evaluation | null {
  try {
    const raw = localStorage.getItem(`draft_eval_${id}`);
    if (raw) return JSON.parse(raw) as Evaluation;
  } catch {}
  return null;
}

export function clearDraftLocally(id: string) {
  try {
    localStorage.removeItem(`draft_eval_${id}`);
  } catch {}
}

export async function deleteEvaluation(id: string) {
  try {
    await fetch(`${API_BASE}/evaluations/${id}/`, { method: "DELETE" });
  } catch {}
}

export async function duplicateEvaluation(id: string): Promise<Evaluation | undefined> {
  const src = await getEvaluation(id); if (!src) return;
  const payload = mapFrontendToBackend(src);
  payload.title = payload.title + " (Copy)";
  const res = await fetch(`${API_BASE}/evaluations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return mapBackendToFrontend(data);
}

export async function fetchLabs(): Promise<LabItem[]> {
  try {
    const res = await fetch(`${API_BASE}/lab-questions/`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchCourses(): Promise<CourseItem[]> {
  try {
    const data = await ycodeApiAuthUtil.get<any>('/course/courses/');
    return Array.isArray(data) ? data : (data.results || []);
  } catch {
    return [];
  }
}

export async function fetchTopics(courseId?: string): Promise<TopicItem[]> {
  try {
    const url = courseId ? `/course/topics/?course=${courseId}` : `/course/topics/`;
    const data = await ycodeApiAuthUtil.get<any>(url);
    return Array.isArray(data) ? data : (data.results || []);
  } catch {
    return [];
  }
}

export async function fetchQuestions(): Promise<QuestionItem[]> {
  try {
    const data = await ycodeApiAuthUtil.get<any[]>('/course/questions/');
    // Handle paginated response if backend returns { results: [...] }
    const results = Array.isArray(data) ? data : (data as any).results || [];
    return results.map((q: any) => ({
      ...q,
      id: q.id,
      text: q.content || "",
      title: q.title || "",
      programming_languages: [],
      databases: [],
      difficulty: (q.difficulty === "medium" ? "Medium" : q.difficulty === "hard" ? "Hard" : "Easy") as Difficulty,
      experience: "Fresher" as ExperienceLevel,
      format: (q.type === "mcq_single" ? "MCQ" : q.type === "mcq_multiple" ? "Multiple Select" : q.type === "coding" ? "Coding" : "Description") as Format,
      marks: q.marks || 1,
      duration_minutes: q.duration || 1,
      course: q.course,
      topic: q.topic
    }));
  } catch (err) {
    console.error("fetchQuestions error", err);
    return [];
  }
}

export async function fetchQuestionDetails(id: string): Promise<QuestionItem | null> {
  try {
    const q = await ycodeApiAuthUtil.get<any>(`/course/questions/${id}/`);
    if (!q) return null;
    return {
      ...q,
      id: q.id,
      text: q.content || "",
      title: q.title || "",
      programming_languages: [],
      databases: [],
      difficulty: (q.difficulty === "medium" ? "Medium" : q.difficulty === "hard" ? "Hard" : "Easy") as Difficulty,
      experience: "Fresher" as ExperienceLevel,
      format: (q.type === "mcq_single" ? "MCQ" : q.type === "mcq_multiple" ? "Multiple Select" : q.type === "coding" ? "Coding" : "Description") as Format,
      marks: q.marks || 1,
      duration_minutes: q.duration || 1,
      course: q.course,
      topic: q.topic
    };
  } catch (err) {
    console.error("fetchQuestionDetails error", err);
    return null;
  }
}

export function evaluationTotals(e: Evaluation) {
  let minutes = 0, marks = 0, labs = 0, questions = 0, discussion = 0;
  for (const s of e.sections) {
    if (s.kind === "labs") {
      labs += s.labs.length;
      minutes += s.labs.reduce((a, l) => a + (l.duration_minutes || 0), 0);
      marks += s.labs.reduce((a, l) => a + (l.marks || 0), 0);
    } else if (s.kind === "assessment") {
      questions += s.questions.length;
      marks += s.questions.reduce((a, q) => a + (q.marks || 0), 0);
      minutes += s.questions.reduce((a, q) => a + ((q.duration_minutes || (q.seconds ? Math.ceil(q.seconds/60) : 0)) || 0), 0);
    } else if (s.kind === "discussion") {
      discussion += s.duration; minutes += s.duration;
    }
  }
  return { minutes, marks, labs, questions, discussion, sections: e.sections.length };
}

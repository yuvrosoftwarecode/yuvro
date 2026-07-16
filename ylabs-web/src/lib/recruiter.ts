// Recruiter data + persistence (localStorage, demo).
export type Domain = "Finance" | "Insurance" | "EdTech" | "Supply Chain" | "Healthcare" | "Retail";
export type Tech = "Java" | "SQL" | "Python" | "React" | "Node" | "DevOps" | "Testing" | "Security" | "JavaScript";
export type Scenario = "Debugging" | "Feature Development" | "API" | "Optimization" | "Security" | "Architecture" | "Performance" | "Testing" | "Production Incident";
export type Level = "L1" | "L2" | "L3";

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
  seconds: number;
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
export function getEvaluation(id: string): Evaluation | undefined {
  return listEvaluations().find(e => e.id === id);
}
export function saveEvaluation(e: Evaluation) {
  const list = listEvaluations();
  const i = list.findIndex(x => x.id === e.id);
  if (i >= 0) list[i] = e; else list.push(e);
  writeAll(list);
}
export function createEvaluation(): Evaluation {
  const e: Evaluation = {
    id: uid(), title: "Untitled Evaluation", domain: "", status: "draft",
    createdAt: Date.now(), candidatesInvited: 0, candidatesCompleted: 0, sections: [],
  };
  const list = listEvaluations(); list.unshift(e); writeAll(list); return e;
}
export function deleteEvaluation(id: string) {
  writeAll(listEvaluations().filter(e => e.id !== id));
}
export function duplicateEvaluation(id: string): Evaluation | undefined {
  const src = getEvaluation(id); if (!src) return;
  const copy: Evaluation = { ...JSON.parse(JSON.stringify(src)), id: uid(), title: src.title + " (Copy)", status: "draft", createdAt: Date.now(), publishedAt: undefined, candidatesInvited: 0, candidatesCompleted: 0 };
  const list = listEvaluations(); list.unshift(copy); writeAll(list); return copy;
}

// ------- Derived -------
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

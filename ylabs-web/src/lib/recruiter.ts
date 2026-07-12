// Recruiter data + persistence (localStorage, demo).
export type Domain = "Finance" | "Insurance" | "EdTech" | "Supply Chain" | "Healthcare" | "Retail";
export type Tech = "Java" | "SQL" | "Python" | "React" | "Node" | "DevOps" | "Testing" | "Security" | "JavaScript";
export type Scenario = "Debugging" | "Feature Development" | "API" | "Optimization" | "Security" | "Architecture" | "Performance" | "Testing" | "Production Incident";
export type Level = "L1" | "L2" | "L3";

export interface LabItem {
  id: string;
  title: string;
  domain: Domain;
  tech: Tech;
  scenario: Scenario;
  level: Level;
  marks: number;
  minutes: number;
  tasks: number;
}

export interface QuestionItem {
  id: string;
  text: string;
  tech: Tech;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  experience: "Fresher" | "1-3" | "3-5";
  format: "MCQ" | "Multiple Select" | "Scenario Based";
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
export interface Subsection {
  id: string;
  name: string; // Java, SQL, ...
  questions: QuestionItem[];
  randomize?: boolean;
  shuffle?: boolean;
}
export interface AssessmentSection {
  id: string;
  kind: "assessment";
  title: string;
  subsections: Subsection[];
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

// ------- Seed data -------
export const LAB_LIBRARY: LabItem[] = [
  { id: "l1", title: "Payment API Broken", domain: "Finance", tech: "Java", scenario: "Debugging", level: "L2", marks: 10, minutes: 15, tasks: 4 },
  { id: "l2", title: "Inventory SQL Optimization", domain: "Supply Chain", tech: "SQL", scenario: "Optimization", level: "L2", marks: 10, minutes: 20, tasks: 3 },
  { id: "l3", title: "JWT Authentication Failure", domain: "Insurance", tech: "Security", scenario: "Security", level: "L3", marks: 15, minutes: 20, tasks: 5 },
  { id: "l4", title: "React Checkout Regression", domain: "Retail", tech: "React", scenario: "Debugging", level: "L2", marks: 10, minutes: 18, tasks: 4 },
  { id: "l5", title: "Patient Records Feature", domain: "Healthcare", tech: "Python", scenario: "Feature Development", level: "L1", marks: 8, minutes: 20, tasks: 3 },
  { id: "l6", title: "Deploy Pipeline Broken", domain: "EdTech", tech: "DevOps", scenario: "Production Incident", level: "L3", marks: 15, minutes: 25, tasks: 5 },
  { id: "l7", title: "Order API Performance", domain: "Retail", tech: "Node", scenario: "Performance", level: "L2", marks: 12, minutes: 20, tasks: 4 },
  { id: "l8", title: "Claims Service Architecture", domain: "Insurance", tech: "Java", scenario: "Architecture", level: "L3", marks: 15, minutes: 30, tasks: 5 },
  { id: "l9", title: "Flaky Test Suite", domain: "EdTech", tech: "Testing", scenario: "Testing", level: "L1", marks: 8, minutes: 15, tasks: 3 },
  { id: "l10", title: "Trade Reconciliation API", domain: "Finance", tech: "Java", scenario: "API", level: "L2", marks: 12, minutes: 22, tasks: 4 },
];

export const QUESTION_BANK: QuestionItem[] = [
  { id: "q1", text: "What happens when HashMap capacity is exceeded?", tech: "Java", topic: "Collections", difficulty: "Medium", experience: "1-3", format: "MCQ", marks: 2, seconds: 45 },
  { id: "q2", text: "Which Stream operation is a terminal operation?", tech: "Java", topic: "Streams", difficulty: "Easy", experience: "Fresher", format: "MCQ", marks: 2, seconds: 40 },
  { id: "q3", text: "Explain volatile vs synchronized.", tech: "Java", topic: "Concurrency", difficulty: "Hard", experience: "3-5", format: "Scenario Based", marks: 3, seconds: 90 },
  { id: "q4", text: "How does Spring Boot autoconfigure work?", tech: "Java", topic: "Spring", difficulty: "Medium", experience: "1-3", format: "MCQ", marks: 2, seconds: 60 },
  { id: "q5", text: "What is a G1 GC pause?", tech: "Java", topic: "JVM", difficulty: "Hard", experience: "3-5", format: "MCQ", marks: 3, seconds: 60 },
  { id: "q6", text: "Difference between INNER JOIN and LEFT JOIN?", tech: "SQL", topic: "Joins", difficulty: "Easy", experience: "Fresher", format: "MCQ", marks: 2, seconds: 45 },
  { id: "q7", text: "How would you optimize a slow query?", tech: "SQL", topic: "Optimization", difficulty: "Hard", experience: "3-5", format: "Scenario Based", marks: 3, seconds: 90 },
  { id: "q8", text: "What is a window function?", tech: "SQL", topic: "Analytics", difficulty: "Medium", experience: "1-3", format: "MCQ", marks: 2, seconds: 60 },
  { id: "q9", text: "Explain event loop in JavaScript.", tech: "JavaScript", topic: "Runtime", difficulty: "Medium", experience: "1-3", format: "Scenario Based", marks: 2, seconds: 60 },
  { id: "q10", text: "What is a closure?", tech: "JavaScript", topic: "Functions", difficulty: "Easy", experience: "Fresher", format: "MCQ", marks: 2, seconds: 45 },
  { id: "q11", text: "Difference between var, let, const?", tech: "JavaScript", topic: "Scoping", difficulty: "Easy", experience: "Fresher", format: "MCQ", marks: 2, seconds: 40 },
  { id: "q12", text: "React reconciliation strategy?", tech: "React", topic: "Rendering", difficulty: "Medium", experience: "1-3", format: "MCQ", marks: 2, seconds: 60 },
  { id: "q13", text: "What triggers a Python GIL contention?", tech: "Python", topic: "Runtime", difficulty: "Hard", experience: "3-5", format: "Scenario Based", marks: 3, seconds: 90 },
  { id: "q14", text: "Explain Node.js clustering.", tech: "Node", topic: "Runtime", difficulty: "Medium", experience: "1-3", format: "MCQ", marks: 2, seconds: 60 },
  { id: "q15", text: "What is JWT signature verification?", tech: "Security", topic: "Auth", difficulty: "Medium", experience: "1-3", format: "MCQ", marks: 2, seconds: 60 },
];

export const SUBSECTION_NAMES = ["Java", "SQL", "DSA", "JavaScript", "Python", "React", "Node", "Aptitude", "System Design", "Custom"] as const;

// ------- Store -------
const KEY = "yuvro-recruiter-evals-v1";

function uid() { return Math.random().toString(36).slice(2, 10); }

function seed(): Evaluation[] {
  return [
    {
      id: uid(), title: "Java Backend Engineer", domain: "Finance", status: "published",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
      candidatesInvited: 52, candidatesCompleted: 34,
      sections: [
        { id: uid(), kind: "labs", title: "Engineering Labs", labs: [LAB_LIBRARY[0], LAB_LIBRARY[9]] },
        { id: uid(), kind: "assessment", title: "Knowledge Assessment", subsections: [
          { id: uid(), name: "Java", questions: QUESTION_BANK.filter(q => q.tech === "Java").slice(0, 5) },
          { id: uid(), name: "SQL", questions: QUESTION_BANK.filter(q => q.tech === "SQL").slice(0, 3) },
        ] },
        { id: uid(), kind: "discussion", title: "Engineering Discussion", duration: 15, mode: "Automatic", questions: [] },
      ],
    },
    {
      id: uid(), title: "Frontend React", domain: "Retail", status: "draft",
      createdAt: Date.now() - 1000 * 60 * 60 * 24, candidatesInvited: 0, candidatesCompleted: 0,
      sections: [
        { id: uid(), kind: "labs", title: "Engineering Labs", labs: [LAB_LIBRARY[3]] },
      ],
    },
    {
      id: uid(), title: "Python Backend", domain: "Healthcare", status: "published",
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5, publishedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
      candidatesInvited: 28, candidatesCompleted: 19,
      sections: [
        { id: uid(), kind: "labs", title: "Engineering Labs", labs: [LAB_LIBRARY[4]] },
        { id: uid(), kind: "assessment", title: "Knowledge Assessment", subsections: [
          { id: uid(), name: "Python", questions: QUESTION_BANK.filter(q => q.tech === "Python").slice(0, 2) },
        ] },
      ],
    },
  ];
}

export function listEvaluations(): Evaluation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed(); localStorage.setItem(KEY, JSON.stringify(s)); return s;
    }
    return JSON.parse(raw);
  } catch { return []; }
}
function writeAll(list: Evaluation[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
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
      minutes += s.labs.reduce((a, l) => a + l.minutes, 0);
      marks += s.labs.reduce((a, l) => a + l.marks, 0);
    } else if (s.kind === "assessment") {
      for (const sub of s.subsections) {
        questions += sub.questions.length;
        marks += sub.questions.reduce((a, q) => a + q.marks, 0);
        minutes += Math.ceil(sub.questions.reduce((a, q) => a + q.seconds, 0) / 60);
      }
    } else if (s.kind === "discussion") {
      discussion += s.duration; minutes += s.duration;
    }
  }
  return { minutes, marks, labs, questions, discussion, sections: e.sections.length };
}

export function newUid() { return uid(); }

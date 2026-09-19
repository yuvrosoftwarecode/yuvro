// Recruiter data + backend API
import restApiAuthUtil, { ycodeApiAuthUtil, yhubApiAuthUtil } from "../utils/RestApiAuthUtil";
import { questionBankService } from "../services/questionBankService";

export const DOMAINS = [
  "Finance",
  "Insurance",
  "EdTech",
  "Supply Chain",
  "Healthcare",
  "Retail",
  "Payment",
  "Other",
] as const;
export type Domain = (typeof DOMAINS)[number];

export const PROGRAMMING_LANGUAGES = [
  "C",
  "C++",
  "Python",
  "Java",
  "SQL",
  "Bash",
  "JavaScript",
  "TypeScript",
] as const;
export type ProgrammingLanguage = (typeof PROGRAMMING_LANGUAGES)[number];

export const DATABASES = [
  "SQLite",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
] as const;
export type Database = (typeof DATABASES)[number];

export const SCENARIOS = [
  "Debugging",
  "Feature Development",
  "API Optimization",
  "Security",
  "Architecture",
  "Performance",
  "Testing",
  "Production Incident",
] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const EXPERIENCE_LEVELS = [
  "Intern",
  "Fresher",
  "Junior Developer",
  "Mid-Level Developer",
  "Senior Developer",
  "Lead Developer",
  "Staff Engineer",
  "Principal Engineer",
  "Software Architect",
  "Engineering Manager",
  "Director of Engineering",
  "VP of Engineering",
  "Chief Technology Officer",
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const FORMATS = ["MCQ", "Multiple Select", "Description", "Coding"] as const;
export type Format = (typeof FORMATS)[number];

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
  tasks?: any[]; // legacy optional for frontend UI compat, now using array from backend
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

export interface ProctoringConfig {
  enableProctoring?: boolean;
  webcamRequired?: boolean;
  screenShareRequired?: boolean;
  tabSwitchLimit?: number;
  disableCopyPaste?: boolean;
  enableCopyPaste?: boolean;
  tabSwitchAllowed?: boolean;
}

export type SectionType = "labs" | "assessment" | "discussion";

export interface LabsSection {
  id: string;
  kind: "labs";
  title: string;
  labs: LabItem[];
  proctoring?: ProctoringConfig;
}
export interface AssessmentSection {
  id: string;
  kind: "assessment";
  title: string;
  questions: QuestionItem[];
  randomize?: boolean;
  shuffle?: boolean;
  proctoring?: ProctoringConfig;
}
export interface PredefinedQuestion {
  id?: string;
  text: string;
  follow_ups: PredefinedQuestion[];
}

export interface DiscussionSection {
  id: string;
  kind: "discussion";
  title: string;
  duration: number;
  mode: "Custom" | "Automatic" | "Hybrid";
  questions: PredefinedQuestion[];
  mockInterviewId?: string;
  proctoring?: ProctoringConfig;
  marks?: number;
  max_score?: number;
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
  settings?: Record<string, any>;
  createdBy?: string;
}

// Ensure unique ID generation
export function newUid() {
  return Math.random().toString(36).slice(2, 10);
}

const API_BASE = (
  import.meta.env.VITE_BACKEND_API_BASE_URL || "http://localhost:8002/api"
).replace(/\/$/, "") + "/skill_evaluation";

function mapBackendToFrontend(be: any): Evaluation {
  return {
    id: be.id,
    title: be.title || "Untitled Evaluation",
    domain: (be.domain === "OTHER" ? "" : be.domain) as any,
    status: be.is_published ? "published" : "draft",
    createdAt: be.created_at ? new Date(be.created_at).getTime() : Date.now(),
    candidatesInvited: be.candidate_invited_emails?.length || 0,
    candidatesCompleted: 0,
    createdBy: be.created_by || "",
    settings: be.settings || {},
    invite: be.candidate_invited_emails?.length
      ? {
          type: "email",
          emails: be.candidate_invited_emails,
          expiry: "7",
          attempts: "1",
        }
      : undefined,
    sections: (be.sections || []).map((s: any) => {
      let proctoring = {};
      try { proctoring = typeof s.proctoring_config === 'string' ? JSON.parse(s.proctoring_config) : (s.proctoring_config || {}); } catch {}
      if (s.type === "LAB") {
        return { id: s.id || newUid(), kind: "labs", title: s.title, labs: s.questions || [], proctoring };
      } else if (s.type === "VITARKA_AI_INTERVIEW") {
        let meta: any = { duration: 15, mode: "Automatic" };
        try {
          meta = JSON.parse(s.description || "{}");
        } catch {}
        const marks = meta.marks ?? meta.max_score ?? 25;
        return {
          id: s.id || newUid(),
          kind: "discussion",
          title: s.title,
          duration: meta.duration || 15,
          mode: meta.mode || "Automatic",
          questions: s.questions || [],
          mockInterviewId: meta.mockInterviewId,
          marks,
          max_score: marks,
          proctoring
        };
      } else {
        return {
          id: s.id || newUid(),
          kind: "assessment",
          title: s.title,
          questions: s.questions || [],
          proctoring
        };
      }
    }),
  };
}

export function getVitarkaDiscussionConfig(sections: Section[] = []): {
  marks: number;
  duration: number;
  labsCount: number;
  hasAssessment: boolean;
} {
  const labSections = sections.filter((s: any) => s.kind === "labs" || s.type === "LAB");
  const labsCount = labSections.reduce(
    (sum: number, s: any) => sum + (s.labs?.length || s.questions?.length || 0),
    0
  );
  const hasAssessment = sections.some(
    (s: any) => s.kind === "assessment" || s.type === "KNOWLEDGE_ASSESSMENT"
  );

  const marks = labsCount * 10 + (hasAssessment ? 10 : 0);
  const duration = labsCount * 10 + (hasAssessment ? 5 : 0);

  return { marks, duration, labsCount, hasAssessment };
}

export function syncDiscussionConfig(e: Evaluation): Evaluation {
  const { marks, duration } = getVitarkaDiscussionConfig(e.sections);
  for (const s of e.sections) {
    if (s.kind === "discussion") {
      s.marks = marks;
      s.max_score = marks;
      s.duration = duration;
    }
  }
  return e;
}

function mapFrontendToBackend(fe: Evaluation): any {
  return {
    title: fe.title,
    domain: fe.domain || "OTHER",
    is_published: fe.status === "published",
    settings: fe.settings || {},
    candidate_invited_emails:
      fe.invite?.type === "email" && fe.invite?.emails ? fe.invite.emails : [],
    sections: fe.sections.map((s: any, idx: number) => {
      let type = "KNOWLEDGE_ASSESSMENT";
      let qs = [];
      let desc = "";
      if (s.kind === "labs") {
        type = "LAB";
        qs = s.labs || [];
      } else if (s.kind === "assessment") {
        type = "KNOWLEDGE_ASSESSMENT";
        qs = s.questions || [];
      } else if (s.kind === "discussion") {
        type = "VITARKA_AI_INTERVIEW";
        qs = s.questions || [];
        const { marks: calcMarks, duration: calcDur } = getVitarkaDiscussionConfig(fe.sections);
        const marks = s.marks != null ? s.marks : (s.max_score != null ? s.max_score : calcMarks);
        const duration = s.duration != null ? s.duration : calcDur;
        desc = JSON.stringify({
          duration,
          mode: s.mode || "Automatic",
          mockInterviewId: s.mockInterviewId,
          marks,
          max_score: marks,
          discussionMaxScore: marks,
        });
      }

      return {
        title: s.title,
        description: desc,
        type: type,
        order_index: idx,
        questions: qs,
        proctoring_config: s.proctoring || {},
      };
    }),
  };
}

export async function listEvaluations(): Promise<Evaluation[]> {
  try {
    const data = await restApiAuthUtil.get<any[]>("/skill_evaluation/evaluations/");
    return data.map(mapBackendToFrontend);
  } catch {
    return [];
  }
}

export async function hydrateDiscussionQuestions(ev: Evaluation): Promise<Evaluation> {
  for (const section of ev.sections) {
    if (section.kind === "discussion" && section.mockInterviewId) {
      try {
        const res = await yhubApiAuthUtil.get<any>(`/mock-interviews/${section.mockInterviewId}/`);
        if (res.predefined_tree) {
          section.questions = res.predefined_tree;
        }
      } catch (err) {
        console.error("Failed to fetch mock interview tree", err);
      }
    }
  }
  return ev;
}

export async function syncMockInterviews(e: Evaluation): Promise<Evaluation> {
  let discussionCounter = 1;
  const { marks: calcMarks, duration: calcDur } = getVitarkaDiscussionConfig(e.sections);
  for (const section of e.sections) {
    if (section.kind === "discussion") {
      const duration = section.duration != null ? section.duration : calcDur;
      const marks = section.marks != null ? section.marks : (section.max_score != null ? section.max_score : calcMarks);
      section.duration = duration;
      section.marks = marks;
      section.max_score = marks;
      const payload = {
        title: `${e.title} - ${discussionCounter}`,
        description: "Vitarka AI Interview created from ylabs-web",
        publish_status: "active",
        max_duration: duration,
        max_score: marks,
        predefined_tree: section.questions,
        interview_mode: section.mode ? section.mode.toLowerCase() : "automatic",
      };
      try {
        if (section.mockInterviewId) {
          await yhubApiAuthUtil.put(`/mock-interviews/${section.mockInterviewId}/`, payload);
        } else {
          const res = await yhubApiAuthUtil.post<any>(`/mock-interviews/`, payload);
          section.mockInterviewId = res.id;
        }
      } catch (err) {
        console.error("Failed to sync mock interview", err);
      }
      discussionCounter++;
    }
  }
  return e;
}

export async function hydrateLabQuestions(ev: Evaluation): Promise<Evaluation> {
  try {
    const allLabs = await restApiAuthUtil.get<any[]>("/skill_evaluation/lab-questions/");
    for (const section of ev.sections) {
      if (section.kind === "labs" && section.labs) {
        section.labs = section.labs.map((l: any) => {
          const fullLab = (allLabs as any[]).find((item: any) => item.id === l.id || item.id === l.lab_id);
          return fullLab ? { ...fullLab, ...l, tasks: fullLab.tasks || l.tasks } : l;
        });
      }
    }
  } catch (err) {
    console.error("Failed to hydrate lab questions", err);
  }
  return ev;
}

export async function getEvaluation(id: string): Promise<Evaluation | undefined> {
  try {
    const data = await restApiAuthUtil.get<any>(`/skill_evaluation/evaluations/${id}/`);
    const fe = mapBackendToFrontend(data);
    await hydrateDiscussionQuestions(fe);
    await hydrateLabQuestions(fe);
    return fe;
  } catch {
    return undefined;
  }
}

export async function getEvaluationSubmissions(id: string): Promise<any[]> {
  try {
    return await restApiAuthUtil.get<any[]>(`/skill_evaluation/evaluations/${id}/submissions/`);
  } catch {
    return [];
  }
}

export async function saveEvaluation(e: Evaluation): Promise<Evaluation | undefined> {
  try {
    const payload = mapFrontendToBackend(e);
    let data;
    if (e.id === "draft") {
      data = await restApiAuthUtil.post<any>("/skill_evaluation/evaluations/", payload);
    } else {
      data = await restApiAuthUtil.put<any>(`/skill_evaluation/evaluations/${e.id}/`, payload);
    }
    return mapBackendToFrontend(data);
  } catch (err: any) {
    console.error("Error saving evaluation", err);
    alert("Error saving: " + (err.message || "Network error while saving."));
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
    sections: [],
  };
}

export function saveDraftLocally(e: Evaluation) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`draft_eval_${e.id}`, JSON.stringify(e));
  } catch (err) {
    console.error("Failed to save draft locally", err);
  }
}

export function getDraftLocally(id: string): Evaluation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`draft_eval_${id}`);
    if (raw) return JSON.parse(raw) as Evaluation;
  } catch {}
  return null;
}

export function clearDraftLocally(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`draft_eval_${id}`);
  } catch {}
}

export async function deleteEvaluation(id: string) {
  try {
    await restApiAuthUtil.delete(`/skill_evaluation/evaluations/${id}/`);
  } catch {}
}

export async function duplicateEvaluation(id: string): Promise<Evaluation | undefined> {
  const src = await getEvaluation(id);
  if (!src) return;
  const payload = mapFrontendToBackend(src);
  payload.title = payload.title + " (Copy)";
  const data = await restApiAuthUtil.post<any>("/skill_evaluation/evaluations/", payload);
  return mapBackendToFrontend(data);
}

export async function fetchLabs(): Promise<LabItem[]> {
  try {
    return await restApiAuthUtil.get<LabItem[]>("/skill_evaluation/lab-questions/");
  } catch {
    return [];
  }
}

export async function fetchCourses(): Promise<CourseItem[]> {
  try {
    const data = await ycodeApiAuthUtil.get<any>("/course/courses/?basic=true");
    return Array.isArray(data) ? data : data.results || [];
  } catch {
    return [];
  }
}

export async function fetchTopics(courseId?: string): Promise<TopicItem[]> {
  try {
    const url = courseId ? `/course/topics/?course=${courseId}&basic=true` : `/course/topics/?basic=true`;
    const data = await ycodeApiAuthUtil.get<any>(url);
    return Array.isArray(data) ? data : data.results || [];
  } catch {
    return [];
  }
}

export interface FetchQuestionsResult {
  results: QuestionItem[];
  count: number;
}

export async function fetchQuestions(
  courseId?: string,
  topicId?: string,
  search?: string,
  difficulty?: string,
  format?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<FetchQuestionsResult> {
  try {
    const params = new URLSearchParams();
    params.set("page_size", "100");
    if (page) params.set("page", String(page));
    if (courseId && courseId !== "All") params.set("course", courseId);
    if (topicId && topicId !== "All") params.set("topic", topicId);
    if (search) params.set("search", search);
    if (difficulty && difficulty !== "All") params.set("difficulty", difficulty.toLowerCase());
    
    if (format && format !== "All") {
      const typeMap: Record<string, string> = {
        "MCQ": "mcq_single",
        "Multiple Select": "mcq_multiple",
        "Coding": "coding",
        "Description": "descriptive",
      };
      if (typeMap[format]) {
        params.set("type", typeMap[format]);
      }
    }

    const [knowledgeRes, courseRes] = await Promise.all([
      questionBankService.getKnowledgeQuestions().catch(() => []),
      ycodeApiAuthUtil.get<any>(`/course/questions/?${params.toString()}`).catch(() => null)
    ]);

    const knowledgeList = Array.isArray(knowledgeRes) ? knowledgeRes : ((knowledgeRes as any)?.results || []);
    const courseList = Array.isArray(courseRes) ? courseRes : ((courseRes as any)?.results || []);

    const rawCombined = [...knowledgeList, ...courseList];
    const seenIds = new Set();
    const uniqueRaw: any[] = [];
    for (const q of rawCombined) {
      if (!q || !q.id || seenIds.has(q.id)) continue;
      seenIds.add(q.id);
      uniqueRaw.push(q);
    }

    let results: QuestionItem[] = uniqueRaw.map((q: any) => ({
      ...q,
      id: q.id,
      title: q.title || q.name || q.content || "",
      content: q.content || q.description || (q.text !== q.title ? q.text : "") || "",
      text: q.title || q.content || "",
      programming_languages: q.programming_languages || [],
      databases: q.databases || [],
      difficulty: (q.difficulty === "medium" || q.difficulty === "MEDIUM" || q.difficulty === "Medium"
        ? "Medium"
        : q.difficulty === "hard" || q.difficulty === "HARD" || q.difficulty === "Hard"
          ? "Hard"
          : "Easy") as Difficulty,
      experience: (q.experience || "Fresher") as ExperienceLevel,
      format: (q.format === "MCQ" || q.type === "mcq_single" || q.type === "MCQ"
        ? "MCQ"
        : q.format === "MULTIPLE SELECT" || q.format === "Multiple Select" || q.type === "mcq_multiple" || q.type === "MULTIPLE SELECT"
          ? "Multiple Select"
          : q.format === "CODING" || q.format === "Coding" || q.type === "coding" || q.type === "CODING"
            ? "Coding"
            : "Description") as Format,
      marks: q.marks || 1,
      duration_minutes: q.duration || q.duration_minutes || 1,
      course: q.course || q.course_id || "GENERAL",
      topic: q.topic || q.topic_id || "",
    }));

    if (courseId && courseId !== "All") {
      results = results.filter(q => q.course === courseId || q.course_name === courseId);
    }
    if (topicId && topicId !== "All") {
      results = results.filter(q => q.topic === topicId || q.topic_name === topicId);
    }
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(q => q.title.toLowerCase().includes(s) || q.text.toLowerCase().includes(s));
    }
    if (difficulty && difficulty !== "All") {
      results = results.filter(q => q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }
    if (format && format !== "All") {
      results = results.filter(q => q.format.toLowerCase() === format.toLowerCase());
    }

    return { results, count: results.length };
  } catch (err) {
    console.error("fetchQuestions error", err);
    return { results: [], count: 0 };
  }
}

export async function checkDuplicateQuestion(content: string, courseId: string) {
  try {
    const res = await ycodeApiAuthUtil.post<any>("/course/questions/check_duplicate/", {
      content,
      course: courseId,
    });
    return res;
  } catch (err) {
    console.error("Duplicate check error:", err);
    return { is_duplicate: false };
  }
}

export async function fetchQuestionDetails(id: string): Promise<QuestionItem | null> {
  try {
    let q1: any = null;
    let q2: any = null;

    try {
      q1 = await questionBankService.getKnowledgeQuestion(id);
    } catch {}

    try {
      q2 = await ycodeApiAuthUtil.get<any>(`/course/questions/${id}/`);
    } catch {}

    const q: any = { ...q1, ...q2 };
    if (!q || (!q.content && !q.title && !q.text)) return null;

    const testCases = (Array.isArray(q.test_cases_basic) && q.test_cases_basic.length > 0)
      ? q.test_cases_basic
      : (Array.isArray(q.test_cases) && q.test_cases.length > 0)
      ? q.test_cases
      : (Array.isArray(q1?.test_cases) && q1.test_cases.length > 0)
      ? q1.test_cases
      : (Array.isArray(q2?.test_cases_basic) && q2.test_cases_basic.length > 0)
      ? q2.test_cases_basic
      : [];

    const hints = (Array.isArray(q.hints) && q.hints.length > 0)
      ? q.hints
      : (Array.isArray(q1?.hints) && q1.hints.length > 0)
      ? q1.hints
      : (Array.isArray(q2?.hints) && q2.hints.length > 0)
      ? q2.hints
      : [];

    const solutions = (Array.isArray(q.solutions) && q.solutions.length > 0)
      ? q.solutions
      : (Array.isArray(q1?.solutions) && q1.solutions.length > 0)
      ? q1.solutions
      : (Array.isArray(q2?.solutions) && q2.solutions.length > 0)
      ? q2.solutions
      : [];

    return {
      ...q,
      id: q.id || id,
      title: q.title || q.name || q.content || "",
      content: q.content || q.description || (q.text !== q.title ? q.text : "") || "",
      text: q.title || q.content || "",
      test_cases: testCases,
      test_cases_basic: testCases,
      hints: hints,
      solutions: solutions,
      solution_explanation: q.solution_explanation || q1?.solution_explanation || q2?.solution_explanation || "",
      programming_languages: q.programming_languages || [],
      databases: q.databases || [],
      difficulty: (q.difficulty === "medium" || q.difficulty === "MEDIUM" || q.difficulty === "Medium"
        ? "Medium"
        : q.difficulty === "hard" || q.difficulty === "HARD" || q.difficulty === "Hard"
          ? "Hard"
          : "Easy") as Difficulty,
      experience: (q.experience || "Fresher") as ExperienceLevel,
      format: (q.format === "MCQ" || q.type === "mcq_single" || q.type === "MCQ"
        ? "MCQ"
        : q.format === "MULTIPLE SELECT" || q.format === "Multiple Select" || q.type === "mcq_multiple" || q.type === "MULTIPLE SELECT"
          ? "Multiple Select"
          : q.format === "CODING" || q.format === "Coding" || q.type === "coding" || q.type === "CODING"
            ? "Coding"
            : "Description") as Format,
      marks: q.marks || 1,
      duration_minutes: q.duration || q.duration_minutes || 1,
      course: q.course || q.course_id || "GENERAL",
      topic: q.topic || q.topic_id || "",
    };
  } catch (err) {
    console.error("Error fetching question details", err);
    return null;
  }
}

export function evaluationTotals(e: Evaluation) {
  let minutes = 0,
    marks = 0,
    labs = 0,
    questions = 0,
    discussion = 0;
  for (const s of e.sections) {
    if (s.kind === "labs") {
      labs += s.labs.length;
      minutes += s.labs.reduce((a, l) => a + (l.duration_minutes || 0), 0);
      marks += s.labs.reduce((a, l) => a + (l.marks || 0), 0);
    } else if (s.kind === "assessment") {
      questions += s.questions.length;
      marks += s.questions.reduce((a, q) => a + (q.marks || 0), 0);
      minutes += s.questions.reduce(
        (a, q) => a + (q.duration_minutes || (q.seconds ? Math.ceil(q.seconds / 60) : 0) || 0),
        0,
      );
    } else if (s.kind === "discussion") {
      const { marks: calcMarks, duration: calcDur } = getVitarkaDiscussionConfig(e.sections);
      const dur = s.duration != null ? s.duration : calcDur;
      const m = s.marks != null ? s.marks : (s.max_score != null ? s.max_score : calcMarks);
      discussion += dur;
      minutes += dur;
      marks += m;
    }
  }
  return { minutes, marks, labs, questions, discussion, sections: e.sections.length };
}

export async function fetchFollowUps(evaluationId: string): Promise<any> {
  try {
    return await restApiAuthUtil.get(`/skill_evaluation/evaluations/${evaluationId}/follow_ups/`);
  } catch (err) {
    console.error("fetchFollowUps error:", err);
    return null;
  }
}

export async function saveFollowUps(evaluationId: string, data: any): Promise<any> {
  try {
    return await restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/follow_ups/`, data);
  } catch (err) {
    console.error("saveFollowUps error:", err);
    return null;
  }
}

export async function inviteCandidates(evaluationId: string, emails: string[], subject: string = "", body: string = ""): Promise<any> {
  try {
    return await restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/invite/`, { emails, subject, body });
  } catch (err) {
    console.error("inviteCandidates error:", err);
    return null;
  }
}

export async function generateSharedReportLink(
  evaluationId: string, 
  candidateEmail: string,
  candidateId?: string
): Promise<{ token: string, expires_at: string } | null> {
  try {
    return await restApiAuthUtil.post(`/skill_evaluation/evaluations/${evaluationId}/generate_share_link/`, {
      candidate_email: candidateEmail,
      candidate_id: candidateId
    });
  } catch {
    return null;
  }
}

export async function getSharedReportByToken(token: string): Promise<any> {
  try {
    const data = await restApiAuthUtil.get<any>(`/skill_evaluation/shared-report/${token}/`);
    return {
      evaluation: mapBackendToFrontend(data.evaluation),
      submission: data.submission,
      timelineEvents: (data.timeline_events || []).map((r: any) => {
        let tone = "neutral";
        if (r.status === "SUCCESS") tone = "success";
        else if (r.status === "WARNING" || r.status === "ERROR") tone = "warn";
        return {
          id: r.id || String(Math.random()),
          label: r.title || "Event",
          time: new Date(r.occurred_at).toLocaleString(),
          tone,
        };
      })
    };
  } catch {
    return null;
  }
}

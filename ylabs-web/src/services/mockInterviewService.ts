import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { type Category, type Diff, type Interview } from "@/lib/mockInterviews";

export interface BackendQuestionNode {
  id: string;
  text: string;
  level: number;
  follow_ups?: BackendQuestionNode[];
}

export interface BackendMockInterview {
  id: string;
  title: string;
  description: string;
  instructions: string;
  max_duration: number;
  interview_mode: string;
  products?: string[];
  required_skills: string[];
  optional_skills: string[];
  publish_status: string;
  participants_count: number;
  user_progress?: {
    completed_count: number;
    is_master: boolean;
  } | null;
  my_submissions?: any[];
  predefined_tree: BackendQuestionNode[];
  created_at?: string;
  updated_at?: string;
}

export interface StartInterviewResponse {
  submission_id: string;
  interview_session_id?: string;
  chat_session_id?: string;
  status: string;
  first_question: string;
  first_question_id?: string;
  interview_type?: string;
  interview_mode?: string;
  progress?: {
    completed_count: number;
    is_master: boolean;
  };
}

export interface NextQuestionResponse {
  question: string;
  is_finished: boolean;
  question_id?: string;
  question_kind?: string;
  competency_targets?: string[];
  rationale?: string;
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function mapBackendToInterview(item: BackendMockInterview): Interview {
  const titleLower = (item.title || "").toLowerCase();
  const descLower = (item.description || "").toLowerCase();
  const skills = (item.required_skills || []).map((s) => s.toLowerCase()).join(" ");
  const allText = `${titleLower} ${descLower} ${skills}`;

  // Determine Category dynamically based on backend skills / text
  let category: Category = "Backend";
  if (
    allText.includes("machine learning") ||
    allText.includes("ai") ||
    allText.includes("deep learning") ||
    allText.includes("model evaluation") ||
    allText.includes("statistics")
  ) {
    category = "AI/ML";
  } else if (
    allText.includes("frontend") ||
    allText.includes("react") ||
    allText.includes("css") ||
    allText.includes("html") ||
    allText.includes("javascript") ||
    allText.includes("ui")
  ) {
    category = "Frontend";
  } else if (
    allText.includes("system design") ||
    allText.includes("hld") ||
    allText.includes("lld") ||
    allText.includes("scalable systems")
  ) {
    category = "System Design";
  } else if (
    allText.includes("data") ||
    allText.includes("sql") ||
    allText.includes("database") ||
    allText.includes("postgres")
  ) {
    category = "Data";
  } else if (
    allText.includes("devops") ||
    allText.includes("kubernetes") ||
    allText.includes("docker") ||
    allText.includes("cloud") ||
    allText.includes("aws")
  ) {
    category = "DevOps & Cloud";
  } else if (allText.includes("security") || allText.includes("owasp") || allText.includes("auth")) {
    category = "Security";
  } else if (allText.includes("behavioural") || allText.includes("hr")) {
    category = "Behavioural";
  }

  // Determine Icon & Color
  let icon = "💻";
  let color = "primary";
  if (category === "AI/ML" || titleLower.includes("machine learning")) {
    icon = "🤖";
    color = "info";
  } else if (titleLower.includes("python")) {
    icon = "🐍";
    color = "info";
  } else if (category === "Frontend" || titleLower.includes("frontend")) {
    icon = "⚛️";
    color = "info";
  } else if (category === "System Design") {
    icon = "🏛️";
    color = "primary";
  } else if (category === "DevOps & Cloud") {
    icon = "☸️";
    color = "info";
  } else if (category === "Data") {
    icon = "🗄️";
    color = "primary";
  } else if (titleLower.includes("java")) {
    icon = "☕";
    color = "warning";
  }

  // Determine Difficulty dynamically from backend max_duration
  let difficulty: Diff = "Intermediate";
  if (item.max_duration <= 30) difficulty = "Beginner";
  else if (item.max_duration >= 50) difficulty = "Advanced";

  // Determine Role dynamically
  let role: "Fresher" | "SDE I" | "SDE II" | "Senior" = "SDE I";
  if (difficulty === "Beginner") role = "Fresher";
  else if (difficulty === "Advanced") role = item.max_duration >= 60 ? "Senior" : "SDE II";

  const completedAttempts =
    item.user_progress?.completed_count ??
    (item.my_submissions
      ? item.my_submissions.filter((s: any) => s.status === "completed").length
      : 0);

  const qCount =
    item.predefined_tree && item.predefined_tree.length > 0
      ? item.predefined_tree.length
      : Math.max(5, Math.round(item.max_duration / 5));

  return {
    slug: item.id,
    name: item.title,
    icon,
    color,
    description: item.description,
    category,
    difficulty,
    role,
    questions: qCount,
    minutes: item.max_duration || 30,
    completed: completedAttempts,
    featured: item.publish_status === "active",
    backendId: item.id,
    predefinedTree: item.predefined_tree,
    requiredSkills: item.required_skills || [],
    optionalSkills: item.optional_skills || [],
    instructions: item.instructions || "",
    interviewMode: item.interview_mode || "automatic",
    products: item.products || [],
    mySubmissions: item.my_submissions || [],
    userProgress: item.user_progress || null,
  };
}

export async function fetchBackendMockInterviews(): Promise<Interview[]> {
  try {
    const res = await yhubApiAuthUtil.get<any>("/mock-interviews/");
    const rawList: BackendMockInterview[] = Array.isArray(res)
      ? res
      : res?.results && Array.isArray(res.results)
      ? res.results
      : [];

    if (rawList.length > 0) {
      return rawList.map(mapBackendToInterview);
    }
  } catch (err) {
    console.error("Failed to load real mock interviews from backend:", err);
  }

  return [];
}

export async function fetchMockInterviewBySlugOrId(slugOrId: string): Promise<Interview | null> {
  try {
    const raw = await yhubApiAuthUtil.get<BackendMockInterview>(`/mock-interviews/${slugOrId}/`);
    if (raw && raw.id) {
      return mapBackendToInterview(raw);
    }
  } catch {
    try {
      const all = await fetchBackendMockInterviews();
      const match = all.find(
        (i) => i.slug === slugOrId || i.backendId === slugOrId || slugifyTitle(i.name) === slugOrId
      );
      if (match) return match;
    } catch {}
  }

  return null;
}

export async function fetchUserInterviewSubmissions(): Promise<any[]> {
  try {
    const res = await yhubApiAuthUtil.get<any[]>("/mock-interviews/my_interviews/");
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function startBackendInterview(
  interviewId: string,
  options?: { experience_level?: string; duration?: number }
): Promise<StartInterviewResponse | null> {
  try {
    const payload = {
      experience_level: options?.experience_level || "Beginner",
      selected_duration: options?.duration || 30,
      force: true,
    };
    const res = await yhubApiAuthUtil.post<StartInterviewResponse>(
      `/mock-interviews/${interviewId}/start_interview/`,
      payload
    );
    return res;
  } catch (err) {
    console.error("Failed to start backend interview:", err);
    return null;
  }
}

export async function submitBackendAnswer(
  interviewId: string,
  payload: {
    interview_session_id: string;
    user_answer: string;
    status?: string;
  }
): Promise<NextQuestionResponse | null> {
  try {
    const res = await yhubApiAuthUtil.post<NextQuestionResponse>(
      `/mock-interviews/${interviewId}/get_next_question/`,
      payload
    );
    return res;
  } catch (err) {
    console.error("Failed to submit answer to backend dynamic engine:", err);
    return null;
  }
}

export async function generateBackendReport(submissionId: string): Promise<any | null> {
  try {
    const res = await yhubApiAuthUtil.post<any>(
      `/mock-interview-submissions/${submissionId}/generate_report/`,
      {}
    );
    return res;
  } catch (err) {
    try {
      const res = await yhubApiAuthUtil.post<any>(
        `/interview/submissions/${submissionId}/generate_report/`,
        {}
      );
      return res;
    } catch {
      console.error("Failed to generate backend interview report:", err);
      return null;
    }
  }
}

export async function fetchBackendSubmission(submissionId: string): Promise<any | null> {
  try {
    const res = await yhubApiAuthUtil.get<any>(
      `/mock-interview-submissions/${submissionId}/`
    );
    return res;
  } catch (err) {
    try {
      const res = await yhubApiAuthUtil.get<any>(
        `/interview/submissions/${submissionId}/`
      );
      return res;
    } catch {
      console.error("Failed to fetch backend submission:", err);
      return null;
    }
  }
}

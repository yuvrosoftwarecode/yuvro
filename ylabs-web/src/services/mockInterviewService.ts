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
  first_question_type?: string;
  interview_type?: string;
  interview_mode?: string;
  num_questions?: number;
  available_interviews?: number;
  progress?: {
    completed_count: number;
    is_master: boolean;
  };
}

export interface CandidateMockInterviewQuota {
  free_interviews: number;
  purchased_interviews: number;
  used_interviews: number;
  available_interviews: number;
  total_granted: number;
}

export interface MockInterviewPack {
  id: string;
  name: string;
  description: string;
  interviews_count: number;
  price_inr: number;
  price_paise: number;
  badge?: string;
  sort_order?: number;
}

export interface CreateMockInterviewOrderResponse {
  order_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  key_id: string;
  name: string;
  description: string;
  pack_id: string;
  interviews_count: number;
}

export interface VerifyMockInterviewPaymentPayload {
  gateway_order_id: string;
  gateway_payment_id: string;
  signature: string;
}

export interface VerifyMockInterviewPaymentResponse {
  status: "SUCCESS" | "FAILED";
  message: string;
  quota?: CandidateMockInterviewQuota;
}

export const DEFAULT_MOCK_INTERVIEW_PACKS: MockInterviewPack[] = [
  {
    id: "mock_pack_1",
    name: "1 Mock Interview",
    description: "1 full AI mock interview session with real-time adaptive questioning and detailed report.",
    interviews_count: 1,
    price_inr: 99,
    price_paise: 9900,
    badge: "",
    sort_order: 1,
  },
  {
    id: "mock_pack_5",
    name: "5 Mock Interviews",
    description: "5 full AI mock interview sessions with real-time adaptive questioning, cycle progression, and analytics.",
    interviews_count: 5,
    price_inr: 399,
    price_paise: 39900,
    badge: "Popular",
    sort_order: 2,
  },
  {
    id: "mock_pack_10",
    name: "10 Mock Interviews",
    description: "10 full AI mock interview sessions for comprehensive end-to-end interview mastery.",
    interviews_count: 10,
    price_inr: 700,
    price_paise: 70000,
    badge: "Best Value",
    sort_order: 3,
  },
];

export interface NextQuestionResponse {
  question: string;
  is_finished: boolean;
  question_id?: string;
  question_kind?: string;
  question_type?: string;
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
  if (titleLower.includes("node") || titleLower.includes("express")) {
    category = "Backend";
  } else if (titleLower.includes("python") && !titleLower.includes("machine learning")) {
    category = "Backend";
  } else if (
    titleLower.includes("machine learning") ||
    titleLower.includes("deep learning") ||
    skills.includes("machine learning") ||
    skills.includes("deep learning") ||
    skills.includes("model evaluation") ||
    /\b(ai engineer|ml engineer|data scientist)\b/i.test(allText)
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
  if (titleLower.includes("node")) {
    icon = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg";
    color = "emerald";
  } else if (titleLower.includes("python")) {
    icon = "🐍";
    color = "info";
  } else if (category === "AI/ML" || titleLower.includes("machine learning")) {
    icon = "🤖";
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

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 10000;
const inFlightInterviews = new Map<string, Promise<Interview[]>>();
const interviewCache = new Map<string, CacheEntry<Interview[]>>();

const inFlightSubmissions = new Map<string, Promise<any[]>>();
const submissionCache = new Map<string, CacheEntry<any[]>>();

export function clearMockInterviewCache() {
  interviewCache.clear();
  inFlightInterviews.clear();
  submissionCache.clear();
  inFlightSubmissions.clear();
}

export async function fetchBackendMockInterviews(
  product: string = "ylabs",
  forceRefresh = false
): Promise<Interview[]> {
  const cacheKey = (product || "all").toLowerCase().trim();
  const now = Date.now();

  if (!forceRefresh) {
    const cached = interviewCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    const inFlight = inFlightInterviews.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const promise = (async () => {
    try {
      const url = product
        ? `/mock-interviews/?product=${encodeURIComponent(product)}`
        : "/mock-interviews/";
      const res = await yhubApiAuthUtil.get<any>(url);
      const rawList: BackendMockInterview[] = Array.isArray(res)
        ? res
        : res?.results && Array.isArray(res.results)
        ? res.results
        : [];

      // Filter: strictly display only mock interviews that have the specified product (e.g. ylabs)
      const filteredList = product
        ? rawList.filter((item) => {
            const products = Array.isArray(item.products)
              ? item.products.map((p) => String(p).toLowerCase().trim())
              : [];
            return products.includes(product.toLowerCase().trim());
          })
        : rawList;

      const mapped = filteredList.map(mapBackendToInterview);
      interviewCache.set(cacheKey, { data: mapped, timestamp: Date.now() });
      return mapped;
    } catch (err) {
      console.error("Failed to load real mock interviews from backend:", err);
      return [];
    } finally {
      inFlightInterviews.delete(cacheKey);
    }
  })();

  inFlightInterviews.set(cacheKey, promise);
  return promise;
}

export async function fetchMockInterviewBySlugOrId(slugOrId: string): Promise<Interview | null> {
  try {
    const raw = await yhubApiAuthUtil.get<BackendMockInterview>(`/mock-interviews/${slugOrId}/`);
    if (raw && raw.id) {
      return mapBackendToInterview(raw);
    }
  } catch {
    try {
      const all = await fetchBackendMockInterviews("ylabs");
      const match = all.find(
        (i) => i.slug === slugOrId || i.backendId === slugOrId || slugifyTitle(i.name) === slugOrId
      );
      if (match) return match;
    } catch {}
  }

  return (
    INTERVIEWS.find(
      (i) => i.slug === slugOrId || i.backendId === slugOrId || slugifyTitle(i.name) === slugOrId
    ) || null
  );
}

export async function fetchUserInterviewSubmissions(
  product: string = "ylabs",
  forceRefresh = false
): Promise<any[]> {
  const cacheKey = (product || "all").toLowerCase().trim();
  const now = Date.now();

  if (!forceRefresh) {
    const cached = submissionCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    const inFlight = inFlightSubmissions.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const promise = (async () => {
    try {
      const url = product
        ? `/mock-interviews/my_interviews/?product=${encodeURIComponent(product)}`
        : "/mock-interviews/my_interviews/";
      const res = await yhubApiAuthUtil.get<any[]>(url);
      const data = Array.isArray(res) ? res : [];
      submissionCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch {
      return [];
    } finally {
      inFlightSubmissions.delete(cacheKey);
    }
  })();

  inFlightSubmissions.set(cacheKey, promise);
  return promise;
}

export async function startBackendInterview(
  interviewId: string,
  options?: { experience_level?: string; duration?: number }
): Promise<StartInterviewResponse | null> {
  try {
    const payload = {
      source: "student",
      experience_level: options?.experience_level || "Beginner",
      selected_duration: options?.duration || 30,
      force: true,
    };
    const res = await yhubApiAuthUtil.post<StartInterviewResponse>(
      `/mock-interviews/${interviewId}/start_interview/`,
      payload
    );
    return res;
  } catch (err: any) {
    console.error("Failed to start backend interview:", err);
    throw err;
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
      {
        source: "student",
        ...payload,
      }
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
      { source: "student" }
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

export async function fetchInterviewSubmissions(
  interviewId: string
): Promise<any[]> {
  try {
    const res = await yhubApiAuthUtil.get<any[]>(
      `/mock-interviews/${interviewId}/submissions/`
    );
    if (Array.isArray(res) && res.length > 0) {
      return res;
    }
  } catch (err) {
    console.warn("Could not fetch submissions from detail endpoint:", err);
  }

  // Fallback: check my_interviews
  try {
    const all = await fetchUserInterviewSubmissions("ylabs");
    const matched = all.filter((s: any) => {
      const sId = String(s.mock_interview || s.mock_interview_id || "");
      return sId === String(interviewId);
    });
    return matched;
  } catch {
    return [];
  }
}

export async function fetchMockInterviewQuota(): Promise<CandidateMockInterviewQuota> {
  try {
    const res = await yhubApiAuthUtil.get<CandidateMockInterviewQuota>("/mock-interviews/quota/");
    if (res && typeof res.available_interviews === "number") {
      return res;
    }
  } catch (err) {
    console.warn("Could not fetch mock interview quota from server:", err);
  }
  return {
    free_interviews: 3,
    purchased_interviews: 0,
    used_interviews: 0,
    available_interviews: 3,
    total_granted: 3,
  };
}

export async function fetchMockInterviewPacks(): Promise<MockInterviewPack[]> {
  try {
    const res = await yhubApiAuthUtil.get<MockInterviewPack[]>("/mock-interviews/packs/");
    if (Array.isArray(res) && res.length > 0) {
      return res;
    }
  } catch (err) {
    console.warn("Could not fetch mock interview packs from server, using defaults:", err);
  }
  return DEFAULT_MOCK_INTERVIEW_PACKS;
}

export async function createMockInterviewOrder(packId: string): Promise<CreateMockInterviewOrderResponse> {
  return await yhubApiAuthUtil.post<CreateMockInterviewOrderResponse>("/mock-interviews/create_order/", {
    pack_id: packId,
  });
}

export async function verifyMockInterviewPayment(
  payload: VerifyMockInterviewPaymentPayload
): Promise<VerifyMockInterviewPaymentResponse> {
  return await yhubApiAuthUtil.post<VerifyMockInterviewPaymentResponse>(
    "/mock-interviews/verify_payment/",
    payload
  );
}

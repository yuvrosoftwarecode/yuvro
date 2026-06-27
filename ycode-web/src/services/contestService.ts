import restApiAuthUtil from '../utils/RestApiAuthUtil';
import restApiUtil from '../utils/RestApiUtil';

// Single source of truth — matches backend snake_case fields
export interface Contest {
  id: string;
  title: string;
  organizer: string;
  type: string;
  status: string;
  publish_status?: string;
  start_datetime: string;
  end_datetime: string;
  start_date?: string;
  end_date?: string;
  registration_start_datetime?: string;
  registration_end_datetime?: string;
  registration_start_date?: string;
  registration_end_date?: string;
  allow_late_entry?: boolean;
  duration?: number;
  prize?: string;
  payment_type?: 'paid' | 'unpaid';
  amount?: string | number;
  difficulty: string;
  description: string;
  instructions?: string;
  total_marks?: number;
  passing_marks?: number;
  enable_proctoring?: boolean;
  tab_switch_threshold?: number;
  violation_threshold?: number;
  questions_config: {
    mcq_single: string[];
    mcq_multiple: string[];
    coding: string[];
    descriptive: string[];
  };
  questions_random_config: {
    mcq_single: number;
    mcq_multiple: number;
    coding: number;
    descriptive: number;
  };
  question_ids?: any[];
  participants_count: number;
  is_registered?: boolean;
  my_submission_status?: string | null;
  max_attempts?: number;
  open_for_all_colleges?: boolean;
  allowed_colleges?: string[];
  open_for_all_departments?: boolean;
  allowed_departments?: string[];
  require_student_id?: boolean;
  proctoring_techniques?: string[];
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

// Payload type for create/update — reuses Contest but omits read-only server fields
export type ContestPayload = Omit<
  Partial<Contest>,
  'id' | 'participants_count' | 'is_registered' | 'created_by' | 'created_at' | 'updated_at'
>;

export interface Question {
  id: number;
  title: string;
  difficulty: string;
  type: string;
  course: {
    id: number;
    title: string;
  };
}

export interface RegisterContestResponse {
  status: string;
  message?: string;
  error?: string;
  is_late_entry: boolean;
  remaining_time_minutes?: number | null;
}

export interface StartContestResponse {
  submission_id: number;
  duration: number;
  questions: any[];
  is_late_entry: boolean;
  enable_proctoring: boolean;
  tab_switch_threshold?: number;
  violation_threshold?: number;
  violation_count?: number;
  tab_switch_count?: number;
}

export const fetchContests = async (): Promise<Contest[]> => {
  const contests = await restApiAuthUtil.get('/assessment/contests/');
  // Cache to localStorage to enable mocking public contest views locally
  try {
    localStorage.setItem('mock_public_contests', JSON.stringify(contests));
  } catch (e) {
    console.error("Failed to cache contests", e);
  }
  return contests;
};

// Form-friendly model with camelCase fields (used by ContestForm UI state only)
export interface ContestFormModel {
  id: string;
  title: string;
  organizer: string;
  type: 'company' | 'college' | 'weekly' | 'monthly';
  status: 'upcoming' | 'ongoing' | 'past';
  startDate: string;
  endDate: string;
  duration: string;
  participants: number;
  prize?: string;
  payment_type?: 'paid' | 'unpaid';
  amount?: string | number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  allowLateEntry?: boolean;
  questions_config?: Contest['questions_config'];
  questions_random_config?: Contest['questions_random_config'];
  open_for_all_colleges?: boolean;
  allowed_colleges?: string[];
  open_for_all_departments?: boolean;
  allowed_departments?: string[];
  require_student_id?: boolean;
  proctoring_techniques?: string[];
  publish_status?: string;
  instructions?: string;
  total_marks?: number;
  passing_marks?: number;
  enable_proctoring?: boolean;
  tabSwitchThreshold?: number;
  violationThreshold?: number;
}

// Maps raw backend Contest data to the form-friendly ContestFormModel
export function mapContestFromBackend(c: any): ContestFormModel {
  return {
    id: String(c.id),
    title: c.title,
    organizer: c.organizer,
    type: c.type,
    status: c.status,
    startDate: c.start_datetime || c.start_date || '',
    endDate: c.end_datetime || c.end_date || '',
    duration: c.duration ? `${Math.round(typeof c.duration === 'string' ? parseFloat(c.duration) : c.duration)} min` : '',
    participants: c.participants_count ?? 0,
    prize: c.prize ?? '',
    payment_type: c.payment_type ?? 'unpaid',
    amount: c.amount ?? '',
    difficulty: c.difficulty.charAt(0).toUpperCase() + c.difficulty.slice(1),
    description: c.description ?? '',
    registrationStartDate: c.registration_start_datetime || c.registration_start_date || '',
    registrationEndDate: c.registration_end_datetime || c.registration_end_date || '',
    allowLateEntry: c.allow_late_entry ?? false,
    questions_config: c.questions_config ?? {
      mcq_single: [],
      mcq_multiple: [],
      coding: [],
      descriptive: []
    },
    questions_random_config: c.questions_random_config ?? {
      mcq_single: 0,
      mcq_multiple: 0,
      coding: 0,
      descriptive: 0
    },
    open_for_all_colleges: c.open_for_all_colleges ?? true,
    allowed_colleges: (c.allowed_colleges ?? []).map(String),
    open_for_all_departments: c.open_for_all_departments ?? true,
    allowed_departments: (c.allowed_departments ?? []).map(String),
    require_student_id: c.require_student_id ?? false,
    proctoring_techniques: c.proctoring_techniques ?? [],
    publish_status: c.publish_status ?? 'draft',
    instructions: c.instructions ?? '',
    total_marks: c.total_marks ?? undefined,
    passing_marks: c.passing_marks ?? undefined,
    enable_proctoring: c.enable_proctoring ?? false,
    tabSwitchThreshold: c.tab_switch_threshold ?? 3,
    violationThreshold: c.violation_threshold ?? 5,
  };
}

export const contestService = {
  async getAllContests(): Promise<Contest[]> {
    return fetchContests();
  },

  async getContest(contestId: string): Promise<Contest> {
    return restApiAuthUtil.get(`/assessment/contests/${contestId}/`);
  },

  async createContest(data: ContestPayload): Promise<Contest> {
    return restApiAuthUtil.post('/assessment/contests/', data);
  },

  async updateContest(contestId: string, data: ContestPayload): Promise<Contest> {
    return restApiAuthUtil.patch(`/assessment/contests/${contestId}/`, data);
  },

  async deleteContest(contestId: string): Promise<void> {
    return restApiAuthUtil.delete(`/assessment/contests/${contestId}/`);
  },

  async registerContest(contestId: string): Promise<RegisterContestResponse> {
    return restApiAuthUtil.post(`/assessment/contests/${contestId}/register/`);
  },

  async startContest(contestId: string): Promise<StartContestResponse> {
    return restApiAuthUtil.post(`/assessment/contests/${contestId}/start/`);
  },

  async submitContest(contestId: string, submissionId: string, answers: any): Promise<any> {
    return restApiAuthUtil.post(`/assessment/contests/${contestId}/submit/`, {
      submission_id: submissionId,
      answers,
    });
  },

  async getContestLeaderboard(contestId: string, page: number = 1): Promise<any> {
    return restApiAuthUtil.get(`/assessment/contests/${contestId}/leaderboard/?page=${page}`);
  },

  async getContestSubmissions(contestId: string): Promise<any[]> {
    return restApiAuthUtil.get(`/assessment/contest/submissions/?contest=${contestId}`);
  },

  async getContestParticipants(contestId: string): Promise<any[]> {
    return restApiAuthUtil.get(`/assessment/contests/${contestId}/participants/`);
  },

  async getContestSubmission(submissionId: string): Promise<any> {
    return restApiAuthUtil.get(`/assessment/contest/submissions/${submissionId}/`);
  },

  async getQuestion(questionId: number): Promise<Question> {
    return restApiAuthUtil.get(`/course/questions/${questionId}/`);
  },

  async getQuestionsByCourse(courseId: string | number, filters?: {
    difficulty?: string;
    type?: string;
    search?: string;
  }): Promise<Question[]> {
    const params: any = { course: courseId };
    if (filters?.difficulty) params.difficulty = filters.difficulty;
    if (filters?.type) params.type = filters.type;
    if (filters?.search) params.search = filters.search;
    return restApiAuthUtil.get('/course/questions/', { params });
  },

  async addQuestionToContest(contestId: string, questionId: string, questionType: string, currentQuestionsConfig: Contest['questions_config']): Promise<Contest> {
    const updatedQuestionsConfig = { ...currentQuestionsConfig };
    if (!updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig]) {
      updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig] = [];
    }
    updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig].push(questionId);
    return this.updateContest(contestId, { questions_config: updatedQuestionsConfig });
  },

  async removeQuestionFromContest(contestId: string, questionId: string, questionType: string, currentQuestionsConfig: Contest['questions_config']): Promise<Contest> {
    const updatedQuestionsConfig = { ...currentQuestionsConfig };
    if (updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig]) {
      updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig] =
        updatedQuestionsConfig[questionType as keyof typeof updatedQuestionsConfig].filter(id => id !== questionId);
    }
    return this.updateContest(contestId, { questions_config: updatedQuestionsConfig });
  },

  async getContestReport(contestId: string, includeAI: boolean = true): Promise<any> {
    const params = new URLSearchParams();
    params.append('include_ai_insights', String(includeAI));
    return restApiAuthUtil.get(`/assessment/contests/${contestId}/report/?${params.toString()}`);
  },

  async getStudentAnalytics(contestId: string, includeAI: boolean = true, userId?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('include_ai_insights', String(includeAI));
    if (userId) {
      params.append('user_id', userId);
    }
    return restApiAuthUtil.get(`/assessment/contests/${contestId}/student_analytics/?${params.toString()}`);
  },

  async getCollegeAnalytics(contestId: string, collegeId: string, includeAI: boolean = false): Promise<any> {
    const params = new URLSearchParams();
    params.append('college_id', collegeId);
    params.append('include_ai_insights', String(includeAI));
    return restApiAuthUtil.get(`/assessment/contests/${contestId}/college_analytics/?${params.toString()}`);
  },

  // MOCK PUBLIC APIs
  async getPublicContest(contestId: string): Promise<Contest> {
    try {
      // First try to fetch the actual contest unauthenticated
      const contest = await restApiUtil.get<Contest>(`/assessment/contests/${contestId}/`);
      if (contest) return contest;
    } catch (e) {
      console.warn("Unauthenticated fetch failed, falling back to mock or cache", e);
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const cached = localStorage.getItem('mock_public_contests');
          if (cached) {
            const contests: Contest[] = JSON.parse(cached);
            const found = contests.find(c => String(c.id) === contestId);
            if (found) {
              return resolve(found);
            }
          }
        } catch (e) {
          console.error("Failed to read cached contests", e);
        }
        
        // Fallback mock if not found in localStorage
        resolve({
          id: contestId,
          title: "Yuvro Contest",
          organizer: "Yuvro Code",
          type: "company",
          status: "upcoming",
          start_datetime: new Date(Date.now() + 86400000).toISOString(),
          end_datetime: new Date(Date.now() + 172800000).toISOString(),
          duration: 120,
          difficulty: "Medium",
          description: "This is a public contest. Anyone can register.",
          questions_config: { mcq_single: [], mcq_multiple: [], coding: [], descriptive: [] },
          questions_random_config: { mcq_single: 0, mcq_multiple: 0, coding: 0, descriptive: 0 },
          participants_count: 0,
          open_for_all_colleges: true,
          registration_start_datetime: new Date(Date.now() - 86400000).toISOString(),
          registration_end_datetime: new Date(Date.now() + 43200000).toISOString(),
          allow_late_entry: true,
        } as Contest);
      }, 300);
    });
  },

  async fetchPublicContests(): Promise<Contest[]> {
    try {
      // First try to fetch actual contests unauthenticated
      const contests = await restApiUtil.get<Contest[]>('/assessment/contests/');
      if (contests && Array.isArray(contests)) return contests;
    } catch (e) {
      console.warn("Unauthenticated fetch failed, falling back to mock or cache", e);
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const cached = localStorage.getItem('mock_public_contests');
          if (cached) {
            return resolve(JSON.parse(cached));
          }
        } catch (e) {
          console.error("Failed to read cached contests", e);
        }

        resolve([]);
      }, 300);
    });
  },

  async verifyPayment(contestId: string, paymentToken: string): Promise<any> {
    return restApiUtil.post(`/assessment/contests/${contestId}/verify_payment/`, { payment_token: paymentToken });
  }
};

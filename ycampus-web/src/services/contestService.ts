import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface Contest {
  id: string;
  title: string;
  organizer: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  duration?: number;
  prize?: string;
  difficulty: string;
  description: string;
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
  participants_count: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

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

export const fetchContests = async (): Promise<Contest[]> => {
  return restApiAuthUtil.get('/assessment/contests/');
};

export interface CreateContestData {
  title: string;
  organizer: string;
  type: string;
  status: string;
  start_datetime?: string;
  end_datetime?: string;
  start_date?: string;
  end_date?: string;
  duration?: number;
  prize?: string;
  difficulty: string;
  description: string;
  questions_config?: {
    mcq_single: string[];
    mcq_multiple: string[];
    coding: string[];
    descriptive: string[];
  };
  questions_random_config?: {
    mcq_single: number;
    mcq_multiple: number;
    coding: number;
    descriptive: number;
  };
}

export const contestService = {
  async getAllContests(): Promise<Contest[]> {
    return fetchContests();
  },

  async getContest(contestId: string): Promise<Contest> {
    return restApiAuthUtil.get(`/assessment/contests/${contestId}/`);
  },

  async createContest(data: CreateContestData): Promise<Contest> {
    return restApiAuthUtil.post('/assessment/contests/', data);
  },

  async updateContest(contestId: string, data: Partial<Contest>): Promise<Contest> {
    return restApiAuthUtil.patch(`/assessment/contests/${contestId}/`, data);
  },

  async deleteContest(contestId: string): Promise<void> {
    return restApiAuthUtil.delete(`/assessment/contests/${contestId}/`);
  },

  async registerContest(contestId: string): Promise<any> {
    return restApiAuthUtil.post(`/assessment/contests/${contestId}/register/`);
  },

  async startContest(contestId: string): Promise<any> {
    return restApiAuthUtil.post(`/assessment/contests/${contestId}/start/`);
  },

  async submitContest(contestId: string, submissionId: string, answers: any): Promise<any> {
    return restApiAuthUtil.post(`/assessment/contests/${contestId}/submit/`, {
      submission_id: submissionId,
      answers,
    });
  },

  async getContestLeaderboard(contestId: string): Promise<any> {
    return restApiAuthUtil.get(`/assessment/contests/${contestId}/leaderboard/`);
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

    if (filters?.difficulty) {
      params.difficulty = filters.difficulty;
    }
    if (filters?.type) {
      params.type = filters.type;
    }
    if (filters?.search) {
      params.search = filters.search;
    }

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
};
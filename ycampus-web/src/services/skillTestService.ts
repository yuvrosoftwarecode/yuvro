import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface SkillTest {
  id: string;
  title: string;
  description: string;
  instructions: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  total_marks: number;
  passing_marks: number;
  enable_proctoring: boolean;
  max_attempts: number;
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
  publish_status: 'draft' | 'active' | 'inactive' | 'archived';
  total_questions?: number;
  course: string;
  topic?: string;
  participants_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillTestData {
  title: string;
  description?: string;
  instructions?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  total_marks?: number;
  passing_marks?: number;
  enable_proctoring?: boolean;
  max_attempts?: number;
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
  publish_status?: 'draft' | 'active' | 'inactive' | 'archived';
  course: string;
  topic?: string;
}

export interface UpdateSkillTestData extends Partial<CreateSkillTestData> { }

export interface SkillTestFilters {
  course?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  search?: string;
}


export interface StartTestResponse {
  submission_id: string;
  status: string;
  duration: number;
  questions: any[]; // Using any[] for now, ideally strictly typed
}

export interface SubmitTestResponse {
  status: string;
  score: number;
}

// API Functions

export const fetchSkillTests = async (filters?: SkillTestFilters): Promise<SkillTest[]> => {
  try {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `/assessment/skill-tests/?${queryString}` : '/assessment/skill-tests/';

    const response = await restApiAuthUtil.get(url);
    return response as SkillTest[];
  } catch (error) {
    console.error('Error fetching skill tests:', error);
    throw error;
  }
};

export const fetchSkillTestById = async (id: string): Promise<SkillTest> => {
  try {
    const response = await restApiAuthUtil.get(`/assessment/skill-tests/${id}/`);
    return response as SkillTest;
  } catch (error) {
    console.error('Error fetching skill test:', error);
    throw error;
  }
};

export const createSkillTest = async (data: CreateSkillTestData): Promise<SkillTest> => {
  try {
    const response = await restApiAuthUtil.post('/assessment/skill-tests/', data);
    return response as SkillTest;
  } catch (error) {
    console.error('Error creating skill test:', error);
    throw error;
  }
};

export const updateSkillTest = async (id: string, data: UpdateSkillTestData): Promise<SkillTest> => {
  try {
    const response = await restApiAuthUtil.patch(`/assessment/skill-tests/${id}/`, data);
    return response as SkillTest;
  } catch (error) {
    console.error('Error updating skill test:', error);
    throw error;
  }
};

export const deleteSkillTest = async (id: string): Promise<void> => {
  try {
    await restApiAuthUtil.delete(`/assessment/skill-tests/${id}/`);
  } catch (error) {
    console.error('Error deleting skill test:', error);
    throw error;
  }
};



export const startSkillTest = async (testId: string): Promise<StartTestResponse> => {
  try {
    const response = await restApiAuthUtil.post(`/assessment/skill-tests/${testId}/start/`, {});
    return response as StartTestResponse;
  } catch (error) {
    console.error('Error starting skill test:', error);
    throw error;
  }
};

export const submitSkillTest = async (testId: string, submissionId: string, answers: any, explanations?: any, all_question_ids?: string[]): Promise<SubmitTestResponse> => {
  try {
    const response = await restApiAuthUtil.post(`/assessment/skill-tests/${testId}/submit/`, {
      submission_id: submissionId,
      answers,
      explanations,
      all_question_ids
    });
    return response as SubmitTestResponse;
  } catch (error) {
    console.error('Error submitting skill test:', error);
    throw error;
  }
};


// Utility functions
export const getSkillTestsByCourse = async (courseId: string): Promise<SkillTest[]> => {
  return fetchSkillTests({ course: courseId });
};

export const getSkillTestsByTopic = async (topicId: string): Promise<SkillTest[]> => {
  return fetchSkillTests({ topic: topicId });
};

export const getSkillTestSubmissions = async (skillTestId: string): Promise<any[]> => {
  try {
    const response = await restApiAuthUtil.get(`/assessment/skill-test/submissions/?skill_test=${skillTestId}`);
    return response as any[];
  } catch (error) {
    console.error('Error fetching submissions:', error);
    throw error;
  }
};

export const getSkillTestSubmission = async (submissionId: string): Promise<any> => {
  try {
    const response = await restApiAuthUtil.get(`/assessment/skill-test/submissions/${submissionId}/`);
    return response as any;
  } catch (error) {
    console.error('Error fetching submission:', error);
    throw error;
  }
};

export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const;

export const PUBLISH_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
] as const;

const skillTestService = {
  getSkillTests: fetchSkillTests,
  getSkillTest: fetchSkillTestById,
  createSkillTest,
  updateSkillTest,
  deleteSkillTest,
  getSkillTestsByCourse,
  getSkillTestsByTopic,
  getSkillTestSubmissions,
  getSkillTestSubmission,
  startSkillTest,
  submitSkillTest,
};

export default skillTestService;
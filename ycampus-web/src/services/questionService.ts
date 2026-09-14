import restApiAuthUtil from '../utils/RestApiAuthUtil';

// Types based on the backend Question model
export interface MCQOption {
  text: string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive';
  title: string;
  content: string;
  level: 'subject' | 'unit' | 'subunit';
  subject?: string;
  unit?: string;
  sub_unit?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  duration: number;
  categories: string[];
  is_active?: boolean;
  hints?: string[];
  solutions?: any[];
  mcq_options?: MCQOption[];
  test_cases_basic?: TestCase[];
  test_cases_advanced?: TestCase[];
  code_executor_config?: {
    time_limit?: number;
    memory_limit?: number;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  input: string;
  expected_output: string;
  description?: string;
}

export interface CreateQuestionData {
  type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive';
  title: string;
  content: string;
  level: 'subject' | 'unit' | 'subunit';
  subject?: string;
  unit?: string;
  sub_unit?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  duration: number;
  categories: string[];
  mcq_options?: MCQOption[];
  test_cases_basic?: TestCase[];
  test_cases_advanced?: TestCase[];
  code_executor_config?: {
    time_limit?: number;
    memory_limit?: number;
  };
}

export interface UpdateQuestionData extends Partial<CreateQuestionData> { }

export interface QuestionFilters {
  subject?: string;
  unit?: string;
  sub_unit?: string;
  type?: 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive';
  difficulty?: 'easy' | 'medium' | 'hard';
  level?: 'subject' | 'unit' | 'subunit';
  categories?: string;
  search?: string;
}

// API Functions
export const fetchQuestions = async (filters?: QuestionFilters): Promise<Question[]> => {
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
    const url = queryString ? `/course/questions/?${queryString}` : '/course/questions/';

    const response = await restApiAuthUtil.get(url);
    if (Array.isArray(response)) {
      return response;
    }
    if (response && typeof response === 'object') {
      const resObj = response as any;
      if (Array.isArray(resObj.results)) return resObj.results;
      if (Array.isArray(resObj.questions)) return resObj.questions;
      if (Array.isArray(resObj.data)) return resObj.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};

export const fetchQuestionById = async (id: string): Promise<Question> => {
  try {
    const response = await restApiAuthUtil.get(`/course/questions/${id}/`);
    return response as Question;
  } catch (error) {
    console.error('Error fetching question:', error);
    throw error;
  }
};

export const createQuestion = async (data: CreateQuestionData): Promise<Question> => {
  try {
    const response = await restApiAuthUtil.post('/course/questions/', data);
    return response as Question;
  } catch (error) {
    console.error('Error creating question:', error);
    throw error;
  }
};

export const updateQuestion = async (id: string, data: UpdateQuestionData): Promise<Question> => {
  try {
    const response = await restApiAuthUtil.patch(`/course/questions/${id}/`, data);
    return response as Question;
  } catch (error) {
    console.error('Error updating question:', error);
    throw error;
  }
};

export const deleteQuestion = async (id: string): Promise<void> => {
  try {
    await restApiAuthUtil.delete(`/course/questions/${id}/`);
  } catch (error) {
    console.error('Error deleting question:', error);
    throw error;
  }
};

// Utility functions for question management
export const getQuestionsByLevel = async (
  level: 'subject' | 'unit' | 'subunit',
  levelId: string
): Promise<Question[]> => {
  const filters: QuestionFilters = { level };

  switch (level) {
    case 'subject':
      filters.subject = levelId;
      break;
    case 'unit':
      filters.unit = levelId;
      break;
    case 'subunit':
      filters.sub_unit = levelId;
      break;
  }

  return fetchQuestions(filters);
};

export const getQuestionsByType = async (
  type: 'mcq_single' | 'mcq_multiple' | 'coding' | 'descriptive',
  filters?: Omit<QuestionFilters, 'type'>
): Promise<Question[]> => {
  return fetchQuestions({ ...filters, type });
};

export const getQuestionsByCategory = async (
  categoryStr: string,
  filters?: Omit<QuestionFilters, 'categories'>
): Promise<Question[]> => {
  return fetchQuestions({ ...filters, categories: categoryStr });
};

export const getQuestionsByDifficulty = async (
  difficulty: 'easy' | 'medium' | 'hard',
  filters?: Omit<QuestionFilters, 'difficulty'>
): Promise<Question[]> => {
  return fetchQuestions({ ...filters, difficulty });
};

export const QUESTION_TYPES = [
  { value: 'mcq_single', label: 'MCQ - Single Answer' },
  { value: 'mcq_multiple', label: 'MCQ - Multiple Answers' },
  { value: 'coding', label: 'Coding Problem' },
  { value: 'descriptive', label: 'Descriptive Question' },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const;

export const QUESTION_LEVELS = [
  { value: 'subject', label: 'Subject Level' },
  { value: 'unit', label: 'Unit Level' },
  { value: 'subunit', label: 'SubUnit Level' },
] as const;

export const QUESTION_CATEGORIES = [
  { value: 'learn', label: 'Learn' },
  { value: 'practice', label: 'Practice' },
  { value: 'skill_test', label: 'Skill Test' },
  { value: 'contest', label: 'Contest' },
  { value: 'task', label: 'Task' },
  { value: 'assessment', label: 'Assessment' },
] as const;

// Validation helpers
export const validateMCQQuestion = (data: CreateQuestionData): string[] => {
  const errors: string[] = [];

  if (data.type === 'mcq_single' || data.type === 'mcq_multiple') {
    if (!data.mcq_options || data.mcq_options.length < 2) {
      errors.push('MCQ questions must have at least 2 options');
    }

    if (data.mcq_options) {
      let correctCount = 0;
      for (let i = 0; i < data.mcq_options.length; i++) {
        const option = data.mcq_options[i];
        if (!option.text || !option.text.trim()) {
          errors.push(`Option ${i + 1} text cannot be empty`);
        }
        if (option.is_correct) {
          correctCount++;
        }
      }

      if (correctCount === 0) {
        errors.push('MCQ questions must have at least one correct answer');
      }

      if (data.type === 'mcq_single' && correctCount > 1) {
        errors.push('Single-answer MCQ questions can only have one correct answer');
      }

      if (data.type === 'mcq_multiple' && correctCount < 2) {
        errors.push('Multiple-answer MCQ questions must have at least 2 correct answers');
      }
    }
  }

  return errors;
};

export const validateCodingQuestion = (data: CreateQuestionData): string[] => {
  const errors: string[] = [];

  if (data.type === 'coding') {
    if (!data.test_cases_basic || data.test_cases_basic.length === 0) {
      errors.push('Coding questions must have at least 1 basic test case');
    }

    if (data.test_cases_basic) {
      data.test_cases_basic.forEach((testCase, index) => {
        if (!testCase.input && testCase.input !== '') {
          errors.push(`Test case ${index + 1}: Input is required`);
        }
        if (!testCase.expected_output && testCase.expected_output !== '') {
          errors.push(`Test case ${index + 1}: Expected output is required`);
        }
      });
    }
  }

  return errors;
};

export const validateQuestion = (data: CreateQuestionData): string[] => {
  const errors: string[] = [];

  // Basic validation
  if (!data.title?.trim()) {
    errors.push('Question title is required');
  }

  if (!data.content?.trim()) {
    errors.push('Question content is required');
  }

  if (!data.type) {
    errors.push('Question type is required');
  }

  if (!data.level) {
    errors.push('Question level is required');
  }

  if (!data.difficulty) {
    errors.push('Question difficulty is required');
  }

  if (data.marks <= 0) {
    errors.push('Question marks must be greater than 0');
  }

  // Level-specific validation
  if (data.level === 'subject' && !data.subject) {
    errors.push('Subject is required for subject-level questions');
  }

  if (data.level === 'unit' && !data.unit) {
    errors.push('Unit is required for unit-level questions');
  }

  if (data.level === 'subunit' && !data.sub_unit) {
    errors.push('SubUnit is required for subunit-level questions');
  }

  // Type-specific validation
  errors.push(...validateMCQQuestion(data));
  errors.push(...validateCodingQuestion(data));

  return errors;
};

// Utility function to get random questions for quiz
export const fetchRandomQuestions = async (
  filters: QuestionFilters,
  count: number = 5
): Promise<Question[]> => {
  try {
    const allQuestions = await fetchQuestions(filters);

    // Shuffle and return random questions
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } catch (error) {
    console.error('Error fetching random questions:', error);
    throw error;
  }
};
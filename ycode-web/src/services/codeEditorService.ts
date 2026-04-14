import restApiAuthUtil from '../utils/RestApiAuthUtil';
import restApiUtilCodeExecuter from '../utils/RestApiUtilCodeExecuter';

export interface CodeSubmission {
  id: number;
  coding_problem: string;
  problem_title: string;
  problem_description: string;
  code: string;
  language: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'timeout';
  output: string;
  error_message: string;
  execution_time: number;
  memory_usage: number;
  test_cases_passed: number;
  total_test_cases: number;
  plagiarism_score: number;
  plagiarism_details: any;
  created_at: string;
  updated_at: string;
  question_difficulty?: string;
}

export interface CodeExecutionRequest {
  code: string;
  language: string;
  coding_problem_id?: string;
  question_id: string;
  course_id?: string;
  topic_id?: string;
  submission_type?: 'code_practice' | 'skill_test' | 'contest' | 'mock_interview';
}

export interface PlagiarismReport {
  id: number;
  submission1: number;
  submission2: number;
  submission1_user: string;
  submission2_user: string;
  similarity_score: number;
  similarity_details: any;
  created_at: string;
}

export interface ExecutionResult extends CodeSubmission {
  test_results: {
    passed: number;
    total: number;
    success: boolean;
    execution_time?: number;
    memory_usage?: number;
    summary?: string;
    results?: Array<{
      test_case_id: number;
      passed: boolean;
      input: string;
      expected_output: string;
      actual_output: string;
      error: string;
      execution_time: number;
    }>;
  };
  plagiarism_flagged: boolean;
}

class CodeEditorService {
  async runCode(request: {
    code: string;
    language: string;
    test_cases: any[];
    test_cases_custom?: any[];
    problem_title?: string
  }): Promise<ExecutionResult> {
    try {
      const data: any = await restApiUtilCodeExecuter.post('/execute-with-tests', {
        code: request.code,
        language: request.language,
        test_cases_basic: (request.test_cases || []).map(tc => ({
          input: tc.input || '',
          expected_output: tc.expected_output || '',
          weight: tc.weight || 1
        })),
        test_cases_advanced: [], // Run only uses basic test cases
        test_cases_custom: (request.test_cases_custom || []).map(tc => ({
          input: tc.input || '',
          expected_output: tc.expected_output || '',
          weight: 1
        })),
        timeout: 10
      });

      const executionResult = data.execution_result || {};
      const testResults = data.test_results || [];

      return {
        id: 0,
        coding_problem: '',
        problem_title: request.problem_title || 'Quick Run',
        problem_description: '',
        code: request.code,
        language: request.language,
        status: executionResult.success ? 'completed' : 'error',
        output: executionResult.output || '',
        error_message: executionResult.error || '',
        execution_time: executionResult.execution_time || 0,
        memory_usage: executionResult.memory_usage || 0,
        test_cases_passed: data.total_passed || 0,
        total_test_cases: data.total_tests || 0,
        plagiarism_score: 0,
        plagiarism_details: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        test_results: {
          passed: data.total_passed || 0,
          total: data.total_tests || 0,
          results: testResults.map((result: any, index: number) => ({
            test_case_id: index,
            passed: result.passed || false,
            input: result.input || '',
            expected_output: result.expected_output || '',
            actual_output: result.actual_output || '',
            error: result.error || '',
            execution_time: result.execution_time || 0
          })),
          success: executionResult.success || false
        },
        plagiarism_flagged: false
      };
    } catch (error) {
      console.error('Code execution failed:', error);
      throw new Error(`Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async submitSolution(request: {
    code: string;
    language: string;
    question_id: string;
    course_id?: string;
    topic_id?: string;
    subtopic_id?: string;
    test_cases_basic?: any[];
    test_cases_advanced?: any[];
    test_cases_custom?: any[];
    submission_id?: string;
    contest_id?: string;
    skill_test_id?: string;
    mock_interview_id?: string;
    submissionType?: 'learn' | 'practice' | 'skill_test' | 'contest' | 'mock_interview';
  }): Promise<ExecutionResult> {
    try {
      const submissionType = request.submissionType || 'practice';
      let endpoint = '';

      const payload = {
        subtopic_id: request.subtopic_id,
        question_id: request.question_id,
        language: request.language,
        code: request.code,
        context: submissionType,
        test_cases_basic: request.test_cases_basic || [],
        test_cases_advanced: request.test_cases_advanced || [],
        test_cases_custom: request.test_cases_custom || [],
        coding_status: {},
        course_id: request.course_id,
        topic_id: request.topic_id,
        submission_id: request.submission_id,
        contest_id: request.contest_id,
        skill_test_id: request.skill_test_id,
        mock_interview_id: request.mock_interview_id
      };

      switch (submissionType) {
        case 'learn':
          endpoint = '/course/student-course-progress/submit_coding/';
          break;
        case 'practice':
          endpoint = '/course/student-code-practices/submit/';
          break;
        case 'skill_test':
          endpoint = '/assessment/skill-tests/submit/';
          break;
        case 'contest':
          endpoint = '/assessment/contests/submit/';
          break;
        case 'mock_interview':
          endpoint = '/assessment/mock-interviews/submit/';
          break;
        default:
          endpoint = '/course/student-code-practices/submit/';
      }

      const response: any = await restApiAuthUtil.post(endpoint, payload);

      return {
        id: response.id || 0,
        coding_problem: response.coding_problem || '',
        problem_title: response.problem_title || 'Code Practice',
        problem_description: response.problem_description || '',
        code: response.code || request.code,
        language: response.language || request.language,
        status: response.status || 'completed',
        output: response.output || response.execution_output || '',
        error_message: response.error_message || '',
        execution_time: response.execution_time || 0,
        memory_usage: response.memory_usage || 0,
        test_cases_passed: response.test_cases_passed || 0,
        total_test_cases: response.total_test_cases || 0,
        plagiarism_score: response.plagiarism_score || 0,
        plagiarism_details: response.plagiarism_details || null,
        created_at: response.created_at || new Date().toISOString(),
        updated_at: response.updated_at || new Date().toISOString(),
        test_results: {
          passed: response.test_cases_passed || 0,
          total: response.total_test_cases || 0,
          results: response.test_results?.test_results || response.test_results?.results || [],
          success: response.status === 'completed'
        },
        plagiarism_flagged: response.plagiarism_flagged || false
      };
    } catch (error) {
      console.error('Code submission failed:', error);
      throw new Error(`Solution submission failed: ${error instanceof Error ? error.message : 'No response received from submission service'}`);
    }
  }

  async executeCode(request: CodeExecutionRequest & { test_cases: any[] }): Promise<ExecutionResult> {
    return this.submitSolution({
      ...request,
      question_id: request.coding_problem_id || request.question_id
    });
  }

  async getSubmissions(codingProblemId?: string, submissionType: string = 'code_practice'): Promise<CodeSubmission[]> {
    let endpoint = '';
    switch (submissionType) {
      case 'learn':
      case 'code_practice':
        // Both learn and practice submissions are stored in student-code-practices
        endpoint = '/course/student-code-practices/';
        break;
      case 'skill_test':
        endpoint = '/assessment/skill-test/submissions/';
        break;
      case 'contest':
        // Note: singular 'contest' not 'contests' — matches contestService.ts
        endpoint = '/assessment/contest/submissions/';
        break;
      case 'mock_interview':
        // Mock interview submissions are nested under the interview ID
        // but we can't know the interview ID here, so fall back to code practices
        endpoint = '/course/student-code-practices/';
        break;
    }

    const params: any = codingProblemId ? { question_id: codingProblemId } : {};

    // Isolate submissions by passing the context to the backend.
    if (endpoint === '/course/student-code-practices/') {
      // Backend stores practice submissions with context='practice' instead of 'code_practice'
      params.context = submissionType === 'learn' ? 'learn' : (submissionType === 'code_practice' ? 'practice' : submissionType);
    }

    try {
      const response: any = await restApiAuthUtil.get(endpoint, Object.keys(params).length > 0 ? { params } : undefined);
      console.log('[codeEditorService] getSubmissions raw response:', response);
      const arr = Array.isArray(response) ? response : (response?.results ?? response?.data ?? []);
      return arr;
    } catch (err) {
      console.error('[codeEditorService] getSubmissions failed:', err);
      return [];
    }
  }

  async getSubmission(id: number, submissionType: string = 'code_practice'): Promise<CodeSubmission> {
    let endpoint = '';
    switch (submissionType) {
      case 'code_practice':
        endpoint = `/course/student-code-practices/${id}/`;
        break;
      case 'skill_test':
        endpoint = `/assessment/skill-test/submissions/${id}/`;
        break;
      case 'contest':
        endpoint = `/assessment/contest/submissions/${id}/`;
        break;
      case 'mock_interview':
        endpoint = `/assessment/mock-interviews/submissions/${id}/`;
        break;
      default:
        endpoint = `/course/student-code-practices/${id}/`;
    }
    return restApiAuthUtil.get(endpoint);
  }

  /** Fetches the full submission and normalises the code field from multiple possible API keys */
  async getFullSubmission(id: number): Promise<CodeSubmission> {
    const raw: any = await restApiAuthUtil.get(`/course/student-code-practices/${id}/`);
    console.log('[codeEditorService] getFullSubmission raw keys:', Object.keys(raw), raw);
    return {
      ...raw,
      code: raw.code || raw.answer_latest?.code || raw.source_code || raw.submitted_code || raw.user_code || raw.solution_code || '',
      language: raw.language || raw.answer_latest?.language || raw.lang || '',
    };
  }

  async deletePracticeSubmission(id: number): Promise<void> {
    return restApiAuthUtil.delete(`/course/student-code-practices/${id}/`);
  }

  async getSupportedLanguagesAndTemplates(): Promise<any> {
    return restApiUtilCodeExecuter.get('/supported-languages-and-templates');
  }

  async generateInsights(): Promise<{ insights: any[] }> {
    return restApiAuthUtil.get('/course/student-code-practices/generate_insights/');
  }
}

export default new CodeEditorService();
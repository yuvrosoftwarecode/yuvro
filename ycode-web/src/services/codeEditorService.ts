import restApiAuthUtil from '../utils/RestApiAuthUtil';
import restApiUtilCodeExecuter from '../utils/RestApiUtilCodeExecuter';
import { ApiError } from '../utils/RestApiUtil';

export interface CodeSubmission {
  id: number;
  coding_problem: string;
  problem_title: string;
  problem_description: string;
  code: string;
  language: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'timeout' | 'accepted' | 'failed';
  verdict?: string;
  output: string;
  error_message: string;
  reason?: string;
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
      error_message?: string;
      execution_time: number;
    }>;
  };
  plagiarism_flagged: boolean;
  gamification?: any;
}


/** Returns true when the error is a TLE response (HTTP 400, status: 'tle'). */
export function isTleError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 400 &&
    (error.details as any)?.status === 'tle'
  );
}

class CodeEditorService {

  async runCode(request: {
    code: string;
    language: string;
    test_cases: any[];
    test_cases_custom?: any[];
    problem_title?: string;
    question_id?: string;
  }): Promise<ExecutionResult> {
    try {
      let timeLimit = 10;
      let memoryLimit = 256;

      if (request.question_id && request.question_id !== 'practice') {
        try {
          const response = await restApiAuthUtil.get(`/course/questions/${request.question_id}/?_t=${Date.now()}`);
          const q = response.data;
          if (q && q.code_executor_config) {
            let config = q.code_executor_config;
            if (typeof config === 'string') {
              try { config = JSON.parse(config); } catch (e) {}
            }
            timeLimit = Number(config.time_limit) || 10;
            memoryLimit = Number(config.memory_limit) || 256;
          }
        } catch (e) {
          console.warn('Could not fetch question config for runCode', e);
        }
      }
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
        timeout: timeLimit + 5, // Hard kill at configured limit + 5s buffer for infinite loops
        time_limit: 60, // Passed generous limit to bypass executor's hard kill
        memory_limit: memoryLimit
      });

      // The code-executer returns TLE as a 200 with { status: 'tle' } in the body.
      // We will handle it with the smart check below to distinguish soft TLE from hard timeout.

      const executionResult = data.execution_result || {};
      const testResults = data.test_results || [];
      const firstTestError = testResults.find((result: any) => result?.error)?.error || '';

      let statusVal: any = executionResult.success ? 'completed' : 'error';
      if (data.status === 'tle') {
          statusVal = 'timeout';
      }
      let reasonVal: string | undefined = undefined;
      const performance_warnings: any[] = [];

      // Evaluate test results
      for (const r of testResults) {
              // Post-execution TLE comparison: if the executor didn't hard-kill the process,
              // we manually compare the actual execution time against the performance time limit.
              if (r.passed && r.execution_time > timeLimit) {
                  r.error = 'Time Limit Exceeded';
                  r.console_output = (r.console_output ? r.console_output + '\n' : '') + `Time Limit Exceeded. Solution took ${r.execution_time?.toFixed(2) || 0}s, which exceeds the limit.`;
              }

              if (r.passed && (r.error === 'Time Limit Exceeded' || r.error === 'Memory Limit Exceeded')) {
                  statusVal = 'failed';
                  performance_warnings.push({
                      type: r.error,
                      execution_time: r.execution_time,
                      memory_usage: r.memory_usage
                  });
              } else if (!r.passed && (r.error === 'Time Limit Exceeded' || r.error === 'Memory Limit Exceeded')) {
                  statusVal = 'failed';
                  reasonVal = r.error === 'Time Limit Exceeded'
                      ? `Time Limit Exceeded. Solution took ${r.execution_time?.toFixed(2) || 0}s, which exceeds the limit.`
                      : `Memory Limit Exceeded. Solution used ${r.memory_usage?.toFixed(2) || 0}MB, which exceeds the limit.`;
                  break;
              }
      }

      return {
        id: 0,
        coding_problem: '',
        problem_title: request.problem_title || 'Quick Run',
        problem_description: '',
        code: request.code,
        language: request.language,
        status: statusVal,
        reason: reasonVal,
        output: executionResult.output || '',
        error_message: executionResult.error || firstTestError || '',
        execution_time: executionResult.execution_time || 0,
        memory_usage: executionResult.memory_usage || 0,
        test_cases_passed: data.total_passed || 0,
        total_test_cases: data.total_tests || 0,
        performance_warnings: performance_warnings,
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
            error_message: result.error || '',
            execution_time: result.execution_time || 0
          })),
          success: executionResult.success || false
        },
        plagiarism_flagged: false,
        performance_warnings: performance_warnings
      } as any;
    } catch (error) {
      // Re-throw TLE as-is so CodeEditor can handle it with the correct UI.
      if (isTleError(error)) throw error;
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
        mock_interview_id: request.mock_interview_id,
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

      // Fallback in-body TLE check for legacy endpoints
      if (response && response.status === 'tle') {
        throw new ApiError('Time Limit Exceeded', 400, { status: 'tle', message: 'Time Limit Exceeded' });
      }

      return {
        id: response.id || 0,
        coding_problem: response.coding_problem || '',
        problem_title: response.problem_title || 'Code Practice',
        problem_description: response.problem_description || '',
        code: response.code || request.code,
        language: response.language || request.language,
        status: response.status || 'completed',
        reason: response.reason || undefined,
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
          success: response.status === 'completed',
        },
        plagiarism_flagged: response.plagiarism_flagged || false,
        performance_warnings: response.performance_warnings || [],
      };
    } catch (error) {
      // Re-throw TLE as-is so CodeEditor can handle it
      if (isTleError(error)) throw error;
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

  /** Fetches the full submission and normalizes the code field for display */
  async getFullSubmission(id: number): Promise<CodeSubmission> {
    const raw: any = await restApiAuthUtil.get(`/course/student-code-practices/${id}/`);
    return {
      ...raw,
      code: raw.code || raw.answer_latest?.code || raw.source_code || '',
      language: raw.language || raw.answer_latest?.language || '',
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

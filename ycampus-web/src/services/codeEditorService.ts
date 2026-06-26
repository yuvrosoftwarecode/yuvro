import restApiAuthUtil from '../utils/RestApiAuthUtil';
import restApiUtilCodeExecuter from '../utils/RestApiUtilCodeExecuter';

export interface CodeSubmission {
  id: number;
  coding_problem: string;
  problem_title: string;
  problem_description: string;
  code: string;
  language: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'timeout' | 'accepted' | 'failed';
  reason?: string;
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
  coding_problem_id: string;
  subject_id?: string;
  unit_id?: string;
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
  performance_warnings?: any[];
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
          const response: any = await restApiAuthUtil.get(`/course/questions/${request.question_id}/?_t=${Date.now()}`);
          const q = response.data || response;
          if (q && q.code_executor_config) {
            timeLimit = q.code_executor_config.time_limit || 10;
            memoryLimit = q.code_executor_config.memory_limit || 256;
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
      console.error('Code execution failed:', error);
      throw new Error(`Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async submitSolution(request: {
    code: string;
    language: string;
    question_id: string;
    subject_id?: string;
    unit_id?: string;
    subunit_id?: string;
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
        subunit_id: request.subunit_id,
        question_id: request.question_id,
        language: request.language,
        code: request.code,
        test_cases_basic: request.test_cases_basic || [],
        test_cases_advanced: request.test_cases_advanced || [],
        test_cases_custom: request.test_cases_custom || [],
        coding_status: {},
        subject_id: request.subject_id, // Updated key
        unit_id: request.unit_id,       // Updated key
        submission_id: request.submission_id,
        contest_id: request.contest_id,
        skill_test_id: request.skill_test_id,
        mock_interview_id: request.mock_interview_id
      };

      switch (submissionType) {
        case 'learn':
          endpoint = '/course/student-subject-progress/submit_coding/'; // Updated endpoint
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
        reason: response.reason || undefined,
        output: response.output || '',
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
        plagiarism_flagged: response.plagiarism_flagged || false,
        performance_warnings: response.performance_warnings || [],
      };
    } catch (error) {
      console.error('Code submission failed:', error);
      throw new Error(`Solution submission failed: ${error instanceof Error ? error.message : 'No response received from submission service'}`);
    }
  }

  async executeCode(request: CodeExecutionRequest & { test_cases: any[] }): Promise<ExecutionResult> {
    return this.submitSolution({
      ...request,
      question_id: request.coding_problem_id
    });
  }

  async getSubmissions(codingProblemId?: string, submissionType: string = 'code_practice'): Promise<CodeSubmission[]> {
    const params = codingProblemId ? { coding_problem_id: codingProblemId } : undefined;

    let endpoint = '';
    switch (submissionType) {
      case 'code_practice':
        endpoint = '/course/student-code-practices/';
        break;
      case 'skill_test':
        endpoint = '/assessment/skill-test/submissions/';
        break;
      case 'contest':
        endpoint = '/assessment/contests/submissions/';
        break;
      case 'mock_interview':
        endpoint = '/assessment/mock-interviews/submissions/';
        break;
    }

    return restApiAuthUtil.get(endpoint, { params });
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
        endpoint = `/assessment/contests/submissions/${id}/`;
        break;
      case 'mock_interview':
        endpoint = `/assessment/mock-interviews/submissions/${id}/`;
        break;
      default:
        endpoint = `/course/student-code-practices/${id}/`;
    }

    return restApiAuthUtil.get(endpoint);
  }

  async getSupportedLanguagesAndTemplates(): Promise<any> {
    return restApiUtilCodeExecuter.get('/supported-languages-and-templates');
  }

  async generateInsights(): Promise<{ insights: any[] }> {
    return restApiAuthUtil.get('/course/student-code-practices/generate_insights/');
  }
}

export default new CodeEditorService();

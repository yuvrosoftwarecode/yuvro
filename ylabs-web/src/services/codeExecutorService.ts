import restApiUtilCodeExecuter from '../utils/RestApiUtilCodeExecuter';
import { ApiError } from '../utils/RestApiUtil';

export interface CodeExecutionRequest {
  code: string;
  language: string;
  test_cases: any[];
  test_cases_custom?: any[];
  timeout?: number;
  time_limit?: number;
  memory_limit?: number;
}

export interface ExecutionResult {
  status: 'completed' | 'error' | 'timeout' | 'failed';
  reason?: string;
  output: string;
  error_message: string;
  execution_time: number;
  memory_usage: number;
  test_cases_passed: number;
  total_test_cases: number;
  test_results: {
    passed: number;
    total: number;
    results: Array<{
      test_case_id: number;
      passed: boolean;
      input: string;
      expected_output: string;
      actual_output: string;
      error: string;
      error_message?: string;
      execution_time: number;
      memory_usage?: number;
      console_output?: string;
    }>;
  };
}

export function isTleError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 400 &&
    (error.details as any)?.status === 'tle'
  );
}

class CodeExecutorService {
  async getSupportedLanguagesAndTemplates(): Promise<any> {
    const data = await restApiUtilCodeExecuter.get<any>('/supported-languages-and-templates');
    return data;
  }

  async executeCode(request: CodeExecutionRequest): Promise<ExecutionResult> {
    const timeLimit = request.time_limit || 10;
    const memoryLimit = request.memory_limit || 256;

    const data: any = await restApiUtilCodeExecuter.post('/execute-with-tests', {
      code: request.code,
      language: request.language,
      test_cases_basic: (request.test_cases || []).map(tc => ({
        input: tc.input || '',
        expected_output: tc.expected_output || '',
        weight: tc.weight || 1
      })),
      test_cases_advanced: [],
      test_cases_custom: (request.test_cases_custom || []).map(tc => ({
        input: tc.input || '',
        expected_output: tc.expected_output || '',
        weight: 1
      })),
      timeout: timeLimit + 5,
      time_limit: 60,
      memory_limit: memoryLimit
    });

    const executionResult = data.execution_result || {};
    const testResults = data.test_results || [];
    const firstTestError = testResults.find((result: any) => result?.error)?.error || '';

    let statusVal: 'completed' | 'error' | 'timeout' | 'failed' = executionResult.success ? 'completed' : 'error';
    if (data.status === 'tle') {
      statusVal = 'timeout';
    }
    
    let reasonVal: string | undefined = undefined;

    for (const r of testResults) {
      if (r.passed && r.execution_time > timeLimit) {
        r.error = 'Time Limit Exceeded';
        r.console_output = (r.console_output ? r.console_output + '\n' : '') + `Time Limit Exceeded. Solution took ${r.execution_time?.toFixed(2) || 0}s, which exceeds the limit.`;
      }

      if (r.passed && (r.error === 'Time Limit Exceeded' || r.error === 'Memory Limit Exceeded')) {
        statusVal = 'failed';
      } else if (!r.passed && (r.error === 'Time Limit Exceeded' || r.error === 'Memory Limit Exceeded')) {
        statusVal = 'failed';
        reasonVal = r.error === 'Time Limit Exceeded'
          ? `Time Limit Exceeded. Solution took ${r.execution_time?.toFixed(2) || 0}s, which exceeds the limit.`
          : `Memory Limit Exceeded. Solution used ${r.memory_usage?.toFixed(2) || 0}MB, which exceeds the limit.`;
        break;
      }
    }

    const actual_passed = testResults.filter((r: any) => 
      r.passed && r.error !== 'Time Limit Exceeded' && r.error !== 'Memory Limit Exceeded'
    ).length;

    return {
      status: statusVal,
      reason: reasonVal,
      output: executionResult.output || '',
      error_message: executionResult.error || firstTestError || '',
      execution_time: executionResult.execution_time || 0,
      memory_usage: executionResult.memory_usage || 0,
      test_cases_passed: actual_passed,
      total_test_cases: data.total_tests || 0,
      test_results: {
        passed: actual_passed,
        total: data.total_tests || 0,
        results: testResults.map((result: any, index: number) => ({
          test_case_id: index,
          passed: result.passed || false,
          input: result.input || '',
          expected_output: result.expected_output || '',
          actual_output: result.actual_output || '',
          error: result.error || '',
          error_message: result.error || '',
          execution_time: result.execution_time || 0,
          memory_usage: result.memory_usage || 0,
          console_output: result.console_output || ''
        }))
      }
    };
  }
}

export const codeExecutorService = new CodeExecutorService();
export default codeExecutorService;

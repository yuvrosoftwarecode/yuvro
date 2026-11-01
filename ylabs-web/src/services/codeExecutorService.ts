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
      is_hidden?: boolean;
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

/**
 * Safely extract string `input` and `expected_output` from a LabQuestionBankTask object.
 *
 * Why this is needed:
 * - `LabQuestionBankTask.expected_output` is a Django JSONField that defaults to `{}`.
 * - In JS, `{} || ''` returns `{}` (truthy), so the old `tc.expected_output || ''`
 *   would pass an object to FastAPI which expects a string → 422 Unprocessable Entity.
 * - For DSA scenario labs the test case input and expected output are stored either as
 *   explicit `tc.input` / `tc.expected_output` string fields, OR embedded inside
 *   `tc.description` in the format:
 *     "...Input:\n<input lines>\nExpected Output: <value>"
 *
 * Resolution priority:
 *   1. Direct string field (tc.input / tc.expected_output)
 *   2. Parse from tc.description (Input / Expected Output sections)
 *   3. Fall back to empty string (never pass an object)
 */
function parseTestCaseInputOutput(tc: any): { input: string; expected_output: string } {
  // --- input ---
  let input = '';
  if (typeof tc.input === 'string') {
    input = tc.input;
  }
  // Also check scoring_rules.input (stored by load_skill_evaluations.py for DSA labs)
  if (!input && typeof tc.scoring_rules?.input === 'string') {
    input = tc.scoring_rules.input;
  }

  // --- expected_output ---
  let expected_output = '';
  if (typeof tc.expected_output === 'string') {
    expected_output = tc.expected_output;
  }
  // expected_output JSONField stored as {"value": "..."} by the updated seeder
  if (!expected_output && typeof tc.expected_output?.value === 'string') {
    expected_output = tc.expected_output.value;
  }
  // Also check scoring_rules.expected_output (additional storage path)
  if (!expected_output && typeof tc.scoring_rules?.expected_output === 'string') {
    expected_output = tc.scoring_rules.expected_output;
  }
  // Objects (e.g. Django JSONField default {}) are intentionally ignored
  // to prevent 422 validation errors in FastAPI (which expects a string)

  // Final fallback: try to parse both from description if either is still missing
  if ((!input || !expected_output) && typeof tc.description === 'string') {
    const desc: string = tc.description;

    // Extract input block: everything between "Input:" and "Expected Output:"
    if (!input) {
      const inputMatch = desc.match(/Input:\s*\n([\s\S]*?)(?:\nExpected Output:|$)/i);
      if (inputMatch) {
        input = inputMatch[1].trim();
      }
    }

    // Extract expected output: value(s) after "Expected Output:"
    if (!expected_output) {
      const outputMatch = desc.match(/Expected Output:\s*([^\n]+(?:\n(?!\s*\n)(?!Input:)[^\n]+)*)/i);
      if (outputMatch) {
        expected_output = outputMatch[1].trim();
      }
    }
  }

  return { input, expected_output };
}

export function isTaskHidden(task: any): boolean {
  if (!task) return false;
  if (task.is_hidden === true || task.hidden === true) return true;
  const title = (typeof task === 'string' ? task : (task.title || '')).toLowerCase();
  const desc = (typeof task === 'object' && typeof task.description === 'string' ? task.description : '').toLowerCase();
  return title.includes('hidden') || title.includes('advanced') || desc.includes('hidden test case');
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
      test_cases_basic: (request.test_cases || []).map(tc => {
        const { input, expected_output } = parseTestCaseInputOutput(tc);
        return {
          input,
          expected_output,
          weight: (typeof tc.weight === 'number') ? tc.weight : 1,
          is_hidden: isTaskHidden(tc)
        };
      }),
      test_cases_advanced: [],
      test_cases_custom: (request.test_cases_custom || []).map(tc => {
        const { input, expected_output } = parseTestCaseInputOutput(tc);
        return { input, expected_output, weight: 1, is_hidden: false };
      }),
      timeout: timeLimit + 5,
      time_limit: 60,
      memory_limit: memoryLimit
    });

    const executionResult = data.execution_result || {};
    const rawTestResults = data.test_results || [];
    const testResults = rawTestResults.map((r: any, idx: number) => {
      const origTc = request.test_cases?.[idx];
      const isHidden = Boolean(r.is_hidden || isTaskHidden(origTc));
      return {
        ...r,
        is_hidden: isHidden
      };
    });
    const firstTestError = testResults.find((result: any) => result?.error)?.error || '';

    let statusVal: 'completed' | 'error' | 'timeout' | 'failed' = 'completed';
    if (data.status === 'tle') {
      statusVal = 'timeout';
    } else if (executionResult.status === 'compilation_error' || executionResult.status === 'security_error') {
      statusVal = 'error';
    } else if (!testResults || testResults.length === 0) {
      statusVal = executionResult.success ? 'completed' : 'error';
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
          console_output: result.console_output || '',
          is_hidden: Boolean(result.is_hidden)
        }))
      }
    };
  }
}

export const codeExecutorService = new CodeExecutorService();
export default codeExecutorService;

// ── External DB query / schema via code executor ─────────────────────────────
// These replace the mongoProxy / mysqlProxy / postgresProxy createServerFn
// calls, routing all external DB connections through the code executor service
// instead of bundling native DB drivers (pg, mysql2, mongodb) into the frontend.

export interface DbQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  note: string;
  ms: number;
  error?: string;
}

export interface DbSchemaTable {
  table: string;
  columns: { name: string; type: string }[];
}

// Dummy IDs used when executing ad-hoc queries outside a lab context.
const ADHOC_USER_ID = "adhoc";
const ADHOC_LAB_ID = "adhoc";
const ADHOC_SPRINT_ID = "adhoc";

export interface DbIsolationContext {
  userId?: string;
  labId?: string;
  sprintId?: string;
  evaluationId?: string;
}

/**
 * Execute a SQL/Mongo query against an external connection via the code executor.
 * Replaces executeRemoteMysqlQuery / executeRemotePostgresQuery / executeRemoteMongoQuery.
 */
export async function executeExternalDbQuery(
  engine: "mysql" | "postgresql" | "mongodb",
  connectionUrl: string,
  query: string,
  context?: DbIsolationContext,
): Promise<DbQueryResult> {
  if (!query?.trim()) {
    return { columns: [], rows: [], note: "No query provided.", ms: 0 };
  }
  if (!connectionUrl?.trim()) {
    return { columns: [], rows: [], note: "", ms: 0, error: `${engine} connection URL is required.` };
  }

  const start = Date.now();
  try {
    const raw: any = await restApiUtilCodeExecuter.post("/workspace/database_run", {
      user_id: context?.userId || ADHOC_USER_ID,
      lab_id: context?.labId || ADHOC_LAB_ID,
      sprint_id: context?.sprintId || ADHOC_SPRINT_ID,
      evaluation_id: context?.evaluationId || undefined,
      database_engine: engine,
      connection_url: connectionUrl.trim(),
      query: query.trim(),
      db_file: "",
    });

    const ms = Date.now() - start;

    if (raw?.stderr && !raw?.stdout) {
      return { columns: [], rows: [], note: "", ms, error: raw.stderr };
    }

    // The executor returns stdout as a JSON string for DB queries
    let parsed: any = null;
    try {
      parsed = typeof raw?.data === "object" ? raw.data : JSON.parse(raw?.stdout || "null");
    } catch {
      return { columns: [], rows: [], note: raw?.stdout || "", ms };
    }

    if (!parsed) {
      return { columns: [], rows: [], note: raw?.stdout || "Query executed.", ms };
    }

    const columns: string[] = parsed.columns ?? (parsed.rows?.[0] ? Object.keys(parsed.rows[0]) : []);
    const rows: Record<string, unknown>[] = parsed.rows ?? (Array.isArray(parsed) ? parsed : []);
    return { columns, rows, note: `${rows.length} row(s) — ${ms}ms`, ms };
  } catch (e: any) {
    return { columns: [], rows: [], note: "", ms: Date.now() - start, error: e?.message || "Query failed" };
  }
}

/**
 * Fetch table/collection schema for an external DB via the code executor.
 * Replaces fetchRemoteMysqlSchema / fetchRemotePostgresSchema / fetchRemoteMongoSchema.
 */
export async function fetchExternalDbSchema(
  engine: "mysql" | "postgresql" | "mongodb",
  connectionUrl: string,
  context?: DbIsolationContext,
): Promise<DbSchemaTable[]> {
  if (!connectionUrl?.trim()) return [];

  const schemaQuery =
    engine === "mysql"
      ? "SELECT TABLE_NAME as `table`, COLUMN_NAME as `column`, DATA_TYPE as `type` FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION"
      : engine === "postgresql"
        ? "SELECT table_name as table, column_name as column, data_type as type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position"
        : "show collections"; // MongoDB

  try {
    const result = await executeExternalDbQuery(engine, connectionUrl, schemaQuery, context);
    if (result.error || !result.rows.length) return [];

    if (engine === "mongodb") {
      // rows are collection names
      return result.rows.map((r: any) => ({
        table: String(r.name ?? r),
        columns: [],
      }));
    }

    // Group columns by table
    const map = new Map<string, { name: string; type: string }[]>();
    for (const row of result.rows) {
      const tbl = String(row.table ?? row.TABLE_NAME ?? row.table_name ?? "");
      const col = String(row.column ?? row.COLUMN_NAME ?? row.column_name ?? "");
      const typ = String(row.type ?? row.DATA_TYPE ?? row.data_type ?? "");
      if (!tbl) continue;
      if (!map.has(tbl)) map.set(tbl, []);
      map.get(tbl)!.push({ name: col, type: typ });
    }
    return Array.from(map.entries()).map(([table, columns]) => ({ table, columns }));
  } catch {
    return [];
  }
}

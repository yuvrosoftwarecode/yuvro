/**
 * workspaceService.ts
 * Calls the yuvro-code-executer Workspace & Terminal APIs.
 */

const EXECUTOR_BASE = (
  import.meta.env.VITE_CODE_EXECUTOR_BASE_URL || "http://localhost:8009"
).replace(/\/$/, "");

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export interface FileTreeResponse {
  tree: FileTreeNode;
  seeded: boolean;
  workspace: string;
}

/** Returns the file tree for a student's workspace, seeding starter files on first access. */
export async function fetchFileTree(
  userId: string,
  labId: string,
  sprintId: string,
  starters?: Record<string, string>,
  labType?: string,
  evaluationId?: string
): Promise<FileTreeResponse> {
  const params = new URLSearchParams({ user_id: userId, lab_id: labId, sprint_id: sprintId });
  if (starters && Object.keys(starters).length > 0) params.set("starters", JSON.stringify(starters));
  if (labType) params.set("lab_type", labType);
  if (evaluationId) params.set("evaluation_id", evaluationId);
  const res = await fetch(`${EXECUTOR_BASE}/workspace/filetree?${params}`);
  if (!res.ok) throw new Error(`File tree fetch failed: ${res.statusText}`);
  return res.json();
}

/** Fetches the text content of a file in the workspace. */
export async function fetchFile(
  userId: string,
  labId: string,
  sprintId: string,
  path: string,
  evaluationId?: string
): Promise<string> {
  const params = new URLSearchParams({ user_id: userId, lab_id: labId, sprint_id: sprintId, path });
  if (evaluationId) params.set("evaluation_id", evaluationId);
  const res = await fetch(`${EXECUTOR_BASE}/workspace/file?${params}`);
  if (!res.ok) throw new Error(`File fetch failed (${path}): ${res.statusText}`);
  const data = await res.json();
  return data.content as string;
}

/** Writes (creates or overwrites) a file in the workspace. */
export async function writeFile(
  userId: string,
  labId: string,
  sprintId: string,
  path: string,
  content: string,
  evaluationId?: string
): Promise<void> {
  const res = await fetch(`${EXECUTOR_BASE}/workspace/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, lab_id: labId, sprint_id: sprintId, path, content, evaluation_id: evaluationId }),
  });
  if (!res.ok) throw new Error(`File write failed (${path}): ${res.statusText}`);
}

/** Deletes a file or directory from the workspace. */
export async function deleteWorkspaceFile(
  userId: string,
  labId: string,
  sprintId: string,
  path: string,
  evaluationId?: string
): Promise<void> {
  const res = await fetch(`${EXECUTOR_BASE}/workspace/file`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, lab_id: labId, sprint_id: sprintId, path, evaluation_id: evaluationId }),
  });
  if (!res.ok) throw new Error(`File delete failed (${path}): ${res.statusText}`);
}

/** Returns the WebSocket URL for the terminal. */
export function getTerminalWsUrl(userId: string, labId: string, sprintId: string, labType?: string, evaluationId?: string): string {
  const wsBase = EXECUTOR_BASE.replace(/^http/, "ws");
  const params = new URLSearchParams({ user_id: userId, lab_id: labId, sprint_id: sprintId });
  if (labType) params.set("lab_type", labType);
  if (evaluationId) params.set("evaluation_id", evaluationId);
  return `${wsBase}/workspace/terminal?${params}`;
}

export async function evaluateTask(
  userId: string,
  labId: string,
  sprintId: string,
  requiredCommand: string,
  taskSlug?: string,
  scoringRules?: Record<string, any>,
  evaluationId?: string
): Promise<{ passed: boolean; reason: string }> {
  const res = await fetch(`${EXECUTOR_BASE}/workspace/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      lab_id: labId,
      sprint_id: sprintId,
      required_command: requiredCommand,
      task_slug: taskSlug,
      scoring_rules: scoringRules ?? {},
      evaluation_id: evaluationId
    }),
  });
  if (!res.ok) throw new Error(`Evaluation failed: ${res.statusText}`);
  return res.json();
}

/** Executes a raw command inside the workspace */
export async function runCommand(
  userId: string,
  labId: string,
  sprintId: string,
  command: string,
  evaluationId?: string
): Promise<{ stdout: string; stderr: string; exit_code: number }> {
  const res = await fetch(`${EXECUTOR_BASE}/workspace/run_command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      lab_id: labId,
      sprint_id: sprintId,
      command: command,
      evaluation_id: evaluationId
    }),
  });
  if (!res.ok) throw new Error(`Run command failed: ${res.statusText}`);
  return res.json();
}

/** Executes a database query inside the workspace */
export async function runDatabaseQuery(
  userId: string,
  labId: string,
  sprintId: string,
  query: string,
  dbFile: string = "lab.db",
  databaseEngine: string = "sqlite",
  expectedQuery?: string,
  expectedOutput?: string,
  scoringRules?: any,
  systemQuery?: string,
  expectedResult?: string,
  evaluationId?: string,
  taskFile?: string,
  taskId?: string,
  connectionUrl?: string
): Promise<{ stdout: string; stderr: string; exit_code: number; evaluation?: any }> {
  const res = await fetch(`${EXECUTOR_BASE}/workspace/database_run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      lab_id: labId,
      sprint_id: sprintId,
      query: query,
      database_engine: databaseEngine,
      db_file: dbFile,
      expected_query: expectedQuery,
      expected_output: expectedOutput,
      scoring_rules: scoringRules,
      system_query: systemQuery,
      expected_result: expectedResult,
      evaluation_id: evaluationId,
      task_file: taskFile,
      task_id: taskId,
      connection_url: connectionUrl
    }),
  });
  if (!res.ok) throw new Error(`Run Database query failed: ${res.statusText}`);
  return res.json();
}

/** Submits all database tasks for evaluation in the workspace */
export async function submitDatabaseLab(
  userId: string,
  labId: string,
  sprintId: string,
  tasks: Array<{
    task_id: string;
    task_file: string;
    expected_query?: string;
    expected_output?: string;
    scoring_rules?: any;
    system_query?: string;
    expected_result?: string;
  }>,
  databaseEngine: string = "sqlite",
  dbFile: string = "lab.db",
  evaluationId?: string,
  connectionUrl?: string
): Promise<{
  lab_score: number;
  max_score: number;
  percentage: number;
  tasks: any[];
}> {
  const res = await fetch(`${EXECUTOR_BASE}/workspace/database_submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      lab_id: labId,
      sprint_id: sprintId,
      tasks: tasks,
      database_engine: databaseEngine,
      db_file: dbFile,
      evaluation_id: evaluationId,
      connection_url: connectionUrl
    }),
  });
  if (!res.ok) throw new Error(`Submit Database lab failed: ${res.statusText}`);
  return res.json();
}

/** Executes a scoring test command (e.g. 'python yuvro_scoring_rules/main_test.py') */
export async function runTestCommand(
  userId: string,
  labId: string,
  sprintId: string,
  command: string,
  evaluationId?: string
): Promise<{
  stdout: string;
  stderr: string;
  exit_code: number;
  data?: {
    tasks?: Record<string, { result: string; score: number; message: string }>;
    total_score?: number;
    max_possible_score?: number;
  };
  total_score: number;
  max_possible_score: number;
  percentage: number;
}> {
  const res = await fetch(`${EXECUTOR_BASE}/workspace/run_test_command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      lab_id: labId,
      sprint_id: sprintId,
      command: command,
      evaluation_id: evaluationId,
    }),
  });
  if (!res.ok) throw new Error(`Run test command failed: ${res.statusText}`);
  return res.json();
}


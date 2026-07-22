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
): Promise<FileTreeResponse> {
  const params = new URLSearchParams({ user_id: userId, lab_id: labId, sprint_id: sprintId });
  if (starters) params.set("starters", JSON.stringify(starters));
  if (labType) params.set("lab_type", labType);
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
): Promise<string> {
  const params = new URLSearchParams({ user_id: userId, lab_id: labId, sprint_id: sprintId, path });
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
): Promise<void> {
  const res = await fetch(`${EXECUTOR_BASE}/workspace/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, lab_id: labId, sprint_id: sprintId, path, content }),
  });
  if (!res.ok) throw new Error(`File write failed (${path}): ${res.statusText}`);
}

/** Deletes a file or directory from the workspace. */
export async function deleteWorkspaceFile(
  userId: string,
  labId: string,
  sprintId: string,
  path: string,
): Promise<void> {
  const res = await fetch(`${EXECUTOR_BASE}/workspace/file`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, lab_id: labId, sprint_id: sprintId, path }),
  });
  if (!res.ok) throw new Error(`File delete failed (${path}): ${res.statusText}`);
}

/** Returns the WebSocket URL for the terminal. */
export function getTerminalWsUrl(
  userId: string,
  labId: string,
  sprintId: string,
  labType?: string,
): string {
  const wsBase = EXECUTOR_BASE.replace(/^http/, "ws");
  const params = new URLSearchParams({ user_id: userId, lab_id: labId, sprint_id: sprintId });
  if (labType) params.set("lab_type", labType);
  return `${wsBase}/workspace/terminal?${params}`;
}

export async function evaluateTask(
  userId: string,
  labId: string,
  sprintId: string,
  requiredCommand: string,
  taskSlug?: string,
  scoringRules?: Record<string, any>,
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
): Promise<{ stdout: string; stderr: string; exit_code: number }> {
  const res = await fetch(`${EXECUTOR_BASE}/workspace/run_command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      lab_id: labId,
      sprint_id: sprintId,
      command: command,
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
    }),
  });
  if (!res.ok) throw new Error(`Run Database query failed: ${res.statusText}`);
  return res.json();
}

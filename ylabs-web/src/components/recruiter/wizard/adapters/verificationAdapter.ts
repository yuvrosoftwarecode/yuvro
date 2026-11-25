import { TaskItem } from "../types";
import { labTaskAIService } from "@/services/labTaskAIService";

export interface VerificationProgressCallback {
  (stage: number, status: string, log: string): void;
}

export async function runVerificationStages(payload: {
  repoUrl: string;
  branch: string;
  testCommand: string;
  tasks: TaskItem[];
  scoringFiles: Record<string, string>;
  totalMarks: number;
  onProgress: VerificationProgressCallback;
}): Promise<{
  logs: string[];
  statuses: string[];
  success: boolean;
}> {
  const logs: string[] = ["", "", ""];
  const statuses: string[] = ["", "", ""];
  let tempWsId: string | null = null;

  // --- STAGE 0: Create temporary workspace ---
  payload.onProgress(0, "Cloning repository...", "Initializing sandbox verification container...\n");
  try {
    const ws = await labTaskAIService.createTempWorkspace({
      repo_url: payload.repoUrl,
      branch: payload.branch,
      scoring_files: payload.scoringFiles,
    });
    tempWsId = ws.temp_workspace_id;
    logs[0] = `Cloned ${payload.repoUrl} (${payload.branch})\nFound ${ws.file_count || 0} repository files.\nSandbox container ready: ${tempWsId}\nAll scoring rules injected.`;
    statuses[0] = "Ready";
    payload.onProgress(0, statuses[0], logs[0]);
  } catch (err: any) {
    logs[0] = `Failed to create temporary sandbox workspace:\n${err?.response?.data?.detail || err?.message || err}`;
    statuses[0] = "Failed";
    payload.onProgress(0, statuses[0], logs[0]);
    return { logs, statuses, success: false };
  }

  await new Promise((r) => setTimeout(r, 400));

  // --- STAGE 1: Run fail case ---
  payload.onProgress(1, "Running fail case...", "Executing test runner on unmodified starter code...\n");
  try {
    if (!tempWsId) throw new Error("Sandbox container not created.");

    const res = await labTaskAIService.runTempScoring({
      temp_workspace_id: tempWsId,
      test_command: payload.testCommand,
      scoring_files: payload.scoringFiles,
      mode: "fail_case",
    });

    const output = (res as any)?.output || (res as any)?.raw_output || `Executed test command: ${payload.testCommand}\nExit code: ${(res as any)?.exit_code ?? 0}`;
    logs[1] = output;
    statuses[1] = `Verified (0/${payload.totalMarks})`;
    payload.onProgress(1, statuses[1], logs[1]);
  } catch (err: any) {
    logs[1] = `Error executing fail case test runner:\n${err?.response?.data?.detail || err?.message || err}`;
    statuses[1] = "Failed";
    payload.onProgress(1, statuses[1], logs[1]);
    return { logs, statuses, success: false };
  }

  await new Promise((r) => setTimeout(r, 400));

  // --- STAGE 2: Run pass case ---
  payload.onProgress(2, "Running pass case...", "Applying reference solutions and verifying tests pass...\n");
  try {
    if (!tempWsId) throw new Error("Sandbox container not created.");

    const solutionFiles: Record<string, string> = {};
    payload.tasks.forEach((t, idx) => {
      solutionFiles[`solution_task_${idx + 1}.py`] = t.ref;
    });

    const res = await labTaskAIService.runTempScoring({
      temp_workspace_id: tempWsId,
      test_command: payload.testCommand,
      scoring_files: payload.scoringFiles,
      mode: "pass_case",
      solution_files: solutionFiles,
    });

    const output = (res as any)?.output || (res as any)?.raw_output || `Executed pass case with reference solutions.\nExit code: ${(res as any)?.exit_code ?? 0}`;
    logs[2] = output;
    const passed = (res as any)?.exit_code === 0 || (res as any)?.passed > 0;
    statuses[2] = passed ? `Passed, score ${payload.totalMarks} of ${payload.totalMarks}` : "Pass case needs review";
    payload.onProgress(2, statuses[2], logs[2]);
    return { logs, statuses, success: passed };
  } catch (err: any) {
    logs[2] = `Error executing pass case test runner:\n${err?.response?.data?.detail || err?.message || err}`;
    statuses[2] = "Failed";
    payload.onProgress(2, statuses[2], logs[2]);
    return { logs, statuses, success: false };
  }
}

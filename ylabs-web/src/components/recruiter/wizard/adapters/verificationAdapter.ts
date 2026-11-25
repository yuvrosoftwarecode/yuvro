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
  solutionFiles?: Record<string, string>;
  labContext?: any;
  repoFiles?: Record<string, string>;
}): Promise<{
  logs: string[];
  statuses: string[];
  success: boolean;
  solutionFiles?: Record<string, string>;
  rawResults?: {
    failCase?: any;
    passCase?: any;
  };
}> {
  // Two visible stages: [0] Fail case (Starter), [1] Pass case (Solution)
  const logs: string[] = ["", ""];
  const statuses: string[] = ["", ""];
  let wsId: string | null = null;
  let activeSolutionFiles = payload.solutionFiles ? { ...payload.solutionFiles } : {};
  let failResult: any = null;
  let passResult: any = null;

  // --- STAGE 0: Setup Evaluation Workspace & Run Fail Case ---
  payload.onProgress(0, "Cloning evaluation workspace...", "Cloning starter repository and initializing evaluation workspace...\n");
  try {
    const ws = await labTaskAIService.createTempWorkspace({
      repo_url: payload.repoUrl,
      branch: payload.branch,
      scoring_files: payload.scoringFiles,
    });
    wsId = ws.temp_workspace_id;
  } catch (err: any) {
    logs[0] = `Failed to clone evaluation workspace:\n${err?.response?.data?.detail || err?.message || err}`;
    statuses[0] = "Failed";
    payload.onProgress(0, statuses[0], logs[0]);
    return { logs, statuses, success: false };
  }

  payload.onProgress(0, "Running fail case...", "Executing test runner on unmodified starter code...\n");
  try {
    if (!wsId) throw new Error("Evaluation workspace container not initialized.");

    const res = await labTaskAIService.runTempScoring({
      temp_workspace_id: wsId,
      test_command: payload.testCommand,
      scoring_files: payload.scoringFiles,
      mode: "fail_case",
    });
    failResult = res;

    const output =
      (res as any)?.stdout ||
      (res as any)?.output ||
      (res as any)?.raw_output ||
      `Executed test command: ${payload.testCommand}\nExit code: ${(res as any)?.exit_code ?? 0}`;
    logs[0] = output;
    const failScore = (res as any)?.total_score ?? 0;
    statuses[0] = `Verified (${failScore}/${payload.totalMarks})`;
    payload.onProgress(0, statuses[0], logs[0]);
  } catch (err: any) {
    logs[0] = `Error executing fail case test runner:\n${err?.response?.data?.detail || err?.message || err}`;
    statuses[0] = "Failed";
    payload.onProgress(0, statuses[0], logs[0]);
    return { logs, statuses, success: false, rawResults: { failCase: failResult } };
  }

  await new Promise((r) => setTimeout(r, 400));

  // --- STAGE 1: Run Pass Case (Solution) ---
  payload.onProgress(1, "Running pass case...", "Applying reference solutions and verifying tests pass...\n");
  try {
    if (!wsId) throw new Error("Evaluation workspace container not initialized.");

    // If solution files are empty, attempt to generate them or assemble from task diffs
    if (Object.keys(activeSolutionFiles).length === 0) {
      if (payload.labContext) {
        try {
          payload.onProgress(1, "Synthesizing pass solution...", "Generating full solution patch files for starter codebase...\n");
          const gen = await labTaskAIService.generatePassSolution({
            lab_context: payload.labContext,
            tasks: payload.tasks.map((t) => ({
              title: t.title,
              description: t.desc,
              solution: t.ref,
              marks: t.marks,
              difficulty: t.diff,
            })),
            scoring_files: payload.scoringFiles,
            repo_files: payload.repoFiles || {},
            provider: "deepseek",
          });
          if (gen?.solution_files && Object.keys(gen.solution_files).length > 0) {
            activeSolutionFiles = gen.solution_files;
          }
        } catch (genErr) {
          console.warn("AI pass solution synthesis failed, falling back to task diffs:", genErr);
        }
      }

      // If still empty or as supplementary patches, include task diffs
      if (Object.keys(activeSolutionFiles).length === 0) {
        payload.tasks.forEach((t, idx) => {
          if (t.ref && t.ref.trim()) {
            activeSolutionFiles[`task_${idx + 1}.patch`] = t.ref;
          }
        });
      }
    }

    const res = await labTaskAIService.runTempScoring({
      temp_workspace_id: wsId,
      test_command: payload.testCommand,
      scoring_files: payload.scoringFiles,
      mode: "pass_case",
      solution_files: activeSolutionFiles,
    });
    passResult = res;

    const output =
      (res as any)?.stdout ||
      (res as any)?.output ||
      (res as any)?.raw_output ||
      `Executed pass case with reference solutions.\nExit code: ${(res as any)?.exit_code ?? 0}`;
    logs[1] = output;
    const passScore = (res as any)?.total_score ?? ((res as any)?.exit_code === 0 ? payload.totalMarks : 0);
    const passed = (res as any)?.verified || (res as any)?.exit_code === 0 || passScore >= payload.totalMarks;
    statuses[1] = passed ? `Passed, score ${passScore} of ${payload.totalMarks}` : `Pass case: score ${passScore} of ${payload.totalMarks}`;
    payload.onProgress(1, statuses[1], logs[1]);
    return {
      logs,
      statuses,
      success: passed,
      solutionFiles: activeSolutionFiles,
      rawResults: { failCase: failResult, passCase: passResult },
    };
  } catch (err: any) {
    logs[1] = `Error executing pass case test runner:\n${err?.response?.data?.detail || err?.message || err}`;
    statuses[1] = "Failed";
    payload.onProgress(1, statuses[1], logs[1]);
    return {
      logs,
      statuses,
      success: false,
      solutionFiles: activeSolutionFiles,
      rawResults: { failCase: failResult, passCase: passResult },
    };
  }
}

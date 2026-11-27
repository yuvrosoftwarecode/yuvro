import { TaskItem, ScoringFileRule } from "../types";
import { labTaskAIService, ScoringRulesResponse } from "@/services/labTaskAIService";

export async function generateCommandsWithAI(
  labContext: any,
  tasks: TaskItem[]
): Promise<{ startup: string; test: string }> {
  const res = await labTaskAIService.generateLifecycleCommands(labContext, tasks);
  const langList = labContext?.stack?.languages || [];
  const isPy =
    langList.some((l: string) => l.toLowerCase().includes("python")) ||
    !langList.some((l: string) => l.toLowerCase().includes("javascript") || l.toLowerCase().includes("typescript"));
  const defaultTest = isPy ? "python yuvro_scoring_rules/main_test.py" : "node yuvro_scoring_rules/main_test.js";
  const testCmd = (res?.test_command && res.test_command.includes("yuvro_scoring_rules"))
    ? res.test_command
    : defaultTest;

  return {
    startup: res?.startup_command || "",
    test: testCmd,
  };
}

export async function generateRulesWithAI(
  labContext: any,
  tasks: TaskItem[],
  repoFiles?: Record<string, string>
): Promise<{
  files: Record<string, string>;
  fileRules: ScoringFileRule[];
  timestamp: string;
  test_command?: string;
}> {
  const res: ScoringRulesResponse = await labTaskAIService.generateScoringRules(
    labContext,
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.desc,
      marks: t.marks,
      duration_minutes: t.min,
      difficulty: t.diff.toUpperCase(),
      solution: t.ref,
    })),
    repoFiles
  );

  if (res && res.files && Object.keys(res.files).length > 0) {
    const fileRules: ScoringFileRule[] = Object.keys(res.files).map((f) => {
      const isMain = f.includes("main_test");
      const base = f.split("/").pop() || f;
      return {
        name: f,
        title: isMain ? "Main test runner" : `Grading checks for ${base}`,
        desc: isMain
          ? "Executes all sub-task tests and aggregates scores into JSON output."
          : `Verifies assertions and scoring rules for ${base}.`,
        checks: [
          "Imports and instantiates module under test",
          "Validates return values and data structures",
          "Asserts error handling and edge cases",
        ],
      };
    });

    const langList = labContext?.stack?.languages || [];
    const isPy =
      langList.some((l: string) => l.toLowerCase().includes("python")) ||
      !langList.some((l: string) => l.toLowerCase().includes("javascript") || l.toLowerCase().includes("typescript"));
    const defaultTest = isPy ? "python yuvro_scoring_rules/main_test.py" : "node yuvro_scoring_rules/main_test.js";
    const testCmd = (res.test_command && res.test_command.includes("yuvro_scoring_rules"))
      ? res.test_command
      : defaultTest;

    return {
      files: res.files,
      fileRules,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      test_command: testCmd,
    };
  }

  throw new Error("No scoring rules were returned by the AI service.");
}

export async function pushRulesToRepo(payload: {
  repoIdentifier: string;
  branch: string;
  files: Record<string, string>;
  installationId?: string | null;
}): Promise<{ success: boolean; commit_sha?: string }> {
  const res = await labTaskAIService.pushScoringRules({
    repo_identifier: payload.repoIdentifier,
    branch: payload.branch,
    files: payload.files,
    installation_id: payload.installationId || undefined,
    commit_message: "feat(eval): add yuvro scoring rules for automated grading",
  });
  return { success: true, commit_sha: res?.commit_sha };
}

import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";

const EXECUTOR_BASE = (
  import.meta.env.VITE_CODE_EXECUTOR_BASE_URL || "http://localhost:8009"
).replace(/\/$/, "");

export interface LabContext {
  title?: string;
  description?: string;
  tech_stack?: string[];
  programming_languages?: string[];
  backend_frameworks?: string[];
  frontend_frameworks?: string[];
  databases?: string[];
  repo_name?: string;
  repo_description?: string;
  repo_readme?: string;
  repo_tree?: string[];
  repo_files?: Record<string, string>;
  git_repo_starter_url?: string;
  git_repo_starter_branch?: string;
  startup_command?: string;
  test_command?: string;
  difficulty?: string;
  domain?: string;
  type?: string;
  scenario?: string;
  marks?: number;
  duration_minutes?: number;
}

export interface SuggestedTask {
  title: string;
  description: string;
  marks: number;
  estimated_minutes?: number;
  duration_minutes?: number;
  difficulty?: string;
  evaluation_guidelines?: string;
  solution?: string;
  solution_code?: string;
}

export interface StandardizedTask {
  title: string;
  description: string;
  marks: number;
  estimated_minutes?: number;
  duration_minutes?: number;
  difficulty?: string;
  evaluation_guidelines?: string;
  solution?: string;
  solution_code?: string;
  changes_made?: string;
}

export interface BulkTasksResponse {
  tasks: Array<{
    title: string;
    description: string;
    marks: number;
    estimated_minutes?: number;
    duration_minutes?: number;
    difficulty?: string;
    evaluation_guidelines?: string;
    solution?: string;
    solution_code?: string;
  }>;
  total_marks: number;
  total_estimated_minutes: number;
  architectural_rationale?: string;
}

export interface DurationEstimate {
  estimated_minutes?: number;
  recommended_duration_minutes?: number;
  complexity?: string;
  breakdown?: Record<string, number>;
  reasoning?: string;
  rationale?: string;
}

export interface ScoringRulesResponse {
  language: string;
  test_command?: string;
  runner_command?: string;
  files: Record<string, string>;
  execution_notes?: string;
  diagnosis?: string;
  provider?: string;
}

export interface PushScoringRulesPayload {
  repo_identifier: string;
  branch?: string;
  files: Record<string, string>;
  commit_message?: string;
  installation_id?: string | number | null;
}

export interface PushScoringRulesResponse {
  success: boolean;
  commit_sha: string;
  commit_url: string;
  branch: string;
  files_committed?: string[];
  files_pushed?: string[];
}

export interface LifecycleCommandsResponse {
  startup_command: string;
  test_command: string;
  rationale?: string;
  provider?: string;
}

export interface InspectRepoResponse {
  owner: string;
  repo: string;
  full_name: string;
  description: string;
  default_branch: string;
  language: string;
  private: boolean;
  files: string[];
  file_count: number;
  key_files: Record<string, string>;
  readme: string;
  clone_token?: string;
}

export interface TaskChatNextAction {
  label: string;
  prompt?: string;
  action?: "next_step";
}

export interface TaskChatProposedAction {
  type: "replace_tasks" | "append_task" | "update_task" | "none";
  label?: string;
  task_index?: number | null;
  tasks: Array<{
    title: string;
    description: string;
    solution?: string;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    marks?: number;
    duration_minutes?: number;
  }>;
}

export interface TaskChatResponse {
  reply: string;
  proposed_action: TaskChatProposedAction;
  next_actions: TaskChatNextAction[];
  provider?: string;
}

export interface PassSolutionResponse {
  summary: string;
  solution_files: Record<string, string>;
  provider?: string;
}

export interface StarterCodebaseResponse {
  summary?: string;
  startup_command?: string;
  test_command?: string;
  files: Record<string, string>;
  provider?: string;
}

export interface TempWorkspaceCreateResponse {
  temp_workspace_id: string;
  branch: string;
  file_count: number;
  files: string[];
  key_files: Record<string, string>;
  clone_log: string;
  setup_log: string;
}

export interface TempScoringRunResponse {
  mode: "fail_case" | "pass_case";
  verified: boolean;
  valid_json: boolean;
  exit_code: number;
  duration_ms: number;
  stdout: string;
  stderr: string;
  data: {
    tasks: Record<string, { result: string; score: number; message?: string }>;
    total_score: number;
    max_possible_score: number;
  } | null;
  total_score: number;
  max_possible_score: number;
  percentage: number;
  applied_files: string[];
  verdict_reason: string;
}

export const labTaskAIService = {
  async suggestTask(
    labContext: LabContext,
    existingTasks: any[] = [],
    provider: string = "deepseek"
  ): Promise<SuggestedTask> {
    return await yhubApiAuthUtil.post<SuggestedTask>("/lab-task-ai/suggest-task/", {
      lab_context: labContext,
      existing_tasks: existingTasks,
      provider,
    });
  },

  async standardizeTask(
    rawTask: any,
    labContext: LabContext,
    provider: string = "deepseek"
  ): Promise<StandardizedTask> {
    return await yhubApiAuthUtil.post<StandardizedTask>("/lab-task-ai/standardize-task/", {
      raw_task: rawTask,
      lab_context: labContext,
      provider,
    });
  },

  async generateBulkTasks(
    labContext: LabContext,
    count: number = 3,
    totalMarks: number = 100,
    provider: string = "deepseek"
  ): Promise<BulkTasksResponse> {
    return await yhubApiAuthUtil.post<BulkTasksResponse>("/lab-task-ai/generate-bulk-tasks/", {
      lab_context: labContext,
      count,
      total_marks: totalMarks,
      provider,
    });
  },

  async estimateDuration(
    task: any,
    labContext: LabContext,
    provider: string = "deepseek"
  ): Promise<DurationEstimate> {
    return await yhubApiAuthUtil.post<DurationEstimate>("/lab-task-ai/estimate-duration/", {
      task,
      lab_context: labContext,
      provider,
    });
  },

  async generateScoringRules(
    labContext: LabContext,
    tasks: any[],
    repoFiles?: Record<string, string>,
    provider: string = "deepseek"
  ): Promise<ScoringRulesResponse> {
    return await yhubApiAuthUtil.post<ScoringRulesResponse>("/lab-task-ai/generate-scoring-rules/", {
      lab_context: labContext,
      tasks,
      repo_files: repoFiles || {},
      provider,
    });
  },

  async pushScoringRules(
    payload: PushScoringRulesPayload
  ): Promise<PushScoringRulesResponse> {
    return await yhubApiAuthUtil.post<PushScoringRulesResponse>(
      "/lab-task-ai/push-scoring-rules/",
      payload
    );
  },

  async generateLifecycleCommands(
    labContext: LabContext,
    tasks: any[] = [],
    provider: string = "deepseek"
  ): Promise<LifecycleCommandsResponse> {
    return await yhubApiAuthUtil.post<LifecycleCommandsResponse>(
      "/lab-task-ai/generate-lifecycle-commands/",
      {
        lab_context: labContext,
        tasks,
        provider,
      }
    );
  },

  async inspectRepo(payload: {
    repo_identifier: string;
    branch?: string;
    installation_id?: string | number | null;
    include_clone_token?: boolean;
  }): Promise<InspectRepoResponse> {
    return await yhubApiAuthUtil.post<InspectRepoResponse>("/lab-task-ai/inspect-repo/", {
      repo_identifier: payload.repo_identifier,
      branch: payload.branch || "main",
      installation_id: payload.installation_id ? String(payload.installation_id) : null,
      include_clone_token: Boolean(payload.include_clone_token),
    });
  },

  async taskChat(payload: {
    lab_context: LabContext;
    current_tasks: any[];
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    user_message: string;
    provider?: string;
  }): Promise<TaskChatResponse> {
    return await yhubApiAuthUtil.post<TaskChatResponse>("/lab-task-ai/task-chat/", {
      lab_context: payload.lab_context,
      current_tasks: payload.current_tasks,
      messages: payload.messages,
      user_message: payload.user_message,
      provider: payload.provider || "deepseek",
    });
  },

  async generatePassSolution(payload: {
    lab_context: LabContext;
    tasks: any[];
    scoring_files: Record<string, string>;
    repo_files: Record<string, string>;
    provider?: string;
  }): Promise<PassSolutionResponse> {
    return await yhubApiAuthUtil.post<PassSolutionResponse>(
      "/lab-task-ai/generate-pass-solution/",
      {
        lab_context: payload.lab_context,
        tasks: payload.tasks,
        scoring_files: payload.scoring_files,
        repo_files: payload.repo_files,
        provider: payload.provider || "deepseek",
      }
    );
  },

  async generateStarterCodebase(payload: {
    lab_context: LabContext;
    tasks?: any[];
    provider?: string;
  }): Promise<StarterCodebaseResponse> {
    return await yhubApiAuthUtil.post<StarterCodebaseResponse>(
      "/lab-task-ai/generate-starter-codebase/",
      {
        lab_context: payload.lab_context,
        tasks: payload.tasks || [],
        provider: payload.provider || "deepseek",
      }
    );
  },

  async repairScoringRules(payload: {
    lab_context: LabContext;
    tasks: any[];
    scoring_files: Record<string, string>;
    repo_files?: Record<string, string>;
    fail_case_output?: any;
    pass_case_output?: any;
    feedback?: string;
    provider?: string;
  }): Promise<ScoringRulesResponse> {
    return await yhubApiAuthUtil.post<ScoringRulesResponse>(
      "/lab-task-ai/repair-scoring-rules/",
      {
        lab_context: payload.lab_context,
        tasks: payload.tasks,
        scoring_files: payload.scoring_files,
        repo_files: payload.repo_files || {},
        fail_case_output: payload.fail_case_output || null,
        pass_case_output: payload.pass_case_output || null,
        feedback: payload.feedback || "",
        provider: payload.provider || "deepseek",
      }
    );
  },

  // --- Temp Verification Workspace APIs (ycode-executor-api) ---

  async createTempWorkspace(payload: {
    repo_url?: string;
    branch?: string;
    auth_token?: string;
    seed_files?: Record<string, string>;
    scoring_files?: Record<string, string>;
    setup_command?: string;
    recruiter_uuid?: string;
    question_uuid?: string;
  }): Promise<TempWorkspaceCreateResponse> {
    const res = await fetch(`${EXECUTOR_BASE}/workspace/temp/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = `Failed to create temporary workspace (${res.status})`;
      try {
        const errData = await res.json();
        msg = errData.detail || errData.error || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    return await res.json();
  },

  async runTempScoring(payload: {
    temp_workspace_id: string;
    test_command: string;
    scoring_files: Record<string, string>;
    mode: "fail_case" | "pass_case";
    solution_files?: Record<string, string>;
    restore_after?: boolean;
  }): Promise<TempScoringRunResponse> {
    const res = await fetch(`${EXECUTOR_BASE}/workspace/temp/run-scoring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = `Failed to execute scoring run (${res.status})`;
      try {
        const errData = await res.json();
        msg = errData.detail || errData.error || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    return await res.json();
  },

  async readWorkspaceFile(payload: {
    temp_workspace_id: string;
    path: string;
  }): Promise<{ path: string; content: string }> {
    const res = await fetch(`${EXECUTOR_BASE}/workspace/temp/read-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to read workspace file (${res.status})`);
    }
    return await res.json();
  },

  async writeWorkspaceFiles(payload: {
    temp_workspace_id: string;
    files: Record<string, string>;
    update_baseline?: boolean;
  }): Promise<{ success: boolean; written: string[]; file_count?: number; files?: string[]; key_files?: Record<string, string> }> {
    const res = await fetch(`${EXECUTOR_BASE}/workspace/temp/write-files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to write workspace files (${res.status})`);
    }
    return await res.json();
  },

  async resetTempWorkspace(tempWorkspaceId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${EXECUTOR_BASE}/workspace/temp/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ temp_workspace_id: tempWorkspaceId }),
    });
    if (!res.ok) throw new Error(`Failed to reset temp workspace (${res.status})`);
    return await res.json();
  },

  async deleteTempWorkspace(tempWorkspaceId: string): Promise<void> {
    if (!tempWorkspaceId) return;
    await fetch(`${EXECUTOR_BASE}/workspace/temp/${encodeURIComponent(tempWorkspaceId)}`, {
      method: "DELETE",
      keepalive: true,
    }).catch(() => {});
  },
};

export default labTaskAIService;

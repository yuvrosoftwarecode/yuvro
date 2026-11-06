import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";

export interface LabContext {
  title?: string;
  description?: string;
  tech_stack?: string[];
  repo_name?: string;
  repo_description?: string;
  repo_readme?: string;
  difficulty?: string;
  domain?: string;
}

export interface SuggestedTask {
  title: string;
  description: string;
  marks: number;
  estimated_minutes: number;
  evaluation_guidelines?: string;
  solution_code?: string;
}

export interface StandardizedTask {
  title: string;
  description: string;
  marks: number;
  estimated_minutes: number;
  evaluation_guidelines?: string;
  solution_code?: string;
  changes_made?: string;
}

export interface BulkTasksResponse {
  tasks: Array<{
    title: string;
    description: string;
    marks: number;
    estimated_minutes: number;
    evaluation_guidelines?: string;
    solution_code?: string;
  }>;
  total_marks: number;
  total_estimated_minutes: number;
  architectural_rationale?: string;
}

export interface DurationEstimate {
  estimated_minutes: number;
  complexity: string;
  breakdown?: Record<string, number>;
  reasoning?: string;
}

export interface ScoringRulesResponse {
  language: string;
  test_command: string;
  files: Record<string, string>;
  execution_notes?: string;
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
  files_committed: string[];
}

export interface LifecycleCommandsResponse {
  startup_command: string;
  test_command: string;
  rationale?: string;
  provider?: string;
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
    language?: string,
    provider: string = "deepseek"
  ): Promise<ScoringRulesResponse> {
    return await yhubApiAuthUtil.post<ScoringRulesResponse>("/lab-task-ai/generate-scoring-rules/", {
      lab_context: labContext,
      tasks,
      language,
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
};

export default labTaskAIService;

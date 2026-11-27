import { TaskItem, ChatMessage } from "../types";
import { labTaskAIService, LabContext } from "@/services/labTaskAIService";

export function splitDistribution(weights: number[], total: number): number[] {
  const sumWeights = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sumWeights) * total);
  let out = raw.map((r) => Math.max(1, Math.floor(r)));
  let diff = total - out.reduce((a, b) => a + b, 0);

  while (diff > 0) {
    let bestIdx = 0;
    let bestFrac = -1;
    raw.forEach((r, idx) => {
      const frac = r - out[idx];
      if (frac > bestFrac) {
        bestFrac = frac;
        bestIdx = idx;
      }
    });
    out[bestIdx]++;
    diff--;
  }

  while (diff < 0) {
    let bestIdx = -1;
    let bestVal = -1;
    out.forEach((val, idx) => {
      if (val > 1 && val > bestVal) {
        bestVal = val;
        bestIdx = idx;
      }
    });
    if (bestIdx < 0) break;
    out[bestIdx]--;
    diff++;
  }

  return out;
}

let counter = 100;
export const genUid = () => `t_${Date.now()}_${++counter}`;

export async function chatArchitect(payload: {
  prompt: string;
  conversationHistory: ChatMessage[];
  repoUrl?: string;
  branch?: string;
  indexedFiles?: string[];
  existingTasks?: TaskItem[];
  targetMarks?: number;
  targetMinutes?: number;
  labContext?: LabContext;
  signal?: AbortSignal;
}): Promise<{ replyText: string; tasks?: TaskItem[] }> {
  const lab_context: LabContext = payload.labContext || {
    title: "",
    git_repo_starter_url: payload.repoUrl || "",
    git_repo_starter_branch: payload.branch || "main",
    repo_tree: payload.indexedFiles || [],
  };

  const current_tasks = (payload.existingTasks || []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.desc,
    difficulty: t.diff.toUpperCase(),
    marks: Number(t.marks) || 3,
    duration_minutes: Number(t.min) || 10,
    solution: t.ref,
  }));

  const messages = (payload.conversationHistory || []).map((m) => ({
    role: m.r === "u" ? ("user" as const) : ("assistant" as const),
    content: m.t,
  }));

  const res = await labTaskAIService.taskChat({
    lab_context,
    current_tasks,
    messages,
    user_message: payload.prompt,
  });

  if (res && res.proposed_action && Array.isArray(res.proposed_action.tasks) && res.proposed_action.tasks.length > 0) {
    const rawTasks = res.proposed_action.tasks;
    const weights = rawTasks.map((t) => (t.difficulty === "HARD" ? 4 : t.difficulty === "MEDIUM" ? 3 : 2));
    const marksAllocated = splitDistribution(weights, payload.targetMarks || 10);
    const minsAllocated = splitDistribution(weights, payload.targetMinutes || 30);

    const tasks: TaskItem[] = rawTasks.map((t, idx) => ({
      id: genUid(),
      title: t.title,
      desc: t.description || "",
      ref: "",
      diff: (t.difficulty === "HARD" ? "Hard" : t.difficulty === "MEDIUM" ? "Medium" : "Easy") as any,
      marks: Number(t.marks) || marksAllocated[idx] || 3,
      min: Number(t.duration_minutes) || minsAllocated[idx] || 10,
      dep: "",
    }));

    return {
      replyText: res.reply || `I wrote ${tasks.length} tasks grounded in your codebase. The Generated tab is updated.`,
      tasks,
    };
  }

  return {
    replyText: res.reply || "I have analyzed your request.",
  };
}

export async function standardizeTaskWithAI(task: TaskItem, labContext: any): Promise<TaskItem> {
  const res = await labTaskAIService.standardizeTask(
    {
      title: task.title,
      description: task.desc,
      marks: task.marks,
      duration_minutes: task.min,
      difficulty: task.diff.toUpperCase(),
      solution: task.ref,
    },
    labContext
  );

  if (res) {
    return {
      ...task,
      title: res.title || task.title,
      desc: res.description || task.desc,
      diff: (res.difficulty === "HARD" ? "Hard" : res.difficulty === "MEDIUM" ? "Medium" : "Easy") as any,
      ref: "",
      marks: res.marks || task.marks,
      min: res.duration_minutes || res.estimated_minutes || task.min,
    };
  }

  return task;
}

export async function estimateDurationWithAI(task: TaskItem, labContext: any): Promise<number> {
  const res = await labTaskAIService.estimateDuration(
    {
      title: task.title,
      description: task.desc,
      difficulty: task.diff.toUpperCase(),
    },
    labContext
  );

  if (res && res.estimated_minutes) {
    return res.estimated_minutes;
  }

  return task.diff === "Hard" ? 18 : task.diff === "Medium" ? 12 : 8;
}

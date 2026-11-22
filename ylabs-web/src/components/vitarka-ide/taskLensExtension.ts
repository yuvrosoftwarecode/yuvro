import {
  WidgetType,
  Decoration,
  type DecorationSet,
  EditorView,
} from "@codemirror/view";
import { RangeSetBuilder, StateEffect, StateField, type EditorState } from "@codemirror/state";
import React from "react";

export interface TaskStatusInfo {
  status: "idle" | "running" | "completed" | "error";
  sessionId?: string;
  message?: string;
}

export const updateTaskLensEffect = StateEffect.define<void>();

export interface TaskLensConfig {
  enabled: boolean;
  taskStatuses: Record<string, TaskStatusInfo>;
  onStartTask: (
    taskId: string,
    taskTitle: string,
    fullTaskText: string,
    isSubtask?: boolean,
    parentTaskId?: string,
    parentTaskTitle?: string
  ) => void;
  onViewSession: (sessionId: string | null, taskTitle?: string) => void;
}

export function slugifyTask(text: string): string {
  return text
    .slice(0, 60)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

class TaskLensWidget extends WidgetType {
  constructor(
    readonly taskId: string,
    readonly taskTitle: string,
    readonly fullTaskText: string,
    readonly isCompleted: boolean,
    readonly isRunning: boolean,
    readonly sessionId: string | null,
    readonly indentSpaces: number,
    readonly isSubtask: boolean,
    readonly parentTaskId: string | undefined,
    readonly parentTaskTitle: string | undefined,
    readonly onStartTask: (
      taskId: string,
      taskTitle: string,
      fullTaskText: string,
      isSubtask?: boolean,
      parentTaskId?: string,
      parentTaskTitle?: string
    ) => void,
    readonly onViewSession: (sessionId: string | null, taskTitle?: string) => void
  ) {
    super();
  }

  eq(other: TaskLensWidget): boolean {
    return (
      other.taskId === this.taskId &&
      other.isCompleted === this.isCompleted &&
      other.isRunning === this.isRunning &&
      other.sessionId === this.sessionId &&
      other.indentSpaces === this.indentSpaces &&
      other.isSubtask === this.isSubtask &&
      other.parentTaskId === this.parentTaskId &&
      other.parentTaskTitle === this.parentTaskTitle
    );
  }

  ignoreEvent(): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const container = document.createElement("div");
    container.className =
      "cm-task-lens select-none flex items-center text-[11px] leading-tight font-sans text-muted-foreground/80";
    container.style.paddingLeft = `${this.indentSpaces}ch`;
    container.style.paddingTop = "6px";
    container.style.paddingBottom = "2px";

    const labelType = this.isSubtask ? "subtask" : "task";

    if (this.isRunning) {
      const runBadge = document.createElement("span");
      runBadge.className =
        "inline-flex items-center gap-1.5 text-amber-500 font-medium py-0.5 px-1.5 rounded bg-amber-500/10 border border-amber-500/20";
      runBadge.innerHTML = `
        <svg class="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        <span>Running ${labelType}...</span>
      `;
      container.appendChild(runBadge);
    } else if (this.isCompleted) {
      // Completed state: ✓ Task completed | View session
      const completedSpan = document.createElement("span");
      completedSpan.className =
        "inline-flex items-center gap-1 text-emerald-500 dark:text-emerald-400 font-medium";
      completedSpan.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${this.isSubtask ? "Subtask completed" : "Task completed"}</span>
      `;
      container.appendChild(completedSpan);

      const sep = document.createElement("span");
      sep.className = "mx-2 opacity-40 font-mono";
      sep.textContent = "|";
      container.appendChild(sep);

      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className =
        "inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group";
      viewBtn.innerHTML = `
        <svg class="group-hover:rotate-45 transition-transform" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="group-hover:underline">View session</span>
      `;
      viewBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onViewSession(this.sessionId, this.taskTitle);
      };
      container.appendChild(viewBtn);
    } else {
      // Uncompleted state: ⚡ Start task / ⚡ Start subtask
      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.className =
        "inline-flex items-center gap-1 text-primary hover:opacity-85 font-medium cursor-pointer group py-0.5 transition-colors";
      startBtn.innerHTML = `
        <svg class="text-amber-500 group-hover:scale-110 transition-transform" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span class="group-hover:underline">Start ${labelType}</span>
      `;
      startBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onStartTask(
          this.taskId,
          this.taskTitle,
          this.fullTaskText,
          this.isSubtask,
          this.parentTaskId,
          this.parentTaskTitle
        );
      };
      container.appendChild(startBtn);
    }

    return container;
  }
}

function buildTaskLensDecorations(
  state: EditorState,
  cfg: TaskLensConfig
): DecorationSet {
  if (!cfg.enabled) return Decoration.none;

  const builder = new RangeSetBuilder<Decoration>();
  const doc = state.doc;

  let currentMainTaskId: string | null = null;
  let currentMainTaskTitle: string | null = null;

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i);
    const match = /^(\s*)[-*]\s*\[([ xX])\]\s*(.*)$/.exec(line.text);
    if (!match) continue;

    const indent = match[1].length;
    const isDocCompleted = match[2].toLowerCase() === "x";
    const taskContent = match[3].trim();
    if (!taskContent) continue;

    // Collect any indented detail lines immediately following this task
    let fullTaskText = taskContent;
    for (let j = i + 1; j <= doc.lines; j++) {
      const nextLine = doc.line(j);
      if (/^\s*[-*]\s*\[([ xX])\]/.test(nextLine.text) || /^#+/.test(nextLine.text.trim())) {
        break;
      }
      if (nextLine.text.trim() === "") {
        if (j + 1 <= doc.lines && !/^\s+/.test(doc.line(j + 1).text)) {
          break;
        }
        continue;
      }
      if (/^\s+/.test(nextLine.text)) {
        fullTaskText += `\n${nextLine.text}`;
      } else {
        break;
      }
    }

    const taskId = slugifyTask(taskContent);
    const isSubtask = indent > 0;

    if (!isSubtask) {
      currentMainTaskId = taskId;
      currentMainTaskTitle = taskContent;
    }

    const parentTaskId = isSubtask ? (currentMainTaskId || undefined) : undefined;
    const parentTaskTitle = isSubtask ? (currentMainTaskTitle || undefined) : undefined;

    const statusInfo = cfg.taskStatuses[taskId];
    const isRunning = statusInfo?.status === "running";
    const isCompleted = isDocCompleted || statusInfo?.status === "completed";
    const sessionId = statusInfo?.sessionId || (parentTaskId ? cfg.taskStatuses[parentTaskId]?.sessionId : null) || null;

    builder.add(
      line.from,
      line.from,
      Decoration.widget({
        widget: new TaskLensWidget(
          taskId,
          taskContent,
          fullTaskText,
          isCompleted,
          isRunning,
          sessionId,
          indent,
          isSubtask,
          parentTaskId,
          parentTaskTitle,
          cfg.onStartTask,
          cfg.onViewSession
        ),
        side: -1,
        block: true,
      })
    );
  }

  return builder.finish();
}

export function createTaskLensExtension(
  configRef: React.MutableRefObject<TaskLensConfig>
) {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildTaskLensDecorations(state, configRef.current);
    },
    update(decorations, tr) {
      const hasLensEffect = tr.effects.some((e) => e.is(updateTaskLensEffect));
      if (tr.docChanged || hasLensEffect) {
        return buildTaskLensDecorations(tr.state, configRef.current);
      }
      return decorations.map(tr.changes);
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}

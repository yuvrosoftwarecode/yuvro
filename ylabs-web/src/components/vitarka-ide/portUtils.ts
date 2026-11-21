/**
 * Computes a deterministic dynamic port in [10000, 55000) for a given candidate session identifier.
 */
export function getCandidatePort(candidateKey: string, basePort = 10000, range = 45000): number {
  if (!candidateKey) return 8000;
  let hash = 0;
  for (let i = 0; i < candidateKey.length; i++) {
    hash = (hash << 5) - hash + candidateKey.charCodeAt(i);
    hash |= 0;
  }
  return basePort + (Math.abs(hash) % range);
}

/**
 * Injects or replaces the port in a startup command with the dynamic candidate port.
 */
export function adaptStartupCommandPort(cmd: string | undefined | null, port: number): string | undefined {
  if (!cmd) return undefined;
  let res = cmd.trim();

  // 1. If Django runserver is present:
  if (res.includes("runserver")) {
    if (res.includes("0.0.0.0:")) {
      res = res.replace(/0\.0\.0\.0:\d{4,5}/g, `0.0.0.0:${port}`);
    } else if (/127\.0\.0\.1:\d{4,5}/.test(res)) {
      res = res.replace(/127\.0\.0\.1:\d{4,5}/g, `0.0.0.0:${port}`);
    } else if (/:\d{4,5}/.test(res)) {
      res = res.replace(/:\d{4,5}/g, `:${port}`);
    } else {
      res = res + ` 0.0.0.0:${port}`;
    }
    return res;
  }

  // 2. If an explicit host:port or :port is in the command:
  if (/(?:0\.0\.0\.0|127\.0\.0\.1|localhost):(\d{4,5})/.test(res)) {
    return res.replace(/(0\.0\.0\.0|127\.0\.0\.1|localhost):\d{4,5}/g, `$1:${port}`);
  }

  // 3. If --port <number> or -p <number> is in the command:
  if (/(--port|-p)\s+(\d{4,5})/.test(res)) {
    return res.replace(/(--port|-p)\s+\d{4,5}/g, `$1 ${port}`);
  }

  // 4. If trailing port number is present (e.g. "... 8000"):
  if (/\s+(\d{4,5})$/.test(res)) {
    return res.replace(/\s+\d{4,5}$/, ` ${port}`);
  }

  return res;
}

export function findTaskExecutionResult(
  taskMeta: any,
  indexInSelected: number,
  tasksData: Record<string, any>,
  taskKeys: string[]
) {
  if (!tasksData || typeof tasksData !== "object") return undefined;

  // 1. Direct match by ID
  if (taskMeta?.id && tasksData[taskMeta.id] !== undefined) {
    return tasksData[taskMeta.id];
  }
  // 2. Direct match by task_slug
  if (taskMeta?.task_slug && tasksData[taskMeta.task_slug] !== undefined) {
    return tasksData[taskMeta.task_slug];
  }
  // 3. Match by task number from title (e.g. "Task 2: Configure Redis" -> 2)
  const title = taskMeta?.title || "";
  const numMatch = title.match(/Task\s*(\d+)/i);
  if (numMatch) {
    const num = numMatch[1];
    if (tasksData[`task${num}`] !== undefined) return tasksData[`task${num}`];
    if (tasksData[`task_${num}`] !== undefined) return tasksData[`task_${num}`];
    if (tasksData[`Task ${num}`] !== undefined) return tasksData[`Task ${num}`];
    if (tasksData[`Task${num}`] !== undefined) return tasksData[`Task${num}`];
    if (tasksData[`task-${parseInt(num, 10) - 1}`] !== undefined) {
      return tasksData[`task-${parseInt(num, 10) - 1}`];
    }
  }
  // 4. Match by original_index if present
  if (taskMeta?.original_index != null) {
    const origNum = Number(taskMeta.original_index) + 1;
    if (tasksData[`task${origNum}`] !== undefined) return tasksData[`task${origNum}`];
    if (tasksData[`task_${origNum}`] !== undefined) return tasksData[`task_${origNum}`];
    if (tasksData[`task-${taskMeta.original_index}`] !== undefined) return tasksData[`task-${taskMeta.original_index}`];
  }
  // 5. Match by title
  if (title && tasksData[title] !== undefined) {
    return tasksData[title];
  }
  // 6. Match by index in selected tasks
  if (tasksData[`task${indexInSelected + 1}`] !== undefined) {
    return tasksData[`task${indexInSelected + 1}`];
  }
  if (tasksData[`task-${indexInSelected}`] !== undefined) {
    return tasksData[`task-${indexInSelected}`];
  }
  // 7. Fallback to taskKeys[indexInSelected]
  if (taskKeys[indexInSelected] && tasksData[taskKeys[indexInSelected]] !== undefined) {
    return tasksData[taskKeys[indexInSelected]];
  }
  return undefined;
}

export function formatTaskMessage(
  msg: string | undefined,
  taskIndex: number,
  originalIndex?: number | null
): string | undefined {
  if (!msg || typeof msg !== "string") return msg;
  if (originalIndex != null && originalIndex !== taskIndex) {
    const origNum = originalIndex + 1;
    return msg.replace(
      new RegExp(`Task\\s*${origNum}\\s*(failed|passed)?\\s*:?`, "gi"),
      (match) => {
        return match.toLowerCase().includes("failed")
          ? `Task ${taskIndex + 1} failed:`
          : `Task ${taskIndex + 1}:`;
      }
    );
  }
  return msg;
}

export function formatTaskTitle(
  title: string | undefined,
  taskIndex: number,
  originalIndex?: number | null
): string {
  if (!title) return `Task ${taskIndex + 1}`;
  if (originalIndex != null && originalIndex !== taskIndex) {
    const origNum = originalIndex + 1;
    return title.replace(
      new RegExp(`^Task\\s*${origNum}\\b`, "i"),
      `Task ${taskIndex + 1}`
    );
  }
  return title;
}


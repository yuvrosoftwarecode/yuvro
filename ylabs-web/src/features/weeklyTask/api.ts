import type {
  WeeklyTask,
  Day,
  DayStatus,
  LeaderboardEntry,
  TaskStats,
} from "./types.ts";

export interface TaskRawData {
  id: string;
  name: string;
  desc: string;
  en: number;
  defaultDone: number[];
  tm: number;
  sc: number;
  days: [string, string][];
  startDate?: string;
}

const DEFAULT_TASKS_DATA: TaskRawData[] = [
  {
    id: "mk",
    name: "mk",
    desc: "A gentle warm-up week to get comfortable with the workspace.",
    en: 312,
    defaultDone: [0, 1, 2, 3, 4],
    tm: 35,
    sc: 90,
    days: [
      ["Set up your workspace", "Clone the starter repo and run it locally."],
      ["Read the codebase", "Trace one request from route to database."],
      ["Fix a failing test", "Find the bug behind the red test and fix it."],
      ["Add a small feature", "Add a field and show it on the page."],
      ["Write unit tests", "Cover the new feature with three tests."],
      ["Refactor a function", "Make one long function easier to read."],
      ["Weekly wrap-up", "Summarise what you shipped this week."],
    ],
  },
  {
    id: "dj",
    name: "Django",
    desc: "Build a URL shortener end to end with Django, from design to deployment.",
    en: 1284,
    defaultDone: [0, 1, 2, 3],
    tm: 38,
    sc: 86,
    days: [
      ["Design a URL Shortener", "Sketch the data model and the main API endpoints."],
      ["Design a URL Shortener", "Handle custom aliases and clashing short codes."],
      ["URL Shortening Request Flow", "Walk through the create and redirect request flow."],
      ["Design a URL Mapping Database", "Choose keys and indexes for fast lookups."],
      ["Add Caching to Redirects", "Cache hot links so redirects stay fast."],
      ["Rate Limit Link Creation", "Stop one user from flooding the create endpoint."],
      ["Deploy and Load Test", "Ship it and see how many redirects per second it handles."],
    ],
  },
  {
    id: "ds",
    name: "Data Structures",
    desc: "One core data structure a day, each with a real interview-style problem.",
    en: 2046,
    defaultDone: [0, 1, 2],
    tm: 42,
    sc: 82,
    days: [
      ["Arrays and Hashing", "Find duplicates and group anagrams."],
      ["Two Pointers", "Solve pair-sum problems in one pass."],
      ["Stacks and Queues", "Validate brackets and build a min stack."],
      ["Linked Lists", "Reverse a list and detect a cycle."],
      ["Trees", "Traverse and validate a binary search tree."],
      ["Graph Traversal", "Count islands with BFS and DFS."],
      ["Weekly Review", "Re-solve your two toughest problems."],
    ],
  },
  {
    id: "sd",
    name: "System Design",
    desc: "Learn to design systems that scale, one decision at a time.",
    en: 978,
    defaultDone: [0, 1, 2, 3, 4],
    tm: 45,
    sc: 78,
    days: [
      ["Requirements and Scale", "Turn a vague idea into clear requirements."],
      ["Capacity Estimation", "Estimate traffic, storage and bandwidth."],
      ["API Design", "Define clean endpoints and responses."],
      ["Choosing a Database", "Compare SQL and NoSQL for the use case."],
      ["Caching Strategy", "Decide what to cache and when to expire it."],
      ["Load Balancing", "Spread traffic and handle server failures."],
      ["Design Review", "Present the full design and defend it."],
    ],
  },
];

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function getTaskStartDate(weekStart?: string, baseDate: Date = new Date()): Date {
  if (weekStart) {
    const d = new Date(weekStart);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }
  const ti = (baseDate.getDay() + 6) % 7;
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - ti);
}

export function getTaskDayDate(dayIndex: number, startDate: Date): Date {
  return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + dayIndex);
}

export function getTaskDayName(dayIndex: number, startDate: Date): string {
  const d = getTaskDayDate(dayIndex, startDate);
  return d.toLocaleDateString("en-GB", { weekday: "long" });
}

export function getTaskTodayIndex(startDateStr?: string, totalDays: number = 7): number {
  if (!startDateStr) {
    const now = new Date();
    return (now.getDay() + 6) % 7;
  }
  const start = new Date(startDateStr);
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const now = new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowMidnight.getTime() - startMidnight.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return -1;
  if (diffDays >= totalDays) return totalDays;
  return diffDays;
}

export function getTodayIndex(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7;
}

export function getMondayOfWeek(date: Date = new Date()): Date {
  const ti = getTodayIndex(date);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - ti);
}

export function getDayDate(dayIndex: number, baseDate: Date = new Date()): Date {
  const mon = getMondayOfWeek(baseDate);
  return new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + dayIndex);
}

export function formatWeekRange(startDate?: Date, totalDays: number = 7): string {
  const d0 = startDate || getMondayOfWeek(new Date());
  const dEnd = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + totalDays - 1);
  const f0 = d0.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const fEnd = dEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${f0} – ${fEnd}`;
}

export function formatDayDate(dayIndex: number, startDate?: Date): string {
  const d0 = startDate || getMondayOfWeek(new Date());
  const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + dayIndex);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function calculatePoints(daysCount: number): number {
  return daysCount * 10 + (daysCount === 7 ? 20 : 0);
}

// In-memory / localStorage storage for completed days per task
const memoryDoneMap: Record<string, number[]> = {};

export function getStoredDone(taskId: string, defaultDone: number[], ti: number): number[] {
  const key = `yuvro_weekly_task_done_${taskId}`;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(Number);
        }
      }
    } catch {}
  }
  if (memoryDoneMap[taskId]) {
    return memoryDoneMap[taskId];
  }
  // Initialize with defaultDone filtered by current weekday
  const initial = defaultDone.filter((i) => i <= ti);
  memoryDoneMap[taskId] = initial;
  return initial;
}

export function saveStoredDone(taskId: string, done: number[]): void {
  memoryDoneMap[taskId] = done;
  const key = `yuvro_weekly_task_done_${taskId}`;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(done));
    } catch {}
  }
}

export function computeTaskDays(
  rawDays: [string, string][] | any[],
  doneIndices: number[],
  ti: number,
  startDate?: Date
): Day[] {
  const start = startDate || getMondayOfWeek(new Date());
  const doneSet = new Set(doneIndices);

  return rawDays.map((dItem, index) => {
    let title = "";
    let description = "";
    let minutes = 45;
    let points = 10;
    let ticketId = "";
    let ticketIds: string[] = [];
    let tickets: any[] = [];
    let labSlug = "";
    let labId = "";

    if (Array.isArray(dItem)) {
      title = dItem[0];
      description = dItem[1];
    } else if (typeof dItem === "object" && dItem !== null) {
      title = dItem.ticket_title || dItem.title || `Day ${index + 1} Ticket`;
      description = dItem.description || dItem.ticket_slug || "";
      minutes = dItem.minutes_max || dItem.minutes || 45;
      points = dItem.yuvro_points || dItem.points || 10;
      ticketId = dItem.ticket_id || "";

      const rawTicketIds = dItem.ticket_ids || (ticketId ? [ticketId] : []);
      ticketIds = Array.from(new Set(rawTicketIds.map(String).filter(Boolean)));

      const seenTickets = new Set<string>();
      tickets = (dItem.tickets || []).filter((t: any) => {
        const id = String(t.ticket_id || t.id || "");
        if (!id || seenTickets.has(id)) return false;
        seenTickets.add(id);
        return true;
      });

      labSlug = dItem.lab_slug || "";
      labId = dItem.lab_id || "";
    }

    let status: DayStatus = "locked";
    if (doneSet.has(index)) {
      status = "completed";
    } else if (index === ti) {
      status = "today";
    } else if (index < ti) {
      status = "missed";
    } else {
      status = "locked";
    }

    const dayName = getTaskDayName(index, start);
    const dateDisplay = formatDayDate(index, start);

    return {
      index,
      title,
      description,
      minutes,
      points,
      status,
      dayName,
      dateDisplay,
      ticketId,
      ticketIds,
      tickets,
      labId,
      labSlug,
    };
  });
}

function buildTaskObject(raw: TaskRawData, baseDate: Date = new Date()): WeeklyTask {
  const startDate = getTaskStartDate(raw.startDate, baseDate);
  const ti = getTaskTodayIndex(raw.startDate, raw.days.length);
  const done = getStoredDone(raw.id, raw.defaultDone, ti);
  const days = computeTaskDays(raw.days, done, ti, startDate);
  const defaultSlug =
    raw.id === "dj"
      ? "pydjango"
      : raw.id === "ds"
      ? "datastructures"
      : raw.id === "sd"
      ? "system-design"
      : "git";
  return {
    id: raw.id,
    name: raw.name,
    description: raw.desc,
    enrolledCount: raw.en,
    type: raw.days.length > 7 ? "monthly" : "weekly",
    weekStart: startDate.toISOString(),
    days: days.map((d) => ({
      ...d,
      labSlug: d.labSlug || defaultSlug,
      ticketId: d.ticketId || `${raw.id.toUpperCase()}-${d.index + 101}`,
    })),
    avgMinutes: raw.tm,
    avgScore: raw.sc,
    isEnrolled: true,
    labSlug: defaultSlug,
  };
}

export async function getTasks(): Promise<WeeklyTask[]> {
  const now = new Date();
  const defaultTasks = DEFAULT_TASKS_DATA.map((raw) => buildTaskObject(raw, now));

  try {
    const backendMod = await import("../../lib/weeklyTasks.ts").catch(() => null);
    if (backendMod?.loadActiveWeeklyTasks) {
      const backendTasks = await backendMod.loadActiveWeeklyTasks();
      if (Array.isArray(backendTasks)) {
        if (backendTasks.length > 0) {
          return backendTasks.map((bt: any) => {
            const startDate = getTaskStartDate(bt.start_date, now);
            const totalDays = (bt.days && bt.days.length) || (bt.type === "monthly" ? 30 : 7);
            const ti = getTaskTodayIndex(bt.start_date, totalDays);
            const done = getStoredDone(bt.id, [], ti);
            const days = computeTaskDays(bt.enriched_days || bt.days || [], done, ti, startDate);
            const labSlug = bt.lab_details?.slug || (typeof bt.lab === "object" ? bt.lab?.slug : "") || "";
            const labId = bt.lab_details?.id || (typeof bt.lab === "string" ? bt.lab : bt.lab?.id) || "";
            return {
              id: String(bt.id),
              name: bt.name,
              description: bt.description,
              enrolledCount: bt.enrollments_count || 120,
              type: bt.type || (totalDays > 7 ? "monthly" : "weekly"),
              weekStart: bt.start_date || startDate.toISOString(),
              days: days.map((d) => ({ ...d, labSlug: d.labSlug || labSlug, labId: d.labId || labId })),
              avgMinutes: 40,
              avgScore: 85,
              isEnrolled: bt.is_enrolled,
              labSlug,
              labId,
            };
          });
        }
        // If backend returned empty list, return empty (no dummy tasks)
        return [];
      }
    }
  } catch {}

  // Fallback to defaults only in offline test environment
  return defaultTasks;
}

export async function getTask(id: string): Promise<WeeklyTask | null> {
  const now = new Date();

  try {
    const backendMod = await import("../../lib/weeklyTasks.ts").catch(() => null);
    if (backendMod?.getWeeklyTask) {
      const bt = await backendMod.getWeeklyTask(id);
      if (bt && bt.id) {
        const startDate = getTaskStartDate(bt.start_date, now);
        const totalDays = (bt.days && bt.days.length) || (bt.type === "monthly" ? 30 : 7);
        const ti = getTaskTodayIndex(bt.start_date, totalDays);
        const done = getStoredDone(bt.id, [], ti);
        const days = computeTaskDays(bt.enriched_days || bt.days || [], done, ti, startDate);
        const labSlug = bt.lab_details?.slug || (typeof bt.lab === "object" ? bt.lab?.slug : "") || "";
        const labId = bt.lab_details?.id || (typeof bt.lab === "string" ? bt.lab : bt.lab?.id) || "";
        return {
          id: String(bt.id),
          name: bt.name,
          description: bt.description,
          enrolledCount: bt.enrollments_count || 120,
          type: bt.type || (totalDays > 7 ? "monthly" : "weekly"),
          weekStart: bt.start_date || startDate.toISOString(),
          days: days.map((d) => ({ ...d, labSlug: d.labSlug || labSlug, labId: d.labId || labId })),
          avgMinutes: 40,
          avgScore: 85,
          isEnrolled: bt.is_enrolled,
          labSlug,
          labId,
        };
      }
    }
  } catch {}

  const raw = DEFAULT_TASKS_DATA.find((t) => t.id === id);
  if (raw) return buildTaskObject(raw, now);

  return null;
}

export async function getLeaderboard(id: string): Promise<{
  top: LeaderboardEntry[];
  userEntry: LeaderboardEntry | null;
  rank: number | null;
}> {
  try {
    const weeklyMod = await import("../../lib/weeklyTasks.ts").catch(() => null);
    if (weeklyMod?.getLearnRecurringTaskLeaderboard) {
      const data = await weeklyMod.getLearnRecurringTaskLeaderboard(id);
      if (data && Array.isArray(data.top)) {
        return {
          top: data.top.map((e: any) => ({
            rank: e.rank,
            name: e.name,
            daysDone: e.daysDone ?? e.days_done ?? 0,
            points: e.points ?? 0,
            isYou: Boolean(e.isYou ?? e.is_you),
            avatarUrl: e.avatarUrl,
          })),
          userEntry: data.userEntry
            ? {
                rank: data.userEntry.rank,
                name: data.userEntry.name,
                daysDone: data.userEntry.daysDone ?? data.userEntry.days_done ?? 0,
                points: data.userEntry.points ?? 0,
                isYou: true,
              }
            : null,
          rank: data.rank ?? null,
        };
      }
    }
  } catch {}

  return { top: [], userEntry: null, rank: null };
}

export async function getStats(id: string): Promise<TaskStats> {
  try {
    const weeklyMod = await import("../../lib/weeklyTasks.ts").catch(() => null);
    if (weeklyMod?.getLearnRecurringTaskStats) {
      const data = await weeklyMod.getLearnRecurringTaskStats(id);
      if (data && typeof (data.total_enrolled ?? data.totalEnrolled) === "number") {
        return {
          rank: data.rank ?? null,
          totalEnrolled: data.total_enrolled ?? data.totalEnrolled ?? 0,
          points: data.points ?? 0,
          daysCompleted: data.days_completed ?? data.daysCompleted ?? 0,
          streak: data.streak ?? 0,
          avgMinutes: data.avg_minutes ?? data.avgMinutes ?? null,
          avgScorePct: data.avg_score_pct ?? data.avgScorePct ?? null,
        };
      }
    }
  } catch {}

  const now = new Date();
  const task = await getTask(id);
  const ti = getTodayIndex(now);
  const raw = DEFAULT_TASKS_DATA.find((t) => t.id === id);
  const totalEnrolled = task?.enrolledCount || raw?.en || 120;
  const done = getStoredDone(id, raw?.defaultDone || [], ti);
  const doneSet = new Set(done);

  // Compute streak
  let streak = 0;
  let i = doneSet.has(ti) ? ti : ti - 1;
  while (i >= 0 && doneSet.has(i)) {
    streak++;
    i--;
  }

  const { rank } = await getLeaderboard(id);
  const points = calculatePoints(done.length);

  return {
    rank,
    totalEnrolled,
    points,
    daysCompleted: done.length,
    streak,
    avgMinutes: done.length ? (task?.avgMinutes || raw?.tm || 40) : null,
    avgScorePct: done.length ? (task?.avgScore || raw?.sc || 85) : null,
  };
}

export async function completeDay(
  taskId: string,
  dayIndex: number
): Promise<{ task: WeeklyTask; stats: TaskStats }> {
  try {
    const weeklyMod = await import("../../lib/weeklyTasks.ts").catch(() => null);
    if (weeklyMod?.completeLearnRecurringTaskDay) {
      const res = await weeklyMod.completeLearnRecurringTaskDay(taskId, dayIndex);
      if (res && res.stats) {
        const stats: TaskStats = {
          rank: res.stats.rank ?? null,
          totalEnrolled: res.stats.total_enrolled ?? res.stats.totalEnrolled ?? 0,
          points: res.stats.points ?? 0,
          daysCompleted: res.stats.days_completed ?? res.stats.daysCompleted ?? 0,
          streak: res.stats.streak ?? 0,
          avgMinutes: res.stats.avg_minutes ?? res.stats.avgMinutes ?? null,
          avgScorePct: res.stats.avg_score_pct ?? res.stats.avgScorePct ?? null,
        };
        const task = (await getTask(taskId)) || res.task;
        return { task: task as WeeklyTask, stats };
      }
    }
  } catch {}

  const now = new Date();
  const ti = getTodayIndex(now);
  const raw = DEFAULT_TASKS_DATA.find((t) => t.id === taskId);
  const done = getStoredDone(taskId, raw?.defaultDone || [], ti);

  if (!done.includes(dayIndex)) {
    done.push(dayIndex);
    done.sort((a, b) => a - b);
    saveStoredDone(taskId, done);
  }

  // Invalidate header stats so points update in top navigation
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("yuvro-stats-refresh"));
    } catch {}
  }

  const task = (await getTask(taskId)) || (raw ? buildTaskObject(raw, now) : null);
  const stats = await getStats(taskId);
  return { task: task as WeeklyTask, stats };
}

import restApiAuthUtil from "@/utils/RestApiAuthUtil";

export type RecurringTaskType = "weekly" | "monthly";

export interface RecurringTaskTicketItem {
  ticket_id: string;
  id?: string;
  title?: string;
  ticket_title?: string;
  ticket_slug?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  yuvro_points?: number;
  minutes_max?: number;
  is_completed?: boolean;
}

export interface WeeklyTaskDay {
  day_index: number;
  day_name: string;
  date?: string;
  date_display?: string;
  sprint_id?: string;
  sprint_title?: string;
  ticket_id?: string;
  ticket_title?: string;
  ticket_slug?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  yuvro_points?: number;
  minutes_max?: number;
  is_completed?: boolean;
  is_locked?: boolean;
  tasks?: string[];
  ticket_ids?: string[];
  tickets?: RecurringTaskTicketItem[];
}

export interface WeeklyTask {
  id: string;
  name: string;
  description: string;
  lab: string;
  type?: RecurringTaskType;
  lab_details?: {
    id: string;
    title: string;
    type: string;
    difficulty: string;
    description: string;
  };
  start_date: string;
  end_date: string;
  days: WeeklyTaskDay[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  enrollments_count?: number;
  is_enrolled?: boolean;
  is_future?: boolean;
  today_index?: number;
  enriched_days?: WeeklyTaskDay[];
  completed_days_count?: number;
  progress_percentage?: number;
  is_all_completed?: boolean;
}

export interface WeeklyTaskEnrollment {
  id: string;
  user: string;
  user_details?: {
    id: string;
    name: string;
    email: string;
  };
  recurring_task?: string;
  weekly_task?: string;
  recurring_task_name?: string;
  weekly_task_name?: string;
  recurring_task_type?: RecurringTaskType;
  lab_id?: string;
  lab_title?: string;
  created_at: string;
}

export type LearnRecurringTask = WeeklyTask;
export type LearnRecurringTaskDay = WeeklyTaskDay;
export type LearnRecurringTaskEnrollment = WeeklyTaskEnrollment;

export interface LabSprintOption {
  id: string;
  title: string;
  order_index: number;
  tickets: Array<{
    id: string;
    title: string;
    ticket_slug: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    yuvro_points: number;
    order_index: number;
  }>;
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function getDayNameForDate(dateStr: string, offsetDays: number): string {
  if (!dateStr) return `Day ${offsetDays + 1}`;
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-GB", { weekday: "long" });
}

export function getFormattedDateForDay(dateStr: string, offsetDays: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export async function loadLearnRecurringTasks(type?: RecurringTaskType): Promise<WeeklyTask[]> {
  const query = type ? `?type=${type}` : "";
  const res = await restApiAuthUtil.get<any>(`/lab/learn-recurring-tasks/${query}`);
  return Array.isArray(res) ? res : res.results || [];
}

export async function loadActiveLearnRecurringTasks(type?: RecurringTaskType): Promise<WeeklyTask[]> {
  try {
    const query = type ? `?type=${type}` : "";
    const res = await restApiAuthUtil.get<any>(`/lab/learn-recurring-tasks/active/${query}`);
    return Array.isArray(res) ? res : res.results || [];
  } catch (err) {
    try {
      const typeParam = type ? `&type=${type}` : "";
      const res = await restApiAuthUtil.get<any>(`/lab/learn-recurring-tasks/?is_active=true${typeParam}`);
      return Array.isArray(res) ? res : res.results || [];
    } catch {
      return [];
    }
  }
}

export async function getLearnRecurringTask(id: string): Promise<WeeklyTask> {
  return await restApiAuthUtil.get<WeeklyTask>(`/lab/learn-recurring-tasks/${id}/`);
}

export async function getCurrentLearnRecurringTask(type: RecurringTaskType = "weekly"): Promise<WeeklyTask | null> {
  try {
    return await restApiAuthUtil.get<WeeklyTask>(`/lab/learn-recurring-tasks/current/?type=${type}`);
  } catch (err) {
    return null;
  }
}

export async function createLearnRecurringTask(input: Partial<WeeklyTask>): Promise<WeeklyTask> {
  return await restApiAuthUtil.post<WeeklyTask>("/lab/learn-recurring-tasks/", input);
}

export async function updateLearnRecurringTask(
  id: string,
  patch: Partial<WeeklyTask>
): Promise<WeeklyTask> {
  return await restApiAuthUtil.patch<WeeklyTask>(`/lab/learn-recurring-tasks/${id}/`, patch);
}

export async function deleteLearnRecurringTask(id: string): Promise<void> {
  await restApiAuthUtil.delete(`/lab/learn-recurring-tasks/${id}/`);
}

export async function enrollInLearnRecurringTask(id: string): Promise<{
  status: string;
  created: boolean;
  enrollment_id: string;
  task_id: string;
}> {
  return await restApiAuthUtil.post(`/lab/learn-recurring-tasks/${id}/enroll/`, {});
}

export async function getLearnRecurringTaskLeaderboard(id: string): Promise<{
  top: any[];
  userEntry: any | null;
  rank: number | null;
  totalEnrolled: number;
  stats?: any;
}> {
  return await restApiAuthUtil.get<any>(`/lab/learn-recurring-tasks/${id}/leaderboard/`);
}

export async function getLearnRecurringTaskStats(id: string): Promise<any> {
  return await restApiAuthUtil.get<any>(`/lab/learn-recurring-tasks/${id}/stats/`);
}

export async function completeLearnRecurringTaskDay(id: string, dayIndex: number): Promise<any> {
  return await restApiAuthUtil.post<any>(`/lab/learn-recurring-tasks/${id}/complete-day/`, {
    day_index: dayIndex,
  });
}

// Aliases for Weekly Tasks (backward compatibility)
export const loadWeeklyTasks = loadLearnRecurringTasks;
export const loadActiveWeeklyTasks = loadActiveLearnRecurringTasks;
export const getWeeklyTask = getLearnRecurringTask;
export const getCurrentWeeklyTask = getCurrentLearnRecurringTask;
export const createWeeklyTask = createLearnRecurringTask;
export const updateWeeklyTask = updateLearnRecurringTask;
export const deleteWeeklyTask = deleteLearnRecurringTask;
export const enrollInWeeklyTask = enrollInLearnRecurringTask;
export const getWeeklyTaskLeaderboard = getLearnRecurringTaskLeaderboard;
export const getWeeklyTaskStats = getLearnRecurringTaskStats;
export const completeWeeklyTaskDay = completeLearnRecurringTaskDay;

export async function loadLabSprintsAndTickets(
  labId: string
): Promise<LabSprintOption[]> {
  try {
    const [sprintsRes, ticketsRes] = await Promise.all([
      restApiAuthUtil.get<any>(`/lab/sprints/?lab=${labId}`),
      restApiAuthUtil.get<any>(`/lab/tickets/?lab=${labId}`),
    ]);

    const sprintsList = Array.isArray(sprintsRes) ? sprintsRes : sprintsRes.results || [];
    const ticketsList = Array.isArray(ticketsRes) ? ticketsRes : ticketsRes.results || [];

    const ticketsBySprint: Record<string, any[]> = {};
    for (const t of ticketsList) {
      const sid = String(t.sprint || t.sprint_id || "");
      if (!ticketsBySprint[sid]) ticketsBySprint[sid] = [];
      ticketsBySprint[sid].push({
        id: String(t.id),
        title: t.title || "Untitled Ticket",
        ticket_slug: t.ticket_slug || "",
        difficulty: t.difficulty || "EASY",
        yuvro_points: t.yuvro_points || 5,
        order_index: t.order_index ?? 0,
      });
    }

    return sprintsList
      .map((s: any) => ({
        id: String(s.id),
        title: s.title || `Sprint ${s.order_index ?? 1}`,
        order_index: s.order_index ?? 0,
        tickets: (ticketsBySprint[String(s.id)] || []).sort(
          (a, b) => a.order_index - b.order_index
        ),
      }))
      .sort((a: LabSprintOption, b: LabSprintOption) => a.order_index - b.order_index);
  } catch (err) {
    console.error("Failed to load sprints and tickets for lab:", err);
    return [];
  }
}

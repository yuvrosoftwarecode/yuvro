export type DayStatus = "completed" | "today" | "missed" | "locked";
export type RecurringTaskType = "weekly" | "monthly";

export interface DayTicketItem {
  ticket_id: string;
  title: string;
  ticket_slug?: string;
  difficulty?: string;
  yuvro_points?: number;
  minutes_max?: number;
  is_completed?: boolean;
  tasks?: string[];
  lab_id?: string;
  lab_slug?: string;
}

export interface Day {
  index: number;
  title: string;
  description: string;
  minutes: number;
  points: number;
  status: DayStatus;
  dayName?: string;
  dateDisplay?: string;
  ticketId?: string;
  ticketIds?: string[];
  tickets?: DayTicketItem[];
  labId?: string;
  labSlug?: string;
  tasks?: string[];
}

export interface WeeklyTask {
  id: string;
  name: string;
  description: string;
  enrolledCount: number;
  type?: RecurringTaskType;
  weekStart: string;
  days: Day[];
  avgMinutes?: number;
  avgScore?: number;
  isEnrolled?: boolean;
  labId?: string;
  labSlug?: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  daysDone: number;
  points: number;
  isYou: boolean;
}

export interface TaskStats {
  rank: number | null;
  totalEnrolled: number;
  points: number;
  daysCompleted: number;
  streak: number;
  avgMinutes: number | null;
  avgScorePct: number | null;
}

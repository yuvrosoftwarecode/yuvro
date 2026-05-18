export interface Topic {
  id: string;
  name: string;
  order_index?: number;
}

export interface Course {
  id: string;
  name: string;
  category: string;
  description?: string;
  short_code?: string;
  topics?: Topic[];
}

export interface Stats {
  lessons_completed: number;
  time_spent: string;
  avg_progress: number;
  streak?: number;
  max_streak?: number;
  xp?: number;
  level?: number;
  tier_name?: string;
  xp_progress_pct?: number;
  xp_for_next_level?: number;
  streak_freezes?: number;
}

export interface ContinueProgress {
  course_id: string;  // UUID
  course_name?: string;  // Display name
  subtopic_name?: string;
  lesson: number;
  total_lessons: number;
  percent: number;
}

export interface CourseProgressMap {
  [courseId: string]: number; // percent
}
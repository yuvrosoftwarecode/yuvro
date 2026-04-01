export interface Unit {
  id: string;
  name: string;
  order_index?: number;
}

export interface Subject {
  id: string;
  name: string;
  category: string;
  short_code?: string;
  units?: Unit[];
}

export interface Stats {
  lessons_completed: number;
  time_spent: string;
  avg_progress: number;
  streak?: number;
  xp?: number;
  level?: number;
}

export interface ContinueProgress {
  subject_id: string;  // UUID
  subject_name?: string;  // Display name
  lesson: number;
  total_lessons: number;
  percent: number;
}

export interface SubjectProgressMap {
  [subjectId: string]: number; // percent
}
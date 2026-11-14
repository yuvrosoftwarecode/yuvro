export interface ContributionDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionStats {
  total: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
}

export interface DimensionScore {
  name: string;
  score: number; // 0-100
  percentage: number;
}

export interface MockInterviewPerformance {
  latestScore: number; // e.g. 88
  maxScore: number; // e.g. 100
  trendPoints: number[]; // 8 data points for SVG trend
  dimensions: DimensionScore[]; // e.g. Problem Solving, System Design, Communication
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  progress?: {
    current: number;
    max: number;
    unit?: string;
  };
}

export type ActivityType = "Labs" | "Sprints" | "Tickets" | "Interviews";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  result: string;
  resultVariant?: "success" | "primary" | "warning" | "muted";
  timestamp: string; // ISO
}

export interface PerformanceStats {
  labsCompleted: number;
  sprintsShipped: number;
  ticketsClosed: number;
  mockInterviews: number;
  contributions: ContributionDay[];
  stats: ContributionStats;
  mockInterview: MockInterviewPerformance;
  achievements: Achievement[];
  recentActivity: ActivityItem[];
}

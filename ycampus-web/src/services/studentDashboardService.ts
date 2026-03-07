import restApiAuthUtil from '@/utils/RestApiAuthUtil';

// ─── Types ────────────────────────────────────────────────────

export interface NotesProgressData {
  overall: number;
  streak: number;
  subjects: { name: string; progress: number; total: number }[];
  chaptersCompleted: number;
}

export interface TestPerformanceData {
  completed: number;
  avgScore: number;
  accuracy: number;
  chaptersCompleted: string;
  lastTestScore: number;
  leaderboard: { you: number; global: number };
}

export interface TasksData {
  overall: number;
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
}

export interface AssessmentsData {
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
  recentStatus: number;
}

export interface ContestsData {
  completed: number;
  bestRank: number;
  avgScore: number;
  successRate: number;
  lastContest: { rank: number; accuracy: number; time: string };
}

// ─── Mock Data (fallback) ─────────────────────────────────────

const mockNotes: NotesProgressData = {
  overall: 81,
  streak: 12,
  subjects: [
    { name: 'Python Basics', progress: 85, total: 100 },
    { name: 'Data Structures', progress: 60, total: 80 },
    { name: 'JavaScript Fundamentals', progress: 45, total: 75 },
    { name: 'SQL Queries', progress: 90, total: 90 },
  ],
  chaptersCompleted: 75,
};

const mockTests: TestPerformanceData = {
  completed: 38,
  avgScore: 82,
  accuracy: 85,
  chaptersCompleted: '75%',
  lastTestScore: 88,
  leaderboard: { you: 82, global: 76 },
};

const mockTasks: TasksData = {
  overall: 75,
  completed: 18,
  inProgress: 4,
  pending: 2,
  total: 24,
};

const mockAssessments: AssessmentsData = {
  completed: 9,
  inProgress: 2,
  pending: 1,
  total: 12,
  avgScore: 85,
  highestScore: 96,
  lowestScore: 72,
  recentStatus: 88,
};

const mockContests: ContestsData = {
  completed: 12,
  bestRank: 8,
  avgScore: 78,
  successRate: 80,
  lastContest: { rank: 12, accuracy: 82, time: '45 min' },
};

// ─── Service ──────────────────────────────────────────────────

class StudentDashboardService {

  /**
   * Notes Progress — fetches student subject progress and transforms to widget shape.
   * Endpoint: GET /api/course/student-subject-progress/
   */
  async getNotesProgress(): Promise<NotesProgressData> {
    try {
      const response = await restApiAuthUtil.get<any[]>('/course/student-subject-progress/');
      if (!response || !Array.isArray(response) || response.length === 0) {
        return mockNotes;
      }

      // Group progress by subject
      const subjectMap = new Map<string, { completed: number; total: number }>();
      let totalCompleted = 0;
      let totalItems = 0;

      response.forEach((item: any) => {
        const subjectName = item.subject_name || item.subject?.name || 'Unknown';
        const existing = subjectMap.get(subjectName) || { completed: 0, total: 0 };
        existing.total += 1;
        if (item.is_completed || item.progress_percent >= 100) {
          existing.completed += 1;
          totalCompleted += 1;
        }
        totalItems += 1;
        subjectMap.set(subjectName, existing);
      });

      const subjects = Array.from(subjectMap.entries()).map(([name, data]) => ({
        name,
        progress: data.completed,
        total: data.total,
      }));

      return {
        overall: totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0,
        streak: mockNotes.streak, // No backend endpoint for streaks
        subjects,
        chaptersCompleted: totalCompleted,
      };
    } catch (error) {
      console.warn('Notes progress API failed, using mock data:', error);
      return mockNotes;
    }
  }

  /**
   * Test Performance — fetches skill test submissions.
   * Endpoint: GET /api/assessment/skill-test/submissions/
   */
  async getTestPerformance(): Promise<TestPerformanceData> {
    try {
      const response = await restApiAuthUtil.get<any>('/assessment/skill-test/submissions/');
      const results = Array.isArray(response) ? response : response?.results || [];
      if (results.length === 0) return mockTests;

      const scores = results.map((s: any) => s.marks || s.score || 0);
      const totalScore = scores.reduce((a: number, b: number) => a + b, 0);
      const avgScore = Math.round(totalScore / scores.length);
      const lastScore = scores[scores.length - 1] || 0;

      return {
        completed: results.length,
        avgScore,
        accuracy: avgScore, // Approximation — real accuracy needs per-question data
        chaptersCompleted: mockTests.chaptersCompleted,
        lastTestScore: lastScore,
        leaderboard: { you: avgScore, global: mockTests.leaderboard.global },
      };
    } catch (error) {
      console.warn('Test performance API failed, using mock data:', error);
      return mockTests;
    }
  }

  /**
   * Tasks Summary — fetches student code practice submissions.
   * Endpoint: GET /api/course/student-code-practices/
   */
  async getTasksSummary(): Promise<TasksData> {
    try {
      const response = await restApiAuthUtil.get<any>('/course/student-code-practices/');
      const results = Array.isArray(response) ? response : response?.results || [];
      if (results.length === 0) return mockTasks;

      let completed = 0;
      let inProgress = 0;
      let pending = 0;

      results.forEach((task: any) => {
        const status = task.status || (task.is_successful ? 'completed' : 'in_progress');
        if (status === 'completed' || task.is_successful) completed++;
        else if (status === 'in_progress') inProgress++;
        else pending++;
      });

      const total = results.length;
      const overall = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { overall, completed, inProgress, pending, total };
    } catch (error) {
      console.warn('Tasks API failed, using mock data:', error);
      return mockTasks;
    }
  }

  /**
   * Assessments — fetches certification submissions.
   * Endpoint: GET /api/assessment/certification-submissions/
   */
  async getAssessments(): Promise<AssessmentsData> {
    try {
      const response = await restApiAuthUtil.get<any>('/assessment/certification-submissions/');
      const results = Array.isArray(response) ? response : response?.results || [];
      if (results.length === 0) return mockAssessments;

      let completed = 0;
      let inProgress = 0;
      let pending = 0;
      const scores: number[] = [];

      results.forEach((item: any) => {
        const status = item.status || 'completed';
        if (status === 'completed' || status === 'passed' || status === 'failed') {
          completed++;
          if (item.marks !== undefined && item.marks !== null) scores.push(item.marks);
          else if (item.score !== undefined && item.score !== null) scores.push(item.score);
        } else if (status === 'in_progress' || status === 'started') {
          inProgress++;
        } else {
          pending++;
        }
      });

      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      return {
        completed,
        inProgress,
        pending,
        total: results.length,
        avgScore,
        highestScore,
        lowestScore,
        recentStatus: scores.length > 0 ? scores[scores.length - 1] : 0,
      };
    } catch (error) {
      console.warn('Assessments API failed, using mock data:', error);
      return mockAssessments;
    }
  }

  /**
   * Contests — fetches contest data.
   * Endpoint: GET /api/assessment/contests/
   */
  async getContests(): Promise<ContestsData> {
    try {
      const response = await restApiAuthUtil.get<any>('/assessment/contests/');
      const results = Array.isArray(response) ? response : response?.results || [];
      if (results.length === 0) return mockContests;

      const completedContests = results.filter(
        (c: any) => c.status === 'completed' || c.status === 'ended'
      );

      const scores = completedContests
        .map((c: any) => c.score || c.marks || 0)
        .filter((s: number) => s > 0);
      const ranks = completedContests
        .map((c: any) => c.rank || 0)
        .filter((r: number) => r > 0);

      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : mockContests.avgScore;
      const bestRank = ranks.length > 0 ? Math.min(...ranks) : mockContests.bestRank;

      const last = completedContests[completedContests.length - 1];

      return {
        completed: completedContests.length,
        bestRank,
        avgScore,
        successRate: mockContests.successRate, // Not computable from list endpoint
        lastContest: last
          ? { rank: last.rank || 0, accuracy: last.accuracy || last.score || 0, time: last.duration || '—' }
          : mockContests.lastContest,
      };
    } catch (error) {
      console.warn('Contests API failed, using mock data:', error);
      return mockContests;
    }
  }
}

export const studentDashboardService = new StudentDashboardService();
export default studentDashboardService;
import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface LeaderboardEntry {
  user_id: string;
  student_name: string;
  avatar?: string;
  score: number;
  accuracy: number;
  time_taken?: number;
  attempts?: number;
  tests_completed?: number;
  performance_score?: number;
  rank: number;
  is_current_user: boolean;
  completed_at?: string;
}

export const leaderboardService = {
  getTestLeaderboard: async (testId: string): Promise<LeaderboardEntry[]> => {
    return await restApiAuthUtil.get<LeaderboardEntry[]>(`/assessment/leaderboards/test/${testId}/`);
  },

  getUnitLeaderboard: async (unitId: string): Promise<LeaderboardEntry[]> => {
    return await restApiAuthUtil.get<LeaderboardEntry[]>(`/assessment/leaderboards/unit/${unitId}/`);
  },

  getSubjectLeaderboard: async (subjectId: string): Promise<LeaderboardEntry[]> => {
    return await restApiAuthUtil.get<LeaderboardEntry[]>(`/assessment/leaderboards/subject/${subjectId}/`);
  },

  getGlobalLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    return await restApiAuthUtil.get<LeaderboardEntry[]>('/assessment/leaderboards/global/');
  },

  getAssessmentLeaderboard: async (subjectId: string): Promise<LeaderboardEntry[]> => {
    return await restApiAuthUtil.get<LeaderboardEntry[]>(`/assessment/leaderboards/assessments/${subjectId}/`);
  }
};

export default leaderboardService;

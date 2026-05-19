import restApiAuthUtil from '@/utils/RestApiAuthUtil';

// ─── Types ───────────────────────────────────────────────────

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

export interface AnnouncementData {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  created_at: string;
  is_read: boolean;
}

export interface AttendanceData {
  total: number;
  present: number;
  absent: number;
  percentage: number;
}

// ─── Service ──────────────────────────────────────────────────

class StudentDashboardService {

  /**
   * Notes Progress — fetches student subject progress.
   * Endpoint: GET /api/course/student-subject-progress/progress/
   */
  async getNotesProgress(): Promise<NotesProgressData[]> {
    try {
      const response = await restApiAuthUtil.get<any[]>('/course/student-subject-progress/progress/');
      return response.map(item => ({
        overall: item.percent,
        streak: item.learning_streak,
        subjects: [{ 
          name: item.subject_name, 
          progress: item.percent, 
          total: 100 
        }],
        chaptersCompleted: item.subunits_completed,
      }));
    } catch (error) {
      console.warn('Notes progress API failed:', error);
      return [];
    }
  }

  /**
   * Test Performance — fetches skill test (practice) submissions.
   * Uses question_activities data to calculate percentages without extra API calls.
   * Endpoint: GET /api/assessment/skill-tests/?test_type=practice
   * and GET /api/assessment/skill-test/submissions/
   */
  async getTestPerformance(productType?: string): Promise<TestPerformanceData> {
    try {
      // 1. Fetch practice tests
      const testsRes = await restApiAuthUtil.get<any>('/assessment/skill-tests/?test_type=practice');
      const practiceTests = Array.isArray(testsRes) ? testsRes : testsRes?.results || [];

      // 2. Fetch all submissions and filter by practice tests
      const submissionsRes = await restApiAuthUtil.get<any>('/assessment/skill-test/submissions/');
      const allSubmissions = Array.isArray(submissionsRes) ? submissionsRes : submissionsRes?.results || [];
      
      const practiceTestIds = new Set(practiceTests.map((t: any) => t.id));
      const results = allSubmissions.filter((s: any) => practiceTestIds.has(s.skill_test));

      const emptyResult: TestPerformanceData = {
        completed: 0, avgScore: 0, accuracy: 0,
        chaptersCompleted: '0%', lastTestScore: 0,
        leaderboard: { you: 0, global: 0 },
      };

      if (results.length === 0) return emptyResult;

      // Filter to completed submissions
      const validSubmissions = results.filter((s: any) =>
        s.status === 'completed' || s.status === 'evaluated' || s.status === 'submitted'
      );

      if (validSubmissions.length === 0) return emptyResult;

      let totalScorePct = 0;
      let totalQuestions = 0;
      let totalCorrect = 0;

      validSubmissions.forEach((s: any) => {
        const activities = s.question_activities || [];

        if (activities.length > 0) {
          // Calculate total marks from question_activities (each has `marks` = max marks for that question)
          const testTotalMarks = activities.reduce((sum: number, q: any) => sum + (Number(q.marks) || 0), 0);
          const marksObtained = s.marks || 0;

          const pct = testTotalMarks > 0 ? (marksObtained / testTotalMarks) * 100 : 0;
          totalScorePct += pct;

          totalQuestions += activities.length;
          totalCorrect += activities.filter((q: any) => q.is_correct).length;
        } else {
          // Fallback: no question_activities, use marks directly (assume 100 total)
          totalScorePct += Math.min(s.marks || 0, 100);
        }
      });

      const count = validSubmissions.length;
      const avgScore = Math.round(totalScorePct / count);
      const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : avgScore;

      // Last test score — sort by date to find the most recent attempt
      const sorted = [...validSubmissions].sort((a: any, b: any) => {
        const dateA = new Date(a.submitted_at || a.completed_at || a.created_at || 0).getTime();
        const dateB = new Date(b.submitted_at || b.completed_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
      const lastSub = sorted[0];
      const lastActivities = lastSub?.question_activities || [];
      const lastTotalMarks = lastActivities.reduce((sum: number, q: any) => sum + (Number(q.marks) || 0), 0);
      const lastScore = lastTotalMarks > 0
        ? Math.round(((lastSub?.marks || 0) / lastTotalMarks) * 100)
        : 0;

      return {
        completed: count,
        avgScore: Math.min(avgScore, 100),
        accuracy: Math.min(accuracy, 100),
        chaptersCompleted: `${Math.min(avgScore + 5, 95)}%`,
        lastTestScore: lastScore,
        leaderboard: { you: avgScore, global: 70 },
      };


    } catch (error) {
      console.warn('Test performance API failed:', error);
      throw error;
    }
  }

  /**
   * Tasks Summary — fetches student tasks and submissions.
   * We need both all assigned tasks and actual submissions to compute "Pending".
   */
  async getTasksSummary(): Promise<TasksData> {
    try {
      // 1. Fetch assigned tasks for the student
      const tasksResponse = await restApiAuthUtil.get<any>('/core/tasks/');
      const allTasks = Array.isArray(tasksResponse) ? tasksResponse : tasksResponse?.results || [];
      
      // 2. Fetch student's submissions
      const submissionsResponse = await restApiAuthUtil.get<any>('/core/task-submissions/');
      const submissions = Array.isArray(submissionsResponse) ? submissionsResponse : submissionsResponse?.results || [];
      
      const total = allTasks.length;
      let completed = 0;
      let inProgress = 0;

      submissions.forEach((sub: any) => {
        if (sub.is_submitted) {
          completed++;
        } else {
          inProgress++;
        }
      });

      const pending = Math.max(0, total - (completed + inProgress));
      const overall = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { 
        overall, 
        completed, 
        inProgress, 
        pending, 
        total 
      };
    } catch (error) {
      console.warn('Tasks API failed:', error);
      throw error;
    }
  }

  /**
   * Assessments — fetches assigned skill tests with test_type=assessment and their submissions.
   * Endpoint: GET /api/assessment/skill-tests/?test_type=assessment
   * and GET /api/assessment/skill-test/submissions/
   */
  async getAssessments(productType?: string): Promise<AssessmentsData> {
    try {
      // 1. Fetch assigned assessments
      let assessments: any[] = [];
      const testsRes = await restApiAuthUtil.get<any>('/assessment/skill-tests/?test_type=assessment');
      const allTests = Array.isArray(testsRes) ? testsRes : testsRes?.results || [];
      if (productType === 'assessments') {
        assessments = allTests.filter((t: any) => t.unit === null);
      } else {
        assessments = allTests;
      }

      // 2. Fetch student's submissions
      const submissionsRes = await restApiAuthUtil.get<any>('/assessment/skill-test/submissions/');
      const allSubmissions = Array.isArray(submissionsRes) ? submissionsRes : submissionsRes?.results || [];
      
      // Filter submissions to only include those for assessments
      const assessmentIds = new Set(assessments.map((a: any) => a.id));
      const submissions = allSubmissions.filter((s: any) => assessmentIds.has(s.skill_test));

      let completed = 0;
      let inProgress = 0;
      const scores: number[] = [];

      submissions.forEach((item: any) => {
        const status = item.status || 'completed';
        if (status === 'completed' || status === 'evaluated' || status === 'submitted') {
          completed++;
          
          // Calculate percentage
          const activities = item.question_activities || [];
          if (activities.length > 0) {
            const testTotalMarks = activities.reduce((sum: number, q: any) => sum + (Number(q.marks) || 0), 0);
            const marksObtained = item.marks || 0;
            const pct = testTotalMarks > 0 ? (marksObtained / testTotalMarks) * 100 : 0;
            scores.push(pct);
          } else {
             scores.push(Math.min(item.marks || 0, 100)); // fallback
          }
        } else {
          inProgress++;
        }
      });

      const total = assessments.length;
      const pending = Math.max(0, total - (completed + inProgress));
      
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      // Last test score — sort by date to find the most recent attempt
      const sortedSubmissions = [...submissions].filter((s: any) => 
          s.status === 'completed' || s.status === 'evaluated' || s.status === 'submitted'
      ).sort((a: any, b: any) => {
          const dateA = new Date(a.submitted_at || a.completed_at || a.created_at || 0).getTime();
          const dateB = new Date(b.submitted_at || b.completed_at || b.created_at || 0).getTime();
          return dateB - dateA;
      });

      let recentStatus = 0;
      if (sortedSubmissions.length > 0) {
          const lastSub = sortedSubmissions[0];
          const activities = lastSub.question_activities || [];
          if (activities.length > 0) {
              const testTotalMarks = activities.reduce((sum: number, q: any) => sum + (Number(q.marks) || 0), 0);
              const marksObtained = lastSub.marks || 0;
              recentStatus = testTotalMarks > 0 ? Math.round((marksObtained / testTotalMarks) * 100) : 0;
          } else {
              recentStatus = Math.min(lastSub.marks || 0, 100);
          }
      }

      return {
        completed,
        inProgress,
        pending,
        total,
        avgScore: Math.round(avgScore),
        highestScore: Math.round(highestScore),
        lowestScore: Math.round(lowestScore),
        recentStatus,
      };
    } catch (error) {
      console.warn('Assessments API failed:', error);
      throw error;
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

      const completedContests = results.filter(
        (c: any) => c.status === 'completed' || c.status === 'ended'
      );

      const scores = completedContests
        .map((c: any) => c.score || c.marks || 0)
        .filter((s: number) => s > 0);
      
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
      const bestRank = 1; 

      return {
        completed: completedContests.length,
        bestRank,
        avgScore,
        successRate: 0, 
        lastContest: { rank: 0, accuracy: 0, time: '—' },
      };
    } catch (error) {
      console.warn('Contests API failed:', error);
      throw error;
    }
  }

  /**
   * Attendance — fetches aggregate attendance from progress endpoint.
   * We sum up attendance_total and attendance_present across all subjects.
   */
  async getAttendanceAggregate(): Promise<AttendanceData> {
    try {
      const response = await restApiAuthUtil.get<any[]>('/course/student-subject-progress/progress/');
      
      let total = 0;
      let present = 0;

      response.forEach(item => {
        total += item.attendance_total || 0;
        present += item.attendance_present || 0;
      });

      const absent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return { total, present, absent, percentage };
    } catch (error) {
      console.warn('Attendance aggregate failed:', error);
      return { total: 0, present: 0, absent: 0, percentage: 0 };
    }
  }

  /**
   * Announcements — fetches real announcements from core API.
   * Endpoint: GET /api/core/announcement/
   */
  async getAnnouncements(): Promise<AnnouncementData[]> {
    try {
      const response = await restApiAuthUtil.get<any>('/core/announcement/');
      const results = Array.isArray(response) ? response : response?.results || [];
      return results.map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.content || '',
        category: a.level,
        priority: a.priority,
        created_at: a.publish_date || a.created_at,
        is_read: false // Backend doesn't support read status yet
      }));
    } catch (error) {
      console.warn('Announcements API failed:', error);
      return [];
    }
  }

  async getGamificationStats() {
    try {
      const response = await restApiAuthUtil.get<any>('/course/student-subject-progress/stats/');
      return response;
    } catch (error) {
       return { streak: 0, badges: [] };
    }
  }
}

export const studentDashboardService = new StudentDashboardService();
export default studentDashboardService;
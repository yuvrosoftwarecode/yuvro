import { useQuery } from '@tanstack/react-query';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';
import { fetchTopicsByCourse } from '@/services/courseService';
import type { Course, Stats, ContinueProgress, CourseProgressMap } from '@/components/student/Learn/types';

// 1. Fetch Courses with Topics
export const useCourses = () => {
  return useQuery({
    queryKey: ['student-courses'],
    queryFn: async () => {
      const courseList = await restApiAuthUtil.get<Course[]>('/course/courses/');
      const withTopics = await Promise.all(
        courseList.map(async (c) => {
          try {
            const topics = await fetchTopicsByCourse(String(c.id));
            return { ...c, topics };
          } catch {
            return { ...c, topics: [] };
          }
        })
      );
      return withTopics;
    },
  });
};

// 2. Fetch Stats
export const useStudentStats = () => {
  return useQuery({
    queryKey: ['student-stats'],
    queryFn: async () => {
      const s = await restApiAuthUtil.get('/course/student-course-progress/stats/');
      // Fallback empty valid stats obj if failing or missing fields
      return (s as Stats) || { lessons_completed: 0, time_spent: '0h', avg_progress: 0 };
    },
  });
};

// 3. Fetch Leaderboard
export const useLeaderboard = () => {
  return useQuery({
    queryKey: ['student-leaderboard'],
    queryFn: async () => {
      return await restApiAuthUtil.get<any[]>('/course/student-course-progress/leaderboard/');
    },
  });
};

// 4. Fetch Continue Progress
export const useContinueProgress = () => {
  return useQuery({
    queryKey: ['student-continue-progress'],
    queryFn: async () => {
      const cp = await restApiAuthUtil.get('/course/student-course-progress/continue_learning/') as ContinueProgress;
      if (cp) {
        return {
          ...cp,
          course_id: String(cp.course_id || ''),
          course_name: cp.course_name || 'Python',
          lesson: cp.lesson || 0,
          total_lessons: cp.total_lessons || 0,
          percent: cp.percent || 0,
        } as ContinueProgress;
      }
      return null;
    },
  });
};

// 5. Fetch Progress Map
export const useProgressMap = () => {
  return useQuery({
    queryKey: ['student-progress-map'],
    queryFn: async () => {
      const list = await restApiAuthUtil.get<{ course_id: string; percent: number }[]>('/course/student-course-progress/progress/');
      const map: CourseProgressMap = {};
      if (Array.isArray(list)) {
        list.forEach((p) => {
          map[String(p.course_id)] = p.percent ?? 0;
        });
      }
      return map;
    },
  });
};

// 6. Fetch Calendar Activity
export const useCalendarActivity = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return useQuery({
    queryKey: ['student-calendar-activity', year, month],
    queryFn: async () => {
      const res = await restApiAuthUtil.get<{ active_dates: string[] }>(
        `/course/student-course-progress/calendar_activity/?year=${year}&month=${month}`
      );
      return res.active_dates || [];
    },
  });
};

// 7. Fetch Daily Activity List (Derived to solvedToday / timeSpentToday)
export const useDailyActivity = () => {
  return useQuery({
    queryKey: ['student-daily-activity'],
    queryFn: async () => {
      const res = await restApiAuthUtil.get<any[]>('/student/dashboard/activity/');
      if (Array.isArray(res)) {
        const todayActions = res.filter((a) => {
          const time = (a.time || '').toLowerCase();
          return time.includes('hour') || time.includes('min') || time.includes('now') || time.includes('second');
        });

        const solvedCount = todayActions.filter((a) =>
          a.action.toLowerCase().includes('solve') || a.action.toLowerCase().includes('complete')
        ).length;

        const estimatedTime = solvedCount > 0 ? `${solvedCount * 10}m` : '0m';

        return {
          solvedToday: solvedCount,
          timeSpentToday: estimatedTime,
        };
      }
      return { solvedToday: 0, timeSpentToday: '0m' };
    },
  });
};

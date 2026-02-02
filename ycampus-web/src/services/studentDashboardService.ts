import restApiAuthUtil from '@/utils/RestApiAuthUtil';

export interface DashboardStats {
  coursesEnrolled: number;
  problemsSolved: number;
  contestsParticipated: number;
  jobApplications: number;
  skillTestsCompleted: number;
  mockInterviewsCompleted: number;
}

export interface RecentActivity {
  id: number;
  type: 'course' | 'coding' | 'job' | 'contest' | 'skill-test' | 'interview';
  action: string;
  target: string;
  time: string;
  icon?: string;
  color?: string;
}

export interface UpcomingEvent {
  id: number;
  title: string;
  date: string;
  type: 'contest' | 'interview' | 'job' | 'course';
  participants?: number;
  duration?: string;
  company?: string;
}

export interface RecommendedJob {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  match: number;
}

export interface CourseProgress {
  id: number;
  name: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivity: RecentActivity[];
  upcomingEvents: UpcomingEvent[];
  recommendedJobs: RecommendedJob[];
  courseProgress: CourseProgress[];
}

class StudentDashboardService {
  private baseUrl = '/api/student/dashboard';

  async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await restApiAuthUtil.get<DashboardData>(`${this.baseUrl}/`);
      return response;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return this.getMockDashboardData();
    }
  }

  async getStats(): Promise<DashboardStats> {
    try {
      const response = await restApiAuthUtil.get<DashboardStats>(`${this.baseUrl}/stats/`);
      return response;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        coursesEnrolled: 3,
        problemsSolved: 47,
        contestsParticipated: 8,
        jobApplications: 12,
        skillTestsCompleted: 15,
        mockInterviewsCompleted: 5
      };
    }
  }

  async getRecentActivity(): Promise<RecentActivity[]> {
    try {
      const response = await restApiAuthUtil.get<RecentActivity[]>(`${this.baseUrl}/activity/`);
      return response;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  async getUpcomingEvents(): Promise<UpcomingEvent[]> {
    try {
      const response = await restApiAuthUtil.get<UpcomingEvent[]>(`${this.baseUrl}/events/`);
      return response;
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }
  }

  async getRecommendedJobs(): Promise<RecommendedJob[]> {
    try {
      const response = await restApiAuthUtil.get<RecommendedJob[]>(`${this.baseUrl}/recommended-jobs/`);
      return response;
    } catch (error) {
      console.error('Error fetching recommended jobs:', error);
      return [];
    }
  }

  async getCourseProgress(): Promise<CourseProgress[]> {
    try {
      const response = await restApiAuthUtil.get<CourseProgress[]>(`${this.baseUrl}/course-progress/`);
      return response;
    } catch (error) {
      console.error('Error fetching course progress:', error);
      return [];
    }
  }

  private getMockDashboardData(): DashboardData {
    return {
      stats: {
        coursesEnrolled: 3,
        problemsSolved: 47,
        contestsParticipated: 8,
        jobApplications: 12,
        skillTestsCompleted: 15,
        mockInterviewsCompleted: 5
      },
      recentActivity: [
        {
          id: 1,
          type: 'course',
          action: 'Completed lesson',
          target: 'Arrays and Strings - Array Fundamentals',
          time: '2 hours ago'
        },
        {
          id: 2,
          type: 'coding',
          action: 'Solved problem',
          target: 'Two Sum - Easy',
          time: '4 hours ago'
        },
        {
          id: 3,
          type: 'job',
          action: 'Applied to job',
          target: 'Frontend Developer at TechCorp',
          time: '1 day ago'
        },
        {
          id: 4,
          type: 'contest',
          action: 'Participated in contest',
          target: 'Weekly Coding Challenge #42',
          time: '2 days ago'
        }
      ],
      upcomingEvents: [
        {
          id: 1,
          title: 'Weekly Coding Contest',
          date: 'Today, 8:00 PM',
          type: 'contest',
          participants: 1250
        },
        {
          id: 2,
          title: 'Mock Interview Session',
          date: 'Tomorrow, 2:00 PM',
          type: 'interview',
          duration: '45 min'
        },
        {
          id: 3,
          title: 'TechCorp Hiring Drive',
          date: 'Dec 20, 10:00 AM',
          type: 'job',
          company: 'TechCorp'
        }
      ],
      recommendedJobs: [
        {
          id: 1,
          title: 'Frontend Developer',
          company: 'TechCorp',
          location: 'Remote',
          salary: '$80k - $120k',
          match: 95
        },
        {
          id: 2,
          title: 'Full Stack Engineer',
          company: 'StartupXYZ',
          location: 'San Francisco',
          salary: '$90k - $130k',
          match: 88
        }
      ],
      courseProgress: [
        {
          id: 1,
          name: 'Data Structures & Algorithms',
          progress: 75,
          totalLessons: 24,
          completedLessons: 18
        },
        {
          id: 2,
          name: 'Python Programming',
          progress: 60,
          totalLessons: 20,
          completedLessons: 12
        },
        {
          id: 3,
          name: 'Web Development',
          progress: 40,
          totalLessons: 30,
          completedLessons: 12
        }
      ]
    };
  }
}

export const studentDashboardService = new StudentDashboardService();
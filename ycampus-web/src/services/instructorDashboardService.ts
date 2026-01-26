import { RestApiUtil } from '@/utils/RestApiUtil';

export interface InstructorDashboardStats {
    coursesCreated: number;
    totalStudents: number;
    contestsHosted: number;
    skillTestsCreated: number;
    mockInterviewsCreated: number;
    totalQuestions: number;
}

export interface InstructorActivity {
    id: number;
    type: 'course' | 'student' | 'contest' | 'assessment' | 'interview';
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
    type: 'contest' | 'course' | 'meeting' | 'interview';
    participants?: number;
    duration?: string;
    attendees?: number;
}

export interface CourseAnalytics {
    id: number;
    name: string;
    studentsEnrolled: number;
    completionRate: number;
    avgScore: number;
}

export interface TopPerformer {
    id: number;
    name: string;
    course: string;
    score: number;
    progress: number;
}

export interface InstructorDashboardData {
    stats: InstructorDashboardStats;
    recentActivity: InstructorActivity[];
    upcomingEvents: UpcomingEvent[];
    courseProgress: CourseAnalytics[];
    topPerformers: TopPerformer[];
}

class InstructorDashboardService {
    private baseUrl = '/api/instructor/dashboard';

    async getDashboardData(): Promise<InstructorDashboardData> {
        try {
            const response = await RestApiUtil.get<InstructorDashboardData>(`${this.baseUrl}/`);
            return response;
        } catch (error) {
            console.error('Error fetching instructor dashboard data:', error);
            // Return mock data as fallback
            return this.getMockDashboardData();
        }
    }

    async getStats(): Promise<InstructorDashboardStats> {
        try {
            const response = await RestApiUtil.get<InstructorDashboardStats>(`${this.baseUrl}/stats/`);
            return response;
        } catch (error) {
            console.error('Error fetching instructor dashboard stats:', error);
            return {
                coursesCreated: 5,
                totalStudents: 247,
                contestsHosted: 12,
                skillTestsCreated: 28,
                mockInterviewsCreated: 15,
                totalQuestions: 156
            };
        }
    }

    async getRecentActivity(): Promise<InstructorActivity[]> {
        try {
            const response = await RestApiUtil.get<InstructorActivity[]>(`${this.baseUrl}/activity/`);
            return response;
        } catch (error) {
            console.error('Error fetching instructor recent activity:', error);
            return [];
        }
    }

    async getUpcomingEvents(): Promise<UpcomingEvent[]> {
        try {
            const response = await RestApiUtil.get<UpcomingEvent[]>(`${this.baseUrl}/events/`);
            return response;
        } catch (error) {
            console.error('Error fetching instructor upcoming events:', error);
            return [];
        }
    }

    async getCourseAnalytics(): Promise<CourseAnalytics[]> {
        try {
            const response = await RestApiUtil.get<CourseAnalytics[]>(`${this.baseUrl}/course-analytics/`);
            return response;
        } catch (error) {
            console.error('Error fetching course analytics:', error);
            return [];
        }
    }

    async getTopPerformers(): Promise<TopPerformer[]> {
        try {
            const response = await RestApiUtil.get<TopPerformer[]>(`${this.baseUrl}/top-performers/`);
            return response;
        } catch (error) {
            console.error('Error fetching top performers:', error);
            return [];
        }
    }

    private getMockDashboardData(): InstructorDashboardData {
        return {
            stats: {
                coursesCreated: 5,
                totalStudents: 247,
                contestsHosted: 12,
                skillTestsCreated: 28,
                mockInterviewsCreated: 15,
                totalQuestions: 156
            },
            recentActivity: [
                {
                    id: 1,
                    type: 'course',
                    action: 'Created new course',
                    target: 'Advanced React Patterns',
                    time: '2 hours ago'
                },
                {
                    id: 2,
                    type: 'student',
                    action: 'Student enrolled',
                    target: 'John Doe joined Python Fundamentals',
                    time: '4 hours ago'
                },
                {
                    id: 3,
                    type: 'contest',
                    action: 'Contest completed',
                    target: 'Weekly Algorithm Challenge #15',
                    time: '1 day ago'
                },
                {
                    id: 4,
                    type: 'assessment',
                    action: 'Skill test published',
                    target: 'JavaScript Fundamentals Assessment',
                    time: '2 days ago'
                }
            ],
            upcomingEvents: [
                {
                    id: 1,
                    title: 'Weekly Contest Review',
                    date: 'Today, 3:00 PM',
                    type: 'contest',
                    participants: 45
                },
                {
                    id: 2,
                    title: 'Course Content Review',
                    date: 'Tomorrow, 10:00 AM',
                    type: 'course',
                    duration: '2 hours'
                },
                {
                    id: 3,
                    title: 'Student Progress Meeting',
                    date: 'Dec 18, 2:00 PM',
                    type: 'meeting',
                    attendees: 8
                }
            ],
            courseProgress: [
                {
                    id: 1,
                    name: 'Data Structures & Algorithms',
                    studentsEnrolled: 89,
                    completionRate: 78,
                    avgScore: 85
                },
                {
                    id: 2,
                    name: 'Python Programming',
                    studentsEnrolled: 67,
                    completionRate: 82,
                    avgScore: 88
                },
                {
                    id: 3,
                    name: 'Web Development',
                    studentsEnrolled: 91,
                    completionRate: 65,
                    avgScore: 79
                }
            ],
            topPerformers: [
                {
                    id: 1,
                    name: 'Alice Johnson',
                    course: 'Python Programming',
                    score: 98,
                    progress: 95
                },
                {
                    id: 2,
                    name: 'Bob Smith',
                    course: 'Data Structures',
                    score: 94,
                    progress: 88
                },
                {
                    id: 3,
                    name: 'Carol Davis',
                    course: 'Web Development',
                    score: 92,
                    progress: 90
                }
            ]
        };
    }
}

export const instructorDashboardService = new InstructorDashboardService();
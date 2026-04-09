import restApiAuthUtil from '@/utils/RestApiAuthUtil';

export interface FacultyDashboardStats {
    subjectsCreated: number;
    totalStudents: number;
    contestsHosted: number;
    skillTestsCreated: number;
    mockInterviewsCreated: number;
    totalQuestions: number;
}

export interface FacultyActivity {
    id: number;
    type: 'subject' | 'student' | 'contest' | 'assessment' | 'interview';
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
    type: 'contest' | 'subject' | 'meeting' | 'interview';
    participants?: number;
    duration?: string;
    attendees?: number;
}

export interface SubjectAnalytics {
    id: number;
    name: string;
    studentsEnrolled: number;
    completionRate: number;
    avgScore: number;
}

export interface TopPerformer {
    id: number;
    name: string;
    subject: string;
    score: number;
    progress: number;
}

export interface FacultyDashboardData {
    stats: FacultyDashboardStats;
    recentActivity: FacultyActivity[];
    upcomingEvents: UpcomingEvent[];
    subjectProgress: SubjectAnalytics[];
    topPerformers: TopPerformer[];
}

class FacultyDashboardService {
    private baseUrl = '/admin/dashboard';

    async getDashboardData(): Promise<FacultyDashboardData> {
        try {
            const response = await restApiAuthUtil.get<FacultyDashboardData>(`${this.baseUrl}/`);
            return response;
        } catch (error) {
            console.error('Error fetching faculty dashboard data:', error);
            // Return mock data as fallback
            return this.getMockDashboardData();
        }
    }

    async getStats(): Promise<FacultyDashboardStats> {
        try {
            const response = await restApiAuthUtil.get<FacultyDashboardStats>(`${this.baseUrl}/stats/`);
            return response;
        } catch (error) {
            console.error('Error fetching faculty dashboard stats:', error);
            return {
                subjectsCreated: 5,
                totalStudents: 247,
                contestsHosted: 12,
                skillTestsCreated: 28,
                mockInterviewsCreated: 15,
                totalQuestions: 156
            };
        }
    }

    async getRecentActivity(): Promise<FacultyActivity[]> {
        // Return mock data directly for now since there's no backend endpoint
        // to prevent 404 console errors
        return Promise.resolve(this.getMockDashboardData().recentActivity);
    }

    async getUpcomingEvents(): Promise<UpcomingEvent[]> {
        try {
            const response = await restApiAuthUtil.get<UpcomingEvent[]>(`${this.baseUrl}/events/`);
            return response;
        } catch (error) {
            console.error('Error fetching faculty upcoming events:', error);
            return [];
        }
    }

    async getSubjectAnalytics(): Promise<SubjectAnalytics[]> {
        try {
            const response = await restApiAuthUtil.get<SubjectAnalytics[]>(`${this.baseUrl}/subject-analytics/`);
            return response;
        } catch (error) {
            console.error('Error fetching subject analytics:', error);
            return [];
        }
    }

    async getTopPerformers(): Promise<TopPerformer[]> {
        try {
            const response = await restApiAuthUtil.get<TopPerformer[]>(`${this.baseUrl}/top-performers/`);
            return response;
        } catch (error) {
            console.error('Error fetching top performers:', error);
            return [];
        }
    }

    private getMockDashboardData(): FacultyDashboardData {
        return {
            stats: {
                subjectsCreated: 5,
                totalStudents: 247,
                contestsHosted: 12,
                skillTestsCreated: 28,
                mockInterviewsCreated: 15,
                totalQuestions: 156
            },
            recentActivity: [
                {
                    id: 1,
                    type: 'subject',
                    action: 'Created new subject',
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
                    type: 'subject',
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
            subjectProgress: [
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
                    subject: 'Python Programming',
                    score: 98,
                    progress: 95
                },
                {
                    id: 2,
                    name: 'Bob Smith',
                    subject: 'Data Structures',
                    score: 94,
                    progress: 88
                },
                {
                    id: 3,
                    name: 'Carol Davis',
                    subject: 'Web Development',
                    score: 92,
                    progress: 90
                }
            ]
        };
    }
}

export const facultyDashboardService = new FacultyDashboardService();
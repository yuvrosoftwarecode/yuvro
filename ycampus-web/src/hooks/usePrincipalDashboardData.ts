import { useQuery } from '@tanstack/react-query';
import { collegeService } from '@/services/collegeService';
import { useAuth } from '@/contexts/AuthContext';

export interface InstitutionSummary {
  totalStudents: number;
  totalFaculty: number;
  totalDepartments: number;
  totalSections: number;
  avgPI: number;
  avgAssessmentScore: number;
  taskCompletion: number;
  overallAttendance: number;
  notesCompletion: number;
  activeStudents: number;
  avgPRI: number;
  interviewReady: number;
}

export interface DepartmentRanking {
  name: string;
  totalStudents: number;
  avgPI: number;
  attendance: number;
  assessmentAvg: number;
  avgPRI: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SemesterPerformance {
  semester: number;
  totalStudents: number;
  avgPI: number;
  attendance: number;
  assessmentAvg: number;
  riskStudents: number;
}

export interface SectionIntelligence {
  name: string;
  department: string;
  semester: number;
  pi: number;
  attendance: number;
}

export interface StudentDistribution {
  excellent: number;
  good: number;
  moderate: number;
  atRisk: number;
}

export interface PRIInsights {
  avgPRI: number;
  interviewReady: number;
  almostReady: number;
  needsImprovement: number;
  coreSubjects: number;
  mockInterview: number;
  aptitude: number;
  logicalReasoning: number;
  communication: number;
}

export interface RiskAlert {
  category: string;
  type: 'academic' | 'engagement' | 'placement' | 'operational';
  count: number;
  severity: 'warning' | 'critical';
  description: string;
}

export interface TrendPoint {
  month: string;
  pi: number;
  attendance: number;
  assessment: number;
  pri: number;
}

export interface SubjectAnalytics {
  name: string;
  avgScore: number;
  passRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface FacultyImpact {
  name: string;
  sections: string[];
  avgStudentPI: number;
  subjectAvg: number;
  fpiScore: number;
}

export interface AttendanceOverview {
  overall: number;
  departmentWise: { name: string; attendance: number }[];
  lowAlerts: { student: string; section: string; attendance: number }[];
}

export interface AIInsight {
  type: 'warning' | 'suggestion' | 'info';
  title: string;
  description: string;
}

export interface PrincipalDashboardData {
  summary: InstitutionSummary;
  departmentRanking: DepartmentRanking[];
  semesterPerformance: SemesterPerformance[];
  topSections: SectionIntelligence[];
  bottomSections: SectionIntelligence[];
  studentDistribution: StudentDistribution;
  priInsights: PRIInsights;
  riskAlerts: RiskAlert[];
  trends: TrendPoint[];
  strongSubjects: SubjectAnalytics[];
  weakSubjects: SubjectAnalytics[];
  facultyImpact: FacultyImpact[];
  attendanceOverview: AttendanceOverview;
  aiInsights: AIInsight[];
}

export function usePrincipalDashboardData(filters: {
  academicYear: string;
  department: string;
  semester: string;
  batch: string;
  dateRange: string;
}) {
  const { user } = useAuth();
  
  // Extract college ID matching other principal hooks
  const collegeId = (user as any)?.college_id || user?.college?.id || user?.college;

  return useQuery({
    queryKey: ['principal-dashboard', filters, collegeId],
    queryFn: async (): Promise<PrincipalDashboardData> => {
      if (!collegeId) {
        throw new Error("No college associated with this user.");
      }
      return await collegeService.getDashboardStats(collegeId, filters);
    },
    enabled: !!collegeId,
  });
}

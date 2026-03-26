import { useQuery } from '@tanstack/react-query';

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
  return useQuery({
    queryKey: ['principal-dashboard', filters],
    queryFn: async (): Promise<PrincipalDashboardData> => {
      await new Promise(r => setTimeout(r, 400));

      const summary: InstitutionSummary = {
        totalStudents: 2450,
        totalFaculty: 128,
        totalDepartments: 6,
        totalSections: 48,
        avgPI: 74,
        avgAssessmentScore: 71,
        taskCompletion: 68,
        overallAttendance: 82,
        notesCompletion: 61,
        activeStudents: 89,
        avgPRI: 62,
        interviewReady: 34,
      };

      const departmentRanking: DepartmentRanking[] = [
        { name: 'Computer Science', totalStudents: 620, avgPI: 82, attendance: 87, assessmentAvg: 78, avgPRI: 71, riskLevel: 'low' },
        { name: 'Electronics & Comm.', totalStudents: 480, avgPI: 76, attendance: 83, assessmentAvg: 73, avgPRI: 64, riskLevel: 'low' },
        { name: 'Information Technology', totalStudents: 390, avgPI: 73, attendance: 80, assessmentAvg: 70, avgPRI: 60, riskLevel: 'medium' },
        { name: 'Mechanical', totalStudents: 340, avgPI: 68, attendance: 78, assessmentAvg: 65, avgPRI: 52, riskLevel: 'medium' },
        { name: 'Civil', totalStudents: 310, avgPI: 64, attendance: 75, assessmentAvg: 62, avgPRI: 48, riskLevel: 'high' },
        { name: 'Electrical', totalStudents: 310, avgPI: 62, attendance: 73, assessmentAvg: 60, avgPRI: 45, riskLevel: 'high' },
      ];

      const semesterPerformance: SemesterPerformance[] = [
        { semester: 1, totalStudents: 420, avgPI: 70, attendance: 84, assessmentAvg: 68, riskStudents: 38 },
        { semester: 2, totalStudents: 410, avgPI: 72, attendance: 82, assessmentAvg: 70, riskStudents: 32 },
        { semester: 3, totalStudents: 380, avgPI: 68, attendance: 79, assessmentAvg: 65, riskStudents: 45 },
        { semester: 4, totalStudents: 360, avgPI: 74, attendance: 81, assessmentAvg: 72, riskStudents: 28 },
        { semester: 5, totalStudents: 340, avgPI: 78, attendance: 85, assessmentAvg: 75, riskStudents: 22 },
        { semester: 6, totalStudents: 320, avgPI: 80, attendance: 86, assessmentAvg: 78, riskStudents: 18 },
        { semester: 7, totalStudents: 120, avgPI: 82, attendance: 88, assessmentAvg: 80, riskStudents: 8 },
        { semester: 8, totalStudents: 100, avgPI: 84, attendance: 90, assessmentAvg: 82, riskStudents: 5 },
      ];

      const topSections: SectionIntelligence[] = [
        { name: 'CSE-6A', department: 'Computer Science', semester: 6, pi: 88, attendance: 92 },
        { name: 'CSE-8A', department: 'Computer Science', semester: 8, pi: 86, attendance: 91 },
        { name: 'ECE-6A', department: 'Electronics & Comm.', semester: 6, pi: 84, attendance: 89 },
        { name: 'IT-5A', department: 'Information Technology', semester: 5, pi: 82, attendance: 88 },
        { name: 'CSE-5B', department: 'Computer Science', semester: 5, pi: 81, attendance: 87 },
      ];

      const bottomSections: SectionIntelligence[] = [
        { name: 'EE-3B', department: 'Electrical', semester: 3, pi: 54, attendance: 68 },
        { name: 'CE-3A', department: 'Civil', semester: 3, pi: 56, attendance: 70 },
        { name: 'ME-3B', department: 'Mechanical', semester: 3, pi: 58, attendance: 71 },
        { name: 'EE-1B', department: 'Electrical', semester: 1, pi: 60, attendance: 72 },
        { name: 'CE-1A', department: 'Civil', semester: 1, pi: 61, attendance: 73 },
      ];

      const studentDistribution: StudentDistribution = {
        excellent: 412,
        good: 834,
        moderate: 728,
        atRisk: 476,
      };

      const priInsights: PRIInsights = {
        avgPRI: 62,
        interviewReady: 34,
        almostReady: 28,
        needsImprovement: 38,
        coreSubjects: 68,
        mockInterview: 55,
        aptitude: 62,
        logicalReasoning: 59,
        communication: 52,
      };

      const riskAlerts: RiskAlert[] = [
        { category: 'Low PI Students', type: 'academic', count: 476, severity: 'critical', description: '476 students below PI 55' },
        { category: 'Low Assessment Scores', type: 'academic', count: 312, severity: 'warning', description: '312 students scoring below 50% in assessments' },
        { category: 'Low Attendance', type: 'engagement', count: 287, severity: 'critical', description: '287 students below 75% attendance' },
        { category: 'Low Notes Completion', type: 'engagement', count: 524, severity: 'warning', description: '524 students below 50% notes completion' },
        { category: 'Low PRI', type: 'placement', count: 931, severity: 'critical', description: '931 students with PRI below 50' },
        { category: 'Low Mock Interview', type: 'placement', count: 648, severity: 'warning', description: '648 students scored below 40% in mock interviews' },
        { category: 'Pending Tasks', type: 'operational', count: 1230, severity: 'warning', description: '1230 tasks pending across institution' },
        { category: 'Weak Sections', type: 'operational', count: 8, severity: 'critical', description: '8 sections with avg PI below 60' },
      ];

      const trends: TrendPoint[] = [
        { month: 'Aug', pi: 68, attendance: 78, assessment: 64, pri: 54 },
        { month: 'Sep', pi: 70, attendance: 80, assessment: 66, pri: 56 },
        { month: 'Oct', pi: 72, attendance: 82, assessment: 69, pri: 58 },
        { month: 'Nov', pi: 71, attendance: 80, assessment: 68, pri: 59 },
        { month: 'Dec', pi: 73, attendance: 81, assessment: 70, pri: 60 },
        { month: 'Jan', pi: 74, attendance: 82, assessment: 71, pri: 62 },
        { month: 'Feb', pi: 75, attendance: 83, assessment: 72, pri: 63 },
        { month: 'Mar', pi: 74, attendance: 82, assessment: 71, pri: 62 },
      ];

      const strongSubjects: SubjectAnalytics[] = [
        { name: 'Data Structures', avgScore: 82, passRate: 94, trend: 'up' },
        { name: 'Computer Networks', avgScore: 78, passRate: 91, trend: 'stable' },
        { name: 'Database Systems', avgScore: 77, passRate: 90, trend: 'up' },
        { name: 'Digital Electronics', avgScore: 75, passRate: 88, trend: 'stable' },
      ];

      const weakSubjects: SubjectAnalytics[] = [
        { name: 'Operating Systems', avgScore: 54, passRate: 62, trend: 'down' },
        { name: 'Thermodynamics', avgScore: 52, passRate: 58, trend: 'down' },
        { name: 'Structural Analysis', avgScore: 50, passRate: 55, trend: 'stable' },
        { name: 'Control Systems', avgScore: 48, passRate: 52, trend: 'down' },
      ];

      const facultyImpact: FacultyImpact[] = [
        { name: 'Dr. Sharma', sections: ['CSE-6A', 'CSE-5B'], avgStudentPI: 84, subjectAvg: 81, fpiScore: 83 },
        { name: 'Prof. Verma', sections: ['ECE-6A', 'ECE-5A'], avgStudentPI: 80, subjectAvg: 77, fpiScore: 79 },
        { name: 'Dr. Gupta', sections: ['IT-5A', 'IT-4A'], avgStudentPI: 78, subjectAvg: 75, fpiScore: 77 },
        { name: 'Prof. Singh', sections: ['ME-3A', 'ME-3B'], avgStudentPI: 62, subjectAvg: 60, fpiScore: 61 },
        { name: 'Dr. Patel', sections: ['CE-3A', 'CE-1A'], avgStudentPI: 58, subjectAvg: 55, fpiScore: 57 },
        { name: 'Prof. Kumar', sections: ['EE-3B', 'EE-1B'], avgStudentPI: 56, subjectAvg: 53, fpiScore: 55 },
      ];

      const attendanceOverview: AttendanceOverview = {
        overall: 82,
        departmentWise: [
          { name: 'Computer Science', attendance: 87 },
          { name: 'Electronics & Comm.', attendance: 83 },
          { name: 'Information Technology', attendance: 80 },
          { name: 'Mechanical', attendance: 78 },
          { name: 'Civil', attendance: 75 },
          { name: 'Electrical', attendance: 73 },
        ],
        lowAlerts: [
          { student: 'Rahul Verma', section: 'EE-3B', attendance: 58 },
          { student: 'Sneha Patel', section: 'CE-3A', attendance: 62 },
          { student: 'Amit Kumar', section: 'ME-3B', attendance: 64 },
          { student: 'Priya Singh', section: 'EE-1B', attendance: 66 },
          { student: 'Deepak Sharma', section: 'CE-1A', attendance: 68 },
        ],
      };

      const aiInsights: AIInsight[] = [
        { type: 'warning', title: 'Semester 3 Underperforming', description: 'Semester 3 has the lowest avg PI (68) across all departments. Consider targeted mentoring programs.' },
        { type: 'warning', title: 'Electrical Dept. Needs Attention', description: 'Electrical department has the lowest attendance (73%) and PI (62). Faculty performance review recommended.' },
        { type: 'warning', title: 'Communication Skills Gap', description: 'Average communication score is only 52%. Add dedicated communication skill workshops.' },
        { type: 'suggestion', title: 'Increase Mock Interviews', description: 'Only 34% students are interview ready. Schedule weekly mock interview sessions for Sem 5–8.' },
        { type: 'suggestion', title: 'Core Subject Training', description: 'Operating Systems and Thermodynamics have pass rates below 65%. Arrange remedial classes.' },
        { type: 'suggestion', title: 'Attendance Enforcement', description: '287 students below 75% attendance. Implement parent notification system for low attendance.' },
        { type: 'suggestion', title: 'Faculty Development', description: 'Sections under Prof. Kumar and Dr. Patel consistently underperform. Consider faculty training programs.' },
        { type: 'info', title: 'CSE Leading Performance', description: 'Computer Science department leads with 82 avg PI and 87% attendance. Replicate their practices across departments.' },
        { type: 'info', title: 'Senior Semesters Improving', description: 'Semesters 7 and 8 show consistent upward trend in PI and assessment scores.' },
      ];

      return {
        summary,
        departmentRanking,
        semesterPerformance,
        topSections,
        bottomSections,
        studentDistribution,
        priInsights,
        riskAlerts,
        trends,
        strongSubjects,
        weakSubjects,
        facultyImpact,
        attendanceOverview,
        aiInsights,
      };
    },
  });
}

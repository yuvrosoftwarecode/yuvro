// Dummy data hook for HOD Dashboard - structured as if from backend
export interface StudentData {
  id: string;
  name: string;
  semester: number;
  section: string;
  performanceIndex: number;
  attendance: number;
  assessmentAvg: number;
  taskCompletion: number;
  notesCompletion: number;
  testAvg: number;
  mockInterviewScore: number;
  weakSubjects: string[];
  strongSubjects: string[];
}

export interface SectionData {
  id: string;
  name: string;
  semester: number;
  totalStudents: number;
  spiValue: number;
  attendance: number;
  assessmentAvg: number;
  taskCompletion: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  students: StudentData[];
  facultyName: string;
}

export interface SemesterData {
  semester: number;
  totalStudents: number;
  avgPerformanceIndex: number;
  avgAttendance: number;
  avgAssessmentScore: number;
  taskCompletion: number;
  sections: SectionData[];
  riskStudents: number;
  strongSubjects: string[];
  weakSubjects: string[];
}

export interface TrendPoint {
  month: string;
  performanceIndex: number;
  attendance: number;
  assessmentAvg: number;
  testAvg: number;
}

export interface InsightItem {
  label: string;
  value: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

export interface AttendanceShortageStudent {
  id: string;
  name: string;
  section: string;
  semester: number;
  attendance: number;
  missedClasses: number;
}

export interface SubjectAnalytics {
  name: string;
  code: string;
  avgScore: number;
  passRate: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  semester: number;
}

export interface FacultyPerformance {
  id: string;
  name: string;
  sections: string[];
  subjects: string[];
  avgStudentPI: number;
  avgAttendance: number;
  avgAssessmentScore: number;
  fpiScore: number;
}

export interface PlacementReadiness {
  totalPreparing: number;
  interviewReady: number;
  needsPreparation: number;
  weakInDSA: number;
  companyWise: { company: string; students: number }[];
}

export interface AssessmentReport {
  subject: string;
  sectionAvg: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  semester: number;
}

export interface TestAnalytics {
  avgTestScore: number;
  easyAccuracy: number;
  mediumAccuracy: number;
  hardAccuracy: number;
  totalTestsTaken: number;
  avgAccuracy: number;
}

export interface PRIBreakdown {
  coreSubjects: number;
  mockInterviews: number;
  aptitude: number;
  logicalReasoning: number;
  communication: number;
}

export interface PRIData {
  avgPRI: number;
  readyPct: number;
  almostReadyPct: number;
  needsImprovementPct: number;
  breakdown: PRIBreakdown;
  studentPRIs: { id: string; pri: number }[];
  sectionPRIs: { sectionId: string; pri: number }[];
  semesterPRIs: { semester: number; pri: number }[];
  trendPRI: { month: string; pri: number }[];
}

const subjectPool = ['Data Structures', 'Algorithms', 'DBMS', 'Operating Systems', 'Computer Networks', 'Software Engineering', 'Machine Learning', 'Web Development', 'Discrete Mathematics', 'Digital Logic', 'Theory of Computation', 'Compiler Design'];
const facultyNames = ['Dr. Rajesh Sharma', 'Prof. Meena Iyer', 'Dr. Suresh Patel', 'Prof. Kavitha Rao', 'Dr. Amit Gupta', 'Prof. Lakshmi Nair', 'Dr. Prakash Joshi', 'Prof. Sunita Verma', 'Dr. Arun Kumar', 'Prof. Deepa Mishra', 'Dr. Venkat Reddy', 'Prof. Anita Singh'];

const generateStudents = (semester: number, section: string, count: number): StudentData[] => {
  const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Myra', 'Sara', 'Aadhya', 'Ira', 'Aanya', 'Riya', 'Navya', 'Prisha', 'Kabir', 'Shaurya', 'Atharv', 'Advait', 'Dhruv', 'Yash', 'Parth', 'Arnav', 'Rudra', 'Daksh', 'Meera', 'Tara', 'Kavya', 'Neha', 'Pooja', 'Ritika', 'Sneha', 'Tanvi', 'Zara', 'Kiara'];
  const lastNames = ['Sharma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Joshi', 'Gupta', 'Mishra', 'Verma', 'Iyer', 'Nair', 'Rao', 'Desai', 'Mehta', 'Shah'];
  const weakOptions = ['Dynamic Programming', 'Graph Algorithms', 'Operating Systems', 'Compiler Design', 'Theory of Computation'];
  const strongOptions = ['Arrays', 'Sorting Algorithms', 'Basic DBMS', 'Data Structures', 'Web Development'];

  return Array.from({ length: count }, (_, i) => {
    const pi = Math.round(40 + Math.random() * 55);
    return {
      id: `s-${semester}-${section}-${i}`,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      semester,
      section,
      performanceIndex: pi,
      attendance: Math.round(55 + Math.random() * 40),
      assessmentAvg: Math.round(45 + Math.random() * 50),
      taskCompletion: Math.round(50 + Math.random() * 45),
      notesCompletion: Math.round(40 + Math.random() * 55),
      testAvg: Math.round(45 + Math.random() * 50),
      mockInterviewScore: Math.round(30 + Math.random() * 60),
      weakSubjects: weakOptions.sort(() => Math.random() - 0.5).slice(0, 2),
      strongSubjects: strongOptions.sort(() => Math.random() - 0.5).slice(0, 2),
    };
  });
};

const getRiskLevel = (spi: number, attendance: number, students: StudentData[]): 'Low' | 'Medium' | 'High' => {
  const riskStudents = students.filter(s => s.performanceIndex < 60).length;
  const riskPct = (riskStudents / students.length) * 100;
  if (attendance < 75 && spi < 60) return 'High';
  if (riskPct > 30) return 'High';
  if (attendance < 75 || spi < 60) return 'Medium';
  return 'Low';
};

const buildSections = (semester: number): SectionData[] => {
  const sectionNames = ['A', 'B', 'C'];
  return sectionNames.map((name, idx) => {
    const count = 40 + Math.floor(Math.random() * 25);
    const students = generateStudents(semester, name, count);
    const spi = Math.round(students.reduce((a, s) => a + s.performanceIndex, 0) / students.length);
    const att = Math.round(students.reduce((a, s) => a + s.attendance, 0) / students.length);
    const aAvg = Math.round(students.reduce((a, s) => a + s.assessmentAvg, 0) / students.length);
    const tc = Math.round(students.reduce((a, s) => a + s.taskCompletion, 0) / students.length);
    return {
      id: `sec-${semester}-${name}`,
      name: `Section ${name}`,
      semester,
      totalStudents: count,
      spiValue: spi,
      attendance: att,
      assessmentAvg: aAvg,
      taskCompletion: tc,
      riskLevel: getRiskLevel(spi, att, students),
      students,
      facultyName: facultyNames[(semester * 3 + idx) % facultyNames.length],
    };
  });
};

let _cachedData: ReturnType<typeof buildAllData> | null = null;

function buildAllData() {
  const semesters: SemesterData[] = [1, 2, 3, 4, 5, 6].map(sem => {
    const sections = buildSections(sem);
    const allStudents = sections.flatMap(s => s.students);
    const riskStudents = allStudents.filter(s => s.performanceIndex < 60).length;
    const semSubjects = subjectPool.slice((sem - 1) * 2, (sem - 1) * 2 + 3);
    return {
      semester: sem,
      totalStudents: allStudents.length,
      avgPerformanceIndex: Math.round(sections.reduce((a, s) => a + s.spiValue, 0) / sections.length),
      avgAttendance: Math.round(sections.reduce((a, s) => a + s.attendance, 0) / sections.length),
      avgAssessmentScore: Math.round(sections.reduce((a, s) => a + s.assessmentAvg, 0) / sections.length),
      taskCompletion: Math.round(sections.reduce((a, s) => a + s.taskCompletion, 0) / sections.length),
      sections,
      riskStudents,
      strongSubjects: [semSubjects[0] || 'Data Structures'],
      weakSubjects: [semSubjects[2] || 'Operating Systems'],
    };
  });

  const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  let basePi = 62;
  const trends: TrendPoint[] = months.map(month => {
    basePi += Math.round(-3 + Math.random() * 6);
    return {
      month,
      performanceIndex: Math.min(95, Math.max(55, basePi)),
      attendance: Math.round(72 + Math.random() * 18),
      assessmentAvg: Math.round(58 + Math.random() * 25),
      testAvg: Math.round(55 + Math.random() * 30),
    };
  });

  const allSections = semesters.flatMap(s => s.sections);
  const allStudents = allSections.flatMap(s => s.students);

  // Attendance shortage
  const attendanceShortage: AttendanceShortageStudent[] = allStudents
    .filter(s => s.attendance < 75)
    .sort((a, b) => a.attendance - b.attendance)
    .slice(0, 20)
    .map(s => ({
      id: s.id,
      name: s.name,
      section: `CSE-${s.semester}${s.section}`,
      semester: s.semester,
      attendance: s.attendance,
      missedClasses: Math.round((100 - s.attendance) * 0.6),
    }));

  // Subject analytics
  const subjectAnalytics: SubjectAnalytics[] = subjectPool.map((name, i) => ({
    name,
    code: `CS${100 + i * 10}`,
    avgScore: Math.round(50 + Math.random() * 40),
    passRate: Math.round(60 + Math.random() * 35),
    difficulty: (['Easy', 'Medium', 'Hard'] as const)[i % 3],
    semester: (i % 6) + 1,
  }));

  // Faculty performance — each faculty teaches 2-3 subjects, FPI = avg across all subjects
  const facultyPerformance: FacultyPerformance[] = facultyNames.map((name, i) => {
    const subjectCount = 2 + (i % 2); // 2 or 3 subjects
    const assignedSubjects = Array.from({ length: subjectCount }, (_, j) => subjectPool[(i + j) % subjectPool.length]);
    const subjectScores = assignedSubjects.map(() => Math.round(55 + Math.random() * 35));
    const fpi = Math.round(subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length);
    return {
      id: `f-${i}`,
      name,
      sections: [`CSE-${(i % 6) + 1}${['A', 'B', 'C'][i % 3]}`],
      subjects: assignedSubjects,
      avgStudentPI: Math.round(55 + Math.random() * 35),
      avgAttendance: Math.round(70 + Math.random() * 25),
      avgAssessmentScore: Math.round(55 + Math.random() * 35),
      fpiScore: fpi,
    };
  });

  // Placement readiness
  const placementReadiness: PlacementReadiness = {
    totalPreparing: 185,
    interviewReady: 72,
    needsPreparation: 113,
    weakInDSA: 68,
    companyWise: [
      { company: 'Amazon', students: 45 },
      { company: 'Google', students: 18 },
      { company: 'Microsoft', students: 22 },
      { company: 'TCS', students: 120 },
      { company: 'Infosys', students: 95 },
      { company: 'Wipro', students: 78 },
    ],
  };

  // Assessment reports
  const assessmentReports: AssessmentReport[] = subjectPool.slice(0, 8).map((subject, i) => ({
    subject,
    sectionAvg: Math.round(50 + Math.random() * 40),
    passRate: Math.round(55 + Math.random() * 40),
    highestScore: Math.round(85 + Math.random() * 15),
    lowestScore: Math.round(15 + Math.random() * 25),
    semester: (i % 6) + 1,
  }));

  // Test analytics
  const testAnalytics: TestAnalytics = {
    avgTestScore: 67,
    easyAccuracy: 82,
    mediumAccuracy: 64,
    hardAccuracy: 41,
    totalTestsTaken: 1240,
    avgAccuracy: 62,
  };

  // PRI data
  const studentPRIs = allStudents.map(s => ({
    id: s.id,
    pri: Math.round(s.performanceIndex * 0.4 + s.mockInterviewScore * 0.3 + s.testAvg * 0.15 + s.assessmentAvg * 0.15),
  }));

  const avgPRI = Math.round(studentPRIs.reduce((a, b) => a + b.pri, 0) / studentPRIs.length);
  const readyPct = Math.round((studentPRIs.filter(s => s.pri >= 85).length / studentPRIs.length) * 100);
  const almostReadyPct = Math.round((studentPRIs.filter(s => s.pri >= 70 && s.pri < 85).length / studentPRIs.length) * 100);
  const needsImprovementPct = Math.round((studentPRIs.filter(s => s.pri < 70).length / studentPRIs.length) * 100);

  const sectionPRIs = allSections.map(sec => {
    const secStudentPRIs = studentPRIs.filter(sp => sec.students.some(st => st.id === sp.id));
    return {
      sectionId: sec.id,
      pri: secStudentPRIs.length > 0 ? Math.round(secStudentPRIs.reduce((a, b) => a + b.pri, 0) / secStudentPRIs.length) : 0,
    };
  });

  const semesterPRIs = semesters.map(sem => {
    const semStudents = sem.sections.flatMap(s => s.students);
    const semPRIs = studentPRIs.filter(sp => semStudents.some(st => st.id === sp.id));
    return {
      semester: sem.semester,
      pri: semPRIs.length > 0 ? Math.round(semPRIs.reduce((a, b) => a + b.pri, 0) / semPRIs.length) : 0,
    };
  });

  let basePri = 62;
  const trendPRI = months.map(month => {
    basePri += Math.round(-2 + Math.random() * 5);
    return { month, pri: Math.min(90, Math.max(50, basePri)) };
  });

  const priData: PRIData = {
    avgPRI,
    readyPct,
    almostReadyPct,
    needsImprovementPct,
    breakdown: {
      coreSubjects: Math.round(60 + Math.random() * 25),
      mockInterviews: Math.round(45 + Math.random() * 30),
      aptitude: Math.round(55 + Math.random() * 30),
      logicalReasoning: Math.round(50 + Math.random() * 30),
      communication: Math.round(40 + Math.random() * 35),
    },
    studentPRIs,
    sectionPRIs,
    semesterPRIs,
    trendPRI,
  };

  return { semesters, trends, attendanceShortage, subjectAnalytics, facultyPerformance, placementReadiness, assessmentReports, testAnalytics, priData };
}

const buildData = () => {
  if (_cachedData) return _cachedData;
  _cachedData = buildAllData();
  return _cachedData;
};

export function useHODDashboardData(filters: {
  academicYear: string;
  semester: string;
  batch: string;
  dateRange: string;
}) {
  const data = buildData();
  const { semesters, trends, attendanceShortage, subjectAnalytics, facultyPerformance, placementReadiness, assessmentReports, testAnalytics, priData } = data;

  const filteredSemesters = filters.semester === 'all'
    ? semesters
    : semesters.filter(s => s.semester === Number(filters.semester));

  const allSections = filteredSemesters.flatMap(s => s.sections);
  const allStudents = allSections.flatMap(s => s.students);

  const totalStudents = allStudents.length;
  const totalFaculty = 24;
  const totalSections = allSections.length;
  const dpi = allSections.length > 0 ? Math.round(allSections.reduce((a, s) => a + s.spiValue, 0) / allSections.length) : 0;
  const overallAttendance = allSections.length > 0 ? Math.round(allSections.reduce((a, s) => a + s.attendance, 0) / allSections.length) : 0;
  const overallTaskCompletion = allSections.length > 0 ? Math.round(allSections.reduce((a, s) => a + s.taskCompletion, 0) / allSections.length) : 0;
  const overallAssessmentAvg = allSections.length > 0 ? Math.round(allSections.reduce((a, s) => a + s.assessmentAvg, 0) / allSections.length) : 0;

  const rankedSections = [...allSections].sort((a, b) => b.spiValue - a.spiValue);
  const semesterComparison = [...filteredSemesters].sort((a, b) => b.avgPerformanceIndex - a.avgPerformanceIndex);

  const riskStudentsCount = allStudents.filter(s => s.performanceIndex < 60).length;
  const lowAttSections = allSections.filter(s => s.attendance < 75);
  const lowAssessmentSections = allSections.filter(s => s.assessmentAvg < 60);

  const bestSection = rankedSections[0];
  const worstAttSection = [...allSections].sort((a, b) => a.attendance - b.attendance)[0];
  const highestRiskSection = [...allSections].sort((a, b) => {
    const aRisk = a.students.filter(s => s.performanceIndex < 60).length / a.students.length;
    const bRisk = b.students.filter(s => s.performanceIndex < 60).length / b.students.length;
    return bRisk - aRisk;
  })[0];

  const insights: InsightItem[] = [];
  if (bestSection) insights.push({ label: 'Best Performing Section', value: `${bestSection.name} – Semester ${bestSection.semester}`, type: 'success' });
  if (worstAttSection) insights.push({ label: 'Lowest Attendance Section', value: `${worstAttSection.name} – Semester ${worstAttSection.semester}`, type: 'warning' });
  if (semesterComparison[0]) insights.push({ label: 'Strongest Semester', value: `Semester ${semesterComparison[0].semester}`, type: 'success' });
  if (highestRiskSection) insights.push({ label: 'Highest Risk Group', value: `${highestRiskSection.name} – Semester ${highestRiskSection.semester}`, type: 'danger' });

  // Extra insights
  const weakSubjectInsight = subjectAnalytics.sort((a, b) => a.passRate - b.passRate)[0];
  if (weakSubjectInsight) insights.push({ label: 'Highest Failure Rate Subject', value: weakSubjectInsight.name, type: 'danger' });
  insights.push({ label: 'Placement Ready Students', value: `${placementReadiness.interviewReady} of ${placementReadiness.totalPreparing}`, type: 'info' });
  insights.push({ label: 'Attendance Shortage Students', value: `${attendanceShortage.length} students below 75%`, type: 'warning' });
  const topFaculty = [...facultyPerformance].sort((a, b) => b.avgStudentPI - a.avgStudentPI)[0];
  if (topFaculty) insights.push({ label: 'Top Faculty (by Student PI)', value: topFaculty.name, type: 'success' });

  // PRI insights
  if (priData.breakdown.mockInterviews < 55) insights.push({ label: 'Mock Interview Gap', value: 'Mock interview performance is low across department', type: 'danger' });
  if (priData.breakdown.communication < 55) insights.push({ label: 'Communication Skills', value: 'Communication skills affecting placement readiness', type: 'warning' });
  if (priData.breakdown.coreSubjects >= 70 && priData.breakdown.mockInterviews < 60) insights.push({ label: 'PRI Insight', value: 'Core subjects strong but interview readiness is weak', type: 'warning' });
  const lowPRISections = priData.sectionPRIs.filter(s => s.pri < 65);
  if (lowPRISections.length > 0) insights.push({ label: 'Low PRI Sections', value: `${lowPRISections.length} sections below 65 PRI`, type: 'danger' });
  const lowPRIStudents = priData.studentPRIs.filter(s => s.pri < 55).length;
  if (lowPRIStudents > 0) insights.push({ label: 'Low PRI Students', value: `${lowPRIStudents} students with PRI below 55`, type: 'danger' });

  return {
    summary: { totalStudents, totalFaculty, totalSections, dpi, overallAttendance, overallTaskCompletion, overallAssessmentAvg },
    rankedSections,
    semesterComparison,
    trends,
    risk: { riskStudentsCount, lowAttSections, lowAssessmentSections },
    insights,
    allSections,
    attendanceShortage,
    subjectAnalytics,
    facultyPerformance,
    placementReadiness,
    assessmentReports,
    testAnalytics,
    filteredSemesters,
    allStudents,
    priData,
  };
}

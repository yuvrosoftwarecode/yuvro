import { useState, useEffect, useCallback } from 'react';
import adminApiService from '@/services/api';
import studentService from '@/services/studentService';
import { getFacultyAssignments, SectionSubjectFaculty } from '@/services/subjectService';

export interface ReportFilters {
  academicYear: string;
  semester: string;
  batchId: string;
  studentId: string;
  subjectFilter: string;
  dateRange: string;
}

export interface SubjectPerformance {
  id: string;
  name: string;
  code: string;
  notesCompletion: number;
  testAvgScore: number;
  assessmentAvgScore: number;
  tasksTotal: number;
  tasksSubmitted: number;
  tasksPending: number;
  attendancePercent: number;
  strength: 'Strong' | 'Average' | 'Weak';
  risk: 'Low' | 'Medium' | 'High';
  totalChapters: number;
  chaptersCompleted: number;
  chaptersPending: number;
  topicsNotOpened: number;
  lastLearningDate: string | null;
  learningStreak: number;
  testsAttempted: number;
  easyAvg: number;
  mediumAvg: number;
  hardAvg: number;
  accuracy: number;
  trend: 'improving' | 'declining' | 'stable';
  assessmentsTotal: number;
  assessmentsCompleted: number;
  assessmentsInProgress: number;
  assessmentsPending: number;
  assessmentScores: { name: string; score: number; date: string }[];
  tasksOnTime: number;
  tasksLate: number;
  classesHeld: number;
  classesAttended: number;
  missedSessions: number;
}

export interface StudentReport {
  studentName: string;
  rollNumber: string;
  program: string;
  semester: string;
  section: string;
  performanceIndex: number;
  status: 'On Track' | 'Needs Attention' | 'At Risk';
  overallAttendance: number;
  learningCompletion: number;
  subjects: SubjectPerformance[];
  strongestSubject: string;
  weakestSubject: string;
  highestPendingSubject: string;
  lowestAttendanceSubject: string;
  performanceGap: number;
  activeLearningDays: number;
  currentStreak: number;
  longestStreak: number;
  badges: { name: string; earned: boolean; icon: string }[];
  timeline: { date: string; event: string; subject: string; type: string }[];
  remarks: { text: string; date: string; by: string; subject?: string }[];
}

export interface BatchStudent {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  department_id?: string | number;
  department_name?: string;
  semester_number?: number;
  batch_name?: string;
  section_name?: string;
}

// Note: SectionSubjectFaculty is now imported from subjectService MS.

export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

export interface CourseOption {
  id: string;
  name: string;
  code: string;
  semester: number;
}

export interface BatchOption {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
}

// ── Dummy data ──────────────────────────────────────────────────────

const DUMMY_STUDENTS: BatchStudent[] = [
  { id: 'demo-1', name: 'Aarav Sharma', rollNo: 'CSE2101', email: 'aarav.sharma@yuvro.edu' },
  { id: 'demo-2', name: 'Priya Patel', rollNo: 'CSE2102', email: 'priya.patel@yuvro.edu' },
  { id: 'demo-3', name: 'Rohan Gupta', rollNo: 'CSE2103', email: 'rohan.gupta@yuvro.edu' },
  { id: 'demo-4', name: 'Ananya Reddy', rollNo: 'CSE2104', email: 'ananya.reddy@yuvro.edu' },
  { id: 'demo-5', name: 'Vikram Singh', rollNo: 'CSE2105', email: 'vikram.singh@yuvro.edu' },
  { id: 'demo-6', name: 'Sneha Iyer', rollNo: 'CSE2106', email: 'sneha.iyer@yuvro.edu' },
  { id: 'demo-7', name: 'Karthik Nair', rollNo: 'CSE2107', email: 'karthik.nair@yuvro.edu' },
  { id: 'demo-8', name: 'Divya Menon', rollNo: 'CSE2108', email: 'divya.menon@yuvro.edu' },
];

const DUMMY_SUBJECTS: { name: string; code: string }[] = [
  { name: 'Data Structures & Algorithms', code: 'CS301' },
  { name: 'Database Management Systems', code: 'CS302' },
  { name: 'Operating Systems', code: 'CS303' },
  { name: 'Computer Networks', code: 'CS304' },
  { name: 'Software Engineering', code: 'CS305' },
  { name: 'Discrete Mathematics', code: 'MA301' },
];

function generateDummySubject(name: string, code: string, idx: number): SubjectPerformance {
  const seeds = [
    { notes: 82, test: 78, assess: 85, taskT: 8, taskS: 7, attend: 91, easy: 88, med: 76, hard: 62, streak: 5, testsA: 4 },
    { notes: 65, test: 62, assess: 58, taskT: 10, taskS: 6, attend: 78, easy: 72, med: 55, hard: 40, streak: 2, testsA: 3 },
    { notes: 90, test: 88, assess: 92, taskT: 6, taskS: 6, attend: 95, easy: 95, med: 85, hard: 78, streak: 12, testsA: 5 },
    { notes: 55, test: 50, assess: 48, taskT: 9, taskS: 4, attend: 68, easy: 65, med: 45, hard: 30, streak: 0, testsA: 2 },
    { notes: 75, test: 72, assess: 70, taskT: 7, taskS: 5, attend: 85, easy: 80, med: 68, hard: 55, streak: 3, testsA: 4 },
    { notes: 88, test: 82, assess: 80, taskT: 8, taskS: 8, attend: 92, easy: 90, med: 80, hard: 70, streak: 8, testsA: 5 },
  ];
  const s = seeds[idx % seeds.length];
  const tasksPending = s.taskT - s.taskS;
  const overall = s.notes * 0.25 + s.test * 0.3 + s.assess * 0.25 + (s.taskS / s.taskT) * 100 * 0.2;
  const strength: 'Strong' | 'Average' | 'Weak' = overall >= 70 ? 'Strong' : overall >= 45 ? 'Average' : 'Weak';
  const risk: 'Low' | 'Medium' | 'High' = overall >= 70 ? 'Low' : overall >= 45 ? 'Medium' : 'High';
  const totalChapters = 12;
  const chaptersCompleted = Math.round((s.notes / 100) * totalChapters);
  const classesHeld = 45;
  const classesAttended = Math.round((s.attend / 100) * classesHeld);

  return {
    id: `subj-${idx}`,
    name,
    code,
    notesCompletion: s.notes,
    testAvgScore: s.test,
    assessmentAvgScore: s.assess,
    tasksTotal: s.taskT,
    tasksSubmitted: s.taskS,
    tasksPending,
    attendancePercent: s.attend,
    strength,
    risk,
    totalChapters,
    chaptersCompleted,
    chaptersPending: totalChapters - chaptersCompleted,
    topicsNotOpened: Math.max(0, (totalChapters - chaptersCompleted) * 2),
    lastLearningDate: '2026-02-07T14:30:00Z',
    learningStreak: s.streak,
    testsAttempted: s.testsA,
    easyAvg: s.easy,
    mediumAvg: s.med,
    hardAvg: s.hard,
    accuracy: Math.round((s.easy + s.med + s.hard) / 3),
    trend: s.notes >= 80 ? 'improving' : s.notes <= 55 ? 'declining' : 'stable',
    assessmentsTotal: 5,
    assessmentsCompleted: Math.min(5, Math.round(s.assess / 25)),
    assessmentsInProgress: 1,
    assessmentsPending: Math.max(0, 5 - Math.round(s.assess / 25) - 1),
    assessmentScores: [
      { name: 'Mid-Term 1', score: s.assess - 5, date: '2026-01-15' },
      { name: 'Quiz 1', score: s.assess + 3, date: '2026-01-22' },
      { name: 'Mid-Term 2', score: s.assess, date: '2026-02-01' },
    ],
    tasksOnTime: Math.max(0, s.taskS - 1),
    tasksLate: 1,
    classesHeld,
    classesAttended,
    missedSessions: classesHeld - classesAttended,
  };
}

function generateDummyReport(student: BatchStudent): StudentReport {
  const subjects = DUMMY_SUBJECTS.map((s, i) => generateDummySubject(s.name, s.code, i));

  const totalPerf = Math.round(
    subjects.reduce((sum, s) => {
      return sum + s.notesCompletion * 0.25 + s.testAvgScore * 0.3 + s.assessmentAvgScore * 0.25 +
        (s.tasksTotal > 0 ? (s.tasksSubmitted / s.tasksTotal) * 100 * 0.2 : 0);
    }, 0) / subjects.length
  );

  const overallAttendance = Math.round(subjects.reduce((s, sub) => s + sub.attendancePercent, 0) / subjects.length);
  const learningCompletion = Math.round(subjects.reduce((s, sub) => s + sub.notesCompletion, 0) / subjects.length);

  const sorted = [...subjects].sort((a, b) => {
    const sa = a.notesCompletion * 0.25 + a.testAvgScore * 0.3 + a.assessmentAvgScore * 0.25;
    const sb = b.notesCompletion * 0.25 + b.testAvgScore * 0.3 + b.assessmentAvgScore * 0.25;
    return sb - sa;
  });
  const sortedPending = [...subjects].sort((a, b) => b.tasksPending - a.tasksPending);
  const sortedAttend = [...subjects].sort((a, b) => a.attendancePercent - b.attendancePercent);

  const status: 'On Track' | 'Needs Attention' | 'At Risk' =
    totalPerf >= 70 ? 'On Track' : totalPerf >= 45 ? 'Needs Attention' : 'At Risk';

  return {
    studentName: student.name,
    rollNumber: student.rollNo,
    program: 'B.Tech CSE',
    semester: '5',
    section: 'A',
    performanceIndex: totalPerf,
    status,
    overallAttendance,
    learningCompletion,
    subjects,
    strongestSubject: sorted[0]?.name || 'N/A',
    weakestSubject: sorted[sorted.length - 1]?.name || 'N/A',
    highestPendingSubject: sortedPending[0]?.name || 'N/A',
    lowestAttendanceSubject: sortedAttend[0]?.name || 'N/A',
    performanceGap: sorted.length >= 2
      ? Math.round(Math.abs(
          (sorted[0].notesCompletion * 0.25 + sorted[0].testAvgScore * 0.3 + sorted[0].assessmentAvgScore * 0.25) -
          (sorted[sorted.length - 1].notesCompletion * 0.25 + sorted[sorted.length - 1].testAvgScore * 0.3 + sorted[sorted.length - 1].assessmentAvgScore * 0.25)
        ))
      : 0,
    activeLearningDays: 42,
    currentStreak: 5,
    longestStreak: 14,
    badges: [
      { name: 'First Login', earned: true, icon: '🏅' },
      { name: 'Notes Starter', earned: true, icon: '📚' },
      { name: '5 Day Streak', earned: true, icon: '🔥' },
      { name: '10 Day Streak', earned: true, icon: '🔥' },
      { name: 'All Tasks Done', earned: false, icon: '✅' },
      { name: 'Perfect Attendance', earned: false, icon: '🎯' },
      { name: 'Assessment Ace', earned: false, icon: '⭐' },
    ],
    timeline: [
      { date: '2026-01-10', event: 'Started Semester 5', subject: 'All', type: 'milestone' },
      { date: '2026-01-15', event: 'Completed Chapter 1', subject: 'Data Structures & Algorithms', type: 'notes' },
      { date: '2026-01-18', event: 'Mid-Term 1 Attempted', subject: 'Database Management Systems', type: 'test' },
      { date: '2026-01-22', event: 'Quiz 1 Submitted', subject: 'Operating Systems', type: 'assessment' },
      { date: '2026-01-28', event: 'Task 3 Submitted Late', subject: 'Computer Networks', type: 'task' },
      { date: '2026-02-01', event: 'Mid-Term 2 Attempted', subject: 'Software Engineering', type: 'test' },
      { date: '2026-02-05', event: '5-day learning streak!', subject: 'All', type: 'streak' },
    ],
    remarks: [],
  };
}

// ── Hook ────────────────────────────────────────────────────────────

export function useStudentReport() {
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [allStudents, setAllStudents] = useState<BatchStudent[]>([]);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Load assignments + all students on mount
  useEffect(() => {
    const init = async () => {
      try {
        setFiltersLoading(true);
        const [facultyAssignments, studentRes] = await Promise.all([
          getFacultyAssignments(),
          studentService.getStudents({ limit: 100 }),
        ]);

        setAssignments(facultyAssignments);

        // Derive unique Batches by NAME from assignments
        const uniqueBatchNames = new Set<string>();
        facultyAssignments.forEach((a: SectionSubjectFaculty) => {
          if (a.semester_subject_details?.batch_name) {
            uniqueBatchNames.add(a.semester_subject_details.batch_name);
          }
        });

        const derivedBatches = Array.from(uniqueBatchNames).map(name => ({
          id: name, // Use name as ID for deduplicated selection
          name,
          startYear: 0,
          endYear: 0
        }));
        setBatches(derivedBatches);

        // Map backend students to local interface
        const realStudents: BatchStudent[] = (studentRes.results || []).map((s: any) => ({
          id: String(s.user || s.id),
          name: `${s.user_details?.first_name || ''} ${s.user_details?.last_name || ''}`.trim() || 'Unknown',
          rollNo: s.roll_number || '',
          email: s.user_details?.email || '',
          department_id: s.department,
          department_name: s.department_name,
          semester_number: s.semester_number,
          batch_name: s.batch_name,
          section_name: s.section_name
        }));
        setAllStudents([...realStudents, ...DUMMY_STUDENTS]);
      } catch (err) {
        console.error("Failed to initialize student report filters", err);
      } finally {
        setFiltersLoading(false);
      }
    };
    init();
  }, []);

  const loadStudents = useCallback(async (params: any) => {
    setStudentsLoading(true);
    try {
      const res = await studentService.getStudents({
        ...params,
        limit: 100
      });
      
      if (res.results) {
        setStudents(res.results.map((s: any) => ({
          id: String(s.user || s.id),
          name: `${s.user_details?.first_name || ''} ${s.user_details?.last_name || ''}`.trim() || 'Unknown',
          rollNo: s.roll_number || '',
          email: s.user_details?.email || '',
          department_id: s.department,
          department_name: s.department_name,
          semester_number: s.semester_number,
          batch_name: s.batch_name,
          section_name: s.section_name
        })));
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error("Failed to load students from backend", err);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (studentId: string, filters: Partial<ReportFilters>, externalStudent?: BatchStudent) => {
    setLoading(true);
    try {
      const student = externalStudent || allStudents.find((s: BatchStudent) => s.id === studentId);
      if (!student) { setLoading(false); return; }

      const isDummy = studentId.startsWith('demo-') || studentId.startsWith('dummy-');
      if (isDummy) {
        await new Promise(r => setTimeout(r, 400));
        setReport(generateDummyReport(student));
        setLoading(false);
        return;
      }

      // Real student logic — currently using dummy as placeholder for real calculation, 
      // but configured to accept real data eventually.
      setReport(generateDummyReport(student));
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  }, [allStudents]);

  return {
    assignments, batches, students, allStudents, report, loading,
    filtersLoading,
    studentsLoading,
    loadStudents,
    loadReport,
    setReport,
    setStudents
  };
}

import { useState, useEffect, useCallback } from 'react';
import adminApiService from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { getStudentAttendanceRecords, getStudentTaskSubmissions } from '@/services/subjectService';

export interface ReportFilters {
  academicYear: string;
  semester: string;
  batchId: string;
  studentId: string;
  subjectFilter: string;
  dateRange: string;
  externalSubjects?: any[];
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
  department_name?: string;
  batch_name?: string;
  semester?: string;
  section?: string;
}

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
  // Seeded-ish values per subject index
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

function generateDummyReport(student: BatchStudent, realSubjects?: any[]): StudentReport {
  const subjectsToUse = realSubjects && realSubjects.length > 0 
    ? realSubjects.map(s => ({
        name: s.subject_name || s.name || 'Unknown',
        code: s.short_code || s.code || 'UNK'
      })) 
    : DUMMY_SUBJECTS;

  const subjects = subjectsToUse.map((s, i) => generateDummySubject(s.name, s.code, i));

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
    program: student.department_name || 'B.Tech CSE',
    semester: student.semester || '5',
    section: student.section || 'A',
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
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [allStudents, setAllStudents] = useState<BatchStudent[]>([]);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Load departments + all students on mount
  useEffect(() => {
    const init = async () => {
      const [deptRes, studentRes] = await Promise.all([
        supabase.from('departments').select('id, name, code'),
        supabase.from('profiles').select('id, full_name, email').eq('role', 'student'),
      ]);
      if (deptRes.data && deptRes.data.length > 0) setDepartments(deptRes.data);

      // Merge real students with dummy students
      const realStudents: BatchStudent[] = (studentRes.data || []).map((p, i) => ({
        id: p.id,
        name: p.full_name,
        rollNo: `STU${String(i + 1).padStart(3, '0')}`,
        email: p.email,
      }));
      setAllStudents([...realStudents, ...DUMMY_STUDENTS]);
      setFiltersLoading(false);
    };
    init();
  }, []);

  const loadCourses = useCallback(async (departmentId: string, semester?: string) => {
    let query = supabase.from('courses').select('id, name, code, semester').eq('department_id', departmentId);
    if (semester) query = query.eq('semester', parseInt(semester));
    const { data } = await query;
    if (data) setCourses(data.map(c => ({ id: c.id, name: c.name, code: c.code, semester: c.semester })));
    else setCourses([]);
  }, []);

  const loadBatches = useCallback(async (departmentId: string) => {
    const { data: batchIdData } = await supabase
      .from('batch_ids')
      .select('id, name, description')
      .eq('department_id', departmentId)
      .eq('is_archived', false);

    if (batchIdData && batchIdData.length > 0) {
      const { data: batchData } = await supabase
        .from('batches')
        .select('id, batch_id_ref, start_year, end_year')
        .in('batch_id_ref', batchIdData.map(b => b.id))
        .eq('is_archived', false);

      if (batchData && batchData.length > 0) {
        setBatches(batchData.map(b => {
          const batchId = batchIdData.find(bi => bi.id === b.batch_id_ref);
          return { id: b.id, name: batchId?.name || 'Unknown', startYear: b.start_year, endYear: b.end_year };
        }));
      } else {
        setBatches(batchIdData.map(bi => ({ id: bi.id, name: bi.name, startYear: 0, endYear: 0 })));
      }
    } else {
      setBatches([]);
    }
  }, []);

  const loadStudents = useCallback(async (departmentId: string, semester?: string) => {
    setStudentsLoading(true);
    let query = supabase
      .from('student_semester_mapping')
      .select('student_id')
      .eq('department_id', departmentId)
      .eq('is_active', true);
    if (semester) query = query.eq('semester', parseInt(semester));

    const { data: mappings } = await query;
    if (mappings && mappings.length > 0) {
      const studentIds = mappings.map(m => m.student_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)
        .eq('role', 'student');
      if (profiles) {
        setStudents(profiles.map((p, i) => ({
          id: p.id, name: p.full_name, rollNo: `STU${String(i + 1).padStart(3, '0')}`, email: p.email,
        })));
      }
    } else {
      setStudents([]);
    }
    setStudentsLoading(false);
  }, []);

  const loadReport = useCallback(async (studentId: string, filters: Partial<ReportFilters>, externalStudent?: BatchStudent) => {
    setLoading(true);
    try {
      const student = externalStudent || allStudents.find(s => s.id === studentId);
      if (!student) { setLoading(false); return; }

      // Check if this is a dummy student (demo- or dummy- prefixed)
      const isDummy = studentId.startsWith('demo-') || studentId.startsWith('dummy-');
      if (isDummy) {
        // Use dummy data
        await new Promise(r => setTimeout(r, 400)); // simulate loading
        setReport(generateDummyReport(student, filters.externalSubjects));
        setLoading(false);
        return;
      }

      // Real student — try API + Supabase
      const studentCourses = filters.externalSubjects?.length ? filters.externalSubjects : (courses.length > 0 ? courses : []);
      let assessmentData: any[] = [];
      let taskData: any[] = [];
      let attendanceData: any[] = [];

      try {
        if (filters.batchId) {
          const assessments = await adminApiService.getAssessmentsByBatch(filters.batchId, studentId).catch(() => []);
          assessmentData = Array.isArray(assessments) ? assessments : [];
        }

        // Fetch real attendance and task submissions from backend
        const [attendanceRes, taskRes] = await Promise.all([
          getStudentAttendanceRecords(studentId).catch(() => ({ results: [] })),
          getStudentTaskSubmissions(studentId).catch(() => ({ results: [] })),
        ]);
        attendanceData = Array.isArray(attendanceRes.results) ? attendanceRes.results : (Array.isArray(attendanceRes) ? attendanceRes : []);
        taskData = Array.isArray(taskRes.results) ? taskRes.results : (Array.isArray(taskRes) ? taskRes : []);
      } catch { /* API unavailable */ }

      const { data: progressData } = await supabase
        .from('subtopic_progress').select('*').eq('user_id', studentId);

      // If no courses and no progress, fall back to dummy
      if (studentCourses.length === 0 && (!progressData || progressData.length === 0)) {
        setReport(generateDummyReport(student, filters.externalSubjects));
        setLoading(false);
        return;
      }

      const subjects: SubjectPerformance[] = studentCourses.map((course: any, _idx: number) => {
        const subjectProgress = (progressData || []).filter(p => p.subject_id === course.id);
        const totalSubtopics = subjectProgress.length || 10;
        const completedSubtopics = subjectProgress.filter(p => p.completed).length;
        const notesCompletion = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

        const subjectAssessments = assessmentData.filter((a: any) => a.courseId === course.id || a.subjectId === course.id);
        // Filter task submissions for this subject using backend subject_id / subject_name
        const subjectTasks = taskData.filter((t: any) =>
          String(t.subject_id) === String(course.id) || t.subject_name === (course.subject_name || course.name)
        );

        const tasksTotal = subjectTasks.length;
        const tasksSubmitted = subjectTasks.filter((t: any) => t.is_submitted === true).length;
        const tasksPending = tasksTotal - tasksSubmitted;
        const assessmentScores = subjectAssessments
          .filter((a: any) => a.score != null)
          .map((a: any) => ({ name: a.name || 'Assessment', score: a.score || 0, date: a.submittedAt || '' }));
        const assessmentAvg = assessmentScores.length > 0
          ? Math.round(assessmentScores.reduce((sum: number, a: any) => sum + a.score, 0) / assessmentScores.length) : 0;

        const testAvg = assessmentAvg;

        const subjectAttendance = attendanceData.filter((a: any) => String(a.subject_id) === String(course.id) || a.subject_name === course.subject_name);
        let attendancePercent = 0;
        let classesHeld = subjectAttendance.length;
        let classesAttended = 0;
        if (classesHeld > 0) {
          classesAttended = subjectAttendance.filter((a: any) => a.is_present).length;
          attendancePercent = Math.round((classesAttended / classesHeld) * 100);
        }

        const overallScore = notesCompletion * 0.25 + testAvg * 0.3 + assessmentAvg * 0.25 + (tasksTotal > 0 ? (tasksSubmitted / tasksTotal) * 100 * 0.2 : 0);
        const strength: 'Strong' | 'Average' | 'Weak' = overallScore >= 70 ? 'Strong' : overallScore >= 40 ? 'Average' : 'Weak';
        const risk: 'Low' | 'Medium' | 'High' = overallScore >= 70 ? 'Low' : overallScore >= 40 ? 'Medium' : 'High';

        return {
          id: String(course.id), name: course.subject_name || course.name, code: course.short_code || course.code,
          notesCompletion, testAvgScore: testAvg, assessmentAvgScore: assessmentAvg,
          tasksTotal, tasksSubmitted, tasksPending, attendancePercent, strength, risk,
          totalChapters: Math.ceil(totalSubtopics / 3) || 5,
          chaptersCompleted: Math.ceil(completedSubtopics / 3),
          chaptersPending: Math.ceil((totalSubtopics - completedSubtopics) / 3) || 5,
          topicsNotOpened: totalSubtopics - completedSubtopics,
          lastLearningDate: subjectProgress.length > 0 ? subjectProgress[subjectProgress.length - 1].updated_at : null,
          learningStreak: 0, testsAttempted: subjectAssessments.length,
          easyAvg: 0, mediumAvg: 0, hardAvg: 0, accuracy: assessmentAvg,
          trend: 'stable' as const,
          assessmentsTotal: subjectAssessments.length,
          assessmentsCompleted: subjectAssessments.filter((a: any) => a.status === 'COMPLETED' || a.status === 'SUBMITTED').length,
          assessmentsInProgress: subjectAssessments.filter((a: any) => a.status === 'IN_PROGRESS').length,
          assessmentsPending: subjectAssessments.filter((a: any) => a.status === 'PENDING' || a.status === 'SENT').length,
          assessmentScores, 
          tasksOnTime: tasksSubmitted, tasksLate: 0,
          classesHeld, classesAttended, missedSessions: classesHeld - classesAttended,
        };
      });

      const totalPerf = subjects.length > 0
        ? Math.round(subjects.reduce((sum, s) => sum + s.notesCompletion * 0.25 + s.testAvgScore * 0.3 + s.assessmentAvgScore * 0.25 + (s.tasksTotal > 0 ? (s.tasksSubmitted / s.tasksTotal) * 100 * 0.2 : 0), 0) / subjects.length)
        : 0;
      const overallAttendance = subjects.length > 0 ? Math.round(subjects.reduce((s, sub) => s + sub.attendancePercent, 0) / subjects.length) : 0;
      const learningCompletion = subjects.length > 0 ? Math.round(subjects.reduce((s, sub) => s + sub.notesCompletion, 0) / subjects.length) : 0;

      const sorted = [...subjects].sort((a, b) => (b.notesCompletion * 0.25 + b.testAvgScore * 0.3 + b.assessmentAvgScore * 0.25) - (a.notesCompletion * 0.25 + a.testAvgScore * 0.3 + a.assessmentAvgScore * 0.25));
      const sortedPending = [...subjects].sort((a, b) => b.tasksPending - a.tasksPending);
      const sortedAttend = [...subjects].sort((a, b) => a.attendancePercent - b.attendancePercent);
      const status: 'On Track' | 'Needs Attention' | 'At Risk' = totalPerf >= 70 ? 'On Track' : totalPerf >= 45 ? 'Needs Attention' : 'At Risk';

      setReport({
        studentName: student.name, rollNumber: student.rollNo, program: student.department_name || 'B.Tech',
        semester: student.semester || filters.semester || '1', section: student.section || 'A', performanceIndex: totalPerf, status,
        overallAttendance, learningCompletion, subjects,
        strongestSubject: sorted[0]?.name || 'N/A',
        weakestSubject: sorted[sorted.length - 1]?.name || 'N/A',
        highestPendingSubject: sortedPending[0]?.name || 'N/A',
        lowestAttendanceSubject: sortedAttend[0]?.name || 'N/A',
        performanceGap: sorted.length >= 2 ? Math.round(Math.abs(
          (sorted[0].notesCompletion * 0.25 + sorted[0].testAvgScore * 0.3 + sorted[0].assessmentAvgScore * 0.25) -
          (sorted[sorted.length - 1].notesCompletion * 0.25 + sorted[sorted.length - 1].testAvgScore * 0.3 + sorted[sorted.length - 1].assessmentAvgScore * 0.25)
        )) : 0,
        activeLearningDays: (progressData || []).length,
        currentStreak: 0, longestStreak: 0,
        badges: [
          { name: 'First Login', earned: true, icon: '🏅' },
          { name: 'Notes Starter', earned: (progressData || []).length > 0, icon: '📚' },
          { name: '5 Day Streak', earned: false, icon: '🔥' },
          { name: 'All Tasks Done', earned: false, icon: '✅' },
          { name: 'Perfect Attendance', earned: false, icon: '🎯' },
        ],
        timeline: [], remarks: [],
      });
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  }, [allStudents, courses]);

  return {
    departments, courses, batches, students, allStudents, report, loading, filtersLoading, studentsLoading,
    loadCourses, loadBatches, loadStudents, loadReport,
  };
}

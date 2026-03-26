import { useState, useEffect, useCallback } from 'react';
import { departmentService } from '@/services/departmentService';
import { batchService } from '@/services/batchService';
import { semesterService, Semester } from '@/services/semesterService';
import { studentService } from '@/services/studentService';
import subjectService, { SectionSubjectFaculty, getFacultyAssignments } from '@/services/subjectService';
import { useAuth } from '@/contexts/AuthContext';

// Stub for adminApiService — replace with real service when available
const adminApiService = {
  getAssessmentsByBatch: async (_batchId: string, _studentId: string) => [] as any[],
  getCandidateTasks: async (_studentId: string) => [] as any[],
};

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
  startYear?: number;
  endYear?: number;
}

export interface SemesterOption {
  id: string;
  number: number;
}

export interface SectionOption {
  name: string;
}

// ── Dummy data ──────────────────────────────────────────────────────

const DUMMY_STUDENTS: BatchStudent[] = [];

const DUMMY_SUBJECTS: { name: string; code: string }[] = [];

function generateDummySubject(id: string, name: string, code: string, idx: number): SubjectPerformance {
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
    id,
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

function generateDummyReport(student: BatchStudent, subjectsList: { id: string; name: string; code: string }[]): StudentReport {
  const subjects = subjectsList.length > 0
    ? subjectsList.map((s, i) => generateDummySubject(s.id, s.name, s.code, i))
    : [
      { id: 'subj-1', name: 'Data Structures & Algorithms', code: 'CS301' },
      { id: 'subj-2', name: 'Database Management Systems', code: 'CS302' },
      { id: 'subj-3', name: 'Operating Systems', code: 'CS303' },
      { id: 'subj-4', name: 'Computer Networks', code: 'CS304' },
      { id: 'subj-5', name: 'Software Engineering', code: 'CS305' },
      { id: 'subj-6', name: 'Discrete Mathematics', code: 'MA301' },
    ].map((s, i) => generateDummySubject(s.id, s.name, s.code, i));

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
  const { user } = useAuth();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [allStudents, setAllStudents] = useState<BatchStudent[]>([]);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        setFiltersLoading(true);
        const collegeId = (user as any)?.college_id;
        
        // Fetch specific faculty assignments
        const assignmentsData = await getFacultyAssignments();
        setAssignments(assignmentsData);

        // Extract unique departments from assignments
        const depts: DepartmentOption[] = [];
        assignmentsData.forEach((a: SectionSubjectFaculty) => {
          const deptId = a.semester_subject_details?.department_id;
          const deptName = a.semester_subject_details?.department_name;
          const deptCode = a.semester_subject_details?.department_short_form || '';
          if (deptId && deptName && !depts.find((d: DepartmentOption) => d.id === String(deptId))) {
            depts.push({ id: String(deptId), name: deptName, code: deptCode });
          }
        });
        setDepartments(depts);

        // Fetch all students for search
        const studentsResp = await studentService.getStudents({ college: collegeId });
        const allFetched = studentsResp.results || (Array.isArray(studentsResp) ? studentsResp : []);
        setAllStudents(allFetched.map((s: any) => ({
          id: String(s.id),
          name: `${s.user_details.first_name} ${s.user_details.last_name}`,
          rollNo: s.roll_number,
          email: s.user_details.email,
          section: s.section_name || s.section_details?.name || 'N/A'
        })));
      } catch (err) {
        console.error('Failed to init report filters:', err);
      } finally {
        setFiltersLoading(false);
      }
    };
    if (user) init();
  }, [user]);

  const loadBatches = useCallback(async (departmentId: string) => {
    try {
      const resp = await batchService.getBatches(departmentId);
      const results = (resp as any).results || (Array.isArray(resp) ? resp : []);
      
      // Filter batches by those present in faculty assignments for this department
      const assignedBatchData = assignments
        .filter((a: SectionSubjectFaculty) => String(a.semester_subject_details?.department_id) === departmentId)
        .map((a: SectionSubjectFaculty) => ({
          name: a.semester_subject_details?.batch_name?.trim(),
          id: (a.semester_subject_details as any)?.batch // Try to get batch ID if present
        }));

      const assignedNames = assignedBatchData.map((d: any) => d.name).filter(Boolean);
      const assignedIds = assignedBatchData.map((d: any) => String(d.id)).filter((id: string) => id !== 'undefined');

      // Filter by assignments - match by ID or Name
      let finalBatches = results.filter((b: any) => 
        assignedIds.includes(String(b.id)) || 
        assignedNames.includes(b.name?.trim())
      );

      // Fallback: If filtering resulted in nothing but results were returned from API, 
      // it might be a data mismatch. Show all results as a fallback for usability.
      if (finalBatches.length === 0 && results.length > 0) {
        finalBatches = results;
      }

      setBatches(finalBatches.map((b: any) => ({
        id: String(b.id),
        name: b.name
      })));
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  }, []);

  const loadSemesters = useCallback(async (batchId: string) => {
    try {
      const resp = await semesterService.getSemesters(batchId);
      const results = (resp as any).results || (Array.isArray(resp) ? resp : []);
      
      // Filter semesters by those assigned to faculty
      const assignedSemNumbers = assignments
        .map((a: SectionSubjectFaculty) => a.semester_subject_details?.semester_number)
        .filter(Boolean);

      let finalSemesters = results.filter((s: any) => assignedSemNumbers.includes(s.number));

      // Fallback to all if filtering by assigned numbers is too strict
      if (finalSemesters.length === 0 && results.length > 0) {
        finalSemesters = results;
      }

      setSemesters(finalSemesters.map((s: any) => ({
        id: String(s.id),
        number: s.number
      })));
    } catch (err) {
      console.error('Failed to load semesters:', err);
    }
  }, [assignments]);

  const loadCourses = useCallback(async (semesterId: string) => {
    try {
      // Find the assignments that match the current context
      // Note: Comparing by semester number since semesterId is the ID of the Semester object
      // But SectionSubjectFaculty has semester_number.
      const currentSemester = semesters.find((s: SemesterOption) => s.id === semesterId);
      if (!currentSemester) return;

      const filteredAssignments = assignments.filter((a: SectionSubjectFaculty) => 
        a.semester_subject_details?.semester_number === currentSemester.number
      );

      const subjects = filteredAssignments.map((a: SectionSubjectFaculty) => ({
        id: String(a.semester_subject_details?.subject_details.id),
        name: a.semester_subject_details?.subject_details.subject_name || 'Unknown',
        code: a.semester_subject_details?.subject_details.short_code || '',
        semester: a.semester_subject_details?.semester_number || 0
      }));

      // Unique subjects only
      const uniqueSubjects = subjects.filter((s: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => t.id === s.id)
      );

      setCourses(uniqueSubjects);
      
      // Clear sections when subject changes
      setSections([]);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, [assignments, semesters]);

  const loadSections = useCallback(async (semesterId: string, subjectId: string) => {
    try {
      if (!semesterId || !subjectId) {
        setSections([]);
        return;
      }

      const currentSemester = semesters.find((s: SemesterOption) => s.id === semesterId);
      if (!currentSemester) return;

      // Filter assignments by semester number AND subject ID
      const filteredAssignments = assignments.filter((a: SectionSubjectFaculty) => 
        a.semester_subject_details?.semester_number === currentSemester.number &&
        String(a.semester_subject_details?.subject_details.id) === subjectId
      );

      const sectionOptions = filteredAssignments
        .map((a: SectionSubjectFaculty) => ({
          name: a.section_name || a.semester_subject_details?.batch_name || 'Unknown Section'
        }))
        .filter((s: SectionOption, index: number, self: SectionOption[]) => 
          index === self.findIndex((t: SectionOption) => t.name === s.name)
        );

      setSections(sectionOptions);
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  }, [assignments, semesters]);

  const loadStudents = useCallback(async (filters: { department?: string; batch?: string; semester?: string; section?: string }) => {
    setStudentsLoading(true);
    try {
      const params: any = {};
      if (filters.department) params.department = filters.department;
      if (filters.batch) params.batch = filters.batch;
      if (filters.semester) params.semester = filters.semester;
      if (filters.section) params.section_name = filters.section; 

      const resp = await studentService.getStudents(params);
      const results = resp.results || (Array.isArray(resp) ? resp : []);
      setStudents(results.map((s: any) => ({
        id: String(s.id),
        name: `${s.user_details.first_name} ${s.user_details.last_name}`,
        rollNo: s.roll_number,
        email: s.user_details.email,
        section: s.section_name || s.section_details?.name || 'N/A'
      })));
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (studentId: string, filters: Partial<ReportFilters>, externalStudent?: BatchStudent) => {
    setLoading(true);
    try {
      // Find the real student data
      let student = externalStudent || allStudents.find((s: BatchStudent) => s.id === studentId);

      if (!student) {
        const s = await studentService.getStudent(studentId);
        student = {
          id: String(s.id),
          name: `${s.user_details.first_name} ${s.user_details.last_name}`,
          rollNo: s.roll_number,
          email: s.user_details.email,
          section: (s as any).section_name || (s as any).section_details?.name || 'N/A'
        };
      }

      // Get subjects for the student's current semester if possible
      const subjectsList = courses.map((c: CourseOption) => ({ id: c.id, name: c.name, code: c.code }));

      // Simulate some processing time
      await new Promise(r => setTimeout(r, 400));
      setReport(generateDummyReport(student, subjectsList));
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  }, [allStudents, courses]);

  return {
    departments, courses, batches, semesters, students,    allStudents,
    sections,
    report,
    loading,
    filtersLoading,
    studentsLoading,
    loadBatches,
    loadSemesters,
    loadCourses,
    loadSections,
    loadStudents,
    loadReport
  };
}
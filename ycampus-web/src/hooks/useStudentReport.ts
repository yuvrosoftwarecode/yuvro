import { useState, useEffect, useCallback } from 'react';
import adminApiService from '@/services/api';
import studentService from '@/services/studentService';
import subjectService, { getFacultyAssignments, SectionSubjectFaculty } from '@/services/subjectService';
import skillTestService, { getUserSubmissions } from '@/services/skillTestService';
import taskService from '@/services/taskService';
import departmentService from '@/services/departmentService';
import courseService from '@/services/courseService';
import batchService from '@/services/batchService';
import semesterService from '@/services/semesterService';

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
  totalUnits: number;
  unitsCompleted: number;
  unitsPending: number;
  subUnitsNotOpened: number;
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

export interface AchievementBadge {
  name: string;
  icon: string;
  earned: boolean;
}

export interface StudentReport {
  id: string;
  studentName: string;
  rollNumber: string;
  program: string;
  semester: string;
  section: string;
  performanceIndex: number;
  ps: number;
  pri: number;
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
  badges: AchievementBadge[];
  timeline: { date: string; event: string; subject: string; type: string }[];
  remarks: { text: string; date: string; by: string; subject?: string }[];
}

export interface BatchStudent {
  id: string; // Used as the identifier (typically User ID)
  studentRecordId: string; // The specific Student profile record ID
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

// Dummy data has been removed to integrate real backend data.

export interface HookConfig {
  mode?: 'faculty' | 'principal';
}

// ── Hook ────────────────────────────────────────────────────────────

export function useStudentReport(config: HookConfig = { mode: 'faculty' }) {
  const { mode = 'faculty' } = config;
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [allStudents, setAllStudents] = useState<BatchStudent[]>([]);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [rawBatches, setRawBatches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Load assignments and basic filters on mount
  useEffect(() => {
    const init = async () => {
      try {
        setFiltersLoading(true);
        
        if (mode === 'principal') {
          const [allBatches, allDepts] = await Promise.all([
            batchService.getBatches(),
            departmentService.getDepartments()
          ]);
          
          setRawBatches(allBatches);
          const uniqueBatchNames = new Set(allBatches.map(b => b.name));
          setBatches(Array.from(uniqueBatchNames).map(name => ({
            id: name,
            name,
            startYear: 0,
            endYear: 0
          })));

          setDepartments(allDepts.map(d => ({
            id: String(d.id),
            name: d.name,
            code: d.short_form || ''
          })));
        } else {
          // Default/Faculty behavior: departments can be fetched but batches are derived from assignments
          const depts = await departmentService.getDepartments();
          setDepartments(depts.map(d => ({
            id: String(d.id),
            name: d.name,
            code: d.short_form || ''
          })));
        }

        // Always fetch assignments to support hierarchical filtering derivation for both roles
        const facultyAssignments = await getFacultyAssignments();
        setAssignments(facultyAssignments);

        // For Faculty mode, derive batches from assignments
        if (mode === 'faculty') {
          const uniqueBatchNames = new Set<string>();
          facultyAssignments.forEach((a: SectionSubjectFaculty) => {
            if (a.semester_subject_details?.batch_name) {
              uniqueBatchNames.add(a.semester_subject_details.batch_name);
            }
          });

          setBatches(Array.from(uniqueBatchNames).map(name => ({
            id: name,
            name,
            startYear: 0,
            endYear: 0
          })));
        }

        setAllStudents([]);
      } catch (err) {
        console.error("Failed to initialize student report filters", err);
      } finally {
        setFiltersLoading(false);
      }
    };
    init();
  }, [mode]);

  const mapStudent = (s: any): BatchStudent => ({
    id: String(s.user || s.user_details?.id || s.id), // Prefer User PK for identifying student's progress/tests
    studentRecordId: String(s.id), // The backend Student record ID used for attendance/task-submissions
    name: `${s.user_details?.first_name || ''} ${s.user_details?.last_name || ''}`.trim() || 'Unknown',
    rollNo: s.roll_number || '',
    email: s.user_details?.email || '',
    department_id: s.department,
    department_name: s.department_name,
    semester_number: s.semester_number,
    batch_name: s.batch_name,
    section_name: s.section_name ? String(s.section_name).replace(/^Section\s+/i, '') : ''
  });

  const loadBatches = useCallback(async (deptId?: string) => {
    try {
      const res = await batchService.getBatches(deptId);
      setRawBatches(res);
      const mapped = res.map(b => ({
        id: String(b.id),
        name: b.name,
        startYear: 0,
        endYear: 0
      }));
      setBatches(mapped);
    } catch (err) {
      console.error("Failed to load batches", err);
    }
  }, []);

  const loadCourses = useCallback(async (deptId?: string, semester?: string) => {
    try {
      const subjects = await subjectService.getSubjects({ semester });
      const mapped = subjects.map(s => ({
        id: String(s.id),
        name: s.subject_name || (s as any).name || 'Unknown',
        code: s.short_code || '',
        semester: Number(semester || 0)
      }));
      setCourses(mapped);
    } catch (err) {
      console.error("Failed to load courses", err);
    }
  }, []);

  const loadStudents = useCallback(async (paramsOrDeptId: any, semester?: string) => {
    setStudentsLoading(true);
    try {
      const queryParams = typeof paramsOrDeptId === 'object' 
        ? paramsOrDeptId 
        : { department: paramsOrDeptId, semester_number: semester };
      
      const res = await studentService.getStudents({ ...queryParams, limit: 1000, page_size: 1000 });
      if (res.results) {
        const mapped = res.results.map(mapStudent);
        setStudents(mapped);
        setAllStudents(mapped);
      } else {
        setStudents([]);
        setAllStudents([]);
      }
    } catch (err) {
      console.error("Failed to load students from backend", err);
      setStudents([]);
      setAllStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  // Fetch students for EACH assigned department separately and merge.
  // This ensures accurate counts when no single-department filter is applied.
  const loadStudentsByDepartments = useCallback(async (batchName: string, deptIds: string[], extraParams: any = {}) => {
    if (deptIds.length === 0) return;
    setStudentsLoading(true);
    try {
      const results = await Promise.all(
        deptIds.map(deptId =>
          studentService.getStudents({ ...extraParams, batch__name: batchName, department: deptId, limit: 1000, page_size: 1000 })
        )
      );
      const allRaw = results.flatMap(res => res.results || []);
      // Deduplicate by student ID
      const seen = new Set<string>();
      const unique = allRaw.filter((s: any) => {
        const id = String(s.user || s.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      const mapped = unique.map(mapStudent);
      setStudents(mapped);
      setAllStudents(mapped);
    } catch (err) {
      console.error("Failed to load students by departments", err);
      setStudents([]);
      setAllStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (studentId: string, _filters: Partial<ReportFilters>, externalStudent?: BatchStudent) => {
    setLoading(true);
    try {
      let student = externalStudent || allStudents.find((s: BatchStudent) => s.id === studentId);
      
      // If student object is missing, fetch it explicitly from backend
      if (!student) {
        try {
          const rawStudent = await studentService.getStudent(studentId);
          student = mapStudent(rawStudent);
        } catch (err) {
          console.error('Failed to fetch individual student details:', err);
        }
      }

      // Identify IDs correctly to avoid User vs Student mismatches
      const userIdRaw = student.id;
      const userId = (userIdRaw && userIdRaw !== 'undefined' && userIdRaw !== 'null') ? String(userIdRaw) : null;
      const studentRecordId = String(student.studentRecordId);

      // 1. Fetch Core Data from Backend (mostly uses User ID)
      let progressData: any[] = [];
      let skillSubmissions: any[] = [];
      let overallStats: any = {};
      let allTasks: any[] = [];
      let studentTaskSubmissions: any[] = [];
      let allAttendanceSessions: any[] = [];

      // 2. Fetch Optional Metrics (Tasks & Attendance) - Fail-safe
      try {
        if (userId) {
          const [pD, sS, oS] = await Promise.all([
            subjectService.fetchOverallUserProgress(userId),
            getUserSubmissions(userId, { limit: 1000 }),
            subjectService.fetchUserStats(userId)
          ]);
          progressData = (pD as any).results || pD || [];
          skillSubmissions = (sS as any).results || sS || [];
          
          // Robust filtering for current student
          skillSubmissions = skillSubmissions.filter((sub: any) => 
            String(sub.user?.id || sub.user) === String(userId)
          );
          overallStats = oS || {};
        }
      } catch (err) {
        console.error('Error fetching core student stats:', err);
      }

      // 1b. Fetch all tests for the assigned subjects to build a lookup map
      let allLevelTests: any[] = [];
      try {
        const testResults = await Promise.allSettled(
          assignments.map(a => {
            const subjectId = a.semester_subject_details?.subject_details?.id;
            return subjectId ? skillTestService.getSkillTests({ subject: String(subjectId) }) : Promise.resolve([]);
          })
        );
        allLevelTests = testResults
          .filter((res): res is PromiseFulfilledResult<any> => res.status === 'fulfilled')
          .flatMap(res => (res.value as any).results || res.value || []);
      } catch (err) {
        console.warn('Failed to fetch tests map:', err);
      }
      
      const testsMap = new Map(allLevelTests.map(t => [String(t.id), t]));

      // 2. Fetch Optional Metrics (Tasks & Attendance) - Fail-safe
      try {
        const [tasksRes, submissionsRes, sessionsRes] = await Promise.all([
          taskService.getTasks({ limit: 1000 }).catch(() => []),
          taskService.getStudentSubmissions(studentRecordId).catch(() => []),
          Promise.allSettled(
            assignments.map(a => subjectService.getAttendanceSessions({ section_subject_faculty: a.id, limit: 1000 }))
          )
        ]);

        allTasks = (tasksRes as any).results || tasksRes || [];
        studentTaskSubmissions = (submissionsRes as any).results || submissionsRes || [];
        
        if (sessionsRes && Array.isArray(sessionsRes)) {
          allAttendanceSessions = sessionsRes
            .filter((res): res is PromiseFulfilledResult<any> => res.status === 'fulfilled')
            .flatMap(res => {
              const val = res.value;
              return (val as any).results || val || [];
            });
        }
      } catch (err) {
        console.warn('Optional metrics failed to load, some report details may be missing.', err);
      }

      // 2. Identify Faculty-assigned Subjects for this Section/Student Context
      const assignedSubjectIds = new Set<string>();
      assignments.forEach(a => {
        if (a.semester_subject_details?.subject_details?.id) {
          assignedSubjectIds.add(String(a.semester_subject_details.subject_details.id));
        }
      });

      // Find the student's section ID from assignments to use for task/attendance filtering
      let studentSectionId: string | undefined;
      const matchingAssignment = assignments.find(a => 
        a.semester_subject_details?.batch_name === student.batch_name &&
        String(a.semester_subject_details?.department_id) === String(student.department_id) &&
        String(a.semester_subject_details?.semester_number) === String(student.semester_number) &&
        a.section_name === student.section_name
      );
      if (matchingAssignment) {
        studentSectionId = String(matchingAssignment.section);
      }

      // In Principal mode, we want to show ALL subjects for the semester, even without faculty
      let semesterSubjectsForPrincipal: any[] = [];
      if (mode === 'principal' && student.batch_name && student.department_id && student.semester_number) {
        try {
          const batchRecord = rawBatches.find(b => b.name === student.batch_name && String(b.department) === String(student.department_id));
          if (batchRecord) {
            const sems = await semesterService.getSemesters(batchRecord.id);
            const sem = sems.find(s => String(s.number) === String(student.semester_number));
            if (sem) {
              semesterSubjectsForPrincipal = await subjectService.getSubjectsForSemester(sem.id);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch all semester subjects for principal report:', err);
        }
      }


        // 3. Map Progress Data & Intersect with Faculty Assignments
        // In Principal mode, we strictly show subjects assigned to the student's Semester.
        // In Faculty mode, we show only subjects the faculty is assigned to.
        const sourceList = mode === 'principal' 
          ? semesterSubjectsForPrincipal 
          : assignments.filter((a: any) => a && a.semester_subject_details?.subject_details);

        const finalSubjects: SubjectPerformance[] = sourceList.map((item: any) => {
            const sDetails = item.semester_subject_details ? item.semester_subject_details.subject_details : item.subject_details;
            const sId = String(sDetails.id);
            const semSubId = item.semester_subject_details ? String(item.semester_subject_details.id) : String(item.id);
            
            const prog = (progressData || []).find((p: any) => {
              const pSubId = String(p.subject_id);
              return pSubId === sId || (semSubId && pSubId === semSubId);
            });

            // Task Logic (Real Data) - Match by Subject ID and Section ID
            const assignmentSectionId = item.section ? String(item.section) : studentSectionId;
            const subjectTasks = (allTasks || []).filter(t => {
              if (!t) return false;
              // Match subject
              const tSubId = typeof t.subject === 'object' ? String(t.subject.id) : String(t.subject);
              if (tSubId !== sId) return false;
              
              // Match section - a task can belong to multiple sections
              if (assignmentSectionId) {
                if (!t.sections || !Array.isArray(t.sections)) return false;
                return t.sections.some((sec: any) => {
                  const secId = typeof sec === 'object' ? String(sec.id) : String(sec);
                  return secId === assignmentSectionId;
                });
              }
              return true;
            });

            let tasksOnTime = 0;
            let tasksLate = 0;
            let tasksPending = 0;
            let tasksCompleted = 0;

            subjectTasks.forEach(task => {
              const submission = (studentTaskSubmissions || []).find(ts => {
                if (!ts) return false;
                const tsTaskId = typeof ts.task === 'object' ? String(ts.task.id) : String(ts.task);
                return tsTaskId === String(task.id);
              });
              
              if (submission && (submission.is_submitted || submission.status === 'completed')) {
                tasksCompleted++;
                const submittedDate = submission.submitted_at ? new Date(submission.submitted_at) : (submission.created_at ? new Date(submission.created_at) : null);
                const dueDate = task.due_date ? new Date(task.due_date) : null;
                
                if (submittedDate && dueDate && submittedDate <= dueDate) {
                  tasksOnTime++;
                } else if (submittedDate) {
                  tasksLate++;
                } else {
                   // Fallback if no date but marked completed
                   tasksOnTime++; 
                }
              } else {
                tasksPending++;
              }
            });

            // Attendance Logic (Real Data) - Match by Subject ID and Section ID context
            // instead of just assignment.id to handle cross-faculty session records
            const subjectAttendance = (allAttendanceSessions || []).filter(session => {
              if (!session) return false;
              
              // 1. Try matching by the explicit assignment ID first
              const sessionAssignmentId = typeof session.section_subject_faculty === 'object' 
                ? String(session.section_subject_faculty.id) 
                : String(session.section_subject_faculty);
              if (item.id && sessionAssignmentId === String(item.id)) return true;

              // 2. Fallback: Match by Subject and Section if session details are available
              if (session.semester_subject_details) {
                 const sessSubId = String(session.semester_subject_details.subject);
                 const sessSecId = String(session.section); // If backend provides this
                 if (sessSubId === sId && sessSecId === assignmentSectionId) return true;
              }
              
              return false;
            });

            let classesAttended = 0;
            let missedSessions = 0;

            subjectAttendance.forEach(session => {
              if (!session.records || !Array.isArray(session.records)) return;
              
              const record = session.records.find((r: any) => {
                if (!r) return false;
                const rStudentId = typeof r.student === 'object' ? String(r.student.id) : String(r.student);
                return rStudentId === String(studentRecordId);
              });

              if (record) {
                if (record.is_present) classesAttended++;
                else missedSessions++;
              }
            });

            // Assessment Metrics (Real Data)
            const subjectSubmissions = (skillSubmissions || []).filter((sub: any) => {
              const testId = String(sub.skill_test_details?.id || sub.skill_test?.id || sub.skill_test);
              const testInfo = testsMap.get(testId);
              const subId = String(testInfo?.subject || sub.skill_test_details?.subject || sub.skill_test?.subject || sub.skill_test);
              return subId === sId || (semSubId && subId === semSubId);
            }).sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

            const practiceAttempts = subjectSubmissions.filter((sub: any) => {
              const testId = String(sub.skill_test_details?.id || sub.skill_test?.id || sub.skill_test);
              const testInfo = testsMap.get(testId);
              const type = testInfo?.test_type || sub.skill_test_details?.test_type || sub.skill_test?.test_type;
              return type === 'practice';
            });
            const assessmentAttempts = subjectSubmissions.filter((sub: any) => {
              const testId = String(sub.skill_test_details?.id || sub.skill_test?.id || sub.skill_test);
              const testInfo = testsMap.get(testId);
              const type = testInfo?.test_type || sub.skill_test_details?.test_type || sub.skill_test?.test_type;
              return type === 'assessment';
            });

            const avgPct = (arr: any[]) => {
              if (arr.length === 0) return 0;
              const totalPct = arr.reduce((acc, curr) => {
                const marks = Number(curr.marks) || Number(curr.score) || 0;
                const testId = String(curr.skill_test_details?.id || curr.skill_test?.id || curr.skill_test);
                const testInfo = testsMap.get(testId);
                const total = Number(testInfo?.total_marks || curr.skill_test_details?.total_marks || curr.skill_test?.total_marks || curr.total_marks || 100);
                return acc + (marks / total) * 100;
              }, 0);
              return Number((totalPct / arr.length).toFixed(1));
            };

            const calculateTrend = (attempts: any[]): 'improving' | 'declining' | 'stable' => {
              if (attempts.length < 2) return 'stable';
              const overallAvg = avgPct(attempts);
              const recent3 = attempts.slice(-3);
              const recentAvg = avgPct(recent3);
              if (recentAvg > overallAvg + 2) return 'improving';
              if (recentAvg < overallAvg - 2) return 'declining';
              return 'stable';
            };

            const accuracy = avgPct(practiceAttempts);
            const trend = calculateTrend(practiceAttempts);
            const testAvg = accuracy;
            const assessmentAvg = avgPct(assessmentAttempts);

            const easyAttempts = practiceAttempts.filter(a => {
              const testId = String(a.skill_test_details?.id || a.skill_test?.id || a.skill_test);
              const testInfo = testsMap.get(testId);
              return (testInfo?.difficulty || a.skill_test_details?.difficulty || a.skill_test?.difficulty) === 'easy';
            });
            const mediumAttempts = practiceAttempts.filter(a => {
              const testId = String(a.skill_test_details?.id || a.skill_test?.id || a.skill_test);
              const testInfo = testsMap.get(testId);
              return (testInfo?.difficulty || a.skill_test_details?.difficulty || a.skill_test?.difficulty) === 'medium';
            });
            const hardAttempts = practiceAttempts.filter(a => {
              const testId = String(a.skill_test_details?.id || a.skill_test?.id || a.skill_test);
              const testInfo = testsMap.get(testId);
              return (testInfo?.difficulty || a.skill_test_details?.difficulty || a.skill_test?.difficulty) === 'hard';
            });

            const learningScore = Number(Number(prog?.percent || 0).toFixed(1));
            const attendanceScore = Number(Number(prog?.attendance_pct || 0).toFixed(1));
            const compositeScore = Number(((learningScore * 0.4) + (testAvg * 0.3) + (attendanceScore * 0.3)).toFixed(1));

            return {
              id: sId,
              name: sDetails.subject_name || sDetails.name || 'Unknown',
              code: sDetails.short_code || '',
              notesCompletion: learningScore,
              testAvgScore: testAvg,
              assessmentAvgScore: assessmentAvg,
              tasksTotal: prog && typeof prog.assigned_tasks_total === 'number' ? prog.assigned_tasks_total : subjectTasks.length,
              tasksSubmitted: prog && typeof prog.assigned_tasks_submitted === 'number' ? prog.assigned_tasks_submitted : (tasksOnTime + tasksLate),
              tasksPending: prog && typeof prog.assigned_tasks_pending === 'number' ? prog.assigned_tasks_pending : tasksPending,
              attendancePercent: attendanceScore,
              strength: compositeScore >= 75 ? 'Strong' : compositeScore >= 50 ? 'Average' : 'Weak',
              risk: compositeScore >= 75 ? 'Low' : compositeScore >= 50 ? 'Medium' : 'High',
              compositeScore: compositeScore,
              totalUnits: prog?.units_total || 0,
              unitsCompleted: prog?.units_completed || 0,
              unitsPending: (prog?.units_total || 0) - (prog?.units_completed || 0),
              subUnitsNotOpened: (prog?.subunits_total || 0) - (prog?.subunits_completed || 0),
              lastLearningDate: prog?.last_activity || null,
              learningStreak: prog?.learning_streak || 0,
              testsAttempted: practiceAttempts.length,
              easyAvg: avgPct(easyAttempts),
              mediumAvg: avgPct(mediumAttempts),
              hardAvg: avgPct(hardAttempts),
              accuracy: accuracy,
              trend: trend,
              assessmentsTotal: assessmentAttempts.length,
              assessmentsCompleted: assessmentAttempts.filter((a: any) => a.status === 'completed' || a.is_submitted).length,
              assessmentsInProgress: assessmentAttempts.filter((a: any) => a.status === 'started' && !a.is_submitted).length,
              assessmentsPending: 0,
              assessmentScores: assessmentAttempts.slice(-3).reverse().map((a: any) => {
                const aMarks = Number(a.marks || a.score || 0);
                const aTestId = String(a.skill_test_details?.id || a.skill_test?.id || a.skill_test);
                const aTestInfo = testsMap.get(aTestId);
                const aTotal = Number(aTestInfo?.total_marks || a.skill_test_details?.total_marks || a.skill_test?.total_marks || 100);
                return {
                  name: a.skill_test_details?.title || a.skill_test?.title || 'Assessment',
                  score: Number(((aMarks / aTotal) * 100).toFixed(1)),
                  date: a.submitted_at || a.created_at
                };
              }),
              tasksOnTime: prog && typeof prog.assigned_tasks_on_time === 'number' ? prog.assigned_tasks_on_time : tasksOnTime,
              tasksLate: prog && typeof prog.assigned_tasks_late === 'number' ? prog.assigned_tasks_late : tasksLate,
              classesHeld: prog && typeof prog.attendance_total === 'number' ? prog.attendance_total : (classesAttended + missedSessions),
              classesAttended: prog && typeof prog.attendance_present === 'number' ? prog.attendance_present : classesAttended,
              missedSessions: prog && typeof prog.attendance_missed === 'number' ? prog.attendance_missed : missedSessions,
            };

          });

      const seenIds = new Set<string>();
      const uniqueSubjects = finalSubjects.filter(s => {
        if (seenIds.has(s.id)) return false;
        seenIds.add(s.id);
        return true;
      });

      // Summary Calculations
      const subjectsWithScores = uniqueSubjects.filter(s => (s as any).compositeScore !== undefined);
      const sortedByPerf = [...subjectsWithScores].sort((a, b) => (b as any).compositeScore - (a as any).compositeScore);
      const sortedByPending = [...uniqueSubjects].sort((a, b) => (b.tasksPending + b.unitsPending) - (a.tasksPending + a.unitsPending));
      const sortedByAttendance = [...uniqueSubjects].sort((a, b) => a.attendancePercent - b.attendancePercent);

      const overallAttendance = overallStats?.overall_attendance || 0;
      const learningCompletion = overallStats?.avg_progress || 0;

      // Compute aggregate metrics for PI/PS/PRI formulas
      const totalTests = uniqueSubjects.reduce((s, sub) => s + (sub.testsAttempted || 0), 0);
      const overallTestAvg = totalTests > 0
        ? Number((uniqueSubjects.reduce((s, sub) => s + (sub.testAvgScore * (sub.testsAttempted || 0)), 0) / totalTests).toFixed(1))
        : 0;
      const totalAssessments = uniqueSubjects.reduce((s, sub) => s + (sub.assessmentsTotal || 0), 0);
      const overallAssessmentAvg = totalAssessments > 0
        ? Number((uniqueSubjects.reduce((s, sub) => s + (sub.assessmentAvgScore * (sub.assessmentsTotal || 0)), 0) / totalAssessments).toFixed(1))
        : 0;
      const totalTasks = uniqueSubjects.reduce((s, sub) => s + (sub.tasksTotal || 0), 0);
      const totalSubmitted = uniqueSubjects.reduce((s, sub) => s + (sub.tasksSubmitted || 0), 0);
      const overallTaskRate = totalTasks > 0 ? Number(((totalSubmitted / totalTasks) * 100).toFixed(1)) : 0;

      // TEMPORARY PI/PS/PRI formulas (will be replaced with final logic later)
      const performanceIndex = Number((
        learningCompletion * 0.30 +
        overallTestAvg * 0.25 +
        overallAssessmentAvg * 0.20 +
        overallAttendance * 0.15 +
        overallTaskRate * 0.10
      ).toFixed(1));

      const ps = Number((
        overallTestAvg * 0.45 +
        overallAssessmentAvg * 0.30 +
        learningCompletion * 0.15 +
        overallTaskRate * 0.10
      ).toFixed(1));

      const pri = Number((
        overallAttendance * 0.30 +
        overallTaskRate * 0.30 +
        learningCompletion * 0.25 +
        overallAssessmentAvg * 0.15
      ).toFixed(1));

      const studentReport: StudentReport = {
        id: studentId,
        studentName: student?.name || 'Unknown Student',
        rollNumber: student?.rollNo || 'N/A',
        program: student?.department_name || 'N/A',
        semester: String(student?.semester_number || 'N/A'),
        section: student?.section_name || 'N/A',
        performanceIndex: performanceIndex,
        ps: ps,
        pri: pri,
        status: performanceIndex >= 70 ? 'On Track' : performanceIndex >= 45 ? 'Needs Attention' : 'At Risk',
        overallAttendance: overallAttendance,
        learningCompletion: learningCompletion,
        subjects: uniqueSubjects,
        strongestSubject: sortedByPerf.length > 0 ? sortedByPerf[0].name : 'N/A',
        weakestSubject: sortedByPerf.length > 0 ? sortedByPerf[sortedByPerf.length - 1].name : 'N/A',
        highestPendingSubject: sortedByPending.length > 0 && (sortedByPending[0].tasksPending + sortedByPending[0].unitsPending) > 0 ? sortedByPending[0].name : 'None',
        lowestAttendanceSubject: sortedByAttendance.length > 0 ? sortedByAttendance[0].name : 'N/A',
        performanceGap: sortedByPerf.length > 1 ? (sortedByPerf[0] as any).compositeScore - (sortedByPerf[sortedByPerf.length - 1] as any).compositeScore : 0,
        activeLearningDays: overallStats?.active_days || 0,
        currentStreak: overallStats?.streak || 0,
        longestStreak: overallStats?.longest_streak || 0,
        badges: [
          { name: 'Centum Attendee', icon: 'Trophy', earned: overallAttendance === 100 },
          { name: 'A+ Student', icon: 'Award', earned: performanceIndex >= 85 },
          { name: 'Active Learner', icon: 'BookOpen', earned: learningCompletion >= 50 },
          { 
            name: 'Task Crusher', 
            icon: 'CheckCircle2', 
            earned: totalTasks > 0 && uniqueSubjects.every(s => s.tasksPending === 0) 
          },
          { name: 'Fast Mover', icon: 'Zap', earned: uniqueSubjects.some(s => s.notesCompletion === 100) },
          { name: 'Consistent', icon: 'Flame', earned: (overallStats?.streak || 0) > 0 },
        ],
        timeline: [],
        remarks: []
      };

      setReport(studentReport);
    } catch (err) {
      console.error('CRITICAL: Error in report state builder:', err);
      // Fallback: set a bare minimum report so the UI doesn't hang
      setReport((prev: StudentReport | null) => prev || {
        studentName: 'Error Loading Data',
        rollNumber: '',
        program: '',
        semester: '',
        section: '',
        performanceIndex: 0,
        ps: 0,
        pri: 0,
        status: 'Needs Attention',
        overallAttendance: 0,
        learningCompletion: 0,
        subjects: [],
        strongestSubject: 'N/A',
        weakestSubject: 'N/A',
        highestPendingSubject: 'N/A',
        lowestAttendanceSubject: 'N/A',
        performanceGap: 0,
        activeLearningDays: 0,
        currentStreak: 0,
        longestStreak: 0,
        badges: [],
        timeline: [],
        remarks: []
      });
    } finally {
      setLoading(false);
    }
  }, [allStudents, assignments]);

  return {
    assignments, batches, rawBatches, departments, courses, students, allStudents, report, loading,
    filtersLoading,
    studentsLoading,
    loadStudents,
    loadCourses,
    loadBatches,
    loadStudentsByDepartments,
    loadReport,
    setReport,
    setStudents
  };
}

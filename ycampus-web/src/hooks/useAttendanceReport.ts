import { useState, useCallback, useEffect } from 'react';
import subjectService, { getFacultyAssignments, SectionSubjectFaculty } from '@/services/subjectService';
import studentService from '@/services/studentService';
import { useAuth } from '@/contexts/AuthContext';

export interface AttendanceDepartment { id: string; name: string; }
export interface AttendanceBatch { id: string; name: string; }
export interface AttendanceSection { name: string; }
export interface AttendanceCourse { id: string; name: string; code: string; }

export interface StudentAttendanceRow {
  studentId: string;
  studentName: string;
  rollNo: string;
  totalClasses: number;
  present: number;
  absent: number;
  attendancePercent: number;
  status: 'Excellent' | 'Safe' | 'Warning' | 'Critical';
  consecutiveAbsences: number;
}

export interface SectionSummary {
  totalClassesConducted: number;
  totalStudents: number;
  averageAttendance: number;
  totalPresent: number;
  totalAbsent: number;
  below75: number;
  below60: number;
}

export interface SubjectAttendance {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalClasses: number;
  present: number;
  absent: number;
  attendancePercent: number;
  risk: 'Excellent' | 'Safe' | 'Warning' | 'Critical';
}

export interface DateAttendance {
  date: string;
  subject: string;
  status: 'Present' | 'Absent';
}

export interface StudentDetail {
  studentId: string;
  studentName: string;
  rollNo: string;
  totalClasses: number;
  present: number;
  absent: number;
  attendancePercent: number;
  requiredPercent: number;
  shortagePercent: number;
  currentAbsenceStreak: number;
  longestAbsenceStreak: number;
  lastAttendedDate: string | null;
  subjects: SubjectAttendance[];
  dateWise: DateAttendance[];
}

function classifyAttendance(percent: number): 'Excellent' | 'Safe' | 'Warning' | 'Critical' {
  if (percent >= 90) return 'Excellent';
  if (percent >= 75) return 'Safe';
  if (percent >= 60) return 'Warning';
  return 'Critical';
}

function computeStreaks(records: { date: string; isPresent: boolean }[]) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  let current = 0, longest = 0, currentStreak = 0;
  let lastAttended: string | null = null;

  for (const r of sorted) {
    if (!r.isPresent) {
      currentStreak++;
      if (currentStreak > longest) longest = currentStreak;
    } else {
      currentStreak = 0;
      lastAttended = r.date;
    }
  }
  current = currentStreak;
  return { current, longest, lastAttended };
}

export function useAttendanceReport() {
  const [departments, setDepartments] = useState<AttendanceDepartment[]>([]);
  const [batches, setBatches] = useState<AttendanceBatch[]>([]);
  const [sections, setSections] = useState<AttendanceSection[]>([]);
  const [courses, setCourses] = useState<AttendanceCourse[]>([]);
  const [semesters, setSemesters] = useState<number[]>([]);

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const [sectionSummary, setSectionSummary] = useState<SectionSummary | null>(null);
  const [studentRows, setStudentRows] = useState<StudentAttendanceRow[]>([]);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);

  const { user } = useAuth();
  const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);

  // Load assignments once
  useEffect(() => {
    (async () => {
      try {
        const data = await getFacultyAssignments();
        setAssignments(data || []);
      } catch (e) {
        console.error('Error loading assignments:', e);
      }
    })();
  }, []);

  // Derive filters from assignments
  useEffect(() => {
    if (assignments.length === 0) {
      setBatches([]);
      setDepartments([]);
      setSections([]);
      setCourses([]);
      return;
    }
    
    // 1. Batches - Deduplicated by name (as per individual reports logic)
    const uniqueBatchNames = new Set<string>();
    assignments.forEach(a => {
      const details = a.semester_subject_details;
      if (details?.batch_name) {
        uniqueBatchNames.add(details.batch_name);
      }
    });
    setBatches(Array.from(uniqueBatchNames).sort().map(name => ({ id: name, name })));

    // 2. Departments and Semesters depend on selectedBatch (by name)
    if (selectedBatch && selectedBatch !== 'all') {
      const deptsMap = new Map<string, AttendanceDepartment>();
      const sems = new Set<number>();

      assignments.forEach(a => {
        const details = a.semester_subject_details;
        if (details && details.batch_name === selectedBatch) {
          if (details.department_id) {
            const id = String(details.department_id);
            if (!deptsMap.has(id)) {
              deptsMap.set(id, { id, name: details.department_name });
            }
          }
          // Only collect semesters if department also matches (or before dept selection)
          if (selectedDept && String(details.department_id) === selectedDept) {
            if (details.semester_number) sems.add(details.semester_number);
          }
        }
      });
      setDepartments(Array.from(deptsMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setSemesters(Array.from(sems).sort((a, b) => a - b));
    } else {
      setDepartments([]);
      setSemesters([]);
    }

    // 3. Sections and Courses if Dept & Semester & Batch selected
    if (selectedBatch && selectedDept && selectedSemester) {
      const semNum = Number(selectedSemester);
      const secSet = new Set<string>();
      const courseMap = new Map<string, AttendanceCourse>();

      assignments.forEach(a => {
        const details = a.semester_subject_details;
        if (details && 
            details.batch_name === selectedBatch && 
            String(details.department_id) === selectedDept && 
            details.semester_number === semNum) {
          
          if (a.section_name) secSet.add(a.section_name);
          
          const s = details.subject_details;
          if (s) {
            const sid = String(s.id);
            if (!courseMap.has(sid)) {
              courseMap.set(sid, { id: sid, name: s.subject_name || s.name || 'Unknown', code: s.short_code || '' });
            }
          }
        }
      });

      setSections(Array.from(secSet).sort().map(name => ({ name })));
      setCourses(Array.from(courseMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      setSections([]);
      setCourses([]);
    }
  }, [assignments, selectedBatch, selectedDept, selectedSemester]);

  // Load attendance data when filters change
  const loadData = useCallback(async () => {
    if (!selectedDept || !selectedSemester || !selectedSection) {
      setSectionSummary(null);
      setStudentRows([]);
      return;
    }
    setLoading(true);
    try {
      // 1. Find the applicable assignment ID(s)
      const semNum = Number(selectedSemester);
      const relevantAssignments = assignments.filter(a => {
        const details = a.semester_subject_details;
        const isMatch = details && 
          String(details.department_id) === selectedDept && 
          details.semester_number === semNum &&
          a.section_name === selectedSection;
        
        if (!isMatch) return false;
        
        if (selectedBatch && selectedBatch !== 'all' && details.batch_name !== selectedBatch) return false;
        if (selectedSubject !== 'all' && String(details.subject_details?.id) !== selectedSubject) return false;
        
        return true;
      });

      if (relevantAssignments.length === 0) {
        setSectionSummary({ totalClassesConducted: 0, totalStudents: 0, averageAttendance: 0, totalPresent: 0, totalAbsent: 0, below75: 0, below60: 0 });
        setStudentRows([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all students for this context to ensure we show everyone, even with 0 attendance
      const studentParams: any = {
        department: selectedDept,
        semester__number: selectedSemester,
        section__name: selectedSection,
        limit: 500
      };
      if (selectedBatch && selectedBatch !== 'all') studentParams.batch__name = selectedBatch;
      
      const studentsRes = await studentService.getStudents(studentParams);
      const allStudents = studentsRes.results || [];

      // 3. Fetch attendance sessions
      const sessionsPromises = relevantAssignments.map(a => 
        subjectService.getAttendanceSessions({ 
          section_subject_faculty: a.id,
          date_after: dateRange.from?.toISOString().split('T')[0],
          date_before: dateRange.to?.toISOString().split('T')[0],
          limit: 1000 
        })
      );
      
      const sessionsResults = await Promise.all(sessionsPromises);
      const allSessions = sessionsResults.flat();

      if (allSessions.length === 0) {
        setSectionSummary({ 
          totalClassesConducted: 0, 
          totalStudents: allStudents.length, 
          averageAttendance: 0, 
          totalPresent: 0, 
          totalAbsent: 0, 
          below75: 0, 
          below60: 0 
        });
        setStudentRows(allStudents.map(s => ({
          studentId: String(s.id),
          studentName: `${s.user_details?.first_name || ''} ${s.user_details?.last_name || ''}`.trim() || 'Unknown',
          rollNo: s.roll_number || '',
          totalClasses: 0,
          present: 0,
          absent: 0,
          attendancePercent: 0,
          status: 'Critical',
          consecutiveAbsences: 0,
        })));
        setLoading(false);
        return;
      }

      const totalClasses = allSessions.length;
      let totalPresent = 0, totalAbsent = 0;

      // Build per-student stats
      const rows: StudentAttendanceRow[] = allStudents.map(student => {
        const sid = String(student.id);
        let presentCount = 0;
        let absentCount = 0;
        
        // Sorting sessions by date for streak calculation
        const sortedSessions = [...allSessions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        const studentRecords = sortedSessions.map(session => {
          const record = (session.records || []).find((r: any) => String(r.student?.id || r.student) === sid);
          return { date: session.date || '', isPresent: !!record?.is_present };
        });

        presentCount = studentRecords.filter(r => r.isPresent).length;
        absentCount = totalClasses - presentCount;
        
        totalPresent += presentCount;
        totalAbsent += absentCount;

        const percent = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
        const { current: consecutiveAbsences } = computeStreaks(studentRecords);

        return {
          studentId: sid,
          studentName: `${student.user_details?.first_name || ''} ${student.user_details?.last_name || ''}`.trim() || 'Unknown',
          rollNo: student.roll_number || '',
          totalClasses,
          present: presentCount,
          absent: absentCount,
          attendancePercent: percent,
          status: classifyAttendance(percent),
          consecutiveAbsences,
        };
      });

      rows.sort((a, b) => a.studentName.localeCompare(b.studentName));

      const avgAttendance = rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + r.attendancePercent, 0) / rows.length)
        : 0;

      setSectionSummary({
        totalClassesConducted: totalClasses,
        totalStudents: rows.length,
        averageAttendance: avgAttendance,
        totalPresent,
        totalAbsent,
        below75: rows.filter(r => r.attendancePercent < 75).length,
        below60: rows.filter(r => r.attendancePercent < 60).length,
      });
      setStudentRows(rows);
    } catch (e) {
      console.error('Error loading attendance:', e);
    }
    setLoading(false);
  }, [selectedDept, selectedSemester, selectedBatch, selectedSection, selectedSubject, dateRange, assignments]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load student detail
  const loadStudentDetail = useCallback(async (studentId: string) => {
    if (!selectedDept || !selectedSemester || !selectedSection) return;
    setLoading(true);
    try {
      const semNum = Number(selectedSemester);
      const relevantAssignments = assignments.filter(a => {
        const details = a.semester_subject_details;
        return details && 
          String(details.department_id) === selectedDept && 
          details.semester_number === semNum &&
          a.section_name === selectedSection;
      });

      const sessionsPromises = relevantAssignments.map(a => 
        subjectService.getAttendanceSessions({ 
          section_subject_faculty: a.id,
          date_after: dateRange.from?.toISOString().split('T')[0],
          date_before: dateRange.to?.toISOString().split('T')[0],
          limit: 1000 
        })
      );
      
      const sessionsResults = await Promise.all(sessionsPromises);
      const allSessions = sessionsResults.flat();
      
      // Fetch student profile explicitly
      const student = await studentService.getStudent(studentId);
      
      // Course map for names
      const courseMap = new Map(courses.map(c => [c.id, c]));

      // Subject-wise breakdown
      const subjectMap = new Map<string, { total: number; present: number }>();
      const dateWise: DateAttendance[] = [];

      for (const session of allSessions) {
        const courseId = String(session.semester_subject_details?.subject || '');
        if (!courseId) continue;
        
        if (!subjectMap.has(courseId)) subjectMap.set(courseId, { total: 0, present: 0 });
        subjectMap.get(courseId)!.total++;

        const record = (session.records || []).find((r: any) => String(r.student?.id || r.student) === studentId);
        if (record?.is_present) {
          subjectMap.get(courseId)!.present++;
        }

        const course = courseMap.get(courseId);
        dateWise.push({
          date: session.date || '',
          subject: course?.name || 'Unknown',
          status: record?.is_present ? 'Present' : 'Absent',
        });
      }

      const subjects: SubjectAttendance[] = [];
      for (const [courseId, data] of subjectMap) {
        const course = courseMap.get(courseId);
        const percent = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
        subjects.push({
          courseId,
          courseName: course?.name || 'Unknown',
          courseCode: course?.code || '',
          totalClasses: data.total,
          present: data.present,
          absent: data.total - data.present,
          attendancePercent: percent,
          risk: classifyAttendance(percent),
        });
      }

      dateWise.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      // Overall stats for the selected context
      const filteredSessions = selectedSubject !== 'all' 
        ? allSessions.filter(s => String(s.semester_subject_details?.subject) === selectedSubject)
        : allSessions;
      
      const totalClasses = filteredSessions.length;
      const totalPresent = filteredSessions.filter(s => 
        (s.records || []).some((r: any) => String(r.student?.id || r.student) === studentId && r.is_present)
      ).length;
      
      const percent = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
      
      const recordsForStreak = allSessions
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .map(s => ({
          date: s.date || '',
          isPresent: (s.records || []).some((r: any) => String(r.student?.id || r.student) === studentId && r.is_present)
        }));
      
      const { current, longest, lastAttended } = computeStreaks(recordsForStreak);

      setStudentDetail({
        studentId,
        studentName: `${student.user_details?.first_name || ''} ${student.user_details?.last_name || ''}`.trim() || 'Unknown',
        rollNo: student.roll_number || '',
        totalClasses,
        present: totalPresent,
        absent: totalClasses - totalPresent,
        attendancePercent: percent,
        requiredPercent: 75,
        shortagePercent: Math.max(0, 75 - percent),
        currentAbsenceStreak: current,
        longestAbsenceStreak: longest,
        lastAttendedDate: lastAttended,
        subjects: selectedSubject !== 'all' ? subjects.filter(s => s.courseId === selectedSubject) : subjects,
        dateWise: selectedSubject !== 'all' ? dateWise.filter(d => {
          const course = courses.find(c => c.id === selectedSubject);
          return d.subject === course?.name;
        }) : dateWise,
      });
    } catch (e) {
      console.error('Error loading student detail:', e);
    }
    setLoading(false);
  }, [selectedDept, selectedSemester, selectedBatch, selectedSection, selectedSubject, dateRange, courses, assignments]);

  const clearStudentDetail = useCallback(() => setStudentDetail(null), []);

  return {
    departments, batches, sections, courses, semesters,
    selectedDept, setSelectedDept,
    selectedSemester, setSelectedSemester,
    selectedBatch, setSelectedBatch,
    selectedSection, setSelectedSection,
    selectedSubject, setSelectedSubject,
    dateRange, setDateRange,
    sectionSummary, studentRows, studentDetail,
    loading, filtersLoading,
    loadStudentDetail, clearStudentDetail,
  };
}

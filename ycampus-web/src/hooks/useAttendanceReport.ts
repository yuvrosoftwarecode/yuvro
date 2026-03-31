import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  if (percent >= 85) return 'Excellent';
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

  // Load departments
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('departments').select('id, name').order('name');
      setDepartments(data || []);
    })();
  }, []);

  // Load batches & sections & courses when dept/semester change
  useEffect(() => {
    if (!selectedDept) return;
    setFiltersLoading(true);
    (async () => {
      // Batches
      const { data: batchData } = await supabase
        .from('batch_ids')
        .select('id, name')
        .eq('department_id', selectedDept)
        .eq('is_archived', false)
        .order('name');
      setBatches(batchData || []);

      // Sections from department_sections via department_semesters
      if (selectedSemester) {
        const { data: semData } = await supabase
          .from('department_semesters')
          .select('id')
          .eq('department_id', selectedDept)
          .eq('number', Number(selectedSemester));
        if (semData && semData.length > 0) {
          const { data: secData } = await supabase
            .from('department_sections')
            .select('name')
            .eq('semester_id', semData[0].id)
            .order('name');
          setSections(secData || []);
        } else {
          setSections([]);
        }

        // Courses
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, name, code')
          .eq('department_id', selectedDept)
          .eq('semester', Number(selectedSemester))
          .order('name');
        setCourses(courseData || []);
      } else {
        setSections([]);
        setCourses([]);
      }
      setFiltersLoading(false);
    })();
  }, [selectedDept, selectedSemester]);

  // Load attendance data when filters change
  const loadData = useCallback(async () => {
    if (!selectedDept || !selectedSemester || !selectedSection) {
      setSectionSummary(null);
      setStudentRows([]);
      return;
    }
    setLoading(true);
    try {
      // Build session query
      let sessionQuery = supabase
        .from('attendance_sessions')
        .select('id, course_id, session_date')
        .eq('department_id', selectedDept)
        .eq('semester', Number(selectedSemester))
        .eq('section', selectedSection)
        .eq('is_cancelled', false);

      if (selectedBatch) sessionQuery = sessionQuery.eq('batch_id', selectedBatch);
      if (selectedSubject !== 'all') sessionQuery = sessionQuery.eq('course_id', selectedSubject);
      if (dateRange.from) sessionQuery = sessionQuery.gte('session_date', dateRange.from.toISOString().split('T')[0]);
      if (dateRange.to) sessionQuery = sessionQuery.lte('session_date', dateRange.to.toISOString().split('T')[0]);

      const { data: sessions } = await sessionQuery;
      if (!sessions || sessions.length === 0) {
        setSectionSummary({ totalClassesConducted: 0, totalStudents: 0, averageAttendance: 0, totalPresent: 0, totalAbsent: 0, below75: 0, below60: 0 });
        setStudentRows([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);
      // Fetch all attendance records for these sessions
      const { data: records } = await supabase
        .from('attendance_records')
        .select('session_id, student_id, is_present')
        .in('session_id', sessionIds);

      // Get unique student IDs
      const studentIds = [...new Set((records || []).map(r => r.student_id))];
      
      // Fetch student profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds.length > 0 ? studentIds : ['__none__']);

      // Fetch student roll numbers from student_semester_mapping
      const { data: mappings } = await supabase
        .from('student_semester_mapping')
        .select('student_id, academic_year')
        .in('student_id', studentIds.length > 0 ? studentIds : ['__none__']);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const rollMap = new Map((mappings || []).map(m => [m.student_id, m.academic_year]));

      const totalClasses = sessions.length;

      // Build per-student attendance
      const studentMap = new Map<string, { present: number; absent: number }>();
      for (const r of records || []) {
        if (!studentMap.has(r.student_id)) studentMap.set(r.student_id, { present: 0, absent: 0 });
        const s = studentMap.get(r.student_id)!;
        if (r.is_present) s.present++;
        else s.absent++;
      }

      const rows: StudentAttendanceRow[] = [];
      let totalPresent = 0, totalAbsent = 0;

      for (const [sid, data] of studentMap) {
        const profile = profileMap.get(sid);
        const percent = totalClasses > 0 ? Math.round((data.present / totalClasses) * 100) : 0;
        totalPresent += data.present;
        totalAbsent += data.absent;

        // Calculate consecutive absences
        const studentRecords = (records || [])
          .filter(r => r.student_id === sid)
          .map(r => {
            const session = sessions.find(s => s.id === r.session_id);
            return { date: session?.session_date || '', isPresent: r.is_present };
          });
        const { current: consecutiveAbsences } = computeStreaks(studentRecords);

        let status = classifyAttendance(percent);
        if (consecutiveAbsences >= 5) status = 'Critical';
        else if (consecutiveAbsences >= 3 && status !== 'Critical') status = 'Warning';

        rows.push({
          studentId: sid,
          studentName: profile?.full_name || 'Unknown',
          rollNo: rollMap.get(sid) || profile?.email?.split('@')[0] || '',
          totalClasses,
          present: data.present,
          absent: data.absent,
          attendancePercent: percent,
          status,
          consecutiveAbsences,
        });
      }

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
  }, [selectedDept, selectedSemester, selectedBatch, selectedSection, selectedSubject, dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load student detail
  const loadStudentDetail = useCallback(async (studentId: string) => {
    if (!selectedDept || !selectedSemester || !selectedSection) return;
    setLoading(true);
    try {
      let sessionQuery = supabase
        .from('attendance_sessions')
        .select('id, course_id, session_date')
        .eq('department_id', selectedDept)
        .eq('semester', Number(selectedSemester))
        .eq('section', selectedSection)
        .eq('is_cancelled', false);

      if (selectedBatch) sessionQuery = sessionQuery.eq('batch_id', selectedBatch);
      if (dateRange.from) sessionQuery = sessionQuery.gte('session_date', dateRange.from.toISOString().split('T')[0]);
      if (dateRange.to) sessionQuery = sessionQuery.lte('session_date', dateRange.to.toISOString().split('T')[0]);

      const { data: allSessions } = await sessionQuery;
      if (!allSessions) { setLoading(false); return; }

      const sessionIds = allSessions.map(s => s.id);
      const { data: records } = await supabase
        .from('attendance_records')
        .select('session_id, student_id, is_present')
        .eq('student_id', studentId)
        .in('session_id', sessionIds);

      const { data: profile } = await supabase.from('profiles').select('id, full_name, email').eq('id', studentId).maybeSingle();
      const { data: mapping } = await supabase.from('student_semester_mapping').select('academic_year').eq('student_id', studentId).maybeSingle();

      // Course map
      const courseMap = new Map(courses.map(c => [c.id, c]));

      // Subject-wise breakdown
      const subjectMap = new Map<string, { total: number; present: number }>();
      for (const session of allSessions) {
        const courseId = session.course_id;
        if (!subjectMap.has(courseId)) subjectMap.set(courseId, { total: 0, present: 0 });
        subjectMap.get(courseId)!.total++;
      }

      for (const r of records || []) {
        const session = allSessions.find(s => s.id === r.session_id);
        if (session && r.is_present) {
          if (subjectMap.has(session.course_id)) {
            subjectMap.get(session.course_id)!.present++;
          }
        }
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

      // Date-wise breakdown
      const dateWise: DateAttendance[] = [];
      for (const r of records || []) {
        const session = allSessions.find(s => s.id === r.session_id);
        if (session) {
          const course = courseMap.get(session.course_id);
          dateWise.push({
            date: session.session_date,
            subject: course?.name || 'Unknown',
            status: r.is_present ? 'Present' : 'Absent',
          });
        }
      }
      dateWise.sort((a, b) => b.date.localeCompare(a.date));

      // Overall stats
      const totalClasses = selectedSubject !== 'all'
        ? (subjectMap.get(selectedSubject)?.total || 0)
        : allSessions.length;
      const totalPresent = selectedSubject !== 'all'
        ? (subjectMap.get(selectedSubject)?.present || 0)
        : (records || []).filter(r => r.is_present).length;
      const totalAbsent = totalClasses - totalPresent;
      const percent = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

      const allRecords = (records || []).map(r => {
        const session = allSessions.find(s => s.id === r.session_id);
        return { date: session?.session_date || '', isPresent: r.is_present };
      });
      const { current, longest, lastAttended } = computeStreaks(allRecords);

      setStudentDetail({
        studentId,
        studentName: profile?.full_name || 'Unknown',
        rollNo: mapping?.academic_year || profile?.email?.split('@')[0] || '',
        totalClasses,
        present: totalPresent,
        absent: totalAbsent,
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
  }, [selectedDept, selectedSemester, selectedBatch, selectedSection, selectedSubject, dateRange, courses]);

  const clearStudentDetail = useCallback(() => setStudentDetail(null), []);

  return {
    departments, batches, sections, courses,
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

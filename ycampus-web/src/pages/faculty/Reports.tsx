import React, { useState, useEffect, useMemo } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStudentReport } from '@/hooks/useStudentReport';
import ReportFilters from '@/components/faculty/reports/ReportFilters';
import StudentListView from '@/components/faculty/reports/StudentListView';
import StudentOverview from '@/components/faculty/reports/StudentOverview';
import SubjectMatrix from '@/components/faculty/reports/SubjectMatrix';
import StrengthWeakness from '@/components/faculty/reports/StrengthWeakness';
import PendingRiskSummary from '@/components/faculty/reports/PendingRiskSummary';
import AttendanceConsistency from '@/components/faculty/reports/AttendanceConsistency';
import StreaksAchievements from '@/components/faculty/reports/StreaksAchievements';
import PlacementReadiness from '@/components/faculty/reports/PlacementReadiness';
import { downloadPDF, downloadExcel } from '@/components/faculty/reports/ReportExporter';
import { getFacultyAssignments, SectionSubjectFaculty } from '@/services/subjectService';
import studentService from '@/services/studentService';

// Dummy students for when DB returns empty
const DUMMY_STUDENTS = [
  { id: 'dummy-1', name: 'Aarav Sharma', rollNo: 'CSE2021001', email: 'aarav.sharma@campus.edu' },
  { id: 'dummy-2', name: 'Priya Mehta', rollNo: 'CSE2021002', email: 'priya.mehta@campus.edu' },
  { id: 'dummy-3', name: 'Rohan Gupta', rollNo: 'CSE2021003', email: 'rohan.gupta@campus.edu' },
  { id: 'dummy-4', name: 'Sneha Reddy', rollNo: 'CSE2021004', email: 'sneha.reddy@campus.edu' },
  { id: 'dummy-5', name: 'Vikram Patel', rollNo: 'CSE2021005', email: 'vikram.patel@campus.edu' },
  { id: 'dummy-6', name: 'Ananya Iyer', rollNo: 'CSE2021006', email: 'ananya.iyer@campus.edu' },
  { id: 'dummy-7', name: 'Karthik Nair', rollNo: 'CSE2021007', email: 'karthik.nair@campus.edu' },
  { id: 'dummy-8', name: 'Divya Joshi', rollNo: 'CSE2021008', email: 'divya.joshi@campus.edu' },
  { id: 'dummy-9', name: 'Arjun Singh', rollNo: 'CSE2021009', email: 'arjun.singh@campus.edu' },
  { id: 'dummy-10', name: 'Meera Kulkarni', rollNo: 'CSE2021010', email: 'meera.kulkarni@campus.edu' },
];

// Generate snapshot metrics for student list (deterministic per student)
function generateSnapshot(id: string, index: number) {
  const seeds = [
    { pi: 78, ps: 72, pri: 75, att: 88, task: 82 },
    { pi: 85, ps: 80, pri: 83, att: 92, task: 90 },
    { pi: 62, ps: 55, pri: 59, att: 74, task: 65 },
    { pi: 91, ps: 88, pri: 90, att: 96, task: 94 },
    { pi: 50, ps: 45, pri: 48, att: 68, task: 55 },
    { pi: 74, ps: 68, pri: 71, att: 85, task: 77 },
    { pi: 88, ps: 82, pri: 85, att: 93, task: 88 },
    { pi: 55, ps: 50, pri: 53, att: 72, task: 60 },
    { pi: 92, ps: 87, pri: 90, att: 95, task: 93 },
    { pi: 67, ps: 60, pri: 64, att: 78, task: 70 },
  ];
  return seeds[index % seeds.length];
}

const Reports: React.FC = () => {
  const { toast } = useToast();
  const {
    report, loading, loadReport,
    studentsLoading: hookStudentsLoading,
    allStudents: hookAllStudents,
  } = useStudentReport();

  const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
  const [realStudents, setRealStudents] = useState<any[]>([]);
  const [isFetchLoading, setIsFetchLoading] = useState(false);
  
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [showStudentList, setShowStudentList] = useState(false);

  // Fetch assignments on mount
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const data = await getFacultyAssignments();
        setAssignments(data);
      } catch (err) {
        console.error("Failed to fetch assignments", err);
      }
    };
    fetchAssignments();
  }, []);

  // New Hierarchical reset logic: Batch -> Department -> Semester -> Subject -> Section
  useEffect(() => { setSelectedDepartment('all'); setSelectedSemester('all'); setSelectedSubject('all'); setSelectedSection('all'); }, [selectedBatch]);
  useEffect(() => { setSelectedSemester('all'); setSelectedSubject('all'); setSelectedSection('all'); }, [selectedDepartment]);
  useEffect(() => { setSelectedSubject('all'); setSelectedSection('all'); }, [selectedSemester]);
  useEffect(() => { setSelectedSection('all'); }, [selectedSubject]);

  // Derived filter options (Objects with ID and Name)
  const batchesList = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a: SectionSubjectFaculty) => {
      const d = a.semester_subject_details;
      if (d) map.set(d.batch_name, d.batch_name); 
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  const departments = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a: SectionSubjectFaculty) => {
      const d = a.semester_subject_details;
      if (d && (selectedBatch === 'all' || d.batch_name === selectedBatch)) {
          if (d.department_id) map.set(String(d.department_id), d.department_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments, selectedBatch]);

  const semestersList = useMemo(() => {
    const set = new Set<number>();
    assignments.forEach((a: SectionSubjectFaculty) => {
      const d = a.semester_subject_details;
      const matchBatch = selectedBatch === 'all' || (d && d.batch_name === selectedBatch);
      const matchDept = selectedDepartment === 'all' || (d && String(d.department_id) === selectedDepartment);
      if (d && matchBatch && matchDept) {
        set.add(d.semester_number);
      }
    });
    return Array.from(set).sort((a, b) => a - b).map(n => ({ id: String(n), name: `Semester ${n}` }));
  }, [assignments, selectedBatch, selectedDepartment]);

  const subjectsList = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a: SectionSubjectFaculty) => {
      const d = a.semester_subject_details;
      const matchBatch = selectedBatch === 'all' || (d && d.batch_name === selectedBatch);
      const matchDept = selectedDepartment === 'all' || (d && String(d.department_id) === selectedDepartment);
      const matchSem = selectedSemester === 'all' || (d && String(d.semester_number) === selectedSemester);
      if (d && matchBatch && matchDept && matchSem) {
        set.add(d.subject_details.subject_name);
      }
    });
    return Array.from(set).map(name => ({ id: name, name }));
  }, [assignments, selectedBatch, selectedDepartment, selectedSemester]);

  const sectionsList = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a: SectionSubjectFaculty) => {
      const d = a.semester_subject_details;
      const matchBatch = selectedBatch === 'all' || (d && d.batch_name === selectedBatch);
      const matchDept = selectedDepartment === 'all' || (d && String(d.department_id) === selectedDepartment);
      const matchSem = selectedSemester === 'all' || (d && String(d.semester_number) === selectedSemester);
      const matchSubject = selectedSubject === 'all' || (d && d.subject_details.subject_name === selectedSubject);
      
      if (d && matchBatch && matchDept && matchSem && matchSubject) {
        map.set(String(a.section), a.section_name || 'Unknown Section');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments, selectedBatch, selectedDepartment, selectedSemester, selectedSubject]);

  // Fetch real students from backend when filters change
  useEffect(() => {
    const fetchStudents = async () => {
      if (selectedDepartment === 'all') {
        setRealStudents([]);
        return;
      }

      setIsFetchLoading(true);
      try {
        const params: any = {};
        if (selectedDepartment !== 'all') params.department = selectedDepartment;
        if (selectedBatch !== 'all') params.batch_name = selectedBatch; 
        if (selectedSemester !== 'all') params.semester_number = selectedSemester;
        if (selectedSection !== 'all') params.section = selectedSection;

        const response = await studentService.getStudents(params);
        
        const students = response.results.map(s => ({
          id: String(s.id),
          name: `${s.user_details.first_name} ${s.user_details.last_name}`,
          rollNo: s.roll_number,
          email: s.user_details.email,
          image: s.user_details.profile?.profile_image,
          department_name: s.department_name,
          batch_name: s.batch_name,
          semester: s.semester_number ? String(s.semester_number) : undefined,
          section: s.section_name || s.section ? String(s.section_name || s.section) : undefined,
        }));
        
        setRealStudents(students);
      } catch (err) {
        console.error("Failed to fetch students", err);
        toast({ title: "Error", description: "Failed to fetch students from backend", variant: "destructive" });
      } finally {
        setIsFetchLoading(false);
      }
    };

    fetchStudents();
  }, [selectedDepartment, selectedBatch, selectedSemester, selectedSection, toast]);

  // Combined students for search and list navigation
  const combinedAllStudents = useMemo(() => {
    const list = [...realStudents];
    if (selectedStudent && !list.find(s => s.id === selectedStudent)) {
      const s = hookAllStudents.find((st: any) => String(st.id) === selectedStudent);
      if (s) list.push({
        id: String(s.id),
        name: `${s.user_details.first_name} ${s.user_details.last_name}`,
        rollNo: s.roll_number,
        email: s.user_details.email
      });
    }
    return list;
  }, [realStudents, selectedStudent, hookAllStudents]);

  const allAvailableStudents = combinedAllStudents;

  const filteredStudentList = useMemo(() => {
    let source = allAvailableStudents;

    if (studentSearch.length > 0) {
      const q = studentSearch.toLowerCase();
      source = source.filter((s: any) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.rollNo || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      );
    }

    return source.map((s: any, i: number) => {
      const snap = generateSnapshot(s.id, i);
      const deptObj = departments.find((d: any) => d.id === selectedDepartment);
      
      return {
        student: s,
        department: s.department_name || (deptObj ? deptObj.name : 'Unknown'),
        semester: s.semester || (selectedSemester !== 'all' ? selectedSemester : '5'),
        section: s.section || (selectedSection !== 'all' ? (sectionsList.find((sec: any) => String(sec.id) === selectedSection)?.name || 'A') : 'A'),
        pi: snap.pi,
        ps: snap.ps,
        pri: snap.pri,
        attendance: snap.att,
        taskCompletion: snap.task,
      };
    });
  }, [allAvailableStudents, studentSearch, selectedDepartment, departments, selectedSemester, selectedSection, sectionsList]);

  // Show student list when a department is selected
  useEffect(() => {
    if (selectedDepartment !== 'all') {
      setShowStudentList(true);
    } else {
      setShowStudentList(false);
    }
  }, [selectedDepartment]);

  // Load report when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      const student = allAvailableStudents.find(s => s.id === selectedStudent);

      let assignedSubjects = assignments.filter((a: SectionSubjectFaculty) => {
        let match = true;
        if (selectedDepartment !== 'all') {
          match = match && String(a.semester_subject_details?.department_id) === selectedDepartment;
        }
        if (selectedSemester !== 'all') {
          match = match && String(a.semester_subject_details?.semester_number) === selectedSemester;
        }
        if (selectedSection !== 'all') {
          match = match && String(a.section) === selectedSection;
        }
        return match;
      })
      .map((a: SectionSubjectFaculty) => a.semester_subject_details?.subject_details)
      .filter(Boolean);

      // Remove duplicates based on subject id
      assignedSubjects = assignedSubjects.filter((subj: any, index: number, self: any[]) => 
        index === self.findIndex((s: any) => s?.id === subj?.id)
      );

      loadReport(selectedStudent, { externalSubjects: assignedSubjects }, student || undefined);
    }
  }, [selectedStudent, selectedDepartment, selectedSemester, selectedSection, assignments, loadReport, allAvailableStudents]);

  const handleSearchTriggered = () => {
    if (studentSearch.length > 0) {
      setSelectedStudent('');
      setShowStudentList(true);
    }
  };

  const handleStudentSelectFromList = (studentId: string) => {
    const student = allAvailableStudents.find(s => s.id === studentId);
    if (student) {
      setStudentSearch(student.name);
    }
    setSelectedStudent(studentId);
    setShowStudentList(false);
  };

  const handleBackToList = () => {
    setSelectedStudent('');
    setShowStudentList(true);
  };

  const filteredSubjects = report
    ? selectedSubject === 'all'
      ? report.subjects
      : report.subjects.filter(s => s.id === selectedSubject)
    : [];

  const handleDownloadPDF = () => {
    if (!report) return;
    downloadPDF(report);
    toast({ title: 'PDF Downloaded', description: 'Student report has been downloaded.' });
  };

  const handleDownloadExcel = () => {
    if (!report) return;
    downloadExcel(report);
    toast({ title: 'Excel Downloaded', description: 'Student report has been exported to Excel.' });
  };

  const showReport = !loading && report && selectedStudent && !showStudentList;
  const showList = !loading && showStudentList && !selectedStudent;
  const showEmpty = !loading && !showStudentList && selectedDepartment === 'all' && !selectedStudent;

  return (
    <FacultyLayout>
      <div className="space-y-5 max-w-[1400px] mx-auto">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {showReport && (
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">Student Reports</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {showReport
                  ? `Viewing report for ${report?.studentName}`
                  : 'Consolidated academic report — performance, progress & placement readiness'}
              </p>
            </div>
          </div>
          {showReport && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4 mr-1.5" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                Excel
              </Button>
            </div>
          )}
        </div>

        {!showReport && (
          <ReportFilters
            departments={departments}
            subjects={subjectsList}
            batches={batchesList}
            semesters={semestersList}
            students={filteredStudentList.map((s: any) => s.student)}
            allStudents={combinedAllStudents}
            sections={sectionsList}
            selectedDepartment={selectedDepartment}
            selectedSemester={selectedSemester}
            selectedBatch={selectedBatch}
            selectedStudent={selectedStudent}
            selectedSubject={selectedSubject}
            selectedSection={selectedSection}
            studentSearch={studentSearch}
            studentsLoading={isFetchLoading || hookStudentsLoading}
            onDepartmentChange={setSelectedDepartment}
            onSemesterChange={setSelectedSemester}
            onBatchChange={setSelectedBatch}
            onStudentChange={(id) => {
              if (id) {
                handleStudentSelectFromList(id);
              } else {
                setSelectedStudent('');
              }
            }}
            onSubjectChange={setSelectedSubject}
            onSectionChange={setSelectedSection}
            onStudentSearchChange={(v) => {
              setStudentSearch(v);
              if (!v) {
                setSelectedStudent('');
                if (selectedDepartment !== 'all') {
                  setShowStudentList(true);
                } else {
                  setShowStudentList(false);
                }
              }
            }}
            onSearchTriggered={handleSearchTriggered}
          />
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading report...</span>
          </div>
        )}

        {showList && (
          <StudentListView
            students={filteredStudentList}
            onSelectStudent={handleStudentSelectFromList}
          />
        )}

        {showEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Select a department to view students</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Use the department filter above to see students, or search by name or roll number.
            </p>
          </div>
        )}

        {showReport && (
          <div className="space-y-5">
            <StudentOverview report={report} />
            <SubjectMatrix
              subjects={filteredSubjects}
              expandedSubjects={expandedSubjects}
              onToggleExpand={id => setExpandedSubjects(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <StrengthWeakness report={report} />
              <PendingRiskSummary report={report} />
            </div>
            <PlacementReadiness report={report} />
            <AttendanceConsistency report={report} />
            <StreaksAchievements report={report} />
          </div>
        )}
      </div>
    </FacultyLayout>
  );
};

export default Reports;

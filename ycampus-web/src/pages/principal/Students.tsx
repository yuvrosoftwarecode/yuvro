import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PrincipalSidebar } from '@/components/principal/PrincipalSidebar';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStudentReport } from '@/hooks/useStudentReport';
import PrincipalReportFilters from '@/components/principal/ReportFilters';
import StudentListView from '@/components/faculty/reports/StudentListView';
import StudentOverview from '@/components/faculty/reports/StudentOverview';
import SubjectMatrix from '@/components/faculty/reports/SubjectMatrix';
import StrengthWeakness from '@/components/faculty/reports/StrengthWeakness';
import PendingRiskSummary from '@/components/faculty/reports/PendingRiskSummary';
import AttendanceConsistency from '@/components/faculty/reports/AttendanceConsistency';
import StreaksAchievements from '@/components/faculty/reports/StreaksAchievements';
import PlacementReadiness from '@/components/faculty/reports/PlacementReadiness';
import { downloadPDF, downloadExcel } from '@/components/faculty/reports/ReportExporter';

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

const PrincipalStudents = () => {
  const { toast } = useToast();
  const {
    departments, courses, batches, students, allStudents, report, loading, filtersLoading, studentsLoading,
    loadCourses, loadBatches, loadStudents, loadReport, assignments,
  } = useStudentReport({ mode: 'principal' });

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStudentObj, setSelectedStudentObj] = useState<BatchStudent | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [showStudentList, setShowStudentList] = useState(false);

  // Local state for tracking manual filter interaction vs auto-selection
  const isAutoSelecting = useRef(false);

  // ──────────────────────────────────────────────────────────────────
  // HIERARCHICAL FILTER DERIVATION
  // ──────────────────────────────────────────────────────────────────

  const derivedDepartments = useMemo(() => {
    if (!selectedBatch) return [];
    const depts = new Set<string>();
    const options: any[] = [];
    
    assignments.forEach((a: any) => {
      const details = a.semester_subject_details;
      if (details && details.batch_name === selectedBatch && details.department_id) {
        const idStr = String(details.department_id);
        if (!depts.has(idStr)) {
          depts.add(idStr);
          options.push({
            id: idStr,
            name: details.department_name || 'Unknown',
            code: details.department_short_form || ''
          });
        }
      }
    });
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, selectedBatch]);

  const derivedSemesters = useMemo(() => {
    if (!selectedBatch || !selectedDepartment) return [];
    const sems = new Set<number>();
    
    assignments.forEach((a: any) => {
      const details = a.semester_subject_details;
      if (details && details.batch_name === selectedBatch && String(details.department_id) === selectedDepartment) {
        sems.add(details.semester_number);
      }
    });
    return Array.from(sems).sort((a, b) => a - b);
  }, [assignments, selectedBatch, selectedDepartment]);

  const derivedSections = useMemo(() => {
    if (!selectedBatch || !selectedDepartment || !selectedSemester) return [];
    const secs = new Set<string>();
    
    assignments.forEach((a: any) => {
      const details = a.semester_subject_details;
      if (details && details.batch_name === selectedBatch && 
          String(details.department_id) === selectedDepartment && 
          String(details.semester_number) === selectedSemester) {
        if (a.section_name) secs.add(a.section_name);
      }
    });
    return Array.from(secs).sort().map(name => ({ name }));
  }, [assignments, selectedBatch, selectedDepartment, selectedSemester]);

  const derivedSubjects = useMemo(() => {
    if (!selectedBatch || !selectedDepartment || !selectedSemester || (selectedSection !== 'all' && !selectedSection)) return [];
    const subjs = new Set<string>();
    const options: any[] = [];
    
    assignments.forEach((a: any) => {
      const details = a.semester_subject_details;
      const isSecMatch = selectedSection === 'all' || a.section_name === selectedSection;
      
      if (details && details.batch_name === selectedBatch && 
          String(details.department_id) === selectedDepartment && 
          String(details.semester_number) === selectedSemester &&
          isSecMatch) {
        const s = details.subject_details;
        if (s && !subjs.has(String(s.id))) {
          subjs.add(String(s.id));
          options.push({
            id: String(s.id),
            name: s.subject_name || s.name || 'Unknown',
            code: s.short_code || '',
            semester: details.semester_number
          });
        }
      }
    });
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments, selectedBatch, selectedDepartment, selectedSemester, selectedSection]);

  useEffect(() => {
    if (selectedBatch && !isAutoSelecting.current && !selectedStudent) {
      if (!selectedDepartment) {
        loadStudents({ batch__name: selectedBatch });
      } else {
        const params: any = { batch__name: selectedBatch, department: selectedDepartment };
        if (selectedSemester) params.semester__number = selectedSemester;
        if (selectedSection && selectedSection !== 'all') params.section__name = selectedSection;
        loadStudents(params);
      }
      setShowStudentList(true);
    } else if (!selectedBatch && !selectedStudent) {
      setShowStudentList(false);
    }
  }, [selectedBatch, selectedDepartment, selectedSemester, selectedSection, loadStudents, selectedStudent]);

  // Merge dummy students into allStudents for search and report loading
  const combinedAllStudents = useMemo(() => {
    const existingIds = new Set(allStudents.map(s => s.id));
    const extras = DUMMY_STUDENTS.filter(s => !existingIds.has(s.id));
    return [...allStudents, ...extras];
  }, [allStudents]);

  // Load report WITHOUT any filters — report always shows ALL data for the student
  useEffect(() => {
    if (selectedStudent) {
      const student = combinedAllStudents.find(s => s.id === selectedStudent);
      loadReport(selectedStudent, {}, student || undefined);
    }
  }, [selectedStudent, loadReport, combinedAllStudents]);

  // Build the filtered student list for the intermediate view
  const filteredStudentList = useMemo(() => {
    let sourceStudents = studentSearch.length > 0 ? combinedAllStudents : students;

    // Use dummy data if no real students loaded
    if (sourceStudents.length === 0 && selectedDepartment) {
      const deptCode = departments.find(d => d.id === selectedDepartment)?.code || 'CSE';
      sourceStudents = DUMMY_STUDENTS.map(s => ({
        ...s,
        rollNo: s.rollNo.replace('CSE', deptCode.toUpperCase()),
      }));
    }

    let filtered = sourceStudents;

    if (studentSearch.length > 0) {
      const q = studentSearch.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }

    const deptName = departments.find(d => d.id === selectedDepartment)?.name;
    const sectionLabels = ['A', 'B', 'C', 'A', 'B', 'A', 'C', 'B', 'A', 'B'];

    return filtered.map((s, i) => {
      const snap = generateSnapshot(s.id, i);
      return {
        student: s,
        department: s.department_name || deptName || 'Unknown',
        semester: s.semester_number ? `Semester ${s.semester_number}` : (selectedSemester ? `Semester ${selectedSemester}` : 'N/A'),
        section: s.section_name ? `Section ${s.section_name}` : (selectedSection !== 'all' ? `Section ${selectedSection}` : 'N/A'),
        pi: snap.pi,
        ps: snap.ps,
        pri: snap.pri,
        attendance: snap.att,
        taskCompletion: snap.task,
      };
    });
  }, [studentSearch, combinedAllStudents, students, departments, selectedDepartment, selectedSemester, selectedSection]);

  const handleSearchTriggered = () => {
    if (studentSearch.length > 0) {
      setSelectedStudent('');
      setShowStudentList(true);
    }
  };

  const handleStudentSelectFromList = (studentId: string) => {
    const student = combinedAllStudents.find(s => s.id === studentId) || students.find(s => s.id === studentId);
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

  // Determine view state
  const showReport = !loading && report && selectedStudent && !showStudentList;
  const showList = !loading && showStudentList && !selectedStudent;
  const showEmpty = !loading && !showStudentList && !selectedDepartment && !selectedStudent;

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <PrincipalSidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <main className="flex-1 p-4 md:p-6 bg-background overflow-y-auto">
            <div className="space-y-5 max-w-[1400px] mx-auto">
              {/* Header */}
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

              {/* Filters - hidden when viewing full report */}
              {!showReport && (
                <PrincipalReportFilters
                  departments={derivedDepartments}
                  courses={derivedSubjects}
                  batches={batches}
                  students={students}
                  allStudents={allStudents}
                  sections={derivedSections}
                  semesters={derivedSemesters}
                  selectedDepartment={selectedDepartment}
                  selectedSemester={selectedSemester}
                  selectedBatch={selectedBatch}
                  selectedStudent={selectedStudent}
                  selectedSubject={selectedSubject}
                  selectedSection={selectedSection}
                  studentSearch={studentSearch}
                  studentsLoading={studentsLoading}
                  onBatchChange={(v: string) => {
                    setSelectedBatch(v);
                    setSelectedDepartment('');
                    setSelectedSemester('');
                    setSelectedSection('all');
                    setSelectedSubject('all');
                  }}
                  onDepartmentChange={(v: string) => { 
                    setSelectedDepartment(v); 
                    setSelectedSemester(''); 
                    setSelectedSection('all');
                    setSelectedSubject('all');
                  }}
                  onSemesterChange={(v: string) => {
                    setSelectedSemester(v);
                    setSelectedSection('all');
                    setSelectedSubject('all');
                  }}
                  onSectionChange={(v: string) => {
                    setSelectedSection(v);
                    setSelectedSubject('all');
                  }}
                  onSubjectChange={setSelectedSubject}
                  onStudentChange={(id) => {
                    if (id) {
                      handleStudentSelectFromList(id);
                    } else {
                      setSelectedStudent('');
                    }
                  }}
                  onStudentSearchChange={(v) => {
                    setStudentSearch(v);
                    if (!v) {
                      setSelectedStudent('');
                      if (selectedBatch) {
                        setShowStudentList(true);
                      } else {
                        setShowStudentList(false);
                      }
                    }
                  }}
                  onSearchTriggered={handleSearchTriggered}
                />
              )}

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading report...</span>
                </div>
              )}

              {/* Student List View (intermediate) */}
              {showList && (
                <StudentListView
                  students={filteredStudentList}
                  onSelectStudent={handleStudentSelectFromList}
                />
              )}

              {/* Empty state */}
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

              {/* Report content */}
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PrincipalStudents;

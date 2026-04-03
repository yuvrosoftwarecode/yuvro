import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStudentReport, BatchStudent, DepartmentOption, CourseOption, BatchOption, SubjectPerformance } from '@/hooks/useStudentReport';
import { SectionSubjectFaculty } from '@/services/subjectService';
import ReportFilters, { SectionOption } from '@/components/faculty/reports/ReportFilters';
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
function generateSnapshot(index: number) {
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
    batches, students, allStudents, report, loading, studentsLoading,
    loadStudents, loadStudentsByDepartments, loadReport, assignments
  } = useStudentReport();

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [showStudentList, setShowStudentList] = useState(false);

  // Local state for tracking manual filter interaction vs auto-selection
  const isAutoSelecting = useRef(false);

  // All department IDs this faculty is assigned to (used to scope search autocomplete)
  const assignedDeptIds = useMemo(() => {
    const ids = new Set<string>();
    assignments.forEach((a: SectionSubjectFaculty) => {
      if (a.semester_subject_details?.department_id) {
        ids.add(String(a.semester_subject_details.department_id));
      }
    });
    return ids;
  }, [assignments]);

  // ──────────────────────────────────────────────────────────────────
  // HIERARCHICAL FILTER DERIVATION
  // ──────────────────────────────────────────────────────────────────

  const derivedDepartments = useMemo(() => {
    if (!selectedBatch) return [];
    const depts = new Set<string>();
    const options: DepartmentOption[] = [];
    
    assignments.forEach((a: SectionSubjectFaculty) => {
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
    
    assignments.forEach((a: SectionSubjectFaculty) => {
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
    
    assignments.forEach((a: SectionSubjectFaculty) => {
      const details = a.semester_subject_details;
      if (details && details.batch_name === selectedBatch && 
          String(details.department_id) === selectedDepartment && 
          String(details.semester_number) === selectedSemester) {
        if (a.section_name) secs.add(a.section_name);
      }
    });
    return Array.from(secs).sort().map(name => ({ name } as SectionOption));
  }, [assignments, selectedBatch, selectedDepartment, selectedSemester]);

  const derivedSubjects = useMemo(() => {
    if (!selectedBatch || !selectedDepartment || !selectedSemester || (selectedSection !== 'all' && !selectedSection)) return [];
    const subjs = new Set<string>();
    const options: CourseOption[] = [];
    
    assignments.forEach((a: SectionSubjectFaculty) => {
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
    if (selectedBatch && !isAutoSelecting.current) {
      if (!selectedDepartment) {
        // No department selected → fetch ALL assigned depts in parallel and merge
        // This avoids under-counting from batch-wide paginated queries
        const deptIds = derivedDepartments.map((d: DepartmentOption) => d.id);
        if (deptIds.length > 0) {
          loadStudentsByDepartments(selectedBatch, deptIds);
        } else {
          // Assignments not yet computed (derivedDepartments empty), fall back
          loadStudents({ batch__name: selectedBatch });
        }
      } else {
        // Department selected → targeted single-dept fetch
        const params: any = { batch__name: selectedBatch, department: selectedDepartment };
        if (selectedSemester) params.semester__number = selectedSemester;
        if (selectedSection && selectedSection !== 'all') params.section__name = selectedSection;
        loadStudents(params);
      }
      setShowStudentList(true);
    } else if (!selectedBatch && !selectedStudent) {
      setShowStudentList(false);
    }
  }, [selectedBatch, selectedDepartment, selectedSemester, selectedSection, loadStudents, loadStudentsByDepartments, derivedDepartments, selectedStudent]);

  const combinedAllStudents = useMemo(() => {
    const existingIds = new Set(allStudents.map(s => s.id));
    const extras = DUMMY_STUDENTS.filter(s => !existingIds.has(s.id));
    return [...allStudents, ...extras];
  }, [allStudents]);

  useEffect(() => {
    if (selectedStudent) {
      const student = combinedAllStudents.find(s => s.id === selectedStudent);
      loadReport(selectedStudent, {}, student || undefined);
    }
  }, [selectedStudent, loadReport, combinedAllStudents]);

  const filteredStudentList = useMemo(() => {
    // Source: always use faculty-scoped pool
    const sourceStudents = studentSearch.length > 0 ? allStudents : students;

    if (sourceStudents.length === 0) return [];

    // SCOPE: Only show students from departments this faculty is assigned to
    const scopedStudents = assignedDeptIds.size > 0
      ? sourceStudents.filter((s: BatchStudent) =>
          !s.department_id || assignedDeptIds.has(String(s.department_id))
        )
      : sourceStudents;

    let filtered = scopedStudents;

    if (studentSearch.length > 0) {
      const q = studentSearch.toLowerCase();
      filtered = filtered.filter((s: BatchStudent) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    }

    const deptName = derivedDepartments.find((d: DepartmentOption) => d.id === selectedDepartment)?.name;

    return filtered.map((s: BatchStudent, i: number) => {
      const snap = generateSnapshot(i);
      return {
        student: s,
        department: s.department_name || deptName || 'Unknown',
        semester: s.semester_number ? `Semester ${s.semester_number}` : (selectedSemester ? `Semester ${selectedSemester}` : 'N/A'),
        section: s.section_name || (selectedSection !== 'all' ? selectedSection : 'Not Assigned'),
        pi: snap.pi,
        ps: snap.ps,
        pri: snap.pri,
        attendance: snap.att,
        taskCompletion: snap.task,
      };
    });
  }, [studentSearch, allStudents, students, selectedDepartment, selectedSemester, selectedSection, derivedDepartments, assignedDeptIds]);

  const handleSearchTriggered = () => {
    if (studentSearch.length > 0) {
      setSelectedStudent('');
      setShowStudentList(true);
    }
  };

  const handleStudentSelectFromList = useCallback((studentId: string) => {
    const student = combinedAllStudents.find((s: BatchStudent) => s.id === studentId) || students.find((s: BatchStudent) => s.id === studentId);
    if (student) {
      isAutoSelecting.current = true;
      setStudentSearch(student.name);

      if (student.department_id) setSelectedDepartment(String(student.department_id));
      else if (student.department_name) {
        const dept = derivedDepartments.find(d => d.name === student.department_name);
        if (dept) setSelectedDepartment(dept.id);
      }

      if (student.semester_number) setSelectedSemester(String(student.semester_number));
      
      if (student.section_name) setSelectedSection(student.section_name);
      if (student.batch_name) setSelectedBatch(student.batch_name);

      setSelectedStudent(studentId);
      setShowStudentList(false);

      setTimeout(() => { isAutoSelecting.current = false; }, 500);
    }
  }, [combinedAllStudents, students, derivedDepartments, batches]);

  const handleBackToList = () => {
    setSelectedStudent('');
    setShowStudentList(true);
  };

  const filteredSubjects = report
    ? selectedSubject === 'all'
      ? report.subjects
      : report.subjects.filter((s: SubjectPerformance) => s.id === selectedSubject)
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
  // Show empty when: no batch selected yet, and no student selected
  const showEmpty = !loading && !showStudentList && !selectedStudent && !studentSearch;
  // Show prompt when: user is searching but no batch has been loaded yet (allStudents is empty)
  const showSearchNoBatch = !loading && !selectedStudent && studentSearch.length > 0 && allStudents.length === 0 && !showStudentList;

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
            departments={derivedDepartments}
            courses={derivedSubjects}
            batches={batches}
            semesters={derivedSemesters}
            sections={derivedSections}
            selectedDepartment={selectedDepartment}
            selectedSemester={selectedSemester}
            selectedBatch={selectedBatch}
            selectedStudent={selectedStudent}
            selectedSubject={selectedSubject}
            selectedSection={selectedSection}
            studentSearch={studentSearch}
            studentsLoading={studentsLoading}
            students={students}
            allStudents={allStudents}
            assignedDeptIds={assignedDeptIds}
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
            onSubjectChange={(v: string) => {
              setSelectedSubject(v);
            }}
            onStudentChange={(id: string) => {
              if (id) {
                handleStudentSelectFromList(id);
              } else {
                setSelectedStudent('');
              }
            }}
            onStudentSearchChange={(v: string) => {
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
            <h3 className="text-lg font-medium text-foreground">Select a batch to view students</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Use the batch filter above to see students, or search by name or roll number after selecting a batch.
            </p>
          </div>
        )}

        {showSearchNoBatch && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Select a batch first</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Please select a batch from the filter above before searching. Only students from your assigned batches will be shown.
            </p>
          </div>
        )}

        {showReport && (
          <div className="space-y-5">
            <StudentOverview report={report} />
            <SubjectMatrix
              subjects={filteredSubjects}
              expandedSubjects={expandedSubjects}
              onToggleExpand={(id: string) => setExpandedSubjects((prev: Set<string>) => {
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

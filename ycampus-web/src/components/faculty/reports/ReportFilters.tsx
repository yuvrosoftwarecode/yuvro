import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, Loader2 } from 'lucide-react';
import type { DepartmentOption, CourseOption, BatchOption, BatchStudent } from '@/hooks/useStudentReport';

export interface SectionOption {
  name: string;
}

interface ReportFiltersProps {
  departments: DepartmentOption[];
  courses: CourseOption[];
  batches: BatchOption[];
  students: BatchStudent[];
  allStudents: BatchStudent[];
  sections: SectionOption[];
  selectedDepartment: string;
  selectedSemester: string;
  selectedBatch: string;
  selectedStudent: string;
  selectedSubject: string;
  selectedSection: string;
  studentSearch: string;
  studentsLoading: boolean;
  semesters: number[];
  assignedDeptIds: Set<string>;
  onDepartmentChange: (v: string) => void;
  onSemesterChange: (v: string) => void;
  onBatchChange: (v: string) => void;
  onStudentChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onSectionChange: (v: string) => void;
  onStudentSearchChange: (v: string) => void;
  onSearchTriggered?: () => void;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  departments, courses, batches, students, allStudents, sections,
  selectedDepartment, selectedSemester, selectedBatch, selectedStudent, selectedSubject, selectedSection,
  studentSearch, studentsLoading, semesters, assignedDeptIds,
  onDepartmentChange, onSemesterChange, onBatchChange, onStudentChange, onSubjectChange, onSectionChange,
  onStudentSearchChange, onSearchTriggered,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only show students whose department is in the faculty's assignments
  const searchSource = (studentSearch.length > 0 ? allStudents : students).filter((s: BatchStudent) =>
    assignedDeptIds.size === 0 || !s.department_id || assignedDeptIds.has(String(s.department_id))
  );
  const filteredStudents = searchSource.filter((s: BatchStudent) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.rollNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleStudentSelect = (student: BatchStudent) => {
    onStudentSearchChange(student.name);
    onStudentChange(student.id);
    setShowDropdown(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowDropdown(false);
      onSearchTriggered?.();
    }
  };

  return (
    <Card className="border border-border/50">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filters</span>
        </div>

        {/* Student Search - prominent */}
        <div className="mb-4" ref={dropdownRef}>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Search Student</label>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type student name, roll number, or email and press Enter..."
              value={studentSearch}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                onStudentSearchChange(e.target.value);
                setShowDropdown(true);
                if (!e.target.value) onStudentChange('');
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (studentSearch.length > 0) setShowDropdown(true); }}
              className="h-10 pl-9 text-sm"
            />
            {studentsLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {/* Dropdown results */}
            {showDropdown && studentSearch.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No students found</div>
                ) : (
                  filteredStudents.map((s: BatchStudent) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                      onClick={() => handleStudentSelect(s)}
                    >
                      <div>
                        <span className="font-medium text-foreground">{s.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">({s.rollNo})</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{s.email}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Batch</label>
            {/* Batch Filter - Now FIRST */}
            <Select value={selectedBatch} onValueChange={onBatchChange}>
              <SelectTrigger className="h-10 bg-background/50 border-muted-foreground/20">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {batches.length === 0 ? (
                  <SelectItem value="__none" disabled>No batches available</SelectItem>
                ) : (
                  batches.map((b: BatchOption) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.startYear && b.endYear ? `(${b.startYear}-${b.endYear})` : ''}
                    </SelectItem>
                  )))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Department</label>
            {/* Department Filter - SECOND */}
            <Select value={selectedDepartment} onValueChange={onDepartmentChange} disabled={!selectedBatch}>
              <SelectTrigger className="h-10 bg-background/50 border-muted-foreground/20">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {departments.length === 0 ? (
                  <SelectItem value="__none" disabled>Select batch first</SelectItem>
                ) : (
                  departments.map((d: DepartmentOption) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Semester</label>
            {/* Semester Filter - THIRD */}
            <Select value={selectedSemester} onValueChange={onSemesterChange} disabled={!selectedDepartment}>
              <SelectTrigger className="h-10 bg-background/50 border-muted-foreground/20">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {semesters.length === 0 ? (
                  <SelectItem value="__none" disabled>Select dept first</SelectItem>
                ) : (
                  semesters.map((s: number) => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Section</label>
            {/* Section Filter - FOURTH */}
            <Select value={selectedSection} onValueChange={onSectionChange} disabled={!selectedSemester}>
              <SelectTrigger className="h-10 bg-background/50 border-muted-foreground/20">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Sections</SelectItem>
                {sections.length === 0 ? (
                  <SelectItem value="__none" disabled>Select semester first</SelectItem>
                ) : (
                  sections.map((s: SectionOption) => (
                    <SelectItem key={s.name} value={s.name}>Section {s.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
            {/* Subject Filter - FIFTH */}
            <Select value={selectedSubject} onValueChange={onSubjectChange} disabled={selectedSection === 'all' || !selectedSection}>
              <SelectTrigger className="h-10 bg-background/50 border-muted-foreground/20">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Subjects</SelectItem>
                {courses.length === 0 ? (
                  <SelectItem value="__none" disabled>Select section first</SelectItem>
                ) : (
                  courses.map((c: CourseOption) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportFilters;

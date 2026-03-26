import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, Loader2 } from 'lucide-react';
import type { DepartmentOption, CourseOption, BatchOption, BatchStudent } from '@/hooks/useStudentReport';

interface SectionOption {
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
  studentSearch, studentsLoading,
  onDepartmentChange, onSemesterChange, onBatchChange, onStudentChange, onSubjectChange, onSectionChange,
  onStudentSearchChange, onSearchTriggered,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchSource = studentSearch.length > 0 ? allStudents : students;
  const filteredStudents = searchSource.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.rollNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Close dropdown on outside click
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
              onChange={e => {
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
                  filteredStudents.map(s => (
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
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Department</label>
            <Select value={selectedDepartment || undefined} onValueChange={onDepartmentChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Semester</label>
            <Select value={selectedSemester || undefined} onValueChange={onSemesterChange} disabled={!selectedDepartment}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Batch</label>
            <Select value={selectedBatch || undefined} onValueChange={onBatchChange} disabled={!selectedDepartment}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {batches.length === 0 ? (
                  <SelectItem value="__none" disabled>No batches available</SelectItem>
                ) : (
                  batches.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.startYear && b.endYear ? `(${b.startYear}-${b.endYear})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
            <Select value={selectedSubject} onValueChange={onSubjectChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Subjects</SelectItem>
                {courses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Section</label>
            <Select value={selectedSection} onValueChange={onSectionChange} disabled={!selectedSemester}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map(s => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportFilters;

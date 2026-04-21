import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, Loader2 } from 'lucide-react';
import type { DepartmentOption, CourseOption, BatchOption, BatchStudent } from '@/hooks/useStudentReport';

export interface SectionOption {
  name: string;
}

interface PrincipalReportFiltersProps {
  departments: DepartmentOption[];
  courses: CourseOption[];
  batches: BatchOption[];
  students: BatchStudent[];
  allStudents: BatchStudent[];
  sections: SectionOption[];
  semesters: number[];
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

const PrincipalReportFilters: React.FC<PrincipalReportFiltersProps> = ({
  departments, courses, batches, students, allStudents, sections, semesters,
  selectedDepartment, selectedSemester, selectedBatch, selectedStudent, selectedSubject, selectedSection,
  studentSearch, studentsLoading,
  onDepartmentChange, onSemesterChange, onBatchChange, onStudentChange, onSubjectChange, onSectionChange,
  onStudentSearchChange, onSearchTriggered,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredStudents = (studentSearch.length > 0 ? allStudents : students).filter((s: BatchStudent) =>
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
    <Card className="border border-border/50 shadow-sm">
      <CardContent className="pt-6 pb-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">Principal View Filters</span>
            <p className="text-[11px] text-muted-foreground leading-none mt-1">Wide scope across all batches and departments</p>
          </div>
        </div>

        {/* Student Search - prominent */}
        <div className="mb-6" ref={dropdownRef}>
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, roll number, or email..."
              value={studentSearch}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                onStudentSearchChange(e.target.value);
                setShowDropdown(true);
                if (!e.target.value) onStudentChange('');
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => { if (studentSearch.length > 0) setShowDropdown(true); }}
              className="h-11 pl-10 pr-10 text-sm bg-muted/30 focus-visible:ring-primary/20"
            />
            {studentsLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
            )}
            {/* Dropdown results */}
            {showDropdown && studentSearch.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl max-h-[320px] overflow-y-auto overflow-x-hidden backdrop-blur-sm bg-opacity-95 scrollbar-thin">
                {filteredStudents.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                    <p>No students matching "{studentSearch}"</p>
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredStudents.map((s: BatchStudent) => (
                      <button
                        key={s.id}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground rounded-lg transition-all flex items-center justify-between group"
                        onClick={() => handleStudentSelect(s)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground group-hover:text-accent-foreground/70 uppercase font-mono tracking-wider">{s.rollNo}</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <span className="text-xs text-muted-foreground group-hover:text-accent-foreground/70">{s.email}</span>
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1">{s.department_name || 'CSE'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Batch</label>
            {/* Batch Filter - FIRST */}
            <Select value={selectedBatch} onValueChange={onBatchChange}>
              <SelectTrigger className="h-11 bg-background border-border/60 focus:ring-primary/20">
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/60 z-50">
                {batches.length === 0 ? (
                  <SelectItem value="__none" disabled className="text-xs">No batches found</SelectItem>
                ) : (
                  batches.map((b: BatchOption) => (
                    <SelectItem key={b.id} value={b.id} className="text-sm">
                      {b.name}
                    </SelectItem>
                  )))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Department</label>
            {/* Department Filter - SECOND */}
            <Select value={selectedDepartment} onValueChange={onDepartmentChange} disabled={!selectedBatch}>
              <SelectTrigger className="h-11 bg-background border-border/60 focus:ring-primary/20">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/60 z-50">
                {departments.length === 0 ? (
                  <SelectItem value="__none" disabled className="text-xs">Select batch first</SelectItem>
                ) : (
                  departments.map((d: DepartmentOption) => (
                    <SelectItem key={d.id} value={d.id} className="text-sm">{d.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Semester</label>
            {/* Semester Filter - THIRD */}
            <Select value={selectedSemester} onValueChange={onSemesterChange} disabled={!selectedDepartment}>
              <SelectTrigger className="h-11 bg-background border-border/60 focus:ring-primary/20">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/60 z-50">
                {semesters.length === 0 ? (
                    <SelectItem value="__none" disabled className="text-xs">Select dept first</SelectItem>
                ) : (
                    semesters.map((s: number) => (
                      <SelectItem key={s} value={String(s)} className="text-sm">Semester {s}</SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Section</label>
            {/* Section Filter - FOURTH */}
            <Select value={selectedSection} onValueChange={onSectionChange} disabled={!selectedSemester}>
              <SelectTrigger className="h-11 bg-background border-border/60 focus:ring-primary/20">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/60 z-50">
                <SelectItem value="all" className="text-sm">All Sections</SelectItem>
                {sections.length > 0 ? sections.map((s: SectionOption) => (
                  <SelectItem key={s.name} value={s.name} className="text-sm">Section {s.name}</SelectItem>
                )) : (
                  <SelectItem value="__none" disabled className="text-xs">No sections available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Subject</label>
            {/* Subject Filter - FIFTH */}
            <Select value={selectedSubject} onValueChange={onSubjectChange} disabled={selectedSection === 'all' || !selectedSection}>
              <SelectTrigger className="h-11 bg-background border-border/60 focus:ring-primary/20">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/60 z-50">
                <SelectItem value="all" className="text-sm">All Subjects</SelectItem>
                {courses.length > 0 ? courses.map((c: CourseOption) => (
                    <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>
                )) : (
                    <SelectItem value="__none" disabled className="text-xs">No subjects available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrincipalReportFilters;

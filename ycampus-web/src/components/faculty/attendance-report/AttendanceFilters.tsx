import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AttendanceDepartment, AttendanceBatch, AttendanceSection, AttendanceCourse } from '@/hooks/useAttendanceReport';

interface Props {
  departments: AttendanceDepartment[];
  batches: AttendanceBatch[];
  sections: AttendanceSection[];
  courses: AttendanceCourse[];
  selectedDept: string;
  selectedSemester: string;
  selectedBatch: string;
  selectedSection: string;
  selectedSubject: string;
  dateRange: { from?: Date; to?: Date };
  filtersLoading: boolean;
  onDeptChange: (v: string) => void;
  onSemesterChange: (v: string) => void;
  onBatchChange: (v: string) => void;
  onSectionChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
  onDateRangeChange: (v: { from?: Date; to?: Date }) => void;
}

const AttendanceFilters: React.FC<Props> = ({
  departments, batches, sections, courses,
  selectedDept, selectedSemester, selectedBatch, selectedSection, selectedSubject,
  dateRange, filtersLoading,
  onDeptChange, onSemesterChange, onBatchChange, onSectionChange, onSubjectChange, onDateRangeChange,
}) => {
  return (
    <Card className="border border-border/50">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filters</span>
          {filtersLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Department */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Department</label>
            <Select value={selectedDept} onValueChange={onDeptChange}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Semester */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Semester</label>
            <Select value={selectedSemester} onValueChange={onSemesterChange} disabled={!selectedDept}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Batch */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Batch</label>
            <Select value={selectedBatch} onValueChange={onBatchChange} disabled={!selectedDept}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Batches" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Section */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Section</label>
            <Select value={selectedSection} onValueChange={onSectionChange} disabled={!selectedSemester}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {sections.length === 0
                  ? <SelectItem value="__none" disabled>No sections</SelectItem>
                  : sections.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)
                }
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
            <Select value={selectedSubject} onValueChange={onSubjectChange}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Subjects" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Subjects</SelectItem>
                {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-9 w-full justify-start text-left text-sm font-normal", !dateRange.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateRange.from && dateRange.to
                    ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                    : 'Full Semester'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                  onSelect={(range) => onDateRangeChange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  className="p-3 pointer-events-auto"
                />
                {dateRange.from && (
                  <div className="p-2 border-t">
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onDateRangeChange({})}>
                      Clear (Full Semester)
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceFilters;

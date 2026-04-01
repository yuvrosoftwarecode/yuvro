import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { StudentAttendanceRow } from '@/hooks/useAttendanceReport';

interface Props {
  rows: StudentAttendanceRow[];
  search: string;
  onSearchChange: (v: string) => void;
  sortBy: 'name' | 'percent' | 'absent';
  sortDir: 'asc' | 'desc';
  onSort: (col: 'name' | 'percent' | 'absent') => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onStudentClick: (id: string) => void;
}

const statusColors: Record<string, string> = {
  Excellent: 'bg-[hsl(142,71%,35%)]/10 text-[hsl(142,71%,35%)] border-[hsl(142,71%,35%)]/20',
  Safe: 'bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] border-[hsl(142,71%,45%)]/20',
  Warning: 'bg-[hsl(36,93%,48%)]/10 text-[hsl(36,93%,48%)] border-[hsl(36,93%,48%)]/20',
  Critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

const StudentAttendanceTable: React.FC<Props> = ({
  rows, search, onSearchChange, sortBy, sortDir, onSort, page, totalPages, onPageChange, onStudentClick,
}) => {
  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Student Attendance</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search student..." value={search} onChange={e => onSearchChange(e.target.value)} className="h-9 pl-9 text-sm" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => onSort('name')}>
                  <span className="flex items-center gap-1">Student Name <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead className="text-center">Classes</TableHead>
                <TableHead className="text-center">Present</TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => onSort('absent')}>
                  <span className="flex items-center justify-center gap-1">Absent <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-center cursor-pointer" onClick={() => onSort('percent')}>
                  <span className="flex items-center justify-center gap-1">Attendance % <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No students found</TableCell></TableRow>
              ) : rows.map(r => (
                <TableRow key={r.studentId} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onStudentClick(r.studentId)}>
                  <TableCell className="font-medium">{r.studentName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.rollNo}</TableCell>
                  <TableCell className="text-center">{r.totalClasses}</TableCell>
                  <TableCell className="text-center text-[hsl(142,71%,35%)]">{r.present}</TableCell>
                  <TableCell className="text-center text-destructive">{r.absent}</TableCell>
                  <TableCell className="text-center font-semibold">{r.attendancePercent}%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-xs ${statusColors[r.status]}`}>{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentAttendanceTable;

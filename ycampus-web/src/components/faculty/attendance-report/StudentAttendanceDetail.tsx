import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText } from 'lucide-react';
import type { StudentDetail } from '@/hooks/useAttendanceReport';

interface Props {
  detail: StudentDetail;
  onBack: () => void;
  onDownloadPDF: () => void;
}

const riskColors: Record<string, string> = {
  Excellent: 'bg-[hsl(142,71%,35%)]/10 text-[hsl(142,71%,35%)] border-[hsl(142,71%,35%)]/20',
  Safe: 'bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] border-[hsl(142,71%,45%)]/20',
  Warning: 'bg-[hsl(36,93%,48%)]/10 text-[hsl(36,93%,48%)] border-[hsl(36,93%,48%)]/20',
  Critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

const StudentAttendanceDetail: React.FC<Props> = ({ detail, onBack, onDownloadPDF }) => {
  const overallRisk = detail.attendancePercent >= 90 ? 'Excellent'
    : detail.attendancePercent >= 75 ? 'Safe'
    : detail.attendancePercent >= 60 ? 'Warning' : 'Critical';

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{detail.studentName}</h2>
            <p className="text-sm text-muted-foreground">{detail.rollNo}</p>
          </div>
          <Badge variant="outline" className={riskColors[overallRisk]}>{overallRisk}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onDownloadPDF}>
          <FileText className="h-4 w-4 mr-1.5" />Download PDF
        </Button>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Classes', value: detail.totalClasses },
          { label: 'Present', value: detail.present, color: 'text-[hsl(142,71%,35%)]' },
          { label: 'Absent', value: detail.absent, color: 'text-destructive' },
          { label: 'Attendance', value: `${detail.attendancePercent}%`, color: detail.attendancePercent >= 75 ? 'text-[hsl(142,71%,35%)]' : 'text-destructive' },
          { label: 'Required', value: `${detail.requiredPercent}%` },
          { label: 'Shortage', value: `${detail.shortagePercent}%`, color: detail.shortagePercent > 0 ? 'text-[hsl(36,93%,48%)]' : 'text-[hsl(142,71%,35%)]' },
          { label: 'Current Streak', value: detail.currentAbsenceStreak, color: detail.currentAbsenceStreak >= 3 ? 'text-[hsl(36,93%,48%)]' : '' },
          { label: 'Last Attended', value: detail.lastAttendedDate || 'N/A', small: true },
        ].map(({ label, value, color, small }) => (
          <Card key={label} className="border border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
              <p className={`${small ? 'text-xs' : 'text-lg'} font-bold ${color || 'text-foreground'}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subject-wise */}
      {detail.subjects.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Subject-wise Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Classes</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">%</TableHead>
                  <TableHead className="text-center">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.subjects.map(s => (
                  <TableRow key={s.courseId}>
                    <TableCell className="font-medium">{s.courseName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.courseCode}</TableCell>
                    <TableCell className="text-center">{s.totalClasses}</TableCell>
                    <TableCell className="text-center text-[hsl(142,71%,35%)]">{s.present}</TableCell>
                    <TableCell className="text-center text-destructive">{s.absent}</TableCell>
                    <TableCell className="text-center font-semibold">{s.attendancePercent}%</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs ${riskColors[s.risk]}`}>{s.risk}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Date-wise */}
      {detail.dateWise.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Date-wise Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.dateWise.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell>{d.subject}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${d.status === 'Present' ? 'bg-[hsl(142,71%,35%)]/10 text-[hsl(142,71%,35%)]' : 'bg-destructive/10 text-destructive'}`}>
                          {d.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentAttendanceDetail;

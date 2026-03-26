import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { SectionSummary } from '@/hooks/useAttendanceReport';

interface Props { summary: SectionSummary; }

const statConfig = [
  { key: 'totalClassesConducted', label: 'Classes Conducted', color: 'text-foreground' },
  { key: 'totalStudents', label: 'Total Students', color: 'text-foreground' },
  { key: 'averageAttendance', label: 'Avg Attendance', suffix: '%', color: 'text-[hsl(142,71%,35%)]' },
  { key: 'totalPresent', label: 'Total Present', color: 'text-[hsl(142,71%,35%)]' },
  { key: 'totalAbsent', label: 'Total Absent', color: 'text-destructive' },
  { key: 'below75', label: 'Below 75%', color: 'text-[hsl(36,93%,48%)]' },
  { key: 'below60', label: 'Below 60%', color: 'text-destructive' },
];

const AttendanceSummaryCards: React.FC<Props> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {statConfig.map(({ key, label, suffix, color }) => (
        <Card key={key} className="border border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>
              {(summary as any)[key]}{suffix || ''}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AttendanceSummaryCards;

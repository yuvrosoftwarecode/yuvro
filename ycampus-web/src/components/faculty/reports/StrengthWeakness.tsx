import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertTriangle, CalendarX, Activity } from 'lucide-react';
import type { StudentReport } from '@/hooks/useStudentReport';

interface StrengthWeaknessProps {
  report: StudentReport;
}

const StrengthWeakness: React.FC<StrengthWeaknessProps> = ({ report }) => {
  const items = [
    { icon: TrendingUp, label: 'Strongest', value: report.strongestSubject, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { icon: TrendingDown, label: 'Weakest', value: report.weakestSubject, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
    { icon: AlertTriangle, label: 'Most Pending', value: report.highestPendingSubject, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    { icon: CalendarX, label: 'Low Attendance', value: report.lowestAttendanceSubject, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
    { icon: Activity, label: 'Perf. Gap', value: `${Math.round(report.performanceGap)}%`, color: 'text-muted-foreground', bg: 'bg-muted/40 border-border/50' },
  ];

  return (
    <Card className="border border-border/50 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Strength & Weakness</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${item.bg}`}>
              <item.icon className={`h-3.5 w-3.5 flex-shrink-0 ${item.color}`} />
              <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{item.label}</span>
              <span className={`text-xs font-semibold ${item.color} truncate`}>{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StrengthWeakness;

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import type { StudentReport } from '@/hooks/useStudentReport';

interface PendingRiskSummaryProps {
  report: StudentReport;
}

const PendingRiskSummary: React.FC<PendingRiskSummaryProps> = ({ report }) => {
  const riskItems = report.subjects.flatMap(s => {
    const items: { subject: string; category: string; count: number; risk: 'Low' | 'Medium' | 'High' }[] = [];
    if (s.chaptersPending > 0) {
      items.push({ subject: s.name, category: 'Pending Notes', count: s.chaptersPending, risk: s.chaptersPending > 3 ? 'High' : s.chaptersPending > 1 ? 'Medium' : 'Low' });
    }
    if (s.tasksPending > 0) {
      items.push({ subject: s.name, category: 'Pending Tasks', count: s.tasksPending, risk: s.tasksPending > 3 ? 'High' : s.tasksPending > 1 ? 'Medium' : 'Low' });
    }
    if (s.assessmentsPending > 0) {
      items.push({ subject: s.name, category: 'Pending Assessments', count: s.assessmentsPending, risk: s.assessmentsPending > 2 ? 'High' : 'Medium' });
    }
    if (s.attendancePercent < 75 && s.classesHeld > 0) {
      items.push({ subject: s.name, category: 'Attendance Risk', count: s.attendancePercent, risk: s.attendancePercent < 60 ? 'High' : 'Medium' });
    }
    return items;
  });

  const riskColor = {
    Low: 'bg-emerald-100 text-emerald-700',
    Medium: 'bg-amber-100 text-amber-700',
    High: 'bg-red-100 text-red-700',
  };

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Pending & Risk Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {riskItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No pending items or risks detected.</p>
        ) : (
          <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
            {riskItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                <div>
                  <span className="font-medium text-foreground">{item.category}</span>
                  <span className="text-muted-foreground ml-2">· {item.subject}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {item.category === 'Attendance Risk' ? `${item.count}%` : `${item.count} items`}
                  </span>
                  <Badge variant="secondary" className={`text-xs ${riskColor[item.risk]}`}>
                    {item.risk} Risk
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingRiskSummary;
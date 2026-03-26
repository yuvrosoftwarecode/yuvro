import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, TrendingUp, BookOpen, CheckCircle, Calendar } from 'lucide-react';
import type { BatchStudent } from '@/hooks/useStudentReport';

interface StudentSnapshot {
  student: BatchStudent;
  department?: string;
  semester?: string;
  section?: string;
  pi: number;
  ps: number;
  pri: number;
  attendance: number;
  taskCompletion: number;
}

interface StudentListViewProps {
  students: StudentSnapshot[];
  onSelectStudent: (studentId: string) => void;
}

const getPRIColor = (pri: number) => {
  if (pri >= 85) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (pri >= 70) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
};

const getPRILabel = (pri: number) => {
  if (pri >= 85) return 'Interview Ready';
  if (pri >= 70) return 'Almost Ready';
  return 'Needs Improvement';
};

const getMetricColor = (value: number) => {
  if (value >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const StudentListView: React.FC<StudentListViewProps> = ({ students, onSelectStudent }) => {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground">No students found</h3>
        <p className="text-sm text-muted-foreground mt-1">Try a different search or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">
          {students.length} student{students.length !== 1 ? 's' : ''} found — click to view full report
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {students.map((item) => (
          <Card
            key={item.student.id}
            className="border border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
            onClick={() => onSelectStudent(item.student.id)}
          >
            <CardContent className="py-3.5 px-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Student Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground truncate">{item.student.name}</h4>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">
                      {item.student.rollNo}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {item.department && <span>{item.department}</span>}
                    {item.semester && (
                      <>
                        <span className="text-border">|</span>
                        <span>Sem {item.semester}</span>
                      </>
                    )}
                    {item.section && (
                      <>
                        <span className="text-border">|</span>
                        <span>Sec {item.section}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Center: Metrics */}
                <div className="hidden sm:flex items-center gap-4">
                  <MetricPill icon={<TrendingUp className="h-3 w-3" />} label="PI" value={item.pi} />
                  <MetricPill icon={<BookOpen className="h-3 w-3" />} label="PS" value={item.ps} />
                  <MetricPill icon={<CheckCircle className="h-3 w-3" />} label="PRI" value={item.pri} highlight />
                  <MetricPill icon={<Calendar className="h-3 w-3" />} label="Att" value={item.attendance} />
                  <MetricPill icon={<CheckCircle className="h-3 w-3" />} label="Tasks" value={item.taskCompletion} />
                </div>

                {/* Right: PRI Badge + Action */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <Badge className={`text-[10px] px-2 py-0.5 font-medium ${getPRIColor(item.pri)}`}>
                    {getPRILabel(item.pri)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onSelectStudent(item.student.id); }}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    View
                  </Button>
                </div>
              </div>

              {/* Mobile metrics row */}
              <div className="flex sm:hidden items-center gap-3 mt-2.5 pt-2.5 border-t border-border/30">
                <MetricPill icon={<TrendingUp className="h-3 w-3" />} label="PI" value={item.pi} />
                <MetricPill icon={<BookOpen className="h-3 w-3" />} label="PS" value={item.ps} />
                <MetricPill icon={<CheckCircle className="h-3 w-3" />} label="PRI" value={item.pri} highlight />
                <MetricPill icon={<Calendar className="h-3 w-3" />} label="Att" value={item.attendance} />
                <MetricPill icon={<CheckCircle className="h-3 w-3" />} label="Tasks" value={item.taskCompletion} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const MetricPill: React.FC<{ icon: React.ReactNode; label: string; value: number; highlight?: boolean }> = ({
  icon, label, value, highlight
}) => (
  <div className="flex items-center gap-1">
    <span className="text-muted-foreground">{icon}</span>
    <span className="text-[10px] text-muted-foreground">{label}:</span>
    <span className={`text-xs font-semibold ${highlight ? getMetricColor(value) : getMetricColor(value)}`}>
      {value}%
    </span>
  </div>
);

export default StudentListView;

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User, TrendingUp, BookOpen, CalendarCheck, Brain, Award } from 'lucide-react';
import type { StudentReport } from '@/hooks/useStudentReport';

interface StudentOverviewProps {
  report: StudentReport;
}

function computePS() {
  const dsa = 72, python = 78, database = 80, systemDesign = 55;
  const aptitude = 68, logicalReasoning = 74, communication = 60, mockInterview = 52;
  const coreAvg = (dsa + python + database + systemDesign) / 4;
  const otherAvg = (aptitude + logicalReasoning + communication + mockInterview) / 4;
  return Math.round(coreAvg * 0.6 + otherAvg * 0.4);
}

function getStatusBadge(score: number, thresholds: { high: number; mid: number; low: number }, labels: string[]) {
  if (score >= thresholds.high) return { label: labels[0], cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (score >= thresholds.mid) return { label: labels[1], cls: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (score >= thresholds.low) return { label: labels[2], cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: labels[3], cls: 'bg-red-100 text-red-700 border-red-200' };
}

const StudentOverview: React.FC<StudentOverviewProps> = ({ report }) => {
  const statusColor = {
    'On Track': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Needs Attention': 'bg-amber-100 text-amber-700 border-amber-200',
    'At Risk': 'bg-red-100 text-red-700 border-red-200',
  };

  const pi = report.performanceIndex;
  const ps = computePS();
  const pri = Math.round(pi * 0.5 + ps * 0.5);

  const piStatus = getStatusBadge(pi, { high: 85, mid: 70, low: 55 }, ['Excellent', 'Good', 'Moderate', 'At Risk']);
  const psStatus = getStatusBadge(ps, { high: 85, mid: 70, low: 55 }, ['Strong', 'Good', 'Needs Improvement', 'Weak']);
  const priStatus = getStatusBadge(pri, { high: 85, mid: 70, low: 55 }, ['Interview Ready', 'Almost Ready', 'Needs Improvement', 'Not Ready']);

  return (
    <div className="space-y-4">
      {/* Student Profile Card */}
      <Card className="border border-border/50">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-foreground truncate">{report.studentName}</h2>
                <Badge className={`text-[10px] border ${statusColor[report.status]}`} variant="outline">
                  {report.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {report.rollNumber} · {report.program} · Sem {report.semester} · Sec {report.section}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid — 7 compact cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* PI */}
        <MetricCard
          icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
          value={`${pi}%`}
          label="PI"
          badge={piStatus}
        />
        {/* PS */}
        <MetricCard
          icon={<Brain className="h-4 w-4 text-purple-500" />}
          value={`${ps}%`}
          label="PS"
          badge={psStatus}
        />
        {/* PRI */}
        <MetricCard
          icon={<Award className="h-4 w-4 text-emerald-500" />}
          value={`${pri}%`}
          label="PRI"
          badge={priStatus}
        />
        {/* Attendance */}
        <MetricCard
          icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
          value={`${report.overallAttendance}%`}
          label="Attendance"
        />
        {/* Learning */}
        <div className="p-3 rounded-lg border border-border/50 bg-card flex flex-col items-center text-center gap-1">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-lg font-bold text-foreground">{report.learningCompletion}%</span>
          <Progress value={report.learningCompletion} className="h-1 w-full" />
          <span className="text-[10px] text-muted-foreground">Learning</span>
        </div>
        {/* Test Avg */}
        <MetricCard
          icon={<span className="text-xs">📝</span>}
          value={`${(() => {
            const totalTests = report.subjects.reduce((s, sub) => s + (sub.testsAttempted || 0), 0);
            if (totalTests === 0) return '0.0';
            const totalScorePctWeight = report.subjects.reduce((s, sub) => s + (sub.testAvgScore * (sub.testsAttempted || 0)), 0);
            return (totalScorePctWeight / totalTests).toFixed(1);
          })()}%`}
          label="Test Avg"
        />
        {/* Task Rate */}
        <MetricCard
          icon={<span className="text-xs">✅</span>}
          value={`${(() => {
            const totalTasks = report.subjects.reduce((s, sub) => s + (sub.tasksTotal || 0), 0);
            if (totalTasks === 0) return '0.0';
            const totalSubmitted = report.subjects.reduce((s, sub) => s + (sub.tasksSubmitted || 0), 0);
            return ((totalSubmitted / totalTasks) * 100).toFixed(1);
          })()}%`}
          label="Task Rate"
        />
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  icon: React.ReactNode;
  value: string;
  label: string;
  badge?: { label: string; cls: string };
}> = ({ icon, value, label, badge }) => (
  <div className="p-3 rounded-lg border border-border/50 bg-card flex flex-col items-center text-center gap-1">
    {icon}
    <span className="text-lg font-bold text-foreground">{value}</span>
    {badge && (
      <Badge className={`text-[9px] border px-1.5 py-0 ${badge.cls}`} variant="outline">{badge.label}</Badge>
    )}
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

export default StudentOverview;

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarCheck, Flame, Trophy, AlertTriangle } from 'lucide-react';
import type { StudentReport } from '@/hooks/useStudentReport';

interface AttendanceConsistencyProps {
  report: StudentReport;
}

const AttendanceConsistency: React.FC<AttendanceConsistencyProps> = ({ report }) => {
  const chartData = report.subjects.map(s => ({
    name: s.code || s.name.substring(0, 8),
    attendance: s.attendancePercent,
    held: s.classesHeld,
    attended: s.classesAttended,
  }));

  const lowAttendance = report.subjects.filter(s => s.attendancePercent < 75);
  const totalHeld = report.subjects.reduce((sum, s) => sum + s.classesHeld, 0);
  const totalAttended = report.subjects.reduce((sum, s) => sum + s.classesAttended, 0);
  const totalMissed = totalHeld - totalAttended;

  const attendanceStatus = report.overallAttendance >= 85
    ? { label: 'Excellent', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    : report.overallAttendance >= 75
    ? { label: 'Good', cls: 'bg-blue-100 text-blue-700 border-blue-200' }
    : report.overallAttendance >= 65
    ? { label: 'Low', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
    : { label: 'Critical', cls: 'bg-red-100 text-red-700 border-red-200' };

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            Attendance & Consistency
          </CardTitle>
          <Badge className={`text-[10px] border ${attendanceStatus.cls}`} variant="outline">
            {attendanceStatus.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Stats */}
          <div className="space-y-3">
            {/* Overall */}
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <div className="text-3xl font-bold text-foreground">{report.overallAttendance}%</div>
              <div className="text-[10px] text-muted-foreground">Overall Attendance</div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Classes Held" value={totalHeld} />
              <StatBox label="Attended" value={totalAttended} color="text-emerald-600" />
              <StatBox label="Missed" value={totalMissed} color="text-red-600" />
              <StatBox label="Active Days" value={report.activeLearningDays} />
            </div>

            {/* Streaks */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-muted/30 flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-foreground">{report.currentStreak}</div>
                  <div className="text-[9px] text-muted-foreground">Current Streak</div>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-muted/30 flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-foreground">{report.longestStreak}</div>
                  <div className="text-[9px] text-muted-foreground">Best Streak</div>
                </div>
              </div>
            </div>

            {/* Low attendance alerts */}
            {lowAttendance.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" /> Low Attendance Subjects
                </p>
                {lowAttendance.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-1.5 rounded bg-red-50 border border-red-100 text-xs">
                    <span className="text-foreground truncate">{s.code}</span>
                    <span className="text-red-600 font-semibold">{s.attendancePercent}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Chart */}
          <div className="lg:col-span-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Attendance']}
                  />
                  <Bar
                    dataKey="attendance"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                No attendance data available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const StatBox: React.FC<{ label: string; value: number; color?: string }> = ({ label, value, color }) => (
  <div className="p-2 rounded-lg bg-muted/30 text-center">
    <div className={`text-sm font-bold ${color || 'text-foreground'}`}>{value}</div>
    <div className="text-[9px] text-muted-foreground">{label}</div>
  </div>
);

export default AttendanceConsistency;
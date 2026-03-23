import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SubjectPerformance } from '@/hooks/useStudentReport';

interface SubjectMatrixProps {
  subjects: SubjectPerformance[];
  expandedSubjects: Set<string>;
  onToggleExpand: (id: string) => void;
}

const SubjectMatrix: React.FC<SubjectMatrixProps> = ({ subjects, expandedSubjects, onToggleExpand }) => {
  const strengthColor = {
    Strong: 'bg-emerald-100 text-emerald-700',
    Average: 'bg-amber-100 text-amber-700',
    Weak: 'bg-red-100 text-red-700',
  };
  const riskColor = {
    Low: 'bg-emerald-100 text-emerald-700',
    Medium: 'bg-amber-100 text-amber-700',
    High: 'bg-red-100 text-red-700',
  };

  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No subjects found for the selected filters.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Subject-wise Performance Matrix</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground"></th>
                <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Notes</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Test Avg</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Assessment Avg</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Tasks</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Attendance</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Strength</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Risk</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <React.Fragment key={s.id}>
                  <tr
                    className="border-b hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => onToggleExpand(s.id)}
                  >
                    <td className="p-3">
                      {expandedSubjects.has(s.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{s.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{s.code}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          s.strength === 'Strong' ? 'bg-emerald-100 text-emerald-700' :
                          s.strength === 'Average' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {s.strength === 'Strong' ? '↑' : s.strength === 'Weak' ? '↓' : '→'} {s.testAvgScore}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-medium">{s.notesCompletion}%</span>
                        <Progress value={s.notesCompletion} className="h-1 w-16" />
                      </div>
                    </td>
                    <td className="p-3 text-center font-medium">{s.testAvgScore}%</td>
                    <td className="p-3 text-center font-medium">{s.assessmentAvgScore}%</td>
                    <td className="p-3 text-center">
                      <span className="text-xs">
                        <span className="font-medium text-foreground">{s.tasksSubmitted}</span>
                        <span className="text-muted-foreground">/{s.tasksTotal}</span>
                        {s.tasksPending > 0 && (
                          <span className="text-amber-600 ml-1">({s.tasksPending} pending)</span>
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-center font-medium">{s.attendancePercent}%</td>
                    <td className="p-3 text-center">
                      <Badge variant="secondary" className={`text-xs ${strengthColor[s.strength]}`}>
                        {s.strength}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="secondary" className={`text-xs ${riskColor[s.risk]}`}>
                        {s.risk}
                      </Badge>
                    </td>
                  </tr>
                  {expandedSubjects.has(s.id) && (
                    <tr>
                      <td colSpan={9} className="p-0">
                        <SubjectDrillDown subject={s} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const SubjectDrillDown: React.FC<{ subject: SubjectPerformance }> = ({ subject: s }) => {
  return (
    <div className="bg-muted/10 border-t p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Notes & Learning */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          📚 Notes & Learning
        </h4>
        <div className="space-y-1.5 text-xs">
          <Row label="Total Chapters" value={s.totalChapters} />
          <Row label="Completed" value={s.chaptersCompleted} color="text-emerald-600" />
          <Row label="Pending" value={s.chaptersPending} color="text-amber-600" />
          <Row label="Topics Not Opened" value={s.topicsNotOpened} color="text-red-600" />
          <Row label="Last Activity" value={s.lastLearningDate ? new Date(s.lastLearningDate).toLocaleDateString() : 'N/A'} />
          <Row label="Learning Streak" value={`${s.learningStreak} days`} />
        </div>
      </div>

      {/* Test Performance */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          📝 Test Performance
        </h4>
        <div className="space-y-1.5 text-xs">
          <Row label="Tests Attempted" value={s.testsAttempted} />
          <Row label="Easy Avg" value={`${s.easyAvg}%`} />
          <Row label="Medium Avg" value={`${s.mediumAvg}%`} />
          <Row label="Hard Avg" value={`${s.hardAvg}%`} />
          <Row label="Accuracy" value={`${s.accuracy}%`} />
          <Row label="Trend" value={s.trend === 'improving' ? '↑ Improving' : s.trend === 'declining' ? '↓ Declining' : '→ Stable'} 
            color={s.trend === 'improving' ? 'text-emerald-600' : s.trend === 'declining' ? 'text-red-600' : 'text-muted-foreground'} />
        </div>
      </div>

      {/* Assessment Details */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          📋 Assessments
        </h4>
        <div className="space-y-1.5 text-xs">
          <Row label="Total" value={s.assessmentsTotal} />
          <Row label="Completed" value={s.assessmentsCompleted} color="text-emerald-600" />
          <Row label="In Progress" value={s.assessmentsInProgress} color="text-amber-600" />
          <Row label="Pending" value={s.assessmentsPending} color="text-red-600" />
          <Row label="Avg Score" value={`${s.assessmentAvgScore}%`} />
        </div>
      </div>

      {/* Tasks & Attendance */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          ✅ Tasks & Attendance
        </h4>
        <div className="space-y-1.5 text-xs">
          <Row label="Tasks Assigned" value={s.tasksTotal} />
          <Row label="On Time" value={s.tasksOnTime} color="text-emerald-600" />
          <Row label="Late" value={s.tasksLate} color="text-amber-600" />
          <Row label="Pending" value={s.tasksPending} color="text-red-600" />
          <div className="border-t border-border/50 pt-1.5 mt-1.5" />
          <Row label="Classes Held" value={s.classesHeld} />
          <Row label="Attended" value={s.classesAttended} />
          <Row label="Missed" value={s.missedSessions} color="text-red-600" />
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-medium ${color || 'text-foreground'}`}>{value}</span>
  </div>
);

export default SubjectMatrix;
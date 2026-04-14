import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, Lightbulb, TrendingUp, TrendingDown } from 'lucide-react';
import type { StudentReport, SubjectPerformance } from '@/hooks/useStudentReport';

interface PlacementReadinessProps {
  report: StudentReport;
}

function computePS(report: StudentReport) {
  // Map core subjects from actual report data
  const coreSubjects = report.subjects.slice(0, 4).map((s: SubjectPerformance) => ({
    name: s.name,
    score: s.testAvgScore || s.notesCompletion || 0,
  }));

  // Other components from the rest of the subjects
  const otherComponents = report.subjects.slice(4, 8).map((s: SubjectPerformance) => ({
    name: s.name,
    score: s.testAvgScore || s.notesCompletion || 0,
  }));

  // Fallback if no subjects
  const coreAvg = coreSubjects.length > 0 
    ? Math.round(coreSubjects.reduce((acc: number, s: any) => acc + s.score, 0) / coreSubjects.length)
    : 0;

  // Other components derived from remaining subjects or overall metrics
  const otherAvg = otherComponents.length > 0
    ? Math.round(otherComponents.reduce((acc: number, s: any) => acc + s.score, 0) / otherComponents.length)
    : Math.round((report.overallAttendance + report.learningCompletion) / 2);
  
  const ps = Math.round(coreAvg * 0.7 + otherAvg * 0.3);
  const pi = report.performanceIndex;
  const pri = Math.round(pi * 0.5 + ps * 0.5);

  return { coreSubjects, otherComponents, coreAvg, otherAvg, ps, pi, pri };
}

function getScoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getBarClass(score: number) {
  if (score >= 75) return '[&>div]:bg-emerald-500';
  if (score >= 60) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-red-500';
}

const PlacementReadiness: React.FC<PlacementReadinessProps> = ({ report }) => {
  const { coreSubjects, otherComponents, ...data } = computePS(report);

  const strongAreas = report.subjects.filter((s: SubjectPerformance) => s.strength === 'Strong').map(s => s.name);
  const weakAreas = report.subjects.filter((s: SubjectPerformance) => s.strength === 'Weak').map(s => s.name);

  const recommendations: { icon: React.ElementType; text: string; priority: 'high' | 'medium' | 'low' }[] = [];
  
  // Attendance Recommendation
  if (report.overallAttendance < 75) {
    recommendations.push({ 
      icon: Target, 
      text: `Attendance is critically low (${report.overallAttendance}%). Regular class attendance is required to improve understanding.`, 
      priority: 'high' 
    });
  }

  // Learning Progress Recommendation
  if (report.learningCompletion < 70) {
    recommendations.push({ 
      icon: Brain, 
      text: `Learning completion is at ${report.learningCompletion}%. Dedicate more time to reviewing curriculum subunits.`, 
      priority: 'high' 
    });
  }

  // Task Recommendation
  const pendingTasksTotal = report.subjects.reduce((acc: number, s: SubjectPerformance) => acc + s.tasksPending, 0);
  if (pendingTasksTotal > 0) {
    recommendations.push({ 
      icon: Lightbulb, 
      text: `You have ${pendingTasksTotal} pending tasks across subjects. Complete them to reinforce your practical skills.`, 
      priority: 'medium' 
    });
  }

  // Subject Specific Recommendations (Top 2 weak subjects)
  report.subjects.filter((s: SubjectPerformance) => s.strength === 'Weak').slice(0, 2).forEach(s => {
    recommendations.push({ 
      icon: TrendingDown, 
      text: `Performance in ${s.name} needs attention. Focus on practice tests to improve scores.`, 
      priority: 'high' 
    });
  });

  // Overall Performance
  if (report.performanceIndex > 85 && recommendations.length === 0) {
    recommendations.push({
      icon: TrendingUp,
      text: 'Excellent overall consistency. Maintain this pace for coming assessments.',
      priority: 'low'
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* PS Breakdown — spans 2 cols */}
      <Card className="border border-border/50 lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            Preparation Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2.5">Core Subjects · Avg {data.coreAvg}%</h4>
              <div className="space-y-2.5">
                {coreSubjects.map((s: any) => (
                  <ScoreRow key={s.name} name={s.name} score={s.score} />
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2.5">Other Components · Avg {data.otherAvg}%</h4>
              <div className="space-y-2.5">
                {otherComponents.map((s: any) => (
                  <ScoreRow key={s.name} name={s.name} score={s.score} />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PRI Insights — 1 col */}
      <Card className="border border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-500" />
            Readiness Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <span className={`text-2xl font-bold ${data.pri >= 70 ? 'text-emerald-600' : data.pri >= 55 ? 'text-amber-600' : 'text-red-600'}`}>
              {data.pri}%
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">PRI = (PI × 0.5) + (PS × 0.5)</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/30">
              <span className="text-sm font-bold text-foreground">{data.pi}%</span>
              <p className="text-[10px] text-muted-foreground">PI</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <span className="text-sm font-bold text-foreground">{data.ps}%</span>
              <p className="text-[10px] text-muted-foreground">PS</p>
            </div>
          </div>

          {strongAreas.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> Strong
              </p>
              <div className="flex flex-wrap gap-1">
                {strongAreas.map(a => (
                  <Badge key={a} variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0">{a}</Badge>
                ))}
              </div>
            </div>
          )}

          {weakAreas.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-500" /> Weak
              </p>
              <div className="flex flex-wrap gap-1">
                {weakAreas.map(a => (
                  <Badge key={a} variant="secondary" className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0">{a}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations — full width */}
      {recommendations.length > 0 && (
        <Card className="border border-border/50 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Faculty Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 text-sm">
                  <rec.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                    rec.priority === 'high' ? 'text-red-500' : 'text-amber-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">{rec.text}</p>
                    <span className={`text-[9px] font-medium ${
                      rec.priority === 'high' ? 'text-red-500' : 'text-amber-500'
                    }`}>
                      {rec.priority} priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ScoreRow: React.FC<{ name: string; score: number }> = ({ name, score }) => (
  <div className="space-y-0.5">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{name}</span>
      <span className={`font-semibold ${getScoreColor(score)}`}>{score}%</span>
    </div>
    <Progress value={score} className={`h-1.5 ${getBarClass(score)}`} />
  </div>
);

export default PlacementReadiness;

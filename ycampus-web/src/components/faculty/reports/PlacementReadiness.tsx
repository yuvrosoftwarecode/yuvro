import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, Lightbulb, TrendingUp, TrendingDown, MessageSquare } from 'lucide-react';
import type { StudentReport } from '@/hooks/useStudentReport';

interface PlacementReadinessProps {
  report: StudentReport;
}

function computePS(report: StudentReport) {
  const components = {
    dsa: 72, python: 78, database: 80, systemDesign: 55,
    aptitude: 68, logicalReasoning: 74, communication: 60, mockInterview: 52,
  };
  const coreAvg = (components.dsa + components.python + components.database + components.systemDesign) / 4;
  const otherAvg = (components.aptitude + components.logicalReasoning + components.communication + components.mockInterview) / 4;
  const ps = Math.round(coreAvg * 0.6 + otherAvg * 0.4);
  const pi = report.performanceIndex;
  const pri = Math.round(pi * 0.5 + ps * 0.5);
  return { ...components, ps, pi, pri, coreAvg: Math.round(coreAvg), otherAvg: Math.round(otherAvg) };
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
  const data = computePS(report);

  const coreSubjects = [
    { name: 'DSA', score: data.dsa },
    { name: 'Python', score: data.python },
    { name: 'Database', score: data.database },
    { name: 'System Design', score: data.systemDesign },
  ];

  const otherComponents = [
    { name: 'Aptitude', score: data.aptitude },
    { name: 'Logical Reasoning', score: data.logicalReasoning },
    { name: 'Communication', score: data.communication },
    { name: 'Mock Interviews', score: data.mockInterview },
  ];

  const allScores = [...coreSubjects, ...otherComponents];
  const strongAreas = allScores.filter(s => s.score >= 75).map(s => s.name);
  const weakAreas = allScores.filter(s => s.score < 65).map(s => s.name);

  const recommendations: { icon: React.ElementType; text: string; priority: 'high' | 'medium' | 'low' }[] = [];
  if (data.mockInterview < 65) recommendations.push({ icon: Target, text: 'Increase mock interview practice.', priority: 'high' });
  if (data.communication < 65) recommendations.push({ icon: MessageSquare, text: 'Improve communication skills for HR rounds.', priority: 'high' });
  if (data.systemDesign < 65) recommendations.push({ icon: Brain, text: 'Focus on System Design fundamentals.', priority: 'high' });
  if (data.dsa < 75) recommendations.push({ icon: Lightbulb, text: 'Practice more DSA problems.', priority: 'medium' });
  if (data.aptitude < 70) recommendations.push({ icon: Lightbulb, text: 'Regular aptitude practice recommended.', priority: 'medium' });

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
                {coreSubjects.map(s => (
                  <ScoreRow key={s.name} name={s.name} score={s.score} />
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2.5">Other Components · Avg {data.otherAvg}%</h4>
              <div className="space-y-2.5">
                {otherComponents.map(s => (
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

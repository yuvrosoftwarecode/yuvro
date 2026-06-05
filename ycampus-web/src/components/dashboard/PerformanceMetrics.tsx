import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '@/services/studentDashboardService';
import { useAuth } from '@/contexts/AuthContext';

export function PerformanceMetrics() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => studentDashboardService.getGamificationStats()
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasksSummary'],
    queryFn: () => studentDashboardService.getTasksSummary()
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendanceAggregate'],
    queryFn: () => studentDashboardService.getAttendanceAggregate()
  });

  const { data: tests, isLoading: testsLoading } = useQuery({
    queryKey: ['testPerformance', user?.college_product_type],
    queryFn: () => studentDashboardService.getTestPerformance(user?.college_product_type)
  });

  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['assessments', user?.college_product_type],
    queryFn: () => studentDashboardService.getAssessments(user?.college_product_type)
  });

  const { data: contests, isLoading: contestsLoading } = useQuery({
    queryKey: ['contests'],
    queryFn: () => studentDashboardService.getContests()
  });

  if (statsLoading || tasksLoading || attendanceLoading || testsLoading || assessmentsLoading || contestsLoading) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const learningProgress = stats?.avg_progress || 0;
  const taskCompletion = tasks?.overall || 0;
  const testAverage = tests?.avgScore || 0;
  const assessmentAverage = assessments?.avgScore || 0;
  const contestParticipation = contests?.completed || 0;
  const attendanceRate = attendance?.percentage || 0;
  
  // Overall Performance Score (Weighted average)
  // 25% Learning + 20% Tasks + 15% Tests + 15% Assessment + 5% Contest + 20% Attendance
  const overallScore = Math.round(
    (learningProgress * 0.25) + 
    (taskCompletion * 0.20) + 
    (testAverage * 0.15) + 
    (assessmentAverage * 0.15) + 
    (Math.min(contestParticipation * 10, 100) * 0.05) + 
    (attendanceRate * 0.20)
  );

  const metrics = [
    { label: 'Learning Progress', value: learningProgress, color: 'hsl(var(--success))' },
    { label: 'Task Completion', value: taskCompletion, color: 'hsl(var(--success-light))' },
    { label: 'Test Average', value: testAverage, color: 'hsl(var(--saffron))' },
    { label: user?.college_product_type === 'assessments' ? 'Assessment Average' : 'Internal Test Average', value: assessmentAverage, color: 'hsl(var(--primary))' },
    { label: 'Contest Participation', value: Math.min(contestParticipation * 10, 100), displayValue: String(contestParticipation), color: 'hsl(var(--saffron-light))' },
    { label: 'Attendance Rate', value: attendanceRate, color: 'hsl(var(--success))' }
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" style={{ color: 'hsl(var(--success-light))' }} />
          Performance Metrics Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {metrics.map((metric, index) => (
          <div key={index} className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">{metric.label}</span>
              <span className="text-sm font-bold" style={{ color: metric.color }}>
                {(metric as any).displayValue ?? `${metric.value}%`}
              </span>
            </div>
            <Progress value={metric.value} className="h-2" />
          </div>
        ))}

        <div className="pt-4 border-t mt-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
                {overallScore}%
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Overall Performance Score
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

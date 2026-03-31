
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3 } from 'lucide-react';

export function PerformanceMetrics() {
  const metrics = [
    { label: 'Learning Progress', value: 78, color: 'hsl(var(--success))' },
    { label: 'Task Completion', value: 85, color: 'hsl(var(--success-light))' },
    { label: 'Assessment Average', value: 82, color: 'hsl(var(--saffron))' },
    { label: 'Contest Participation', value: 70, color: 'hsl(var(--saffron-light))' },
    { label: 'Attendance Rate', value: 85, color: 'hsl(var(--success))' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" style={{ color: 'hsl(var(--success-light))' }} />
          Performance Metrics Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">{metric.label}</span>
              <span className="text-sm font-bold" style={{ color: metric.color }}>
                {metric.value}%
              </span>
            </div>
            <Progress value={metric.value} className="h-2" />
          </div>
        ))}

        <div className="pt-4 border-t mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
              80%
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Overall Performance Score
            </p>
          </div>
          <div className="mt-4 space-y-2 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Performance Index</span>
              <span className="text-sm font-bold" style={{ color: 'hsl(var(--success))' }}>
                80%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Preparation Score</span>
              <span className="text-sm font-bold" style={{ color: 'hsl(var(--success))' }}>
                75%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Placement Readiness Index</span>
              <span className="text-sm font-bold" style={{ color: 'hsl(var(--success))' }}>
                77.5%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

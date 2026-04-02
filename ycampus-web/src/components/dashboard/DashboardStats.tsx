import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStudentStats } from '@/hooks/useDashboardStats';

interface StatCardProps {
  title: string;
  metrics: {
    label: string;
    value: string | number;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  }[];
}

export function StatCard({ title, metrics }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl font-bold text-foreground mb-1">
                {metric.value}
              </div>
              <Badge variant={metric.variant || 'secondary'} className="text-xs">
                {metric.label}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  const { data: stats, isLoading } = useStudentStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <div className="h-5 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const assessmentMetrics = [
    { label: 'Courses', value: stats?.coursesEnrolled || 0, variant: 'default' as const },
    { label: 'Attendance', value: `${stats?.attendance || 0}%`, variant: 'secondary' as const },
    { label: 'GPA', value: stats?.gpa.toFixed(1) || '0.0', variant: 'outline' as const }
  ];

  const testMetrics = [
    { label: 'Overall', value: 8, variant: 'default' as const },
    { label: 'Submitted', value: 142, variant: 'secondary' as const },
    { label: 'Pending', value: 3, variant: 'destructive' as const },
    { label: 'Avg Score', value: '82%', variant: 'outline' as const }
  ];

  const taskMetrics = [
    { label: 'Assignments', value: stats?.assignments || 0, variant: 'default' as const },
    { label: 'Submitted', value: 67, variant: 'secondary' as const },
    { label: 'Pending', value: 4, variant: 'destructive' as const }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <StatCard title="Assessments" metrics={assessmentMetrics} />
      <StatCard title="Tests" metrics={testMetrics} />
      <StatCard title="Tasks" metrics={taskMetrics.slice(0, 3)} />
    </div>
  );
}
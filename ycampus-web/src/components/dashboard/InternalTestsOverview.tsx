import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '@/services/studentDashboardService';

export function InternalTestsOverview() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['assessmentsOverview'],
    queryFn: () => studentDashboardService.getAssessments()
  });

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const stats = data || {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    avgScore: 0,
    highestScore: 0,
    lowestScore: 0,
    recentStatus: 0
  };

  const lastStatusText = stats.recentStatus > 0 ? `Completed - ${stats.recentStatus}%` : 'No recent activities';

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col" onClick={() => navigate('/student/campus/internal-test')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" style={{ color: 'hsl(var(--saffron-light))' }} />
            Internal Tests Overview
          </CardTitle>
          <Badge variant="outline">{stats.completed}/{stats.total}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-xl font-bold" style={{ color: 'hsl(var(--success))' }}>
              {stats.completed}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-xl font-bold" style={{ color: 'hsl(var(--saffron))' }}>
              {stats.inProgress}
            </div>
            <div className="text-xs text-muted-foreground mt-1">In Progress</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-destructive">{stats.pending}</div>
            <div className="text-xs text-muted-foreground mt-1">Pending</div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Average Score</span>
            <div className="flex items-center gap-1">
              <span className="font-bold text-lg" style={{ color: 'hsl(var(--success))' }}>
                {stats.avgScore}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Highest Score</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
              <span className="font-semibold" style={{ color: 'hsl(var(--success))' }}>
                {stats.highestScore}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Lowest Score</span>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4" style={{ color: 'hsl(var(--saffron))' }} />
              <span className="font-semibold" style={{ color: 'hsl(var(--saffron))' }}>
                {stats.lowestScore}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Recent Status</span>
            <Badge style={{ 
              backgroundColor: 'hsl(var(--success) / 0.2)',
              color: 'hsl(var(--success))',
              borderColor: 'hsl(var(--success) / 0.3)'
            }}>
              {lastStatusText}
            </Badge>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-auto">
          Click to view all internal tests
        </div>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Trophy, Target, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '@/services/studentDashboardService';

export function TestPerformance() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['testPerformance'],
    queryFn: () => studentDashboardService.getTestPerformance()
  });

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const stats = data || {
    completed: 0,
    avgScore: 0,
    accuracy: 0,
    chaptersCompleted: '0%',
    lastTestScore: 0,
    leaderboard: { you: 0, global: 0 }
  };

  const leaderboard = stats.leaderboard;

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col" onClick={() => navigate('/student/test')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" style={{ color: 'hsl(var(--saffron-light))' }} />
            Test Performance
          </CardTitle>
          <Trophy className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
              {stats.completed}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold" style={{ color: 'hsl(var(--saffron))' }}>
              {stats.avgScore}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">Avg Score</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-foreground">{stats.accuracy}%</div>
            <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Syllabus Covered</span>
            <Badge variant="secondary">{stats.chaptersCompleted}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Last Test Score</span>
            <Badge style={{ 
              backgroundColor: 'hsl(var(--success) / 0.2)',
              color: 'hsl(var(--success))',
              borderColor: 'hsl(var(--success) / 0.3)'
            }}>
              {stats.lastTestScore}%
            </Badge>
          </div>
        </div>

        <div className="pt-2 border-t mt-auto">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Leaderboard Comparison</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-bold" style={{ color: 'hsl(var(--saffron))' }}>{leaderboard.you}%</div>
              <div className="text-xs text-muted-foreground">Your Average</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-bold text-foreground">{leaderboard.global}%</div>
              <div className="text-xs text-muted-foreground">Global Average</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          Click to attempt practice tests
        </div>
      </CardContent>
    </Card>
  );
}

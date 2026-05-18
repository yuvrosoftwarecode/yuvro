import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Zap, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '@/services/studentDashboardService';

export function ContestPerformance() {
  const { data, isLoading } = useQuery({
    queryKey: ['contestPerformance'],
    queryFn: () => studentDashboardService.getContests()
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
    bestRank: 0,
    avgScore: 0,
    successRate: 0,
    lastContest: {
      rank: 0,
      accuracy: 0,
      time: '—'
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: 'hsl(var(--saffron-light))' }} />
            Contest Performance
          </CardTitle>
          <Medal className="h-5 w-5" style={{ color: 'hsl(var(--saffron))' }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
              {stats.completed}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold" style={{ color: 'hsl(var(--saffron))' }}>
              {stats.bestRank > 0 ? `#${stats.bestRank}` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Best Rank</div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Average Score</span>
            <Badge style={{ 
              backgroundColor: 'hsl(var(--saffron) / 0.2)',
              color: 'hsl(var(--saffron))',
              borderColor: 'hsl(var(--saffron) / 0.3)'
            }}>
              {stats.avgScore}%
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Success Rate</span>
            <Badge style={{ 
              backgroundColor: 'hsl(var(--success) / 0.2)',
              color: 'hsl(var(--success))',
              borderColor: 'hsl(var(--success) / 0.3)'
            }}>
              {stats.successRate}%
            </Badge>
          </div>
        </div>

        <div className="pt-2 border-t mt-auto">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4" style={{ color: 'hsl(var(--saffron))' }} />
            <span className="text-sm font-medium">Last Contest Performance</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-bold text-foreground">{stats.lastContest.rank > 0 ? `#${stats.lastContest.rank}` : '—'}</div>
              <div className="text-xs text-muted-foreground">Rank</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-bold" style={{ color: 'hsl(var(--success))' }}>
                {stats.lastContest.accuracy}%
              </div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-bold text-foreground">{stats.lastContest.time}</div>
              <div className="text-xs text-muted-foreground">Time</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          Keep participating to improve your ranking!
        </div>
      </CardContent>
    </Card>
  );
}

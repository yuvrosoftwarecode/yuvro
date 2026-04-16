import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Award, Star, TrendingUp, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '@/services/studentDashboardService';

export function StreaksAndBadges() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => studentDashboardService.getGamificationStats()
  });

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const stats = data || {
    streak: 0,
    level: 1,
    xp: 0,
    longest_streak: 0
  };

  const streak = {
    current: stats.streak || 0,
    lastMilestone: Math.floor((stats.streak || 0) / 5) * 5,
    nextBadge: 'Explorer',
    daysToNext: 5 - ((stats.streak || 0) % 5)
  };

  const badges = [
    { name: 'Bronze', earned: stats.streak >= 1, icon: '🥉' },
    { name: 'Silver', earned: stats.streak >= 5, icon: '🥈' },
    { name: 'Gold', earned: stats.streak >= 10, icon: '🥇' },
    { name: 'Platinum', earned: stats.streak >= 30, icon: '💎' }
  ];

  const achievements = [
    { text: `Reached Level ${stats.level}`, date: 'Always evolving' },
    { text: `Current Streak: ${stats.streak} days`, date: stats.streak > 0 ? 'Last active today' : 'Get started today!' },
    { text: `Total Experience: ${stats.xp} XP`, date: 'Keep learning' }
  ];

  const progressToNext = ((stats.streak % 5) / 5) * 100;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5" style={{ color: 'hsl(var(--saffron-light))' }} />
          Streaks & Badges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="h-8 w-8" style={{ color: 'hsl(var(--saffron))' }} />
            <span className="text-4xl font-bold" style={{ color: 'hsl(var(--saffron))' }}>
              {streak.current}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Day Streak</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to Next Milestone</span>
            <span className="font-semibold">{streak.daysToNext} days left</span>
          </div>
          <Progress value={progressToNext} className="h-2" />
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
            <span className="text-sm font-medium">Earned Badges</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {badges.map((badge, index) => (
              <div
                key={index}
                className={`text-center p-3 rounded-lg border transition-all ${
                  badge.earned
                    ? 'bg-muted/50 border-primary/30'
                    : 'bg-muted/20 border-muted opacity-50'
                }`}
              >
                <div className="text-2xl mb-1">{badge.icon}</div>
                <div className="text-xs font-medium">{badge.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t mt-auto">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4" style={{ color: 'hsl(var(--saffron))' }} />
            <span className="text-sm font-medium">Insights</span>
          </div>
          <div className="space-y-2">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'hsl(var(--success))' }} />
                <div className="flex-1">
                  <p className="text-foreground leading-tight">{achievement.text}</p>
                  <p className="text-[10px] text-muted-foreground">{achievement.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

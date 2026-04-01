import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Award, Star, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function StreaksAndBadges() {
  const streak = {
    current: 12,
    lastMilestone: 10,
    nextBadge: 'Silver',
    daysToNext: 3
  };

  const badges = [
    { name: 'Bronze', earned: true, icon: '🥉' },
    { name: 'Silver', earned: false, icon: '🥈' },
    { name: 'Gold', earned: false, icon: '🥇' },
    { name: 'Platinum', earned: false, icon: '💎' }
  ];

  const achievements = [
    { text: 'Completed 5 notes in a week', date: '2 days ago' },
    { text: 'Perfect score in Python test', date: '5 days ago' },
    { text: '10 day learning streak', date: '1 week ago' }
  ];

  const progressToNext = ((streak.current - streak.lastMilestone) / (streak.lastMilestone + 5 - streak.lastMilestone)) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5" style={{ color: 'hsl(var(--saffron-light))' }} />
          Streaks & Badges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <span className="text-muted-foreground">Progress to {streak.nextBadge}</span>
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

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4" style={{ color: 'hsl(var(--saffron))' }} />
            <span className="text-sm font-medium">Recent Achievements</span>
          </div>
          <div className="space-y-2">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'hsl(var(--success))' }} />
                <div className="flex-1">
                  <p className="text-foreground">{achievement.text}</p>
                  <p className="text-xs text-muted-foreground">{achievement.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

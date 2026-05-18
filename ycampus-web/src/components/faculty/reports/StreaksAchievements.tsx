import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Trophy, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  Zap, 
  Flame,
  HelpCircle
} from 'lucide-react';
import type { StudentReport } from '@/hooks/useStudentReport';

interface StreaksAchievementsProps {
  report: StudentReport;
}

const iconMap: Record<string, any> = {
  Trophy,
  Award,
  BookOpen,
  CheckCircle2,
  Zap,
  Flame,
};

const StreaksAchievements: React.FC<StreaksAchievementsProps> = ({ report }) => {
  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Streaks & Achievements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {report.badges.map((badge, i) => {
            const IconComponent = iconMap[badge.icon] || HelpCircle;
            
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-opacity ${
                  badge.earned
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-muted/30 border-border/50 text-muted-foreground opacity-50'
                }`}
              >
                <IconComponent className={`h-4 w-4 ${badge.earned ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <span className="font-medium">{badge.name}</span>
                {!badge.earned && <span className="text-[10px] ml-1">(locked)</span>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StreaksAchievements;

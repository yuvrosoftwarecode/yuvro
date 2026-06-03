import React from 'react';
import { Users, Trophy, Target, Zap, Clock } from 'lucide-react';
import { LeaderboardEntry } from '@/services/leaderboardService';

interface LeaderboardAnalyticsCardsProps {
  entries: LeaderboardEntry[];
  scope: 'test' | 'unit' | 'subject' | 'global' | 'assessments';
}

const LeaderboardAnalyticsCards: React.FC<LeaderboardAnalyticsCardsProps> = ({ entries, scope }) => {
  if (!entries || entries.length === 0) return null;

  const totalParticipants = entries.length;
  
  let highestScore = 0;
  let totalScore = 0;
  let totalAccuracy = 0;
  let fastestTime = Infinity;

  entries.forEach(entry => {
    const score = scope === 'test' ? (entry.score ?? (entry as any).marks ?? 0) : (entry.performance_score ?? 0);
    if (score > highestScore) highestScore = score;
    totalScore += score;
    totalAccuracy += entry.accuracy || 0;
    
    if (scope === 'test' && entry.time_taken && entry.time_taken > 0) {
      if (entry.time_taken < fastestTime) fastestTime = entry.time_taken;
    }
  });

  const averageScore = Math.round((totalScore / totalParticipants) * 10) / 10;
  const averageAccuracy = Math.round(totalAccuracy / totalParticipants);

  const formatTime = (seconds: number) => {
    if (seconds === Infinity) return '-';
    return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white/50 dark:bg-black/20 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:bg-white/60 dark:hover:bg-black/30">
      <div className={`p-3 rounded-full ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h4 className="text-xl font-bold text-foreground">{value}</h4>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard 
        title="Participants" 
        value={totalParticipants} 
        icon={Users} 
        colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
      />
      <StatCard 
        title="Highest Score" 
        value={highestScore} 
        icon={Trophy} 
        colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" 
      />
      <StatCard 
        title="Avg Accuracy" 
        value={`${averageAccuracy}%`} 
        icon={Target} 
        colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" 
      />
      {scope === 'test' ? (
        <StatCard 
          title="Fastest Time" 
          value={formatTime(fastestTime)} 
          icon={Zap} 
          colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
        />
      ) : (
        <StatCard 
          title="Avg Score" 
          value={averageScore} 
          icon={Clock} 
          colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
        />
      )}
    </div>
  );
};

export default LeaderboardAnalyticsCards;

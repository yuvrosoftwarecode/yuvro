import React from 'react';
import { Trophy, Flame, Zap, Code, BookOpen, BrainCircuit } from 'lucide-react';

interface Badge {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  xp_reward: number;
  earned: boolean;
  earned_at?: string;
  progress?: number;
  target?: number;
}

interface BadgesWidgetProps {
  badges: Badge[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'flame':          <Flame className="w-4 h-4" />,
  'zap':            <Zap className="w-4 h-4" />,
  'code':           <Code className="w-4 h-4" />,
  'trophy':         <Trophy className="w-4 h-4" />,
  'book-open':      <BookOpen className="w-4 h-4" />,
  'brain-circuit':  <BrainCircuit className="w-4 h-4" />,
  'graduation-cap': <Trophy className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  streak:   'Streak',
  xp:       'YP',
  coding:   'Coding',
  learning: 'Learning',
  quiz:     'Quiz',
};

const BadgesWidget: React.FC<BadgesWidgetProps> = ({ badges }) => {
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-saffron-600" />
          <span className="text-sm font-semibold text-gray-900">Badges</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">{earned.length}/{badges.length}</span>
      </div>

      {/* Earned */}
      {earned.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Earned</p>
          <div className="grid grid-cols-4 gap-2">
            {earned.map(badge => (
              <div
                key={badge.key}
                title={`${badge.name} — ${badge.description}`}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-saffron-50 border border-saffron-100 cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-saffron-600 flex items-center justify-center text-white shadow-sm shadow-saffron-200">
                  {ICON_MAP[badge.icon] ?? <Trophy className="w-4 h-4" />}
                </div>
                <span className="text-[9px] font-bold text-saffron-700 text-center leading-tight line-clamp-2">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked — now with progress */}
      {locked.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">In Progress</p>
          <div className="grid grid-cols-4 gap-2">
            {locked.map(badge => {
              const progress = badge.progress ?? 0;
              const target = badge.target ?? 1;
              const pct = Math.min(Math.round((progress / target) * 100), 100);
              const hasProgress = progress > 0;

              return (
                <div
                  key={badge.key}
                  title={`${badge.description} (${progress}/${target})`}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border cursor-default transition-all ${
                    hasProgress
                      ? 'bg-gray-50/80 border-gray-200 hover:border-saffron-200'
                      : 'bg-gray-50 border-gray-100 opacity-50'
                  }`}
                >
                  <div className="relative w-8 h-8">
                    {/* Circular progress ring */}
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="13" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
                      {hasProgress && (
                        <circle
                          cx="16" cy="16" r="13"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          strokeDasharray={`${pct * 0.817} 100`}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      {ICON_MAP[badge.icon] ?? <Trophy className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 text-center leading-tight line-clamp-2">{badge.name}</span>
                  {hasProgress && (
                    <span className="text-[8px] font-bold text-saffron-500">{progress}/{target}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {badges.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">Complete activities to earn badges.</p>
      )}
    </div>
  );
};

export default BadgesWidget;

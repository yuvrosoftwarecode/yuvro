import React, { useEffect, useRef, useState } from 'react';
import { Target, Flame, Code, BookOpen, Brain, Zap, CheckCircle2, Circle, Trophy } from 'lucide-react';
import { useDailyMissions, type DailyMission } from '@/hooks/useLearnDashboard';

const ICON_MAP: Record<string, React.ReactNode> = {
  'target': <Target className="w-3.5 h-3.5" />,
  'flame': <Flame className="w-3.5 h-3.5" />,
  'code': <Code className="w-3.5 h-3.5" />,
  'book-open': <BookOpen className="w-3.5 h-3.5" />,
  'brain-circuit': <Brain className="w-3.5 h-3.5" />,
  'zap': <Zap className="w-3.5 h-3.5" />,
};

const MissionRow: React.FC<{ um: DailyMission; isNew?: boolean }> = ({ um, isNew = false }) => {
  const icon = ICON_MAP[um.mission.icon] ?? <Target className="w-3.5 h-3.5" />;
  const pct = um.progress_pct;

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
        um.is_completed
          ? 'bg-emerald-50/60 border-emerald-200/40'
          : 'bg-gray-50/60 border-gray-100 hover:bg-gray-100/60'
      } ${isNew ? 'animate-mission-slide-in' : ''}`}
    >
      {/* Icon */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
        um.is_completed ? 'bg-emerald-500/15 text-emerald-600' : 'bg-saffron/10 text-saffron'
      }`}>
        {icon}
      </div>

      {/* Text + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[11px] font-bold truncate ${
            um.is_completed ? 'text-emerald-700 line-through opacity-70' : 'text-gray-800'
          }`}>
            {um.mission.title}
          </span>
          <span className="text-[10px] font-semibold text-gray-400 ml-2 flex-shrink-0">
            {um.progress}/{um.mission.target}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-200/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              um.is_completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-saffron-start to-saffron-end'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0">
        {um.is_completed
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          : <Circle className="w-4 h-4 text-gray-300" />
        }
      </div>
    </div>
  );
};

const DailyGoalWidget: React.FC = () => {
  const { data, isLoading } = useDailyMissions();
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const isFirstRender = useRef(true);

  const missions = data?.missions ?? [];
  const completedCount = data?.completed_count ?? 0;
  const totalCount = data?.total_count ?? 0;

  // Track new missions that slide in (skip the first render)
  useEffect(() => {
    if (missions.length === 0) return;

    const currentIds = new Set(missions.map((m) => m.id));

    if (isFirstRender.current) {
      // First load — just record IDs, don't animate
      setKnownIds(currentIds);
      isFirstRender.current = false;
      return;
    }

    // Find IDs that weren't in the previous set
    const freshIds = new Set<number>();
    currentIds.forEach((id) => {
      if (!knownIds.has(id)) freshIds.add(id);
    });

    if (freshIds.size > 0) {
      setNewIds(freshIds);
      setKnownIds(currentIds);
      // Clear the "new" flag after animation completes
      const timer = setTimeout(() => setNewIds(new Set()), 600);
      return () => clearTimeout(timer);
    }
  }, [missions]);

  return (
    <div className="pt-5 px-5 pb-4 space-y-3 relative group">
      {/* Slide-in animation keyframes */}
      <style>{`
        @keyframes missionSlideIn {
          0%   { opacity: 0; transform: translateY(12px) scale(0.97); }
          60%  { opacity: 1; transform: translateY(-2px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-mission-slide-in {
          animation: missionSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Background shimmer */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[50px] -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors duration-700" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-saffron-start to-saffron-end flex items-center justify-center shadow-md shadow-saffron/20">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Daily Missions</h3>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {isLoading ? 'Loading…' : `${completedCount} / ${totalCount} done`}
            </p>
          </div>
        </div>
        {completedCount > 0 && missions.every((m) => !m.is_completed) ? (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold bg-saffron/10 text-saffron-end border border-saffron/20 rounded-full px-2.5 py-1">
            <Trophy className="w-3 h-3" />
            {completedCount} CLEARED
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Mission list */}
      <div className="space-y-2 relative z-10">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-100/60 animate-pulse" />
          ))
        ) : missions.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No missions today.</p>
        ) : (
          missions.map((um) => (
            <MissionRow key={um.id} um={um} isNew={newIds.has(um.id)} />
          ))
        )}
      </div>

      {/* XP reward summary */}
      {!isLoading && missions.length > 0 && (
        <div className="flex items-center justify-between relative z-10">
          {completedCount > 0 && (
            <span className="text-[10px] font-bold text-emerald-500">
              ✓ {completedCount} mission{completedCount > 1 ? 's' : ''} cleared
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <Zap className="w-3 h-3 text-saffron" />
            <span className="text-[10px] font-bold text-gray-400">
              {missions.reduce((sum, um) => sum + (um.is_completed ? 0 : um.mission.xp_reward), 0)} YP remaining
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyGoalWidget;

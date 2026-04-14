import React from 'react';
import { TrendingUp } from 'lucide-react';

interface LeaderboardUser {
  rank: number;
  name: string;
  avatar?: string;
  points: number;
}

interface LeaderboardWidgetProps {
  topUsers: LeaderboardUser[];
  currentUserRank: number;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({ topUsers, currentUserRank }) => {
  // Find if the current user is in the top users list
  const currentUserEntry = topUsers.find(u => u.rank === currentUserRank);

  // Build the display list: top 5, and if current user not in top 5 append them
  const displayList = topUsers.slice(0, 5);
  const isYouInTop = displayList.some(u => u.rank === currentUserRank);

  return (
    <div className="space-y-1">
      {displayList.map((entry) => {
        const isYou = entry.rank === currentUserRank;
        const medal = MEDALS[entry.rank];

        return (
          <div
            key={entry.rank}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
              isYou
                ? 'bg-saffron/5 border border-saffron/20'
                : 'hover:bg-gray-50'
            }`}
          >
            {/* Left: rank + avatar + name */}
            <div className="flex items-center gap-2.5">
              <span className="text-sm w-6 text-center">
                {medal ? (
                  <span>{medal}</span>
                ) : (
                  <span className="text-xs text-gray-400 font-bold">{entry.rank}</span>
                )}
              </span>

              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isYou ? 'bg-saffron text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {entry.name.charAt(0).toUpperCase()}
              </div>

              <span className={`text-sm ${isYou ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                {entry.name}
              </span>

              {isYou && (
                <span className="text-[9px] font-bold text-saffron bg-saffron/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  you
                </span>
              )}
            </div>

            {/* Right: score */}
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-gray-500 font-bold">{entry.points}</span>
            </div>
          </div>
        );
      })}

      {/* If current user is not in the top 5 list, show them separately */}
      {!isYouInTop && currentUserRank > 0 && (
        <>
          <div className="flex items-center gap-2 px-3 py-1">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[9px] text-gray-400 font-medium">your rank</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-saffron/5 border border-saffron/20">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-gray-400 font-bold w-6 text-center">{currentUserRank}</span>
              <div className="w-7 h-7 rounded-full bg-saffron flex items-center justify-center text-[10px] font-bold text-white">
                Y
              </div>
              <span className="text-sm font-bold text-gray-900">You</span>
              <span className="text-[9px] font-bold text-saffron bg-saffron/10 px-2 py-0.5 rounded-full uppercase tracking-wider">you</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-gray-500 font-bold">{currentUserEntry?.points ?? '—'}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeaderboardWidget;

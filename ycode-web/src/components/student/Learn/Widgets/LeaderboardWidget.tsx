import React, { useState } from 'react';
import { Trophy, Medal, Crown, ChevronRight, Globe, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import restApiAuthUtil from '@/utils/RestApiAuthUtil';
import { useQuery } from '@tanstack/react-query';

interface LeaderboardUser {
  rank: number;
  name: string;
  avatar?: string;
  points: number;
  isCurrentUser?: boolean;
}

type LeaderboardScope = 'global' | 'college';

interface LeaderboardWidgetProps {
  topUsers: LeaderboardUser[];          // global data from parent
  currentUserRank: number;
  currentUserXp?: number;
}

const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({ topUsers, currentUserRank, currentUserXp = 0 }) => {
  const [scope, setScope] = useState<LeaderboardScope>('global');

  // Fetch college-scoped data on demand
  const { data: collegeData, isLoading: collegeLoading } = useQuery({
    queryKey: ['leaderboard-college'],
    queryFn: async () => {
      const res = await restApiAuthUtil.get<any[]>('/gamification/leaderboard/?scope=college');
      return res.map((e: any) => ({
        rank: e.rank,
        name: e.user,
        points: e.xp,
        avatar: e.avatar,
        isCurrentUser: e.is_current_user,
      }));
    },
    enabled: scope === 'college',
    staleTime: 1000 * 60 * 2,
  });

  const activeUsers = scope === 'global' ? topUsers : (collegeData ?? []);
  const activeLoading = scope === 'college' && collegeLoading;

  const collegeCurrentRank = scope === 'college'
    ? (collegeData?.find(u => u.isCurrentUser)?.rank ?? 0)
    : currentUserRank;

  return (
    <div className="px-3 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg flex items-center gap-2 shadow-sm">
          <Trophy className="w-3.5 h-3.5 text-orange-600" />
          <span className="text-sm font-medium text-gray-900 tracking-tight">Leaderboard</span>
        </div>

        {/* Scope toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setScope('global')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
              scope === 'global'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Globe className="w-3 h-3" />
            Global
          </button>
          <button
            onClick={() => setScope('college')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
              scope === 'college'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Building2 className="w-3 h-3" />
            College
          </button>
        </div>
      </div>

      {/* Ranks Row */}
      {activeLoading ? (
        <div className="flex items-center justify-center h-20">
          <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : activeUsers.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          {scope === 'college' ? 'No college data — set your college in your profile.' : 'No data yet.'}
        </p>
      ) : (
        <>
          <p className="sr-only">Ranks Row</p>
          <div className="flex items-end justify-center gap-5 py-2">
            {activeUsers.slice(0, 3).map((user, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              return (
                <div key={user.rank} className={`flex flex-col items-center relative ${isFirst ? '-mb-2 scale-105' : ''}`}>
                  <div className={`absolute -top-1.5 ${isFirst ? '-right-1' : '-right-0.5'} z-10 scale-75`}>
                    {isFirst && <Crown className="w-4 h-4 text-yellow-500 transform rotate-12 drop-shadow-sm" fill="currentColor" />}
                    {isSecond && <Medal className="w-3.5 h-3.5 text-gray-300" fill="currentColor" />}
                    {isThird && <Medal className="w-3.5 h-3.5 text-amber-600" fill="currentColor" />}
                  </div>

                  <Avatar className={`
                    ${isFirst ? 'w-10 h-10' : 'w-8 h-8'} 
                    border-2 ${isFirst ? 'border-yellow-400' : 'border-orange-50'}
                    shadow-md transition-transform hover:scale-105 duration-200 cursor-pointer
                    ${user.isCurrentUser ? 'ring-2 ring-orange-400 ring-offset-1' : ''}
                  `}>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="bg-orange-50 text-orange-600 font-medium text-[11px] uppercase">
                      {user.name.substring(0, 1)}
                    </AvatarFallback>
                  </Avatar>

                  <span className="text-[11px] font-medium text-gray-900 mt-2 mb-0.5 max-w-[50px] truncate leading-none">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-medium text-orange-600 tracking-widest leading-none">#{user.rank}</span>
                </div>
              );
            })}
          </div>

          {/* Current User Rank Bar */}
          <div className="mt-5 bg-orange-50/30 rounded-lg p-3 border border-orange-100 border-dashed flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <Medal className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-none mb-1">Your position</p>
                <div className="flex items-baseline gap-1 leading-none">
                  <span className="text-sm font-bold text-gray-900">#{collegeCurrentRank || '—'}</span>
                  <span className="text-[10px] font-medium text-gray-400 lowercase tracking-tight ml-0.5 font-sans">
                    {scope === 'college' ? 'in college' : 'global'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeaderboardWidget;

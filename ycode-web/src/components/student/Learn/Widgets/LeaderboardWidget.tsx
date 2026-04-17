import React from 'react';
import { Trophy, Medal, Crown, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({ topUsers, currentUserRank }) => {
  return (
    <div className="px-3 py-4">
      <div className="flex items-center justify-between mb-5">
        <div className="bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg flex items-center gap-2 shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-orange-600" />
            <span className="text-sm font-medium text-gray-900 tracking-tight">Leaderboard</span>
        </div>
        <button className="text-sm font-medium text-orange-600 hover:text-orange-800 transition-colors flex items-center gap-1 group">
            Rankings
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Ranks Row (Ultra-Compact) */}
      <p className="sr-only">Ranks Row</p>
      <div className="flex items-end justify-center gap-5 py-2">
        {topUsers.slice(0, 3).map((user, index) => {
          const isFirst = index === 0;
          const isSecond = index === 1;
          const isThird = index === 2;

          return (
            <div key={user.rank} className={`flex flex-col items-center relative ${isFirst ? '-mb-2 scale-105' : ''}`}>
               {/* Badge Icon (Smaller) */}
               <div className={`absolute -top-1.5 ${isFirst ? '-right-1' : '-right-0.5'} z-10 scale-75`}>
                   {isFirst && <Crown className="w-4 h-4 text-yellow-500 transform rotate-12 drop-shadow-sm" fill="currentColor" />}
                   {isSecond && <Medal className="w-3.5 h-3.5 text-gray-300" fill="currentColor" />}
                   {isThird && <Medal className="w-3.5 h-3.5 text-amber-600" fill="currentColor" />}
               </div>
               
               <Avatar className={`
                 ${isFirst ? 'w-10 h-10' : 'w-8 h-8'} 
                 border-2 ${isFirst ? 'border-yellow-400' : 'border-orange-50'}
                 shadow-md transition-transform hover:scale-105 duration-200 cursor-pointer
               `}>
                 <AvatarImage src={user.avatar} />
                 <AvatarFallback className="bg-orange-50 text-orange-600 font-medium text-[11px] uppercase">
                   {user.name.substring(0, 1)}
                 </AvatarFallback>
               </Avatar>
               
               <span className="text-[11px] font-medium text-gray-900 mt-2 mb-0.5 max-w-[50px] truncate leading-none">{user.name.split(' ')[0]}</span>
               <span className="text-[10px] font-medium text-orange-600 tracking-widest leading-none">#{user.rank}</span>
            </div>
          );
        })}
      </div>

      {/* Current User Rank Bar (Consistent) */}
      <div className="mt-5 bg-orange-50/30 rounded-lg p-3 border border-orange-100 border-dashed flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <Medal className="w-5 h-5 text-orange-600" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest leading-none mb-1">Your position</p>
                <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-sm font-bold text-gray-900">#{currentUserRank}</span>
                    <span className="text-[10px] font-medium text-gray-400 lowercase tracking-tight ml-0.5 font-sans">global</span>
                </div>
            </div>
        </div>
        <button className="bg-white text-gray-900 border border-gray-100 hover:bg-gray-50 text-[10px] font-bold px-3 py-1.5 rounded-lg h-fit transition-all hover:shadow-sm">
            Stats
        </button>
      </div>

    </div>
  );
};

export default LeaderboardWidget;

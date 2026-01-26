import React from 'react';
import { Target, Code, TrendingUp, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProfileStatsProps {
  profileStrength: number;
  suggestions: { text: string; boost: number }[];
  gamificationStats?: {
    streak: number;
    xp: number;
    level: number;
    lessons_completed: number;
  };
}

const ProfileStats: React.FC<ProfileStatsProps> = ({ profileStrength, suggestions, gamificationStats }) => {
  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-green-600';
    if (strength >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStrengthBgColor = (strength: number) => {
    if (strength >= 80) return 'bg-green-500';
    if (strength >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Use real stats if available, fallbacks otherwise
  const streak = gamificationStats?.streak || 0;
  const xp = gamificationStats?.xp || 0;
  const level = gamificationStats?.level || 1;
  const lessons = gamificationStats?.lessons_completed || 0;

  const statsList = [
    {
      icon: TrendingUp,
      label: 'Current Level',
      value: `Lvl ${level}`,
      change: `${xp} Total XP`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Code,
      label: 'Lessons Done',
      value: lessons.toString(),
      change: 'Keep learning!',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Clock,
      label: 'Day Streak',
      value: streak.toString(),
      change: 'Consistency is key',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Learning Streak Visual options */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-orange-500" />
          Active Streak
        </h2>
        <div className="text-center py-2">
          <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-2 drop-shadow-sm">
            {streak}
          </div>
          <div className="text-gray-500 font-medium mb-4 uppercase tracking-wider text-xs">Days in a row</div>

          <div className="flex justify-center gap-1.5 mb-4">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${i < (streak % 8 === 0 && streak > 0 ? 7 : streak % 8) ? 'bg-orange-500 scale-110 shadow-sm' : 'bg-gray-200'
                  }`}
                title={i < streak ? "Active" : "Pending"}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 italic">
            "Consistency is the DNA of mastery."
          </p>
        </div>
      </div>

      {/* Profile Strength */}
      {profileStrength < 100 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Target className="w-5 h-5 mr-2 text-indigo-600" />
              Profile Strength
            </h2>
            <span className={`text-2xl font-bold ${getStrengthColor(profileStrength)}`}>
              {profileStrength}%
            </span>
          </div>

          <div className="mb-4">
            <Progress
              value={profileStrength}
              className="h-3"
            />
          </div>

          <div className="text-sm text-gray-600 mb-4">
            {profileStrength >= 80 && "Excellent! Your profile is very strong."}
            {profileStrength >= 60 && profileStrength < 80 && "Good profile! A few improvements can make it even better."}
            {profileStrength < 60 && "Your profile needs some work to stand out to employers."}
          </div>

          {suggestions.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Suggestions to improve:</h3>
              <div className="space-y-2">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{suggestion.text}</span>
                    <span className="text-green-600 font-medium">+{suggestion.boost}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Stats Overview</h2>
        <div className="grid grid-cols-1 gap-4">
          {statsList.map((stat, index) => (
            <div key={index} className={`${stat.bgColor} rounded-lg p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <stat.icon className={`w-8 h-8 ${stat.color} p-1.5 bg-white rounded-full shadow-sm`} />
                <div>
                  <div className="text-sm font-medium text-gray-700">{stat.label}</div>
                  <div className="text-xs text-gray-500 opacity-80">{stat.change}</div>
                </div>
              </div>
              <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileStats;
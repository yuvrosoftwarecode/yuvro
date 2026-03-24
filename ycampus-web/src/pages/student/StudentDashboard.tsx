import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/ui/card';
import studentDashboardService, {
  NotesProgressData,
  TestPerformanceData,
  TasksData,
  AssessmentsData,
  ContestsData,
} from '../../services/studentDashboardService';
import {
  BookOpen,
  Code,
  Trophy,
  BarChart3,
  Clock,
  Bell,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  TrendingUp,
  Target,
  Medal,
  ClipboardCheck,
  FileCheck,
  TrendingDown,
  Calendar,
  Award,
  Flame,
  Star,
  MedalIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const mockAttendance = { present: 85, absent: 15 };

const mockAnnouncements = [
  {
    id: 1,
    title: 'New Python Course Available',
    description: 'Advanced Python programming course is now live',
    time: '2 hours ago',
    tag: 'course',
  },
  {
    id: 2,
    title: 'Contest Registration Open',
    description: 'Register for the upcoming coding contest by March 15',
    time: '1 day ago',
    tag: 'system',
  },
];

const mockStreaks = {
  days: 12,
  currentBadge: 'Bronze',
  badgeProgress: { target: 'Silver', daysLeft: 3 },
  badges: ['Bronze'],
  recentAchievements: [
    { text: 'Completed 5 notes in a week', time: '2 days ago' },
    { text: 'Perfect score in Python test', time: '5 days ago' },
    { text: '10 day learning streak', time: '1 week ago' },
  ],
};

const mockPerformance = {
  learningProgress: 78,
  taskCompletion: 85,
  assessmentAverage: 82,
  contestParticipation: 70,
  attendanceRate: 85,
  overall: 80,
};

const getColorClass = (value: number) => {
  if (value >= 80) return 'text-green-600';
  if (value >= 60) return 'text-amber-500';
  return 'text-red-500';
};

// ─── Widget Components ─────────────────────────────────────────

const NotesProgress: React.FC<{ data: NotesProgressData }> = ({ data }) => (
  <Card className="h-full flex flex-col border border-gray-200 shadow-none transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Learning Progress</h3>
        </div>
        <div className="flex items-center gap-1 text-amber-500 text-sm font-medium">
          <Flame className="w-4 h-4" />
          {data.streak} day streak
        </div>
      </div>
    </CardHeader>

    <CardContent className="flex-grow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-800">Overall Progress</span>
        <span className={`text-sm font-semibold ${getColorClass(data.overall)}`}>{data.overall}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
        <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${data.overall}%` }} />
      </div>

      <div className="space-y-5">
        {data.subjects.map((s, i) => {
          const pct = s.total > 0 ? Math.round((s.progress / s.total) * 100) : 0;
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500 font-medium truncate pr-2">{s.name}</span>
                <span className="text-gray-500 whitespace-nowrap">{s.progress}/{s.total}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-orange-500 h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </CardContent>

    <CardFooter>
      <a href="/student/learn" className="text-gray-600 text-sm font-medium flex items-center gap-1 hover:text-blue-700">
        Click to view all progress and continue learning <ChevronRight className="w-4 h-4" />
      </a>
    </CardFooter>
  </Card>
);

const TestPerformance: React.FC<{ data: TestPerformanceData }> = ({ data }) => (
  <Card className="h-full flex flex-col border border-gray-200 shadow-none transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900">Test Performance</h3>
        </div>
        <Trophy className="w-5 h-5 text-gray-400" />
      </div>
    </CardHeader>

    <CardContent className="flex-grow">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-2xl font-semibold text-blue-600">{data.completed}</p>
          <p className="text-xs text-gray-500 mt-1">Completed</p>
        </div>
        <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
          <p className={`text-2xl font-semibold ${getColorClass(data.avgScore)}`}>{data.avgScore}%</p>
          <p className="text-xs text-gray-500 mt-1">Avg Score</p>
        </div>
        <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
          <p className={`text-2xl font-semibold ${getColorClass(data.accuracy)}`}>{data.accuracy}%</p>
          <p className="text-xs text-gray-500 mt-1">Accuracy</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Chapters Completed</span>
          <span className="font-medium">{data.chaptersCompleted}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Last Test Score</span>
          <span className={`inline-block bg-green-100 ${getColorClass(data.lastTestScore)} text-xs font-semibold px-2 py-0.5 rounded-full`}>{data.lastTestScore}%</span>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
          <BarChart3 className="w-4 h-4" />
          Leaderboard Comparison
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
            <p className={`text-lg font-semibold ${getColorClass(data.you)}`}>{data.leaderboard.you}%</p>
            <p className="text-xs text-gray-500">Your Average</p>
          </div>
          <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
            <p className={`text-lg font-semibold ${getColorClass(data.leaderboard.global)}`}>{data.leaderboard.global}%</p>
            <p className="text-xs text-gray-500">Global Average</p>
          </div>
        </div>
      </div>
    </CardContent>

    <CardFooter>
      <a href="/student/skill-test" className="text-gray-600 text-sm font-medium flex items-center gap-1 hover:text-purple-700">
        Click to attempt practice tests <ChevronRight className="w-4 h-4" />
      </a>
    </CardFooter>
  </Card>
);

const TasksSummary: React.FC<{ data: TasksData }> = ({ data }) => (
  <Card className="h-full flex flex-col border border-gray-200 shadow-none transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Tasks Summary</h3>
        </div>
      </div>
    </CardHeader>

    <CardContent className="flex-grow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">Overall Progress</span>
        <span className={`text-sm font-semibold ${getColorClass(data.overall)}`}>{data.overall}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-5">
        <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${data.overall}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-2xl font-semibold text-green-600">{data.completed}</p>
          <p className="text-xs text-gray-500 mt-1">Completed</p>
        </div>
        <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-2xl font-semibold text-amber-500">{data.inProgress}</p>
          <p className="text-xs text-gray-500 mt-1">In Progress</p>
        </div>
        <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-2xl font-semibold text-red-500">{data.pending}</p>
          <p className="text-xs text-gray-500 mt-1">Pending</p>
        </div>
        <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-2xl font-semibold text-gray-700">{data.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Tasks</p>
        </div>
      </div>
    </CardContent>

    <CardFooter>
      <a href="/student/code-practice" className="text-gray-600 text-sm font-medium flex items-center gap-1 hover:text-emerald-700">
        Click to view all tasks <ChevronRight className="w-4 h-4" />
      </a>
    </CardFooter>
  </Card>
);

const AssessmentsOverview: React.FC<{ data: AssessmentsData }> = ({ data }) => (
  <Card className="h-full flex flex-col border border-gray-200 shadow-none transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Assessments Overview</h3>
        </div>
        <span className="text-sm text-gray-500 font-semibold bg-gray-100 px-2 py-1 rounded-full">{data.completed} / {data.total}</span>
      </div>
    </CardHeader>

    <CardContent className="flex-grow">
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-2xl font-semibold text-green-600">{data.completed}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-2xl font-semibold text-amber-500">{data.inProgress}</p>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-2xl font-semibold text-red-500">{data.pending}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="space-y-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium text-base">Average Score</span>
            <span className={`font-semibold ${getColorClass(data.avgScore)} text-xl`}>{data.avgScore}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Highest Score</span>
            <span className={`font-medium ${getColorClass(data.highestScore)} flex items-center gap-1`}>
              <TrendingUp className="h-4 w-4" />
              {data.highestScore}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Lowest Score</span>
            <span className={`font-medium ${getColorClass(data.lowestScore)} flex items-center gap-1`}>
              <TrendingDown className="h-4 w-4" />
              {data.lowestScore}%
            </span>
          </div>
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Recent Status</span>
              <span className={`inline-block bg-green-100 ${getColorClass(data.recentStatus)} text-xs font-semibold px-2 py-0.5 rounded-full`}>
                Completed - {data.recentStatus}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>

    <CardFooter>
      <a href="/student/certifications" className="text-gray-600 text-sm font-medium flex items-center gap-1 hover:text-indigo-700">
        Click to view all assessments <ChevronRight className="w-4 h-4" />
      </a>
    </CardFooter>
  </Card>
);

const ContestPerformance: React.FC<{ data: ContestsData }> = ({ data }) => (
  <Card className="h-full flex flex-col border border-gray-200 shadow-none transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Contest Performance</h3>
        </div>
        <MedalIcon className="w-5 h-5 text-amber-400" />
      </div>
    </CardHeader>

    <CardContent className="flex-grow">
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-2xl font-semibold text-blue-600">{data.completed}</p>
          <p className="text-xs text-gray-500 mt-1">Completed</p>
        </div>
        <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-2xl font-semibold text-amber-600">#{data.bestRank}</p>
          <p className="text-xs text-gray-500 mt-1">Best Rank</p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Average Score</span>
            <span className={`inline-block ${getColorClass(data.avgScore)} text-xs font-semibold px-2 py-0.5 rounded-full`}>{data.avgScore}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Success Rate</span>
            <span className={`inline-block ${getColorClass(data.successRate)} text-xs font-semibold px-2 py-0.5 rounded-full`}>{data.successRate}%</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
          <Star className="w-4 h-4" />
          Last Contest Performance
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg py-2 px-1" style={{ backgroundColor: '#f3f4f6' }}>
            <p className="text-lg font-semibold text-gray-900">#{data.lastContest.rank}</p>
            <p className="text-xs text-gray-500">Rank</p>
          </div>
          <div className="rounded-lg py-2 px-1" style={{ backgroundColor: '#f3f4f6' }}>
            <p className={`text-lg font-semibold ${getColorClass(data.lastContest.accuracy)}`}>{data.lastContest.accuracy}%</p>
            <p className="text-xs text-gray-500">Accuracy</p>
          </div>
          <div className="rounded-lg py-2 px-1" style={{ backgroundColor: '#f3f4f6' }}>
            <p className="text-lg font-semibold text-gray-900">{data.lastContest.time}</p>
            <p className="text-xs text-gray-500">Time</p>
          </div>
        </div>
      </div>
    </CardContent>

    <CardFooter>
      <p className="text-xs text-gray-500 italic">Keep participating to improve your ranking!</p>
    </CardFooter>
  </Card>
);

const AttendanceOverview: React.FC = () => {
  const { present, absent } = mockAttendance;
  const data = [
    { name: 'Present', value: present, color: '#22c55e' },
    { name: 'Absent', value: absent, color: '#ef4444' },
  ];

  return (
    <Card className="h-full flex flex-col border border-gray-200 shadow-none transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Attendance Overview</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow flex flex-col items-center justify-center">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-3xl font-semibold text-gray-900">{present}%</span>
            <span className="text-xs text-gray-500 font-medium">Present</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
            <p className="text-2xl font-semibold text-green-600">{present}%</p>
            <p className="text-xs text-gray-500 mt-1">Present</p>
          </div>
          <div className="text-center rounded-lg py-3 px-2" style={{ backgroundColor: '#f3f4f6' }}>
            <p className="text-2xl font-semibold text-red-500">{absent}%</p>
            <p className="text-xs text-gray-500 mt-1">Absent</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-center border-t border-gray-200 pt-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Present</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">Absent</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

const Announcements: React.FC<{ announcements: any[]; count: number }> = ({ announcements, count }) => (
  <Card className="h-full flex flex-col border border-gray-200 shadow-none transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Announcements</h3>
        </div>
        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          {count} new
        </span>
      </div>
    </CardHeader>

    <CardContent className="flex-grow">
      <div
        className="space-y-3 max-h-80 pr-1"
        style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
      >
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Bell className="h-8 w-8 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No new announcements</p>
          </div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="border border-gray-200 border-l-4 border-l-orange-400 rounded-lg p-3 hover:bg-gray-50 transition-colors" style={{ backgroundColor: '#f3f4f6' }}>
              <p className="text-sm font-semibold text-gray-900 line-clamp-1">{a.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.content}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {a.expiry_date ? new Date(a.expiry_date).toLocaleDateString() : 'No expiry'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 ${a.level === 'college' ? 'text-blue-600' : 'text-purple-600'}`}>
                  {a.level === 'college' ? 'College' : 'Dept'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </CardContent>

    <CardFooter>
      <a href="/student/announcements" className="text-gray-600 text-sm font-medium flex items-center gap-1 hover:text-amber-700">
        View all announcements <ChevronRight className="w-4 h-4" />
      </a>
    </CardFooter>
  </Card>
);

const StreaksBadges: React.FC = () => {
  const badges = [
    { name: 'Bronze', earned: true, icon: '🥉' },
    { name: 'Silver', earned: false, icon: '🥈' },
    { name: 'Gold', earned: false, icon: '🥇' },
    { name: 'Platinum', earned: false, icon: '💎' },
  ];
  return (
    <Card className="h-full flex flex-col border border-gray-200 shadow-none transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Streaks & Badges</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow">
        {/* Streak count */}
        <div className="flex items-center justify-center gap-2 mb-4 rounded-lg py-4" style={{ backgroundColor: '#f3f4f6' }}>
          <Flame className="w-8 h-8 text-orange-500" />
          <span className="text-4xl font-semibold text-orange-600">{mockStreaks.days}</span>
          <span className="text-sm text-gray-500 self-end mb-1">Day Streak</span>
        </div>

        {/* Badge progress */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 font-medium">Progress to {mockStreaks.badgeProgress.target}</span>
            <span className="text-slate-500">{mockStreaks.badgeProgress.daysLeft} days left</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
            <div className="bg-orange-500 h-2 rounded-full" style={{ width: '70%' }} />
          </div>
        </div>

        {/* Badge icons */}
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Earned Badges</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {badges.map((badge) => (
              <div
                key={badge.name}
                className={`text-center p-2 rounded-lg border ${badge.earned
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
                  }`}
              >
                <span className="text-2xl block mb-1">{badge.icon}</span>
                <span className={`text-xs ${badge.earned ? 'text-amber-700 font-medium' : 'text-gray-400'}`}>
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent achievements */}
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-700">Recent Achievements</span>
        </div>
        <div className="space-y-2">
          {mockStreaks.recentAchievements.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-800">{a.text}</p>
                <p className="text-xs text-gray-400">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const PerformanceMetrics: React.FC = () => {
  const getColorClass = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  /* const getBgColorClass = (value: number) => {
    if (value >= 80) return 'bg-green-600';
    if (value >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  }; */

  const metrics = [
    { label: 'Learning Progress', value: mockPerformance.learningProgress },
    { label: 'Task Completion', value: mockPerformance.taskCompletion },
    { label: 'Assessment Average', value: mockPerformance.assessmentAverage },
    { label: 'Contest Participation', value: mockPerformance.contestParticipation },
    { label: 'Attendance Rate', value: mockPerformance.attendanceRate },
  ];

  return (
    <Card className="h-full flex flex-col border border-gray-200 shadow-none transition-shadow">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Performance Metrics</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow">
        <div className="space-y-6">
          {metrics.map((m, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-700">{m.label}</span>
                <span className={`font-semibold ${getColorClass(m.value)}`}>{m.value}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${m.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="justify-center border-t border-gray-200 pt-6">
        <div className="text-center w-full rounded-lg py-3" style={{ backgroundColor: '#f3f4f6' }}>
          <p className="text-4xl font-semibold text-green-600">{mockPerformance.overall}%</p>
          <p className="text-sm text-gray-500 mt-1">Overall Performance Score</p>
        </div>
      </CardFooter>
    </Card>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [notesData, setNotesData] = useState<NotesProgressData | null>(null);
  const [testsData, setTestsData] = useState<TestPerformanceData | null>(null);
  const [tasksData, setTasksData] = useState<TasksData | null>(null);
  const [assessmentsData, setAssessmentsData] = useState<AssessmentsData | null>(null);
  const [contestsData, setContestsData] = useState<ContestsData | null>(null);
  const [announcementsData, setAnnouncementsData] = useState<any[]>([]);
  const [announcementCount, setAnnouncementCount] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [notes, tests, tasks, assessments, contests, announcementsRes] = await Promise.all([
          studentDashboardService.getNotesProgress(),
          studentDashboardService.getTestPerformance(),
          studentDashboardService.getTasksSummary(),
          studentDashboardService.getAssessments(),
          studentDashboardService.getContests(),
          announcementService.getAnnouncements({ college: (user as any)?.college_id })
        ]);

        setNotesData(notes);
        setTestsData(tests);
        setTasksData(tasks);
        setAssessmentsData(assessments);
        setContestsData(contests);
        
        // Handle announcement visibility
        const deptId = (user as any)?.department_id;
        const results = (announcementsRes as any).results || (announcementsRes as any).data || (Array.isArray(announcementsRes) ? announcementsRes : []);
        const filtered = results.filter((ann: any) => {
          if (ann.level === 'college') return true;
          if (ann.level === 'department') return ann.department?.toString() === deptId?.toString();
          return false;
        });
        setAnnouncementsData(filtered.slice(0, 5));
        setAnnouncementCount(filtered.length);
      } catch (error) {
        console.warn('Dashboard data fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user]);

  if (loading || !notesData || !testsData || !tasksData || !assessmentsData || !contestsData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader title="Loading..." subtitle="Please wait while we load your dashboard." />
            <div className="p-6">
              <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <Card key={i} className="h-64 bg-gray-200 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title="Dashboard Overview"
            subtitle="Monitor your academic progress and performance metrics"
          />
          <div className="p-6 space-y-6">
            {/* Row 1: 3 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NotesProgress data={notesData} />
              <TestPerformance data={testsData} />
              <TasksSummary data={tasksData} />
            </div>

            {/* Row 2: 2 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AssessmentsOverview data={assessmentsData} />
              <ContestPerformance data={contestsData} />
            </div>

            {/* Row 3: 2 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AttendanceOverview />
              <Announcements announcements={announcementsData} count={announcementCount} />
            </div>

            {/* Row 4: 2 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StreaksBadges />
              <PerformanceMetrics />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

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
  MedalIcon,
  List
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
  recentAchievements: [
    { text: '7 Day Streak Reached', time: '5 days ago' },
    { text: 'Top 10% in Python Quiz', time: '1 week ago' },
  ],
};

const mockPerformance = {
  learningProgress: 75,
  taskCompletion: 80,
  assessmentAverage: 85,
  contestParticipation: 60,
  attendanceRate: 90,
  overall: 80,
};

// ─── Widget Components ─────────────────────────────────────────

const NotesProgress: React.FC<{ data: NotesProgressData }> = ({ data }) => (
  <Card className="h-full flex flex-col border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="p-4 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-green-500" />
          <h3 className="font-bold text-lg text-gray-900 leading-tight">Notes Progress</h3>
        </div>
        <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold">
          <TrendingUp className="w-4 h-4" />
          {data.streak} day streak
        </div>
      </div>
    </CardHeader>

    <CardContent className="p-4 pt-0 flex-grow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-900">Overall Completion</span>
        <span className="text-xs font-bold text-green-600">{data.overall}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div
          className="bg-gray-900 h-2 rounded-full transition-all duration-500"
          style={{ width: `${data.overall}%` }}
        />
      </div>

      <div className="space-y-4">
        {data.subjects.map((s, i) => {
          const pct = s.total > 0 ? Math.round((s.progress / s.total) * 100) : 0;
          return (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-500 font-medium truncate pr-2">{s.name}</span>
                <span className="text-gray-700 font-bold whitespace-nowrap">{s.progress}/{s.total}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CardContent>

    <CardFooter className="p-4 pt-3 border-t border-gray-100">
      <a href="/student/learn" className="text-gray-400 text-[10px] font-bold hover:text-green-600 transition-colors uppercase">
        Click to view all notes and continue learning
      </a>
    </CardFooter>
  </Card>
);

const TestPerformance: React.FC<{ data: TestPerformanceData }> = ({ data }) => (
  <Card className="h-full flex flex-col border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="p-4 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-lg text-gray-900 leading-tight">Test Performance</h3>
        </div>
        <Trophy className="w-4 h-4 text-gray-300" />
      </div>
    </CardHeader>

    <CardContent className="p-4 pt-0 flex-grow">
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center rounded-lg py-3 border border-gray-100 bg-white">
          <p className="text-lg font-bold text-green-500">{data.completed}</p>
          <p className="text-[9px] uppercase font-bold text-gray-400">Completed</p>
        </div>
        <div className="text-center rounded-lg py-3 border border-gray-100 bg-white">
          <p className="text-lg font-bold text-amber-500">{data.avgScore}%</p>
          <p className="text-[9px] uppercase font-bold text-gray-400">Avg Score</p>
        </div>
        <div className="text-center rounded-lg py-3 border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100 flex flex-col justify-center">
          <p className="text-xl font-black text-gray-900 leading-none">{data.accuracy}%</p>
          <p className="text-[9px] uppercase font-bold text-gray-400">Accuracy</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-500 font-bold uppercase">Chapters Completed</span>
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{data.chaptersCompleted}</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-500 font-bold uppercase">Last Test Score</span>
          <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{data.lastTestScore}%</span>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-900 mb-2 uppercase">
          <BarChart3 className="w-3 h-3 text-gray-400" />
          Leaderboard Comparison
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-amber-50 rounded-xl p-2 border border-amber-100">
            <p className="text-lg font-bold text-amber-600 text-center">{data.leaderboard.you}%</p>
            <p className="text-[8px] text-amber-700/70 font-bold text-center uppercase">Your Average</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 border border-gray-100">
            <p className="text-lg font-bold text-gray-900 text-center">{data.leaderboard.global}%</p>
            <p className="text-[8px] text-gray-400 font-bold text-center uppercase">Global Average</p>
          </div>
        </div>
      </div>
    </CardContent>

    <CardFooter className="p-4 pt-3 border-t border-gray-100">
      <a href="/student/skill-test" className="text-gray-400 text-[10px] font-bold hover:text-amber-600 transition-colors uppercase">
        Click to attempt practice tests
      </a>
    </CardFooter>
  </Card>
);

const TasksSummary: React.FC<{ data: TasksData }> = ({ data }) => (
  <Card className="h-full flex flex-col border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="p-4 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-500" />
          <h3 className="font-bold text-lg text-gray-900 leading-tight">Tasks Summary</h3>
        </div>
      </div>
    </CardHeader>

    <CardContent className="p-4 pt-0 flex-grow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-900">Overall Progress</span>
        <span className="text-xs font-bold text-green-600">{data.overall}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div
          className="bg-gray-900 h-2 rounded-full transition-all duration-500"
          style={{ width: `${data.overall}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50/50 border border-gray-50">
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{data.completed}</p>
            <p className="text-[8px] uppercase font-bold text-gray-400">Completed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50/50 border border-gray-50">
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{data.inProgress}</p>
            <p className="text-[8px] uppercase font-bold text-gray-400">In Progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50/50 border border-gray-50">
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{data.pending}</p>
            <p className="text-[8px] uppercase font-bold text-gray-400">Pending</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50/50 border border-gray-50">
          <div className="p-1.5 bg-white rounded-lg shadow-sm">
            <BarChart3 className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{data.total}</p>
            <p className="text-[8px] uppercase font-bold text-gray-400">Total Tasks</p>
          </div>
        </div>
      </div>
    </CardContent>

    <CardFooter className="p-4 pt-3 border-t border-gray-100">
      <a href="/student/code-practice" className="text-gray-400 text-[10px] font-bold hover:text-emerald-600 transition-colors uppercase">
        Click to view all tasks and submissions
      </a>
    </CardFooter>
  </Card>
);

const AssessmentsOverview: React.FC<{ data: AssessmentsData }> = ({ data }: { data: AssessmentsData }) => (
  <Card className="h-full flex flex-col border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="p-4 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-lg text-gray-900 leading-tight">Assessments Overview</h3>
        </div>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{data.completed}/{data.total}</span>
      </div>
    </CardHeader>

    <CardContent className="p-4 pt-0 flex-grow">
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center rounded-lg py-3 border border-gray-100 bg-white">
          <p className="text-lg font-bold text-green-500">{data.completed}</p>
          <p className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">Completed</p>
        </div>
        <div className="text-center rounded-lg py-3 border border-gray-100 bg-white">
          <p className="text-lg font-bold text-amber-500">{data.inProgress}</p>
          <p className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">In Progress</p>
        </div>
        <div className="text-center rounded-lg py-3 border border-gray-100 bg-white">
          <p className="text-lg font-bold text-red-500">{data.pending}</p>
          <p className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">Pending</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-bold uppercase">Average Score</span>
          <span className="text-green-600 font-bold">{data.avgScore}%</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-bold uppercase">Highest Score</span>
          <span className="text-green-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {data.highestScore}%
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-bold uppercase">Lowest Score</span>
          <span className="text-amber-500 font-bold flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> {data.lowestScore}%
          </span>
        </div>
        <div className="pt-3 border-t border-gray-50 flex justify-between items-center text-xs">
          <span className="text-gray-500 font-bold uppercase">Recent Status</span>
          <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{data.recentStatus}%</span>
        </div>
      </div>
    </CardContent>

    <CardFooter className="p-4 pt-3 border-t border-gray-100">
      <a href="/student/certifications" className="text-gray-400 text-[10px] font-bold hover:text-indigo-600 transition-colors uppercase">
        Click to view all assessments
      </a>
    </CardFooter>
  </Card>
);

const ContestPerformance: React.FC<{ data: ContestsData }> = ({ data }: { data: ContestsData }) => (
  <Card className="h-full flex flex-col border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="p-4 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-lg text-gray-900 leading-tight">Contest Performance</h3>
        </div>
        <Award className="w-5 h-5 text-amber-400" />
      </div>
    </CardHeader>

    <CardContent className="p-4 pt-0 flex-grow">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center rounded-lg py-3 border border-gray-100 bg-white">
          <p className="text-xl font-bold text-green-500">{data.completed}</p>
          <p className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">Completed</p>
        </div>
        <div className="text-center rounded-lg py-3 border border-gray-100 bg-white">
          <p className="text-xl font-bold text-amber-600">#{data.bestRank}</p>
          <p className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">Best Rank</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-bold uppercase">Average Score</span>
          <span className="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{data.avgScore}%</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-bold uppercase">Success Rate</span>
          <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{data.successRate}%</span>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-900 mb-2 uppercase">
          <Flame className="w-3 h-3 text-orange-400" />
          Last Contest Performance
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">#{data.lastContest.rank}</p>
            <p className="text-[9px] uppercase font-bold text-gray-400">Rank</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{data.lastContest.accuracy}%</p>
            <p className="text-[9px] uppercase font-bold text-gray-400">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{data.lastContest.time}</p>
            <p className="text-[9px] uppercase font-bold text-gray-400">Time</p>
          </div>
        </div>
      </div>
    </CardContent>

    <CardFooter className="p-4 pt-3 border-t border-gray-100">
      <p className="text-gray-400 text-[10px] font-bold uppercase">Keep participating to improve your ranking!</p>
    </CardFooter>
  </Card>
);

const AttendanceOverview: React.FC = () => {
  const { present, absent } = mockAttendance;
  const data = [
    { name: 'Present', value: present, color: '#22c55e' },
    { name: 'Absent', value: absent, color: '#eab308' },
  ];

  return (
    <Card className="h-full flex flex-col border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            <h3 className="font-bold text-lg text-gray-900 leading-tight">Attendance Overview</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-grow flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 mb-4">
          <div className="absolute top-2 left-[-30px] text-[9px] font-bold text-green-500">Present: {present}%</div>
          <div className="absolute bottom-8 right-[-30px] text-[9px] font-bold text-amber-500">Absent: {absent}%</div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
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
        </div>

        <div className="grid grid-cols-3 gap-0 w-full border-t border-gray-100 mt-auto pt-4">
          <div className="text-center border-r border-gray-100 px-1">
            <p className="text-xl font-bold text-gray-900">100</p>
            <p className="text-[9px] uppercase font-bold text-gray-400">Total Days</p>
          </div>
          <div className="text-center border-r border-gray-100 px-1">
            <p className="text-xl font-bold text-green-500">{present}</p>
            <p className="text-[9px] uppercase font-bold text-gray-400">Present</p>
          </div>
          <div className="text-center px-1">
            <p className="text-xl font-bold text-amber-500">{absent}</p>
            <p className="text-[9px] uppercase font-bold text-gray-400">Absent</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Announcements: React.FC = () => (
  <Card className="h-full flex flex-col border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="p-4 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-lg text-gray-900 leading-tight">Announcements</h3>
        </div>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {mockAnnouncements.length} new
        </span>
      </div>
    </CardHeader>

    <CardContent className="p-4 pt-0 flex-grow">
      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
        {mockAnnouncements.map((a) => (
          <div key={a.id} className="relative border border-gray-100 rounded-lg p-3 bg-white shadow-sm overflow-hidden group hover:border-amber-100 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
            <div className="flex justify-between items-start mb-1">
              <p className="text-xs font-bold text-gray-900 pr-6">{a.title}</p>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />
            </div>
            <p className="text-[10px] text-gray-500 leading-tight mb-2 line-clamp-2 uppercase font-bold">{a.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1 uppercase">
                <Clock className="h-2.5 w-2.5" />
                {a.time}
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 font-bold border border-gray-100 uppercase">{a.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </CardContent>

    <CardFooter className="p-4 pt-3 border-t border-gray-100">
      <a href="/student/announcements" className="text-gray-400 text-[10px] font-bold hover:text-amber-600 transition-colors uppercase">
        View all announcements
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
    <Card className="h-full flex flex-col border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-lg text-gray-900 leading-tight">Streaks & Badges</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-grow">
        <div className="flex flex-col items-center justify-center py-4 mb-4">
          <Flame className="w-10 h-10 text-amber-500 mb-2" />
          <span className="text-4xl font-black text-amber-500 leading-none">{mockStreaks.days}</span>
          <span className="text-[9px] uppercase font-bold text-gray-400 mt-1">Day Streak</span>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-4">
          <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
            <span className="text-gray-400 uppercase">Progress to {mockStreaks.badgeProgress.target}</span>
            <span className="text-gray-900">{mockStreaks.badgeProgress.daysLeft} days left</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-gray-900 h-2 rounded-full" style={{ width: '70%' }} />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] font-bold text-gray-900 uppercase">Earned Badges</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {badges.map((badge) => (
              <div
                key={badge.name}
                className={`text-center py-2 rounded-xl border ${badge.earned
                  ? 'bg-amber-50/50 border-amber-100 shadow-sm ring-1 ring-amber-100'
                  : 'bg-white border-gray-100'
                  }`}
              >
                <span className="text-xl block mb-0.5">{badge.icon}</span>
                <p className={`text-[8px] font-bold uppercase ${badge.earned ? 'text-gray-900' : 'text-gray-300'}`}>
                  {badge.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-gray-900 uppercase">Recent Achievements</span>
          </div>
          <div className="space-y-3">
            {mockStreaks.recentAchievements.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="mt-0.5">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">{a.text}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PerformanceMetrics: React.FC = () => {
  const metrics = [
    { label: 'Learning Progress', value: mockPerformance.learningProgress },
    { label: 'Task Completion', value: mockPerformance.taskCompletion },
    { label: 'Assessment Average', value: mockPerformance.assessmentAverage },
    { label: 'Contest Participation', value: mockPerformance.contestParticipation },
    { label: 'Attendance Rate', value: mockPerformance.attendanceRate },
  ];

  return (
    <Card className="h-full flex flex-col border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            <h3 className="font-bold text-lg text-gray-900 leading-tight">Performance Metrics Summary</h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-grow">
        <div className="space-y-5">
          {metrics.map((m, i) => (
            <div key={i}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-gray-900">{m.label}</span>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{m.value}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-gray-900 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          ))}
          <div className="pt-4 mt-6 flex flex-col items-center justify-center">
            <div className="bg-green-50 rounded-2xl py-4 px-10 border border-green-100 shadow-sm inline-block">
              <p className="text-3xl font-black text-green-600 mb-0.5">{mockPerformance.overall}%</p>
              <p className="text-[9px] uppercase font-bold text-green-700/60">Overall Performance Score</p>
            </div>
          </div>
        </div>
      </CardContent>
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

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [notes, tests, tasks, assessments, contests] = await Promise.all([
          studentDashboardService.getNotesProgress(),
          studentDashboardService.getTestPerformance(),
          studentDashboardService.getTasksSummary(),
          studentDashboardService.getAssessments(),
          studentDashboardService.getContests(),
        ]);

        setNotesData(notes);
        setTestsData(tests);
        setTasksData(tasks);
        setAssessmentsData(assessments);
        setContestsData(contests);
      } catch (error) {
        console.warn('Dashboard data fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

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
              <Announcements />
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

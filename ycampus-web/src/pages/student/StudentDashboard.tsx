import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import studentDashboardService, {
  NotesProgressData,
  TestPerformanceData,
  TasksData,
  AssessmentsData,
  ContestsData,
} from '../../services/studentDashboardService';
import {
  BookOpen,
  Trophy,
  BarChart3,
  Clock,
  Bell,
  CheckCircle2,
  AlertCircle,
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
  ListTodo,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const mockAttendance = { present: 85, absent: 15 };

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

const mockAnnouncements = [
  {
    id: 1,
    title: 'New Python Course Available',
    type: 'course',
    description: 'Advanced Python programming course is now live',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: 2,
    title: 'Contest Registration Open',
    type: 'event',
    description: 'Register for the upcoming coding contest by March 15',
    timestamp: '5 hours ago',
    read: false,
  },
  {
    id: 3,
    title: 'System Maintenance Notice',
    type: 'system',
    description: 'Platform will be under maintenance on Sunday',
    timestamp: '1 day ago',
    read: true,
  },
  {
    id: 4,
    title: 'Assignment Deadline Reminder',
    type: 'reminder',
    description: 'Data Structures assignment due in 3 days',
    timestamp: '1 day ago',
    read: true,
  },
];

const cardClass = 'h-full cursor-pointer border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg';

const badgeBase =
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium';

const NotesProgress: React.FC<{ data: NotesProgressData }> = ({ data }: { data: NotesProgressData }) => {
  const subjects = data.subjects || [];
  const streak = data.streak || 0;
  const overall = data.overall || 0;

  return (
    <Card
      className={cardClass}
      onClick={() => (window.location.href = '/student/learn')}
    >
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
            <BookOpen className="h-6 w-6" style={{ color: '#22C55E' }} />
            Notes Progress
          </h3>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4" style={{ color: '#FF9933' }} />
            <span className="font-semibold">{streak} day streak</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Completion</span>
            <span className="font-bold" style={{ color: '#22C55E' }}>
              {overall}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${overall}%`,
                backgroundColor: '#0F172A',
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {subjects.map((topic: { name: string; progress: number; total: number }, index: number) => {
            const pct = topic.total > 0 ? Math.round((topic.progress / topic.total) * 100) : 0;
            return (
              <div key={index} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-sm" style={{ color: '#64748B' }}>{topic.name}</span>
                  <span className="text-xs font-semibold" style={{ color: '#000000' }}>
                    {topic.progress}/{topic.total}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: '#0F172A',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-xs" style={{ color: '#64748B' }}>
          Click to view all notes and continue learning
        </div>
      </CardContent>
    </Card>
  );
};

const TestPerformance: React.FC<{ data: TestPerformanceData }> = ({ data }: { data: TestPerformanceData }) => (
  <Card
    className={cardClass}
    onClick={() => (window.location.href = '/student/skill-test')}
  >
    <CardHeader className="space-y-0 pb-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
          <ClipboardCheck className="h-6 w-6" style={{ color: '#F59E0B' }} />
          Test Performance
        </h3>
        <Trophy className="h-5 w-5" style={{ color: '#64748B' }} />
      </div>
    </CardHeader>

    <CardContent className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center">
          <div className="text-2xl font-bold" style={{ color: '#22C55E' }}>
            {data.completed}
          </div>
          <div className="mt-1 text-xs" style={{ color: '#64748B' }}>Completed</div>
        </div>

        <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center">
          <div className="text-2xl font-bold" style={{ color: '#F59E0B' }}>
            {data.avgScore}%
          </div>
          <div className="mt-1 text-xs" style={{ color: '#64748B' }}>Avg Score</div>
        </div>

        <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center">
          <div className="text-2xl font-bold text-[#0F172A]">{data.accuracy}%</div>
          <div className="mt-1 text-xs" style={{ color: '#64748B' }}>Accuracy</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: '#64748B' }}>Chapters Completed</span>
          <span className={`${badgeBase} w-12 justify-center border-transparent bg-slate-100 text-[#0F172A]`}>
            {data.chaptersCompleted}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: '#64748B' }}>Last Test Score</span>
          <span
            className={`${badgeBase} w-12 justify-center`}
            style={{
              backgroundColor: '#22C55E20',
              color: '#22C55E',
              borderColor: 'transparent',
            }}
          >
            {data.lastTestScore}%
          </span>
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-300 pt-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" style={{ color: '#94A3B8' }} />
          <span className="text-sm font-semibold text-[#0F172A]">Leaderboard Comparison</span>
        </div>
        <div className="grid grid-cols-2 gap-3 pb-3">
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#F59E0B' }}>
              82%
            </div>
            <div className="text-xs" style={{ color: '#64748B' }}>Your Average</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#0F172A]">76%</div>
            <div className="text-xs" style={{ color: '#64748B' }}>Global Average</div>
          </div>
        </div>
      </div>

      <div className="text-xs" style={{ color: '#64748B' }}>
        Click to attempt practice tests
      </div>
    </CardContent>
  </Card>
);

const TasksSummary: React.FC<{ data: TasksData }> = ({ data }: { data: TasksData }) => {
  return (
    <Card
      className={cardClass}
      onClick={() => (window.location.href = '/student/task')}
    >
      <CardHeader className="space-y-0 pb-3">
        <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
          <ListTodo className="h-6 w-6" style={{ color: '#22C55E' }} />
          Tasks Summary
        </h3>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[#0F172A]">Overall Progress</span>
            <span className="font-bold" style={{ color: '#22C55E' }}>{data.overall}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{ width: `${data.overall}%`, backgroundColor: '#0F172A' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg bg-[#F1F5F980] p-2.5 border border-transparent">
            <CheckCircle2 className="h-6 w-6" style={{ color: '#22C55E' }} />
            <div>
              <div className="text-2xl font-bold text-[#0F172A] leading-tight">{data.completed}</div>
              <div className="text-xs text-[#64748B]">Completed</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-[#F1F5F980] p-2.5 border border-transparent">
            <Clock className="h-6 w-6" style={{ color: '#F59E0B' }} />
            <div>
              <div className="text-2xl font-bold text-[#0F172A] leading-tight">{data.inProgress}</div>
              <div className="text-xs text-[#64748B]">In Progress</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-[#F1F5F980] p-2.5 border border-transparent">
            <AlertCircle className="h-6 w-6" style={{ color: '#ef4444' }} />
            <div>
              <div className="text-2xl font-bold text-[#0F172A] leading-tight">{data.pending}</div>
              <div className="text-xs text-[#64748B]">Pending</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-[#F1F5F980] p-2.5 border border-transparent">
            <ListTodo className="h-6 w-6" style={{ color: '#0F172A' }} />
            <div>
              <div className="text-2xl font-bold text-[#0F172A] leading-tight">{data.total}</div>
              <div className="text-xs text-[#64748B]">Total Tasks</div>
            </div>
          </div>
        </div>

        <div className="text-xs" style={{ color: '#64748B' }}>
          Click to view all tasks and submissions
        </div>
      </CardContent>
    </Card>
  );
};

const AssessmentsOverview: React.FC<{ data: AssessmentsData }> = ({ data }: { data: AssessmentsData }) => (
  <Card
    className={cardClass}
    onClick={() => (window.location.href = '/student/assessment')}
  >
    <CardHeader className="space-y-0 pb-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <FileCheck className="h-5 w-5" style={{ color: '#FF9933' }} />
          Assessments Overview
        </h3>
        <span className={`${badgeBase} border-border bg-background`}>
          {data.completed}/{data.total}
        </span>
      </div>
    </CardHeader>

    <CardContent className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-50/50 p-2.5 text-center">
          <div className="text-xl font-bold" style={{ color: 'hsl(var(--success))' }}>
            {data.completed}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Completed</div>
        </div>
        <div className="rounded-lg bg-slate-50/50 p-2.5 text-center">
          <div className="text-xl font-bold" style={{ color: 'hsl(var(--saffron))' }}>
            {data.inProgress}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">In Progress</div>
        </div>
        <div className="rounded-lg bg-slate-50/50 p-2.5 text-center">
          <div className="text-xl font-bold text-destructive">{data.pending}</div>
          <div className="mt-1 text-xs text-muted-foreground">Pending</div>
        </div>
      </div>

      <div className="space-y-3 border-t pt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Average Score</span>
          <span className="text-lg font-bold" style={{ color: 'hsl(var(--success))' }}>
            {data.avgScore}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Highest Score</span>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" style={{ color: '#22c55e' }} />
            <span className="font-semibold" style={{ color: 'hsl(var(--success))' }}>
              {data.highestScore}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Lowest Score</span>
          <div className="flex items-center gap-1">
            <TrendingDown className="h-4 w-4" style={{ color: '#FF9933' }} />
            <span className="font-semibold" style={{ color: 'hsl(var(--saffron))' }}>
              {data.lowestScore}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-sm text-muted-foreground">Recent Status</span>
          <span
            className={badgeBase}
            style={{
              backgroundColor: 'hsl(var(--success) / 0.15)',
              color: 'hsl(var(--success))',
              borderColor: 'hsl(var(--success) / 0.3)',
            }}
          >
            Completed - {data.recentStatus}%
          </span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Click to view all assessments
      </div>
    </CardContent>
  </Card>
);

const ContestPerformance: React.FC<{ data: ContestsData }> = ({ data }: { data: ContestsData }) => (
  <Card className="h-full border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg">
    <CardHeader className="space-y-0 pb-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Trophy className="h-5 w-5" style={{ color: '#FF9933' }} />
          Contest Performance
        </h3>
        <Medal className="h-5 w-5" style={{ color: '#FF9933' }} />
      </div>
    </CardHeader>

    <CardContent className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50/50 p-2.5 text-center">
          <div className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
            {data.completed}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Completed</div>
        </div>
        <div className="rounded-lg bg-slate-50/50 p-2.5 text-center">
          <div className="text-2xl font-bold" style={{ color: 'hsl(var(--saffron))' }}>
            #{data.bestRank}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Best Rank</div>
        </div>
      </div>

      <div className="space-y-2 border-t pt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Average Score</span>
          <span
            className={badgeBase}
            style={{
              backgroundColor: 'hsl(var(--saffron) / 0.15)',
              color: 'hsl(var(--saffron))',
              borderColor: 'hsl(var(--saffron) / 0.3)',
            }}
          >
            {data.avgScore}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Success Rate</span>
          <span
            className={badgeBase}
            style={{
              backgroundColor: 'hsl(var(--success) / 0.15)',
              color: 'hsl(var(--success))',
              borderColor: 'hsl(var(--success) / 0.3)',
            }}
          >
            {data.successRate}%
          </span>
        </div>
      </div>

      <div className="border-t pt-2">
        <div className="mb-3 flex items-center gap-2">
          <Flame className="h-4 w-4" style={{ color: '#FF9933' }} />
          <span className="text-sm font-medium">Last Contest Performance</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded bg-muted/30 p-2 text-center">
            <div className="font-bold text-foreground">#{data.lastContest.rank}</div>
            <div className="text-xs text-muted-foreground">Rank</div>
          </div>
          <div className="rounded bg-muted/30 p-2 text-center">
            <div className="font-bold" style={{ color: 'hsl(var(--success))' }}>
              {data.lastContest.accuracy}%
            </div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
          <div className="rounded bg-muted/30 p-2 text-center">
            <div className="font-bold text-foreground">{data.lastContest.time}</div>
            <div className="text-xs text-muted-foreground">Time</div>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Keep participating to improve your ranking!
      </div>
    </CardContent>
  </Card>
);

const AttendanceOverview: React.FC = () => {
  const { present, absent } = mockAttendance;
  const attendanceData = [
    { name: 'Present', value: present, fill: 'hsl(var(--success))' },
    { name: 'Absent', value: absent, fill: 'hsl(var(--saffron))' },
  ];

  return (
    <Card className="h-full border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-0 pb-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Calendar className="h-5 w-5" style={{ color: '#22c55e' }} />
          Attendance Overview
        </h3>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={attendanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, x, y, fill }: { name: string; value: number; x: number; y: number; fill: string }) => (
                  <text
                    x={x}
                    y={y}
                    fill={fill}
                    textAnchor={x > 200 ? 'start' : 'end'}
                    dominantBaseline="central"
                    className="text-[10px] font-bold"
                  >
                    {`${name}: ${value}%`}
                  </text>
                )}
                outerRadius={60}
                dataKey="value"
              >
                {attendanceData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">100</div>
            <div className="mt-1 text-xs text-muted-foreground">Total Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
              {present}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: 'hsl(var(--saffron))' }}>
              {absent}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Absent</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Announcements: React.FC = () => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course':
        return 'hsl(var(--success))';
      case 'event':
        return 'hsl(var(--saffron))';
      case 'system':
        return 'hsl(var(--muted-foreground))';
      case 'reminder':
        return 'hsl(var(--primary))';
      default:
        return 'hsl(var(--foreground))';
    }
  };

  return (
    <Card className="h-full border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Bell className="h-5 w-5" style={{ color: '#FF9933' }} />
            Announcements
          </h3>
          <span className={`${badgeBase} bg-secondary text-secondary-foreground`}>
            {mockAnnouncements.filter((a) => !a.read).length} new
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="max-h-[300px] space-y-3 overflow-y-auto pr-1">
          {mockAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className={`cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                !announcement.read ? 'bg-muted/30 border-l-4' : 'border-l-4'
              }`}
              style={{ borderLeftColor: getTypeColor(announcement.type) }}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold">{announcement.title}</h4>
                {!announcement.read && (
                  <div
                    className="mt-1 h-2 w-2 rounded-full"
                    style={{ backgroundColor: 'hsl(var(--saffron))' }}
                  />
                )}
              </div>

              <p className="mb-2 text-xs text-muted-foreground">
                {announcement.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {announcement.timestamp}
                </span>
                <span
                  className={badgeBase}
                  style={{
                    color: getTypeColor(announcement.type),
                    borderColor: `${getTypeColor(announcement.type)}30`,
                  }}
                >
                  {announcement.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const StreaksBadges: React.FC = () => {
  const badges = [
    { name: 'Bronze', earned: true, icon: '🥉' },
    { name: 'Silver', earned: false, icon: '🥈' },
    { name: 'Gold', earned: false, icon: '🥇' },
    { name: 'Platinum', earned: false, icon: '💎' },
  ];

  return (
    <Card className="h-full border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-0 pb-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Flame className="h-5 w-5" style={{ color: '#FF9933' }} />
          Streaks & Badges
        </h3>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 p-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Flame className="h-8 w-8" style={{ color: '#FF9933' }} />
            <span className="text-4xl font-bold" style={{ color: 'hsl(var(--saffron))' }}>
              {mockStreaks.days}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Day Streak</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Progress to {mockStreaks.badgeProgress.target}
            </span>
            <span className="font-semibold">{mockStreaks.badgeProgress.daysLeft} days left</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full"
              style={{ width: '70%', backgroundColor: '#0F172A' }}
            />
          </div>
        </div>

        <div className="border-t pt-2">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4" style={{ color: '#22c55e' }} />
            <span className="text-sm font-medium">Earned Badges</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {badges.map((badge) => (
              <div
                key={badge.name}
                className={`rounded-lg border p-3 text-center transition-all ${
                  badge.earned
                    ? 'border-primary/30 bg-muted/50'
                    : 'border-muted bg-muted/20 opacity-50'
                }`}
              >
                <div className="mb-1 text-2xl">{badge.icon}</div>
                <div className="text-xs font-medium">{badge.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-2">
          <div className="mb-3 flex items-center gap-2">
            <Star className="h-4 w-4" style={{ color: '#FF9933' }} />
            <span className="text-sm font-medium">Recent Achievements</span>
          </div>

          <div className="space-y-2">
            {mockStreaks.recentAchievements.map((achievement, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#22c55e' }} />
                <div className="flex-1">
                  <p className="text-foreground">{achievement.text}</p>
                  <p className="text-xs text-muted-foreground">{achievement.time}</p>
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
    { label: 'Learning Progress', value: mockPerformance.learningProgress, color: 'hsl(var(--success))' },
    { label: 'Task Completion', value: mockPerformance.taskCompletion, color: 'hsl(var(--success))' },
    { label: 'Assessment Average', value: mockPerformance.assessmentAverage, color: 'hsl(var(--success))' },
    { label: 'Contest Participation', value: mockPerformance.contestParticipation, color: 'hsl(var(--success))' },
    { label: 'Attendance Rate', value: mockPerformance.attendanceRate, color: 'hsl(var(--success))' },
  ];

  return (
    <Card className="h-full border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-0 pb-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BarChart3 className="h-5 w-5" style={{ color: '#22c55e' }} />
          Performance Metrics Summary
        </h3>
      </CardHeader>

      <CardContent className="space-y-3">
        {metrics.map((metric, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{metric.label}</span>
              <span className="text-sm font-bold" style={{ color: metric.color }}>
                {metric.value}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${metric.value}%`, backgroundColor: '#0F172A' }}
              />
            </div>
          </div>
        ))}

        <div className="mt-4 border-t pt-4">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
              {mockPerformance.overall}%
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Overall Performance Score</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

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
      <div className="min-h-screen bg-background">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
              title="Loading..."
              subtitle="Please wait while we load your dashboard."
            />
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(9)].map((_, i) => (
                  <Card key={i} className="h-64 animate-pulse border-border bg-muted/40" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title="Dashboard Overview"
            subtitle="Monitor your academic progress and performance metrics"
          />

          <div className="space-y-6 p-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <NotesProgress data={notesData} />
              <TestPerformance data={testsData} />
              <TasksSummary data={tasksData} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AssessmentsOverview data={assessmentsData} />
              <ContestPerformance data={contestsData} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AttendanceOverview />
              <Announcements />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
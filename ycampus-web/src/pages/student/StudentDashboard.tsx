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
import announcementService from '../../services/announcementService';
import {
  BookOpen,
  Trophy,
  BarChart3,
  Clock,
  Bell,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Medal,
  ClipboardCheck,
  FileCheck,
  Calendar,
  Award,
  Flame,
  Zap,
  Star,
  ListTodo,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const mockAttendance = { present: 85, absent: 15 };

const mockPerformance = {
  learningProgress: 75,
  taskCompletion: 80,
  assessmentAverage: 85,
  contestParticipation: 60,
  attendanceRate: 90,
  overall: 80,
};

type AnnouncementItem = {
  id: number | string;
  title: string;
  content?: string;
  description?: string;
  expiry_date?: string;
  timestamp?: string;
  type?: string;
  level?: string;
  read?: boolean;
};

const cardClass =
  'h-full cursor-pointer border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg';

const badgeBase =
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium';

const NotesProgress: React.FC<{ data: NotesProgressData }> = ({ data }) => {
  return (
    <Card
      className={cardClass}
      onClick={() => (window.location.href = '/student/learn')}
    >
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
            <BookOpen className="h-6 w-6" style={{ color: '#16A249' }} />
            Notes Progress
          </h3>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4" style={{ color: '#E7B008' }} />
            <span className="font-semibold">{data.streak} day streak</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Completion</span>
            <span className="font-bold" style={{ color: '#16A249' }}>
              {data.overall}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${data.overall}%`,
                backgroundColor: '#0F172A',
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {data.subjects.map((topic, index) => {
            const pct =
              topic.total > 0 ? Math.round((topic.progress / topic.total) * 100) : 0;

            return (
              <div key={index} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-sm" style={{ color: '#64748B' }}>
                    {topic.name}
                  </span>
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

const TestPerformance: React.FC<{ data: TestPerformanceData }> = ({ data }) => {
  return (
    <Card
      className={cardClass}
      onClick={() => (window.location.href = '/student/skill-test')}
    >
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
            <ClipboardCheck className="h-6 w-6" style={{ color: '#E7B008' }} />
            Test Performance
          </h3>
          <Trophy className="h-5 w-5" style={{ color: '#64748B' }} />
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-lg bg-[#F1F5F980] p-2 text-center">
            <div className="text-xl font-bold" style={{ color: '#16A249' }}>
              {data.completed}
            </div>
            <div className="mt-0.5 text-[10px]" style={{ color: '#64748B' }}>
              Completed
            </div>
          </div>

          <div className="rounded-lg bg-[#F1F5F980] p-2 text-center">
            <div className="text-xl font-bold" style={{ color: '#E7B008' }}>
              {data.avgScore}%
            </div>
            <div className="mt-0.5 text-[10px]" style={{ color: '#64748B' }}>
              Avg Score
            </div>
          </div>

          <div className="rounded-lg bg-[#F1F5F980] p-2 text-center">
            <div className="text-xl font-bold text-[#0F172A]">{data.accuracy}%</div>
            <div className="mt-0.5 text-[10px]" style={{ color: '#64748B' }}>
              Accuracy
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#64748B' }}>
              Chapters Completed
            </span>
            <span
              className={`${badgeBase} w-10 justify-center border-transparent bg-slate-100 text-[#0F172A]`}
            >
              {data.chaptersCompleted}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#64748B' }}>
              Last Test Score
            </span>
            <span
              className={`${badgeBase} w-10 justify-center`}
              style={{
                backgroundColor: '#16A24933',
                color: '#16A249',
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
            <span className="text-sm font-semibold text-[#0F172A]">
              Leaderboard Comparison
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-3">
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: '#E7B008' }}>
                {data.leaderboard.you}%
              </div>
              <div className="text-xs" style={{ color: '#64748B' }}>
                Your Average
              </div>
            </div>

            <div className="text-center">
              <div className="text-lg font-bold text-[#0F172A]">
                {data.leaderboard.global}%
              </div>
              <div className="text-xs" style={{ color: '#64748B' }}>
                Global Average
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs" style={{ color: '#64748B' }}>
          Click to attempt practice tests
        </div>
      </CardContent>
    </Card>
  );
};

const TasksSummary: React.FC<{ data: TasksData }> = ({ data }) => {
  return (
    <Card
      className={cardClass}
      onClick={() => (window.location.href = '/student/task')}
    >
      <CardHeader className="space-y-0 pb-2">
        <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
          <ListTodo className="h-6 w-6" style={{ color: '#16A249' }} />
          Tasks Summary
        </h3>
      </CardHeader>

      <CardContent className="space-y-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[#0F172A]">Overall Progress</span>
            <span className="font-bold" style={{ color: '#16A249' }}>
              {data.overall}%
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${data.overall}%`,
                backgroundColor: '#16A249',
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg bg-[#F1F5F980] p-2.5 border border-transparent">
            <CheckCircle2 className="h-6 w-6" style={{ color: '#16A249' }} />
            <div>
              <div className="text-2xl font-bold text-[#0F172A] leading-tight">
                {data.completed}
              </div>
              <div className="text-xs text-[#64748B]">Completed</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-[#F1F5F980] p-2.5 border border-transparent">
            <Clock className="h-6 w-6" style={{ color: '#E7B008' }} />
            <div>
              <div className="text-2xl font-bold text-[#0F172A] leading-tight">
                {data.inProgress}
              </div>
              <div className="text-xs text-[#64748B]">In Progress</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-[#F1F5F980] p-2.5 border border-transparent">
            <AlertCircle className="h-6 w-6" style={{ color: '#ef4444' }} />
            <div>
              <div className="text-2xl font-bold text-[#0F172A] leading-tight">
                {data.pending}
              </div>
              <div className="text-xs text-[#64748B]">Pending</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-[#F1F5F980] p-2.5 border border-transparent">
            <ListTodo className="h-6 w-6" style={{ color: '#0F172A' }} />
            <div>
              <div className="text-2xl font-bold text-[#0F172A] leading-tight">
                {data.total}
              </div>
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

const AssessmentsOverview: React.FC<{ data: AssessmentsData }> = ({ data }) => {
  return (
    <Card
      className={cardClass}
      onClick={() => (window.location.href = '/student/assessment')}
    >
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
            <FileCheck className="h-6 w-6" style={{ color: '#E7B008' }} />
            Assessments Overview
          </h3>
          <span
            className={`${badgeBase} border-transparent bg-slate-100 text-[#0F172A]`}
          >
            {data.completed}/{data.total}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center">
            <div className="text-xl font-bold" style={{ color: '#16A249' }}>
              {data.completed}
            </div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>
              Completed
            </div>
          </div>

          <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center">
            <div className="text-xl font-bold" style={{ color: '#E7B008' }}>
              {data.inProgress}
            </div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>
              In Progress
            </div>
          </div>

          <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center">
            <div className="text-xl font-bold" style={{ color: '#ef4444' }}>
              {data.pending}
            </div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>
              Pending
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#64748B' }}>
              Average Score
            </span>
            <span className="text-lg font-bold" style={{ color: '#16A249' }}>
              {data.avgScore}%
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span style={{ color: '#64748B' }}>Highest Score</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-5 w-5" style={{ color: '#16A249' }} />
              <span className="font-semibold" style={{ color: '#16A249' }}>
                {data.highestScore}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span style={{ color: '#64748B' }}>Lowest Score</span>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-5 w-5" style={{ color: '#E7B008' }} />
              <span className="font-semibold" style={{ color: '#E7B008' }}>
                {data.lowestScore}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="text-sm" style={{ color: '#64748B' }}>
              Recent Status
            </span>
            <span
              className={`${badgeBase} border-transparent bg-[hsl(var(--success))33] text-[hsl(var(--success))]`}
            >
              Completed - {data.recentStatus}%
            </span>
          </div>
        </div>

        <div className="text-xs" style={{ color: '#64748B' }}>
          Click to view all assessments
        </div>
      </CardContent>
    </Card>
  );
};

const ContestPerformance: React.FC<{ data: ContestsData }> = ({ data }) => {
  return (
    <Card className="h-full border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
            <Trophy className="h-6 w-6" style={{ color: '#E7B008' }} />
            Contest Performance
          </h3>
          <Medal className="h-6 w-6" style={{ color: '#E7B008' }} />
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center">
            <div className="text-2xl font-bold" style={{ color: '#16A249' }}>
              {data.completed}
            </div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>
              Completed
            </div>
          </div>

          <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center">
            <div className="text-2xl font-bold" style={{ color: '#E7B008' }}>
              #{data.bestRank}
            </div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>
              Best Rank
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#64748B' }}>
              Average Score
            </span>
            <span
              className={`${badgeBase} border-transparent bg-[#F59E0B20] text-[#F59E0B]`}
            >
              {data.avgScore}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#64748B' }}>
              Success Rate
            </span>
            <span
              className={`${badgeBase} border-transparent bg-[hsl(var(--success))33] text-[hsl(var(--success))]`}
            >
              {data.successRate}%
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-2">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-5 w-5" style={{ color: '#E7B008' }} />
            <span className="text-sm font-semibold text-[#0F172A]">
              Last Contest Performance
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center border border-transparent">
              <div className="text-base font-bold text-[#0F172A]">
                #{data.lastContest.rank}
              </div>
              <div className="text-xs text-[#64748B]">Rank</div>
            </div>

            <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center border border-transparent">
              <div className="text-base font-bold" style={{ color: '#16A249' }}>
                {data.lastContest.accuracy}%
              </div>
              <div className="text-xs text-[#64748B]">Accuracy</div>
            </div>

            <div className="rounded-lg bg-[#F1F5F980] p-2.5 text-center border border-transparent">
              <div className="text-base font-bold text-[#0F172A]">
                {data.lastContest.time}
              </div>
              <div className="text-xs text-[#64748B]">Time</div>
            </div>
          </div>
        </div>

        <div className="text-xs" style={{ color: '#64748B' }}>
          Keep participating to improve your ranking!
        </div>
      </CardContent>
    </Card>
  );
};

const AttendanceOverview: React.FC = () => {
  const { present, absent } = mockAttendance;

  const attendanceData = [
    { name: 'Present', value: present, fill: 'hsl(142 76% 36%)' },
    { name: 'Absent', value: absent, fill: 'hsl(45 93% 47%)' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="flex items-center gap-3 rounded-lg border-none bg-white p-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <div
            className="h-3 w-3 rounded-[2px]"
            style={{ backgroundColor: payload[0].fill }}
          />
          <span className="text-sm font-medium text-[#64748B]">{payload[0].name}</span>
          <span className="text-sm font-bold text-[#0F172A]">{payload[0].value}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-0 pb-2">
        <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
          <Calendar className="h-6 w-6" style={{ color: '#16A249' }} />
          Attendance Overview
        </h3>
      </CardHeader>

      <CardContent className="space-y-2.5">
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={attendanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({
                  name,
                  value,
                  x,
                  y,
                  fill,
                }: {
                  name: string;
                  value: number;
                  x: number;
                  y: number;
                  fill: string;
                }) => (
                  <text
                    x={x}
                    y={y}
                    fill={fill}
                    textAnchor={x > 200 ? 'start' : 'end'}
                    dominantBaseline="central"
                    className="text-xs font-bold"
                  >
                    {`${name}: ${value}%`}
                  </text>
                )}
                innerRadius={0}
                outerRadius={65}
                dataKey="value"
                strokeWidth={0}
              >
                {attendanceData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-gray-300 pt-2.5 text-center">
          <div>
            <div className="text-2xl font-bold text-[#0F172A]">100</div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>
              Total Days
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: '#16A249' }}>
              {present}
            </div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>
              Present
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: '#E7B008' }}>
              {absent}
            </div>
            <div className="mt-1 text-xs" style={{ color: '#64748B' }}>
              Absent
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Announcements: React.FC<{ announcements: AnnouncementItem[]; count: number }> = ({
  announcements,
  count,
}) => {
  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'course':
        return '#16A249';
      case 'event':
        return '#E7B008';
      case 'department':
        return '#7C3AED';
      default:
        return '#64748B';
    }
  };

  return (
    <Card className="h-full border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
            <Bell className="h-6 w-6" style={{ color: '#E7B008' }} />
            Announcements
          </h3>
          <span className={`${badgeBase} border-transparent bg-slate-100 text-[#0F172A]`}>
            {count} new
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-3">
        <div
          className="max-h-[280px] space-y-2.5 overflow-y-auto pr-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
        >
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="h-8 w-8 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No new announcements</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="relative cursor-pointer rounded-lg border border-gray-100 bg-white p-3.5 transition-all hover:shadow-md border-l-4"
                style={{ borderLeftColor: getTypeColor(announcement.type || announcement.level) }}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    {announcement.title}
                  </h4>
                  {!announcement.read && (
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: '#E7B008' }}
                    />
                  )}
                </div>

                <p className="mb-2 text-xs" style={{ color: '#64748B' }}>
                  {announcement.content || announcement.description || 'No description'}
                </p>

                <div className="flex items-center gap-4 text-xs">
                  <span
                    className="flex items-center gap-1.5"
                    style={{ color: '#64748B' }}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {announcement.expiry_date
                      ? new Date(announcement.expiry_date).toLocaleDateString()
                      : announcement.timestamp || 'No expiry'}
                  </span>

                  <span
                    className={`${badgeBase} border-transparent px-2`}
                    style={{
                      backgroundColor: `${getTypeColor(
                        announcement.type || announcement.level
                      )}15`,
                      color: getTypeColor(announcement.type || announcement.level),
                    }}
                  >
                    {announcement.type || announcement.level || 'notice'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const StreaksBadges: React.FC = () => {
  const streak = {
    current: 12,
    lastMilestone: 10,
    nextBadge: 'Silver',
    daysToNext: 3,
  };

  const badges = [
    { name: 'Bronze', earned: true, icon: '🥉' },
    { name: 'Silver', earned: false, icon: '🥈' },
    { name: 'Gold', earned: false, icon: '🥇' },
    { name: 'Platinum', earned: false, icon: '💎' },
  ];

  const recentAchievements = [
    { text: 'Completed 5 notes in a week', date: '2 days ago' },
    { text: 'Perfect score in Python test', date: '5 days ago' },
    { text: '10 day learning streak', date: '1 week ago' },
  ];

  const progressToNext = Math.min(
    100,
    Math.max(0, ((streak.current - streak.lastMilestone) / 5) * 100)
  );

  return (
    <Card className="h-full border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-0 pb-2">
        <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
          <Flame className="h-6 w-6" style={{ color: '#E7B008' }} />
          Streaks & Badges
        </h3>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center p-3 rounded-xl bg-[#F8FAFC]">
          <div className="flex items-center justify-center gap-2 mb-0.5">
            <Flame
              className="h-7 w-7"
              style={{ color: '#E7B008' }}
              strokeWidth={2}
            />
            <span className="text-3xl font-bold" style={{ color: '#E7B008' }}>
              {streak.current}
            </span>
          </div>
          <p className="text-[11px] font-medium text-[#64748B]">Day Streak</p>
        </div>

        <div className="space-y-1.5 pb-1">
          <div className="flex justify-between text-[12px] items-center mb-1">
            <span className="text-[#64748B]">Progress to {streak.nextBadge}</span>
            <span className="font-bold text-[#0F172A]">
              {streak.daysToNext} days left
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
            <div
              className="h-full bg-[#0F172A] transition-all"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4.5 w-4.5" style={{ color: '#16A249' }} />
            <span className="text-[13px] font-bold text-[#0F172A]">Earned Badges</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {badges.map((badge, index) => (
              <div
                key={index}
                className={`text-center p-2 rounded-xl border transition-all ${
                  badge.earned
                    ? 'bg-white border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                    : 'bg-white border-gray-50 opacity-70 grayscale'
                }`}
              >
                <div className="mb-1 text-2xl flex justify-center items-center h-8">
                  {badge.icon}
                </div>
                <div
                  className={`text-[10px] font-bold ${
                    badge.earned ? 'text-[#0F172A]' : 'text-[#94A3B8]'
                  }`}
                >
                  {badge.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4.5 w-4.5" style={{ color: '#E7B008' }} />
            <span className="text-[13px] font-bold text-[#0F172A]">
              Recent Achievements
            </span>
          </div>
          <div className="space-y-2.5">
            {recentAchievements.map((achievement, index) => (
              <div key={index} className="flex items-start gap-2.5 text-sm">
                <TrendingUp
                  className="h-4 w-4 mt-0.5 flex-shrink-0"
                  style={{ color: '#16A249' }}
                />
                <div className="flex-1">
                  <p className="font-medium text-[#0F172A] text-[12px] leading-tight">
                    {achievement.text}
                  </p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
                    {achievement.date}
                  </p>
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
    {
      label: 'Learning Progress',
      value: mockPerformance.learningProgress,
      color: '#16A249',
    },
    {
      label: 'Task Completion',
      value: mockPerformance.taskCompletion,
      color: '#16A249',
    },
    {
      label: 'Assessment Average',
      value: mockPerformance.assessmentAverage,
      color: '#E7B008',
    },
    {
      label: 'Contest Participation',
      value: mockPerformance.contestParticipation,
      color: '#E7B008',
    },
    {
      label: 'Attendance Rate',
      value: mockPerformance.attendanceRate,
      color: '#16A249',
    },
  ];

  return (
    <Card className="h-full border border-gray-300 bg-card shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="space-y-0 pb-2">
        <h3 className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
          <BarChart3 className="h-6 w-6" style={{ color: '#16A249' }} />
          Performance Metrics Summary
        </h3>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3.5">
          {metrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#0F172A]">
                  {metric.label}
                </span>
                <span
                  className="text-[13px] font-bold"
                  style={{ color: metric.color }}
                >
                  {metric.value}%
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-[#f1f5f9] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${metric.value}%`,
                    backgroundColor: '#0F172A',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-gray-100 pt-5">
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: '#16A249' }}>
              {mockPerformance.overall}%
            </p>
            <p
              className="mt-1 text-[12px] font-medium"
              style={{ color: '#94A3B8' }}
            >
              Overall Performance Score
            </p>
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
  const [assessmentsData, setAssessmentsData] = useState<AssessmentsData | null>(
    null
  );
  const [contestsData, setContestsData] = useState<ContestsData | null>(null);
  const [announcementsData, setAnnouncementsData] = useState<AnnouncementItem[]>(
    []
  );
  const [announcementCount, setAnnouncementCount] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [notes, tests, tasks, assessments, contests, announcementsRes] =
          await Promise.all([
            studentDashboardService.getNotesProgress(),
            studentDashboardService.getTestPerformance(),
            studentDashboardService.getTasksSummary(),
            studentDashboardService.getAssessments(),
            studentDashboardService.getContests(),
            announcementService.getAnnouncements({
              college: (user as any)?.college_id,
            }),
          ]);

        setNotesData(notes);
        setTestsData(tests);
        setTasksData(tasks);
        setAssessmentsData(assessments);
        setContestsData(contests);

        const deptId = (user as any)?.department_id;
        const results =
          (announcementsRes as any).results ||
          (announcementsRes as any).data ||
          (Array.isArray(announcementsRes) ? announcementsRes : []);

        const filtered = results.filter((ann: any) => {
          if (ann.level === 'college') return true;
          if (ann.level === 'department') {
            return ann.department?.toString() === deptId?.toString();
          }
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

  if (
    loading ||
    !notesData ||
    !testsData ||
    !tasksData ||
    !assessmentsData ||
    !contestsData
  ) {
    return (
      <div className="h-screen bg-gray-50 flex overflow-hidden text-slate-900">
        <RoleSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <RoleHeader
            title="Loading..."
            subtitle="Please wait while we load your dashboard."
          />
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(9)].map((_, i) => (
                <Card
                  key={i}
                  className="h-64 animate-pulse border-border bg-muted/40"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden text-slate-900">
      <RoleSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          <RoleHeader
            title="Dashboard Overview"
            subtitle="Monitor your academic progress and performance metrics"
            className="py-0 pb-4"
            noPadding
          />
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
            <Announcements
              announcements={announcementsData}
              count={announcementCount}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <StreaksBadges />
            <PerformanceMetrics />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React from 'react';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';

// FILE-2 IMPORTS (UNCHANGED)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import {
  Code,
  Brain,
  Terminal,
  Mic,
  TrendingUp,
  TrendingDown,
  Flame,
  Trophy,
  ArrowRight,
  AlertTriangle,
  Star,
  Target,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ===== DUMMY DATA (UNCHANGED) =====
const psBreakdown = {
  overall: 72,
  coreSubjects: 78,
  aptitude: 65,
  communication: 70,
  mockInterviews: 74,
};

const rankingData = {
  sectionRank: 12,
  sectionTotal: 60,
  sectionChange: 3,
  collegeRank: 145,
  collegeTotal: 1200,
  collegeChange: -5,
};

const streakData = {
  currentStreak: 6,
  badge: 'Consistent Learner',
  longestStreak: 14,
};

const moduleCards = [
  {
    title: 'DSA',
    icon: Code,
    progress: 68,
    stat1Label: 'Problems Solved',
    stat1Value: '142 / 250',
    stat2Label: 'Weak Topic',
    stat2Value: 'Dynamic Programming',
    cta: 'Start Practice',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    title: 'Aptitude & Reasoning',
    icon: Brain,
    progress: 55,
    stat1Label: 'Accuracy',
    stat1Value: '72%',
    stat2Label: 'Tests Attempted',
    stat2Value: '18 / 30',
    cta: 'Take Test',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    title: 'Python',
    icon: Terminal,
    progress: 80,
    stat1Label: 'Concepts Completed',
    stat1Value: '32 / 40',
    stat2Label: 'Practice Progress',
    stat2Value: '80%',
    cta: 'Continue Learning',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    title: 'Mock Interviews',
    icon: Mic,
    progress: 62,
    stat1Label: 'Interviews Taken',
    stat1Value: '8',
    stat2Label: 'Avg Score',
    stat2Value: '74 / 100',
    cta: 'Start Mock Interview',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
  },
];

const recommendations = [
  { text: 'Practice Binary Search problems', priority: 'High', module: 'DSA' },
  { text: 'Improve Logical Reasoning accuracy', priority: 'High', module: 'Aptitude' },
  { text: 'Attempt a Mock Interview this week', priority: 'Medium', module: 'Mock Interview' },
  { text: 'Revise DBMS & Normalization', priority: 'Medium', module: 'Core Subjects' },
  { text: 'Practice verbal communication drills', priority: 'High', module: 'Communication' },
];

const weeklyProgress = [
  { week: 'Week 1', ps: 58 },
  { week: 'Week 2', ps: 62 },
  { week: 'Week 3', ps: 64 },
  { week: 'Week 4', ps: 68 },
  { week: 'Week 5', ps: 70 },
  { week: 'Week 6', ps: 72 },
];

const sectionLeaderboard = [
  { rank: 1, name: 'Priya Sharma', ps: 92 },
  { rank: 2, name: 'Rahul Verma', ps: 88 },
  { rank: 3, name: 'Ankit Jain', ps: 85 },
  { rank: 4, name: 'Sneha Patel', ps: 82 },
  { rank: 5, name: 'Kiran Reddy', ps: 80 },
];

const collegeLeaderboard = [
  { rank: 1, name: 'Aditya Kumar', ps: 96 },
  { rank: 2, name: 'Meena Ravi', ps: 94 },
  { rank: 3, name: 'Priya Sharma', ps: 92 },
  { rank: 4, name: 'Vikash Singh', ps: 91 },
  { rank: 5, name: 'Neha Gupta', ps: 90 },
];

const weakAreas = [
  { area: 'Dynamic Programming', module: 'DSA', score: 35 },
  { area: 'Logical Reasoning', module: 'Aptitude', score: 42 },
  { area: 'Communication Skills', module: 'Communication', score: 48 },
  { area: 'System Design Basics', module: 'Core Subjects', score: 50 },
];

function getPsStatus(score: number) {
  if (score >= 85) return { label: 'Strong', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' };
  if (score >= 70) return { label: 'Good', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' };
  if (score >= 55) return { label: 'Needs Improvement', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' };
  return { label: 'Weak', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' };
}

// ===== FINAL COMPONENT =====
const StudentInterviewPrep: React.FC = () => {
  const navigate = useNavigate();
  const psStatus = getPsStatus(psBreakdown.overall);

  const chartConfig = {
    ps: { label: 'PS Score', color: '#111827' },
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex h-screen overflow-hidden">
        <RoleSidebar />
        <div className="flex-1 h-screen overflow-y-auto">
          <RoleHeader
            title="Interview Preparation"
            subtitle="Track your preparation, practice skills, and stay ahead."
          />
          <div className="p-6 space-y-6">


            {/* ===== HERO SECTION ===== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* PS Score Card */}
              <Card className="md:col-span-1 shadow-sm border-gray-200">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium mb-2">PS Score</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-gray-900">{psBreakdown.overall}</span>
                        <span className="text-lg text-gray-400">/100</span>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0 rounded-full px-3 py-1 font-medium">{psStatus.label}</Badge>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-gray-900 rounded-full" style={{ width: `${psBreakdown.overall}%` }}></div>
                  </div>
                  <div className="space-y-3 pt-4">
                    {[
                      { label: 'Core Subjects', value: psBreakdown.coreSubjects },
                      { label: 'Aptitude', value: psBreakdown.aptitude },
                      { label: 'Communication', value: psBreakdown.communication },
                      { label: 'Mock Interviews', value: psBreakdown.mockInterviews },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 w-1/3">{item.label}</span>
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden mx-2">
                          <div className="h-full bg-gray-800 rounded-full" style={{ width: `${item.value}%` }}></div>
                        </div>
                        <span className="text-gray-900 font-bold w-12 text-right">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ranking Card */}
              <Card className="shadow-sm border-gray-200">
                <CardContent className="pt-6 space-y-5">
                  <p className="text-sm text-gray-500 font-medium">Your Ranking</p>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#FDFAF0] border border-amber-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Section Rank</span>
                        <div className="flex items-center">
                          {rankingData.sectionChange > 0 ? (
                            <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                          )}
                          <span className={`text-sm font-medium ${rankingData.sectionChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {rankingData.sectionChange > 0 ? '+' : ''}{Math.abs(rankingData.sectionChange)}
                          </span>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">
                        #{rankingData.sectionRank} <span className="text-lg font-normal text-gray-400">/ {rankingData.sectionTotal}</span>
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#F0FDF4] border border-green-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">College Rank</span>
                        <div className="flex items-center">
                          {rankingData.collegeChange > 0 ? (
                            <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                          )}
                          <span className={`text-sm font-medium ${rankingData.collegeChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {rankingData.collegeChange > 0 ? '+' : ''}{rankingData.collegeChange}
                          </span>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">
                        #{rankingData.collegeRank} <span className="text-lg font-normal text-gray-400">/ {rankingData.collegeTotal}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Streak Card */}
              <Card className="shadow-sm border-gray-200">
                <CardContent className="pt-10 pb-8 flex flex-col items-center justify-center text-center space-y-4 h-full">
                  <div className="h-16 w-16 rounded-full bg-orange-50 flex items-center justify-center mb-2">
                    <Flame className="h-8 w-8 text-amber-500" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-6xl font-bold text-gray-900" style={{ fontFamily: 'serif' }}>{streakData.currentStreak}</p>
                    <p className="text-sm text-gray-500">Day Streak</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0 rounded-full px-4 py-1.5 font-medium mt-4">
                    <Star className="h-3.5 w-3.5 mr-1.5 fill-orange-500 text-orange-500" />
                    {streakData.badge}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-4">
                    Longest streak: {streakData.longestStreak} days
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ===== CORE MODULES ===== */}
            <div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Core Preparation Modules</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {moduleCards.map((mod) => (
                    <Card key={mod.title} className="shadow-sm border-gray-200">
                      <CardContent className="p-5 space-y-5">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 flex items-center justify-center rounded bg-gray-50 border border-gray-100`}>
                            <mod.icon className={`h-5 w-5 ${mod.color}`} />
                          </div>
                          <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                        </div>

                        <div className="pt-2">
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                            <span>Progress</span>
                            <span className="font-medium text-gray-900">{mod.progress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-900 rounded-full" style={{ width: `${mod.progress}%` }}></div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{mod.stat1Label}</span>
                            <span className="text-gray-900 font-medium">{mod.stat1Value}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{mod.stat2Label}</span>
                            <span className="text-gray-900 font-medium">{mod.stat2Value}</span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button variant="outline" className="w-full justify-center bg-gray-900 border-gray-200 hover:bg-gray-800 text-white font-medium py-5">
                            {mod.cta} <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* ===== RECOMMENDED ACTIONS ===== */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                  <Target className="h-4 w-4 text-orange-500" />
                  Recommended for You
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-gray-300 bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Zap className={`h-4 w-4 ${rec.priority === 'High' ? 'text-amber-500' : 'text-gray-600'}`} />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{rec.text}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{rec.module}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 rounded-full bg-white ${rec.priority === 'High' ? 'border-orange-200 text-orange-600' : 'border-gray-200 text-gray-900'}`}
                        >
                          {rec.priority}
                        </Badge>
                        <Button size="sm" variant="ghost" className="h-8 text-xs font-medium text-gray-900 hover:bg-gray-200">
                          Start <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ===== PROGRESS GRAPH + LEADERBOARD ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Progress Chart */}
              <Card className="lg:col-span-2 shadow-sm border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-gray-900">PS Progress</CardTitle>
                  <p className="text-xs text-gray-500">Your PS improved from 58% to 72% over 6 weeks</p>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[280px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyProgress} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />

                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 11, fill: '#6B7280' }}
                          axisLine={{ stroke: '#6B7280' }}
                          tickLine
                        />

                        <YAxis
                          domain={[50, 100]}
                          ticks={[50, 65, 80, 100]}
                          tick={{ fontSize: 11, fill: '#6B7280' }}
                          axisLine={{ stroke: '#6B7280' }}
                          tickLine
                        />

                        <ChartTooltip content={<ChartTooltipContent />} />

                        <Line name="ps" type="monotone" dataKey="ps" stroke="#111827" strokeWidth={2.5} dot={{ r: 4, fill: '#111827', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, stroke: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Leaderboards */}
              <div className="space-y-4">
                <Card className="shadow-sm border-gray-200">
                  <CardHeader className="pb-3 border-b border-gray-100 mb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                      <Trophy className="h-4 w-4 text-amber-500" strokeWidth={1.5} fill="transparent" />
                      Section Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-3">
                      {sectionLeaderboard.map((s) => (
                        <div
                          key={s.rank}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${s.rank === 4 ? 'bg-[#FFFAF0] border border-amber-100' : 'hover:bg-gray-50 border border-transparent'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-500 w-5">#{s.rank}</span>
                            <span className={`text-sm ${s.rank === 4 ? 'text-gray-900' : 'text-gray-900'}`}>{s.name}</span>
                            {s.rank === 4 && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 text-[10px] px-2 py-0.5 rounded-full font-medium ml-1">You</Badge>}
                          </div>
                          <span className="font-semibold text-sm text-gray-900">{s.ps}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-200">
                  <CardHeader className="pb-3 border-b border-gray-100 mb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                      <Trophy className="h-4 w-4 text-emerald-500" strokeWidth={1.5} fill="transparent" />
                      College Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-3">
                      {collegeLeaderboard.map((s) => (
                        <div key={s.rank} className="flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-gray-50 border border-transparent">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-500 w-5">#{s.rank}</span>
                            <span className="text-gray-900">{s.name}</span>
                          </div>
                          <span className="font-semibold text-sm text-gray-900">{s.ps}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ===== WEAK AREAS ===== */}
            <Card className="shadow-sm border-gray-200 mt-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-900">
                  <AlertTriangle className="h-5 w-5 text-amber-500" strokeWidth={1.5} fill="transparent" />
                  Weak Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {weakAreas.map((w) => (
                    <div
                      key={w.area}
                      className="p-3 rounded-lg border bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/20"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-bold text-gray-900 pr-2">{w.area}</p>
                        <span className="text-sm font-bold text-red-500">{w.score}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">{w.module}</p>

                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-5">
                        <div className="h-full bg-gray-800 rounded-full" style={{ width: `${w.score}%` }}></div>
                      </div>

                      <Button size="sm" variant="outline" className="w-full text-xs h-9  bg-gray-900 border-gray-200 hover:bg-gray-800 text-white font-medium">
                        Improve Now <ArrowRight className="h-3.5 w-3.5 ml-2" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInterviewPrep;
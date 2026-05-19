import React, { useState } from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { usePlacementStats } from '@/hooks/usePlacement';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  FileText, FileSpreadsheet, Share2, TrendingUp, TrendingDown, Users, Target, CheckCircle2,
  AlertTriangle, Activity, Brain, Sparkles, Award, BookOpen,
  Mic, Code2, MessageSquare, Lightbulb, Zap, ArrowUpRight, ArrowDownRight,
  ClipboardCheck, Briefcase,
} from 'lucide-react';

const kpis = [
  { label: 'Total Students', value: '1,248', trend: 4.2, icon: Users, spark: [10,12,11,14,13,16,18] },
  
  { label: 'Placement Ready %', value: '32%', trend: 5.6, icon: CheckCircle2, spark: [20,22,24,26,28,30,32] },
  { label: 'Almost Ready %', value: '41%', trend: 1.8, icon: Activity, spark: [35,36,38,39,40,40,41] },
  { label: 'Needs Improvement %', value: '27%', trend: -2.4, icon: AlertTriangle, spark: [35,33,32,30,29,28,27] },
  { label: 'Avg Assessment Score', value: '78.2', trend: 2.7, icon: BookOpen, spark: [70,72,73,74,75,77,78] },
  { label: 'Avg Skill Test Score', value: '74.5', trend: 3.4, icon: Code2, spark: [65,67,69,70,72,73,74] },
  { label: 'Avg Mock Interview Score', value: '71.8', trend: 4.9, icon: Mic, spark: [60,62,64,66,68,70,72] },
  { label: 'Active Learners %', value: '84%', trend: 6.2, icon: Zap, spark: [70,72,75,78,80,82,84] },
  { label: 'Practice Completion %', value: '68%', trend: 2.1, icon: Award, spark: [55,58,60,62,64,66,68] },
];

const readinessDist = [
  { name: 'Placement Ready', value: 32, color: '#10B981' },
  { name: 'Almost Ready', value: 41, color: '#84CC16' },
  { name: 'Improving', value: 18, color: '#F59E0B' },
  { name: 'Needs Attention', value: 9, color: '#EF4444' },
];

const progressTrend = [
  { month: 'Jan', PRI: 62, Assessment: 65, Skill: 60, Mock: 55 },
  { month: 'Feb', PRI: 64, Assessment: 68, Skill: 63, Mock: 58 },
  { month: 'Mar', PRI: 67, Assessment: 71, Skill: 66, Mock: 61 },
  { month: 'Apr', PRI: 70, Assessment: 73, Skill: 69, Mock: 64 },
  { month: 'May', PRI: 72, Assessment: 75, Skill: 71, Mock: 67 },
  { month: 'Jun', PRI: 74, Assessment: 77, Skill: 73, Mock: 70 },
  { month: 'Jul', PRI: 76, Assessment: 78, Skill: 74, Mock: 72 },
];

const funnel = [
  { stage: 'Registered Students', value: 1248, color: '#6C63FF' },
  { stage: 'Active Learners', value: 1048, color: '#7C76FF' },
  { stage: 'Completed Assessments', value: 892, color: '#8B86FF' },
  { stage: 'Completed Skill Tests', value: 724, color: '#A29CFF' },
  { stage: 'Completed Mock Interviews', value: 512, color: '#B8B3FF' },
  { stage: 'Placement Ready', value: 399, color: '#10B981' },
];

const skills = [
  { skill: 'Aptitude', score: 82, trend: 3.4 },
  { skill: 'DSA', score: 71, trend: 5.1 },
  { skill: 'Problem Solving', score: 76, trend: 2.8 },
  { skill: 'SQL', score: 68, trend: -1.2 },
  { skill: 'Communication', score: 79, trend: 4.6 },
  { skill: 'Technical Interviews', score: 73, trend: 3.9 },
  { skill: 'HR Readiness', score: 81, trend: 2.1 },
  { skill: 'Mock Interviews', score: 70, trend: 5.5 },
];

const radarData = skills.map(s => ({ skill: s.skill, score: s.score, fullMark: 100 }));

const assessmentCompare = [
  { area: 'Aptitude', diagnostic: 58, current: 82 },
  { area: 'DSA', diagnostic: 45, current: 71 },
  { area: 'SQL', diagnostic: 52, current: 68 },
  { area: 'Communication', diagnostic: 60, current: 79 },
  { area: 'HR', diagnostic: 64, current: 81 },
];

const mockMetrics = [
  { label: 'Avg Interview Score', value: 71.8 },
  { label: 'Communication', value: 79.2 },
  { label: 'Confidence', value: 64.5 },
  { label: 'Technical Clarity', value: 73.4 },
  { label: 'HR Readiness', value: 81.0 },
  { label: 'Completion Rate', value: 68.0 },
];

const aiInsights = [
  { title: 'Students improving rapidly', value: '184', sub: '+22% MoM', tone: 'green', icon: TrendingUp },
  { title: 'Students needing attention', value: '76', sub: 'Low engagement', tone: 'red', icon: AlertTriangle },
  { title: 'Most improved skill', value: 'DSA', sub: '+11.2 points', tone: 'green', icon: Sparkles },
  { title: 'Weakest skill category', value: 'SQL', sub: '−1.2 trend', tone: 'orange', icon: TrendingDown },
  { title: 'Assessment engagement', value: '+18%', sub: 'Last 30 days', tone: 'green', icon: Activity },
  { title: 'Mock interview completion', value: '68%', sub: '512 of 754', tone: 'orange', icon: Mic },
];

const recommendations = [
  { title: 'Increase SQL practice assessments', desc: 'SQL scores are trending down. Add 2 weekly practice sets.', icon: Code2 },
  { title: 'Encourage more mock interviews', desc: 'Only 68% completion. Schedule peer interview drives.', icon: Mic },
  { title: 'Focus on communication practice', desc: '142 students show low clarity in spoken responses.', icon: MessageSquare },
  { title: 'Improve coding consistency', desc: '38% of learners practice <2 days/week. Push streak goals.', icon: Zap },
  { title: 'Schedule advanced DSA tests', desc: 'Top 200 students plateauing. Introduce hard-tier problems.', icon: Brain },
  { title: 'AI mentor sessions for confidence', desc: 'Confidence score at 64.5 — lowest in mock category.', icon: Lightbulb },
];

const scoreColor = (v: number) =>
  v >= 85 ? 'text-emerald-600' : v >= 70 ? 'text-amber-600' : 'text-red-600';

const Sparkline = ({ data, positive }: { data: number[]; positive: boolean }) => (
  <ResponsiveContainer width="100%" height={36}>
    <AreaChart data={data.map((v, i) => ({ i, v }))}>
      <defs>
        <linearGradient id={`spd-${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? '#10B981' : '#EF4444'} stopOpacity={0.35} />
          <stop offset="100%" stopColor={positive ? '#10B981' : '#EF4444'} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={positive ? '#10B981' : '#EF4444'} strokeWidth={1.6} fill={`url(#spd-${positive ? 'g' : 'r'})`} />
    </AreaChart>
  </ResponsiveContainer>
);

const PlacementDashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = usePlacementStats();
  const [year, setYear] = useState('2025-26');
  const [assessmentType, setAssessmentType] = useState('all');
  const [skillCategory, setSkillCategory] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [readinessStatus, setReadinessStatus] = useState('all');

  return (
    <PlacementLayout title="">
      <div className="max-w-[1500px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#8B86FF] flex items-center justify-center shadow-sm">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Placement Dashboard</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1.5 ml-11">
              AI-powered placement readiness intelligence and progress analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg">
              <FileText className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Export Excel
            </Button>
            <Button size="sm" className="rounded-lg bg-[#6C63FF] hover:bg-[#5b53e6]">
              <Share2 className="h-4 w-4 mr-1.5" /> Share
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/60 shadow-sm rounded-2xl">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2025-26">Academic Year 2025-26</SelectItem>
                <SelectItem value="2024-25">Academic Year 2024-25</SelectItem>
                <SelectItem value="2023-24">Academic Year 2023-24</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assessmentType} onValueChange={setAssessmentType}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assessments</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="final">Final</SelectItem>
              </SelectContent>
            </Select>
            <Select value={skillCategory} onValueChange={setSkillCategory}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                <SelectItem value="aptitude">Aptitude</SelectItem>
                <SelectItem value="dsa">DSA</SelectItem>
                <SelectItem value="sql">SQL</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
            <Select value={readinessStatus} onValueChange={setReadinessStatus}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ready">Placement Ready</SelectItem>
                <SelectItem value="almost">Almost Ready</SelectItem>
                <SelectItem value="improving">Improving</SelectItem>
                <SelectItem value="attention">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Quick Stats Grid & Actions */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 shadow-sm rounded-2xl bg-white">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="h-10 w-10 rounded-2xl bg-[#FFF9EC] flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-tight">{isLoading ? '...' : (stats?.pendingCount ?? 0)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Pending Approvals</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm rounded-2xl bg-white">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="h-10 w-10 rounded-2xl bg-[#F3F2FF] flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-[#6C63FF]" />
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-tight">{isLoading ? '...' : (stats?.liveCount ?? 0)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Live Jobs</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm rounded-2xl bg-white">
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="h-10 w-10 rounded-2xl bg-[#E6F4EA] flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#10B981]" />
                </div>
                <div>
                  <div className="text-2xl font-semibold tracking-tight">{isLoading ? '...' : (stats?.selectedThisMonth ?? 0)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Students Selected</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/placement/job-approvals')}
              className="rounded-2xl px-6 py-2.5 h-11 text-sm font-semibold bg-[#7c73e6] hover:bg-[#6c63d6] text-white shadow-sm"
            >
              Review Pending Jobs
            </Button>
            <Button
              onClick={() => navigate('/placement/students')}
              variant="outline"
              className="rounded-2xl px-6 py-2.5 h-11 text-sm font-semibold border-[#7c73e6] text-[#7c73e6] hover:bg-[#7c73e6]/5"
            >
              View Selected Students
            </Button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((k) => {
            const positive = k.trend >= 0;
            const Icon = k.icon;
            return (
              <Card key={k.label} className="border-border/60 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="h-8 w-8 rounded-lg bg-[#F3F2FF] flex items-center justify-center">
                      <Icon className="h-4 w-4 text-[#6C63FF]" />
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(k.trend)}%
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-semibold tracking-tight">{k.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
                  </div>
                  <div className="mt-2 -mx-1">
                    <Sparkline data={k.spark} positive={positive} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Readiness Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Readiness Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">PRI category breakdown</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={readinessDist} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {readinessDist.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {readinessDist.map(r => (
                  <div key={r.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                    <span className="text-muted-foreground flex-1 truncate">{r.name}</span>
                    <span className="font-medium">{r.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm rounded-2xl lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Placement Readiness Progress</CardTitle>
              <p className="text-xs text-muted-foreground">PRI, assessment, skill & mock growth over time</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={progressTrend} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF0F4" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="PRI" stroke="#6C63FF" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="Assessment" stroke="#10B981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Skill" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Mock" stroke="#2ED3B7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Funnel */}
        <Card className="border-border/60 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Readiness Funnel</CardTitle>
            <p className="text-xs text-muted-foreground">Student conversion from registration to placement readiness</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnel.map((f, i) => {
                const pct = (f.value / funnel[0].value) * 100;
                const conv = i > 0 ? ((f.value / funnel[i - 1].value) * 100).toFixed(1) : null;
                return (
                  <div key={f.stage} className="flex items-center gap-3">
                    <div className="w-44 text-sm text-foreground/80 shrink-0">{f.stage}</div>
                    <div className="flex-1 h-9 rounded-lg bg-muted/40 overflow-hidden relative">
                      <div
                        className="h-full rounded-lg flex items-center px-3 text-white text-xs font-medium transition-all"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${f.color}, ${f.color}dd)` }}
                      >
                        {f.value.toLocaleString()} students
                      </div>
                    </div>
                    <div className="w-20 text-right text-xs">
                      {conv ? (
                        <span className="text-muted-foreground">{conv}% <span className="text-[10px]">conv</span></span>
                      ) : (
                        <span className="text-muted-foreground">100%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Skill Readiness */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-border/60 shadow-sm rounded-2xl lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Skill Readiness Breakdown</CardTitle>
              <p className="text-xs text-muted-foreground">Average scores & trends across skill categories</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {skills.map(s => (
                <div key={s.skill}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{s.skill}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs flex items-center gap-0.5 ${s.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {s.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(s.trend)}%
                      </span>
                      <span className={`font-semibold w-10 text-right ${scoreColor(s.score)}`}>{s.score}</span>
                    </div>
                  </div>
                  <Progress value={s.score} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Skill Radar</CardTitle>
              <p className="text-xs text-muted-foreground">Multi-dimensional skill view</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar dataKey="score" stroke="#6C63FF" fill="#6C63FF" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Assessment Analytics */}
        <Card className="border-border/60 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Assessment Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { l: 'Completed', v: '892', tone: 'text-foreground' },
                { l: 'Pending', v: '356', tone: 'text-amber-600' },
                { l: 'Avg Growth', v: '+18.4%', tone: 'text-emerald-600' },
                { l: 'Strongest Area', v: 'Aptitude', tone: 'text-emerald-600' },
                { l: 'Weakest Area', v: 'SQL', tone: 'text-red-600' },
              ].map(x => (
                <div key={x.l} className="rounded-xl bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">{x.l}</div>
                  <div className={`text-lg font-semibold mt-1 ${x.tone}`}>{x.v}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mock Interview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-border/60 shadow-sm rounded-2xl lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Mic className="h-4 w-4 text-[#6C63FF]" /> Mock Interview Analytics
              </CardTitle>
              <p className="text-xs text-muted-foreground">Performance across interview dimensions</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {mockMetrics.map(m => (
                  <div key={m.label} className="rounded-xl border border-border/60 p-3 bg-gradient-to-br from-white to-[#F3F2FF]/30">
                    <div className="text-xs text-muted-foreground">{m.label}</div>
                    <div className={`text-xl font-semibold mt-1 ${scoreColor(m.value)}`}>{m.value.toFixed(1)}</div>
                    <Progress value={m.value} className="h-1.5 mt-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-[#6C63FF]" /> AI Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-medium text-emerald-700 mb-1.5">Strengths</div>
                <ul className="space-y-1 text-xs text-foreground/80">
                  <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />Strong communication clarity</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />Good technical understanding</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />Confident HR responses</li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-medium text-red-700 mb-1.5">Weaknesses</div>
                <ul className="space-y-1 text-xs text-foreground/80">
                  <li className="flex gap-2"><AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />Low confidence under pressure</li>
                  <li className="flex gap-2"><AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />Weak problem explanation</li>
                  <li className="flex gap-2"><AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />HR storytelling needs work</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-[#6C63FF]" />
            <h2 className="text-base font-semibold">AI Placement Insights</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {aiInsights.map(i => {
              const Icon = i.icon;
              const tone = i.tone === 'green' ? 'text-emerald-600 bg-emerald-50'
                : i.tone === 'red' ? 'text-red-600 bg-red-50'
                : 'text-amber-600 bg-amber-50';
              return (
                <Card key={i.title} className="border-border/60 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{i.title}</div>
                      <div className="text-lg font-semibold mt-0.5">{i.value}</div>
                      <div className="text-xs text-muted-foreground">{i.sub}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* AI Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-[#6C63FF]" />
            <h2 className="text-base font-semibold">AI Recommendations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.map(r => {
              const Icon = r.icon;
              return (
                <Card key={r.title} className="border-border/60 shadow-sm rounded-2xl hover:shadow-md transition-shadow bg-gradient-to-br from-white to-[#F3F2FF]/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[#F3F2FF] flex items-center justify-center">
                        <Icon className="h-4 w-4 text-[#6C63FF]" />
                      </div>
                      <div className="text-sm font-semibold">{r.title}</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{r.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <Card className="border-border/60 shadow-sm rounded-2xl bg-gradient-to-r from-[#F3F2FF] to-white">
          <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#6C63FF] flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium">Generated by Yuvro AI</div>
                <div className="text-xs text-muted-foreground">Last updated {new Date().toLocaleString()}</div>
              </div>
            </div>
            <Button className="rounded-lg bg-[#6C63FF] hover:bg-[#5b53e6]">
              <FileText className="h-4 w-4 mr-1.5" /> Download Full Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </PlacementLayout>
  );
};

export default PlacementDashboard;

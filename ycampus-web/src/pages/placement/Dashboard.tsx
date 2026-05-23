import React, { useState, useRef, useEffect } from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePlacementStats } from '@/hooks/usePlacement';
import { useBatchIds } from '@/hooks/useBatchIds';
import { usePlacementKPIs } from '@/hooks/usePlacementKPIs';
import skillTestService from '@/services/skillTestService';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  FileText, FileSpreadsheet, Share2, TrendingUp, TrendingDown, Users, Target, CheckCircle2,
  AlertTriangle, Activity, Brain, Sparkles, Award, BookOpen,
  Mic, Code2, MessageSquare, Lightbulb, Zap, ArrowUpRight, ArrowDownRight,
  ClipboardCheck, Briefcase,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const iconMap: Record<string, React.ComponentType<any>> = {
  Users,
  CheckCircle2,
  Activity,
  AlertTriangle,
  BookOpen,
  Code2,
  Mic,
  Zap,
  Award,
  TrendingUp,
  TrendingDown,
  Sparkles,
  MessageSquare,
  Lightbulb,
  Brain,
};

const recIcons = [Code2, Mic, MessageSquare, Zap, Brain, Lightbulb];

const staticKPIs = [
  { label: 'Total Students', value: '1,248', trend: 4.2, icon: Users, spark: [10,12,11,14,13,16,18] },
  { label: 'Placement Ready %', value: '32%', trend: 5.6, icon: CheckCircle2, spark: [20,22,24,26,28,30,32] },
  { label: 'Almost Ready %', value: '41%', trend: 1.8, icon: Activity, spark: [35,36,38,39,40,40,41] },
  { label: 'Needs Improvement %', value: '27%', trend: -2.4, icon: AlertTriangle, spark: [35,33,32,30,29,28,27] },
  { label: 'Avg Assessment Score', value: '78.2', trend: 2.7, icon: BookOpen, spark: [70,72,73,74,75,77,78] },
  { label: 'Avg Skill Test Score', value: '74.5', trend: 3.4, icon: Code2, spark: [65,67,69,70,72,73,74] },
  { label: 'Avg Mock Interview Score', value: '71.8', trend: 4.9, icon: Mic, spark: [60,62,64,66,68,70,72] },
  { label: 'Active Learners %', value: '84%', trend: 6.2, icon: Zap, spark: [70,72,75,78,80,82,84] },
  { label: 'Code Practice %', value: '68%', trend: 2.1, icon: Award, spark: [55,58,60,62,64,66,68] },
];

const staticReadinessDist = [
  { name: 'Placement Ready', value: 32, color: '#10B981' },
  { name: 'Almost Ready', value: 41, color: '#84CC16' },
  { name: 'Improving', value: 18, color: '#F59E0B' },
  { name: 'Needs Attention', value: 9, color: '#EF4444' },
];

const staticProgressTrend = [
  { month: 'Jan', PRI: 62, Assessment: 65, Skill: 60, Mock: 55 },
  { month: 'Feb', PRI: 64, Assessment: 68, Skill: 63, Mock: 58 },
  { month: 'Mar', PRI: 67, Assessment: 71, Skill: 66, Mock: 61 },
  { month: 'Apr', PRI: 70, Assessment: 73, Skill: 69, Mock: 64 },
  { month: 'May', PRI: 72, Assessment: 75, Skill: 71, Mock: 67 },
  { month: 'Jun', PRI: 74, Assessment: 77, Skill: 73, Mock: 70 },
  { month: 'Jul', PRI: 76, Assessment: 78, Skill: 74, Mock: 72 },
];

const staticFunnel = [
  { stage: 'Registered Students', value: 1248, color: '#6C63FF' },
  { stage: 'Active Learners', value: 1048, color: '#7C76FF' },
  { stage: 'Completed Assessments', value: 892, color: '#8B86FF' },
  { stage: 'Completed Skill Tests', value: 724, color: '#A29CFF' },
  { stage: 'Completed Mock Interviews', value: 512, color: '#B8B3FF' },
  { stage: 'Placement Ready', value: 399, color: '#10B981' },
];

const staticSkills = [
  { skill: 'Aptitude', score: 82, trend: 3.4 },
  { skill: 'DSA', score: 71, trend: 5.1 },
  { skill: 'Problem Solving', score: 76, trend: 2.8 },
  { skill: 'SQL', score: 68, trend: -1.2 },
  { skill: 'Communication', score: 79, trend: 4.6 },
  { skill: 'Technical Interviews', score: 73, trend: 3.9 },
  { skill: 'HR Readiness', score: 81, trend: 2.1 },
  { skill: 'Mock Interviews', score: 70, trend: 5.5 },
];

const staticMockMetrics = [
  { label: 'Avg Interview Score', value: 71.8 },
  { label: 'Communication', value: 79.2 },
  { label: 'Technical Clarity', value: 73.4 },
  { label: 'Completion Rate', value: 68.0 },
];


const staticRecommendations: Array<{ title: string; desc: string; icon: any; category?: string }> = [
  { title: 'Increase SQL practice assessments', desc: 'SQL scores are trending down. Add 2 weekly practice sets.', icon: Code2, category: 'Overall' },
  { title: 'Encourage more mock interviews', desc: 'Only 68% completion. Schedule peer interview drives.', icon: Mic, category: 'Mock Interview' },
  { title: 'Focus on communication practice', desc: '142 students show low clarity in spoken responses.', icon: MessageSquare, category: 'Assessment' },
  { title: 'Improve coding consistency', desc: '38% of learners practice <2 days/week. Push streak goals.', icon: Zap, category: 'Code Practice' },
  { title: 'Schedule advanced DSA tests', desc: 'Top 200 students plateauing. Introduce hard-tier problems.', icon: Brain, category: 'Learning' },
];

const scoreColor = (v: number) =>
  v >= 85 ? 'text-emerald-600' : v >= 70 ? 'text-amber-600' : 'text-red-600';

const Sparkline = ({ data, positive }: { data: number[]; positive: boolean }) => {
  const chartData = (data && data.length > 0) ? data.map((v, i) => ({ i, v })) : [0,0,0,0,0].map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={chartData}>
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
};

const PlacementDashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading } = usePlacementStats();
  const { batchIds: batches, isLoading: batchesLoading } = useBatchIds();
  const [year, setYear] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [readinessStatus, setReadinessStatus] = useState('');

  // Fetch KPI data dynamically
  const { data: kpiData, isLoading: kpisLoading } = usePlacementKPIs(
    year,
    'all',
    skillCategory,
    readinessStatus
  );

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    if (kpiData?.kpis) {
      const kpiSheet = XLSX.utils.json_to_sheet(kpiData.kpis.map(k => ({ Metric: k.label, Value: k.value })));
      XLSX.utils.book_append_sheet(wb, kpiSheet, "KPIs");
    }
    if (kpiData?.funnel) {
      const funnelSheet = XLSX.utils.json_to_sheet(kpiData.funnel.map(f => ({ Stage: f.stage, Count: f.value })));
      XLSX.utils.book_append_sheet(wb, funnelSheet, "Funnel");
    }
    if (kpiData?.skills) {
      const skillSheet = XLSX.utils.json_to_sheet(kpiData.skills.map(s => ({ Skill: s.skill, Score: s.score })));
      XLSX.utils.book_append_sheet(wb, skillSheet, "Skills");
    }
    if (kpiData?.mockMetrics) {
      const mockSheet = XLSX.utils.json_to_sheet(kpiData.mockMetrics.map(m => ({ Metric: m.label, Score: m.value })));
      XLSX.utils.book_append_sheet(wb, mockSheet, "Mock Metrics");
    }
    XLSX.writeFile(wb, "Placement_Dashboard_Report.xlsx");
    toast.success("Excel report downloaded successfully!");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Dashboard link copied to clipboard!");
  };

  // Map backend kpi icons & values
  const currentKPIs = kpiData?.kpis.map((k) => ({
    ...k,
    icon: iconMap[k.icon] || Users,
  })) || staticKPIs.map(k => ({ ...k, icon: iconMap[k.label] || k.icon || Users }));

  const currentReadinessDist = kpiData?.readinessDist || staticReadinessDist;
  const currentProgressTrend = kpiData?.progressTrend || staticProgressTrend;
  const currentFunnel = kpiData?.funnel || staticFunnel;
  // Keep a stable skills list — only update when real API data arrives.
  // Prevents flicker to static data or blank while refetching.
  const stableSkillsRef = useRef(kpiData?.skills || staticSkills);
  useEffect(() => {
    if (kpiData?.skills && kpiData.skills.length > 0) {
      stableSkillsRef.current = kpiData.skills;
    }
  }, [kpiData?.skills]);
  const currentSkills = stableSkillsRef.current;

  // Calculate assessment analytics dynamically
  const totalSt = kpiData?.funnel?.[0]?.value || 1248;
  const completedAssess = kpiData?.funnel?.[2]?.value || 892;
  const pendingAssess = Math.max(0, totalSt - completedAssess);
  const strongestSkill = currentSkills.reduce((max, s) => s.score > max.score ? s : max, currentSkills[0] || { skill: 'Aptitude', score: 0 });
  const weakestSkill = currentSkills.reduce((min, s) => s.score < min.score ? s : min, currentSkills[0] || { skill: 'SQL', score: 100 });

  const currentMockMetrics = (kpiData?.mockMetrics || staticMockMetrics).filter(
    m => m.label !== 'Confidence' && m.label !== 'HR Readiness'
  );

  const currentRecommendations = kpiData?.recommendations.map((r, idx) => ({
    ...r,
    icon: (r.icon && iconMap[r.icon]) ? iconMap[r.icon] : recIcons[idx % recIcons.length]
  })) || staticRecommendations;

  const categoryStyles: Record<string, { bg: string; text: string; dot: string }> = {
    'Overall':        { bg: 'bg-[#EDE9FF]', text: 'text-[#5B4FCF]', dot: 'bg-[#6C63FF]' },
    'Assessment':     { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
    'Mock Interview': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    'Skill Test':     { bg: 'bg-cyan-50',   text: 'text-cyan-700',   dot: 'bg-cyan-500' },
    'Code Practice':  { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
    'Learning':       { bg: 'bg-emerald-50',text: 'text-emerald-700',dot: 'bg-emerald-500' },
  };

  const currentAIFeedback = kpiData?.aiFeedback || {
    strengths: [
      "Strong communication clarity",
      "Good technical understanding",
      "Confident HR responses"
    ],
    weaknesses: [
      "Low confidence under pressure",
      "Weak problem explanation",
      "HR storytelling needs work"
    ]
  };

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
              Yuvro — AI-Powered Placement Intelligence & Student Success Platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-lg print:hidden" onClick={() => window.print()}>
              <FileText className="h-4 w-4 mr-1.5" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg print:hidden" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Export Excel
            </Button>
            <Button size="sm" className="rounded-lg bg-[#6C63FF] hover:bg-[#5b53e6] print:hidden" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1.5" /> Share
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/60 shadow-sm rounded-2xl">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Select value={year} onValueChange={(val) => { setYear(val); setSkillCategory(''); setReadinessStatus(''); }}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Select Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches?.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i).map(batch => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={skillCategory} onValueChange={(val) => { setSkillCategory(val); setReadinessStatus(''); }} disabled={!year}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Select Skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                {currentSkills.map(s => (
                  <SelectItem key={s.skill} value={s.skill.toLowerCase()}>
                    {s.skill}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={readinessStatus} onValueChange={setReadinessStatus} disabled={!skillCategory}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
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
                  <div className="text-2xl font-semibold tracking-tight">{isLoading ? '...' : (stats?.totalSelected ?? 0)}</div>
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
          {kpisLoading ? (
            Array.from({ length: 9 }).map((_, idx) => (
              <Card key={idx} className="border-border/60 shadow-sm rounded-2xl animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="h-8 w-8 rounded-lg bg-muted" />
                    <div className="h-4 w-10 rounded bg-muted" />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-6 w-16 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                  <div className="mt-3 h-9 rounded bg-muted/50" />
                </CardContent>
              </Card>
            ))
          ) : (
            currentKPIs.map((k) => {
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
            })
          )}
        </div>

        {/* Readiness Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-border/60 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Readiness Distribution</CardTitle>
              <p className="text-xs text-muted-foreground">PRI category breakdown</p>
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <div className="h-[240px] flex items-center justify-center">
                  <div className="h-24 w-24 rounded-full border-4 border-[#6C63FF]/30 border-t-[#6C63FF] animate-spin" />
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={currentReadinessDist} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                        {currentReadinessDist.map((e) => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {currentReadinessDist.map(r => (
                      <div key={r.name} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                        <span className="text-muted-foreground flex-1 truncate">{r.name}</span>
                        <span className="font-medium">{r.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm rounded-2xl lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Placement Readiness Progress</CardTitle>
              <p className="text-xs text-muted-foreground">PRI, assessment, skill & mock growth over time</p>
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <div className="h-[260px] flex items-center justify-center animate-pulse bg-muted/40 rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={currentProgressTrend} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
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
              )}
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
            {kpisLoading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-44 h-4 bg-muted rounded" />
                    <div className="flex-1 h-9 bg-muted/40 rounded-lg" />
                    <div className="w-20 h-4 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {currentFunnel.map((f, i) => {
                  const pct = currentFunnel[0].value > 0 ? (f.value / currentFunnel[0].value) * 100 : 0;
                  const conv = i > 0 && currentFunnel[i - 1].value > 0 ? ((f.value / currentFunnel[i - 1].value) * 100).toFixed(1) : null;
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
                          <span className="text-muted-foreground">{conv}%</span>
                        ) : (
                          <span className="text-muted-foreground">100%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skill Readiness */}
        <Card className="border-border/60 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Skill Readiness Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">Average scores & trends across skill categories</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpisLoading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-28 bg-muted rounded" />
                      <div className="h-4 w-12 bg-muted rounded" />
                    </div>
                    <div className="h-2 w-full bg-muted/40 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              currentSkills.map(s => (
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
              ))
            )}
          </CardContent>
        </Card>

        {/* Assessment Analytics */}
        <Card className="border-border/60 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Assessment Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {kpisLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="rounded-xl bg-muted/30 p-3 animate-pulse space-y-2">
                    <div className="h-3 w-16 bg-muted rounded" />
                    <div className="h-5 w-20 bg-muted rounded" />
                  </div>
                ))
              ) : (
                [
                  { l: 'Completed', v: completedAssess.toLocaleString(), tone: 'text-foreground' },
                  { l: 'Pending', v: pendingAssess.toLocaleString(), tone: 'text-amber-600' },
                  { l: 'Avg Growth', v: '+18.4%', tone: 'text-emerald-600' },
                  { l: 'Strongest Area', v: strongestSkill.skill, tone: 'text-emerald-600' },
                  { l: 'Weakest Area', v: weakestSkill.skill, tone: 'text-red-600' },
                ].map(x => (
                  <div key={x.l} className="rounded-xl bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground">{x.l}</div>
                    <div className={`text-lg font-semibold mt-1 ${x.tone}`}>{x.v}</div>
                  </div>
                ))
              )}
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {kpisLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="rounded-xl border border-border/60 p-3 animate-pulse space-y-3">
                      <div className="h-3 w-24 bg-muted rounded" />
                      <div className="h-6 w-12 bg-muted rounded" />
                      <div className="h-1.5 w-full bg-muted/40 rounded" />
                    </div>
                  ))
                ) : (
                  currentMockMetrics.map(m => (
                    <div key={m.label} className="rounded-xl border border-border/60 p-3 bg-gradient-to-br from-white to-[#F3F2FF]/30">
                      <div className="text-xs text-muted-foreground">{m.label}</div>
                      <div className={`text-xl font-semibold mt-1 ${scoreColor(m.value)}`}>{m.value.toFixed(1)}</div>
                      <Progress value={m.value} className="h-1.5 mt-2" />
                    </div>
                  ))
                )}
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
              {kpisLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div>
                    <div className="h-3 w-16 bg-muted rounded mb-2" />
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-muted/40 rounded" />
                      <div className="h-4 w-5/6 bg-muted/40 rounded" />
                    </div>
                  </div>
                  <div>
                    <div className="h-3 w-20 bg-muted rounded mb-2" />
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-muted/40 rounded" />
                      <div className="h-4 w-4/5 bg-muted/40 rounded" />
                    </div>
                  </div>
                </div>
              ) : (currentAIFeedback.strengths.length === 0 && currentAIFeedback.weaknesses.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed border-border/60 rounded-xl bg-muted/5 min-h-[160px]">
                  <div className="h-10 w-10 rounded-full bg-[#F3F2FF] flex items-center justify-center mb-3">
                    <Brain className="h-5 w-5 text-[#6C63FF]" />
                  </div>
                  <h3 className="text-xs font-semibold text-foreground">No Feedback Available</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px] mx-auto leading-relaxed">
                    Awaiting student mock interview submissions to generate dynamic AI strengths and weaknesses.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="text-xs font-medium text-emerald-700 mb-1.5">Strengths</div>
                    <ul className="space-y-1 text-xs text-foreground/80">
                      {currentAIFeedback.strengths.map((str, idx) => (
                        <li key={idx} className="flex gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          {str}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-red-700 mb-1.5">Weaknesses</div>
                    <ul className="space-y-1 text-xs text-foreground/80">
                      {currentAIFeedback.weaknesses.map((weak, idx) => (
                        <li key={idx} className="flex gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                          {weak}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>


        {/* AI Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-[#6C63FF]" />
            <h2 className="text-base font-semibold">AI Recommendations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {kpisLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="border-border/60 shadow-sm rounded-2xl animate-pulse">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted shrink-0" />
                      <div className="h-4 w-32 bg-muted rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-muted/40 rounded" />
                      <div className="h-3 w-5/6 bg-muted/40 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              currentRecommendations.map(r => {
                const Icon = r.icon;
                const cat = r.category || 'Overall';
                const catStyle = categoryStyles[cat] || categoryStyles['Overall'];
                return (
                  <Card key={r.title} className="border-border/60 shadow-sm rounded-2xl hover:shadow-md transition-all hover:-translate-y-0.5 bg-gradient-to-br from-white to-[#F3F2FF]/30">
                    <CardContent className="p-4 flex flex-col gap-2.5">
                      {/* Category Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${catStyle.bg} ${catStyle.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${catStyle.dot}`} />
                          {cat}
                        </span>
                      </div>
                      {/* Icon + Title */}
                      <div className="flex items-start gap-2">
                        <div className={`h-8 w-8 rounded-lg ${catStyle.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className={`h-4 w-4 ${catStyle.text}`} />
                        </div>
                        <div className="text-sm font-semibold leading-snug flex-1">{r.title}</div>
                      </div>
                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PlacementLayout>
  );
};

export default PlacementDashboard;

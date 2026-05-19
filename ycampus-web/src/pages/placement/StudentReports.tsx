import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import PlacementSidebar from '@/components/placement/PlacementSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  FileText, FileSpreadsheet, Share2, TrendingUp, TrendingDown, Users, Target, CheckCircle2,
  AlertTriangle, Activity, Brain, Sparkles, ChevronDown, ChevronRight, Award, BookOpen,
  Mic, Code2, MessageSquare, Lightbulb, Zap, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

// ---------- Dummy data ----------
const kpis = [
  { label: 'Total Students', value: '1,248', trend: 4.2, icon: Users, spark: [10,12,11,14,13,16,18] },
  { label: 'Avg PRI Score', value: '76.4', trend: 3.1, icon: Target, spark: [60,62,65,67,70,73,76] },
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

const students = [
  { id: 1, name: 'Aarav Sharma', pri: 88, assessment: 90, skill: 86, mock: 84, progress: 92, status: 'Ready' },
  { id: 2, name: 'Priya Mehta', pri: 82, assessment: 85, skill: 80, mock: 78, progress: 85, status: 'Ready' },
  { id: 3, name: 'Rohan Gupta', pri: 74, assessment: 76, skill: 72, mock: 70, progress: 71, status: 'Almost' },
  { id: 4, name: 'Sneha Reddy', pri: 91, assessment: 93, skill: 89, mock: 90, progress: 95, status: 'Ready' },
  { id: 5, name: 'Vikram Patel', pri: 58, assessment: 62, skill: 55, mock: 52, progress: 48, status: 'Improve' },
  { id: 6, name: 'Ananya Iyer', pri: 77, assessment: 80, skill: 74, mock: 72, progress: 76, status: 'Almost' },
  { id: 7, name: 'Karthik Nair', pri: 69, assessment: 72, skill: 66, mock: 64, progress: 62, status: 'Improve' },
  { id: 8, name: 'Divya Joshi', pri: 85, assessment: 87, skill: 84, mock: 82, progress: 88, status: 'Ready' },
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

// ---------- Helpers ----------
const statusBadge = (s: string) => {
  if (s === 'Ready') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Placement Ready</Badge>;
  if (s === 'Almost') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">Almost Ready</Badge>;
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">Needs Improvement</Badge>;
};

const scoreColor = (v: number) =>
  v >= 85 ? 'text-emerald-600' : v >= 70 ? 'text-amber-600' : 'text-red-600';

const Sparkline = ({ data, positive }: { data: number[]; positive: boolean }) => (
  <ResponsiveContainer width="100%" height={36}>
    <AreaChart data={data.map((v, i) => ({ i, v }))}>
      <defs>
        <linearGradient id={`sp-${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? '#10B981' : '#EF4444'} stopOpacity={0.35} />
          <stop offset="100%" stopColor={positive ? '#10B981' : '#EF4444'} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={positive ? '#10B981' : '#EF4444'} strokeWidth={1.6} fill={`url(#sp-${positive ? 'g' : 'r'})`} />
    </AreaChart>
  </ResponsiveContainer>
);

// ---------- Page ----------
const PlacementStudentReports = () => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [year, setYear] = useState('2025-26');
  const [assessmentType, setAssessmentType] = useState('all');
  const [skillCategory, setSkillCategory] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [readinessStatus, setReadinessStatus] = useState('all');

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden bg-[#FAFAFC]">
        <PlacementSidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-[1500px] mx-auto space-y-6">

              {/* Header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#6C63FF] to-[#8B86FF] flex items-center justify-center shadow-sm">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">PRI Report</h1>
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
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Academic Year" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-26">Academic Year 2025-26</SelectItem>
                      <SelectItem value="2024-25">Academic Year 2024-25</SelectItem>
                      <SelectItem value="2023-24">Academic Year 2023-24</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={assessmentType} onValueChange={setAssessmentType}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Assessment Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assessments</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={skillCategory} onValueChange={setSkillCategory}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Skill Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Skills</SelectItem>
                      <SelectItem value="aptitude">Aptitude</SelectItem>
                      <SelectItem value="dsa">DSA</SelectItem>
                      <SelectItem value="sql">SQL</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Date Range" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="ytd">Year to date</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={readinessStatus} onValueChange={setReadinessStatus}>
                    <SelectTrigger className="rounded-lg"><SelectValue placeholder="Readiness Status" /></SelectTrigger>
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

              {/* Student Performance Table */}
              <Card className="border-border/60 shadow-sm rounded-2xl">
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Student Performance</CardTitle>
                    <p className="text-xs text-muted-foreground">Click a row to expand detailed intelligence</p>
                  </div>
                  <Input placeholder="Search students..." className="max-w-xs rounded-lg" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b border-border/60">
                          <th className="text-left font-medium px-4 py-3 w-8"></th>
                          <th className="text-left font-medium px-4 py-3">Student</th>
                          <th className="text-center font-medium px-4 py-3">PRI</th>
                          <th className="text-center font-medium px-4 py-3">Assessment</th>
                          <th className="text-center font-medium px-4 py-3">Skill Test</th>
                          <th className="text-center font-medium px-4 py-3">Mock</th>
                          <th className="text-left font-medium px-4 py-3 w-40">Progress</th>
                          <th className="text-left font-medium px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(s => (
                          <React.Fragment key={s.id}>
                            <tr
                              className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                            >
                              <td className="px-4 py-3">
                                {expanded === s.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              </td>
                              <td className="px-4 py-3 font-medium">{s.name}</td>
                              <td className={`px-4 py-3 text-center font-semibold ${scoreColor(s.pri)}`}>{s.pri}</td>
                              <td className="px-4 py-3 text-center">{s.assessment}</td>
                              <td className="px-4 py-3 text-center">{s.skill}</td>
                              <td className="px-4 py-3 text-center">{s.mock}</td>
                              <td className="px-4 py-3"><Progress value={s.progress} className="h-2" /></td>
                              <td className="px-4 py-3">{statusBadge(s.status)}</td>
                            </tr>
                            {expanded === s.id && (
                              <tr className="bg-[#FAFAFC]">
                                <td colSpan={8} className="px-6 py-5">
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="rounded-xl bg-white border border-border/60 p-4">
                                      <div className="text-xs font-medium text-muted-foreground mb-2">PRI Growth Timeline</div>
                                      <ResponsiveContainer width="100%" height={120}>
                                        <AreaChart data={progressTrend}>
                                          <defs>
                                            <linearGradient id={`g-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="0%" stopColor="#6C63FF" stopOpacity={0.4} />
                                              <stop offset="100%" stopColor="#6C63FF" stopOpacity={0} />
                                            </linearGradient>
                                          </defs>
                                          <Area type="monotone" dataKey="PRI" stroke="#6C63FF" fill={`url(#g-${s.id})`} strokeWidth={2} />
                                        </AreaChart>
                                      </ResponsiveContainer>
                                    </div>
                                    <div className="rounded-xl bg-white border border-border/60 p-4 space-y-2">
                                      <div className="text-xs font-medium text-muted-foreground mb-1">Skill Progress</div>
                                      {skills.slice(0, 4).map(sk => (
                                        <div key={sk.skill}>
                                          <div className="flex justify-between text-xs mb-0.5"><span>{sk.skill}</span><span className="font-medium">{sk.score}</span></div>
                                          <Progress value={sk.score} className="h-1.5" />
                                        </div>
                                      ))}
                                    </div>
                                    <div className="rounded-xl bg-white border border-border/60 p-4">
                                      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-[#6C63FF]" /> AI Insights
                                      </div>
                                      <ul className="space-y-1.5 text-xs text-foreground/80">
                                        <li>• Top 15% in assessment growth this quarter</li>
                                        <li>• Mock interview confidence trending up (+8%)</li>
                                        <li>• Recommend SQL deep-dive sessions</li>
                                        <li>• Schedule advanced DSA mock</li>
                                      </ul>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PlacementStudentReports;

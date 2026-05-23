import React, { useState, useRef, useEffect } from 'react';
import { useBatchIds } from '@/hooks/useBatchIds';
import { usePlacementKPIs } from '@/hooks/usePlacementKPIs';
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
  { label: 'Technical Clarity', value: 73.4 },
  { label: 'Completion Rate', value: 68.0 },
];

// Mock data removed in favor of real backend data

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
  const [year, setYear] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [readinessStatus, setReadinessStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { batchIds: batches } = useBatchIds();
  const { data: kpiData } = usePlacementKPIs(year, 'all', skillCategory, readinessStatus);

  // Keep a stable skills list — only update when real API data arrives.
  // This prevents the dropdown from flickering to static placeholder data
  // or showing blank while a refetch is in-flight.
  const stableSkillsRef = useRef(kpiData?.skills || skills);
  useEffect(() => {
    if (kpiData?.skills && kpiData.skills.length > 0) {
      stableSkillsRef.current = kpiData.skills;
    }
  }, [kpiData?.skills]);
  const currentSkills = stableSkillsRef.current;
  const currentStudents = kpiData?.students || [];

  const totalPages = Math.ceil(currentStudents.length / pageSize) || 1;
  const paginatedStudents = currentStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
                    <h1 className="text-2xl font-semibold tracking-tight">Student Reports</h1>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 ml-11">
                    Yuvro — AI-Powered Placement Intelligence & Student Success Platform
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
                <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Select value={year} onValueChange={(val) => { setYear(val); setSkillCategory(''); setReadinessStatus(''); setCurrentPage(1); }}>
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
                  <Select value={skillCategory} onValueChange={(val) => { setSkillCategory(val); setReadinessStatus(''); setCurrentPage(1); }} disabled={!year}>
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
                  <Select value={readinessStatus} onValueChange={(val) => { setReadinessStatus(val); setCurrentPage(1); }} disabled={!skillCategory}>
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
                        {paginatedStudents.map(s => (
                          <React.Fragment key={s.id}>
                            <tr
                              className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                            >
                              <td className="px-4 py-3">
                                {expanded === s.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              </td>
                              <td className="px-4 py-3 font-medium">{s.name}</td>
                              <td className={`px-4 py-3 text-center font-semibold ${scoreColor(s.final_score)}`}>{s.final_score.toFixed(1)}</td>
                              <td className="px-4 py-3 text-center">{s.assess_score.toFixed(1)}</td>
                              <td className="px-4 py-3 text-center">{s.skill_score.toFixed(1)}</td>
                              <td className="px-4 py-3 text-center">{s.mock_score.toFixed(1)}</td>
                              <td className="px-4 py-3"><Progress value={s.learning_score} className="h-2" /></td>
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
                                      {Object.entries(s.subject_scores || {}).slice(0, 4).map(([skill, score]) => (
                                        <div key={skill}>
                                          <div className="flex justify-between text-xs mb-0.5"><span>{skill}</span><span className="font-medium">{score.toFixed(1)}</span></div>
                                          <Progress value={score} className="h-1.5" />
                                        </div>
                                      ))}
                                      {Object.keys(s.subject_scores || {}).length === 0 && (
                                        <div className="text-xs text-muted-foreground italic">No skill data available.</div>
                                      )}
                                    </div>
                                    <div className="rounded-xl bg-white border border-border/60 p-4">
                                      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-[#6C63FF]" /> AI Insights
                                      </div>
                                      <ul className="space-y-1.5 text-xs text-foreground/80">
                                        {s.final_score >= 80 ? (
                                          <li>• Top performer, ready for MAANG level interviews</li>
                                        ) : s.final_score >= 50 ? (
                                          <li>• Showing steady progress, focus on consistency</li>
                                        ) : (
                                          <li>• Needs immediate attention and remedial sessions</li>
                                        )}
                                        
                                        {Object.entries(s.subject_scores || {}).length > 0 && (
                                          <>
                                            <li>• Strongest area: {Object.entries(s.subject_scores).reduce((max, [k, v]) => v > max[1] ? [k, v] : max, ["", 0])[0]}</li>
                                            <li>• Recommend deep-dive in: {Object.entries(s.subject_scores).reduce((min, [k, v]) => v < min[1] ? [k, v] : min, ["", 100])[0]}</li>
                                          </>
                                        )}
                                        
                                        {s.mock_score < 60 && <li>• Schedule additional mock interviews for confidence</li>}
                                        {s.practice_score < 50 && <li>• Increase daily coding streak to build problem-solving skills</li>}
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
                  
                  {/* Pagination Controls */}
                  {currentStudents.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Show</span>
                        <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                          <SelectTrigger className="h-8 w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                          </SelectContent>
                        </Select>
                        <span>entries</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, currentStudents.length)} of {currentStudents.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-3" 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-3" 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
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

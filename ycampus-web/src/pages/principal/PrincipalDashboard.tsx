import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PrincipalSidebar } from '@/components/principal/PrincipalSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Users, UserCheck, Building2, LayoutGrid, TrendingUp, TrendingDown,
  BookOpen, AlertTriangle, Download, Lightbulb, Target, Brain,
  ChevronUp, ChevronDown, Shield, GraduationCap, FileText,
  ClipboardCheck, Minus, BarChart3,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { usePrincipalDashboardData } from '@/hooks/usePrincipalDashboardData';

const SAFFRON = '#F59E0B';
const GREEN = '#10B981';
const SAFFRON_LIGHT = '#FEF3C7';
const GREEN_LIGHT = '#D1FAE5';
const RED_LIGHT = '#FEE2E2';
const RED = '#EF4444';
const BLUE = '#3B82F6';
const GRAY = '#6B7280';

const PIE_COLORS = [GREEN, BLUE, SAFFRON, RED];

const PrincipalDashboard = () => {
  const [filters, setFilters] = useState({
    academicYear: '2025-26',
    department: 'all',
    semester: 'all',
    batch: 'all',
    dateRange: 'full-year',
  });

  const { data, isLoading } = usePrincipalDashboardData(filters);

  if (isLoading || !data) {
    return (
      <SidebarProvider>
        <div className="h-screen flex w-full overflow-hidden">
          <PrincipalSidebar />
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <main className="flex-1 p-6 bg-background flex items-center justify-center">
              <div className="text-muted-foreground">Loading dashboard...</div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const { summary, departmentRanking, semesterPerformance, topSections, bottomSections, studentDistribution, priInsights, riskAlerts, trends, strongSubjects, weakSubjects, facultyImpact, attendanceOverview, aiInsights } = data;

  const pieData = [
    { name: 'Excellent (85+)', value: studentDistribution.excellent },
    { name: 'Good (70–84)', value: studentDistribution.good },
    { name: 'Moderate (55–69)', value: studentDistribution.moderate },
    { name: 'At Risk (<55)', value: studentDistribution.atRisk },
  ];

  const totalStudents = studentDistribution.excellent + studentDistribution.good + studentDistribution.moderate + studentDistribution.atRisk;

  const riskByType = {
    academic: riskAlerts.filter(r => r.type === 'academic'),
    engagement: riskAlerts.filter(r => r.type === 'engagement'),
    placement: riskAlerts.filter(r => r.type === 'placement'),
    operational: riskAlerts.filter(r => r.type === 'operational'),
  };

  const trendIcon = (t: string) => {
    if (t === 'up') return <ChevronUp className="h-3 w-3 text-emerald-600" />;
    if (t === 'down') return <ChevronDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <PrincipalSidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <main className="flex-1 p-4 md:p-6 bg-background overflow-y-auto">
            <div className="max-w-[1400px] mx-auto space-y-6">
              <h1 className="text-2xl font-bold">Dashboard</h1>

              {/* GLOBAL FILTERS */}
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex flex-wrap gap-3">
                    <Select value={filters.academicYear || ""} onValueChange={v => setFilters(f => ({ ...f, academicYear: v }))}>
                      <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025-26">2025–26</SelectItem>
                        <SelectItem value="2024-25">2024–25</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.department || ""} onValueChange={v => setFilters(f => ({ ...f, department: v }))}>
                      <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departmentRanking.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filters.semester || ""} onValueChange={v => setFilters(f => ({ ...f, semester: v }))}>
                      <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Semester" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filters.batch || ""} onValueChange={v => setFilters(f => ({ ...f, batch: v }))}>
                      <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="Batch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        <SelectItem value="2022-26">2022–26</SelectItem>
                        <SelectItem value="2023-27">2023–27</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.dateRange || ""} onValueChange={v => setFilters(f => ({ ...f, dateRange: v }))}>
                      <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-year">Full Year</SelectItem>
                        <SelectItem value="last-6m">Last 6 Months</SelectItem>
                        <SelectItem value="last-3m">Last 3 Months</SelectItem>
                        <SelectItem value="last-1m">Last Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 1. INSTITUTION SUMMARY */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Institution Summary</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Students', value: summary.totalStudents.toLocaleString(), icon: Users, iconColor: 'text-blue-600' },
                    { label: 'Faculty', value: summary.totalFaculty.toString(), icon: UserCheck, iconColor: 'text-indigo-600' },
                    { label: 'Departments', value: summary.totalDepartments.toString(), icon: Building2, iconColor: 'text-slate-600' },
                    { label: 'Avg PI', value: `${summary.avgPI}%`, icon: TrendingUp, iconColor: summary.avgPI >= 70 ? 'text-emerald-600' : 'text-amber-600', valueColor: summary.avgPI >= 70 ? GREEN : SAFFRON },
                    { label: 'Attendance', value: `${summary.overallAttendance}%`, icon: ClipboardCheck, iconColor: summary.overallAttendance >= 80 ? 'text-emerald-600' : 'text-amber-600', valueColor: summary.overallAttendance >= 80 ? GREEN : SAFFRON },
                    { label: 'Avg PRI', value: `${summary.avgPRI}%`, icon: Target, iconColor: summary.avgPRI >= 60 ? 'text-emerald-600' : 'text-amber-600', valueColor: summary.avgPRI >= 60 ? GREEN : SAFFRON },
                  ].map((kpi, i) => (
                    <Card key={i} className="border">
                      <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                        <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                        <span className="text-xl font-bold" style={kpi.valueColor ? { color: kpi.valueColor } : {}}>{kpi.value}</span>
                        <span className="text-[11px] text-muted-foreground">{kpi.label}</span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                  {[
                    { label: 'Sections', value: summary.totalSections.toString(), icon: LayoutGrid, iconColor: 'text-violet-600' },
                    { label: 'Assessment Avg', value: `${summary.avgAssessmentScore}%`, icon: FileText, iconColor: 'text-cyan-600' },
                    { label: 'Task Completion', value: `${summary.taskCompletion}%`, icon: ClipboardCheck, iconColor: 'text-teal-600' },
                    { label: 'Notes Completion', value: `${summary.notesCompletion}%`, icon: BookOpen, iconColor: 'text-orange-600' },
                    { label: 'Active Students', value: `${summary.activeStudents}%`, icon: Users, iconColor: 'text-green-600' },
                    { label: 'Interview Ready', value: `${summary.interviewReady}%`, icon: GraduationCap, iconColor: 'text-rose-600' },
                  ].map((kpi, i) => (
                    <Card key={i} className="border">
                      <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                        <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                        <span className="text-lg font-semibold text-foreground">{kpi.value}</span>
                        <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 2. DEPARTMENT PERFORMANCE RANKING */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Department Performance Ranking
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Department</TableHead>
                        <TableHead className="text-xs text-center">Students</TableHead>
                        <TableHead className="text-xs text-center">Avg PI</TableHead>
                        <TableHead className="text-xs text-center">Attendance</TableHead>
                        <TableHead className="text-xs text-center">Assessment</TableHead>
                        <TableHead className="text-xs text-center">Avg PRI</TableHead>
                        <TableHead className="text-xs text-center">Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentRanking.map((d, i) => (
                        <TableRow key={d.name}>
                          <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{d.name}</TableCell>
                          <TableCell className="text-xs text-center">{d.totalStudents}</TableCell>
                          <TableCell className="text-xs text-center">
                            <span style={{ color: d.avgPI >= 75 ? GREEN : d.avgPI >= 65 ? SAFFRON : RED }}>{d.avgPI}%</span>
                          </TableCell>
                          <TableCell className="text-xs text-center">{d.attendance}%</TableCell>
                          <TableCell className="text-xs text-center">{d.assessmentAvg}%</TableCell>
                          <TableCell className="text-xs text-center">{d.avgPRI}%</TableCell>
                          <TableCell className="text-xs text-center">
                            <Badge variant={d.riskLevel === 'low' ? 'default' : d.riskLevel === 'medium' ? 'secondary' : 'destructive'} className="text-[10px]">
                              {d.riskLevel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 3. SEMESTER PERFORMANCE */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> Semester Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Semester</TableHead>
                        <TableHead className="text-xs text-center">Students</TableHead>
                        <TableHead className="text-xs text-center">Avg PI</TableHead>
                        <TableHead className="text-xs text-center">Attendance</TableHead>
                        <TableHead className="text-xs text-center">Assessment</TableHead>
                        <TableHead className="text-xs text-center">Risk Students</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {semesterPerformance.map(s => (
                        <TableRow key={s.semester}>
                          <TableCell className="text-xs font-medium">Sem {s.semester}</TableCell>
                          <TableCell className="text-xs text-center">{s.totalStudents}</TableCell>
                          <TableCell className="text-xs text-center">
                            <span style={{ color: s.avgPI >= 75 ? GREEN : s.avgPI >= 65 ? SAFFRON : RED }}>{s.avgPI}%</span>
                          </TableCell>
                          <TableCell className="text-xs text-center">{s.attendance}%</TableCell>
                          <TableCell className="text-xs text-center">{s.assessmentAvg}%</TableCell>
                          <TableCell className="text-xs text-center">
                            <span style={{ color: s.riskStudents > 30 ? RED : SAFFRON }}>{s.riskStudents}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 4. SECTION INTELLIGENCE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ChevronUp className="h-4 w-4" style={{ color: GREEN }} /> Top 5 Sections
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Section</TableHead>
                          <TableHead className="text-xs">Dept</TableHead>
                          <TableHead className="text-xs text-center">Sem</TableHead>
                          <TableHead className="text-xs text-center">PI</TableHead>
                          <TableHead className="text-xs text-center">Att.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topSections.map(s => (
                          <TableRow key={s.name}>
                            <TableCell className="text-xs font-medium">{s.name}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground">{s.department}</TableCell>
                            <TableCell className="text-xs text-center">{s.semester}</TableCell>
                            <TableCell className="text-xs text-center font-semibold" style={{ color: GREEN }}>{s.pi}%</TableCell>
                            <TableCell className="text-xs text-center">{s.attendance}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" style={{ color: RED }} /> Bottom 5 Sections
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Section</TableHead>
                          <TableHead className="text-xs">Dept</TableHead>
                          <TableHead className="text-xs text-center">Sem</TableHead>
                          <TableHead className="text-xs text-center">PI</TableHead>
                          <TableHead className="text-xs text-center">Att.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bottomSections.map(s => (
                          <TableRow key={s.name}>
                            <TableCell className="text-xs font-medium">{s.name}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground">{s.department}</TableCell>
                            <TableCell className="text-xs text-center">{s.semester}</TableCell>
                            <TableCell className="text-xs text-center font-semibold" style={{ color: RED }}>{s.pi}%</TableCell>
                            <TableCell className="text-xs text-center">{s.attendance}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* 5. STUDENT DISTRIBUTION + 6. PRI INSIGHTS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Student Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" /> Student Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div className="w-40 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" stroke="none">
                              {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx]} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => `${v} (${Math.round(v/totalStudents*100)}%)`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2">
                        {pieData.map((entry, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                              <span className="text-muted-foreground">{entry.name}</span>
                            </div>
                            <span className="font-semibold">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* PRI Insights */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" /> PRI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: GREEN_LIGHT }}>
                        <span className="text-lg font-bold" style={{ color: GREEN }}>{priInsights.interviewReady}%</span>
                        <p className="text-[10px] text-muted-foreground">Interview Ready</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: SAFFRON_LIGHT }}>
                        <span className="text-lg font-bold" style={{ color: SAFFRON }}>{priInsights.almostReady}%</span>
                        <p className="text-[10px] text-muted-foreground">Almost Ready</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Core Subjects', value: priInsights.coreSubjects },
                        { label: 'Mock Interview', value: priInsights.mockInterview },
                        { label: 'Aptitude', value: priInsights.aptitude },
                        { label: 'Logical Reasoning', value: priInsights.logicalReasoning },
                        { label: 'Communication', value: priInsights.communication },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-3">
                          <span className="text-[11px] text-muted-foreground w-28 shrink-0">{item.label}</span>
                          <Progress value={item.value} className="h-2 flex-1" />
                          <span className="text-[11px] font-medium w-8 text-right">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 7. RISK & ALERT PANEL */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" style={{ color: RED }} /> Risk & Alert Panel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(riskByType).map(([type, alerts]) => (
                      <div key={type}>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 capitalize">{type} Risks</h4>
                        <div className="space-y-2">
                          {alerts.map((a, i) => (
                            <div key={i} className="p-2.5 rounded-lg border" style={{ backgroundColor: a.severity === 'critical' ? RED_LIGHT : SAFFRON_LIGHT }}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium">{a.category}</span>
                                <Badge variant={a.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[9px] px-1.5 py-0">
                                  {a.severity}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground">{a.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 8. PERFORMANCE TRENDS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Performance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[40, 100]} />
                        <Tooltip contentStyle={{ fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="pi" name="PI" stroke={BLUE} strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="attendance" name="Attendance" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="assessment" name="Assessment" stroke={SAFFRON} strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="pri" name="PRI" stroke={GRAY} strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 9. SUBJECT / SKILL ANALYTICS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ChevronUp className="h-4 w-4" style={{ color: GREEN }} /> Strongest Subjects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {strongSubjects.map(s => (
                        <div key={s.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {trendIcon(s.trend)}
                            <span className="text-xs">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium" style={{ color: GREEN }}>{s.avgScore}%</span>
                            <span className="text-[10px] text-muted-foreground">Pass: {s.passRate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" style={{ color: RED }} /> Weakest Subjects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weakSubjects.map(s => (
                        <div key={s.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {trendIcon(s.trend)}
                            <span className="text-xs">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium" style={{ color: RED }}>{s.avgScore}%</span>
                            <span className="text-[10px] text-muted-foreground">Pass: {s.passRate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 10. FACULTY IMPACT OVERVIEW */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4" /> Faculty Impact Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Faculty</TableHead>
                        <TableHead className="text-xs">Sections</TableHead>
                        <TableHead className="text-xs text-center">Avg Student PI</TableHead>
                        <TableHead className="text-xs text-center">Subject Avg</TableHead>
                        <TableHead className="text-xs text-center">FPI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facultyImpact.map(f => (
                        <TableRow key={f.name}>
                          <TableCell className="text-xs font-medium">{f.name}</TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">{f.sections.join(', ')}</TableCell>
                          <TableCell className="text-xs text-center">{f.avgStudentPI}%</TableCell>
                          <TableCell className="text-xs text-center">{f.subjectAvg}%</TableCell>
                          <TableCell className="text-xs text-center">
                            <span className="font-bold" style={{ color: f.fpiScore >= 70 ? GREEN : f.fpiScore >= 60 ? SAFFRON : RED }}>
                              {f.fpiScore}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 11. ATTENDANCE OVERVIEW */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" /> Attendance by Department
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={attendanceOverview.departmentWise} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 10 }} domain={[60, 100]} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                          <Tooltip contentStyle={{ fontSize: 11 }} />
                          <Bar dataKey="attendance" fill={GREEN} radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" style={{ color: RED }} /> Low Attendance Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {attendanceOverview.lowAlerts.map((a, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: RED_LIGHT }}>
                          <div>
                            <span className="text-xs font-medium">{a.student}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">{a.section}</span>
                          </div>
                          <span className="text-xs font-bold" style={{ color: RED }}>{a.attendance}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 12. AI INSIGHTS & IMPROVEMENT SUGGESTIONS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Brain className="h-4 w-4" style={{ color: SAFFRON }} /> AI Insights & Improvement Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {aiInsights.map((insight, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg border"
                        style={{
                          backgroundColor: insight.type === 'warning' ? RED_LIGHT : insight.type === 'suggestion' ? SAFFRON_LIGHT : GREEN_LIGHT,
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {insight.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: RED }} />}
                          {insight.type === 'suggestion' && <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: SAFFRON }} />}
                          {insight.type === 'info' && <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: GREEN }} />}
                          <div>
                            <h5 className="text-xs font-semibold">{insight.title}</h5>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{insight.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 13. DOWNLOAD & REPORTS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Download className="h-4 w-4" /> Download Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">PDF Reports</h4>
                      <div className="space-y-2">
                        {['Institution Report', 'Department Report', 'Risk Analysis Report'].map(r => (
                          <Button key={r} variant="outline" size="sm" className="w-full justify-start text-xs h-8">
                            <FileText className="h-3 w-3 mr-2" style={{ color: RED }} /> {r}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Excel Reports</h4>
                      <div className="space-y-2">
                        {['Student Performance Data', 'Attendance Data', 'Section Analytics'].map(r => (
                          <Button key={r} variant="outline" size="sm" className="w-full justify-start text-xs h-8">
                            <BarChart3 className="h-3 w-3 mr-2" style={{ color: GREEN }} /> {r}
                          </Button>
                        ))}
                      </div>
                    </div>
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

export default PrincipalDashboard;

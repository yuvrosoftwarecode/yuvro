import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Progress } from '../../components/ui/progress';
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

// --- Theme Colors from User snippet ---
const SAFFRON = '#F59E0B';
const GREEN = '#10B981';
const SAFFRON_LIGHT = '#FEF3C7';
const GREEN_LIGHT = '#D1FAE5';
const RED_LIGHT = '#FEE2E2';
const RED = '#EF4444';
const BLUE = '#3B82F6';
const GRAY = '#6B7280';

const PIE_COLORS = [GREEN, BLUE, SAFFRON, RED];

// --- Mock Data and Hook ---
const mockData = {
  summary: {
    totalStudents: 2450,
    totalFaculty: 128,
    totalDepartments: 6,
    avgPI: 74,
    overallAttendance: 82,
    avgPRI: 62,
    totalSections: 48,
    avgAssessmentScore: 71,
    taskCompletion: 68,
    notesCompletion: 61,
    activeStudents: 89,
    interviewReady: 34
  },
  departmentRanking: [
    { name: 'Computer Science', totalStudents: 620, avgPI: 82, attendance: 87, assessmentAvg: 78, avgPRI: 71, riskLevel: 'low' },
    { name: 'Electronics & Comm.', totalStudents: 480, avgPI: 76, attendance: 83, assessmentAvg: 73, avgPRI: 64, riskLevel: 'low' },
    { name: 'Information Technology', totalStudents: 390, avgPI: 73, attendance: 80, assessmentAvg: 70, avgPRI: 60, riskLevel: 'medium' },
    { name: 'Mechanical', totalStudents: 340, avgPI: 68, attendance: 78, assessmentAvg: 65, avgPRI: 52, riskLevel: 'medium' },
    { name: 'Civil', totalStudents: 310, avgPI: 64, attendance: 75, assessmentAvg: 62, avgPRI: 48, riskLevel: 'high' }
  ],
  semesterPerformance: [
    { semester: 1, totalStudents: 420, avgPI: 70, attendance: 84, assessmentAvg: 68, riskStudents: 38 },
    { semester: 2, totalStudents: 410, avgPI: 72, attendance: 82, assessmentAvg: 70, riskStudents: 32 },
    { semester: 3, totalStudents: 380, avgPI: 68, attendance: 79, assessmentAvg: 65, riskStudents: 45 },
    { semester: 4, totalStudents: 360, avgPI: 74, attendance: 81, assessmentAvg: 72, riskStudents: 28 },
    { semester: 5, totalStudents: 340, avgPI: 78, attendance: 85, assessmentAvg: 75, riskStudents: 22 }
  ],
  topSections: [
    { name: 'CSE-6A', department: 'Computer Science', semester: 6, pi: 88, attendance: 92 },
    { name: 'CSE-8A', department: 'Computer Science', semester: 8, pi: 86, attendance: 91 },
    { name: 'ECE-6A', department: 'Electronics & Comm.', semester: 6, pi: 84, attendance: 89 }
  ],
  bottomSections: [
    { name: 'EE-3B', department: 'Electrical', semester: 3, pi: 54, attendance: 68 },
    { name: 'CE-3A', department: 'Civil', semester: 3, pi: 56, attendance: 70 },
    { name: 'ME-3B', department: 'Mechanical', semester: 3, pi: 58, attendance: 71 }
  ],
  studentDistribution: { excellent: 412, good: 834, moderate: 728, atRisk: 476 },
  priInsights: { interviewReady: 34, almostReady: 28, coreSubjects: 68, mockInterview: 55, aptitude: 62, logicalReasoning: 59, communication: 52 },
  riskAlerts: [
    { type: 'academic', category: 'Low PI Students', description: '476 students below PI 55', severity: 'critical' },
    { type: 'academic', category: 'Low Assessment Scores', description: '312 students scoring below 50%', severity: 'warning' },
    { type: 'engagement', category: 'Low Attendance', description: '287 students below 75%', severity: 'critical' },
    { type: 'placement', category: 'Low PRI', description: '931 students with PRI below 50', severity: 'critical' },
    { type: 'operational', category: 'Pending Tasks', description: '1230 tasks pending', severity: 'warning' }
  ],
  trends: [
    { month: 'Aug', pi: 68, attendance: 78, assessment: 64, pri: 54 },
    { month: 'Sep', pi: 70, attendance: 80, assessment: 66, pri: 56 },
    { month: 'Oct', pi: 72, attendance: 82, assessment: 69, pri: 58 },
    { month: 'Nov', pi: 71, attendance: 80, assessment: 68, pri: 59 },
    { month: 'Dec', pi: 73, attendance: 81, assessment: 70, pri: 61 }
  ],
  strongSubjects: [
     { name: 'Data Structures', avgScore: 82, passRate: 94, trend: 'up' },
     { name: 'Computer Networks', avgScore: 78, passRate: 91, trend: 'up' }
  ],
  weakSubjects: [
     { name: 'Operating Systems', avgScore: 54, passRate: 62, trend: 'down' },
     { name: 'Thermodynamics', avgScore: 52, passRate: 58, trend: 'down' }
  ],
  facultyImpact: [
     { name: 'Dr. John Doe', sections: ['CSE-6A', 'CSE-8A'], avgStudentPI: 85, subjectAvg: 82, fpiScore: 88 },
     { name: 'Prof. Jane Smith', sections: ['ECE-6A', 'ECE-4B'], avgStudentPI: 79, subjectAvg: 76, fpiScore: 81 }
  ],
  attendanceOverview: {
     departmentWise: [
        { name: 'Computer Science', attendance: 87 },
        { name: 'Electronics & Comm.', attendance: 83 },
        { name: 'Information Technology', attendance: 80 },
        { name: 'Mechanical', attendance: 78 }
     ],
     lowAlerts: [
        { student: 'Alex Johnson', section: 'EE-3B', attendance: 52 },
        { student: 'Maria Garcia', section: 'ME-3B', attendance: 58 }
     ]
  },
  aiInsights: [
     { title: 'Attention Required', description: 'Mechanical department shows declining attendance for 3 consecutive weeks.', type: 'warning' },
     { title: 'Optimization Suggestion', description: 'Consider scheduling extra tutorials for Thermodynamics, pass rate is below threshold.', type: 'suggestion' },
     { title: 'Positive Trend', description: 'Computer Science PI improved by 4% compared to last month.', type: 'info' }
  ]
};

const usePrincipalDashboardData = (filters: any) => {
  const [data, setData] = useState<typeof mockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setData(mockData);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  return { data, isLoading };
};

// --- Main component ---
const PrincipalDashboard = () => {
  const { user } = useAuth();
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
      <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
        <RoleSidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <RoleHeader
            title={'Principal Dashboard'}
            subtitle={`Welcome back, ${user?.first_name || user?.username || 'Principal'}! 👋`}
          />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="text-muted-foreground animate-pulse">Loading dashboard...</div>
          </main>
        </div>
      </div>
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
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      <RoleSidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <RoleHeader
          title={'Principal Dashboard'}
          subtitle={`Welcome back, ${user?.first_name || user?.username || 'Principal'}! 👋`}
        />

        <main className="flex-1 p-4 md:p-6 bg-slate-50 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto space-y-6">

            {/* GLOBAL FILTERS */}
            <Card className="border border-gray-300 bg-white">
              <CardContent className="pt-4 pb-3">
                <div className="flex flex-wrap gap-3">
                  <Select value={filters.academicYear} onValueChange={v => setFilters(f => ({ ...f, academicYear: v }))}>
                    <SelectTrigger className="w-[140px] h-9 text-xs border-gray-300"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-26">2025–26</SelectItem>
                      <SelectItem value="2024-25">2024–25</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.department} onValueChange={v => setFilters(f => ({ ...f, department: v }))}>
                    <SelectTrigger className="w-[160px] h-9 text-xs border-gray-300"><SelectValue placeholder="Department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departmentRanking.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.semester} onValueChange={v => setFilters(f => ({ ...f, semester: v }))}>
                    <SelectTrigger className="w-[130px] h-9 text-xs border-gray-300"><SelectValue placeholder="Semester" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.batch} onValueChange={v => setFilters(f => ({ ...f, batch: v }))}>
                    <SelectTrigger className="w-[120px] h-9 text-xs border-gray-300"><SelectValue placeholder="Batch" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      <SelectItem value="2022-26">2022–26</SelectItem>
                      <SelectItem value="2023-27">2023–27</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.dateRange} onValueChange={v => setFilters(f => ({ ...f, dateRange: v }))}>
                    <SelectTrigger className="w-[120px] h-9 text-xs border-gray-300"><SelectValue /></SelectTrigger>
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
                  { label: 'Students', value: summary.totalStudents.toLocaleString(), icon: Users, accent: false },
                  { label: 'Faculty', value: summary.totalFaculty.toString(), icon: UserCheck, accent: false },
                  { label: 'Departments', value: summary.totalDepartments.toString(), icon: Building2, accent: false },
                  { label: 'Avg PI', value: `${summary.avgPI}%`, icon: TrendingUp, accent: true, color: summary.avgPI >= 70 ? GREEN : SAFFRON },
                  { label: 'Attendance', value: `${summary.overallAttendance}%`, icon: ClipboardCheck, accent: true, color: summary.overallAttendance >= 80 ? GREEN : SAFFRON },
                  { label: 'Avg PRI', value: `${summary.avgPRI}%`, icon: Target, accent: true, color: summary.avgPRI >= 60 ? GREEN : SAFFRON },
                ].map((kpi, i) => (
                  <Card key={i} className="border border-gray-300 bg-white shadow-sm">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                      <kpi.icon className="h-4 w-4 text-slate-400" />
                      <span className="text-xl font-bold text-slate-900" style={kpi.accent ? { color: kpi.color } : {}}>{kpi.value}</span>
                      <span className="text-[11px] text-slate-500 font-medium">{kpi.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                {[
                  { label: 'Sections', value: summary.totalSections.toString() },
                  { label: 'Assessment Avg', value: `${summary.avgAssessmentScore}%` },
                  { label: 'Task Completion', value: `${summary.taskCompletion}%` },
                  { label: 'Notes Completion', value: `${summary.notesCompletion}%` },
                  { label: 'Active Students', value: `${summary.activeStudents}%` },
                  { label: 'Interview Ready', value: `${summary.interviewReady}%` },
                ].map((kpi, i) => (
                  <Card key={i} className="border border-gray-300 bg-white shadow-sm">
                    <CardContent className="p-3 text-center">
                      <span className="text-lg font-bold text-slate-800">{kpi.value}</span>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{kpi.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 2. DEPARTMENT PERFORMANCE RANKING */}
            <Card className="border border-gray-300 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-3 bg-white border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" /> Department Performance Ranking
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-600">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Department</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Students</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Avg PI</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Attendance</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Assessment</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Avg PRI</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentRanking.map((d, i) => (
                      <TableRow key={d.name} className="hover:bg-slate-50">
                        <TableCell className="text-xs font-medium text-slate-900">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium text-slate-800">{d.name}</TableCell>
                        <TableCell className="text-xs text-center text-slate-600">{d.totalStudents}</TableCell>
                        <TableCell className="text-xs text-center font-bold">
                          <span style={{ color: d.avgPI >= 75 ? GREEN : d.avgPI >= 65 ? SAFFRON : RED }}>{d.avgPI}%</span>
                        </TableCell>
                        <TableCell className="text-xs text-center text-slate-600">{d.attendance}%</TableCell>
                        <TableCell className="text-xs text-center text-slate-600">{d.assessmentAvg}%</TableCell>
                        <TableCell className="text-xs text-center text-slate-600">{d.avgPRI}%</TableCell>
                        <TableCell className="text-xs text-center">
                          <Badge variant={d.riskLevel === 'low' ? 'default' : d.riskLevel === 'medium' ? 'secondary' : 'destructive'} className="text-[10px] shadow-none">
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
            <Card className="border border-gray-300 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-3 bg-white border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-slate-400" /> Semester Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-600">Semester</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Students</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Avg PI</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Attendance</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Assessment</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Risk Students</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {semesterPerformance.map(s => (
                      <TableRow key={s.semester} className="hover:bg-slate-50">
                        <TableCell className="text-xs font-medium text-slate-800">Sem {s.semester}</TableCell>
                        <TableCell className="text-xs text-center text-slate-600">{s.totalStudents}</TableCell>
                        <TableCell className="text-xs text-center font-bold">
                          <span style={{ color: s.avgPI >= 75 ? GREEN : s.avgPI >= 65 ? SAFFRON : RED }}>{s.avgPI}%</span>
                        </TableCell>
                        <TableCell className="text-xs text-center text-slate-600">{s.attendance}%</TableCell>
                        <TableCell className="text-xs text-center text-slate-600">{s.assessmentAvg}%</TableCell>
                        <TableCell className="text-xs text-center font-bold">
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
              <Card className="border border-gray-300 bg-white shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-white border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
                    <ChevronUp className="h-4 w-4" /> Top 5 Sections
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-slate-600">Section</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Dept</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center">Sem</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center">PI</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center">Att.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topSections.map(s => (
                        <TableRow key={s.name} className="hover:bg-slate-50">
                          <TableCell className="text-xs font-medium text-slate-800">{s.name}</TableCell>
                          <TableCell className="text-[11px] text-slate-500">{s.department}</TableCell>
                          <TableCell className="text-xs text-center text-slate-600 font-medium">{s.semester}</TableCell>
                          <TableCell className="text-xs text-center font-semibold" style={{ color: GREEN }}>{s.pi}%</TableCell>
                          <TableCell className="text-xs text-center text-slate-600">{s.attendance}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card className="border border-gray-300 bg-white shadow-sm overflow-hidden">
                <CardHeader className="pb-3 bg-white border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-red-500 flex items-center gap-2">
                    <ChevronDown className="h-4 w-4" /> Bottom 5 Sections
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-slate-600">Section</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600">Dept</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center">Sem</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center">PI</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 text-center">Att.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bottomSections.map(s => (
                        <TableRow key={s.name} className="hover:bg-slate-50">
                          <TableCell className="text-xs font-medium text-slate-800">{s.name}</TableCell>
                          <TableCell className="text-[11px] text-slate-500">{s.department}</TableCell>
                          <TableCell className="text-xs text-center text-slate-600 font-medium">{s.semester}</TableCell>
                          <TableCell className="text-xs text-center font-semibold" style={{ color: RED }}>{s.pi}%</TableCell>
                          <TableCell className="text-xs text-center text-slate-600">{s.attendance}%</TableCell>
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
              <Card className="border border-gray-300 bg-white shadow-sm">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-slate-400" /> Student Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 h-40">
                    <div className="w-1/2 h-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                            {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `${v} (${Math.round(v/totalStudents*100)}%)`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2.5">
                      {pieData.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                            <span className="text-slate-600">{entry.name}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PRI Insights */}
              <Card className="border border-gray-300 bg-white shadow-sm">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <Target className="h-4 w-4 text-slate-400" /> PRI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 mb-4 mt-2">
                    <div className="text-center py-3 rounded-lg border border-emerald-100" style={{ backgroundColor: GREEN_LIGHT }}>
                      <span className="text-2xl font-bold" style={{ color: GREEN }}>{priInsights.interviewReady}%</span>
                      <p className="text-[10px] text-emerald-700 font-medium">Interview Ready</p>
                    </div>
                    <div className="text-center py-3 rounded-lg border border-amber-100" style={{ backgroundColor: SAFFRON_LIGHT }}>
                      <span className="text-2xl font-bold" style={{ color: SAFFRON }}>{priInsights.almostReady}%</span>
                      <p className="text-[10px] text-amber-700 font-medium">Almost Ready</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Core Subjects', value: priInsights.coreSubjects },
                      { label: 'Mock Interview', value: priInsights.mockInterview },
                      { label: 'Aptitude', value: priInsights.aptitude },
                      { label: 'Logical Reasoning', value: priInsights.logicalReasoning },
                      { label: 'Communication', value: priInsights.communication },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500 w-28 shrink-0">{item.label}</span>
                        <Progress value={item.value} className="h-2 flex-1 bg-slate-100" style={{'--tw-progress-fill': 'bg-slate-800'} as any} />
                        <span className="text-[11px] font-medium w-8 text-right text-slate-700">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 7. RISK & ALERT PANEL */}
            <Card className="border border-gray-300 bg-white shadow-sm pb-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" style={{ color: RED }} /> Risk & Alert Panel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(riskByType).map(([type, alerts]) => (
                    <div key={type}>
                      <h4 className="text-xs font-semibold uppercase text-slate-500 mb-3 capitalize">{type} Risks</h4>
                      <div className="space-y-3">
                        {alerts.map((a, i) => (
                          <div key={i} className="p-3 rounded-lg border border-transparent" style={{ backgroundColor: a.severity === 'critical' ? RED_LIGHT : SAFFRON_LIGHT, borderColor: a.severity === 'critical' ? '#FECACA' : '#FDE68A' }}>
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-800">{a.category}</span>
                              <Badge variant={a.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[9px] px-1.5 py-0 uppercase shadow-none scale-90">
                                {a.severity}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-slate-600">{a.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 8. PERFORMANCE TRENDS */}
            <Card className="border border-gray-300 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-400" /> Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[40, 100]} axisLine={false} tickLine={false} ticks={[40, 55, 70, 85, 100]} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: 11, marginTop: '10px' }} iconType="circle" />
                      <Line type="monotone" dataKey="pi" name="PI" stroke={BLUE} strokeWidth={2} dot={{ fill: '#fff', stroke: BLUE, strokeWidth: 2, r: 4 }} />
                      <Line type="monotone" dataKey="attendance" name="Attendance" stroke={GREEN} strokeWidth={2} dot={{ fill: '#fff', stroke: GREEN, strokeWidth: 2, r: 4 }} />
                      <Line type="monotone" dataKey="assessment" name="Assessment" stroke={SAFFRON} strokeWidth={2} dot={{ fill: '#fff', stroke: SAFFRON, strokeWidth: 2, r: 4 }} />
                      <Line type="monotone" dataKey="pri" name="PRI" stroke={GRAY} strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#fff', stroke: GRAY, strokeWidth: 2, r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 9. SUBJECT / SKILL ANALYTICS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border border-gray-300 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
                    <ChevronUp className="h-4 w-4" /> Strongest Subjects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {strongSubjects.map(s => (
                      <div key={s.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2.5">
                          {trendIcon(s.trend)}
                          <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold" style={{ color: GREEN }}>{s.avgScore}%</span>
                          <span className="text-[10px] text-slate-400 w-16 text-right">Pass: {s.passRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-gray-300 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold text-red-500 flex items-center gap-2">
                    <ChevronDown className="h-4 w-4" /> Weakest Subjects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {weakSubjects.map(s => (
                      <div key={s.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2.5">
                          {trendIcon(s.trend)}
                          <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold" style={{ color: RED }}>{s.avgScore}%</span>
                          <span className="text-[10px] text-slate-400 w-16 text-right">Pass: {s.passRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 10. FACULTY IMPACT OVERVIEW */}
            <Card className="bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-3 bg-white border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-slate-400" /> Faculty Impact Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-600">Faculty</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">Sections</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Avg Student PI</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">Subject Avg</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-center">FPI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facultyImpact.map(f => (
                      <TableRow key={f.name} className="hover:bg-slate-50">
                        <TableCell className="text-xs font-medium text-slate-900">{f.name}</TableCell>
                        <TableCell className="text-[11px] text-slate-500">{f.sections.join(', ')}</TableCell>
                        <TableCell className="text-xs text-center text-slate-600">{f.avgStudentPI}%</TableCell>
                        <TableCell className="text-xs text-center text-slate-600">{f.subjectAvg}%</TableCell>
                        <TableCell className="text-xs text-center">
                          <span className="font-bold relative inline-block px-2 py-0.5 rounded-full" style={{ color: f.fpiScore >= 70 ? GREEN : f.fpiScore >= 60 ? SAFFRON : RED, backgroundColor: f.fpiScore >= 70 ? GREEN_LIGHT : f.fpiScore >= 60 ? SAFFRON_LIGHT : RED_LIGHT }}>
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
              <Card className="bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-slate-400" /> Attendance by Department
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceOverview.departmentWise} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} domain={[60, 100]} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={120} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 12, borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="attendance" fill={GREEN} radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-semibold text-red-500 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Low Attendance Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {attendanceOverview.lowAlerts.map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-red-100" style={{ backgroundColor: RED_LIGHT }}>
                        <div>
                          <span className="text-xs font-semibold text-slate-900">{a.student}</span>
                          <span className="text-[10px] text-red-600 ml-3 font-medium bg-white px-2 py-0.5 rounded-full">{a.section}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: RED }}>{a.attendance}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 12. AI INSIGHTS & IMPROVEMENT SUGGESTIONS */}
            <Card className="bg-white shadow-sm pb-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                  <Brain className="h-4 w-4" /> AI Insights & Improvement Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiInsights.map((insight, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-transparent"
                      style={{
                        backgroundColor: insight.type === 'warning' ? RED_LIGHT : insight.type === 'suggestion' ? SAFFRON_LIGHT : GREEN_LIGHT,
                        borderColor: insight.type === 'warning' ? '#FECACA' : insight.type === 'suggestion' ? '#FDE68A' : '#A7F3D0'
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {insight.type === 'warning' && <div className="p-1.5 bg-red-100 rounded-md"><AlertTriangle className="h-4 w-4 shrink-0" style={{ color: RED }} /></div>}
                        {insight.type === 'suggestion' && <div className="p-1.5 bg-amber-100 rounded-md"><Lightbulb className="h-4 w-4 shrink-0" style={{ color: SAFFRON }} /></div>}
                        {insight.type === 'info' && <div className="p-1.5 bg-emerald-100 rounded-md"><TrendingUp className="h-4 w-4 shrink-0" style={{ color: GREEN }} /></div>}
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{insight.title}</h5>
                          <p className="text-[11px] text-slate-700 mt-1 leading-snug">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 13. DOWNLOAD & REPORTS */}
            <Card className="border border-gray-300 bg-white shadow-sm mb-12">
              <CardHeader className="pb-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Download className="h-4 w-4 text-slate-400" /> Download Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-600 mb-3 border-b border-slate-100 pb-2">PDF Reports</h4>
                    <div className="space-y-2">
                      {['Institution Report', 'Department Report', 'Risk Analysis Report'].map(r => (
                        <Button key={r} variant="outline" size="sm" className="w-full justify-start text-xs h-9 hover:bg-slate-50 text-slate-700 border-slate-200">
                          <FileText className="h-4 w-4 mr-3" style={{ color: RED }} /> {r}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-600 mb-3 border-b border-slate-100 pb-2">Excel Reports</h4>
                    <div className="space-y-2">
                      {['Student Performance Data', 'Attendance Data', 'Section Analytics'].map(r => (
                        <Button key={r} variant="outline" size="sm" className="w-full justify-start text-xs h-9 hover:bg-slate-50 text-slate-700 border-slate-200">
                          <BarChart3 className="h-4 w-4 mr-3" style={{ color: GREEN }} /> {r}
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
  );
};

export default PrincipalDashboard;

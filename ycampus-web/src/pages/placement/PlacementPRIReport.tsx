import React, { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import PlacementSidebar from '@/components/placement/PlacementSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Users, TrendingUp, Target, Brain, Download, Search, ChevronDown, ChevronUp,
  Lightbulb, GraduationCap, AlertTriangle, FileText, BarChart3, CheckCircle2,
  XCircle, ArrowUpDown, Shield, BookOpen, ClipboardCheck,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const DARK_GREEN = '#047857';
const LIGHT_GREEN = '#34D399';
const SAFFRON = '#F59E0B';
const RED = '#EF4444';

const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT'];
const SECTIONS = ['A', 'B', 'C'];

const STRENGTHS_POOL = ['Arrays', 'Database', 'Python', 'System Design', 'Aptitude', 'Communication', 'Logical Reasoning', 'Linked Lists', 'SQL', 'OOP'];
const WEAKNESS_POOL = ['Dynamic Programming', 'Communication', 'Mock Interviews', 'Graph Algorithms', 'System Design', 'Aptitude', 'Recursion', 'OS Concepts'];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateStudents() {
  const students: any[] = [];
  const names = [
    'Aarav Sharma', 'Priya Mehta', 'Rahul Verma', 'Sneha Patel', 'Arjun Reddy',
    'Divya Krishnan', 'Karan Singh', 'Meera Nair', 'Vikram Joshi', 'Ananya Gupta',
    'Rohan Desai', 'Ishita Banerjee', 'Aditya Kulkarni', 'Pooja Iyer', 'Nikhil Rao',
    'Tanvi Saxena', 'Siddharth Malhotra', 'Riya Agarwal', 'Varun Chauhan', 'Kavya Pillai',
    'Amit Kumar', 'Neha Tiwari', 'Raj Prajapati', 'Shruti Bhat', 'Manish Dubey',
    'Deepika Rajan', 'Harish Menon', 'Swati Mishra', 'Pranav Hegde', 'Anjali Das',
    'Suresh Naik', 'Lakshmi Venkat', 'Gaurav Sinha', 'Pallavi Jain', 'Akash Patil',
    'Bhavna Kapoor', 'Chinmay Deshpande', 'Disha Rawat', 'Eshan Bhatt', 'Falguni Shah',
  ];

  names.forEach((name, idx) => {
    const dept = DEPARTMENTS[idx % DEPARTMENTS.length];
    const sem = (idx % 8) + 1;
    const sec = SECTIONS[idx % 3];
    const seed = idx + 1;

    const pi = Math.round(45 + seededRandom(seed * 1) * 50);
    const attendance = Math.round(55 + seededRandom(seed * 2) * 40);
    const taskCompletion = Math.round(40 + seededRandom(seed * 3) * 55);

    const psBreakdown = {
      DSA: Math.round(35 + seededRandom(seed * 10) * 60),
      Python: Math.round(40 + seededRandom(seed * 11) * 55),
      Database: Math.round(45 + seededRandom(seed * 12) * 50),
      'System Design': Math.round(30 + seededRandom(seed * 13) * 60),
      Aptitude: Math.round(40 + seededRandom(seed * 14) * 55),
      'Logical Reasoning': Math.round(45 + seededRandom(seed * 15) * 50),
      Communication: Math.round(35 + seededRandom(seed * 16) * 60),
      'Mock Interviews': Math.round(30 + seededRandom(seed * 17) * 60),
    };

    const ps = Math.round(Object.values(psBreakdown).reduce((a, b) => a + b, 0) / 8);
    const pri = Math.round(pi * 0.5 + ps * 0.5);

    const numStr = Math.max(2, Math.round(seededRandom(seed * 20) * 4));
    const numWeak = Math.max(2, Math.round(seededRandom(seed * 21) * 4));
    const strengths = STRENGTHS_POOL.sort(() => seededRandom(seed * 30 + idx) - 0.5).slice(0, numStr);
    const improvements = WEAKNESS_POOL.sort(() => seededRandom(seed * 40 + idx) - 0.5).slice(0, numWeak);

    students.push({
      id: `stu-${idx}`,
      name, rollNo: `${dept}${2021 + (idx % 3)}${String(idx + 1).padStart(3, '0')}`,
      department: dept, semester: sem, section: sec,
      batch: `${2021 + (idx % 3)}-${2025 + (idx % 3)}`,
      pi, ps, pri, attendance, taskCompletion, psBreakdown, strengths, improvements,
    });
  });
  return students;
}

const ALL_STUDENTS = generateStudents();

const getPRIStatus = (pri: number) => {
  if (pri >= 85) return { label: 'Ready', color: DARK_GREEN, bg: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300' };
  if (pri >= 70) return { label: 'Almost Ready', color: LIGHT_GREEN, bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' };
  if (pri >= 55) return { label: 'Needs Improvement', color: SAFFRON, bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' };
  return { label: 'Not Ready', color: RED, bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
};

const PIE_COLORS = [DARK_GREEN, LIGHT_GREEN, SAFFRON, RED];

const PlacementPRIReport = () => {
  const [filters, setFilters] = useState({
    academicYear: '2025-26', department: 'all', semester: 'all', batch: 'all',
    section: 'all', priRange: 'all', piRange: 'all', psRange: 'all',
  });
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('pri');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const updateFilter = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }));

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filteredStudents = useMemo(() => {
    let list = [...ALL_STUDENTS];
    if (filters.department !== 'all') list = list.filter(s => s.department === filters.department);
    if (filters.semester !== 'all') list = list.filter(s => s.semester === Number(filters.semester));
    if (filters.section !== 'all') list = list.filter(s => s.section === filters.section);
    if (filters.batch !== 'all') list = list.filter(s => s.batch === filters.batch);

    if (filters.priRange !== 'all') {
      const ranges: Record<string, [number, number]> = { '85+': [85, 100], '70-84': [70, 84], '55-69': [55, 69], '<55': [0, 54] };
      const [min, max] = ranges[filters.priRange] || [0, 100];
      list = list.filter(s => s.pri >= min && s.pri <= max);
    }
    if (filters.piRange !== 'all') {
      const ranges: Record<string, [number, number]> = { '85+': [85, 100], '70-84': [70, 84], '55-69': [55, 69], '<55': [0, 54] };
      const [min, max] = ranges[filters.piRange] || [0, 100];
      list = list.filter(s => s.pi >= min && s.pi <= max);
    }
    if (filters.psRange !== 'all') {
      const ranges: Record<string, [number, number]> = { '85+': [85, 100], '70-84': [70, 84], '55-69': [55, 69], '<55': [0, 54] };
      const [min, max] = ranges[filters.psRange] || [0, 100];
      list = list.filter(s => s.ps >= min && s.ps <= max);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    return list;
  }, [filters, search, sortKey, sortDir]);

  const totalStudents = filteredStudents.length;
  const avgPI = totalStudents ? Math.round(filteredStudents.reduce((a, s) => a + s.pi, 0) / totalStudents) : 0;
  const avgPS = totalStudents ? Math.round(filteredStudents.reduce((a, s) => a + s.ps, 0) / totalStudents) : 0;
  const avgPRI = totalStudents ? Math.round(filteredStudents.reduce((a, s) => a + s.pri, 0) / totalStudents) : 0;

  const dist = {
    ready: filteredStudents.filter(s => s.pri >= 85).length,
    almost: filteredStudents.filter(s => s.pri >= 70 && s.pri < 85).length,
    needs: filteredStudents.filter(s => s.pri >= 55 && s.pri < 70).length,
    notReady: filteredStudents.filter(s => s.pri < 55).length,
  };

  const distPct = (v: number) => totalStudents ? Math.round((v / totalStudents) * 100) : 0;

  const pieData = [
    { name: 'Ready (85+)', value: dist.ready },
    { name: 'Almost (70-84)', value: dist.almost },
    { name: 'Needs Imp (55-69)', value: dist.needs },
    { name: 'Not Ready (<55)', value: dist.notReady },
  ];

  const avgBreakdown = useMemo(() => {
    if (!totalStudents) return [];
    const keys = ['DSA', 'Python', 'Database', 'System Design', 'Aptitude', 'Logical Reasoning', 'Communication', 'Mock Interviews'];
    return keys.map(k => ({
      name: k,
      avg: Math.round(filteredStudents.reduce((a, s) => a + (s.psBreakdown[k] || 0), 0) / totalStudents),
    }));
  }, [filteredStudents, totalStudents]);

  const insights = useMemo(() => {
    const ins: string[] = [];
    if (distPct(dist.notReady) > 30) ins.push(`${distPct(dist.notReady)}% of students are not ready for placement — urgent intervention needed.`);
    else if (distPct(dist.notReady) > 10) ins.push(`${distPct(dist.notReady)}% students are not ready for placement.`);
    if (distPct(dist.ready) > 40) ins.push(`${distPct(dist.ready)}% students are interview-ready — strong placement pipeline.`);
    const weakAreas = avgBreakdown.filter(b => b.avg < 55).map(b => b.name);
    const strongAreas = avgBreakdown.filter(b => b.avg >= 75).map(b => b.name);
    if (weakAreas.length) ins.push(`Weak areas across students: ${weakAreas.join(', ')}.`);
    if (strongAreas.length) ins.push(`Strong performance in: ${strongAreas.join(', ')}.`);
    if (avgPI > avgPS + 10) ins.push('Academic performance (PI) is significantly ahead of preparation (PS) — focus on mock prep and soft skills.');
    if (avgPS > avgPI + 10) ins.push('Preparation scores (PS) exceed academics (PI) — improve core coursework and attendance.');
    if (ins.length === 0) ins.push('Overall placement readiness is balanced. Continue monitoring progress.');
    return ins;
  }, [dist, avgBreakdown, avgPI, avgPS]);

  const recommendations = useMemo(() => {
    const recs: string[] = [];
    const weak = avgBreakdown.filter(b => b.avg < 55);
    weak.forEach(w => recs.push(`Improve ${w.name} training — current average is ${w.avg}%.`));
    if (dist.notReady > 5) recs.push(`Provide targeted support for ${dist.notReady} students not ready for placement.`);
    if (avgBreakdown.find(b => b.name === 'Mock Interviews' && b.avg < 60)) recs.push('Conduct more mock interviews to build interview confidence.');
    if (avgBreakdown.find(b => b.name === 'Communication' && b.avg < 60)) recs.push('Organize communication workshops and group discussions.');
    if (recs.length === 0) recs.push('All metrics are healthy. Maintain current training cadence.');
    return recs;
  }, [avgBreakdown, dist]);

  const SortHeader = ({ label, field }: { label: string; field: string }) => (
    <TableHead className="text-xs cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </span>
    </TableHead>
  );

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <PlacementSidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <main className="flex-1 p-4 md:p-6 bg-background overflow-y-auto">
            <div className="max-w-[1400px] mx-auto space-y-6">
              <h1 className="text-2xl font-bold">PRI Report</h1>

              {/* FILTERS */}
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex flex-wrap gap-3">
                    <Select value={filters.academicYear} onValueChange={v => updateFilter('academicYear', v)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025-26">2025–26</SelectItem>
                        <SelectItem value="2024-25">2024–25</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.department} onValueChange={v => updateFilter('department', v)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filters.semester} onValueChange={v => updateFilter('semester', v)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Semester" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filters.batch} onValueChange={v => updateFilter('batch', v)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Batch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        <SelectItem value="2021-2025">2021–25</SelectItem>
                        <SelectItem value="2022-2026">2022–26</SelectItem>
                        <SelectItem value="2023-2027">2023–27</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.section} onValueChange={v => updateFilter('section', v)}>
                      <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {SECTIONS.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filters.priRange} onValueChange={v => updateFilter('priRange', v)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="PRI Range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All PRI</SelectItem>
                        <SelectItem value="85+">Ready (85+)</SelectItem>
                        <SelectItem value="70-84">Almost (70–84)</SelectItem>
                        <SelectItem value="55-69">Needs Imp (55–69)</SelectItem>
                        <SelectItem value="<55">Not Ready (&lt;55)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.piRange} onValueChange={v => updateFilter('piRange', v)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="PI Range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All PI</SelectItem>
                        <SelectItem value="85+">85+</SelectItem>
                        <SelectItem value="70-84">70–84</SelectItem>
                        <SelectItem value="55-69">55–69</SelectItem>
                        <SelectItem value="<55">&lt;55</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.psRange} onValueChange={v => updateFilter('psRange', v)}>
                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="PS Range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All PS</SelectItem>
                        <SelectItem value="85+">85+</SelectItem>
                        <SelectItem value="70-84">70–84</SelectItem>
                        <SelectItem value="55-69">55–69</SelectItem>
                        <SelectItem value="<55">&lt;55</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* SUMMARY KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                  { label: 'Total Students', value: totalStudents.toString(), icon: Users, iconColor: 'text-blue-600' },
                  { label: 'Avg PI', value: `${avgPI}%`, icon: TrendingUp, iconColor: 'text-indigo-600' },
                  { label: 'Avg PS', value: `${avgPS}%`, icon: BookOpen, iconColor: 'text-violet-600' },
                  { label: 'Avg PRI', value: `${avgPRI}%`, icon: Target, iconColor: avgPRI >= 70 ? 'text-emerald-600' : 'text-amber-600' },
                  { label: 'Ready', value: `${distPct(dist.ready)}%`, icon: CheckCircle2, iconColor: 'text-emerald-600' },
                  { label: 'Almost', value: `${distPct(dist.almost)}%`, icon: Shield, iconColor: 'text-emerald-500' },
                  { label: 'Needs Imp', value: `${distPct(dist.needs)}%`, icon: AlertTriangle, iconColor: 'text-amber-600' },
                  { label: 'Not Ready', value: `${distPct(dist.notReady)}%`, icon: XCircle, iconColor: 'text-red-600' },
                ].map((kpi, i) => (
                  <Card key={i} className="border">
                    <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                      <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
                      <span className="text-lg font-bold">{kpi.value}</span>
                      <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* DISTRIBUTION CHART + PS BREAKDOWN */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-indigo-600" /> PRI Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4 h-[200px]">
                    <div className="w-[160px] h-[160px] flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => [v, 'Students']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 min-w-0">
                      {pieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs whitespace-nowrap">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                          <span className="text-muted-foreground">{d.name}:</span>
                          <strong className="text-foreground">{d.value}</strong>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-violet-600" /> Avg PS Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={avgBreakdown} layout="vertical" margin={{ left: 80, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                        <Tooltip />
                        <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                          {avgBreakdown.map((d, i) => (
                            <Cell key={i} fill={d.avg >= 75 ? DARK_GREEN : d.avg >= 55 ? LIGHT_GREEN : d.avg >= 40 ? SAFFRON : RED} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* SEARCH + EXPORT */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or roll number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Excel
                  </Button>
                </div>
              </div>

              {/* STUDENT TABLE */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" /> Student PRI Details
                    <Badge variant="secondary" className="ml-2 text-[10px]">{filteredStudents.length} students</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[540px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                        <TableRow>
                          <TableHead className="text-xs w-10 text-center">#</TableHead>
                          <SortHeader label="Student" field="name" />
                          <TableHead className="text-xs">Dept</TableHead>
                          <TableHead className="text-xs text-center">Sem</TableHead>
                          <TableHead className="text-xs text-center">Sec</TableHead>
                          <SortHeader label="PI" field="pi" />
                          <SortHeader label="PS" field="ps" />
                          <SortHeader label="PRI" field="pri" />
                          <SortHeader label="Attend" field="attendance" />
                          <SortHeader label="Tasks" field="taskCompletion" />
                          <TableHead className="text-xs text-center">Status</TableHead>
                          <TableHead className="text-xs w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={12} className="text-center py-10 text-muted-foreground text-sm">No students found. Try different filters.</TableCell>
                          </TableRow>
                        ) : filteredStudents.map((s, i) => {
                          const status = getPRIStatus(s.pri);
                          const isExpanded = expandedRow === s.id;
                          return (
                            <React.Fragment key={s.id}>
                              <TableRow className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setExpandedRow(isExpanded ? null : s.id)}>
                                <TableCell className="text-xs text-muted-foreground text-center">{i + 1}</TableCell>
                                <TableCell>
                                  <div>
                                    <span className="text-sm font-medium">{s.name}</span>
                                    <span className="block text-[10px] text-muted-foreground">{s.rollNo}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">{s.department}</TableCell>
                                <TableCell className="text-xs text-center">{s.semester}</TableCell>
                                <TableCell className="text-xs text-center">{s.section}</TableCell>
                                <TableCell className="text-sm font-semibold text-center" style={{ color: s.pi >= 70 ? DARK_GREEN : s.pi >= 55 ? SAFFRON : RED }}>{s.pi}%</TableCell>
                                <TableCell className="text-sm font-semibold text-center" style={{ color: s.ps >= 70 ? DARK_GREEN : s.ps >= 55 ? SAFFRON : RED }}>{s.ps}%</TableCell>
                                <TableCell className="text-sm font-bold text-center" style={{ color: status.color }}>{s.pri}%</TableCell>
                                <TableCell className="text-sm text-center" style={{ color: s.attendance >= 75 ? DARK_GREEN : RED }}>{s.attendance}%</TableCell>
                                <TableCell className="text-xs text-center">{s.taskCompletion}%</TableCell>
                                <TableCell className="text-center">
                                  <Badge className={`text-[10px] px-2 py-0.5 font-medium ${status.bg}`}>{status.label}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="bg-muted/10 border-b-2 border-border">
                                  <TableCell colSpan={12} className="px-6 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      <div>
                                        <h4 className="text-xs font-bold mb-3 text-foreground flex items-center gap-1.5">
                                          <BarChart3 className="h-3.5 w-3.5 text-violet-600" /> PS Breakdown
                                        </h4>
                                        <div className="space-y-2">
                                          {Object.entries(s.psBreakdown).map(([key, val]) => (
                                            <div key={key} className="flex items-center gap-2">
                                              <span className="text-[11px] text-muted-foreground w-28 truncate">{key}</span>
                                              <Progress value={val as number} className="h-2 flex-1" />
                                              <span className="text-[11px] font-semibold w-10 text-right" style={{ color: (val as number) >= 70 ? DARK_GREEN : (val as number) >= 55 ? SAFFRON : RED }}>{val as number}%</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-bold mb-3 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                          <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                          {s.strengths.map((st: string) => (
                                            <Badge key={st} variant="outline" className="text-[11px] px-2.5 py-1 border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-900/20">{st}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-bold mb-3 text-red-700 dark:text-red-400 flex items-center gap-1.5">
                                          <AlertTriangle className="h-3.5 w-3.5" /> Areas to Improve
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                          {s.improvements.map((im: string) => (
                                            <Badge key={im} variant="outline" className="text-[11px] px-2.5 py-1 border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-900/20">{im}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* AI INSIGHTS + RECOMMENDATIONS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Brain className="h-4 w-4 text-violet-600" /> AI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {insights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                        <span>{ins}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-emerald-600" /> Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PlacementPRIReport;

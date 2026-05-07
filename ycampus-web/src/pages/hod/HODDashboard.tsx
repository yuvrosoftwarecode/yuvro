import React, { useState, Fragment } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HODSidebar } from '@/components/hod/HODSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, UserCheck, LayoutGrid, TrendingUp, Clock, CheckCircle, BookOpen, AlertTriangle,
  ChevronDown, ChevronUp, Download, FileText, Lightbulb, ArrowUpRight, ArrowDownRight,
  Shield, GraduationCap, Target, Briefcase, BarChart3, Brain,
} from 'lucide-react';
import { useHODDashboardData, type SectionData, type StudentData, type PRIData } from '@/hooks/useHODDashboardData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';

interface HODDashboardProps {
  sidebarComponent?: React.ReactNode;
  title?: string;
  headerExtra?: React.ReactNode;
  departmentId?: string;
}

const HODDashboard = ({ sidebarComponent, title, headerExtra, departmentId: propDepartmentId }: HODDashboardProps = {}) => {
  const { user } = useAuth();
  const departmentId = propDepartmentId || user?.department_id;

  const [filters, setFilters] = useState({
    academicYear: '2025-26',
    semester: 'all',
    batch: 'all',
    dateRange: 'full-year',
  });
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);

  const {
    summary, rankedSections, semesterComparison, trends, risk, insights, allSections,
    attendanceShortage, subjectAnalytics, facultyPerformance, placementReadiness,
    assessmentReports, testAnalytics, filteredSemesters, allStudents, priData,
    loading, filterOptions,
  } = useHODDashboardData(filters, departmentId);

  React.useEffect(() => {
    if (filterOptions?.academicYears?.length > 0 && filters.academicYear === '2025-26') {
       // Optional: set to first available if needed, or keep 2025-26 as a default
    }
  }, [filterOptions]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'academicYear') {
        next.batch = 'all';
        next.semester = 'all';
        next.dateRange = 'full-year';
      } else if (key === 'batch') {
        next.semester = 'all';
        next.dateRange = 'full-year';
      } else if (key === 'semester') {
        next.dateRange = 'full-year';
      }
      return next;
    });
  };

  const summaryCards = [
    { title: 'Total Students', value: summary.totalStudents, icon: Users, color: 'text-blue-600' },
    { title: 'Total Faculty', value: summary.totalFaculty, icon: UserCheck, color: 'text-indigo-600' },
    { title: 'Total Sections', value: summary.totalSections, icon: LayoutGrid, color: 'text-purple-600' },
    { title: 'Dept. PI', value: `${summary.dpi}%`, icon: TrendingUp, color: 'text-emerald-600' },
    { title: 'Attendance', value: `${summary.overallAttendance}%`, icon: Clock, color: 'text-amber-600' },
    { title: 'Task Completion', value: `${summary.overallTaskCompletion}%`, icon: CheckCircle, color: 'text-teal-600' },
    { title: 'Assessment Avg', value: `${summary.overallAssessmentAvg}%`, icon: BookOpen, color: 'text-rose-600' },
    { title: 'Avg PRI', value: `${priData.avgPRI}%`, icon: Briefcase, color: 'text-orange-600' },
  ];

  const riskBadge = (level: string) => {
    if (level === 'High') return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-[10px]">High Risk</Badge>;
    if (level === 'Medium') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-[10px]">Medium</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px]">Low</Badge>;
  };

  const renderSectionDetail = (section: SectionData) => {
    if (!section.students || section.students.length === 0) {
      return <div className="p-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-lg">No student data available for this section yet.</div>;
    }
    const sorted = [...section.students].sort((a, b) => b.performanceIndex - a.performanceIndex);
    
    // If we have 5 or fewer students, just show one list.
    // Otherwise, show top 5 and bottom 5 (without overlap).
    const top5 = sorted.slice(0, 5);
    const bottom5 = sorted.length > 5 
      ? sorted.slice(Math.max(5, sorted.length - 5)).reverse() 
      : [];
      
    const riskCount = section.students.filter(s => s.performanceIndex < 60).length;
    const gap = sorted.length > 0 ? (sorted[0].performanceIndex - sorted[sorted.length - 1].performanceIndex) : 0;

    return (
      <div className="bg-muted/30 p-4 rounded-lg mt-2 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="text-center p-2 bg-background rounded-md shadow-sm">
            <div className="text-xs text-muted-foreground">SPI</div>
            <div className="text-lg font-bold">{section.spiValue}%</div>
          </div>
          <div className="text-center p-2 bg-background rounded-md shadow-sm">
            <div className="text-xs text-muted-foreground">Attendance</div>
            <div className="text-lg font-bold">{section.attendance}%</div>
          </div>
          <div className="text-center p-2 bg-background rounded-md shadow-sm">
            <div className="text-xs text-muted-foreground">Risk Students</div>
            <div className="text-lg font-bold text-red-600">{riskCount}</div>
          </div>
          <div className="text-center p-2 bg-background rounded-md shadow-sm">
            <div className="text-xs text-muted-foreground">PI Gap</div>
            <div className="text-lg font-bold">{gap}</div>
          </div>
          <div className="text-center p-2 bg-background rounded-md shadow-sm">
            <div className="text-xs text-muted-foreground">Faculty</div>
            <div className="text-xs font-medium truncate">{section.facultyName}</div>
          </div>
        </div>
        <div className={`grid grid-cols-1 ${bottom5.length > 0 ? 'md:grid-cols-2' : ''} gap-4`}>
          <div>
            <h5 className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> 
              {bottom5.length > 0 ? 'Top 5 Students' : 'Student Rankings'}
            </h5>
            <div className="space-y-1">
              {top5.map((s, i) => (
                <div key={s.id} className="flex justify-between text-xs p-1.5 bg-emerald-50 rounded cursor-pointer hover:bg-emerald-100" onClick={() => setSelectedStudent(s)}>
                  <span className="text-foreground">{i + 1}. {s.name}</span>
                  <span className="font-semibold text-emerald-700">{s.performanceIndex}%</span>
                </div>
              ))}
            </div>
          </div>
          {bottom5.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1"><ArrowDownRight className="h-3 w-3" /> Bottom 5 Students</h5>
              <div className="space-y-1">
                {bottom5.map((s, i) => (
                  <div key={s.id} className="flex justify-between text-xs p-1.5 bg-red-50 rounded cursor-pointer hover:bg-red-100" onClick={() => setSelectedStudent(s)}>
                    <span className="text-foreground">{i + 1}. {s.name}</span>
                    <span className="font-semibold text-red-700">{s.performanceIndex}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Student detail modal
  const renderStudentDetail = () => {
    if (!selectedStudent) return null;
    const s = selectedStudent;
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
        <div className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-foreground">{s.name}</h3>
              <p className="text-xs text-muted-foreground">Semester {s.semester} · Section {s.section} · CSE</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>✕</Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Performance Index', value: `${s.performanceIndex}%`, color: s.performanceIndex >= 70 ? 'text-emerald-600' : s.performanceIndex >= 60 ? 'text-amber-600' : 'text-red-600' },
              { label: 'Attendance', value: `${s.attendance}%`, color: s.attendance >= 75 ? 'text-emerald-600' : 'text-red-600' },
              { label: 'Notes Completion', value: `${s.notesCompletion}%`, color: 'text-blue-600' },
              { label: 'Test Average', value: `${s.testAvg}%`, color: 'text-indigo-600' },
              { label: 'Assessment Avg', value: `${s.assessmentAvg}%`, color: 'text-purple-600' },
              { label: 'Task Completion', value: `${s.taskCompletion}%`, color: 'text-teal-600' },
            ].map((m, i) => (
              <div key={i} className="text-center p-2 bg-muted/30 rounded-md">
                <div className="text-[10px] text-muted-foreground">{m.label}</div>
                <div className={`text-sm font-bold ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>

          <div className="text-center p-3 bg-muted/30 rounded-md">
            <div className="text-xs text-muted-foreground">Mock Interview Score</div>
            <div className="text-lg font-bold text-foreground">{s.mockInterviewScore}%</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-xs font-semibold text-emerald-700 mb-1">Strong Areas</h5>
              {s.strongSubjects.map(sub => (
                <Badge key={sub} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px] mr-1 mb-1">{sub}</Badge>
              ))}
            </div>
            <div>
              <h5 className="text-xs font-semibold text-red-700 mb-1">Weak Areas</h5>
              {s.weakSubjects.map(sub => (
                <Badge key={sub} className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-[10px] mr-1 mb-1">{sub}</Badge>
              ))}
            </div>
          </div>

          <Card className="shadow-sm border-l-4 border-l-blue-400">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-semibold">AI Recommendations</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {s.performanceIndex < 60 && <li>• Needs immediate academic support & mentoring</li>}
                {s.attendance < 75 && <li>• Attendance warning – risk of debarment</li>}
                {s.testAvg < 60 && <li>• Additional practice tests recommended</li>}
                {s.mockInterviewScore < 50 && <li>• Schedule more mock interviews</li>}
                <li>• Focus on: {s.weakSubjects.join(', ')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(210,40%,98%)]">
        {sidebarComponent || <HODSidebar />}
        <div className="flex-1 flex flex-col min-h-0">
          
          <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
            {loading && (!summary || summary.totalStudents === 0) ? (
              <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
                <p className="text-gray-500 text-lg font-medium animate-pulse">Initializing Department Dashboard...</p>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{title || 'Dashboard'}</h1>
                {/* GLOBAL FILTERS */}
            <Card className="shadow-sm">
              <CardContent className="py-3 px-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <Select value={filters.academicYear || ""} onValueChange={v => updateFilter('academicYear', v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue>{filters.academicYear || "Select Year"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions?.academicYears?.map((ay: string) => (
                        <SelectItem key={ay} value={ay}>{ay}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.batch || "all"} onValueChange={v => updateFilter('batch', v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue>
                        {filters.batch === 'all' ? 'All Batches' : (filterOptions?.batches?.find((b: any) => b.id === filters.batch)?.name || 'All Batches')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batches</SelectItem>
                      {filterOptions?.batches
                        ?.filter((b: any) => b.id !== 'all' && b.name !== 'All Batches')
                        ?.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.semester || "all"} onValueChange={v => updateFilter('semester', v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue>
                        {filters.semester === 'all' ? 'All Semesters' : `Semester ${filters.semester}`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {filterOptions?.semesters?.map((s: number) => (
                        <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.dateRange || ""} onValueChange={v => updateFilter('dateRange', v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-year">Full Year</SelectItem>
                      <SelectItem value="last-3">Last 3 Months</SelectItem>
                      <SelectItem value="last-1">Last Month</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Download className="h-3 w-3" /> PDF</Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><FileText className="h-3 w-3" /> Excel</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DEPARTMENT SUMMARY */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {summaryCards.map((c, i) => (
                <Card key={i} className="shadow-sm">
                  <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                    <div className="text-xl font-bold text-foreground">{c.value}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{c.title}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* PRI READINESS DISTRIBUTION */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="shadow-sm border-l-4 border-l-emerald-400">
                <CardContent className="p-3 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="text-lg font-bold text-emerald-600">{priData.readyPct}%</div>
                    <div className="text-[10px] text-muted-foreground">Interview Ready (PRI 85+)</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-l-4 border-l-amber-400">
                <CardContent className="p-3 flex items-center gap-3">
                  <Target className="h-5 w-5 text-amber-600" />
                  <div>
                    <div className="text-lg font-bold text-amber-600">{priData.almostReadyPct}%</div>
                    <div className="text-[10px] text-muted-foreground">Almost Ready (PRI 70–84)</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-l-4 border-l-red-400">
                <CardContent className="p-3 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-lg font-bold text-red-600">{priData.needsImprovementPct}%</div>
                    <div className="text-[10px] text-muted-foreground">Needs Improvement (PRI &lt;70)</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI INSIGHTS */}
            <Card className="shadow-sm border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold text-foreground">AI-Generated Insights</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {insights.map((ins, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        ins.type === 'success' ? 'bg-emerald-500' :
                        ins.type === 'warning' ? 'bg-amber-500' :
                        ins.type === 'danger' ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                      <span className="text-muted-foreground">{ins.label}:</span>
                      <span className="font-medium text-foreground">{ins.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* TABS */}
            <Tabs defaultValue="department" className="space-y-4">
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="department" className="text-xs">Department</TabsTrigger>
                <TabsTrigger value="semester" className="text-xs">Semester</TabsTrigger>
                <TabsTrigger value="section" className="text-xs">Section</TabsTrigger>
                
                <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
                <TabsTrigger value="assessment" className="text-xs">Assessment</TabsTrigger>
                <TabsTrigger value="placement" className="text-xs">Placement</TabsTrigger>
                <TabsTrigger value="faculty" className="text-xs">Faculty</TabsTrigger>
              </TabsList>

              {/* ===== DEPARTMENT TAB ===== */}
              <TabsContent value="department" className="space-y-6">
                {/* Performance Trend */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Department Performance Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trends.map((t, i) => ({ ...t, pri: priData.trendPRI[i]?.pri ?? 0 }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={[40, 100]} />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="performanceIndex" stroke="#0EA5A4" strokeWidth={2} name="Performance Index" dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="attendance" stroke="#f59e0b" strokeWidth={2} name="Attendance" dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="assessmentAvg" stroke="#16a34a" strokeWidth={2} name="Assessment Avg" dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="testAvg" stroke="#8b5cf6" strokeWidth={2} name="Test Avg" dot={{ r: 3 }} />
                          {/* PRI Trend merged into same chart */}
                          <Line type="monotone" dataKey="pri" stroke="#ea580c" strokeWidth={2} name="PRI" dot={{ r: 3 }} strokeDasharray="5 3" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Report */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="shadow-sm border-l-4 border-l-red-400">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" /> Risk Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Students below 60 PI</span>
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">{risk.riskStudentsCount}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Low Attendance Sections</span>
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">{risk.lowAttSections.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Low Assessment Sections</span>
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">{risk.lowAssessmentSections.length}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Students PRI &lt; 55</span>
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0">{priData.studentPRIs.filter(s => s.pri < 55).length}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Sections PRI &lt; 65</span>
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0">{priData.sectionPRIs.filter(s => s.pri < 65).length}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Low Mock Interview</span>
                        <Badge className={`border-0 ${priData.breakdown.mockInterviews < 55 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{priData.breakdown.mockInterviews}%</Badge>
                      </div>
                      {risk.lowAttSections.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <div className="text-[10px] text-muted-foreground mb-1">Low Attendance Sections:</div>
                          {risk.lowAttSections.map(s => (
                            <div key={s.id} className="text-[11px] flex justify-between py-0.5">
                              <span>{s.name} (Sem {s.semester})</span>
                              <span className="text-red-600 font-medium">{s.attendance}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Subject Difficulty Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {subjectAnalytics.slice(0, 6).map(sub => (
                        <div key={sub.code} className="flex items-center justify-between text-xs">
                          <span className="truncate flex-1">{sub.name}</span>
                          <Badge className={`ml-2 border-0 text-[10px] ${
                            sub.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                            sub.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>{sub.difficulty}</Badge>
                          <span className="ml-2 font-medium w-10 text-right">{sub.passRate}%</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Semester Comparison</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {semesterComparison.map(sem => (
                        <div key={sem.semester} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">Semester {sem.semester}</span>
                            <span className="text-muted-foreground">{sem.avgPerformanceIndex}% PI</span>
                          </div>
                          <Progress value={sem.avgPerformanceIndex} className="h-1.5" />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{sem.totalStudents} students</span>
                            <span>{sem.avgAttendance}% att.</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ===== SEMESTER TAB ===== */}
              <TabsContent value="semester" className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Semester Performance Comparison</CardTitle>
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
                          <TableHead className="text-xs text-center">Task %</TableHead>
                          <TableHead className="text-xs text-center">PRI</TableHead>
                          <TableHead className="text-xs text-center">Risk Students</TableHead>
                          <TableHead className="text-xs text-center">Sections</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {semesterComparison.map(sem => (
                          <TableRow key={sem.semester}>
                            <TableCell className="text-xs font-medium">Semester {sem.semester}</TableCell>
                            <TableCell className="text-xs text-center">{sem.totalStudents}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs font-bold ${sem.avgPerformanceIndex >= 70 ? 'text-emerald-600' : sem.avgPerformanceIndex >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{sem.avgPerformanceIndex}%</span>
                            </TableCell>
                            <TableCell className="text-xs text-center">{sem.avgAttendance}%</TableCell>
                            <TableCell className="text-xs text-center">{sem.avgAssessmentScore}%</TableCell>
                            <TableCell className="text-xs text-center">{sem.taskCompletion}%</TableCell>
                            <TableCell className="text-center">
                              {(() => { const sp = priData.semesterPRIs.find(s => s.semester === sem.semester); const val = sp?.pri ?? 0; return <span className={`text-xs font-bold ${val >= 70 ? 'text-emerald-600' : val >= 55 ? 'text-amber-600' : 'text-red-600'}`}>{val}%</span>; })()}
                            </TableCell>
                            <TableCell className="text-xs text-center">
                              <Badge className={`border-0 text-[10px] ${sem.riskStudents > 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{sem.riskStudents}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-center">{sem.sections.length}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Semester Subject Strength */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Semester Subject Strength Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredSemesters.map(sem => (
                        <div key={sem.semester} className="p-3 bg-muted/30 rounded-lg space-y-2">
                          <div className="text-xs font-semibold">Semester {sem.semester}</div>
                          <div className="flex items-center gap-1 text-[11px]">
                            <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                            <span className="text-muted-foreground">Strong:</span>
                            <span className="text-emerald-700 font-medium">{sem.strongSubjects.join(', ')}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px]">
                            <ArrowDownRight className="h-3 w-3 text-red-600" />
                            <span className="text-muted-foreground">Weak:</span>
                            <span className="text-red-700 font-medium">{sem.weakSubjects.join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== SECTION TAB ===== */}
              <TabsContent value="section" className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" style={{ color: '#0EA5A4' }} />
                      Section Rankings by Performance Index
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-xs">#</TableHead>
                          <TableHead className="text-xs">Section</TableHead>
                          <TableHead className="text-xs text-center">Sem</TableHead>
                          <TableHead className="text-xs text-center">Students</TableHead>
                          <TableHead className="text-xs text-center">SPI</TableHead>
                          <TableHead className="text-xs text-center">Attendance</TableHead>
                          <TableHead className="text-xs text-center">Assessment</TableHead>
                          <TableHead className="text-xs text-center">PRI</TableHead>
                          <TableHead className="text-xs text-center">Faculty</TableHead>
                          <TableHead className="text-xs text-center">Risk</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankedSections.map((sec, i) => (
                          <Fragment key={sec.id}>
                            <TableRow
                              className={`cursor-pointer ${i < 3 ? 'bg-emerald-50/50' : ''}`}
                              onClick={() => setExpandedSection(expandedSection === sec.id ? null : sec.id)}
                            >
                              <TableCell className="text-xs font-semibold">
                                {i < 3 ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold" style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#d97706', color: '#fff' }}>{i + 1}</span>
                                ) : i + 1}
                              </TableCell>
                              <TableCell className="text-xs font-medium">{sec.name}</TableCell>
                              <TableCell className="text-xs text-center">{sec.semester}</TableCell>
                              <TableCell className="text-xs text-center">{sec.totalStudents}</TableCell>
                              <TableCell className="text-center">
                                <span className={`text-xs font-bold ${sec.spiValue >= 70 ? 'text-emerald-600' : sec.spiValue >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{sec.spiValue}%</span>
                              </TableCell>
                              <TableCell className="text-xs text-center">{sec.attendance}%</TableCell>
                              <TableCell className="text-xs text-center">{sec.assessmentAvg}%</TableCell>
                              <TableCell className="text-center">
                                {(() => { const sp = priData.sectionPRIs.find(s => s.sectionId === sec.id); const val = sp?.pri ?? 0; return <span className={`text-xs font-bold ${val >= 70 ? 'text-emerald-600' : val >= 55 ? 'text-amber-600' : 'text-red-600'}`}>{val}%</span>; })()}
                              </TableCell>
                              <TableCell className="text-xs text-center truncate max-w-[100px]">{sec.facultyName}</TableCell>
                              <TableCell className="text-center">{riskBadge(sec.riskLevel)}</TableCell>
                              <TableCell>{expandedSection === sec.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</TableCell>
                            </TableRow>
                            {expandedSection === sec.id && (
                              <TableRow key={`${sec.id}-detail`}>
                                <TableCell colSpan={11} className="p-2">
                                  {renderSectionDetail(sec)}
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== ATTENDANCE TAB ===== */}
              <TabsContent value="attendance" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Department Attendance */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Attendance by Semester</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={filteredSemesters.map(s => ({ name: `Sem ${s.semester}`, attendance: s.avgAttendance }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={[50, 100]} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Bar dataKey="attendance" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Attendance %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Attendance by Section */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Attendance by Section</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={allSections.slice(0, 12).map(s => ({ name: `${s.name.replace('Section ', '')}(S${s.semester})`, attendance: s.attendance }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={[50, 100]} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Bar dataKey="attendance" fill="#0EA5A4" radius={[4, 4, 0, 0]} name="Attendance %" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Attendance Shortage Report */}
                <Card className="shadow-sm border-l-4 border-l-red-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Attendance Shortage Report (Below 75%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Student</TableHead>
                          <TableHead className="text-xs text-center">Section</TableHead>
                          <TableHead className="text-xs text-center">Semester</TableHead>
                          <TableHead className="text-xs text-center">Attendance</TableHead>
                          <TableHead className="text-xs text-center">Missed Classes</TableHead>
                          <TableHead className="text-xs text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceShortage.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="text-xs font-medium">{s.name}</TableCell>
                            <TableCell className="text-xs text-center">{s.section}</TableCell>
                            <TableCell className="text-xs text-center">{s.semester}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs font-bold ${s.attendance < 60 ? 'text-red-600' : 'text-amber-600'}`}>{s.attendance}%</span>
                            </TableCell>
                            <TableCell className="text-xs text-center">{s.missedClasses}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={`border-0 text-[10px] ${s.attendance < 60 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {s.attendance < 60 ? 'Critical' : 'Warning'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== ASSESSMENT TAB ===== */}
              <TabsContent value="assessment" className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Avg Test Score', value: `${testAnalytics.avgTestScore}%`, icon: BarChart3, color: 'text-blue-600' },
                    { label: 'Avg Accuracy', value: `${testAnalytics.avgAccuracy}%`, icon: Target, color: 'text-indigo-600' },
                    { label: 'Easy Accuracy', value: `${testAnalytics.easyAccuracy}%`, icon: CheckCircle, color: 'text-emerald-600' },
                    { label: 'Medium Accuracy', value: `${testAnalytics.mediumAccuracy}%`, icon: BookOpen, color: 'text-amber-600' },
                    { label: 'Hard Accuracy', value: `${testAnalytics.hardAccuracy}%`, icon: AlertTriangle, color: 'text-red-600' },
                    { label: 'Tests Taken', value: testAnalytics.totalTestsTaken, icon: FileText, color: 'text-purple-600' },
                  ].map((item, i) => (
                    <Card key={i} className="shadow-sm">
                      <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                        <div className="text-lg font-bold text-foreground">{item.value}</div>
                        <div className="text-[10px] text-muted-foreground">{item.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Subject-wise Assessment Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Subject</TableHead>
                          <TableHead className="text-xs text-center">Semester</TableHead>
                          <TableHead className="text-xs text-center">Section Avg</TableHead>
                          <TableHead className="text-xs text-center">Pass Rate</TableHead>
                          <TableHead className="text-xs text-center">Highest</TableHead>
                          <TableHead className="text-xs text-center">Lowest</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assessmentReports.map((ar, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-medium">{ar.subject}</TableCell>
                            <TableCell className="text-xs text-center">{ar.semester}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs font-bold ${ar.sectionAvg >= 70 ? 'text-emerald-600' : ar.sectionAvg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{ar.sectionAvg}%</span>
                            </TableCell>
                            <TableCell className="text-xs text-center">{ar.passRate}%</TableCell>
                            <TableCell className="text-xs text-center text-emerald-600">{ar.highestScore}%</TableCell>
                            <TableCell className="text-xs text-center text-red-600">{ar.lowestScore}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== PLACEMENT TAB ===== */}
              <TabsContent value="placement" className="space-y-6">
                {/* Top KPIs: PI, PS, PRI */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Avg PI', value: `${summary.dpi}%`, icon: TrendingUp, color: 'text-blue-600' },
                    { label: 'Avg PS', value: `${Math.round((priData.breakdown.coreSubjects + priData.breakdown.mockInterviews + priData.breakdown.aptitude + priData.breakdown.logicalReasoning + priData.breakdown.communication) / 5)}%`, icon: BarChart3, color: 'text-indigo-600' },
                    { label: 'Avg PRI', value: `${priData.avgPRI}%`, icon: Briefcase, color: 'text-orange-600' },
                    { label: 'Strong PI (≥75)', value: `${Math.round((allStudents.filter(s => s.performanceIndex >= 75).length / Math.max(allStudents.length, 1)) * 100)}%`, icon: CheckCircle, color: 'text-emerald-600' },
                    { label: 'Strong PS (≥75)', value: `${Math.round((priData.studentPRIs.filter(s => s.pri >= 75).length / Math.max(priData.studentPRIs.length, 1)) * 100)}%`, icon: Target, color: 'text-teal-600' },
                    { label: 'Interview Ready', value: `${priData.readyPct}%`, icon: GraduationCap, color: 'text-amber-600' },
                  ].map((item, i) => (
                    <Card key={i} className="shadow-sm">
                      <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                        <div className="text-xl font-bold text-foreground">{item.value}</div>
                        <div className="text-[10px] text-muted-foreground">{item.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* PRI Distribution */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-orange-600" />
                      PRI Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <div className="text-lg font-bold text-emerald-600">{priData.readyPct}%</div>
                        <div className="text-[10px] text-muted-foreground">Ready (PRI ≥85)</div>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <div className="text-lg font-bold text-amber-600">{priData.almostReadyPct}%</div>
                        <div className="text-[10px] text-muted-foreground">Almost Ready (70–84)</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-bold text-red-600">{priData.needsImprovementPct}%</div>
                        <div className="text-[10px] text-muted-foreground">Needs Improvement (&lt;70)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Core Subject Performance */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      Core Subject Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {priData.coreSubjectPerformance?.length > 0 ? (
                        priData.coreSubjectPerformance.map((item, i) => {
                          const strength = item.score >= 75 ? 'Strong' : item.score >= 55 ? 'Moderate' : 'Weak';
                          const strengthColor = strength === 'Strong' ? 'bg-emerald-100 text-emerald-700' : strength === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs font-medium w-28 shrink-0 truncate">{item.subject}</span>
                              <Progress value={item.score} className="h-2 flex-1" />
                              <span className={`text-xs font-bold w-10 text-right ${item.score >= 70 ? 'text-emerald-600' : item.score >= 55 ? 'text-amber-600' : 'text-red-600'}`}>{item.score}%</span>
                              <Badge className={`border-0 text-[10px] ${strengthColor}`}>{strength}</Badge>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                          No placement-related assessment data found in the backend.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* PS Component Breakdown */}
                <Card className="shadow-sm border-l-4 border-l-orange-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-orange-600" />
                      Preparation Score (PS) Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { label: 'Core Subjects (DSA, Python, DB, SD)', value: priData.breakdown.coreSubjects, interpretation: priData.breakdown.coreSubjects < 60 ? '⚠ Academic gap' : '' },
                        { label: 'Mock Interviews', value: priData.breakdown.mockInterviews, interpretation: priData.breakdown.mockInterviews < 55 ? '⚠ Interview readiness issue' : '' },
                        { label: 'Aptitude', value: priData.breakdown.aptitude, interpretation: priData.breakdown.aptitude < 55 ? '⚠ Needs practice' : '' },
                        { label: 'Logical Reasoning', value: priData.breakdown.logicalReasoning, interpretation: priData.breakdown.logicalReasoning < 55 ? '⚠ Needs practice' : '' },
                        { label: 'Communication', value: priData.breakdown.communication, interpretation: priData.breakdown.communication < 55 ? '⚠ HR round issue' : '' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-48 shrink-0">{item.label}</span>
                          <Progress value={item.value} className="h-2 flex-1" />
                          <span className={`text-xs font-bold w-10 text-right ${item.value >= 70 ? 'text-emerald-600' : item.value >= 55 ? 'text-amber-600' : 'text-red-600'}`}>{item.value}%</span>
                          {item.interpretation && <span className="text-[10px] text-red-600 shrink-0">{item.interpretation}</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Improvement Areas & Actionable Suggestions */}
                <Card className="shadow-sm border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Improvement Areas & Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const items: { text: string; type: 'danger' | 'warning' | 'info' }[] = [];
                      if (priData.breakdown.coreSubjects < 60) items.push({ text: 'Core academic performance is below target. Consider subject-specific remedial sessions.', type: 'danger' });
                      if (priData.breakdown.mockInterviews < 55) items.push({ text: 'Mock interview readiness is critical. Schedule one-on-one feedback sessions.', type: 'danger' });
                      if (priData.breakdown.communication < 50) items.push({ text: 'Communication skills are impacting placement readiness. Initiate soft-skills training.', type: 'warning' });
                      if (priData.breakdown.aptitude < 60) items.push({ text: 'Aptitude performance is moderate. Weekly practice tests recommended.', type: 'warning' });
                      
                      // Subject specific insights
                      priData.coreSubjectPerformance?.forEach(cp => {
                        if (cp.score < 55) {
                          items.push({ text: `Performance in ${cp.subject} is weak. Targeted workshops needed.`, type: 'danger' });
                        }
                      });

                      if (items.length === 0) {
                        items.push({ text: 'Overall placement readiness is strong. Focus on advanced competitive coding.', type: 'info' });
                        items.push({ text: 'Maintain current progress in mock interviews.', type: 'info' });
                      }

                      return items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${item.type === 'danger' ? 'bg-red-500' : item.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          <span className="text-muted-foreground">{item.text}</span>
                        </div>
                      ));
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== FACULTY TAB ===== */}
              <TabsContent value="faculty" className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-indigo-600" />
                      Faculty Performance Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Faculty</TableHead>
                          <TableHead className="text-xs text-center">Section(s)</TableHead>
                          <TableHead className="text-xs text-center">Subject(s)</TableHead>
                          <TableHead className="text-xs text-center">Student PI</TableHead>
                          <TableHead className="text-xs text-center">Attendance</TableHead>
                          <TableHead className="text-xs text-center">Assessment Avg</TableHead>
                          <TableHead className="text-xs text-center">FPI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {facultyPerformance.map(f => (
                          <TableRow key={f.id}>
                            <TableCell className="text-xs font-medium">{f.name}</TableCell>
                            <TableCell className="text-xs text-center">{f.sections.join(', ')}</TableCell>
                            <TableCell className="text-xs text-center truncate max-w-[120px]">{f.subjects.join(', ')}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs font-bold ${f.avgStudentPI >= 70 ? 'text-emerald-600' : f.avgStudentPI >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{f.avgStudentPI}%</span>
                            </TableCell>
                            <TableCell className="text-xs text-center">{f.avgAttendance}%</TableCell>
                            <TableCell className="text-xs text-center">{f.avgAssessmentScore}%</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs font-bold ${f.fpiScore >= 70 ? 'text-emerald-600' : f.fpiScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{f.fpiScore}%</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              </Tabs>
              </>
            )}
          </main>
        </div>
      </div>
      {renderStudentDetail()}
    </SidebarProvider>
  );
};

export default HODDashboard;

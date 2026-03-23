import React, { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import RoleSidebar from '@/components/common/RoleSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  UserCheck, Users, TrendingUp, BookOpen, AlertTriangle, Download, Lightbulb,
  BarChart3, Target, Shield, ChevronDown, ChevronUp, FileText, Building2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Dummy faculty data across departments ──
const departments = [
  { id: 'all', name: 'All Departments' },
  { id: 'cse', name: 'Computer Science' },
  { id: 'ece', name: 'Electronics & Comm.' },
  { id: 'it', name: 'Information Technology' },
  { id: 'mech', name: 'Mechanical' },
  { id: 'civil', name: 'Civil' },
  { id: 'eee', name: 'Electrical' },
];

interface FacultyEntry {
  id: string;
  name: string;
  department: string;
  departmentId: string;
  sections: string[];
  subjects: string[];
  avgStudentPI: number;
  avgAttendance: number;
  avgAssessmentScore: number;
  fpiScore: number;
  studentsHandled: number;
}

const generateFacultyData = (): FacultyEntry[] => {
  const data: FacultyEntry[] = [
    { id: 'f1', name: 'Dr. Rajesh Sharma', department: 'Computer Science', departmentId: 'cse', sections: ['CSE-6A', 'CSE-5B'], subjects: ['Data Structures', 'Algorithms', 'Machine Learning'], avgStudentPI: 84, avgAttendance: 89, avgAssessmentScore: 81, fpiScore: 85, studentsHandled: 120 },
    { id: 'f2', name: 'Prof. Meena Iyer', department: 'Computer Science', departmentId: 'cse', sections: ['CSE-4A', 'CSE-3A'], subjects: ['DBMS', 'Software Engineering'], avgStudentPI: 78, avgAttendance: 85, avgAssessmentScore: 76, fpiScore: 80, studentsHandled: 110 },
    { id: 'f3', name: 'Dr. Suresh Patel', department: 'Computer Science', departmentId: 'cse', sections: ['CSE-2A', 'CSE-1B'], subjects: ['Computer Networks', 'Operating Systems'], avgStudentPI: 71, avgAttendance: 80, avgAssessmentScore: 68, fpiScore: 73, studentsHandled: 95 },
    { id: 'f4', name: 'Prof. Kavitha Rao', department: 'Electronics & Comm.', departmentId: 'ece', sections: ['ECE-6A', 'ECE-5A'], subjects: ['Digital Electronics', 'Microprocessors', 'VLSI Design'], avgStudentPI: 80, avgAttendance: 86, avgAssessmentScore: 77, fpiScore: 81, studentsHandled: 105 },
    { id: 'f5', name: 'Dr. Amit Gupta', department: 'Electronics & Comm.', departmentId: 'ece', sections: ['ECE-4A', 'ECE-3B'], subjects: ['Signals & Systems', 'Communication Theory'], avgStudentPI: 74, avgAttendance: 82, avgAssessmentScore: 72, fpiScore: 76, studentsHandled: 100 },
    { id: 'f6', name: 'Prof. Lakshmi Nair', department: 'Information Technology', departmentId: 'it', sections: ['IT-5A', 'IT-4A'], subjects: ['Web Development', 'Cloud Computing', 'Cyber Security'], avgStudentPI: 82, avgAttendance: 88, avgAssessmentScore: 79, fpiScore: 83, studentsHandled: 115 },
    { id: 'f7', name: 'Dr. Prakash Joshi', department: 'Information Technology', departmentId: 'it', sections: ['IT-3A', 'IT-2A'], subjects: ['Python Programming', 'Data Science'], avgStudentPI: 75, avgAttendance: 83, avgAssessmentScore: 73, fpiScore: 77, studentsHandled: 90 },
    { id: 'f8', name: 'Prof. Sunita Verma', department: 'Mechanical', departmentId: 'mech', sections: ['ME-5A', 'ME-4A'], subjects: ['Thermodynamics', 'Fluid Mechanics', 'Manufacturing'], avgStudentPI: 68, avgAttendance: 78, avgAssessmentScore: 65, fpiScore: 70, studentsHandled: 85 },
    { id: 'f9', name: 'Dr. Arun Kumar', department: 'Mechanical', departmentId: 'mech', sections: ['ME-3A', 'ME-3B'], subjects: ['Strength of Materials', 'Machine Design'], avgStudentPI: 62, avgAttendance: 75, avgAssessmentScore: 60, fpiScore: 66, studentsHandled: 80 },
    { id: 'f10', name: 'Prof. Deepa Mishra', department: 'Civil', departmentId: 'civil', sections: ['CE-5A', 'CE-3A'], subjects: ['Structural Analysis', 'Geotechnical Engineering', 'Surveying'], avgStudentPI: 64, avgAttendance: 76, avgAssessmentScore: 62, fpiScore: 67, studentsHandled: 75 },
    { id: 'f11', name: 'Dr. Venkat Reddy', department: 'Civil', departmentId: 'civil', sections: ['CE-2A', 'CE-1A'], subjects: ['Construction Management', 'Environmental Engineering'], avgStudentPI: 58, avgAttendance: 72, avgAssessmentScore: 55, fpiScore: 62, studentsHandled: 70 },
    { id: 'f12', name: 'Prof. Anita Singh', department: 'Electrical', departmentId: 'eee', sections: ['EE-5A', 'EE-3B'], subjects: ['Control Systems', 'Power Electronics', 'Electrical Machines'], avgStudentPI: 60, avgAttendance: 74, avgAssessmentScore: 58, fpiScore: 64, studentsHandled: 78 },
    { id: 'f13', name: 'Dr. Ramesh Nair', department: 'Electrical', departmentId: 'eee', sections: ['EE-2A', 'EE-1B'], subjects: ['Circuit Theory', 'Electromagnetic Fields'], avgStudentPI: 56, avgAttendance: 71, avgAssessmentScore: 53, fpiScore: 60, studentsHandled: 65 },
    { id: 'f14', name: 'Prof. Priya Das', department: 'Computer Science', departmentId: 'cse', sections: ['CSE-6B', 'CSE-5A'], subjects: ['Artificial Intelligence', 'Deep Learning'], avgStudentPI: 86, avgAttendance: 91, avgAssessmentScore: 83, fpiScore: 87, studentsHandled: 100 },
    { id: 'f15', name: 'Dr. Sanjay Mehta', department: 'Electronics & Comm.', departmentId: 'ece', sections: ['ECE-2A', 'ECE-1A'], subjects: ['Analog Circuits', 'Embedded Systems'], avgStudentPI: 70, avgAttendance: 79, avgAssessmentScore: 68, fpiScore: 72, studentsHandled: 88 },
  ];
  return data;
};

let _cachedFaculty: FacultyEntry[] | null = null;
const getFacultyData = () => {
  if (!_cachedFaculty) _cachedFaculty = generateFacultyData();
  return _cachedFaculty;
};

const Faculty = () => {
  const [selectedDept, setSelectedDept] = useState('all');
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);

  const allFaculty = useMemo(() => getFacultyData(), []);

  const filteredFaculty = useMemo(() => {
    const list = selectedDept === 'all' ? allFaculty : allFaculty.filter(f => f.departmentId === selectedDept);
    return [...list].sort((a, b) => b.fpiScore - a.fpiScore);
  }, [allFaculty, selectedDept]);

  const summary = useMemo(() => {
    const list = filteredFaculty;
    return {
      totalFaculty: list.length,
      totalStudents: list.reduce((a, f) => a + f.studentsHandled, 0),
      avgFPI: list.length > 0 ? Math.round(list.reduce((a, f) => a + f.fpiScore, 0) / list.length) : 0,
      avgStudentPI: list.length > 0 ? Math.round(list.reduce((a, f) => a + f.avgStudentPI, 0) / list.length) : 0,
      avgAttendance: list.length > 0 ? Math.round(list.reduce((a, f) => a + f.avgAttendance, 0) / list.length) : 0,
      avgAssessment: list.length > 0 ? Math.round(list.reduce((a, f) => a + f.avgAssessmentScore, 0) / list.length) : 0,
      riskFaculty: list.filter(f => f.fpiScore < 65).length,
    };
  }, [filteredFaculty]);

  const deptComparison = useMemo(() => {
    const deptIds = departments.filter(d => d.id !== 'all');
    return deptIds.map(d => {
      const deptFaculty = allFaculty.filter(f => f.departmentId === d.id);
      const avgFPI = deptFaculty.length > 0 ? Math.round(deptFaculty.reduce((a, f) => a + f.fpiScore, 0) / deptFaculty.length) : 0;
      return { name: d.name.substring(0, 8), fullName: d.name, avgFPI, count: deptFaculty.length };
    }).sort((a, b) => b.avgFPI - a.avgFPI);
  }, [allFaculty]);

  const insights = useMemo(() => {
    const items: { text: string; type: 'success' | 'warning' | 'danger' | 'info' }[] = [];
    const topFaculty = filteredFaculty[0];
    const bottomFaculty = filteredFaculty[filteredFaculty.length - 1];
    if (topFaculty) items.push({ text: `${topFaculty.name} leads with FPI ${topFaculty.fpiScore}% (${topFaculty.department}).`, type: 'success' });
    if (bottomFaculty && bottomFaculty.fpiScore < 65) items.push({ text: `${bottomFaculty.name} has lowest FPI at ${bottomFaculty.fpiScore}% — needs support.`, type: 'danger' });

    if (selectedDept === 'all') {
      const best = deptComparison[0];
      const worst = deptComparison[deptComparison.length - 1];
      if (best) items.push({ text: `${best.fullName} department faculty outperform others (avg FPI: ${best.avgFPI}%).`, type: 'info' });
      if (worst && worst.avgFPI < 70) items.push({ text: `${worst.fullName} department shows lower faculty performance (avg FPI: ${worst.avgFPI}%).`, type: 'warning' });
    }

    const lowAttFaculty = filteredFaculty.filter(f => f.avgAttendance < 78);
    if (lowAttFaculty.length > 0) items.push({ text: `${lowAttFaculty.length} faculty have section attendance below 78%.`, type: 'warning' });

    const lowAssessment = filteredFaculty.filter(f => f.avgAssessmentScore < 60);
    if (lowAssessment.length > 0) items.push({ text: `${lowAssessment.length} faculty have assessment averages below 60%.`, type: 'danger' });

    items.push({ text: 'Consider faculty development programs for underperforming sections.', type: 'info' });
    return items;
  }, [filteredFaculty, selectedDept, deptComparison]);

  const fpiColor = (fpi: number) => fpi >= 75 ? 'text-emerald-600' : fpi >= 65 ? 'text-amber-600' : 'text-red-600';
  const fpiRank = (fpi: number) => fpi >= 75 ? 'Excellent' : fpi >= 65 ? 'Good' : 'Needs Improvement';
  const fpiRankColor = (fpi: number) => fpi >= 75 ? 'bg-emerald-100 text-emerald-700' : fpi >= 65 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

  const selectedDeptName = departments.find(d => d.id === selectedDept)?.name || 'All Departments';

  return (
    <SidebarProvider>
      <RoleSidebar />
      <SidebarInset className="p-4 md:p-6 bg-background">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <h1 className="text-2xl font-bold mb-6">Faculty Performance</h1>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Total Faculty', value: summary.totalFaculty, icon: UserCheck, color: 'text-indigo-600' },
              { label: 'Students Handled', value: summary.totalStudents, icon: Users, color: 'text-blue-600' },
              { label: 'Avg FPI', value: `${summary.avgFPI}%`, icon: TrendingUp, color: 'text-emerald-600' },
              { label: 'Avg Student PI', value: `${summary.avgStudentPI}%`, icon: Target, color: 'text-teal-600' },
              { label: 'Avg Attendance', value: `${summary.avgAttendance}%`, icon: BookOpen, color: 'text-amber-600' },
              { label: 'Avg Assessment', value: `${summary.avgAssessment}%`, icon: BarChart3, color: 'text-purple-600' },
              { label: 'At Risk', value: summary.riskFaculty, icon: AlertTriangle, color: 'text-red-600' },
            ].map((item, i) => (
              <Card key={i} className="">
                <CardContent className="p-3 flex flex-col items-center text-center gap-1">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <div className="text-lg font-bold text-foreground">{item.value}</div>
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Department Comparison Chart (shown when All Departments selected) */}
          {selectedDept === 'all' && (
            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  Department-wise Average FPI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptComparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[40, 100]} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="avgFPI" fill="#6366f1" radius={[4, 4, 0, 0]} name="Avg FPI" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Faculty Ranking Table */}
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600" />
                Faculty Ranking — {selectedDeptName}
                <Badge variant="outline" className="text-[10px] ml-auto">{filteredFaculty.length} Faculty</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="w-full p-0 overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-10">#</TableHead>
                    <TableHead className="text-xs">Faculty</TableHead>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs text-center">Section(s)</TableHead>
                    <TableHead className="text-xs text-center">Subject(s)</TableHead>
                    <TableHead className="text-xs text-center">Student PI</TableHead>
                    <TableHead className="text-xs text-center">Attendance</TableHead>
                    <TableHead className="text-xs text-center">Assessment</TableHead>
                    <TableHead className="text-xs text-center">FPI</TableHead>
                    <TableHead className="text-xs text-center">Rating</TableHead>
                    <TableHead className="text-xs w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFaculty.map((f, idx) => (
                    <React.Fragment key={f.id}>
                      <TableRow
                        className={`cursor-pointer hover:bg-muted/50 ${idx < 3 ? 'bg-emerald-50/40' : ''}`}
                        onClick={() => setExpandedFaculty(expandedFaculty === f.id ? null : f.id)}
                      >
                        <TableCell className="text-xs font-bold text-muted-foreground">
                          {idx < 3 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{idx + 1}</span>
                          ) : idx + 1}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{f.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.department}</TableCell>
                        <TableCell className="text-xs text-center">{f.sections.join(', ')}</TableCell>
                        <TableCell className="text-xs text-center truncate max-w-[140px]" title={f.subjects.join(', ')}>{f.subjects.join(', ')}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-bold ${fpiColor(f.avgStudentPI)}`}>{f.avgStudentPI}%</span>
                        </TableCell>
                        <TableCell className="text-xs text-center">{f.avgAttendance}%</TableCell>
                        <TableCell className="text-xs text-center">{f.avgAssessmentScore}%</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs font-bold ${fpiColor(f.fpiScore)}`}>{f.fpiScore}%</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`border-0 text-[10px] ${fpiRankColor(f.fpiScore)}`}>{fpiRank(f.fpiScore)}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {expandedFaculty === f.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </TableCell>
                      </TableRow>
                      {expandedFaculty === f.id && (
                        <TableRow>
                          <TableCell colSpan={11} className="p-0">
                            <div className="bg-muted/30 p-4 space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="text-center p-2 bg-background rounded-md border">
                                  <div className="text-xs text-muted-foreground">Students Handled</div>
                                  <div className="text-lg font-bold">{f.studentsHandled}</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded-md border">
                                  <div className="text-xs text-muted-foreground">Subjects</div>
                                  <div className="text-lg font-bold">{f.subjects.length}</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded-md border">
                                  <div className="text-xs text-muted-foreground">Sections</div>
                                  <div className="text-lg font-bold">{f.sections.length}</div>
                                </div>
                                <div className="text-center p-2 bg-background rounded-md shadow-sm">
                                  <div className="text-xs text-muted-foreground">FPI Score</div>
                                  <div className={`text-lg font-bold ${fpiColor(f.fpiScore)}`}>{f.fpiScore}%</div>
                                </div>
                              </div>
                              <div>
                                <h5 className="text-xs font-semibold mb-2">Subject-wise Performance</h5>
                                <div className="space-y-2">
                                  {f.subjects.map((subj, si) => {
                                    const score = Math.max(50, Math.min(95, f.fpiScore + (si === 0 ? 3 : si === 1 ? -2 : -5) + Math.round(Math.random() * 6 - 3)));
                                    return (
                                      <div key={si} className="flex items-center gap-3">
                                        <span className="text-xs w-40 shrink-0 text-muted-foreground">{subj}</span>
                                        <Progress value={score} className="h-2 flex-1" />
                                        <span className={`text-xs font-bold w-10 text-right ${fpiColor(score)}`}>{score}%</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Risk Panel */}
          {summary.riskFaculty > 0 && (
            <Card className="border-l-4 border-l-red-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-red-500" />
                  Faculty Risk Panel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredFaculty.filter(f => f.fpiScore < 65).map(f => (
                    <div key={f.id} className="flex items-center justify-between p-2 bg-red-50 rounded-md">
                      <div>
                        <span className="text-xs font-medium text-foreground">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">({f.department})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">FPI: <span className="font-bold text-red-600">{f.fpiScore}%</span></span>
                        <span className="text-[10px] text-muted-foreground">Att: {f.avgAttendance}%</span>
                        <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Needs Improvement</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          <Card className="border-l-4" style={{ borderLeftColor: '#f59e0b' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                {selectedDept === 'all' ? 'Cross-Department Insights' : `Insights — ${selectedDeptName}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${item.type === 'success' ? 'bg-emerald-500' : item.type === 'danger' ? 'bg-red-500' : item.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <span className="text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Faculty;

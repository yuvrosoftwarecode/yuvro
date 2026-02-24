import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import subjectService, { SectionSubjectFaculty, getFacultyAssignments } from '../../services/subjectService';
import studentService from '../../services/studentService';
import { cn } from '@/lib/utils';
import {
    Search,
    Filter,
    Download,
    FileText,
    Table as TableIcon,
    User,
    TrendingUp,
    Calendar,
    CheckCircle2,
    BookOpen,
    ChevronDown,
    MoreHorizontal,
    Star,
    AlertTriangle,
    Zap,
    Target,
    Activity,
    Clock,
    LayoutDashboard,
    PieChart as PieChartIcon,
    Search as SearchIcon,
    ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
// html2pdf will be imported dynamically in handleExportPDF
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

const Reports: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);

    // Filters state
    const [selectedDept, setSelectedDept] = useState<string>('all');
    const [selectedBatch, setSelectedBatch] = useState<string>('all');
    const [selectedSem, setSelectedSem] = useState<string>('all');
    const [selectedSection, setSelectedSection] = useState<string>('all');
    const [selectedSubject, setSelectedSubject] = useState<string>('all');

    // Data state
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [attendanceStats, setAttendanceStats] = useState({ percentage: 0, present: 0, total: 0 });
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [analyticsData, setAnalyticsData] = useState<any>(null);

    // New states for Date Range and Generate Trigger
    const [dateRange, setDateRange] = useState<string>('30');
    const [reportGenerated, setReportGenerated] = useState(false);
    const [generating, setGenerating] = useState(false);
    const reportRef = React.useRef<HTMLDivElement>(null);
    const isAutoSelecting = React.useRef(false);

    // Reset dependents when parents change
    useEffect(() => { if (!isAutoSelecting.current) { setSelectedBatch('all'); setSelectedSem('all'); setSelectedSection('all'); setSelectedSubject('all'); } }, [selectedDept]);
    useEffect(() => { if (!isAutoSelecting.current) { setSelectedSem('all'); setSelectedSection('all'); setSelectedSubject('all'); } }, [selectedBatch]);
    useEffect(() => { if (!isAutoSelecting.current) { setSelectedSection('all'); setSelectedSubject('all'); } }, [selectedSem]);
    useEffect(() => { if (!isAutoSelecting.current) { setSelectedSubject('all'); } }, [selectedSection]);

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const facultyAssignments = await getFacultyAssignments();
                setAssignments(facultyAssignments);
            } catch (err) {
                console.error("Failed to load reports data", err);
                toast.error("Failed to load report data");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const loadStudentData = async (studentId: string | number) => {
        try {
            // 1. Fetch Stats for high-level cards
            const stats = (await subjectService.fetchUserStats(studentId as string)) as any;

            // 2. Fetch Overall Progress for subject-wise performance
            const progress = (await subjectService.fetchOverallUserProgress(studentId as string)) as any[];

            // 3. Map progress to performanceData (Table Rows)
            const mappedPerformance = progress.map((p: any) => ({
                id: p.subject_id,
                name: p.subject_name || p.subject_id,
                code: p.subject_code || 'N/A',
                notes: `${Math.round(p.video_pct || 0)}%`,
                testAvg: `${Math.round(p.avg_quiz_score || 0)}%`,
                assessmentAvg: `${Math.round(p.avg_coding_score || 0)}%`,
                tasks_completed: p.tasks_completed || 0,
                tasks_total: p.tasks_total || 0,
                tasks_pending: (p.tasks_total || 0) - (p.tasks_completed || 0),
                attendance: `${p.attendance_pct || 0}%`,
                strength: p.percent > 75 ? 'Strong' : p.percent > 50 ? 'Average' : 'Weak',
                risk: p.percent < 40 ? 'High' : p.percent < 70 ? 'Medium' : 'Low'
            }));

            setPerformanceData(mappedPerformance);

            // 3.1 Map Attendance Data for Chart
            const mappedAttendance = progress.map((p: any) => ({
                subject: p.subject_code || p.subject_name || p.subject_id,
                percentage: p.attendance_pct || 0
            }));
            setAttendanceData(mappedAttendance);

            // 4. Map to analyticsData for cards and summary
            const sortedProgress = [...progress].sort((a, b) => b.percent - a.percent);

            setAnalyticsData({
                performanceIndex: `${Math.round(stats.avg_progress || 0)}%`,
                status: stats.avg_progress > 80 ? "Advanced" : stats.avg_progress > 50 ? "Intermediate" : "Beginner",
                strongest: sortedProgress[0]?.subject_name || "N/A",
                weakest: sortedProgress[sortedProgress.length - 1]?.subject_name || "N/A",
                streak: stats.streak || 0,
                longest_streak: stats.longest_streak || 0,
                performanceGap: sortedProgress.length > 1
                    ? `${Math.round(sortedProgress[0].percent - sortedProgress[sortedProgress.length - 1].percent)}%`
                    : "0%",
                riskItems: mappedPerformance
                    .filter((p: any) => p.risk !== 'Low')
                    .map((p: any) => ({
                        label: 'Low Performance',
                        subj: p.name,
                        count: p.tasks_pending,
                        risk: p.risk
                    }))
            });

            setAttendanceStats({
                percentage: stats.overall_attendance || 0,
                present: stats.active_days || 0,
                total: 0
            });

            // Ensure generate state is true
            setReportGenerated(true);

        } catch (error) {
            console.error("Error loading student data:", error);
            toast.error("Failed to load student data");
            throw error;
        }
    };

    // Report generation handler
    const handleGenerateReport = async () => {
        if (!selectedStudent) {
            toast.error("Please select a student first");
            return;
        }
        setGenerating(true);
        try {
            await loadStudentData(selectedStudent.user);
            setReportGenerated(true);
            toast.success("Report generated successfully");
        } catch (error) {
            console.error("Report generation failed:", error);
        } finally {
            setGenerating(false);
        }
    };

    const handleExportPDF = async () => {
        console.log("Exporting PDF. State:", { reportRef: !!reportRef.current, reportGenerated, selectedStudent: !!selectedStudent });
        if (!reportRef.current || !reportGenerated || !selectedStudent) {
            toast.error("Please generate the report first");
            return;
        }

        if (!performanceData || performanceData.length === 0) {
            toast.error("Please generate the report first.");
            return;
        }

        const toastId = toast.loading("Generating PDF...");

        try {
            const { performanceIndex, status, strongest, weakest, streak } = analyticsData || {};
            const overallAttendance = attendanceStats.percentage;
            const highestPendingSubject = performanceData.reduce((prev: any, curr: any) => (prev.tasks_pending > curr.tasks_pending ? prev : curr), performanceData[0])?.name || "N/A";
            const lowestAttendanceSubject = performanceData.reduce((prev: any, curr: any) => (parseFloat(prev.attendance) < parseFloat(curr.attendance) ? prev : curr), performanceData[0])?.name || "N/A";
            const performanceGap = "31"; // Mock gap

            const reportHtml = `
      <div style="font-family: Arial, sans-serif; padding: 40px; background:#ffffff; color:#000;">
        
        <h1 style="margin-bottom:8px;">Student Academic Report</h1>

        <p style="margin:0 0 20px 0;">
          Generated: ${new Date().toLocaleString()}
        </p>

        <p style="margin:0;">
          ${selectedStudent.user_details?.first_name || selectedStudent.user?.first_name} ${selectedStudent.user_details?.last_name || selectedStudent.user?.last_name}
          (${selectedStudent.roll_number})
        </p>

        <p style="margin:5px 0;">
          ${selectedStudent.department_name} · Semester ${selectedStudent.semester_number} · Section ${selectedStudent.section_name}
        </p>

        <p style="margin:5px 0 25px 0;">
          Performance Index: ${performanceIndex} |
          Status: ${status} |
          Attendance: ${overallAttendance}%
        </p>

        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <thead>
            <tr style="background:#222; color:#fff;">
              <th style="padding:8px; text-align:left;">Subject</th>
              <th style="padding:8px;">Notes %</th>
              <th style="padding:8px;">Test Avg</th>
              <th style="padding:8px;">Assess Avg</th>
              <th style="padding:8px;">Tasks</th>
              <th style="padding:8px;">Attend %</th>
              <th style="padding:8px;">Strength</th>
              <th style="padding:8px;">Risk</th>
            </tr>
          </thead>
          <tbody>
            ${performanceData.map((row, index) => `
              <tr style="background:${index % 2 === 0 ? '#f2f2f2' : '#e6e6e6'};">
                <td style="padding:8px;">${row.name}</td>
                <td style="padding:8px; text-align:center;">${row.notes}</td>
                <td style="padding:8px; text-align:center;">${row.testAvg}</td>
                <td style="padding:8px; text-align:center;">${row.assessmentAvg}</td>
                <td style="padding:8px; text-align:center;">
                  ${row.tasks_completed}/${row.tasks_total}
                </td>
                <td style="padding:8px; text-align:center;">${row.attendance}</td>
                <td style="padding:8px; text-align:center;">${row.strength}</td>
                <td style="padding:8px; text-align:center;">${row.risk}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div style="margin-top:35px;">
          <h2>Strength & Weakness Analysis</h2>
          <p>Strongest: ${strongest}</p>
          <p>Weakest: ${weakest}</p>
          <p>Highest Pending: ${highestPendingSubject}</p>
          <p>Lowest Attendance: ${lowestAttendanceSubject}</p>
          <p>Performance Gap: ${performanceGap}%</p>
        </div>

      </div>
    `;

            const options = {
                margin: 10,
                filename: `Student_Report_${selectedStudent.roll_number}.pdf`,
                image: { type: "jpeg" as const, quality: 1 },
                html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
                jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const }
            };

            try {
                // Use a variable for import to bypass Vite static analysis if needed
                const libName = "html2pdf.js";
                const html2pdf = (await import(/* @vite-ignore */ libName)).default;
                await html2pdf().set(options).from(reportHtml).save();
                toast.success("PDF Downloaded Successfully!");
            } catch (err) {
                console.warn("External PDF library failed, falling back to browser print", err);
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`<html><head><title>Report - ${selectedStudent.roll_number}</title><style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background-color:#f2f2f2;}</style></head><body>${reportHtml}</body></html>`);
                    printWindow.document.close();
                    printWindow.print();
                    toast.success("Report opened in print dialog");
                }
            }

            toast.dismiss(toastId);
        } catch (error) {
            toast.dismiss(toastId);
            console.error("PDF Error:", error);
            toast.error("Failed to generate PDF");
        }
    };

    // Derived hierarchical options
    const filteredByDept = assignments.filter(a => selectedDept === 'all' || a.semester_subject_details?.department_name === selectedDept);
    const departments = Array.from(new Set(assignments.map(a => a.semester_subject_details?.department_name).filter(Boolean)));
    const filteredByBatch = filteredByDept.filter(a => selectedBatch === 'all' || a.semester_subject_details?.batch_name === selectedBatch);
    const batches = Array.from(new Set(filteredByDept.map(a => a.semester_subject_details?.batch_name).filter(Boolean)));
    const filteredBySem = filteredByBatch.filter(a => selectedSem === 'all' || String(a.semester_subject_details?.semester_number) === selectedSem);
    const semesters = Array.from(new Set(filteredByBatch.map(a => a.semester_subject_details?.semester_number).filter(Boolean))).sort();
    const filteredBySection = filteredBySem.filter(a => selectedSection === 'all' || a.section_name === selectedSection);
    const sections = Array.from(new Set(filteredBySem.map(a => a.section_name).filter(Boolean)));
    const subjectsList = Array.from(new Set(filteredBySection.map(a => a.semester_subject_details?.subject_details?.subject_name).filter(Boolean)));

    const handleStudentSearch = async (val: string) => {
        setSearchTerm(val);
        if (val.length > 2) {
            try {
                const response = await studentService.getStudents({ search: val, limit: 10 });
                setStudents((response as any).results || response || []);
            } catch (err) {
                console.error("Student search failed", err);
            }
        }
    };

    const selectStudent = (student: any) => {
        isAutoSelecting.current = true;
        setSelectedStudent(student);
        setSearchTerm(student.user_details?.first_name ? `${student.user_details.first_name} ${student.user_details.last_name || ''}` : `${student.user?.first_name || ''} ${student.user?.last_name || ''}`);

        // Auto-populate filters from student data
        if (student.department_name) setSelectedDept(student.department_name);
        if (student.batch_name) setSelectedBatch(student.batch_name);
        if (student.semester_number) setSelectedSem(String(student.semester_number));
        if (student.section_name) setSelectedSection(student.section_name);

        setStudents([]);
        setReportGenerated(false); // Reset report when student changes
        setTimeout(() => {
            isAutoSelecting.current = false;
        }, 300); // Give enough time for re-renders and effects
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <RoleSidebar />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <RoleHeader
                    title="Faculty Reports"
                    subtitle="Comprehensive academic insights and behavioral analytics"
                />

                <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 pb-32">
                    {/* Filter Card */}
                    <Card className="border-none shadow-sm bg-white overflow-visible rounded-3xl">
                        <CardContent className="p-8">
                            <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-end">
                                <div className="w-full xl:w-[350px] space-y-2 flex-none">
                                    <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest ml-1">
                                        <SearchIcon className="h-3 w-3" /> Search Student
                                    </div>
                                    <div className="relative group">
                                        <Input
                                            value={searchTerm}
                                            onChange={(e) => handleStudentSearch(e.target.value)}
                                            placeholder="Enter student name, roll number, or identifier..."
                                            className="h-12 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 px-5 transition-all text-sm font-medium"
                                        />
                                        {students.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2">
                                                {students.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => selectStudent(s)}
                                                        className="w-full px-6 py-4 text-left hover:bg-indigo-50/50 flex flex-col transition-colors border-b last:border-0 border-gray-50"
                                                    >
                                                        <span className="font-bold text-gray-900">{s.user_details?.first_name || s.user?.first_name} {s.user_details?.last_name || s.user?.last_name}</span>
                                                        <span className="text-xs text-gray-500 font-medium">{s.roll_number} • {s.department_name} • Sec {s.section_name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 w-full flex flex-wrap gap-4 items-end">
                                    {[
                                        { label: 'Dept', val: selectedDept, set: setSelectedDept, options: departments },
                                        { label: 'Batch', val: selectedBatch, set: setSelectedBatch, options: batches },
                                        { label: 'Sem', val: selectedSem, set: setSelectedSem, options: semesters },
                                        { label: 'Sec', val: selectedSection, set: setSelectedSection, options: sections },
                                        { label: 'Subj', val: selectedSubject, set: setSelectedSubject, options: subjectsList }
                                    ].map((filter, i) => (
                                        <div key={i} className="min-w-[140px] flex-1 space-y-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{filter.label}</span>
                                            <Select value={filter.val} onValueChange={filter.set}>
                                                <SelectTrigger className="h-12 bg-gray-50/50 border-gray-100 rounded-2xl flex items-center justify-between px-4 ring-offset-0 focus:ring-4 focus:ring-indigo-500/5 text-sm font-bold text-gray-700">
                                                    <SelectValue placeholder={filter.label} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-gray-100 shadow-xl p-2 min-w-[180px]">
                                                    <SelectItem value="all" className="rounded-xl font-bold py-3">All {filter.label}</SelectItem>
                                                    {filter.options.map((opt: any) => (
                                                        <SelectItem key={String(opt)} value={String(opt)} className="rounded-xl font-medium py-3">
                                                            {filter.label === 'Sem' ? `Semester ${opt}` : opt}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}

                                    {/* Date Range Selector */}
                                    <div className="min-w-[150px] flex-1 space-y-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Range</span>
                                        <Select value={dateRange} onValueChange={setDateRange}>
                                            <SelectTrigger className="h-12 bg-gray-50/50 border-gray-100 rounded-2xl flex items-center justify-between px-4 text-sm font-bold text-gray-700">
                                                <SelectValue placeholder="Range" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-gray-100 shadow-xl p-2">
                                                <SelectItem value="30" className="rounded-xl font-medium py-3">Last 30 Days</SelectItem>
                                                <SelectItem value="60" className="rounded-xl font-medium py-3">Last 60 Days</SelectItem>
                                                <SelectItem value="90" className="rounded-xl font-medium py-3">Last 90 Days</SelectItem>
                                                <SelectItem value="all" className="rounded-xl font-medium py-3">All Time</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Generate Report Button */}
                                    <div className="min-w-[180px] w-full md:w-auto xl:ml-auto">
                                        <Button
                                            onClick={handleGenerateReport}
                                            disabled={generating || !selectedStudent}
                                            className="h-12 w-full xl:w-[180px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            {generating ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileText className="h-4 w-4" />}
                                            Generate Report
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {selectedStudent && reportGenerated ? (
                        <div ref={reportRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                            {/* Student Overview Card */}
                            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-1 lg:grid-cols-10 divide-y lg:divide-y-0 lg:divide-x divide-gray-50">
                                        <div className="lg:col-span-4 p-10 flex items-center gap-8">
                                            <div className="h-24 w-24 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-4xl font-black shadow-inner border border-indigo-100/50">
                                                {(selectedStudent.user_details?.first_name || selectedStudent.user?.first_name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="space-y-1">
                                                <h2 className="text-3xl font-black text-gray-900 leading-none tracking-tight">
                                                    {selectedStudent.user_details?.first_name || selectedStudent.user?.first_name} {selectedStudent.user_details?.last_name || selectedStudent.user?.last_name}
                                                </h2>
                                                <p className="text-gray-500 font-bold text-sm flex items-center gap-2">
                                                    {selectedStudent.roll_number} • {selectedStudent.department_name} • Sem {selectedStudent.semester_number} • Sec {selectedStudent.section_name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-6 p-10 flex items-center justify-around bg-gray-50/30">
                                            {[
                                                { label: 'Performance Index', value: analyticsData?.performanceIndex || '88%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                                { label: 'Overall Status', value: analyticsData?.status || 'Advanced', icon: Star, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                                { label: 'Attendance', value: `${attendanceStats.percentage}%`, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
                                                { label: 'Learning Progress', value: analyticsData?.performanceIndex || '72%', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' }
                                            ].map((stat, i) => (
                                                <div key={i} className="flex flex-col items-center text-center space-y-4">
                                                    <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm border border-white", stat.bg, stat.color)}>
                                                        <stat.icon className="h-7 w-7" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xl font-black text-gray-900">{stat.value}</div>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Detailed Performance Matrix table */}
                            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
                                <CardHeader className="p-8 pb-4 border-b border-gray-50 flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg font-black text-gray-900">Subject-wise Performance Matrix</CardTitle>
                                    <div className="flex gap-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleExportPDF}
                                            className="h-10 px-5 rounded-xl font-bold bg-white border-gray-100 text-gray-600 hover:text-indigo-600 transition-all hover:bg-indigo-50/50"
                                        >
                                            <Download className="h-4 w-4 mr-2" /> Export PDF
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50/20 hover:bg-gray-50/20 border-gray-50">
                                                <TableHead className="w-[40px]"></TableHead>
                                                <TableHead className="py-6 px-4 text-[10px] font-black uppercase text-gray-400 tracking-widest min-w-[280px]">Subject</TableHead>
                                                <TableHead className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">Notes</TableHead>
                                                <TableHead className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">Test Avg</TableHead>
                                                <TableHead className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">Assessment Avg</TableHead>
                                                <TableHead className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">Tasks</TableHead>
                                                <TableHead className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">Attendance</TableHead>
                                                <TableHead className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">Strength</TableHead>
                                                <TableHead className="text-right px-8 text-[10px] font-black uppercase text-gray-400 tracking-widest">Risk</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {performanceData.length > 0 ? (
                                                performanceData.map((row, idx) => (
                                                    <TableRow key={idx} className="hover:bg-indigo-50/5 transition-colors border-gray-50 group cursor-pointer">
                                                        <TableCell className="w-[40px] pl-4">
                                                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                                                        </TableCell>
                                                        <TableCell className="py-6 px-4">
                                                            <div className="space-y-0.5">
                                                                <div className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">{row.name}</div>
                                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{row.code}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="inline-flex flex-col items-center">
                                                                <span className="font-black text-sm text-gray-900">{row.notes}</span>
                                                                <div className="w-10 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-gray-900 rounded-full"
                                                                        style={{ width: row.notes }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-black text-sm text-gray-900">{row.testAvg}</TableCell>
                                                        <TableCell className="text-center font-black text-sm text-gray-900">{row.assessmentAvg}</TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {row.tasks_completed}/{row.tasks_total}
                                                                {row.tasks_pending > 0 && (
                                                                    <span className="text-[10px] text-orange-500 font-bold ml-1">
                                                                        ({row.tasks_pending} pending)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-black text-sm text-gray-900">{row.attendance}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className={cn(
                                                                "rounded-full px-4 py-1.5 font-black text-[9px] uppercase tracking-wider border-none shadow-none",
                                                                row.strength === 'Strong' ? "bg-emerald-50 text-emerald-600" :
                                                                    row.strength === 'Average' ? "bg-amber-50 text-amber-600" :
                                                                        "bg-rose-50 text-rose-600"
                                                            )}>{row.strength}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right px-8">
                                                            <Badge variant="outline" className={cn(
                                                                "rounded-full px-4 py-1.5 font-black text-[9px] uppercase tracking-wider border-none shadow-none",
                                                                row.risk === 'Low' ? "bg-emerald-50 text-emerald-600" :
                                                                    row.risk === 'Medium' ? "bg-amber-50 text-amber-600" :
                                                                        "bg-rose-50 text-rose-600"
                                                            )}>{row.risk}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="py-20 text-center text-gray-400 font-bold">
                                                        No subjects or progress data found for this student.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Analytics Row: Strength & Risk */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-lg font-black text-gray-900">Strength & Weakness Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 pt-4">
                                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                            <div className="min-w-[130px] flex-1 p-6 rounded-3xl bg-[#F0FDF4] border border-[#DCFCE7] text-center space-y-3">
                                                <div className="flex justify-center"><Zap className="h-5 w-5 text-emerald-500" /></div>
                                                <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Strongest Subject</div>
                                                <div className="text-xs font-black text-emerald-900 leading-tight">{analyticsData?.strongest}</div>
                                            </div>
                                            <div className="min-w-[130px] flex-1 p-6 rounded-3xl bg-[#FEF2F2] border border-[#FEE2E2] text-center space-y-3">
                                                <div className="flex justify-center"><Activity className="h-5 w-5 text-rose-500" /></div>
                                                <div className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Weakest Subject</div>
                                                <div className="text-xs font-black text-rose-900 leading-tight">{analyticsData?.weakest}</div>
                                            </div>
                                            <div className="min-w-[130px] flex-1 p-6 rounded-3xl bg-[#FFF7ED] border border-[#FFEDD5] text-center space-y-3">
                                                <div className="flex justify-center"><Clock className="h-5 w-5 text-amber-500" /></div>
                                                <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Current Streak</div>
                                                <div className="text-xs font-black text-amber-900 leading-tight">{analyticsData?.streak || 0} Days</div>
                                            </div>
                                            <div className="min-w-[130px] flex-1 p-6 rounded-3xl bg-[#F8FAFC] border border-gray-100 text-center space-y-3">
                                                <div className="flex justify-center"><Target className="h-5 w-5 text-indigo-500" /></div>
                                                <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Performance Gap</div>
                                                <div className="text-xl font-black text-indigo-900">{analyticsData?.performanceGap || '0%'}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-amber-500" /> Pending & Risk Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 pt-0 overflow-y-auto max-h-[300px] scrollbar-hide">
                                        <div className="space-y-4">
                                            {(analyticsData?.riskItems || []).length > 0 ? (
                                                analyticsData.riskItems.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between group py-1 border-b border-gray-50 last:border-0 pb-3">
                                                        <div className="space-y-1">
                                                            <div className="text-xs font-black text-gray-900">{item.label}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{item.subj}</div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-[10px] font-black text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{item.count}</span>
                                                            <Badge className={cn(
                                                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border-none",
                                                                item.risk === 'High' ? "bg-rose-50 text-rose-600 shadow-none" :
                                                                    item.risk === 'Medium' ? "bg-amber-50 text-amber-600 shadow-none" :
                                                                        "bg-emerald-50 text-emerald-600 shadow-none"
                                                            )}>
                                                                {item.risk} Risk
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-10 text-center text-gray-400 font-bold text-sm">No critical risks identified for this student.</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Consolidated Attendance & Consistency Card */}
                            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <CardHeader className="p-6 pb-2">
                                    <CardTitle className="text-lg font-black text-gray-900">Attendance & Consistency</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 pt-0">
                                    <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                                        {/* Left Side: Stats Summary */}
                                        <div className="flex-none w-full lg:w-[280px] space-y-4">
                                            <div className="p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100/50 flex flex-col items-center justify-center text-center space-y-2">
                                                <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-gray-50 flex items-center justify-center text-indigo-600">
                                                    <Calendar className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="text-3xl font-black text-gray-900 tracking-tight">{attendanceStats.percentage}%</div>
                                                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Overall Attendance</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-gray-50/30 border border-gray-100/30">
                                                    <div className="text-lg font-black text-gray-900">{attendanceStats.present}</div>
                                                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-0.5 text-center leading-tight">Active Days</div>
                                                </div>
                                                <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-gray-50/30 border border-gray-100/30">
                                                    <div className="flex items-center gap-1">
                                                        <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                                        <span className="text-lg font-black text-gray-900">{analyticsData?.streak || 0}</span>
                                                    </div>
                                                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-0.5 text-center leading-tight">Current</div>
                                                </div>
                                                <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-gray-50/30 border border-gray-100/30">
                                                    <div className="flex items-center gap-1">
                                                        <Star className="h-2.5 w-2.5 text-indigo-500 fill-indigo-500" />
                                                        <span className="text-lg font-black text-gray-900">{analyticsData?.longest_streak || 0}</span>
                                                    </div>
                                                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-0.5 text-center leading-tight">Longest</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Bar Chart */}
                                        <div className="flex-1 min-h-[280px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={attendanceData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                                    <XAxis
                                                        dataKey="subject"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }}
                                                        domain={[0, 100]}
                                                        ticks={[0, 25, 50, 75, 100]}
                                                    />
                                                    <RechartsTooltip
                                                        cursor={{ fill: '#F1F5F9', opacity: 0.4 }}
                                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Bar
                                                        dataKey="percentage"
                                                        radius={[4, 4, 0, 0]}
                                                        barSize={50}
                                                        fill="#0F172A"
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>


                            {/* Achievements Section */}
                            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-lg font-black text-gray-900">Streaks & Achievements</CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <div className="flex flex-wrap gap-4">
                                        {[
                                            { name: 'First Login', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Star, active: true },
                                            { name: 'Active Student', color: attendanceStats.percentage > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100', icon: BookOpen, locked: attendanceStats.percentage === 0 },
                                            { name: '5 Day Streak', color: (analyticsData?.streak || 0) >= 5 ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-gray-50 text-gray-400 border-gray-100', icon: Zap, locked: (analyticsData?.streak || 0) < 5 },
                                            { name: '10 Day Streak', color: (analyticsData?.streak || 0) >= 10 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-gray-50 text-gray-400 border-gray-100', icon: Activity, locked: (analyticsData?.streak || 0) < 10 },
                                            { name: '85% Attendance', color: attendanceStats.percentage >= 85 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100', icon: CheckCircle2, locked: attendanceStats.percentage < 85 },
                                            { name: 'Top Performer', color: attendanceStats.percentage >= 95 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100', icon: Target, locked: attendanceStats.percentage < 95 },
                                        ].map((badge, i) => (
                                            <Badge key={i} className={cn(
                                                "px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-black shadow-none border transition-transform hover:scale-105 cursor-default",
                                                badge.color
                                            )}>
                                                <badge.icon className={cn("h-4 w-4", !badge.locked && "fill-current opacity-80")} />
                                                {badge.name}
                                                {badge.locked && <span className="text-[8px] font-bold uppercase opacity-50 ml-1">(Locked)</span>}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                        </div>
                    ) : (
                        <div className="py-48 flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in duration-1000">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-10 animate-pulse rounded-full"></div>
                                <div className="h-40 w-40 rounded-[3.5rem] bg-white shadow-2xl border border-gray-50 flex items-center justify-center text-gray-200 relative z-10 transition-transform hover:scale-110">
                                    <LayoutDashboard className="h-20 w-20" />
                                </div>
                            </div>
                            <div className="space-y-3 max-w-sm">
                                <h3 className="text-3xl font-black text-gray-900">Select a Student</h3>
                                <p className="text-gray-400 text-sm font-medium leading-relaxed">Choose a student above to generate a unified academic and behavioral analytics overview.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex -space-x-4">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-12 w-12 rounded-full bg-gray-100 border-4 border-white flex items-center justify-center font-bold text-gray-300 text-sm shadow-sm">
                                            ?
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- PRINTABLE REPORT SECTION (Modified for Direct Download) --- */}
                    <div
                        ref={reportRef}
                        className="hidden bg-white font-sans text-gray-900 printable-only"
                        style={{ width: '800px', padding: '40px' }}
                    >
                        <div className="max-w-[800px] mx-auto space-y-8">
                            {/* Report Header */}
                            <div className="border-b-2 border-gray-100 pb-6">
                                <h1 className="text-3xl font-black mb-1">Student Academic Report</h1>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                                    Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                </p>
                            </div>

                            {/* Student Overview */}
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">
                                        {selectedStudent?.user_details?.first_name ? `${selectedStudent.user_details.first_name} ${selectedStudent.user_details.last_name || ''}` : `${selectedStudent?.user?.first_name || ''} ${selectedStudent?.user?.last_name || ''}`}
                                        <span className="text-gray-400 font-bold ml-2">({selectedStudent?.roll_number || 'STU001'})</span>
                                    </h2>
                                    <p className="text-gray-500 font-bold mt-1">
                                        {selectedStudent?.department_name} • Semester {selectedStudent?.semester_number} • Section {selectedStudent?.section_name}
                                    </p>
                                </div>
                                <div className="flex gap-6 text-sm font-black uppercase tracking-wider text-gray-700">
                                    <span>Performance Index: <span className="text-indigo-600">{analyticsData?.performanceIndex || '74%'}</span></span>
                                    <span className="text-gray-300">|</span>
                                    <span>Status: <span className={cn(
                                        analyticsData?.status === 'Advanced' ? "text-indigo-600" :
                                            analyticsData?.status === 'On Track' ? "text-emerald-600" : "text-rose-600"
                                    )}>{analyticsData?.status || 'On Track'}</span></span>
                                    <span className="text-gray-300">|</span>
                                    <span>Attendance: <span className="text-indigo-600">{attendanceStats.percentage}%</span></span>
                                </div>
                            </div>

                            {/* Performance Table */}
                            <table className="w-full text-left border-collapse mt-4">
                                <thead>
                                    <tr className="bg-gray-900 text-white">
                                        <th className="py-2 px-4 text-[10px] font-black uppercase tracking-widest rounded-tl-xl">Subject</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-black uppercase tracking-widest">Notes %</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-black uppercase tracking-widest">Test Avg</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-black uppercase tracking-widest">Assess Avg</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-black uppercase tracking-widest">Tasks</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-black uppercase tracking-widest">Attend %</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-black uppercase tracking-widest">Strength</th>
                                        <th className="py-2 px-4 text-right text-[10px] font-black uppercase tracking-widest rounded-tr-xl">Risk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(performanceData.length > 0 ? performanceData : []).map((row: any, idx: number) => (
                                        <tr key={idx} className={cn("border-b border-gray-50 text-xs", idx % 2 === 0 ? "bg-white" : "bg-gray-50/30")}>
                                            <td className="py-3 px-4 font-bold text-gray-900">{row.name}</td>
                                            <td className="py-3 px-2 text-center font-black">{row.notes}</td>
                                            <td className="py-3 px-2 text-center font-black">{row.testAvg}</td>
                                            <td className="py-3 px-2 text-center font-black">{row.assessmentAvg}</td>
                                            <td className="py-3 px-2 text-center font-black">{row.tasks_completed}/{row.tasks_total}</td>
                                            <td className="py-3 px-2 text-center font-black">{row.attendance}</td>
                                            <td className="py-3 px-2 text-center">
                                                <span className={cn(
                                                    "font-black text-[10px] uppercase",
                                                    row.strength === 'Strong' ? "text-emerald-600" : row.strength === 'Average' ? "text-amber-600" : "text-rose-600"
                                                )}>{row.strength}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-black">
                                                <span className={cn(
                                                    "text-[10px] uppercase",
                                                    row.risk === 'Low' ? "text-emerald-600" : row.risk === 'Medium' ? "text-amber-600" : "text-rose-600"
                                                )}>{row.risk}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Analysis Section */}
                            <div className="space-y-4 pt-6">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">Strength & Weakness Analysis</h3>
                                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Strongest Subject</p>
                                        <p className="font-bold text-gray-900">{analyticsData?.strongest || 'Discrete Mathematics'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Weakest Subject</p>
                                        <p className="font-bold text-gray-900">{analyticsData?.weakest || 'Computer Networks'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Highest Pending Tasks</p>
                                        <p className="font-bold text-gray-900">{analyticsData?.highestPending || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lowest Attendance</p>
                                        <p className="font-bold text-gray-900">{analyticsData?.lowestAttendance || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Performance Gap</p>
                                        <p className="font-bold text-indigo-600">{analyticsData?.performanceGap || '31%'} Improvement Potential</p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Footer */}
                            <div className="pt-12 border-t border-gray-100 text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Yuvro Campus • Academic Insights Report</p>
                            </div>
                        </div>
                    </div>

                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            /* Hide all browser-rendered content by default */
                            body * {
                                visibility: hidden;
                            }
                            /* Reveal only the printable report and its content */
                            .printable-only, .printable-only * {
                                visibility: visible;
                            }
                            /* Reset layout for the printable section */
                            .printable-only {
                                visibility: visible !important;
                                display: block !important;
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                                background-color: white !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                padding: 0 !important;
                                margin: 0 !important;
                            }
                            /* Standard page margins */
                            @page {
                                margin: 1cm;
                                size: portrait;
                            }
                            /* Ensure background colors/borders are printed */
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                color-adjust: exact !important;
                            }
                            /* Prevent extra blank pages */
                            html, body {
                                height: auto !important;
                                overflow: visible !important;
                            }
                        }
                    ` }} />
                </main>
            </div>
        </div>
    );
};

export default Reports;

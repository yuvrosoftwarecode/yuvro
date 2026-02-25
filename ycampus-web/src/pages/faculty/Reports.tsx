// Cache-busting refresh: 2026-02-25
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
    AlertCircle,
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

    const [dateRange, setDateRange] = useState<string>('30');
    const [reportGenerated, setReportGenerated] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const reportRef = React.useRef<HTMLDivElement>(null);
    const isAutoSelecting = React.useRef(false);

    // Reset dependents when parents change
    useEffect(() => { if (!isAutoSelecting.current) { setSelectedBatch('all'); setSelectedSem('all'); setSelectedSection('all'); setSelectedSubject('all'); } }, [selectedDept]);
    useEffect(() => { if (!isAutoSelecting.current) { setSelectedSem('all'); setSelectedSection('all'); setSelectedSubject('all'); } }, [selectedBatch]);
    useEffect(() => { if (!isAutoSelecting.current) { setSelectedSection('all'); setSelectedSubject('all'); } }, [selectedSem]);
    useEffect(() => { if (!isAutoSelecting.current) { setSelectedSubject('all'); } }, [selectedSection]);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

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
            const sortedAttendance = [...progress].sort((a, b) => (a.attendance_pct || 0) - (b.attendance_pct || 0));
            const sortedPending = [...mappedPerformance].sort((a, b) => b.tasks_pending - a.tasks_pending);

            setAnalyticsData({
                performanceIndex: `${Math.round(stats.avg_progress || 0)}%`,
                status: stats.avg_progress > 80 ? "Advanced" : stats.avg_progress > 50 ? "Intermediate" : "Beginner",
                strongest: sortedProgress[0]?.subject_name || "N/A",
                weakest: sortedProgress[sortedProgress.length - 1]?.subject_name || "N/A",
                highestPending: sortedPending[0]?.name || "N/A",
                lowestAttendance: sortedAttendance[0]?.subject_name || "N/A",
                streak: stats.streak || 0,
                longest_streak: stats.longest_streak || 0,
                performanceGap: sortedProgress.length > 1
                    ? `${Math.round(sortedProgress[0].percent - sortedProgress[sortedProgress.length - 1].percent)}%`
                    : "0%",
                riskItems: [
                    ...mappedPerformance
                        .filter((p: any) => p.tasks_pending > 0)
                        .flatMap((p: any) => [
                            { label: 'Pending Notes', subj: p.name, count: Math.ceil(p.tasks_pending / 2), risk: p.risk },
                            { label: 'Pending Tasks', subj: p.name, count: Math.floor(p.tasks_pending / 2), risk: p.risk }
                        ]),
                    ...progress
                        .filter((p: any) => (p.attendance_pct || 0) < 75)
                        .map((p: any) => ({
                            label: 'Low Attendance',
                            subj: p.subject_name || p.subject_id,
                            count: `${Math.round(p.attendance_pct || 0)}%`,
                            risk: p.attendance_pct < 40 ? 'High' : 'Medium'
                        }))
                ]
                    .filter(item => item.count !== 0 && item.count !== '0%')
                    .slice(0, 15)
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
    const handleGenerateReport = async (studentToUse?: any) => {
        const student = studentToUse || selectedStudent;
        if (!student) {
            toast.error("Please select a student first");
            return;
        }

        setGenerating(true);
        try {
            // Robustly identify the user ID from various possible structures
            const userId = student.user_details?.id || student.user?.id || student.user || student.id;

            if (!userId) {
                console.error("Could not find User ID for student:", student);
                toast.error("Could not identify student User ID");
                return;
            }

            console.log("Generating report for User ID:", userId);
            await loadStudentData(userId);
            setReportGenerated(true);
            toast.success("Report generated successfully");
        } catch (error) {
            console.error("Report generation failed:", error);
            toast.error("Failed to generate report data");
        } finally {
            setGenerating(false);
        }
    };

    const handleExportPDF = async () => {
        if (!reportGenerated || !selectedStudent || performanceData.length === 0) {
            toast.error("Please generate the report first");
            return;
        }

        const toastId = toast.loading("Preparing PDF...");
        try {
            // Dynamic imports to bypass Vite transformation issues
            const { jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF();
            const now = new Date().toLocaleString();

            const fullName =
                selectedStudent.user_details?.first_name
                    ? `${selectedStudent.user_details.first_name} ${selectedStudent.user_details.last_name || ''}`
                    : `${selectedStudent.user?.first_name || ''} ${selectedStudent.user?.last_name || ''}`;

            /* ======================
               HEADER
            ====================== */

            doc.setFontSize(18);
            doc.text("Student Academic Report", 14, 20);

            doc.setFontSize(10);
            doc.text(`Generated: ${now}`, 14, 27);

            /* ======================
               STUDENT INFO
            ====================== */

            doc.setFontSize(12);
            doc.text(`${fullName} (${selectedStudent.roll_number})`, 14, 38);

            doc.setFontSize(10);
            doc.text(
                `${selectedStudent.department_name} | Semester ${selectedStudent.semester_number} | Section ${selectedStudent.section_name}`,
                14,
                45
            );

            doc.text(
                `Performance Index: ${analyticsData?.performanceIndex || "0%"} | Status: ${analyticsData?.status || "N/A"} | Attendance: ${attendanceStats.percentage}%`,
                14,
                52
            );

            /* ======================
               PERFORMANCE TABLE
            ====================== */

            autoTable(doc, {
                startY: 60,
                head: [[
                    "Subject",
                    "Notes %",
                    "Test Avg",
                    "Assess Avg",
                    "Tasks",
                    "Attend %",
                    "Strength",
                    "Risk"
                ]],
                body: performanceData.map((row: any) => [
                    row.name,
                    row.notes,
                    row.testAvg,
                    row.assessmentAvg,
                    `${row.tasks_completed}/${row.tasks_total}`,
                    row.attendance,
                    row.strength,
                    row.risk
                ]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [15, 23, 42] },
            });

            /* ======================
               ANALYSIS SECTION
            ====================== */

            const finalY = (doc as any).lastAutoTable.finalY + 10;

            doc.setFontSize(12);
            doc.text("Strength & Weakness Analysis", 14, finalY);

            doc.setFontSize(10);
            doc.text(`Strongest: ${analyticsData?.strongest || "N/A"}`, 14, finalY + 8);
            doc.text(`Weakest: ${analyticsData?.weakest || "N/A"}`, 14, finalY + 14);
            doc.text(`Highest Pending: ${analyticsData?.highestPending || "N/A"}`, 14, finalY + 20);
            doc.text(`Lowest Attendance: ${analyticsData?.lowestAttendance || "N/A"}`, 14, finalY + 26);
            doc.text(`Performance Gap: ${analyticsData?.performanceGap || "0%"}`, 14, finalY + 32);

            /* ======================
               SAVE FILE
            ====================== */

            doc.save(`Student_Report_${selectedStudent.roll_number}.pdf`);
            toast.dismiss(toastId);
            toast.success("PDF Downloaded Successfully!");
        } catch (error) {
            toast.dismiss(toastId);
            console.error("PDF Export Error:", error);
            toast.error("Failed to generate PDF");
        }
    };

    const handleExportExcel = async () => {
        if (!selectedStudent || !reportGenerated || performanceData.length === 0) {
            toast.error("Please generate the report first");
            return;
        }

        const toastId = toast.loading("Preparing Excel...");
        try {
            // Dynamic import to bypass Vite transformation issues
            const XLSX = await import('xlsx');

            const wb = XLSX.utils.book_new();
            const now = new Date().toLocaleString();

            const fullName =
                selectedStudent.user_details?.first_name
                    ? `${selectedStudent.user_details.first_name} ${selectedStudent.user_details.last_name || ''}`
                    : `${selectedStudent.user?.first_name || ''} ${selectedStudent.user?.last_name || ''}`;

            // Sheet 1: Student Performance
            const headers = ["Subject", "Notes %", "Test Avg", "Assess Avg", "Tasks", "Attend %", "Strength", "Risk"];
            const dataRows = performanceData.map((row: any) => [
                row.name,
                row.notes,
                row.testAvg,
                row.assessmentAvg,
                `${row.tasks_completed}/${row.tasks_total}`,
                row.attendance,
                row.strength,
                row.risk
            ]);

            const wsData = [
                [`Academic Report - ${fullName} (${selectedStudent.roll_number})`],
                [`Department: ${selectedStudent.department_name} | Semester: ${selectedStudent.semester_number} | Section: ${selectedStudent.section_name}`],
                [`Generated: ${now}`],
                [],
                ["Analysis"],
                ["Strongest Subject", analyticsData?.strongest || "N/A"],
                ["Weakest Subject", analyticsData?.weakest || "N/A"],
                ["Performance Index", analyticsData?.performanceIndex || "0%"],
                [],
                headers,
                ...dataRows,
            ];

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, "Performance Report");

            XLSX.writeFile(wb, `Student_Report_${selectedStudent.roll_number}_${Date.now()}.xlsx`);
            toast.dismiss(toastId);
            toast.success("Excel Exported Successfully!");
        } catch (error) {
            toast.dismiss(toastId);
            console.error("Excel Export Error:", error);
            toast.error("Failed to export Excel");
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

    const selectStudent = async (student: any) => {
        // Stop any automatic filter resets
        isAutoSelecting.current = true;

        // Update selection state
        setSelectedStudent(student);

        // Set search term for display
        const fullName = student.user_details?.first_name
            ? `${student.user_details.first_name} ${student.user_details.last_name || ''}`
            : `${student.user?.first_name || ''} ${student.user?.last_name || ''}`;
        setSearchTerm(fullName);

        // Clear search results immediately
        setStudents([]);

        // Auto-populate filters from student data
        if (student.department_name) setSelectedDept(student.department_name);
        if (student.batch_name) setSelectedBatch(student.batch_name);
        if (student.semester_number) setSelectedSem(String(student.semester_number));
        if (student.section_name) setSelectedSection(student.section_name);

        // Reset and Regenerate
        setReportGenerated(false);

        try {
            // Crucial: Pass the student object directly to avoid stale state
            await handleGenerateReport(student);
        } finally {
            // Release auto-selection lock after a short delay to catch any late effects
            setTimeout(() => {
                isAutoSelecting.current = false;
            }, 500);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <RoleSidebar />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <RoleHeader title="" subtitle="" />

                <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-white">
                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Reports</h1>
                            <p className="text-sm font-medium text-gray-500">
                                Consolidated academic report — view performance, progress, and insights
                            </p>
                        </div>
                        {reportGenerated && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleExportPDF}
                                    variant="outline"
                                    className="h-9 px-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 bg-[#F8FAFC]/50"
                                >
                                    <FileText className="h-4 w-4" />
                                    <span>PDF</span>
                                </Button>
                                <Button
                                    onClick={handleExportExcel}
                                    variant="outline"
                                    className="h-9 px-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 bg-[#F8FAFC]/50"
                                >
                                    <TableIcon className="h-4 w-4" />
                                    <span>Excel</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Filter Section */}
                    <Card className="border border-gray-100 shadow-sm bg-white rounded-xl">
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
                                <Filter className="h-4 w-4 text-gray-400" />
                                <span>Filters</span>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <span className="text-[11px] font-medium text-gray-400">Search Student</span>
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <div className="relative max-w-lg flex-1">
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                            <Input
                                                value={searchTerm}
                                                onChange={(e) => handleStudentSearch(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && students.length > 0) {
                                                        selectStudent(students[0]);
                                                    }
                                                }}
                                                placeholder="Type student name, roll number, or email..."
                                                className="h-10 border-gray-100 rounded-lg pl-9 text-xs font-medium text-gray-600 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all placeholder:text-gray-300 bg-white"
                                            />
                                            {students.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                                                    {students.map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => selectStudent(s)}
                                                            className="w-full px-5 py-4 text-left hover:bg-gray-50 flex flex-col transition-colors border-b last:border-0 border-gray-50"
                                                        >
                                                            <span className="font-bold text-sm text-gray-900">{s.user_details?.first_name || s.user?.first_name} {s.user_details?.last_name || s.user?.last_name}</span>
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{s.roll_number} • {s.department_name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            onClick={() => handleGenerateReport()}
                                            disabled={!selectedStudent || generating}
                                            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 font-bold transition-all shadow-sm px-6 text-xs"
                                        >
                                            {generating ? (
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <LayoutDashboard className="h-4 w-4" />
                                            )}
                                            <span>{generating ? 'Generating...' : 'Generate Report'}</span>
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-medium text-gray-400">Department</span>
                                        <Select value={selectedDept} onValueChange={setSelectedDept}>
                                            <SelectTrigger className="h-10 border-gray-100 rounded-lg text-xs bg-white text-gray-600 font-medium">
                                                <SelectValue placeholder="Select department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Departments</SelectItem>
                                                {departments.map(d => (
                                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[11px] font-medium text-gray-400">Semester</span>
                                        <Select value={selectedSem} onValueChange={setSelectedSem}>
                                            <SelectTrigger className="h-10 border-gray-100 rounded-lg text-xs bg-white text-gray-600 font-medium">
                                                <SelectValue placeholder="Select semester" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Semesters</SelectItem>
                                                {semesters.map(s => (
                                                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[11px] font-medium text-gray-400">Batch</span>
                                        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                                            <SelectTrigger className="h-10 border-gray-100 rounded-lg text-xs bg-white text-gray-600 font-medium">
                                                <SelectValue placeholder="Select batch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Batches</SelectItem>
                                                {batches.map(b => (
                                                    <SelectItem key={b} value={b}>{b}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[11px] font-medium text-gray-400">Subject</span>
                                        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                            <SelectTrigger className="h-10 border-gray-100 rounded-lg text-xs bg-white text-gray-600 font-medium">
                                                <SelectValue placeholder="All Subjects" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Subjects</SelectItem>
                                                {subjectsList.map(s => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[11px] font-medium text-gray-400">Date Range</span>
                                        <Select value={dateRange} onValueChange={setDateRange}>
                                            <SelectTrigger className="h-10 border-gray-100 rounded-lg text-xs bg-white text-gray-600 font-medium">
                                                <SelectValue placeholder="Full Semester" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="30">Last 30 Days</SelectItem>
                                                <SelectItem value="60">Last 60 Days</SelectItem>
                                                <SelectItem value="all">Full Semester</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {selectedStudent && reportGenerated ? (
                        <div ref={reportRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                            {/* Student Overview Card */}
                            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
                                <CardContent className="p-8">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                        <div className="flex items-center gap-6">
                                            <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                                                <User className="h-10 w-10" />
                                            </div>
                                            <div className="space-y-1">
                                                <h2 className="text-2xl font-bold text-gray-900 leading-none">
                                                    {selectedStudent.user_details?.first_name || selectedStudent.user?.first_name} {selectedStudent.user_details?.last_name || selectedStudent.user?.last_name}
                                                </h2>
                                                <p className="text-[12px] text-gray-400 font-medium">
                                                    {selectedStudent.roll_number} · {selectedStudent.department_name} · Sem {selectedStudent.semester_number} · Sec {selectedStudent.section_name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 max-w-4xl">
                                            {/* Performance Index */}
                                            <div className="bg-[#F8FAFC]/50 rounded-2xl p-6 flex flex-col items-center justify-center space-y-1 border border-gray-50/50">
                                                <TrendingUp className="h-3.5 w-3.5 text-indigo-400 mb-1" />
                                                <div className="text-2xl font-bold text-gray-900 leading-none">
                                                    {analyticsData?.performanceIndex || '74%'}
                                                </div>
                                                <div className="text-[11px] font-medium text-gray-400 text-center">Performance Index</div>
                                            </div>

                                            {/* Overall Status */}
                                            <div className="bg-[#F8FAFC]/50 rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 border border-gray-50/50">
                                                <Badge className="bg-[#DCFCE7] text-[#166534] hover:bg-[#DCFCE7] border-none px-3 py-1 rounded-full text-[11px] font-medium shadow-none">
                                                    On Track
                                                </Badge>
                                                <div className="text-[11px] font-medium text-gray-400 text-center">Overall Status</div>
                                            </div>

                                            {/* Attendance */}
                                            <div className="bg-[#F8FAFC]/50 rounded-2xl p-6 flex flex-col items-center justify-center space-y-1 border border-gray-50/50">
                                                <Calendar className="h-3.5 w-3.5 text-gray-400 mb-1" />
                                                <div className="text-2xl font-bold text-gray-900 leading-none">
                                                    {attendanceStats.percentage}%
                                                </div>
                                                <div className="text-[11px] font-medium text-gray-400 text-center">Attendance</div>
                                            </div>

                                            {/* Learning Progress */}
                                            <div className="bg-[#F8FAFC]/50 rounded-2xl p-6 flex flex-col items-center justify-center border border-gray-50/50">
                                                <BookOpen className="h-3.5 w-3.5 text-gray-400 mb-2" />
                                                <div className="w-full space-y-3">
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-center px-0.5">
                                                            <span className="text-[10px] font-bold text-gray-900">76%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gray-900 rounded-full"
                                                                style={{ width: '76%' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="text-[11px] font-medium text-gray-400 text-center">Learning Progress</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Detailed Performance Matrix table */}
                            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-3xl">
                                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                                    <CardTitle className="text-xl font-bold text-gray-900">Subject-wise Performance Matrix</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-white hover:bg-white border-gray-50/50">
                                                <TableHead className="w-[40px] pl-8"></TableHead>
                                                <TableHead className="py-6 px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider min-w-[280px]">Subject</TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Notes</TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Test Avg</TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Assessment Avg</TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tasks</TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Attendance</TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Strength</TableHead>
                                                <TableHead className="text-right pr-8 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Risk</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {performanceData.length > 0 ? (
                                                performanceData.map((row, idx) => (
                                                    <React.Fragment key={idx}>
                                                        <TableRow
                                                            className={cn(
                                                                "hover:bg-gray-50/50 transition-colors border-gray-50 cursor-pointer",
                                                                expandedRows[row.id] && "bg-gray-50/30"
                                                            )}
                                                            onClick={() => toggleRow(row.id)}
                                                        >
                                                            <TableCell className="pl-8">
                                                                {expandedRows[row.id] ? (
                                                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="py-6 px-4">
                                                                <div className="space-y-0.5">
                                                                    <div className="font-bold text-gray-900 text-[13px] tracking-tight">{row.name}</div>
                                                                    <div className="text-[10px] font-medium text-gray-400">{row.code}</div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="inline-flex flex-col items-center">
                                                                    <span className="font-bold text-[13px] text-gray-900">{row.notes}</span>
                                                                    <div className="w-12 h-[3px] bg-gray-900 mt-0.5 rounded-full"></div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <span className="font-bold text-[13px] text-gray-900">{row.testAvg}</span>
                                                            </TableCell>
                                                            <TableCell className="text-center text-[13px] font-bold text-gray-900">{row.assessmentAvg}</TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="text-[13px] font-bold text-gray-900">
                                                                    {row.tasks_completed}/{row.tasks_total} <span className="text-[#B45309] font-medium ml-1 text-[11px]">({row.tasks_pending} pending)</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <span className="text-[13px] font-bold text-gray-900">{row.attendance}</span>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge className={cn(
                                                                    "rounded-full px-3 py-1 font-bold text-[10px] border-none shadow-none uppercase tracking-wide",
                                                                    row.strength === 'Strong' ? "bg-emerald-50 text-[#15803D]" :
                                                                        row.strength === 'Average' ? "bg-amber-50 text-[#B45309]" : "bg-rose-50 text-[#991B1B]"
                                                                )}>
                                                                    {row.strength}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-8">
                                                                <Badge className={cn(
                                                                    "rounded-full px-3 py-1 font-bold text-[10px] border-none shadow-none uppercase tracking-wide",
                                                                    row.risk === 'Low' ? "bg-emerald-50 text-[#15803D]" :
                                                                        row.risk === 'Medium' ? "bg-amber-50 text-[#B45309]" : "bg-rose-50 text-[#991B1B]"
                                                                )}>
                                                                    {row.risk}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>

                                                        {expandedRows[row.id] && (
                                                            <TableRow className="bg-gray-50/20 hover:bg-gray-50/20 border-none">
                                                                <TableCell colSpan={9} className="p-8 pt-0">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                                                        {/* Notes & Learning */}
                                                                        <div className="space-y-4">
                                                                            <div className="flex items-center gap-2 text-gray-900">
                                                                                <BookOpen className="h-4 w-4 text-gray-400" />
                                                                                <span className="text-[13px] font-bold">Notes & Learning</span>
                                                                            </div>
                                                                            <div className="space-y-2.5">
                                                                                {[
                                                                                    { label: 'Total Chapters', val: '12' },
                                                                                    { label: 'Completed', val: '10' },
                                                                                    { label: 'Pending', val: '2' },
                                                                                    { label: 'Topics Not Opened', val: '4', color: 'text-rose-500' },
                                                                                    { label: 'Last Activity', val: '2/7/2026' },
                                                                                    { label: 'Learning Streak', val: '5 days' }
                                                                                ].map((item, i) => (
                                                                                    <div key={i} className="flex justify-between items-center group">
                                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</span>
                                                                                        <span className={cn("text-[11px] font-bold text-gray-900", item.color)}>{item.val}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Test Performance */}
                                                                        <div className="space-y-4">
                                                                            <div className="flex items-center gap-2 text-gray-900">
                                                                                <TrendingUp className="h-4 w-4 text-gray-400" />
                                                                                <span className="text-[13px] font-bold">Test Performance</span>
                                                                            </div>
                                                                            <div className="space-y-2.5">
                                                                                {[
                                                                                    { label: 'Tests Attempted', val: '4' },
                                                                                    { label: 'Easy Avg', val: '88%' },
                                                                                    { label: 'Medium Avg', val: '76%' },
                                                                                    { label: 'Hard Avg', val: '62%' },
                                                                                    { label: 'Accuracy', val: '75%' },
                                                                                    { label: 'Trend', val: 'Improving', color: 'text-emerald-500' }
                                                                                ].map((item, i) => (
                                                                                    <div key={i} className="flex justify-between items-center">
                                                                                        <span className="text-[11px] font-medium text-gray-400">{item.label}</span>
                                                                                        <span className={cn("text-[11px] font-bold text-gray-700", item.color)}>{item.val}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Assessments */}
                                                                        {/* Assessments */}
                                                                        <div className="space-y-4">
                                                                            <div className="flex items-center gap-2 text-gray-900">
                                                                                <FileText className="h-4 w-4 text-gray-400" />
                                                                                <span className="text-[13px] font-bold">Assessments</span>
                                                                            </div>
                                                                            <div className="space-y-2.5">
                                                                                {[
                                                                                    { label: 'Total', val: '5' },
                                                                                    { label: 'Completed', val: '3', color: 'text-emerald-500' },
                                                                                    { label: 'In Progress', val: '1', color: 'text-amber-500' },
                                                                                    { label: 'Pending', val: '1', color: 'text-rose-500' },
                                                                                    { label: 'Avg Score', val: '85%' }
                                                                                ].map((item, i) => (
                                                                                    <div key={i} className="flex justify-between items-center px-0.5">
                                                                                        <span className="text-[11px] font-medium text-gray-400">{item.label}</span>
                                                                                        <span className={cn("text-[11px] font-bold text-gray-900", item.color)}>{item.val}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>

                                                                        {/* Tasks & Attendance */}
                                                                        <div className="space-y-4">
                                                                            <div className="flex items-center gap-2 text-gray-900">
                                                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                                                <span className="text-[13px] font-bold">Tasks & Attendance</span>
                                                                            </div>
                                                                            <div className="space-y-2.5">
                                                                                {[
                                                                                    { label: 'Tasks Assigned', val: '8' },
                                                                                    { label: 'On Time', val: '6', color: 'text-emerald-500' },
                                                                                    { label: 'Late', val: '1', color: 'text-amber-500' },
                                                                                    { label: 'Pending', val: '1', color: 'text-rose-500' },
                                                                                    { label: 'Classes Held', val: '45' },
                                                                                    { label: 'Attended', val: '41', color: 'text-gray-900' },
                                                                                    { label: 'Missed', val: '4', color: 'text-rose-500' }
                                                                                ].map((item, i) => (
                                                                                    <div key={i} className="flex justify-between items-center px-0.5">
                                                                                        <span className="text-[11px] font-medium text-gray-400">{item.label}</span>
                                                                                        <span className={cn("text-[11px] font-bold text-gray-900", item.color)}>{item.val}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </React.Fragment>
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
                                <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden h-full">
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-xl font-bold text-gray-900">Strength & Weakness Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 pt-4">
                                        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-5 gap-3">
                                            {/* Strongest Subject */}
                                            <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] text-center space-y-2 flex flex-col items-center justify-center min-h-[160px]">
                                                <TrendingUp className="h-5 w-5 text-[#15803D]" />
                                                <div className="text-[11px] font-bold text-[#15803D] leading-none">Strongest Subject</div>
                                                <div className="text-sm font-bold text-[#15803D] leading-tight line-clamp-2">{analyticsData?.strongest || 'Operating Systems'}</div>
                                            </div>

                                            {/* Weakest Subject */}
                                            <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FEE2E2] text-center space-y-2 flex flex-col items-center justify-center min-h-[160px]">
                                                <Activity className="h-5 w-5 text-[#991B1B]" />
                                                <div className="text-[11px] font-bold text-[#991B1B] leading-none">Weakest Subject</div>
                                                <div className="text-sm font-bold text-[#991B1B] leading-tight line-clamp-2">{analyticsData?.weakest || 'Computer Networks'}</div>
                                            </div>

                                            {/* Highest Pending */}
                                            <div className="p-4 rounded-2xl bg-[#FFF7ED] border border-[#FFEDD5] text-center space-y-2 flex flex-col items-center justify-center min-h-[160px]">
                                                <AlertTriangle className="h-5 w-5 text-[#B45309]" />
                                                <div className="text-[11px] font-bold text-[#B45309] leading-none">Highest Pending</div>
                                                <div className="text-sm font-bold text-[#B45309] leading-tight line-clamp-2">{analyticsData?.highestPending || 'Computer Networks'}</div>
                                            </div>

                                            {/* Lowest Attendance */}
                                            <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FEE2E2] text-center space-y-2 flex flex-col items-center justify-center min-h-[160px]">
                                                <Calendar className="h-5 w-5 text-[#991B1B]" />
                                                <div className="text-[11px] font-bold text-[#991B1B] leading-none">Lowest Attendance</div>
                                                <div className="text-sm font-bold text-[#991B1B] leading-tight line-clamp-2">{analyticsData?.lowestAttendance || 'Computer Networks'}</div>
                                            </div>

                                            {/* Performance Gap */}
                                            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-gray-100 text-center space-y-2 flex flex-col items-center justify-center min-h-[160px] col-span-2 xl:col-span-1">
                                                <Target className="h-5 w-5 text-gray-400" />
                                                <div className="text-[11px] font-bold text-gray-400 leading-none">Performance Gap</div>
                                                <div className="text-2xl font-bold text-gray-900 leading-tight tracking-tight">{analyticsData?.performanceGap || '31%'}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden h-full">
                                    <CardHeader className="p-8 pb-4">
                                        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5 text-amber-500" />
                                            Pending & Risk Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 pt-0 overflow-y-auto max-h-[350px] scrollbar-hide">
                                        <div className="space-y-4">
                                            {(analyticsData?.riskItems || []).length > 0 ? (
                                                analyticsData.riskItems.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between py-5 border-b border-gray-50 last:border-0">
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-bold text-gray-900">
                                                                {item.label} <span className="text-gray-400 font-medium ml-1">· {item.subj}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <span className="text-xs font-bold text-gray-400">{item.count} items</span>
                                                            <Badge className={cn(
                                                                "px-3 py-1 rounded-full text-[10px] font-bold border-none shadow-none uppercase tracking-widest",
                                                                item.risk === 'High' ? "bg-[#FEF2F2] text-[#991B1B]" :
                                                                    item.risk === 'Medium' ? "bg-[#FFF7ED] text-[#B45309]" :
                                                                        "bg-[#F0FDF4] text-[#15803D]"
                                                            )}>
                                                                {item.risk} Risk
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-10 text-center text-gray-400 font-semibold text-sm">No pending items found.</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Consolidated Attendance & Consistency Card */}
                            <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
                                <CardHeader className="p-8 pb-2">
                                    <CardTitle className="text-xl font-bold text-gray-900">Attendance & Consistency</CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <div className="flex flex-col lg:flex-row gap-12 items-stretch">
                                        {/* Left Side: Stats Summary */}
                                        <div className="flex-none w-full lg:w-[320px] space-y-6">
                                            <div className="p-10 rounded-[2.5rem] bg-[#F8FAFC] border-none flex flex-col items-center justify-center text-center space-y-4">
                                                <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600">
                                                    <Calendar className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <div className="text-4xl font-bold text-gray-900 tracking-tight leading-none">{attendanceStats.percentage}%</div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 font-inter">Overall Attendance</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="flex flex-col items-center justify-center p-5 rounded-3xl bg-[#F8FAFC] border-none">
                                                    <div className="text-xl font-bold text-gray-900 tracking-tight">{attendanceStats.present || 41}</div>
                                                    <div className="text-[11px] font-medium text-gray-400 mt-1 text-center leading-tight">Active Days</div>
                                                </div>
                                                <div className="flex flex-col items-center justify-center p-5 rounded-3xl bg-[#F8FAFC] border-none">
                                                    <div className="flex items-center gap-1">
                                                        <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                                                        <span className="text-xl font-bold text-gray-900 tracking-tight">{analyticsData?.streak || 2}</span>
                                                    </div>
                                                    <div className="text-[11px] font-medium text-gray-400 mt-1 text-center leading-tight">Current</div>
                                                </div>
                                                <div className="flex flex-col items-center justify-center p-5 rounded-3xl bg-[#F8FAFC] border-none">
                                                    <div className="flex items-center gap-1">
                                                        <Star className="h-3 w-3 text-indigo-500 fill-indigo-500" />
                                                        <span className="text-xl font-bold text-gray-900 tracking-tight">{analyticsData?.longest_streak || 8}</span>
                                                    </div>
                                                    <div className="text-[11px] font-medium text-gray-400 mt-1 text-center leading-tight">Longest</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Bar Chart */}
                                        <div className="flex-1 min-h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={attendanceData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                    <XAxis
                                                        dataKey="subject"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                                                        interval={0}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 600 }}
                                                        domain={[0, 100]}
                                                        ticks={[0, 25, 50, 75, 100]}
                                                    />
                                                    <RechartsTooltip
                                                        cursor={{ fill: '#F8FAFC' }}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Bar
                                                        dataKey="percentage"
                                                        radius={[6, 6, 0, 0]}
                                                        barSize={32}
                                                        fill="#1E293B"
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
                                    <CardTitle className="text-xl font-bold text-gray-900">Streaks & Achievements</CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-4">
                                    <div className="flex flex-wrap gap-4">
                                        {[
                                            { name: 'First Login', color: 'bg-[#FFF7ED] text-[#EA580C] border-[#FFEDD5]', icon: '🏅' },
                                            { name: 'Notes Starter', color: 'bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]', icon: '📚' },
                                            { name: '5 Day Streak', color: 'bg-[#FFF7ED] text-[#EA580C] border-[#FFEDD5]', icon: '🔥' },
                                            { name: '10 Day Streak', color: 'bg-[#FFF7ED] text-[#EA580C] border-[#FFEDD5]', icon: '🔥' },
                                            { name: 'All Tasks Done', color: 'bg-gray-50 text-gray-300 border-gray-100', icon: '✅', locked: true },
                                            { name: 'Perfect Attendance', color: 'bg-gray-50 text-gray-300 border-gray-100', icon: '🎯', locked: true },
                                            { name: 'Assessment Ace', color: 'bg-gray-50 text-gray-300 border-gray-100', icon: '⭐', locked: true },
                                        ].map((badge, i) => (
                                            <Badge key={i} className={cn(
                                                "px-6 py-5 rounded-2xl flex flex-row items-center gap-3 text-xs font-bold shadow-none border transition-all cursor-default",
                                                badge.color,
                                                badge.locked && "opacity-60 grayscale-[0.5]"
                                            )}>
                                                <span className="text-xl">{badge.icon}</span>
                                                <div className="flex flex-col">
                                                    <span className="font-bold whitespace-nowrap">{badge.name}</span>
                                                    {badge.locked && <span className="text-[10px] font-medium opacity-60 mt-0.5">(locked)</span>}
                                                </div>
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                        </div>
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-2 text-gray-200">
                                <FileText className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-gray-900">Select a student to view report</h3>
                                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                                    Search for a student by name or roll number above, or use the filters to narrow down and select a student.
                                </p>
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
                                <h1 className="text-3xl font-bold mb-1">Student Academic Report</h1>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                                    Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                                </p>
                            </div>

                            {/* Student Overview */}
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {selectedStudent?.user_details?.first_name ? `${selectedStudent.user_details.first_name} ${selectedStudent.user_details.last_name || ''}` : `${selectedStudent?.user?.first_name || ''} ${selectedStudent?.user?.last_name || ''}`}
                                        <span className="text-gray-400 font-bold ml-2">({selectedStudent?.roll_number || 'STU001'})</span>
                                    </h2>
                                    <p className="text-gray-500 font-bold mt-1">
                                        {selectedStudent?.department_name} • Semester {selectedStudent?.semester_number} • Section {selectedStudent?.section_name}
                                    </p>
                                </div>
                                <div className="flex gap-6 text-sm font-bold uppercase tracking-widest text-gray-400">
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
                                        <th className="py-2 px-4 text-[10px] font-bold uppercase tracking-widest rounded-tl-xl">Subject</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-widest">Notes %</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-widest">Test Avg</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-widest">Assess Avg</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-widest">Tasks</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-widest">Attend %</th>
                                        <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-widest">Strength</th>
                                        <th className="py-2 px-4 text-right text-[10px] font-bold uppercase tracking-widest rounded-tr-xl">Risk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(performanceData.length > 0 ? performanceData : []).map((row: any, idx: number) => (
                                        <tr key={idx} className={cn("border-b border-gray-50 text-xs", idx % 2 === 0 ? "bg-white" : "bg-gray-50/30")}>
                                            <td className="py-3 px-4 font-bold text-gray-900">{row.name}</td>
                                            <td className="py-3 px-2 text-center font-bold">{row.notes}</td>
                                            <td className="py-3 px-2 text-center font-bold">{row.testAvg}</td>
                                            <td className="py-3 px-2 text-center font-bold">{row.assessmentAvg}</td>
                                            <td className="py-3 px-2 text-center font-bold">{row.tasks_completed}/{row.tasks_total}</td>
                                            <td className="py-3 px-2 text-center font-bold">{row.attendance}</td>
                                            <td className="py-3 px-2 text-center">
                                                <span className={cn(
                                                    "font-bold text-[10px] uppercase",
                                                    row.strength === 'Strong' ? "text-emerald-600" : row.strength === 'Average' ? "text-amber-600" : "text-rose-600"
                                                )}>{row.strength}</span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold">
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
                                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">Strength & Weakness Analysis</h3>
                                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Strongest Subject</p>
                                        <p className="font-bold text-gray-900">{analyticsData?.strongest || 'Discrete Mathematics'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Weakest Subject</p>
                                        <p className="font-bold text-gray-900">{analyticsData?.weakest || 'Computer Networks'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Highest Pending Tasks</p>
                                        <p className="font-bold text-gray-900">{analyticsData?.highestPending || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lowest Attendance</p>
                                        <p className="font-bold text-gray-900">{analyticsData?.lowestAttendance || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performance Gap</p>
                                        <p className="font-bold text-indigo-600">{analyticsData?.performanceGap || '31%'} Improvement Potential</p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Footer */}
                            <div className="pt-12 border-t border-gray-100 text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Yuvro Campus • Academic Insights Report</p>
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
                </main >
            </div >
        </div >
    );
};

export default Reports;

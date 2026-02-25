import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import subjectService, { SectionSubjectFaculty, getFacultyAssignments, AttendanceSession } from '../../services/subjectService';
import studentService from '../../services/studentService';
import { cn } from '@/lib/utils';
import {
    Search,
    Filter,
    Calendar,
    Search as SearchIcon,
    Users,
    CheckCircle2,
    XCircle,
    Percent,
    GraduationCap,
    BookOpen,
    Loader2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const AttendanceReport: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [fetchingData, setFetchingData] = useState(false);
    const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);

    // Filters state
    const [selectedDept, setSelectedDept] = useState<string>('all');
    const [selectedBatch, setSelectedBatch] = useState<string>('all');
    const [selectedSem, setSelectedSem] = useState<string>('all');
    const [selectedSection, setSelectedSection] = useState<string>('all');
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [dateRange, setDateRange] = useState<string>('all');

    // Data state
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [reportData, setReportData] = useState<{
        students: any[];
        sessions: AttendanceSession[];
        stats: any;
    } | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const facultyAssignments = await getFacultyAssignments();
                setAssignments(facultyAssignments);
            } catch (err) {
                console.error("Failed to load attendance assignments", err);
                toast.error("Failed to load filter data");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // Find the current assignment matching all filters
    const currentAssignment = useMemo(() => {
        if (selectedDept === 'all' || selectedBatch === 'all' || selectedSem === 'all' || selectedSection === 'all' || selectedSubject === 'all') {
            return null;
        }
        return assignments.find(a =>
            a.semester_subject_details?.department_name === selectedDept &&
            a.semester_subject_details?.batch_name === selectedBatch &&
            String(a.semester_subject_details?.semester_number) === selectedSem &&
            a.section_name === selectedSection &&
            a.semester_subject_details?.subject_details?.subject_name === selectedSubject
        );
    }, [selectedDept, selectedBatch, selectedSem, selectedSection, selectedSubject, assignments]);

    // Fetch data when assignment is identified
    useEffect(() => {
        const fetchData = async () => {
            if (!currentAssignment) {
                setReportData(null);
                return;
            }

            try {
                setFetchingData(true);

                // 1. Fetch Students in the section
                const studentsRes = await studentService.getStudents({
                    section: currentAssignment.section,
                    limit: 200 // Assuming section size is within this limit
                });

                // 2. Fetch Attendance Sessions for this assignment
                const sessions = await subjectService.getAttendanceSessions({
                    section_subject_faculty: currentAssignment.id
                });

                // 3. Process Data
                const studentList = studentsRes.results || [];
                const studentMetrics = studentList.map(student => {
                    const studentSessions = sessions.filter(session =>
                        session.records.some(record => String(record.student) === String(student.id))
                    );

                    const presentCount = sessions.reduce((count, session) => {
                        const record = session.records.find(r => String(r.student) === String(student.id));
                        return record?.is_present ? count + 1 : count;
                    }, 0);

                    const totalClasses = sessions.length;
                    const absentCount = totalClasses - presentCount;
                    const percentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

                    let status = 'Regular';
                    if (percentage >= 90) status = 'Excellent';
                    else if (percentage < 60) status = 'At Risk';
                    else if (percentage < 75) status = 'Shortage';

                    return {
                        id: student.id,
                        name: `${student.user_details.first_name} ${student.user_details.last_name}`,
                        rollNo: student.roll_number,
                        classes: totalClasses,
                        present: presentCount,
                        absent: absentCount,
                        percentage: percentage,
                        status: status
                    };
                });

                // 4. Calculate Stats
                const avgPercentage = studentMetrics.length > 0
                    ? Math.round(studentMetrics.reduce((sum, s) => sum + s.percentage, 0) / studentMetrics.length)
                    : 0;

                const below75 = studentMetrics.filter(s => s.percentage < 75).length;
                const below60 = studentMetrics.filter(s => s.percentage < 60).length;

                const totalPresentAll = studentMetrics.reduce((sum, s) => sum + s.present, 0);
                const totalAbsentAll = studentMetrics.reduce((sum, s) => sum + s.absent, 0);

                setReportData({
                    students: studentMetrics,
                    sessions: sessions,
                    stats: {
                        classesConducted: sessions.length,
                        totalStudents: studentMetrics.length,
                        avgAttendance: `${avgPercentage}%`,
                        totalPresent: totalPresentAll,
                        totalAbsent: totalAbsentAll,
                        below75: below75,
                        below60: below60
                    }
                });

            } catch (err) {
                console.error("Error fetching report data", err);
                toast.error("Failed to load report data");
            } finally {
                setFetchingData(false);
            }
        };

        fetchData();
    }, [currentAssignment]);

    // Derived hierarchical options
    const departments = Array.from(new Set(assignments.map(a => a.semester_subject_details?.department_name).filter(Boolean))) as string[];

    const filteredByDept = assignments.filter(a => selectedDept === 'all' || a.semester_subject_details?.department_name === selectedDept);
    const semesters = Array.from(new Set(filteredByDept.map(a => a.semester_subject_details?.semester_number).filter(Boolean))).sort() as number[];

    const filteredBySem = filteredByDept.filter(a => selectedSem === 'all' || String(a.semester_subject_details?.semester_number) === selectedSem);
    const batches = Array.from(new Set(filteredBySem.map(a => a.semester_subject_details?.batch_name).filter(Boolean))) as string[];

    const filteredByBatch = filteredBySem.filter(a => selectedBatch === 'all' || a.semester_subject_details?.batch_name === selectedBatch);
    const sections = Array.from(new Set(filteredByBatch.map(a => a.section_name).filter(Boolean))) as string[];

    const filteredBySection = filteredByBatch.filter(a => selectedSection === 'all' || a.section_name === selectedSection);
    const subjectsList = Array.from(new Set(filteredBySection.map(a => a.semester_subject_details?.subject_details?.subject_name).filter(Boolean))) as string[];

    const filteredStudents = useMemo(() => {
        if (!reportData) return [];
        const filtered = reportData.students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return [...filtered].sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.name.localeCompare(b.name);
            } else {
                return b.name.localeCompare(a.name);
            }
        });
    }, [reportData, searchTerm, sortOrder]);

    const stats = reportData ? [
        { label: 'Classes Conducted', value: reportData.stats.classesConducted, color: 'text-gray-900', icon: Calendar },
        { label: 'Total Students', value: reportData.stats.totalStudents, color: 'text-gray-900', icon: Users },
        { label: 'Avg Attendance', value: reportData.stats.avgAttendance, color: 'text-green-600', icon: Percent },
        { label: 'Total Present', value: reportData.stats.totalPresent, color: 'text-green-600', icon: CheckCircle2 },
        { label: 'Total Absent', value: reportData.stats.totalAbsent, color: 'text-red-500', icon: XCircle },
        { label: 'Below 75%', value: reportData.stats.below75, color: 'text-amber-500', icon: GraduationCap },
        { label: 'Below 60%', value: reportData.stats.below60, color: 'text-red-500', icon: BookOpen },
    ] : [];

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <RoleSidebar />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <RoleHeader title="" subtitle="" />

                <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 bg-white">
                    {/* Page Header */}
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance Report</h1>
                        <p className="text-sm font-medium text-gray-500">
                            Analyze attendance department-wise, section-wise, and student-wise
                        </p>
                    </div>

                    {/* Filter Section */}
                    <Card className="border border-gray-100 shadow-sm bg-white rounded-xl">
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
                                <Filter className="h-4 w-4 text-gray-400" />
                                <span>Filters</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[11px] font-medium text-gray-400">Department</span>
                                    <Select value={selectedDept} onValueChange={(val) => { setSelectedDept(val); setSelectedSem('all'); setSelectedBatch('all'); setSelectedSection('all'); setSelectedSubject('all'); }}>
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
                                    <Select value={selectedSem} onValueChange={(val) => { setSelectedSem(val); setSelectedBatch('all'); setSelectedSection('all'); setSelectedSubject('all'); }}>
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
                                    <Select value={selectedBatch} onValueChange={(val) => { setSelectedBatch(val); setSelectedSection('all'); setSelectedSubject('all'); }}>
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
                                    <span className="text-[11px] font-medium text-gray-400">Section</span>
                                    <Select value={selectedSection} onValueChange={(val) => { setSelectedSection(val); setSelectedSubject('all'); }}>
                                        <SelectTrigger className="h-10 border-gray-100 rounded-lg text-xs bg-white text-gray-600 font-medium">
                                            <SelectValue placeholder="Select section" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Sections</SelectItem>
                                            {sections.map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[11px] font-medium text-gray-400">Subject</span>
                                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                        <SelectTrigger className="h-10 border-gray-100 rounded-lg text-xs bg-white text-gray-600 font-medium whitespace-nowrap overflow-hidden">
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
                                            <Calendar className="h-3 w-3 mr-2" />
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
                        </CardContent>
                    </Card>

                    {fetchingData ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
                            <p className="text-gray-500 font-medium">Fetching attendance details...</p>
                        </div>
                    ) : reportData ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                {stats.map((stat, idx) => (
                                    <Card key={idx} className="border border-gray-100 shadow-sm bg-white rounded-xl overflow-hidden text-center transform transition-all hover:scale-[1.02]">
                                        <CardContent className="p-4 flex flex-col items-center justify-center space-y-1 min-h-[90px]">
                                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{stat.label}</span>
                                            <div className={cn("text-xl font-bold tracking-tight", stat.color)}>
                                                {stat.value}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Student Attendance Table */}
                            <Card className="border border-gray-100 shadow-sm bg-white rounded-2xl overflow-hidden">
                                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <h2 className="text-lg font-bold text-gray-900">Student Attendance</h2>

                                    <div className="relative max-w-sm w-full">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                        <Input
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search student..."
                                            className="h-9 border-gray-100 rounded-lg pl-9 text-xs font-medium text-gray-600 focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all placeholder:text-gray-300 bg-white"
                                        />
                                    </div>
                                </div>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-50/50">
                                                <TableHead
                                                    className="py-4 pl-8 text-[11px] font-semibold text-gray-400 uppercase tracking-wider cursor-pointer group/sort"
                                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Student Name
                                                        {sortOrder === 'asc' ? (
                                                            <ArrowUp className="h-3 w-3 text-indigo-500" />
                                                        ) : (
                                                            <ArrowDown className="h-3 w-3 text-indigo-500" />
                                                        )}
                                                    </div>
                                                </TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Roll No</TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Classes</TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Present</TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Absent</TableHead>
                                                <TableHead className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Attendance %</TableHead>
                                                <TableHead className="text-right pr-8 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredStudents.length > 0 ? (
                                                filteredStudents.map((row, idx) => (
                                                    <TableRow key={idx} className="hover:bg-gray-50/30 transition-colors border-gray-50/50">
                                                        <TableCell className="py-4 pl-8 font-medium text-gray-900 text-sm">{row.name}</TableCell>
                                                        <TableCell className="text-center text-gray-500 text-xs font-medium">{row.rollNo}</TableCell>
                                                        <TableCell className="text-center text-gray-500 text-xs font-medium">{row.classes}</TableCell>
                                                        <TableCell className="text-center text-green-600 font-bold text-sm">{row.present}</TableCell>
                                                        <TableCell className="text-center text-red-500 font-bold text-sm">{row.absent}</TableCell>
                                                        <TableCell className="text-center px-4">
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <span className={cn(
                                                                    "text-xs font-bold",
                                                                    row.percentage >= 75 ? "text-green-600" : row.percentage >= 60 ? "text-amber-500" : "text-red-500"
                                                                )}>{row.percentage}%</span>
                                                                <div className="h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={cn(
                                                                            "h-full rounded-full transition-all duration-500",
                                                                            row.percentage >= 75 ? "bg-green-500" : row.percentage >= 60 ? "bg-amber-500" : "bg-red-500"
                                                                        )}
                                                                        style={{ width: `${row.percentage}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-8">
                                                            <span className={cn(
                                                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                                row.status === 'Excellent' ? "bg-green-50 text-green-700 border-green-100" :
                                                                    row.status === 'Regular' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                        row.status === 'Shortage' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                                            "bg-red-50 text-red-700 border-red-100"
                                                            )}>
                                                                {row.status}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="py-20 text-center">
                                                        <div className="flex flex-col items-center justify-center space-y-3">
                                                            <Search className="h-10 w-10 text-gray-200" />
                                                            <div className="text-gray-400 font-medium text-sm">No students found</div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                            <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                                <Filter className="h-8 w-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Select Filters to View Report</h3>
                            <p className="text-sm text-gray-500 max-w-md text-center">
                                Please select Department, Semester, Batch, Section, and Subject to analyze the attendance data.
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AttendanceReport;

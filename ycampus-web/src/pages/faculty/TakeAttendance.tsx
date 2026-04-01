import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Search,
    Loader2,
    Users,
    CheckCircle,
    UserCheck,
    Calendar as CalendarIcon
} from 'lucide-react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import subjectService, { SectionSubjectFaculty, AttendanceRecord, AttendanceSession } from '@/services/subjectService';
import studentService from '@/services/studentService';
import { cn } from '@/lib/utils';

const TakeAttendance = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Core State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [assignment, setAssignment] = useState<SectionSubjectFaculty | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, boolean | null>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [remarks, setRemarks] = useState('');
    const [date, setDate] = useState<Date>(new Date());

    useEffect(() => {
        if (assignmentId) {
            loadAssignmentInfo();
        }
    }, [assignmentId]);

    useEffect(() => {
        if (assignmentId && assignment) {
            loadStudentAndAttendance();
        }
    }, [assignmentId, date, assignment]);

    const loadAssignmentInfo = async () => {
        try {
            const assignmentDetails = await subjectService.getAssignmentDetails(assignmentId!);
            setAssignment(assignmentDetails);
        } catch (error) {
            console.error('Error loading assignment info:', error);
            toast({ title: "Error", description: "Failed to load assignment details", variant: "destructive" });
        }
    };

    const loadStudentAndAttendance = async () => {
        try {
            let studentList = students;
            if (students.length === 0 && assignment?.section) {
                const response = await studentService.getStudents({ section: assignment.section, limit: 1000 });
                studentList = (response as any).results || response || [];
                setStudents(studentList);
            }

            const formattedDate = format(date, 'yyyy-MM-dd');
            const sessions = await subjectService.getAttendanceSessions({
                section_subject_faculty: assignmentId!,
                date: formattedDate
            } as any);

            const session = (sessions as any).find((s: any) => s.date === formattedDate);
            const newAttendance: Record<string, boolean | null> = {};

            if (session && session.records) {
                setRemarks(session.remarks || '');
                session.records.forEach((record: any) => {
                    newAttendance[record.student] = record.is_present;
                });
            } else {
                setRemarks('');
                studentList.forEach((student: any) => {
                    newAttendance[student.id] = null;
                });
            }

            setAttendance(newAttendance);
        } catch (error) {
            console.error('Error loading attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const performSave = async (updatedAttendance: Record<string, boolean | null>, currentRemarks: string = remarks) => {
        if (!assignmentId) return;

        const records: AttendanceRecord[] = students
            .filter(s => updatedAttendance[s.id] !== null)
            .map(student => ({
                student: student.id,
                is_present: updatedAttendance[student.id] === true
            }));

        if (records.length === 0) return;

        try {
            setSaving(true);
            const payload: AttendanceSession = {
                section_subject_faculty: assignmentId,
                date: format(date, 'yyyy-MM-dd'),
                remarks: currentRemarks,
                records
            };

            await subjectService.saveAttendance(payload);
        } catch (error) {
            console.error('Error auto-saving:', error);
            toast({ title: "Save Failed", description: "Could not sync with cloud", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleStatusToggle = async (studentId: string, status: boolean) => {
        const updated = { ...attendance, [studentId]: status };
        setAttendance(updated);
        await performSave(updated);
    };

    const markAll = async (present: boolean) => {
        const updated: Record<string, boolean | null> = {};
        students.forEach(s => {
            updated[s.id] = present;
        });
        setAttendance(updated);
        await performSave(updated);
        toast({ title: `Batch Sync`, description: `Marked all as ${present ? 'Present' : 'Absent'}` });
    };

    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const roll = (student.roll_number || '').toLowerCase();
            const name = `${student.user_details?.first_name || ''} ${student.user_details?.last_name || ''}`.toLowerCase();
            const query = searchTerm.toLowerCase();
            return roll.includes(query) || name.includes(query);
        }).sort((a, b) => (a.roll_number || '').localeCompare(b.roll_number || ''));
    }, [students, searchTerm]);

    const presentCount = Object.values(attendance).filter(v => v === true).length;
    const absentCount = Object.values(attendance).filter(v => v === false).length;
    const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

    if (loading && !assignment) {
        return (
            <FacultyLayout>
                <div className="flex flex-col h-[70vh] items-center justify-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                    <p className="font-bold text-xs text-slate-500 uppercase tracking-widest animate-pulse">Establishing Connection...</p>
                </div>
            </FacultyLayout>
        );
    }

    return (
        <FacultyLayout>
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-500">
                {/* SUB-HEADER CARD (Replica of faculty/task header) */}
                <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => navigate('/faculty/attendance')} className="h-9 w-9 shrink-0 bg-white">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="font-bold text-slate-800 text-xl leading-none mb-1">
                                    {assignment?.semester_subject_details?.subject_details?.subject_name || 'Take Attendance'}
                                </h1>
                                <p className="text-xs font-semibold text-slate-500 flex items-center flex-wrap gap-2">
                                    {assignment?.semester_subject_details?.department_name || "Department"}
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                    {assignment?.semester_subject_details?.batch_name || 'Batch'}
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                    {assignment?.section_name || `Section ${assignment?.section}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="h-10 px-4 bg-white text-slate-700 border-slate-200 hover:border-primary/50 text-xs font-bold font-sans"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                            {date ? format(date, "MMM dd, yyyy") : <span>Select Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border border-slate-200 bg-white shadow-2xl z-[100]" align="end">
                                        <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                                    </PopoverContent>
                                </Popover>

                            <div className="relative w-full sm:w-64 shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search student..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-10 border-slate-200 bg-white focus-visible:ring-primary/20 text-xs font-medium"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* STATS SUMMARY (Replica of ViewResponses summary) */}
                <Card className="bg-slate-50/50 border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Users className="h-4 w-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Enrolled</span>
                                </div>
                                <div className="text-2xl font-black text-slate-800 tracking-tighter">{students.length}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-emerald-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Present</span>
                                </div>
                                <div className="text-2xl font-black text-emerald-600 tracking-tighter">{presentCount}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-rose-500">
                                    <XCircle className="h-4 w-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Absent</span>
                                </div>
                                <div className="text-2xl font-black text-rose-500 tracking-tighter">{absentCount}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-indigo-600">
                                    <UserCheck className="h-4 w-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Participation</span>
                                </div>
                                <div className="text-2xl font-black text-indigo-600 tracking-tighter">{attendanceRate}%</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* MAIN GRID - Student Boxes (Replica of TaskCard layout) */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                             Interactive Roster
                             {saving && <Loader2 className="h-4 w-4 animate-spin text-primary opacity-50" />}
                        </h2>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => markAll(true)} className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 h-8">Mark All Present</Button>
                            <Button variant="ghost" size="sm" onClick={() => markAll(false)} className="text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50 h-8">Mark All Absent</Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => {
                                const status = attendance[student.id];
                                return (
                                    <Card key={student.id} className={cn(
                                        "hover:shadow-lg transition-all border-slate-200 group relative bg-white",
                                        status === true ? "border-l-4 border-l-emerald-500" : 
                                        status === false ? "border-l-4 border-l-rose-500" : ""
                                    )}>
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start gap-4 mb-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll Number</p>
                                                    <h3 className="font-bold text-base leading-none text-slate-800 tracking-tight">
                                                        {student.roll_number || '---'}
                                                    </h3>
                                                </div>
                                                <Badge 
                                                    variant={status === true ? 'default' : status === false ? 'destructive' : 'secondary'}
                                                    className={cn("px-2 py-0 h-5 text-[9px] font-bold uppercase", status === true && "bg-emerald-500 hover:bg-emerald-600")}
                                                >
                                                    {status === true ? 'Present' : status === false ? 'Absent' : 'Pending'}
                                                </Badge>
                                            </div>

                                            <div className="mb-6 h-10 overflow-hidden">
                                                <p className="text-sm font-bold text-slate-600 line-clamp-2 leading-snug">
                                                    {student.user_details?.first_name} {student.user_details?.last_name}
                                                </p>
                                            </div>

                                            <div className="flex gap-2 pt-4 border-t border-slate-100">
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleStatusToggle(student.id, true)}
                                                    className={cn(
                                                        "flex-1 h-9 font-bold text-[10px] uppercase shadow-none",
                                                        status === true ? "bg-emerald-500" : "bg-white border-slate-200 text-slate-500 hover:bg-emerald-50"
                                                    )}
                                                    variant={status === true ? 'default' : 'outline'}
                                                >
                                                    <CheckCircle2 className="h-3 w-3 mr-1.5" />
                                                    Present
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleStatusToggle(student.id, false)}
                                                    className={cn(
                                                        "flex-1 h-9 font-bold text-[10px] uppercase shadow-none",
                                                        status === false ? "bg-rose-500" : "bg-white border-slate-200 text-slate-500 hover:bg-rose-50"
                                                    )}
                                                    variant={status === false ? 'default' : 'outline'}
                                                >
                                                    <XCircle className="h-3 w-3 mr-1.5" />
                                                    Absent
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-20 text-center bg-white border border-dashed rounded-xl border-slate-200">
                                <div className="bg-slate-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic">No matching students</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* REMARKS SECTION */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                             Session Metadata & Remarks
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            onBlur={() => performSave(attendance, remarks)}
                            placeholder="Add internal notes for this attendance session..."
                            className="w-full min-h-[100px] text-sm font-semibold p-4 rounded-xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none leading-relaxed italic"
                        />
                    </CardContent>
                </Card>
            </div>
        </FacultyLayout>
    );
};

export default TakeAttendance;
